import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// Interface สำหรับ User
export interface IUser {
  _id: string;
  department: string; // เปลี่ยนแค่เป็น string ธรรมดา
  email: string;
  name: string;
  idcard: string;
  phonenumber: string;
  // password: string;
  startWorkDate: Date;
  lastLogin: Date | null;
  lastLogout: Date | null;
  daywork: {
    date: Date;
    taskDetails: string;
    progressLevel: string;
    hoursWorked: number;
    _id: mongoose.Types.ObjectId;
  }[];
  rate: string;
  pendingWorkLogs: {
    date: Date;
    taskDetails: string;
    progressLevel: string;
    hoursWorked: number;
    _id: mongoose.Types.ObjectId;
  }[];
  refuseworklog: {
    date: Date;
    taskDetails: string;
    progressLevel: string;
    hoursWorked: number;
    _id: mongoose.Types.ObjectId;
  }[];
  isDeleted: boolean;
  contractEndDate: Date;
  isFeatured: boolean;
  role: "employee" | "admin";
  totalWorkDuration: string; // จากฟังชั่น virtual
  remainingContractDuration: string; // จากฟังชั่น virtual
  comparePassword(password: string): Promise<boolean>;
  extendContract(): void;
}

// Schema สำหรับข้อมูลผู้ใช้
const userSchema = new mongoose.Schema<IUser>(
  {
    department: {
      type: String,
      required: [true, "Department is required"],
      enum: [
        "HR",
        "IT",
        "FINANCE",
        "SALES",
        "MARKETING",
        "DESIGN",
        "SERVICE",
        "OTHER",
      ],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        "โปรดใส่อีเมลที่ถูกต้อง",
      ],
    }, // ใช้ตอน signup
    name: {
      type: String,
      required: [true, "Name is required"],
    }, // ใช้ตอน signup
    idcard: {
      type: String,
      required: [true, "ID card is required"],
      unique: true,
    },
    phonenumber: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
    }, // ใช้ตอน signup
    // password: {
    //   type: String,
    //   required: [true, "Password is required"],
    // }, // ใช้ตอน signup
    startWorkDate: {
      type: Date,
      required: true,
      default: Date.now, // วันที่เริ่มต้นการทำงาน
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    }, // ใช้ตอน signup
    lastLogout: {
      type: Date,
      default: null, // ค่าเริ่มต้นเป็น null ถ้ายังไม่เคยออกจากระบบ
    },
    daywork: [
      //ข้อมูลการปฏิบัติงานรายวัน
      {
        date: {
          type: Date,
          required: [true, "วันที่ทำงานเป็นสิ่งที่จำเป็น"],
        },
        taskDetails: {
          type: String,
          required: [true, "รายละเอียดของงาน"],
        },
        progressLevel: {
          type: String,
          required: [true, "ระดับความคืบหน้าของงาน"],
        },
        hoursWorked: {
          type: Number,
          required: [true, "จำนวนชั่วโมงที่ทำงาน"],
          min: [1, "จำนวนชั่วโมงขั้นต่ำ 1"],
          max: [7, "จำนวนชั่วโมงสูงสุด 7"],
        },
        _id: {
          type: mongoose.Schema.Types.ObjectId,
        },
      },
    ],
    rate: {
      type: String,
      required: [true, "Rate per day is required"],
      default: function () {
        switch (this.department) {
          case "HR":
            return "800";
          case "IT":
            return "1000";
          case "FINANCE":
            return "900";
          case "SALES":
            return "1100";
          case "MARKETING":
            return "950";
          case "DESIGN":
            return "1050";
          case "SERVICE":
            return "850";
          default:
            return "700";
        }
      },
    },
    pendingWorkLogs: [
      //ข้อมูลการปฏิบัติงานรายวัน
      {
        date: {
          type: Date,
          required: [true, "วันที่ทำงานเป็นสิ่งที่จำเป็น"],
        },
        taskDetails: {
          type: String,
          required: [true, "รายละเอียดของงาน"],
        },
        progressLevel: {
          type: String,
          required: [true, "ระดับความคืบหน้าของงาน"],
        },
        hoursWorked: {
          type: Number,
          required: [true, "จำนวนชั่วโมงที่ทำงาน"],
          min: [1, "จำนวนชั่วโมงขั้นต่ำ 1"],
          max: [7, "จำนวนชั่วโมงสูงสุด 7"],
        },
        _id: {
          type: mongoose.Schema.Types.ObjectId,
        },
      },
    ],
    refuseworklog: [
      //ข้อมูลการปฏิบัติงานรายวัน
      {
        date: {
          type: Date,
          required: [true, "วันที่ทำงานเป็นสิ่งที่จำเป็น"],
        },
        taskDetails: {
          type: String,
          required: [true, "รายละเอียดของงาน"],
        },
        progressLevel: {
          type: String,
          required: [true, "ระดับความคืบหน้าของงาน"],
        },
        hoursWorked: {
          type: Number,
          required: [true, "จำนวนชั่วโมงที่ทำงาน"],
          min: [1, "จำนวนชั่วโมงขั้นต่ำ 1"],
          max: [7, "จำนวนชั่วโมงสูงสุด 7"],
        },
        _id: {
          type: mongoose.Schema.Types.ObjectId,
        },
      },
    ],
    contractEndDate: {
      //วันครบกำหนดสัญญาจ้าง
      type: Date,
      required: true,
      default: function () {
        return new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000); // เพิ่ม 6 เดือน
      },
    },
    totalWorkDuration: {
      type: String,
      default: "0 ปี 0 เดือน 0 วัน",
    },
    remainingContractDuration: {
      type: String,
      default: "0 ปี 0 เดือน 0 วัน",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ["employee", "admin"],
      default: "employee",
    },
  },
  { timestamps: true }
); // เพิ่ม createdAt และ updatedAt อัตโนมัติ

userSchema.pre("save", function (next) {
  const now = new Date();

  // คำนวณ totalWorkDuration
  const startWorkDate = new Date(this.startWorkDate);
  const workDiff = now.getTime() - startWorkDate.getTime();
  const workYears = Math.floor(workDiff / (365.25 * 24 * 60 * 60 * 1000));
  const workMonths = Math.floor(
    (workDiff % (365.25 * 24 * 60 * 60 * 1000)) / (30 * 24 * 60 * 60 * 1000)
  );
  const workDays = Math.floor(
    (workDiff % (30 * 24 * 60 * 60 * 1000)) / (24 * 60 * 60 * 1000)
  );
  this.totalWorkDuration = `${workYears} ปี ${workMonths} เดือน ${workDays} วัน`;

  // คำนวณ remainingContractDuration
  const contractEndDate = new Date(this.contractEndDate);
  const contractDiff = contractEndDate.getTime() - now.getTime();
  if (contractDiff < 0) {
    this.remainingContractDuration = "สัญญาหมดอายุแล้ว";
  } else {
    const contractYears = Math.floor(
      contractDiff / (365.25 * 24 * 60 * 60 * 1000)
    );
    const contractMonths = Math.floor(
      (contractDiff % (365.25 * 24 * 60 * 60 * 1000)) /
        (30 * 24 * 60 * 60 * 1000)
    );
    const contractDays = Math.floor(
      (contractDiff % (30 * 24 * 60 * 60 * 1000)) / (24 * 60 * 60 * 1000)
    );
    this.remainingContractDuration = `${contractYears} ปี ${contractMonths} เดือน ${contractDays} วัน`;
  }

  next();
});

//ฟังก์ชันสำหรับเข้ารหัส
// userSchema.pre("save", async function (next: (err?: Error) => void) {
//   if (!this.isModified("password")) return next();

//   try {
//     const salt = await bcrypt.genSalt(10); 
//     this.password = await bcrypt.hash(this.password, salt);
//     next(); 
//   } catch (error) {
//     next(error as Error); 
//   }
// });

// userSchema.methods.comparePassword = async function (
//   password: string
// ): Promise<boolean> {
//   return bcrypt.compare(password, this.password);
// };

const User = mongoose.model<IUser>("User", userSchema);

export default User;