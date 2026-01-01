import { Router } from "express";
import { adminConfirmFailedSubscription, audit_logsHistory, getAllPlansdetail, getCurrentAdmin, getDashboardStats, loginAdmin, logoutAdmin, registerAdmin } from "../controllers/admin.controller";
import { VerifyToken } from "../middlewares/verifyToken";
import { verifyAdmin } from "../middlewares/AdminVerfiy";
const router = Router();

router.route('/registerAdmin').post(registerAdmin);
router.route('/loginAdmin').post(loginAdmin);
router.route('/getCurrentAdmin').get(VerifyToken, getCurrentAdmin);
router.route('/AdminLogout').get(VerifyToken, logoutAdmin);
router.route('/getDashboardStats').get(VerifyToken, verifyAdmin,getDashboardStats);
router.route('/adminConfirmFailedSubscription').post(VerifyToken,verifyAdmin,adminConfirmFailedSubscription);
router.route('/audit_logsHistory').get(VerifyToken,verifyAdmin,audit_logsHistory);
router.route('/getAllPlans').get(VerifyToken,verifyAdmin,getAllPlansdetail);

export default router;