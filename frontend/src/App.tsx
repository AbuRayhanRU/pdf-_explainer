import { useEffect, useState } from "react";
import { getHealth } from "./services/api";

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
