import express, { Router } from "express";
import { addWorkLog, approveWorkLog, CalcuLate, CancelAddWork, DeleteAddWork, PendingWorkLogs, rejectWorkLog, userPendingWorkLogs, userRefuseWorkLogs, } from "../controllers/worklog.controller";
import { adminRoute, protectRoute } from "../middleware/auth.middleware";

const router: Router = express.Router();

router.post("/", protectRoute, addWorkLog);
router.post("/approveWorkLog/:userId/:workLogId", protectRoute, adminRoute, approveWorkLog);
router.post("/rejectWorkLog/:userId/:workLogId", protectRoute, adminRoute, rejectWorkLog);
router.get("/PendingWorkLogs", protectRoute, adminRoute, PendingWorkLogs);
router.get("/userPendingWorkLogs", protectRoute, userPendingWorkLogs);
router.get("/userRefuseWorkLogs", protectRoute, userRefuseWorkLogs);
router.post("/CancelAddWork/:workLogId", protectRoute, CancelAddWork);
router.post("/DeleteAddWork/:workLogId", protectRoute, DeleteAddWork);
router.get("/CalcuLate", protectRoute, CalcuLate);

export default router;