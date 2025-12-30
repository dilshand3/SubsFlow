import { Router } from "express";
import { registerUser, loginUser, getCurrentUser, logoutUser } from "../controllers/user.controller";
import { VerifyToken } from "../middlewares/verifyToken";
const router = Router();

router.route('/registerUser').post(registerUser);
router.route('/loginUser').post(loginUser);
router.route('/getCurrentUser').get(VerifyToken, getCurrentUser);
router.route('/logoutUser').get(VerifyToken, logoutUser);

export default router;