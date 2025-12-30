import { Router } from "express";
import { VerifyToken } from "../middlewares/verifyToken";
import { createPlan, deletePlanDetail, editPlanDetail, getAllActivePlans } from "../controllers/plan.controller";
import { verifyAdmin } from "../middlewares/AdminVerfiy";
const router = Router();

router.route('/createPlan').post(VerifyToken, verifyAdmin, createPlan);
router.route('/getAllActivePlan').get(getAllActivePlans);
router.route('/editPlanDetail/:id').post(VerifyToken, verifyAdmin, editPlanDetail);
router.route('/deletePlanDetail/:id').get(VerifyToken, verifyAdmin, deletePlanDetail);

export default router;