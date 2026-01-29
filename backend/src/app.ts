import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import express, { type NextFunction, type Request, type Response } from "express";
import multer, { type FileFilterCallback } from "multer";
import morgan from "morgan";
import { PDFParse } from "pdf-parse";
import Tesseract from "tesseract.js";
import OpenAI from "openai";

const app = express();

const uploadDir = path.resolve("uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".pdf";
    cb(null, `${randomUUID()}${ext}`);
  },
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  if (file.mimetype !== "application/pdf") {
    cb(new Error("Only PDF files are allowed"));
    return;
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 },
});

const MIN_TEXT_LENGTH = 80;
const MAX_SUMMARY_CHARS = 20000;

const extractPdfText = async (filePath: string) => {
  const fileBuffer = await fs.promises.readFile(filePath);
  const parser = new PDFParse({ data: fileBuffer });
  const parsed = await parser.getText();
  await parser.destroy();
  const extractedText = parsed.text.trim();

  if (extractedText.length >= MIN_TEXT_LENGTH) {
    const pages = parsed.pages
      .map((page) => ({ page: page.num, text: page.text.trim() }))
      .filter((page) => page.text.length > 0);
    return { text: extractedText, method: "pdf-parse", pages } as const;
  }

  const ocrResult = await Tesseract.recognize(fileBuffer, "eng");
  const ocrText = ocrResult.data.text.trim();
  return {
    text: ocrText,
    method: "ocr",
    pages: ocrText ? [{ page: 1, text: ocrText }] : [],
  } as const;
};

const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  return new OpenAI({ apiKey });
};

app.use(morgan("combined"));
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

app.post("/upload", upload.single("file"), (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: "File is required" });
    return;
  }

  res.status(201).json({
    id: req.file.filename,
    originalName: req.file.originalname,
    storedName: req.file.filename,
    size: req.file.size,
    mimetype: req.file.mimetype,
  });
});

app.post("/extract", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.body as { id?: string };
    if (!id) {
      res.status(400).json({ error: "File id is required" });
      return;
    }

    const filePath = path.join(uploadDir, id);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    const result = await extractPdfText(filePath);
    res.status(200).json({ text: result.text, method: result.method });
  } catch (error) {
    next(error);
  }
});

app.post("/summarize", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.body as { id?: string };
    if (!id) {
      res.status(400).json({ error: "File id is required" });
      return;
    }

    const filePath = path.join(uploadDir, id);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    const result = await extractPdfText(filePath);
    const promptText = result.text.slice(0, MAX_SUMMARY_CHARS);
    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that summarizes documents for busy professionals.",
        },
        {
          role: "user",
          content:
            "Summarize the document in 5-8 bullet points. Focus on key facts, decisions, and action items.\n\n" +
            promptText,
        },
      ],
    });

    const summary = completion.choices[0]?.message?.content?.trim() ?? "";
    res.status(200).json({ summary, method: result.method });
  } catch (error) {
    next(error);
  }
});

app.post("/ask", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, question } = req.body as { id?: string; question?: string };
    if (!id || !question) {
      res.status(400).json({ error: "File id and question are required" });
      return;
    }

    const filePath = path.join(uploadDir, id);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    const result = await extractPdfText(filePath);
    const pages = result.pages.map((page) => ({
      page: page.page,
      text: page.text.slice(0, 2000),
    }));
    const context = pages
      .map((page) => `Page ${page.page}:\n${page.text}`)
      .join("\n\n");

    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You answer questions about a PDF. Cite sources using [p.X] where X is the page number. If the answer is not in the document, say you cannot find it.",
        },
        {
          role: "user",
          content: `Question: ${question}\n\nDocument:\n${context}`,
        },
      ],
    });

    const answer = completion.choices[0]?.message?.content?.trim() ?? "";
    const citations = Array.from(answer.matchAll(/\[p\.(\d+)\]/g)).map(
      (match) => Number(match[1])
    );
    const uniqueCitations = Array.from(new Set(citations));

    res.status(200).json({ answer, citations: uniqueCitations, method: result.method });
  } catch (error) {
    next(error);
  }
});

app.use((req: Request, res: Response) => {
  res.status(404).json({ error: "Not Found", path: req.path });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err.message === "Only PDF files are allowed") {
    res.status(400).json({ error: err.message });
    return;
  }

  if (err.message === "OPENAI_API_KEY is not set") {
    res.status(503).json({ error: "OpenAI API key is not configured" });
    return;
  }

  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
    res.status(413).json({ error: "File too large" });
    return;
  }

  res.status(500).json({ error: "Internal Server Error", message: err.message });
});

export default app;
