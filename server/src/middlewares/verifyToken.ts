import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from 'jsonwebtoken';
import { Iresponse } from "../interface/Iresponse";

export interface IauthnticatedRequest extends Request {
    userId?: string;
}

interface TokenPayload extends JwtPayload {
    userId: string;
}

export const VerifyToken = async (req: IauthnticatedRequest, res: Response<Iresponse>, Next: NextFunction): Promise<void> => {
    const sessionId = req.cookies.sessionId;

    if (!sessionId) {
        res.status(401).json({
            success: false,
            message: "UnAuthorized- no token provided"
        })
        return;
    }

    try {
        const decoded = jwt.verify(
            sessionId,
            process.env.STUDIO_TOKEN as string,
        ) as TokenPayload;

        if (!decoded.userId) {
            res.status(401).json({
                success : false,
                message : "UnAuthorized - Invalid Token"
            })
            return;
        }

        req.userId = decoded.userId;
        Next()
    } catch (error){
        res.status(500).json({
            success : false,
            message : "Internal Server Error"
        })
    }
}