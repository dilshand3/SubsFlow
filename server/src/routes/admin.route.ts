import { Router } from "express";
import { getCurrentAdmin, loginAdmin, logoutAdmin, registerAdmin } from "../controllers/admin.controller";
import { VerifyToken } from "../middlewares/verifyToken";
const router = Router();

router.route('/registerAdmin').post(registerAdmin);
router.route('/loginAdmin').post(loginAdmin);
router.route('/getCurrentAdmin').get(VerifyToken,getCurrentAdmin);
router.route('/AdminLogout').get(VerifyToken,logoutAdmin);

export default router;