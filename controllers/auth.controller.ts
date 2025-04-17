import { Request, Response } from "express";
import User from "../models/user.model";
import { generateTokenAndSetCookie } from "../utils/generateTokenAndSetCookie";
import jwt, { JwtPayload } from "jsonwebtoken";

declare module "express-serve-static-core" {
  interface Request {
    userId?: string;
  }
}

export const signup = async (req: Request, res: Response) => {
  const { email, name, department, idcard, phonenumber } = req.body;
  try {
    // ตรวจสอบรูปแบบของรหัสผ่าน
    // const passwordRegex = /^\d{13}$/; // ตัวเลขทั้งหมดและมีความยาว 13 ตัวอักษร
    // if (!passwordRegex.test(password)) {
    //   return res.status(400).json({
    //     code: "error-01-0005",
    //     status: "error",
    //     message: "รหัสผ่านต้องเป็นตัวเลขทั้งหมด และมีความยาว 13 ตัวอักษร",
    //   });
    // }

    // ตรวจสอบว่า email มีอยู่แล้วหรือไม่
    const userExists = await User.findOne({ email });
    console.log("userExists", userExists);
    if (userExists) {
      return res.status(400).json({
        code: "error-01-0002",
        status: "error",
        message: "มีบัญชีผู้ใช้นี้อยู่แล้ว",
      });
    }

    // ตรวจสอบว่า idcard มีอยู่แล้วหรือไม่
    const idCardExists = await User.findOne({ idcard });
    if (idCardExists) {
      return res.status(400).json({
        code: "error-01-0003",
        status: "error",
        message: "เลขบัตรประชาชนของท่านนี้ถูกใช้งานแล้ว",
      });
    }

    // ตรวจสอบว่า phonenumber มีอยู่แล้วหรือไม่
    const phoneExists = await User.findOne({ phonenumber });
    if (phoneExists) {
      return res.status(400).json({
        code: "error-01-0004",
        status: "error",
        message: "เบอร์โทรนี้ถูกใช้งานแล้ว",
      });
    }

    // ตรวจสอบ department 
    const validDepartments = [
      "HR",
      "IT",
      "FINANCE",
      "SALES",
      "MARKETING",
      "DESIGN",
      "SERVICE",
    ];

    // ถ้า department ไม่ตรงกับที่กำหนด ทำให้เป็น "OTHER"
    const validDepartment = validDepartments.includes(department)
      ? department
      : "OTHER";

    const user = await User.create({
      email,
      name,
      department: validDepartment,
      idcard,
      phonenumber,
    });

    generateTokenAndSetCookie(res, user._id.toString());
    console.log(user);

    res.status(201).json({
      user,
      // role: user.role,
      code: "seccess-01-0001",
      status: "seccess",
      message: "User created successfully",
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ success: false, message: error.message });
    } else {
      res
        .status(400)
        .json({ success: false, message: "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ" });
    }
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, idcard } = req.body;

    // ตรวจสอบกรณีที่กรอก email แต่ไม่กรอก password
    if (email && !idcard) {
      return res.status(400).json({
        code: "error-01-0005",
        status: "error",
        message: "โปรดกรอกรหัสผ่าน",
        token: null,
        lastLogin: null,
        user: null,
      });
    }

    // ตรวจสอบกรณีที่กรอก password แต่ไม่กรอก email
    if (!email && idcard) {
      return res.status(400).json({
        code: "error-01-0006",
        status: "error",
        message: "โปรดกรอกอีเมล",
        token: null,
        lastLogin: null,
        user: null,
      });
    }

    // ตรวจสอบกรณีที่ไม่ได้กรอกทั้ง email และ password
    if (!email || !idcard) {
      return res.status(400).json({
        code: "error-01-0004",
        status: "error",
        message: "โปรดกรอกอีเมลและรหัสผ่าน",
        token: null,
        lastLogin: null,
        user: null,
      });
    }

    const user = await User.findOne({ email });

    // ตรวจสอบว่าเจอผู้ใช้หรือไม่
    if (!user) {
      return res.status(400).json({
        code: "error-01-0001",
        status: "error",
        message: "ไม่พบบัญชีผู้ใช้",
        token: null,
        lastLogin: null,
        user: null,
      });
    }

    // ตรวจสอบว่า isDelete เป็น true มั้ย
    if (user.isDeleted) {
      return res.status(400).json({
        code: "error-01-0003",
        status: "error",
        message: "บัญชีของท่านถูกลบ",
        user: null,
      });
    }

    if (user.idcard) {
      const token = generateTokenAndSetCookie(res, user._id.toString());

      user.lastLogin = new Date();
      await user.save({ validateModifiedOnly: true });

      res.status(200).json({
        user,
        code: "success-01-0001",
        status: "success",
        lastLogin: user.lastLogin,
        message: "เข้าสู่ระบบสำเร็จ",
        token: `Bearer ${token}`,
      });
    } else {
      return res.status(400).json({
        code: "error-01-0002",
        status: "error",
        message: "รหัสผ่านไม่ถูกต้อง",
        user: null,
      });
    }
  } catch (error) {
    console.error("เข้าสู่ระบบไม่สำเร็จ", error);
    if (error instanceof Error) {
      res.status(400).json({ success: false, message: error.message });
    } else {
      res
        .status(400)
        .json({ success: false, message: "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ" });
    }
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ 
        code:"error-01-0005",
        status:"error",
        message: "ไม่พบข้อมูลการล็อกอิน" 
      });
    }

    const decodedToken = jwt.decode(token) as jwt.JwtPayload;
    const user = await User.findById(decodedToken.userId);
    if (!user) {
      return res.status(401).json({ message: "ไม่พบข้อมูลการล็อกอิน" });
    }

    // อัปเดต lastLogout เป็นเวลาปัจจุบัน
    user.lastLogout = new Date();
    await user.save({ validateModifiedOnly: true });

    // ลบ cookie ของ token
    res.clearCookie("token");

    return res.status(200).json({
      success: true,
      lastLogout: new Date().toLocaleString("th-TH", {
        // แปลงเป็นข้อความที่อ่านได้
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      message: "ออกจากระบบสำเร็จ",
    });
  } catch (error) {
    console.error("Logout Error:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการออกจากระบบ" });
  }
};