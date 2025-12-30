import { Router } from "express";
import { purchaseSubscription } from "../controllers/subscription.controller";
import { VerifyToken } from "../middlewares/verifyToken";
const router = Router();

router.route('/purchaseSubscription').post(VerifyToken, purchaseSubscription);

export default router;