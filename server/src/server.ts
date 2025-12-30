import { app } from "./index";
import { connectDB } from "./db/connectPG";
import { connectRedis } from "./db/redis";

const port = process.env.PORT || 2303

const startServer = async () => {
    try {
        await connectDB()
        await connectRedis()
            .then(() => {
                app.listen(port, async () => {
                    console.log(`Server is running properly on ${port}`);
                });
            })
            .catch((error) => {
                console.log(`db connection failed due to ${error}`);
            });
    } catch (error) {
        console.log('Something went wrong')
    }
}
startServer();