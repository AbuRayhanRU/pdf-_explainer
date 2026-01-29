const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

type ApiResponse<T> = {
  data: T;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }

  return (await response.text()) as unknown as T;
}

export async function getHealth(): Promise<{ status: string }> {
  return request<{ status: string }>("/health");
}

export async function postJson<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function uploadPdf(file: File): Promise<{
  id: string;
  originalName: string;
  storedName: string;
  size: number;
  mimetype: string;
}> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Upload failed with ${response.status}`);
  }

  return (await response.json()) as {
    id: string;
    originalName: string;
    storedName: string;
    size: number;
    mimetype: string;
  };
}

export async function extractText(id: string): Promise<{
  text: string;
  method: "pdf-parse" | "ocr";
}> {
  return postJson<{ text: string; method: "pdf-parse" | "ocr" }>("/extract", {
    id,
  });
}

export async function summarizeDocument(id: string): Promise<{
  summary: string;
  method: "pdf-parse" | "ocr";
}> {
  return postJson<{ summary: string; method: "pdf-parse" | "ocr" }>(
    "/summarize",
    { id }
  );
}

export type { ApiResponse };
