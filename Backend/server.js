import Fastify from 'fastify';
import cors from '@fastify/cors';
import 'dotenv/config';

import { checkSession, loginToX, closeBrowser } from './services/browser.js';
import { runFetchJob, startScheduler, getSchedulerStatus } from './services/scheduler.js';

const fastify = Fastify({ logger: true });

// CORS for frontend - strip trailing slash
const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
await fastify.register(cors, {
    origin: frontendUrl,
    methods: ['GET', 'POST']
});

// Health check
fastify.get('/health', async () => {
    return {
        status: 'ok',
        time: new Date().toISOString(),
        uptime: process.uptime()
    };
});

// Get session status
fastify.get('/api/session', async () => {
    const session = await checkSession();
    return session;
});

// Login to X with credentials
fastify.post('/api/login', async (request) => {
    const { username, password } = request.body || {};

    if (!username || !password) {
        return { success: false, error: 'Username and password required' };
    }

    console.log(`Login attempt for: ${username}`);
    const result = await loginToX(username, password);

    // Close browser after login to free memory
    if (result.success) {
        await closeBrowser();
    }

    return result;
});

// Trigger manual fetch
fastify.post('/api/fetch-now', async () => {
    const result = await runFetchJob();
    return result;
});

// Get scheduler status
fastify.get('/api/status', async () => {
    const session = await checkSession();
    const scheduler = getSchedulerStatus();
    return {
        session,
        scheduler
    };
});

// Start server
const PORT = process.env.PORT || 3001;

try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);

    // Start the hourly scheduler
    startScheduler();

    console.log('\n📋 API Endpoints:');
    console.log('  GET  /health        - Health check');
    console.log('  GET  /api/session   - Check X login status');
    console.log('  POST /api/login     - Login to X with credentials');
    console.log('  POST /api/fetch-now - Trigger manual fetch');
    console.log('  GET  /api/status    - Overall status');

} catch (err) {
    fastify.log.error(err);
    process.exit(1);
}
