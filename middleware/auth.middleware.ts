import jwt, { JwtPayload } from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import User, { IUser } from "../models/user.model";

// ขยาย Request interface
declare module "express-serve-static-core" {
  interface Request {
    userId?: string; // ทำ userId ให้เป็น optional property
    user: IUser; // เพิ่ม optional user property
  }
}

// Middleware สำหรับตรวจสอบ JWT และตั้งค่า req.userId
export const protectRoute = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.cookies?.token;

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "กรุณาเข้าสู่ระบบ" });
  }

  try {
    // ตรวจสอบและถอดรหัส JWT
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as JwtPayload;

    if (!decoded || typeof decoded !== "object" || !decoded.userId) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized - invalid token" });
    }

    // กำหนดค่า userId ลงใน req
    req.userId = decoded.userId;

    // ดึงข้อมูลผู้ใช้จากฐานข้อมูล
    const user = await User.findById(req.userId).select("-password");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "ไม่พบบัญชีผู้ใช้" });
    }

    // เพิ่มข้อมูล user ลงใน req
    req.user = user;

    // ไปยัง middleware ถัดไป
    next();
  } catch (error) {
    console.error("Error in protectRoute:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Middleware สำหรับตรวจสอบสิทธิ์ admin
export const adminRoute = (req: Request, res: Response, next: NextFunction) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    return res
      .status(403)
      .json({ message: "ไม่มีสิทธิ์เข้าถึงสำหรับ admin เท่านั้น" });
  }
};
