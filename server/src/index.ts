import dotenv from 'dotenv';
dotenv.config({
    path: './.env'
});
import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

const app = express();
app.use(cors(
    {
        origin: [
        process.env.CORS_ORIGIN_ADMIN as string,
        process.env.CORS_ORIGIN_CLIENT as string
    ],
        credentials : true
    }
));
app.use(express.json({ limit: '16kb' }));
app.use(cookieParser());

app.get('/', (req: Request, res: Response) => {
    res.status(200).json({
        success: true,
        message: 'Server is running properly'
    });
});

import adminRoute from './routes/admin.route';
app.use('/admin', adminRoute);

import userRoute from './routes/user.route';
app.use('/user', userRoute);

import planRoute from './routes/plan.route';
app.use('/plan', planRoute);

import subscriptionRoute from './routes/subscription.route';
app.use('/subscription', subscriptionRoute);

export { app }