import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// Interface สำหรับ User
export interface IEmp {
  department: string;
  email: string;
  name: string;
  birthday: string;
  phonenumber: string;
  password: string;
  startWorkDate: Date;
  daywork: {
    date: Date;
    taskDetails: string;
    progressLevel: "not started" | "in progress" | "completed";
    hoursWorked: number;
  }[];
  contractEndDate: Date;
  role: "employee" | "admin";
  totalWorkDuration: string; // จากฟังชั่น virtual
  remainingContractDuration: string; // จากฟังชั่น virtual
  comparePassword(password: string): Promise<boolean>;
  extendContract(): void;
}

// Schema สำหรับข้อมูลผู้ใช้
const employeeSchema = new mongoose.Schema<IEmp>(
  {
    department: {
      type: String,
      required: [true, "Department is required"],
      //   enum: ["HR", "IT", "Finance", "Sales", "Marketing"], // ตัวเลือกของแผนกที่อนุญาต
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
    birthday: {
      type: String,
      required: [true, "Birthday is required"],
    }, // ใช้ตอน signup
    phonenumber: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
    }, // ใช้ตอน signup
    password: {
      type: String,
      required: [true, "Password is required"],
      match: [
        /^[0-9]{13}$/,
        "Password ต้องเป็นตัวเลขทั้งหมดและมีความยาว 13 ตัวอักษร",
      ],
    }, // ใช้ตอน signup
    startWorkDate: {
      type: Date,
      required: true,
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
          required: [true, "รายละเอียดของงานเป็นสิ่งที่จำเป็น"],
        },
        progressLevel: {
          type: String,
          enum: ["not started", "in progress", "completed"],
          required: [true, "ระดับความคืบหน้าเป็นสิ่งที่จำเป็น"],
        },
        hoursWorked: {
          type: Number,
          required: [true, "จำนวนชั่วโมงที่ทำงานเป็นสิ่งที่จำเป็น"],
          min: [0, "จำนวนชั่วโมงต้องไม่น้อยกว่า 0"],
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
    role: {
      type: String,
      enum: ["employee", "admin"],
      default: "employee",
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
); // เพิ่ม createdAt และ updatedAt อัตโนมัติ

// Virtual สำหรับคำนวณ "อายุการทำงานรวม"
employeeSchema.virtual("totalWorkDuration").get(function () {
  const now = new Date();
  const startWorkDate = new Date(this.startWorkDate); // แปลงเป็น Date
  const diff = now.getTime() - startWorkDate.getTime();
  const years = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
  const months = Math.floor(
    (diff % (365.25 * 24 * 60 * 60 * 1000)) / (30 * 24 * 60 * 60 * 1000)
  );
  const days = Math.floor(
    (diff % (30 * 24 * 60 * 60 * 1000)) / (24 * 60 * 60 * 1000)
  );
  return `${years} ปี ${months} เดือน ${days} วัน`;
});

// Virtual สำหรับคำนวณ "จำนวนวันคงเหลือที่จะครบกำหนดตามสัญญา"
employeeSchema.virtual("remainingContractDuration").get(function () {
  const now = new Date();
  const contractEndDate = new Date(this.contractEndDate); // แปลงเป็น Date
  const diff = contractEndDate.getTime() - now.getTime(); // ใช้สำหรับคำนวณ
  if (diff < 0) return "สัญญาหมดอายุแล้ว";
  const years = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
  const months = Math.floor(
    (diff % (365.25 * 24 * 60 * 60 * 1000)) / (30 * 24 * 60 * 60 * 1000)
  );
  const days = Math.floor(
    (diff % (30 * 24 * 60 * 60 * 1000)) / (24 * 60 * 60 * 1000)
  );
  return `${years} ปี ${months} เดือน ${days} วัน`;
});

// ฟังก์ชันสำหรับต่ออายุสัญญาแสดงที่ admin
employeeSchema.methods.extendContract = function () {
  const today = new Date();
  if (today <= this.contractEndDate) {
    this.contractEndDate = new Date(
      today.getTime() + 6 * 30 * 24 * 60 * 60 * 1000
    );
  }
};

employeeSchema.pre("save", async function (next: (err?: Error) => void) {
  if (!this.isModified("password")) return next(); // ข้ามถ้า password ไม่ถูกแก้ไข

  try {
    const salt = await bcrypt.genSalt(10); // สร้าง Salt
    this.password = await bcrypt.hash(this.password, salt); // เข้ารหัส Password
    next();
  } catch (error) {
    next(error as Error);
  }
});

employeeSchema.methods.comparePassword = async function (
  password: string
): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

const Emp = mongoose.model<IEmp>("Emp", employeeSchema);

export default Emp;
