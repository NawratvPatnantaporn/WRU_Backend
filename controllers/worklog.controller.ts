import { Request, Response } from "express";
import User, { IUser } from "../models/user.model";
import mongoose from "mongoose";

declare module "express-serve-static-core" {
  interface Request {
    // userId?: string; // ทำ userId ให้เป็น optional property
    user: IUser;
  }
}

//บันทึกข้อมูลการปฏิบัติงานรายวัน
export const addWorkLog = async (req: Request, res: Response) => {
  try {
    const { date, taskDetails, progressLevel, hoursWorked } = req.body;
    const user = req.user;

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!date || !taskDetails || !progressLevel || hoursWorked === undefined) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // แปลงวันที่ให้แน่ใจว่าเป็นวันที่ในรูปแบบ UTC
    const workLogDate = new Date(date);

    // ตรวจสอบว่าเกิดข้อผิดพลาดในการแปลงวันที่หรือไม่
    if (isNaN(workLogDate.getTime())) {
      return res.status(400).json({ message: "Invalid date format" });
    }

    // ตรวจสอบชั่วโมงการทำงานเกินที่กำหนดหรือไม่
    if (hoursWorked > 7) {
      return res.status(400).json({
        message: "ชั่วโมงการทำงานเกินที่กำหนดต่อวัน ไม่สามารถบันทึกได้",
      });
    }

    // ตรวจสอบจำนวนชั่วโมงที่ทำงานในวันนั้น
    const existingLogs = user.daywork.filter(
      (log: { date: Date }) =>
        log.date.toDateString() === workLogDate.toDateString()
    );

    const totalHoursWorkedToday = existingLogs.reduce(
      (total: number, log: { hoursWorked: number }) => total + log.hoursWorked,
      0
    );

    if (totalHoursWorkedToday + hoursWorked > 7) {
      return res.status(400).json({
        message: "ชั่วโมงการทำงานในวันนั้นเกินที่กำหนด ไม่สามารถบันทึกได้",
      });
    }

    // เพิ่มข้อมูลลงใน pendingWorkLogs
    user.pendingWorkLogs.push({
      _id: new mongoose.Types.ObjectId(),
      date: workLogDate, 
      taskDetails,
      progressLevel,
      hoursWorked,
    });

    // บันทึกข้อมูลลงในฐานข้อมูล
    await (user as any).save();

    return res.status(200).json({ message: "Work log added successfully" });
  } catch (error) {
    console.error("Error adding work log:", error);

    if (error instanceof Error) {
      return res.status(500).json({ message: error.message });
    }
    return res.status(500).json({ message: "An unexpected error occurred" });
  }
};

//ยืนยันการบันทึกข้อมูลการปฏิบัติงานรายวันของพนักงาน(admin)
export const approveWorkLog = async (req: Request, res: Response) => {
  try {
    const { userId, workLogId } = req.params;

    // แปลง workLogId เป็น ObjectId
    const workLogObjectId = new mongoose.Types.ObjectId(workLogId);

    // ค้นหา User
    const user = await User.findOne({ _id: userId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ตรวจสอบว่าผู้ใช้งานมี work log ใน pendingWorkLogs ที่ตรงกับ workLogId หรือไม่
    const workLog = user.pendingWorkLogs.find(
      (log) => log._id.toString() === workLogObjectId.toString() // ใช้ toString เพื่อเปรียบเทียบ
    );

    if (!workLog) {
      return res
        .status(404)
        .json({ message: "Work log not found for the user" });
    }

    const contractEndDate = user.contractEndDate;
    if (!contractEndDate) {
      return res
        .status(400)
        .json({ message: "Contract end date is not defined" });
    }

    const workLogDate = new Date(workLog.date);

    // ถ้าวันที่ทำงานเกิน contractEndDate ให้ปรับ contractEndDate เพิ่มอีก 6 เดือน
    if (workLogDate > contractEndDate) {
      user.contractEndDate = new Date(
        contractEndDate.getTime() + 6 * 30 * 24 * 60 * 60 * 1000
      );
    }

    // ตรวจสอบว่ามีงานในวันเดียวกันใน `daywork` หรือไม่
    const existingWorkLog = user.daywork.find(
      (entry) =>
        new Date(entry.date).toLocaleDateString() ===
        workLogDate.toLocaleDateString()
    );

    if (existingWorkLog) {
      // ถ้ามีงานในวันเดียวกันแล้ว ให้เพิ่มข้อมูลงานเข้าไป
      existingWorkLog.hoursWorked += workLog.hoursWorked;
      existingWorkLog.taskDetails += `\n${workLog.taskDetails}`;
      existingWorkLog.progressLevel = workLog.progressLevel;
    } else {
      // ถ้าไม่มีงานในวันนั้น ให้เพิ่มเข้าไปใน daywork
      user.daywork.push({
        _id: new mongoose.Types.ObjectId(),
        date: workLog.date,
        hoursWorked: workLog.hoursWorked,
        taskDetails: workLog.taskDetails,
        progressLevel: workLog.progressLevel,
      });
    }

    // ลบ work log ออกจาก pendingWorkLogs
    user.pendingWorkLogs = user.pendingWorkLogs.filter(
      (log) => log._id.toString() !== workLogObjectId.toString()
    );

    // บันทึกข้อมูล
    await user.save();

    return res.status(200).json({ message: "Work log approved successfully" });
  } catch (error) {
    console.error("Error approving work log:", error);

    if (error instanceof Error) {
      return res.status(500).json({ message: error.message });
    }
    return res.status(500).json({ message: "An unexpected error occurred" });
  }
};

//ดึงขอมูลการรอยืนยันของบันทึกข้อมูลการปฏิบัติงานรายวันของพนักงาน(admin)
export const PendingWorkLogs = async (req: Request, res: Response) => {
  try {
    const usersWithPendingLogs = await User.find({
      "pendingWorkLogs.0": { $exists: true },
    }); // ตรวจสอบว่าผู้ใช้มี pendingWorkLogs มั้ย!!!
    res.status(200).json(usersWithPendingLogs);
  } catch (error) {
    console.error("Error fetching users with pending work logs:", error);
    res
      .status(500)
      .json({ message: "Error fetching users with pending work logs" });
  }
}

//ดึงข้อมูลที่รอยืนยันการบันทึกการปฏิบัติงานของพนักงาน(เฉพาะคน)
export const userPendingWorkLogs = async (req: Request, res: Response) => {
  try {
    const user = req.user; 

    if (!user) {
      return res
        .status(401)
        .json({ message: "ผู้ใช้ไม่ถูกต้องหรือไม่ได้เข้าสู่ระบบ" });
    }

    const userWithPendingLogs = await User.findOne({
      _id: user._id,
      "pendingWorkLogs.0": { $exists: true }, 
    });

    if (!userWithPendingLogs) {
      return res
        .status(404)
        .json({ message: "ไม่พบผู้ใช้หรือไม่มี pending work logs" });
    }

    res.status(200).json(userWithPendingLogs);
  } catch (error) {
    console.error(
      "เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้ที่มี pending work logs:",
      error
    );
    res
      .status(500)
      .json({
        message: "เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้ที่มี pending work logs",
      });
  }
};

export const userRefuseWorkLogs = async (req: Request, res: Response) => {
  try {
    const user = req.user; 

    if (!user) {
      return res
        .status(401)
        .json({ message: "ผู้ใช้ไม่ถูกต้องหรือไม่ได้เข้าสู่ระบบ" });
    }

    const userWithPendingLogs = await User.findOne({
      _id: user._id,
      "refuseworklog.0": { $exists: true },
    });

    if (!userWithPendingLogs) {
      return res
        .status(404)
        .json({ message: "ไม่พบผู้ใช้หรือไม่มี pending work logs" });
    }

    res.status(200).json(userWithPendingLogs);
  } catch (error) {
    console.error(
      "เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้ที่มี pending work logs:",
      error
    );
    res
      .status(500)
      .json({
        message: "เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้ที่มี pending work logs",
      });
  }
};

//คำนวณรายได้ต่อวันพนักงาน
export const CalcuLate = async (req: Request, res: Response) => {
  try {
    // ตรวจสอบว่าผู้ใช้ที่ล็อกอินอยู่มีข้อมูลใน req.user หรือไม่
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    // ตรวจสอบว่า user มี rate ที่ถูกกำหนดในตำแหน่งงานหรือไม่
    if (!user.rate || isNaN(parseFloat(user.rate))) {
      return res
        .status(400)
        .json({ message: "Invalid or missing rate for the user's position" });
    }

    // แปลง rate จากตำแหน่งงานเป็นตัวเลข
    const numericRate = parseFloat(user.rate);

    // กำหนดวันที่ปัจจุบัน
    const today = new Date();
    today.setHours(0, 0, 0, 0); // ตั้งค่าเวลาเป็น 00:00:00

    // คำนวณรายได้เฉพาะวันที่ปัจจุบัน
    let totalEarnings = 0;
    user.daywork.forEach((workLog) => {
      const workDate = new Date(workLog.date);
      workDate.setHours(0, 0, 0, 0); // ตั้งค่าเวลาเป็น 00:00:00 เพื่อเปรียบเทียบวันที่เท่านั้น

      if (workDate.getTime() === today.getTime()) {
        totalEarnings += workLog.hoursWorked * numericRate;
      }
    });

    return res.status(200).json({
      message: "Calculation successful",
      totalEarnings: totalEarnings, 
    });
  } catch (error) {
    console.error("Error calculating earnings:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

//ปฏิเสธการบันทึกข้อมูลการปฏิบัติงาน
export const rejectWorkLog = async (req: Request, res: Response) => {
  try {
    const { userId, workLogId } = req.params;

    // แปลง workLogId เป็น ObjectId
    const workLogObjectId = new mongoose.Types.ObjectId(workLogId);

    // ค้นหา User
    const user = await User.findOne({ _id: userId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ตรวจสอบว่าผู้ใช้งานมี work log ใน pendingWorkLogs ที่ตรงกับ workLogId หรือไม่
    const workLog = user.pendingWorkLogs.find(
      (log) => log._id.toString() === workLogObjectId.toString() // ใช้ toString เพื่อเปรียบเทียบ
    );

    if (!workLog) {
      return res
        .status(404)
        .json({ message: "Work log not found for the user" });
    }

    // ตรวจสอบว่ามี refuseworklog มั้ย ถ้าไม่มีให้สร้างขึ้นมา
    if (!user.refuseworklog) {
      user.refuseworklog = [];
    }

    // ย้าย work log จาก pendingWorkLogs ไป refuseworklog
    user.refuseworklog.push(workLog);

    // ลบ work log ออกจาก pendingWorkLogs
    user.pendingWorkLogs = user.pendingWorkLogs.filter(
      (log) => log._id.toString() !== workLogObjectId.toString()
    );

    // บันทึกข้อมูล
    await user.save();

    return res
      .status(200)
      .json({ message: "Work log moved to refuseworklog successfully" });
  } catch (error) {
    console.error("Error moving work log to refuseworklog:", error);

    if (error instanceof Error) {
      return res.status(500).json({ message: error.message });
    }
    return res.status(500).json({ message: "An unexpected error occurred" });
  }
};

//ยกเลิกการบันทึกข้อมูลการปฏิบัติงาน
export const CancelAddWork = async (req: Request, res: Response) => {
  try {
    const { workLogId } = req.params; // รับ workLogId จาก params

    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    // แปลง workLogId เป็น ObjectId
    const workLogObjectId = new mongoose.Types.ObjectId(workLogId);

    // ตรวจสอบว่ามี pending work logs หรือไม่
    if (!user.pendingWorkLogs || user.pendingWorkLogs.length === 0) {
      return res.status(404).json({ message: "No pending work logs found" });
    }

    // ตรวจสอบว่า work log ที่ต้องการลบมีอยู่ใน pendingWorkLogs หรือไม่
    const workLogIndex = user.pendingWorkLogs.findIndex(
      (log) => log._id.toString() === workLogObjectId.toString()
    );

    if (workLogIndex === -1) {
      return res.status(404).json({ message: "Work log not found" });
    }

    // ลบ work log ที่เลือก
    user.pendingWorkLogs.splice(workLogIndex, 1);

    // บันทึกข้อมูล
    await(user as any).save();

    return res.status(200).json({ message: "Work log canceled successfully" });
  } catch (error) {
    console.error("Error canceling work log:", error);

    if (error instanceof Error) {
      return res.status(500).json({ message: error.message });
    }
    return res.status(500).json({ message: "An unexpected error occurred" });
  }
};

export const DeleteAddWork = async (req: Request, res: Response) => {
  try {
    const { workLogId } = req.params; // รับ workLogId จาก params

    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    // แปลง workLogId เป็น ObjectId
    const workLogObjectId = new mongoose.Types.ObjectId(workLogId);

    // ตรวจสอบว่ามี refuseworklog มั้ย
    if (!user.refuseworklog || user.refuseworklog.length === 0) {
      return res.status(404).json({ message: "No pending work logs found" });
    }

    // ตรวจสอบว่า work log ที่ต้องการลบมีอยู่ใน refuseworklog มั้ย
    const workLogIndex = user.refuseworklog.findIndex(
      (log) => log._id.toString() === workLogObjectId.toString()
    );

    if (workLogIndex === -1) {
      return res.status(404).json({ message: "Work log not found" });
    }

    // ลบ work log ที่เลือก
    user.refuseworklog.splice(workLogIndex, 1);

    // บันทึกข้อมูล
    await(user as any).save();

    return res.status(200).json({ message: "Work log deleted successfully" });
  } catch (error) {
    console.error("Error deleting work log:", error);

    if (error instanceof Error) {
      return res.status(500).json({ message: error.message });
    }
    return res.status(500).json({ message: "An unexpected error occurred" });
  }
};