import { Request, Response } from "express";
import { pool } from "../db/connectPG";
import { Iresponse } from "../interface/Iresponse";
import { IcreatePlan } from "../interface/Irequest";
import { IauthnticatedRequest } from "../middlewares/verifyToken";
import { redisClient } from "../db/redis";

export const createPlan = async (req: IauthnticatedRequest, res: Response<Iresponse>): Promise<void> => {
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

        const { name, description, price, duration, total_capacity }: IcreatePlan = req.body;
        if (!name || !description || !price || !duration || !total_capacity) {
            res.status(400).json({
                success: false,
                message: "Missing required fields"
            })
            return;
        }

        const result = await pool.query(
            `INSERT INTO plans(name, description, price, duration, total_capacity, subscriptions_left)
            VALUES ($1, $2, $3, $4, $5, $5) RETURNING *`,
            [name, description, price, duration, total_capacity]
        );

        const newPlan = result.rows[0];
        await redisClient.del("all_plans_list");

        res.status(201).json({
            success: true,
            message: "Plan created successfully",
            data: newPlan
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Internal Server Error'
        });
    }
}

export const getAllActivePlans = async (req: Request, res: Response<Iresponse>): Promise<void> => {
    try {
        const cacheKey = "all_plans_list";
        const cachedPlans = await redisClient.get(cacheKey);
        if (cachedPlans) {
            res.status(200).json({
                success: true,
                message: "Plans fetched successfully (Cache)",
                data: JSON.parse(cachedPlans)
            });
            return;
        }

        const result = await pool.query(` 
          SELECT * FROM plans
          WHERE status = 'active' AND subscriptions_left > 0
          ORDER BY created_at DESC  
            `)
        const plans = result.rows;
        if (plans.length > 0) {
            await redisClient.setEx(cacheKey, 3600, JSON.stringify(plans));
        }
        res.status(200).json({
            success: true,
            message: "Plans fetched successfully",
            data: plans
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Internal server Error'
        });
    }
}