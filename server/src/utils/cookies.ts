import { Response } from 'express';
import jwt from 'jsonwebtoken';

export const generateTokenandSetCokiee = async (res: Response, userId: string): Promise<string> => {
    const sessionId = jwt.sign(
        { userId },
        process.env.STUDIO_TOKEN as string,
        {
            expiresIn: '7d'
        }
    )
    res.cookie("sessionId", sessionId, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/"
    });
    return sessionId
}