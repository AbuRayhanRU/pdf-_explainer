import { type DragEvent, useEffect, useRef, useState } from "react";
import {
  askQuestion,
  extractText,
  getHealth,
  loginUser,
  registerUser,
  summarizeDocument,
  uploadPdf,
} from "./services/api";
import { clearAuthToken, getAuthToken, setAuthToken } from "./services/auth";

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
  const [summaryState, setSummaryState] = useState<
    "idle" | "summarizing" | "success" | "error"
  >("idle");
  const [summaryText, setSummaryText] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [questionInput, setQuestionInput] = useState("");
  const [askState, setAskState] = useState<"idle" | "asking" | "error">("idle");
  const [askError, setAskError] = useState<string | null>(null);
  const [messages, setMessages] = useState<
    Array<{ id: string; role: "user" | "assistant"; content: string; citations?: number[] }>
  >([]);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authToken, setAuthTokenState] = useState<string | null>(getAuthToken());
  const [authUser, setAuthUser] = useState<{ id: string; email: string } | null>(null);
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
    setSummaryState("idle");
    setSummaryText(null);
    setSummaryError(null);
    setMessages([]);
    setQuestionInput("");
    setAskState("idle");
    setAskError(null);
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

  const handleSummarize = async () => {
    if (!uploadedFile) {
      return;
    }
    setSummaryState("summarizing");
    setSummaryError(null);
    try {
      const result = await summarizeDocument(uploadedFile.id);
      setSummaryText(result.summary);
      setSummaryState("success");
    } catch (error) {
      setSummaryState("error");
      setSummaryError(
        error instanceof Error ? error.message : "Summarization failed"
      );
    }
  };

  const handleAuthSubmit = async () => {
    if (!authEmail || !authPassword) {
      setAuthError("Email and password are required");
      return;
    }
    setAuthError(null);
    try {
      const result =
        authMode === "register"
          ? await registerUser(authEmail, authPassword)
          : await loginUser(authEmail, authPassword);
      setAuthToken(result.token);
      setAuthTokenState(result.token);
      setAuthUser(result.user);
      setAuthPassword("");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Auth failed");
    }
  };

  const handleLogout = () => {
    clearAuthToken();
    setAuthTokenState(null);
    setAuthUser(null);
    setMessages([]);
    setQuestionInput("");
  };

  const handleAsk = async () => {
    if (!uploadedFile || !questionInput.trim()) {
      return;
    }

    const question = questionInput.trim();
    setQuestionInput("");
    setAskState("asking");
    setAskError(null);
    const messageId = `${Date.now()}-${Math.random()}`;
    setMessages((prev) => [
      ...prev,
      { id: messageId, role: "user", content: question },
    ]);

    try {
      const result = await askQuestion(uploadedFile.id, question);
      setMessages((prev) => [
        ...prev,
        {
          id: `${messageId}-answer`,
          role: "assistant",
          content: result.answer,
          citations: result.citations,
        },
      ]);
      setAskState("idle");
    } catch (error) {
      setAskState("error");
      setAskError(error instanceof Error ? error.message : "Question failed");
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
          <div className="flex items-center gap-3">
            <div className="rounded-full border border-slate-700 px-4 py-2 text-xs text-slate-300">
              API status: <span className="font-semibold text-white">{apiStatus}</span>
            </div>
            {authToken ? (
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-rose-400 hover:text-white"
              >
                Sign out
              </button>
            ) : null}
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
          <h2 className="text-xl font-semibold text-white">Authentication</h2>
          <p className="mt-2 text-slate-300">
            Sign in to upload PDFs and access AI features.
          </p>
          {authToken ? (
            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-200">
              Signed in as {authUser?.email ?? "authenticated user"}.
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
                  <button
                    type="button"
                    onClick={() => setAuthMode("login")}
                    className={`rounded-full px-3 py-1 ${
                      authMode === "login"
                        ? "bg-indigo-500/20 text-indigo-100"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    Login
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMode("register")}
                    className={`rounded-full px-3 py-1 ${
                      authMode === "register"
                        ? "bg-indigo-500/20 text-indigo-100"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    Register
                  </button>
                </div>
                <div className="mt-4 space-y-3">
                  <input
                    value={authEmail}
                    onChange={(event) => setAuthEmail(event.target.value)}
                    placeholder="Email"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                  />
                  <input
                    value={authPassword}
                    onChange={(event) => setAuthPassword(event.target.value)}
                    placeholder="Password (min 8 chars)"
                    type="password"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={handleAuthSubmit}
                    className="w-full rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400"
                  >
                    {authMode === "register" ? "Create account" : "Sign in"}
                  </button>
                  {authError ? (
                    <p className="text-sm text-rose-400">{authError}</p>
                  ) : null}
                </div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">
                <p className="font-semibold text-white">Why sign in?</p>
                <ul className="mt-3 space-y-2">
                  <li>Secure your uploads and generated insights.</li>
                  <li>Enable summarization and question answering.</li>
                  <li>Track your session state during analysis.</li>
                </ul>
              </div>
            </div>
          )}
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
              disabled={uploadState === "uploading" || !authToken}
            >
              Browse files
            </button>
            {!authToken ? (
              <p className="mt-3 text-sm text-amber-300">
                Sign in to enable uploads.
              </p>
            ) : null}
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

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-white">Summary</h2>
              <p className="mt-2 text-slate-300">
                Generate an executive summary once a PDF is uploaded.
              </p>
            </div>
            <button
              className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/40 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-slate-700"
              type="button"
              onClick={handleSummarize}
              disabled={!uploadedFile || summaryState === "summarizing" || !authToken}
            >
              {summaryState === "summarizing" ? "Summarizing..." : "Generate summary"}
            </button>
          </div>
          {summaryState === "error" && summaryError ? (
            <p className="mt-4 text-sm text-rose-400">{summaryError}</p>
          ) : null}
          {summaryState === "success" && summaryText ? (
            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-200">
              <p className="whitespace-pre-line">{summaryText}</p>
            </div>
          ) : uploadedFile ? (
            <p className="mt-4 text-sm text-slate-400">
              Click "Generate summary" to create a concise overview.
            </p>
          ) : (
            <p className="mt-4 text-sm text-slate-400">
              Upload a PDF to enable summarization.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8">
          <h2 className="text-xl font-semibold text-white">Ask questions</h2>
          <p className="mt-2 text-slate-300">
            Ask anything about the uploaded PDF and receive answers with page citations.
          </p>
          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="space-y-3">
                {messages.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    No questions yet. Upload a PDF and ask your first question.
                  </p>
                ) : (
                  messages.map((message) => (
                    <div key={message.id} className="space-y-2">
                      <div
                        className={`rounded-lg px-4 py-3 text-sm ${
                          message.role === "user"
                            ? "bg-indigo-500/20 text-indigo-100"
                            : "bg-slate-800 text-slate-100"
                        }`}
                      >
                        <p className="whitespace-pre-line">{message.content}</p>
                        {message.citations && message.citations.length > 0 ? (
                          <p className="mt-2 text-xs text-slate-300">
                            Citations: {message.citations.join(", ")}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={questionInput}
                onChange={(event) => setQuestionInput(event.target.value)}
                placeholder="Ask about the document..."
                className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-100 outline-none focus:border-indigo-400"
              />
              <button
                type="button"
                onClick={handleAsk}
                disabled={!uploadedFile || askState === "asking" || !authToken}
                className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/40 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-slate-700"
              >
                {askState === "asking" ? "Asking..." : "Ask"}
              </button>
            </div>
            {askState === "error" && askError ? (
              <p className="text-sm text-rose-400">{askError}</p>
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
