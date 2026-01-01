import { Request, Response } from "express";
import { pool } from "../db/connectPG";
import { Iresponse } from "../interface/Iresponse";
import { IcreatePlan } from "../interface/Irequest";
import { redisClient } from "../db/redis";

export const createPlan = async (req: Request, res: Response<Iresponse>): Promise<void> => {
    try {
        const { name, description, price, duration, total_capacity }: IcreatePlan = req.body;
        if (!name || !description || !price || !duration || !total_capacity) {
            res.status(400).json({
                success: false,
                message: "Missing required fields"
            })
            return;
        }

        if (price <= 0 || duration <= 0 || total_capacity <= 0) {
            res.status(400).json({
                success: false,
                message: "Price, duration, and total capacity must be greater than 0"
            });
            return;
        }

        if (!Number.isInteger(duration) || !Number.isInteger(total_capacity)) {
            res.status(400).json({
                success: false,
                message: "Duration and Total Capacity must be whole numbers (no decimals)."
            });
            return;
        }

        const result = await pool.query(
            `INSERT INTO plans(name, description, price, duration, total_capacity, subscriptions_left)
            VALUES ($1, $2, $3, $4, $5, $5) RETURNING *`,
            [name, description, price, duration, total_capacity]
        );

        const newPlan = result.rows[0];
        await redisClient.del("admin:stats");
        await redisClient.del("all_plans_list");
        await redisClient.del('plans_listForAdmin');

        res.status(201).json({
            success: true,
            message: "Plan created successfully",
            data: newPlan
        });
    } catch (error) {
        console.log(error)
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


export const editPlanDetail = async (req: Request, res: Response<Iresponse>): Promise<void> => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({
                success: false,
                message: 'Plan id required'
            })
            return;
        }
        const { name, description, price, duration, status, total_capacity } = req.body;
        if (price <= 0 || duration <= 0 || total_capacity <= 0) {
            res.status(400).json({
                success: false,
                message: 'All field should be positive'
            })
        }

         if (!Number.isInteger(duration) || !Number.isInteger(total_capacity)) {
            res.status(400).json({
                success: false,
                message: "Duration and Total Capacity must be whole numbers (no decimals)."
            });
            return;
        }
        
        const result = await pool.query(
            `UPDATE plans 
             SET name = COALESCE($1, name), 
                 description = COALESCE($2, description), 
                 price = COALESCE($3, price), 
                 status = COALESCE($4, status),
                 total_capacity = COALESCE($5,total_capacity),
                 duration = COALESCE($6,duration),
                 updated_at = CURRENT_TIMESTAMP 
             WHERE id = $7 RETURNING *`,
            [name, description, price, status, total_capacity, duration, id]
        );

        if (result.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: "Plan not found"
            });
            return;
        }

        await redisClient.del("all_plans_list");
        await redisClient.del("admin:stats");
        await redisClient.del('plans_listForAdmin');

        res.status(200).json({
            success: true,
            message: "Plan updated successfully",
            data: result.rows[0]
        });
    } catch (error) {
        console.log(error)
        res.status(500).json({
            success: false,
            message: 'Internal Server Error'
        });
    }
}

export const deletePlanDetail = async (req: Request, res: Response<Iresponse>): Promise<void> => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({ success: false, message: 'Plan Id required' });
            return;
        }

        const subCheck = await pool.query(
            `SELECT COUNT(*) FROM subscriptions WHERE plan_id = $1`,
            [id]
        );

        const subCount = parseInt(subCheck.rows[0].count);

        if (subCount === 0) {
            const deleteResult = await pool.query(
                `DELETE FROM plans WHERE id = $1 RETURNING *`,
                [id]
            );

            if (deleteResult.rows.length === 0) {
                res.status(404).json({
                    success: false,
                    message: "Plan not found"
                });
                return;
            }

        } else {
            const updateResult = await pool.query(
                `UPDATE plans SET status = 'inactive', updated_at = CURRENT_TIMESTAMP 
                 WHERE id = $1 RETURNING *`,
                [id]
            );

            if (updateResult.rows.length === 0) {
                res.status(404).json({
                    success: false,
                    message: "Plan not found",
                    data: updateResult.rows[0]
                });
                return;
            }

        }

        await redisClient.del("all_plans_list");
        await redisClient.del("admin:stats");
        await redisClient.del('plans_listForAdmin');

        res.status(200).json({
            success: true,
            message: "Plan has been suspended"
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Internal Server Error'
        });
    }
}