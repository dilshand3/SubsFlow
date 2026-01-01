import { Router } from "express";
import { cancelUserSubscription, getMySubscriptions, purchaseSubscription, updateSubscription } from "../controllers/subscription.controller";
import { VerifyToken } from "../middlewares/verifyToken";
const router = Router();

router.route('/purchaseSubscription').post(VerifyToken, purchaseSubscription);
router.route('/getMySubscriptions').get(VerifyToken, getMySubscriptions);
router.route('/cancelUserSubscription/:id').post(VerifyToken, cancelUserSubscription);
router.route('/updateSubscription').post(VerifyToken, updateSubscription);

export default router;