import { ExpressApp } from './express-app';
// import { createExpressApp } from './express-app-enhanced';
import * as env from './env/index';
import type { Server } from 'http';

console.log('🔄 Starting TypeScript Server...');

let server: Server;

async function startServer() {
    try {
        const app = await ExpressApp();
        const port = typeof env.PORT === 'string' ? parseInt(env.PORT, 10) : env.PORT;

        server = app.listen(port, () => {
            console.log('✅ Server setup complete!');
            console.log(`🚀 Server running on port ${port}`);
            console.log(`📍 Main route: http://localhost:${port}/`);
            console.log(`📍 Health check: http://localhost:${port}/health`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server
startServer();

// Graceful shutdown function
const gracefulShutdown = (signal: string) => {
    console.log(`\n🔄 Received ${signal}. Starting graceful shutdown...`);

    if (server) {
        server.close((err) => {
            if (err) {
                console.error('❌ Error during server shutdown:', err);
                process.exit(1);
            }

            console.log('✅ Server closed successfully');
            console.log('👋 Goodbye!');
            process.exit(0);
        });

        // Force close after 10 seconds
        setTimeout(() => {
            console.log('⏰ Forcing shutdown after 10 seconds...');
            process.exit(1);
        }, 10000);
    } else {
        process.exit(0);
    }
};

// Handle different shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('UNHANDLED_REJECTION');
});
