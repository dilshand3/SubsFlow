import { createClient } from 'redis';

export const redisClient = createClient();

redisClient.on('error', (err) => console.log('Redis Client Error', err));

export const connectRedis = async () => {
    try {
        if (!redisClient.isOpen) await redisClient.connect();
        console.log("Redis Connected!");
    } catch (error) {
        console.log(`${error}`);
    }
};