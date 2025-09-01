import { PrismaClient } from "@prisma/client";


class DatabaseConnection {
    private static instance: PrismaClient

    public static getInstance(): PrismaClient {
        if (!DatabaseConnection.instance) {
            DatabaseConnection.instance = new PrismaClient({
                log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
            })
        }
        return DatabaseConnection.instance
    }

    /**
     * Connect to database
    */
    public static async connect(): Promise<void> {
        try {
            const prisma = DatabaseConnection.getInstance()
            await prisma.$connect()
        } catch (error) {
            console.error('❌ Database connection failed:', error);
            process.exit(1);
        }
    }

    /**
     * Disconnect from database
    */
   public static async disconnect(): Promise<void>{
    try {
        const prisma = DatabaseConnection.getInstance()
        await prisma.$disconnect()
    } catch (error) {
        console.error('❌ Database disconnection failed:', error);
    }
   }
}

export const prisma = DatabaseConnection.getInstance()
export default DatabaseConnection;
