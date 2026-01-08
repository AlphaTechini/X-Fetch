import Fastify from 'fastify';
import cors from '@fastify/cors';
import 'dotenv/config';

import { checkSession, importCookies, closeBrowser } from './services/browser.js';
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

// Import cookies (paste from browser)
fastify.post('/api/import-cookies', async (request) => {
    const { cookies } = request.body || {};

    if (!cookies) {
        return { success: false, error: 'No cookies provided' };
    }

    console.log('Importing cookies...');
    const result = await importCookies(cookies);

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
    console.log('  GET  /health             - Health check');
    console.log('  GET  /api/session        - Check X login status');
    console.log('  POST /api/import-cookies - Import X cookies');
    console.log('  POST /api/fetch-now      - Trigger manual fetch');
    console.log('  GET  /api/status         - Overall status');

} catch (err) {
    fastify.log.error(err);
    process.exit(1);
}
