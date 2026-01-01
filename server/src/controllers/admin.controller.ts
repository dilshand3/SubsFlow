import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { pool } from "../db/connectPG";
import { Iresponse } from "../interface/Iresponse";
import { IadminAuth } from "../interface/Irequest";
import { generateTokenandSetCokiee } from "../utils/cookies";
import { IauthnticatedRequest } from "../middlewares/verifyToken";
import { redisClient } from "../db/redis";

export const registerAdmin = async (req: Request, res: Response<Iresponse>): Promise<void> => {
    try {
        const { name, password }: IadminAuth = req.body;
        if (!name || !password) {
            res.status(400).json({
                success: false,
                message: 'All fields are required'
            })
            return;
        }

        const existedAdmin = await pool.query(`SELECT id FROM admin WHERE name = $1`, [name]);

        if (existedAdmin.rows.length > 0) {
            res.status(409).json({
                success: false,
                message: "Admin name already taken"
            });
            return;
        }

        const password_hash = await bcrypt.hash(password, 10);
        const createAdmin = await pool.query(`
            INSERT INTO admin(name, password)
            VALUES($1, $2) RETURNING id, name`, [name, password_hash]);

        if (createAdmin.rowCount === 0) {
            res.status(500).json({
                success: false,
                message: "Failed to create admin account"
            });
            return;
        }

        const newAdmin = createAdmin.rows[0];
        await redisClient.setEx(`admin:${newAdmin.id}`, 3600, JSON.stringify(newAdmin));

        await generateTokenandSetCokiee(res, newAdmin.id);

        res.status(201).json({
            success: true,
            message: 'Admin registered successfully',
            data: newAdmin
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Internal Server Error'
        });
    }
}

export const loginAdmin = async (req: Request, res: Response<Iresponse>): Promise<void> => {
    try {
        const { name, password }: IadminAuth = req.body;
        if (!name || !password) {
            res.status(400).json({
                success: false,
                message: 'Name and password required'
            });
            return;
        }

        const result = await pool.query(`SELECT * FROM admin WHERE name = $1`, [name]);

        if (result.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: "Admin not found"
            });
            return;
        }

        const admin = result.rows[0];
        const isMatch = await bcrypt.compare(password, admin.password);

        if (!isMatch) {
            res.status(401).json({
                success: false,
                message: "Invalid credentials"
            })
            return;
        }

        const adminCacheData = { id: admin.id, name: admin.name };
        await redisClient.setEx(`admin:${admin.id}`, 3600, JSON.stringify(adminCacheData));

        await generateTokenandSetCokiee(res, admin.id);

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: adminCacheData
        });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}

export const getCurrentAdmin = async (req: IauthnticatedRequest, res: Response<Iresponse>): Promise<void> => {
    try {
        const id = req.userId;
        if (!id) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }

        const cachedAdmin = await redisClient.get(`admin:${id}`);
        if (cachedAdmin) {
            res.status(200).json({
                success: true,
                message: 'Admin data fetched (Cache)',
                data: JSON.parse(cachedAdmin)
            });
            return;
        }

        const result = await pool.query(`SELECT id, name FROM admin WHERE id = $1`, [id]);

        if (result.rows.length === 0) {
            res.status(404).json({ success: false, message: "Admin not found" });
            return;
        };

        const admin = result.rows[0];
        await redisClient.setEx(`admin:${id}`, 3600, JSON.stringify(admin));

        res.status(200).json({
            success: true,
            message: 'Admin data fetched (DB)',
            data: admin
        })
    } catch (error) {
        console.error("Get Current Admin Error:", error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}

export const logoutAdmin = async (req: IauthnticatedRequest, res: Response<Iresponse>): Promise<void> => {
    try {
        const id = req.userId;
        if (id) {
            await redisClient.del(`admin:${id}`);
        }

        res.clearCookie("sessionId", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict"
        });

        res.status(200).json({
            success: true,
            message: "Logged out successfully"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

export const getDashboardStats = async (req: IauthnticatedRequest, res: Response<Iresponse>): Promise<void> => {
    try {
        const isAdmin = await redisClient.get(`admin:${req.userId}`);
        if (!isAdmin) {
            res.status(403).json({
                success: false,
                message: "Access Denied"
            });
            return;
        }

        const cacheKey = "admin:stats";
        const cachedStats = await redisClient.get(cacheKey);
        if (cachedStats) {
            res.status(200).json({
                success: true,
                message: "Dashboard stats fetched (Cache)",
                data: JSON.parse(cachedStats)
            });
            return;
        }

        const statsQuery = `
            SELECT 
    (SELECT COUNT(*) FROM customers) AS total_users,
    s.active_subs,
    s.total_revenue,
    p.total_plans,
    p.available_plans,
    p.fully_booked_plans
FROM (
    SELECT 
        COUNT(*) FILTER (WHERE sub.status = 'active') AS active_subs,
        COALESCE(SUM(pl.price), 0) AS total_revenue
    FROM subscriptions sub
    JOIN plans pl ON sub.plan_id = pl.id
) s,
(
    SELECT 
        COUNT(*) AS total_plans,
        COUNT(*) FILTER (WHERE status = 'active' AND subscriptions_left > 0) AS available_plans,
        COUNT(*) FILTER (WHERE status = 'active' AND subscriptions_left = 0) AS fully_booked_plans
    FROM plans
) p;
        `;

        const result = await pool.query(statsQuery);
        const stats = result.rows[0];
        await redisClient.setEx(cacheKey, 300, JSON.stringify(stats));

        res.status(200).json({
            success: true,
            message: "Dashboard stats fetched successfully",
            data: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
}

export const adminConfirmFailedSubscription = async (req: IauthnticatedRequest, res: Response<Iresponse>): Promise<void> => {
    const client = await pool.connect();
    try {
        const { logId } = req.body;
        const adminId = req.userId;

        if (!logId) {
            res.status(400).json({ success: false, message: "Audit Log ID is required" });
            return;
        }

        const logRes = await pool.query(`SELECT * FROM audit_logs WHERE id = $1`, [logId]);
        if (logRes.rows.length === 0) {
            res.status(404).json({ success: false, message: "Log record not found" });
            return;
        }

        const logData = logRes.rows[0];

        let meta = logData.metadata;
        if (typeof meta === 'string') meta = JSON.parse(meta);

        const targetPlanId = meta.planId || meta.newPlanId;
        const currentSubId = meta.currentSubId;

        const idempotencyKey = meta.idempotencyKey || `ADMIN_FIX_${logData.customer_id}_${targetPlanId}_${Date.now()}`;

        const customerId = logData.customer_id;

        if (!targetPlanId) {
            res.status(400).json({ success: false, message: "Invalid Metadata: No Plan ID found" });
            return;
        }

        const subExists = await pool.query(
            `SELECT id FROM subscriptions WHERE idempotency_key = $1`,
            [idempotencyKey]
        );

        if (subExists.rows.length > 0) {
            await pool.query(
                `UPDATE audit_logs SET event_type = 'PURCHASE_SUCCESS', description = 'Marked as success (already exists)' WHERE id = $1`,
                [logId]
            );
            res.status(200).json({ success: true, message: "Subscription already exists." });
            return;
        }

        await client.query('BEGIN');

        if (currentSubId) {
            const oldSubRes = await client.query(`SELECT plan_id FROM subscriptions WHERE id = $1 FOR UPDATE`, [currentSubId]);
            if (oldSubRes.rows.length > 0) {
                const oldPlanId = oldSubRes.rows[0].plan_id;
                await client.query(`UPDATE plans SET subscriptions_left = subscriptions_left + 1 WHERE id = $1`, [oldPlanId]);

                await client.query(`UPDATE subscriptions SET status = 'cancelled' WHERE id = $1`, [currentSubId]);
            }
        }

        const planRes = await client.query(`SELECT * FROM plans WHERE id = $1 FOR UPDATE`, [targetPlanId]);
        const plan = planRes.rows[0];

        if (!plan || plan.subscriptions_left <= 0) {
            throw new Error("PLAN_FULL");
        }

        await client.query(`UPDATE plans SET subscriptions_left = subscriptions_left - 1 WHERE id = $1`, [targetPlanId]);

        const endDateRes = await client.query(`SELECT CURRENT_TIMESTAMP + ($1::INTERVAL) as end_date`, [plan.duration]);

        const subResult = await client.query(
            `INSERT INTO subscriptions (customer_id, plan_id, status, start_date, end_date, idempotency_key) 
             VALUES ($1, $2, 'active', CURRENT_TIMESTAMP, $3, $4) RETURNING *`,
            [customerId, targetPlanId, endDateRes.rows[0].end_date, idempotencyKey]
        );

        await client.query(
            `UPDATE audit_logs SET event_type = 'PURCHASE_RESOLVED_BY_ADMIN', description = $1 WHERE id = $2`,
            [`Resolved manually by Admin: ${adminId}`, logId]
        );

        await client.query('COMMIT');

        await Promise.all([
            redisClient.del(`user_subs:${customerId}`),
            redisClient.del("admin:stats"),
            redisClient.del("all_plans_list"),
            redisClient.del("admin:dashboard_stats"),
            redisClient.del('plans_listForAdmin')
        ]);

        res.status(200).json({ success: true, message: "Subscription Fixed!", data: subResult.rows[0] });

    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error("Admin Fix Error:", error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        client.release();
    }
};

export const audit_logsHistory = async (req: Request, res: Response<Iresponse>): Promise<void> => {
    try {
        // Query param se userId lein (Optional: Admin kisi specific user ka data dekh sake)
        const { userId } = req.query;

        // 1. Generate Cache Key (User specific ya Global)
        const cacheKey = userId
            ? `audit_logs:user:${userId}`
            : `audit_logs:all`;

        // 2. Check Redis Cache
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            res.status(200).json({
                success: true,
                message: "Audit logs fetched from cache",
                data: JSON.parse(cachedData)
            });
            return;
        }

        // 3. Build SQL Query
        // Hum metadata se plan_id nikal kar plans table se join karenge
        let query = `
            SELECT 
                al.id,
                al.event_type,
                al.description,
                al.metadata,
                al.created_at,
                
                -- Customer Details
                c.name as customer_name,
                c.email as customer_email,
                
                -- Plan Details (Joined via metadata ID)
                p.name as plan_name,
                p.price as plan_price
            FROM audit_logs al
            LEFT JOIN customers c ON al.customer_id = c.id
            LEFT JOIN plans p ON (
                -- Metadata se ID extract karke UUID me cast kar rahe hain
                -- Alag-alag events me ID ka naam alag ho sakta hai
                CASE 
                    WHEN (al.metadata->>'planId') ~ '^[0-9a-fA-F-]{36}$' 
                        THEN (al.metadata->>'planId')::uuid
                    WHEN (al.metadata->>'newPlanId') ~ '^[0-9a-fA-F-]{36}$' 
                        THEN (al.metadata->>'newPlanId')::uuid
                    WHEN (al.metadata->>'plan_id') ~ '^[0-9a-fA-F-]{36}$' 
                        THEN (al.metadata->>'plan_id')::uuid
                    ELSE NULL
                END
            ) = p.id
        `;

        const params: any[] = [];

        // Agar specific user ka chahiye
        if (userId) {
            query += ` WHERE al.customer_id = $1`;
            params.push(userId);
        }

        query += ` ORDER BY al.created_at DESC`;

        // 4. Execute Query
        const result = await pool.query(query, params);

        // 5. Save to Redis (Expiry: 60 seconds)
        // Data stringify karke save karein
        await redisClient.setEx(cacheKey, 60, JSON.stringify(result.rows));

        // 6. Return Response
        res.status(200).json({
            success: true,
            message: "Audit logs fetched successfully",
            data: result.rows
        });

    } catch (error: any) {
        console.error("Audit Logs Error:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
}

export const getAllPlansdetail = async (req: Request, res: Response<Iresponse>): Promise<void> => {
    try {
        const cacheKey = "plans_listForAdmin";
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
            message: 'internal server Error'
        });
    }
}