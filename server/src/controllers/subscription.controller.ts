import { Response } from "express";
import { Iresponse } from "../interface/Iresponse";
import { validate as isUuid } from 'uuid';
import { IauthnticatedRequest } from "../middlewares/verifyToken";
import { pool } from "../db/connectPG";
import { redisClient } from "../db/redis";

export const purchaseSubscription = async (req: IauthnticatedRequest, res: Response<Iresponse>): Promise<void> => {
    const client = await pool.connect();
    let attemptLogId: string | null = null;

    try {
        const { planId } = req.body;
        const userId = req.userId;

        if (!planId) {
            res.status(400).json({ success: false, message: "Plan ID is required" });
            return;
        }

        if (!isUuid(planId)) {
            res.status(400).json({
                success: false,
                message: "Invalid Plan ID format"
            });
            return;
        }

        const activeSubCheck = await pool.query(
            `SELECT id, plan_id, status FROM subscriptions 
             WHERE customer_id = $1 AND status = 'active'`,
            [userId]
        );

        if (activeSubCheck.rows.length > 0) {
            const currentSub = activeSubCheck.rows[0];
            if (currentSub.plan_id === planId) {
                res.status(409).json({
                    success: false,
                    message: "This plan is already active.",
                    data: currentSub
                });
                return;
            }
            res.status(409).json({
                success: false,
                message: "You already have an active subscription. Please upgrade or downgrade instead.",
                data: {
                    errorType: "EXISTING_SUBSCRIPTION",
                    currentSubId: currentSub.id,
                    existingPlanId: currentSub.plan_id
                }
            });
            return;
        }


        const idempotencyKey = `${userId}_${planId}`;

        const existingSub = await pool.query(
            `SELECT id, status FROM subscriptions 
             WHERE idempotency_key = $1 AND status IN ('active', 'pending')`,
            [idempotencyKey]
        );

        if (existingSub.rows.length > 0) {
            const sub = existingSub.rows[0];

            res.status(409).json({
                success: false,
                message: sub.status === 'pending'
                    ? "Subscription request is pending admin confirmation"
                    : "Subscription is already active",
                data: sub
            });
            return;
        }

        const logRes = await pool.query(
            `INSERT INTO audit_logs (customer_id, event_type, description, metadata) 
             VALUES ($1, 'PURCHASE_ATTEMPT', 'Initiating purchase', $2) RETURNING id`,
            [userId, JSON.stringify({ planId, idempotencyKey })]
        );
        attemptLogId = logRes.rows[0].id;

        await client.query('BEGIN');
        const planRes = await client.query(
            `SELECT id, duration, subscriptions_left, total_capacity, price 
             FROM plans 
             WHERE id = $1 AND status = 'active' 
             FOR UPDATE`,
            [planId]
        );

        const plan = planRes.rows[0];

        if (!plan) {
            throw new Error("PLAN_NOT_FOUND");
        }
        if (plan.subscriptions_left <= 0) {
            throw new Error("SOLD_OUT");
        }

        await client.query(
            `UPDATE plans 
             SET subscriptions_left = subscriptions_left - 1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [planId]
        );

        const endDateRes = await client.query(
            `SELECT CURRENT_TIMESTAMP + ($1::INTERVAL) as end_date`,
            [plan.duration]
        );

        const subResult = await client.query(
            `INSERT INTO subscriptions 
             (customer_id, plan_id, status, start_date, end_date, idempotency_key, created_at) 
             VALUES ($1, $2, 'active', CURRENT_TIMESTAMP, $3, $4, CURRENT_TIMESTAMP) 
             RETURNING *`,
            [userId, planId, endDateRes.rows[0].end_date, idempotencyKey]
        );

        await client.query(
            `UPDATE audit_logs 
             SET event_type = 'PURCHASE_SUCCESS', 
                 description = 'Subscription active',
                 metadata = metadata || jsonb_build_object('subscription_id', $2::text)
             WHERE id = $1`,
            [attemptLogId, subResult.rows[0].id]
        );

        await client.query('COMMIT');

        try {
            await Promise.all([
                redisClient.del(`user_subs:${userId}`),
                redisClient.del("admin:stats"),
                redisClient.del("all_plans_list"),
                redisClient.del('plans_listForAdmin')

            ]);
        } catch (redisError) {
            console.error("Redis Cache Clear Failed:", redisError);
        }

        res.status(201).json({
            success: true,
            message: "Subscription activated successfully!",
            data: subResult.rows[0]
        });

    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error("Purchase Error:", error);

        if (attemptLogId) {
            await pool.query(
                `UPDATE audit_logs SET event_type = 'PURCHASE_FAILED', description = $1 WHERE id = $2`,
                [error.message, attemptLogId]
            );
        }

        if (error.message === "SOLD_OUT") {
            res.status(409).json({ success: false, message: "Sorry, this plan is sold out." });
        } else if (error.message === "PLAN_NOT_FOUND") {
            res.status(404).json({ success: false, message: "Plan not found." });
        } else {
            res.status(500).json({ success: false, message: "Internal Server Error" });
        }

    } finally {
        client.release();
    }
};

export const getMySubscriptions = async (req: IauthnticatedRequest, res: Response<Iresponse>): Promise<void> => {
    try {
        const userId = req.userId;
        const cacheKey = `user_subs:${userId}`;
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            res.status(200).json({
                success: true,
                message: "Fetched from cache",
                data: JSON.parse(cachedData)
            });
            return;
        }

        const result = await pool.query(`
            SELECT 
                s.id as subscription_id,
                p.name as plan_name,
                p.price,
                s.status,
                s.start_date,
                s.end_date
            FROM subscriptions s
            JOIN plans p ON s.plan_id = p.id
            WHERE s.customer_id = $1
            ORDER BY s.created_at DESC
        `, [userId]);
        if (result.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: 'No Subscription found'
            })
            return;
        }
        const subscriptions = result.rows;
        await redisClient.setEx(cacheKey, 600, JSON.stringify(subscriptions));

        res.status(200).json({
            success: true,
            message: "Subscriptions fetched successfully",
            data: subscriptions
        });
    } catch (error) {
        console.log(error)
        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
}

export const cancelUserSubscription = async (req: IauthnticatedRequest, res: Response<Iresponse>): Promise<void> => {
    const client = await pool.connect();
    try {
        const userId = req.userId;
        const { id } = req.params;

        if (!id) {
            res.status(400).json({
                success: false,
                message: "Id Required"
            });
            return;
        }

        await client.query('BEGIN');

        const subCheck = await client.query(`
            SELECT * FROM subscriptions WHERE id = $1 AND customer_id = $2 FOR UPDATE
        `, [id, userId]);

        if (subCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            res.status(404).json({
                success: false,
                message: "Subscription not found"
            });
            return;
        }
        const subscription = subCheck.rows[0];

        if (subscription.status === 'cancelled') {
            await client.query('ROLLBACK');
            res.status(400).json({
                success: false,
                message: "Subscription is already cancelled"
            });
            return;
        }

        const updatedSub = await client.query(
            `UPDATE subscriptions SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP 
             WHERE id = $1 RETURNING *`,
            [id]
        );

        await client.query(
            `UPDATE plans SET subscriptions_left = subscriptions_left + 1 WHERE id = $1`,
            [subscription.plan_id]
        );
        await client.query(
            `INSERT INTO audit_logs (customer_id, event_type, description, metadata) 
             VALUES ($1, 'SUBSCRIPTION_CANCELLED', $2, $3)`,
            [userId, `User cancelled subscription ID: ${id}`, JSON.stringify({ plan_id: subscription.plan_id })]
        );

        await client.query('COMMIT');

        await Promise.all([
            redisClient.del(`user_subs:${userId}`),
            redisClient.del("admin:stats"),
            redisClient.del("all_plans_list")
        ]);

        res.status(200).json({
            success: true,
            message: "Subscription cancelled and seat restored",
            data: updatedSub.rows[0]
        });

    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    } finally {
        client.release();
    }
};

export const updateSubscription = async (req: IauthnticatedRequest, res: Response<Iresponse>): Promise<void> => {
    const client = await pool.connect();
    let attemptLogId: string | null = null;
    try {
       const userId = req.userId;
        const { currentSubId, newPlanId } = req.body;

        if (!currentSubId || !newPlanId) {
            res.status(400).json({
                success: false,
                message: "Missing required fields"
            });
            return;
        }

        // 1. Audit Log Entry (Attempt)
        const logRes = await pool.query(
            `INSERT INTO audit_logs (customer_id, event_type, description, metadata) 
             VALUES ($1, 'PLAN_CHANGE_ATTEMPT', $2, $3) RETURNING id`,
            [userId, `User trying to change sub ${currentSubId} to plan ${newPlanId}`, JSON.stringify({ currentSubId, newPlanId })]
        );
        attemptLogId = logRes.rows[0].id;
        // throw new Error('simulator error')


        await client.query('BEGIN');

        // 2. Fetch Current Subscription
        const currentSubRes = await client.query(
            `SELECT s.*, p.price as old_price FROM subscriptions s 
             JOIN plans p ON s.plan_id = p.id
             WHERE s.id = $1 AND s.customer_id = $2 AND s.status = 'active' FOR UPDATE`,
            [currentSubId, userId]
        );

        if (currentSubRes.rows.length === 0) {
            await client.query('ROLLBACK');
            res.status(404).json({ success: false, message: "Active subscription nahi mili" });
            return;
        }
        const oldSub = currentSubRes.rows[0];

        // 🔥 EDGE CASE CHECK: SAME PLAN 🔥
        // Agar purana plan ID aur naya plan ID same hai, toh error return karo
        if (oldSub.plan_id === newPlanId) {
            await client.query('ROLLBACK');
            
            // Log update kar do ki attempt fail kyun hua
            await pool.query(
                `UPDATE audit_logs SET event_type = 'PLAN_CHANGE_SKIPPED', description = 'User selected the same plan' WHERE id = $1`,
                [attemptLogId]
            );

            res.status(400).json({ 
                success: false, 
                message: "You are already subscribed to this plan." 
            });
            return;
        }

        // 3. Fetch New Plan Details
        const newPlanRes = await client.query(
            `SELECT * FROM plans WHERE id = $1 AND status = 'active' FOR UPDATE`,
            [newPlanId]
        );
        const newPlan = newPlanRes.rows[0];

        if (!newPlan || newPlan.subscriptions_left <= 0) {
            await client.query('ROLLBACK');
            res.status(400).json({ success: false, message: "Naya plan available nahi hai" });
            return;
        }

        // 4. Update Seats (Purane me +1, Naye me -1)
        await client.query(`UPDATE plans SET subscriptions_left = subscriptions_left + 1 WHERE id = $1`, [oldSub.plan_id]);
        await client.query(`UPDATE plans SET subscriptions_left = subscriptions_left - 1 WHERE id = $1`, [newPlanId]);

        // 5. Cancel Old Subscription
        await client.query(`UPDATE subscriptions SET status = 'cancelled' WHERE id = $1`, [currentSubId]);
        
        // 6. Create New Subscription
        const changeIdempotencyKey = `${userId}_${newPlanId}`;
        const subResult = await client.query(
            `INSERT INTO subscriptions (customer_id, plan_id, status, start_date, end_date, idempotency_key) 
             VALUES ($1, $2, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + ($3::INTERVAL), $4) RETURNING *`,
            [userId, newPlanId, newPlan.duration, changeIdempotencyKey]
        );

        // 7. Update Audit Log (Success)
        const isUpgrade = newPlan.price > oldSub.old_price;
        await client.query(
            `UPDATE audit_logs SET event_type = $1, description = $2 WHERE id = $3`,
            [isUpgrade ? 'PLAN_UPGRADE_SUCCESS' : 'PLAN_DOWNGRADE_SUCCESS', `Successfully changed plan`, attemptLogId]
        );

        await client.query('COMMIT');
        
        // 8. Clear Cache
        await redisClient.del(`user_subs:${userId}`);
        await redisClient.del("admin:dashboard_stats");
        await redisClient.del("all_active_plans");
        await redisClient.del('plans_listForAdmin');

        res.status(200).json({
            success: true,
            message: `Plan ${isUpgrade ? 'Upgraded' : 'Downgraded'} successfully. Cache Refreshed!`,
            data: subResult.rows[0]
        });
    } catch (error: any) {
       await client.query('ROLLBACK');

        if (attemptLogId) {
            await pool.query(
                `UPDATE audit_logs SET event_type = 'PLAN_CHANGE_INTERRUPTED', description = $1 WHERE id = $2`,
                [error.message, attemptLogId]
            );
        }
        if (error.code === '23505') { 
             res.status(400).json({
                success: false,
                message: "You have already switched to this plan."
            });
            return;
        }

        res.status(500).json({
            success: false,
            message: error.message
        });
    } finally {
        client.release();
    }
};