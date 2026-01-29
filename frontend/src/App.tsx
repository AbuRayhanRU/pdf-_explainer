import { type DragEvent, useEffect, useRef, useState } from "react";
import { extractText, getHealth, uploadPdf } from "./services/api";

const features = [
  {
    title: "Upload PDFs",
    description: "Drag and drop documents for fast ingestion and preview.",
  },
  {
    title: "Summarize",
    description: "Generate concise executive summaries in seconds.",
  },
  {
    title: "Ask Questions",
    description: "Get answers with page-level citations.",
  },
];

function App() {
  const [apiStatus, setApiStatus] = useState("checking...");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<{
    id: string;
    originalName: string;
    size: number;
  } | null>(null);
  const [extractionState, setExtractionState] = useState<
    "idle" | "extracting" | "success" | "error"
  >("idle");
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [extractionMethod, setExtractionMethod] = useState<
    "pdf-parse" | "ocr" | null
  >(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let active = true;
    getHealth()
      .then((data) => {
        if (active) {
          setApiStatus(data.status);
        }
      })
      .catch(() => {
        if (active) {
          setApiStatus("offline");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const handleFileUpload = async (file: File) => {
    setUploadState("uploading");
    setUploadError(null);
    setExtractedText(null);
    setExtractionMethod(null);
    setExtractionState("idle");
    try {
      const result = await uploadPdf(file);
      setUploadedFile({
        id: result.id,
        originalName: result.originalName,
        size: result.size,
      });
      setUploadState("success");
      setExtractionState("extracting");

      const extracted = await extractText(result.id);
      setExtractedText(extracted.text);
      setExtractionMethod(extracted.method);
      setExtractionState("success");
    } catch (error) {
      setUploadState("error");
      setUploadError(
        error instanceof Error ? error.message : "Upload failed"
      );
      setExtractionState("error");
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }
    const file = files[0];
    handleFileUpload(file);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    handleFiles(event.dataTransfer.files);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
              Premium PDF Explainer
            </p>
            <h1 className="text-2xl font-semibold text-white">
              Understand any document, instantly.
            </h1>
          </div>
          <div className="rounded-full border border-slate-700 px-4 py-2 text-xs text-slate-300">
            API status: <span className="font-semibold text-white">{apiStatus}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-10">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8">
          <h2 className="text-xl font-semibold text-white">Workflow</h2>
          <p className="mt-2 text-slate-300">
            Upload, extract, summarize, and ask questions with citations.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-slate-800 bg-slate-950 p-4"
              >
                <h3 className="text-base font-semibold text-white">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-slate-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8">
          <h2 className="text-xl font-semibold text-white">Upload a PDF</h2>
          <p className="mt-2 text-slate-300">
            Drag and drop a PDF or browse your files to begin.
          </p>
          <div
            className={`mt-6 flex min-h-[180px] flex-col items-center justify-center rounded-2xl border border-dashed p-6 text-center transition ${
              isDragging
                ? "border-indigo-400 bg-indigo-500/10"
                : "border-slate-700 bg-slate-950"
            }`}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(event) => handleFiles(event.target.files)}
            />
            <p className="text-sm text-slate-300">
              {uploadState === "uploading"
                ? "Uploading..."
                : "Drop your PDF here"}
            </p>
            <button
              className="mt-4 rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-indigo-400 hover:text-white"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadState === "uploading"}
            >
              Browse files
            </button>
            {uploadState === "error" && uploadError ? (
              <p className="mt-3 text-sm text-rose-400">{uploadError}</p>
            ) : null}
            {uploadState === "success" && uploadedFile ? (
              <div className="mt-4 text-sm text-emerald-300">
                Uploaded {uploadedFile.originalName} ({Math.round(uploadedFile.size / 1024)}
                {" "}
                KB)
              </div>
            ) : null}
            {extractionState === "extracting" ? (
              <p className="mt-3 text-sm text-indigo-300">
                Extracting text...
              </p>
            ) : null}
            {extractionState === "success" && extractedText ? (
              <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-left text-sm text-slate-200">
                <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
                  <span>Extraction preview</span>
                  <span>{extractionMethod === "ocr" ? "OCR" : "PDF"}</span>
                </div>
                <p className="max-h-48 overflow-hidden whitespace-pre-line">
                  {extractedText || "No text extracted yet."}
                </p>
              </div>
            ) : null}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8">
            <h2 className="text-xl font-semibold text-white">Next step</h2>
            <p className="mt-2 text-slate-300">
              Connect your backend to start uploading PDFs and generating
              insights.
            </p>
            <button
              className="mt-6 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/40 transition hover:bg-indigo-400"
              type="button"
            >
              Configure API
            </button>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8">
            <h3 className="text-lg font-semibold text-white">Environment</h3>
            <p className="mt-2 text-sm text-slate-400">
              Set <span className="font-semibold text-slate-200">VITE_API_URL</span>
              {" "}
              in your frontend environment to point to the backend server.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
