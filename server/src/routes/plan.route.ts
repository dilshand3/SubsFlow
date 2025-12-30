import { Router } from "express";
import { VerifyToken } from "../middlewares/verifyToken";
import { createPlan, getAllActivePlans } from "../controllers/plan.controller";
const router = Router();

router.route('/createPlan').post(VerifyToken, createPlan);
router.route('/getAllActivePlan').get(getAllActivePlans)

export default router;