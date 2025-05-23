import jwt from "jsonwebtoken";
import { Response } from "express";

export const generateTokenAndSetCookie = (
  res: Response,
  userId: string
): string => {

  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }
  
  const token = jwt.sign({ userId }, process.env.JWT_SECRET as string, {
    expiresIn: "1h",
  });

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 1 * 60 * 60 * 1000, // 1 hour
  });

  return token;
};
