import jwt from "jsonwebtoken";
import { env } from "./env";

export interface JWTPayload {
  id: string | number;
  role?: string;
  email?: string;
  [key: string]: unknown;
}

export async function verifyJWT(token: string): Promise<JWTPayload> {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
}
