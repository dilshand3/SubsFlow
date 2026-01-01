import { NextFunction,Response } from "express";
import { redisClient } from "../db/redis";
import { Iresponse } from "../interface/Iresponse";
import { IauthnticatedRequest } from "./verifyToken";

export const verifyAdmin = async (req: IauthnticatedRequest, res: Response<Iresponse>, next: NextFunction): Promise<void> => {
    try {
        const Adminid = req.userId;
        if (!Adminid) {
            res.status(400).json({
                success: false,
                message: "Invalid or missing ID format"
            });
            return;
        }
        const isAdminCached = await redisClient.get(`admin:${Adminid}`);

        if (!isAdminCached) {
            res.status(403).json({
                success: false,
                message: "Access Denied: Admin session not found or expired"
            });
            return;
        }

        next();
    } catch (error) {
        console.error("VerifyAdmin Error:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
}