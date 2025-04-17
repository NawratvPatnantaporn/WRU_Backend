import { Request, Response } from "express";
import User, { IUser } from "../models/user.model";
// import Emp from "../models/employees.model";

declare global {
  namespace Express {
    interface Request {
      user?: IUser; // กำหนด type ใช้สำหรับ user
    }
  }
}

// admin only
export const getAllEmployees = async (req: Request, res: Response) => {
  try {
    const employees = await User.find({isDeleted: false}).select(
        "-password -role -createdAt -updatedAt  -__v"

    );
    res.status(200).json(employees);
  } catch (error) {
    if (error instanceof Error) {
      console.log("Error in getAllEmployees controller:", error.message);
      res.status(401).json({
        error: "Unauthorized access",
        details: error.message,
      });
    } else {
      console.log("Error in getAllEmployees controller:", error);
      res.status(500).json({
        error: "Internal server error",
        details: "An unknown error occurred",
      });
    }
  }
};

//ดูข้อมูลพนักงานของตัวเองทำแต่ไม่ไ้ดใช้(ซะงั้น)
export const getEmployees = async (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      return res
        .status(401)
        .json({ message: "Unauthorized: User not logged in" });
    }

    const employee = await User.findById(user._id).select(
      "-_id -password -lastLogin -lastLogout -role -createdAt -updatedAt -__v -pendingWorkLogs"
    );

    if (!employee) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(employee);
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error in getEmployee controller:", error.message);
      res.status(500).json({
        error: "Internal server error",
        details: error.message,
      });
    } else {
      console.error("Error in getEmployee controller:", error);
      res.status(500).json({
        error: "Internal server error",
        details: "An unknown error occurred",
      });
    }
  }
};

//ดึงขอมูลพนักงานเอาไว้ทำโชว์พนักงานดีเด่น(เผ่ื่อไว้ถ้าทัน)
export const getFeaturedEmployees = async (req: Request, res: Response) => {
    try {
      //ดึงข้อมูลพนักงานที่มี role เป็น "employee" 
      const employees = await User.find({ role: "employee" }).select(
        "-_id -startWorkDate -password -phonenumber -lastLogin -lastLogout -role -remainingContractDuration -createdAt -updatedAt -contractEndDate -daywork -idcard -__v"

      ); 

      // ข้อมูลที่แสดงเป็น featured
      const featuredEmployees = employees.map((employee) => ({
        name: employee.name,
        department: employee.department,
        role: employee.role,
        totalWorkDuration: employee.totalWorkDuration, 
      }));
      console.log(featuredEmployees);
      res.status(200).json(featuredEmployees);
    } catch (error) {
        if (error instanceof Error) {
          console.log("Error in getFeaturedEmployees:", error.message);
          res.status(500).json({
            error: "Internal server error",
            details: error.message,
          });
        } else {
          console.log("Error in getFeaturedEmployees:", error);
          res.status(500).json({
            error: "Internal server error",
            details: "An unknown error occurred",
          });
        }
    }
};

//สร้างพนักงาน(admin)
export const createEmployees = async (req: Request, res: Response) => {
    try {
        const { department, email, name, idcard, phonenumber, startWorkDate } = req.body;

        const empExists = await User.findOne({email});
        if(empExists){
            return res.status(400).json({
              code: "error-01-0002",
              status: "error", 
              message: "พนักงานนี้มีอยู่แล้ว" 
            });
        }

        const idcardExists = await User.findOne({ idcard });
        if (idcardExists) {
          return res.status(400).json({ message: "เลขบัตรประชาชนซ้ำ" });
        }

        if (
          !department ||
          !name ||
          !idcard ||
          !email ||
          !phonenumber 
          // !password
        ) {
          return res.status(400).json({ message: "Missing required fields" });
        }
    
        // Validate ID card format (13-digit number)
        if (!/^\d{13}$/.test(idcard)) {
          return res
            .status(400)
            .json({ message: "ID card must be a 13-digit number" });
        }
    
        // Validate phone number format (10-digit number)
        if (!/^\d{10}$/.test(phonenumber)) {
          return res
            .status(400)
            .json({ message: "Phone number must be a 10-digit number" });
        }

        const user = await User.create({
            department,
            email,
            name,
            idcard,
            phonenumber,
            // password,
            startWorkDate,
            role: "employee",
        });
        res.status(200).json({
          user,
          code: "success-01-0001",
          status: "success",
          message: "สร้างพนักงานสําเร็จ",
        });

    } catch (error) {
        if (error instanceof Error) {
          console.log("Error in createEmployees controller:", error.message);
          res.status(500).json({
            error: "Internal server error",
            details: error.message,
          });
        } else {
          console.log("Error in createEmployees controller:", error);
          res.status(500).json({
            error: "Internal server error",
            details: "An unknown error occurred",
          });
        }
    }
};

//ลบพนักงานโดยเปลี่ยนแค่สถานะเท่านั้นแต่ไม่ลบออกจากฐานข้อมูล
export const deleteEmployees = async (req: Request, res: Response) => {
  try {
    // ค้นหาผู้ใช้จาก ID
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "พนักงานไม่มีอยู่" });
    }

    // อัปเดตสถานะการลบแทนการลบข้อมูลจริง
    user.isDeleted = true;
    await user.save(); // บันทึกการอัปเดต

    res.status(200).json({ message: "สถานะการลบพนักงานสำเร็จ" });
  } catch (error) {
    console.error("Error in deleteEmployees controller:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

//ลบขอมูลพนักงานเหมือนกันแต่ลบออกจากฐานข้อมูลไปเลย
// export const deleteEmployees = async (req: Request, res: Response) => {
//   try {
//     const user = await User.findById(req.params.id);

//     if (!user) {
//       return res.status(404).json({ message: "พนักงานไม่มีอยู่" });
//     }

//     await User.findByIdAndDelete(req.params.id);

//     res.status(200).json({ message: "ลบพนักงานสําเร็จ" });
//   } catch (error) {
//     console.error("Error in deleteEmployees controller:", error);
//     res.status(500).json({
//       error: "Internal server error",
//       details: error instanceof Error ? error.message : "Unknown error",
//     });
//   }
// }; 

//เรียกดูตำแหน่งงานของพนักงาน
export const getEmployeesByDepartment = async (req: Request, res: Response) => {
  const department = req.params;  
  try {
    
    const employees = await User.find({ department })
    res.status(200).json(employees);
  } catch (error) {
        if (error instanceof Error) {
          console.log(
            "Error in getEmployeesByDepartment controller:",
            error.message
          );
          res.status(500).json({
            error: "Internal server error",
            details: error.message,
          });
        } else {
          console.log("Error in getEmployeesByDepartment controller:", error);
          res.status(500).json({
            error: "Internal server error",
            details: "An unknown error occurred",
          });
        }
  }  
};

//แก้ไขข้อมูลพนักงาน
export const updateEmployees = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const { email, idcard, phonenumber } = req.body;

    // ตรวจสอบว่ามีบัญชีนี้อยู่หรือไม่
    const empExist = await User.findOne({ _id: id });
    if (!empExist) {
      return res.status(404).json({ 
        code:"error-01-0004",
        status:"error",
        message: "ไม่พบบัญชีนี้" 
      });
    }

    // ตรวจสอบว่ามี email ซ้ำ
    if (email) {
      const emailExists = await User.findOne({
        email: email,
        _id: { $ne: id }, // ตรวจสอบในบัญชีอื่นที่ไม่ใช่บัญชีปัจจุบัน
      });
      if (emailExists) {
        return res.status(400).json({ message: "Email นี้ถูกใช้งานแล้ว" });
      }
    }

    // ตรวจสอบว่ามี idcard ซ้ำ
    if (idcard) {
      const idCardExists = await User.findOne({
        idcard: idcard,
        _id: { $ne: id },
      });
      if (idCardExists) {
        return res.status(400).json({ message: "ID Card นี้ถูกใช้งานแล้ว" });
      }
    }

    // ตรวจสอบว่ามี phonenumber ซ้ำ
    if (phonenumber) {
      const phoneExists = await User.findOne({
        phonenumber: phonenumber,
        _id: { $ne: id },
      });
      if (phoneExists) {
        return res.status(400).json({ message: "เบอร์โทรนี้ถูกใช้งานแล้ว" });
      }
    }

    // อัปเดตข้อมูลพนักงาน
    const updatedEmp = await User.findByIdAndUpdate(id, req.body, {
      new: true, // ส่งกลับข้อมูลใหม่ที่อัปเดตแล้ว
      runValidators: true, // ตรวจสอบ validation ของฟิลด์ที่ถูกอัปเดต
    });

    // ส่งข้อความแจ้งเตือนสำเร็จ
    res.status(200).json({
      message: "อัปเดตข้อมูลสำเร็จ",
      data: updatedEmp,
    });
  } catch (error) {
    console.error("เกิดข้อผิดพลาดขณะอัปเดตข้อมูล:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
  }
};

//เอาไว้ดูรายละเอียดข้อมูลพนักงาน
export const detailEmployees = async (req: Request, res: Response) => {
  try {
    // ค้นหาข้อมูลพนักงานโดยใช้ ID ที่ส่งมาใน params
    const user = await User.findById(req.params.id);

    // หากไม่พบพนักงานให้ตอบกลับ 404
    if (!user) {
      return res.status(404).json({ message: "พนักงานไม่มีอยู่" });
    }

    // ส่งข้อมูลพนักงานกลับไปใน response
    res.status(200).json({
      message: "ข้อมูลพนักงานถูกค้นพบ",
      employee: user, // ส่งข้อมูลพนักงาน
    });
  } catch (error) {
    console.error("Error in detailEmployees controller:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};