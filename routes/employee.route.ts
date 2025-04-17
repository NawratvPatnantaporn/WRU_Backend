import express, { Router } from "express";
import { createEmployees, deleteEmployees, detailEmployees, getAllEmployees, getEmployees, getEmployeesByDepartment, getFeaturedEmployees, updateEmployees } from "../controllers/employees.controller";
import { adminRoute, protectRoute } from "../middleware/auth.middleware";

const router: Router = express.Router();

router.get("/", protectRoute, adminRoute, getAllEmployees);
router.get("/read/:id", protectRoute, adminRoute, detailEmployees);
router.post("/create", protectRoute, adminRoute, createEmployees);
router.put("/:id", protectRoute, adminRoute, updateEmployees);
router.get("/user", protectRoute, getEmployees);
router.delete("/:id", protectRoute, adminRoute, deleteEmployees);
router.get("/featured", getFeaturedEmployees);
router.get("/department/:department", getEmployeesByDepartment);

export default router;