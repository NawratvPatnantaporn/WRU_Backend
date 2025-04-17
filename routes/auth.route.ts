import express, { Router } from "express";
import { login, logout, signup } from "../controllers/auth.controller";
import { protectRoute } from "../middleware/auth.middleware";

const router: Router = express.Router();

router.get("/check-auth", protectRoute, (req, res) => {
  return res.status(200).json({
    success: true,
    message: "คุณเข้าสู่ระบบแล้ว",
    user: req.user,
  });
});

router.post("/signup", signup );
router.post("/login", login );
router.post("/logout", logout );

export default router;