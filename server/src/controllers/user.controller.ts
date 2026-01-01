import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { Iresponse } from "../interface/Iresponse";
import { IuserLogin, IuserRegiser } from "../interface/Irequest";
import { pool } from "../db/connectPG";
import { generateTokenandSetCokiee } from "../utils/cookies";
import { IauthnticatedRequest } from "../middlewares/verifyToken";
import { redisClient } from "../db/redis";
import { validate as isUuid } from 'uuid';

export const registerUser = async (req: Request, res: Response<Iresponse>): Promise<void> => {
    try {
        const { name, email, password }: IuserRegiser = req.body;
        if (!name || !email || !password) {
            res.status(400).json({
                success: false,
                message: 'All fields are required'
            })
            return;
        }

        const existedUser = await pool.query(`SELECT id FROM customers WHERE email = $1`, [email]);
        if (existedUser.rows.length > 0) {
            res.status(409).json({
                success: false,
                message: "Email already registered"
            });
            return;
        }

        const password_hash = await bcrypt.hash(password, 10);
        const createUser = await pool.query(`
                    INSERT INTO customers(name, email, password_hash)
                    VALUES($1, $2, $3) RETURNING id, name, email`, [name, email, password_hash]);

        if (createUser.rowCount === 0) {
            res.status(500).json({
                success: false,
                message: "Internal database error"
            });
            return;
        }

        const newUser = createUser.rows[0];

        await generateTokenandSetCokiee(res, newUser.id);

        await redisClient.setEx(`user:${newUser.id}`, 3600, JSON.stringify(newUser));

        res.status(201).json({
            success: true,
            message: 'User account created successfully',
            data: newUser
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Internal server Error'
        });
    }
}

export const loginUser = async (req: Request, res: Response<Iresponse>): Promise<void> => {
    try {
        const { email, password }: IuserLogin = req.body;
        if (!email || !password) {
            res.status(400).json({ success: false, message: 'Email and password are required' })
            return;
        }

        const existedUser = await pool.query(`SELECT * FROM customers WHERE email = $1`, [email]);

        if (existedUser.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: "User not found"
            });
            return;
        }

        const user = existedUser.rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            res.status(401).json({
                success: false,
                message: "Invalid email or password"
            })
            return;
        }

        const userData = { id: user.id, name: user.name, email: user.email };
        await redisClient.setEx(`user:${user.id}`, 3600, JSON.stringify(userData));

        await generateTokenandSetCokiee(res, user.id);
        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: userData
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Internal Server Error'
        });
    }
}

export const getCurrentUser = async (req: IauthnticatedRequest, res: Response<Iresponse>): Promise<void> => {
    try {
        const id = req.userId;

        if (!isUuid(id as any)) {
            res.status(400).json({
                success: false,
                message: "Invalid ID format"
            });
            return;
        }
        if (!id) {
            res.status(401).json({ success: false, message: "Unauthorized access" });
            return;
        }

        const cachedUser = await redisClient.get(`user:${id}`);

        if (cachedUser) {
            res.status(200).json({
                success: true,
                message: 'User data fetched (Cache)',
                data: JSON.parse(cachedUser)
            });
            return;
        }

        const result = await pool.query(`SELECT id, name, email FROM customers WHERE id = $1`, [id]);

        if (result.rows.length === 0) {
            res.status(404).json({ success: false, message: "User not found" })
            return;
        };

        const user = result.rows[0];
        await redisClient.setEx(`user:${id}`, 3600, JSON.stringify(user));

        res.status(200).json({
            success: true,
            message: 'User data fetched (DB)',
            data: user
        })
    } catch (error) {
        console.error("GetCurrentUser Error:", error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}

export const logoutUser = async (req: IauthnticatedRequest, res: Response<Iresponse>): Promise<void> => {
    try {
        const id = req.userId; 

        if (id) {
            await redisClient.del(`user:${id}`);
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