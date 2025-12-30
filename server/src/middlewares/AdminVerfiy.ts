import { Request, Response, NextFunction } from "express";
import { Iresponse } from "../interface/Iresponse";
import { redisClient } from "../db/redis";
import { IauthnticatedRequest } from "./verifyToken";

export const verifyAdmin = async (req: IauthnticatedRequest, res: Response<Iresponse>, next: NextFunction): Promise<void> => {
    try {
        const Adminid = req.userId;
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
        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
}