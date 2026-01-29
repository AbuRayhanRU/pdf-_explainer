import bcrypt from "bcryptjs";
import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";

const JWT_SECRET: Secret = process.env.JWT_SECRET ?? "dev-secret";
const JWT_EXPIRES_IN =
  (process.env.JWT_EXPIRES_IN ?? "1d") as SignOptions["expiresIn"];

type JwtPayload = {
  userId: string;
  email: string;
};

export const hashPassword = async (password: string) => bcrypt.hash(password, 10);

export const comparePassword = async (password: string, hash: string) =>
  bcrypt.compare(password, hash);

export const createToken = (payload: JwtPayload) =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.replace("Bearer ", "");
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    (req as Request & { user?: JwtPayload }).user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
};
