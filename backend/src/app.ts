import express, { type NextFunction, type Request, type Response } from "express";
import morgan from "morgan";

const app = express();

app.use(morgan("combined"));
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

app.use((req: Request, res: Response) => {
  res.status(404).json({ error: "Not Found", path: req.path });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({ error: "Internal Server Error", message: err.message });
});

export default app;
