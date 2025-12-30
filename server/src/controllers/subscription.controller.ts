import { Response } from "express";
import { Iresponse } from "../interface/Iresponse";
import { IauthnticatedRequest } from "../middlewares/verifyToken";
import { pool } from "../db/connectPG";

export const purchaseSubscription = async (req: IauthnticatedRequest, res: Response<Iresponse>): Promise<void> => {
    const client = await pool.connect();
    try {
        const { planId } = req.body;
        const userId = req.userId;

        if (!planId) {
            res.status(400).json({
                success: false,
                message: "Plan ID is required"
            });
            return;
        }

        await client.query('BEGIN');
        const planRes = await client.query(
            `SELECT * FROM plans WHERE id = $1 FOR UPDATE`,
            [planId]
        )

        if (planRes.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: "Plan not found"
            });
            await client.query('ROLLBACK');
            return;
        }

        const plan = planRes.rows[0];

        if (plan.subscriptions_left <= 0) {
            res.status(400).json({
                success: false,
                message: "Plan is fully booked!"
            });
            await client.query('ROLLBACK');
            return;
        }

        const idempotencyKey = `${userId}_${planId}`;

        const endDateRes = await client.query(
            `SELECT CURRENT_TIMESTAMP + ($1::INTERVAL) as end_date`,
            [plan.duration]
        );
        const endDate = endDateRes.rows[0].end_date;

        await client.query(
            `UPDATE plans SET subscriptions_left = subscriptions_left - 1 WHERE id = $1`,
            [planId]
        );

        const subscriptionInsert = await client.query(
            `INSERT INTO subscriptions (customer_id, plan_id, status, start_date, end_date, idempotency_key) 
             VALUES ($1, $2, 'active', CURRENT_TIMESTAMP, $3, $4) 
             RETURNING *`,
            [userId, planId, endDate, idempotencyKey]
        );

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            message: "Subscription activated successfully!",
            data: subscriptionInsert.rows[0]
        });
    } catch (error: any) {
        await client.query('ROLLBACK');
        if (error.code === '23505') {
            res.status(400).json({
                success: false,
                message: "You already have an active subscription for this plan!"
            });
        } else {
            console.error("Purchase Error:", error);
            res.status(500).json({
                success: false,
                message: "Internal Server Error"
            });
        }
    } finally {
        client.release();
    }
}