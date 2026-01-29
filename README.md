# Premium PDF Explainer

A production-ready MVP for uploading PDFs, extracting text (OCR fallback), generating summaries, and asking questions with page citations.

## Features

- Secure email/password authentication (JWT)
- PDF upload with local storage
- Text extraction using `pdf-parse` with OCR fallback via `tesseract.js`
- AI summaries and Q&A with page citations (OpenAI)
- React + Vite + Tailwind UI
- Docker & docker-compose setup
- GitHub Actions CI pipeline

## Architecture

- **frontend/**: React + TypeScript + Vite + Tailwind
- **backend/**: Express + TypeScript + SQLite + OpenAI
- **docs/**: Additional documentation

## Prerequisites

- Node.js 20+
- Docker (optional, for containerized run)

## Environment Setup

1. Copy the example environment file:
	- `cp .env.example .env`
2. Update the backend values in `.env`.
3. Copy the frontend value into `frontend/.env`:
	- `VITE_API_URL=http://localhost:4000`

### Local model (Ollama)

To run without OpenAI credits:

- Set `AI_PROVIDER=ollama`
- Ensure `OLLAMA_BASE_URL` points to your Ollama host (default: `http://localhost:11434`)
- Set `OLLAMA_MODEL=llama3`

If using Docker Compose, the Ollama service will pull the model automatically.

## Run Locally (Dev)

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Run with Docker

```bash
docker-compose up --build
```

Frontend: http://localhost:5173
Backend: http://localhost:4000

## API Overview

- `GET /health`
- `POST /auth/register` `{ email, password }`
- `POST /auth/login` `{ email, password }`
- `POST /upload` (multipart/form-data, `file`)
- `POST /extract` `{ id }`
- `POST /summarize` `{ id }`
- `POST /ask` `{ id, question }`

All PDF-related endpoints require `Authorization: Bearer <token>`.

## Notes

- OpenAI usage requires `OPENAI_API_KEY`.
- SQLite uses `./data/app.db` by default.
