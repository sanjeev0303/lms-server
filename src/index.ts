import 'module-alias/register';
import { ExpressApp } from './express-app';
// import { createExpressApp } from './express-app-enhanced';
import * as env from './env/index';
import type { Server } from 'http';

console.log('🔄 Starting LMS Server...');
console.log(`📍 Environment: ${env.NODE_ENV}`);
console.log(`📍 Render deployment: ${env.IS_RENDER ? 'Yes' : 'No'}`);

let server: Server;

async function startServer() {
    try {
        console.log('🔄 Initializing Express app...');
        const app = await ExpressApp();

        const port = typeof env.PORT === 'string' ? parseInt(env.PORT, 10) : env.PORT;
        const host = env.IS_RENDER ? '0.0.0.0' : 'localhost';

        server = app.listen(port, host, () => {
            console.log('✅ Server setup complete!');
            console.log(`🚀 Server running on ${host}:${port}`);
            console.log(`📍 Environment: ${env.NODE_ENV}`);
            console.log(`📍 Health check: http://${host}:${port}/health`);

            if (env.IS_RENDER && env.RENDER_SERVICE_URL) {
                console.log(`🌐 Render URL: ${env.RENDER_SERVICE_URL}`);
            }
        });

        // Handle server errors
        server.on('error', (error: any) => {
            if (error.syscall !== 'listen') {
                throw error;
            }

            const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

            switch (error.code) {
                case 'EACCES':
                    console.error(`❌ ${bind} requires elevated privileges`);
                    process.exit(1);
                    break;
                case 'EADDRINUSE':
                    console.error(`❌ ${bind} is already in use`);
                    process.exit(1);
                    break;
                default:
                    throw error;
            }
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
