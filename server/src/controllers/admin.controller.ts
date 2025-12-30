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
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};