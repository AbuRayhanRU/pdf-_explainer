import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import express, { type NextFunction, type Request, type Response } from "express";
import multer, { type FileFilterCallback } from "multer";
import morgan from "morgan";

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

app.use((req: Request, res: Response) => {
  res.status(404).json({ error: "Not Found", path: req.path });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err.message === "Only PDF files are allowed") {
    res.status(400).json({ error: err.message });
    return;
  }

  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
    res.status(413).json({ error: "File too large" });
    return;
  }

  res.status(500).json({ error: "Internal Server Error", message: err.message });
});

export default app;
