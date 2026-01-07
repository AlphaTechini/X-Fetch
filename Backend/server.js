import Fastify from 'fastify';
import cors from '@fastify/cors';
import 'dotenv/config';

import { initDatabase, getRecentTweets, getTweetCount, getLastFetchTime } from './services/database.js';
import { checkSession } from './services/browser.js';
import { runFetchJob, startScheduler, getSchedulerStatus } from './services/scheduler.js';

const fastify = Fastify({ logger: true });

// Initialize database
initDatabase();

// CORS for frontend
await fastify.register(cors, {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
});

// Health check (also serves as wake-up ping)
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

// Get recent tweets
fastify.get('/api/tweets', async (request) => {
    const limit = parseInt(request.query.limit) || 50;
    const tweets = getRecentTweets(limit);
    return {
        tweets,
        total: getTweetCount(),
        lastFetch: getLastFetchTime()
    };
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
        scheduler,
        tweetCount: getTweetCount()
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
    console.log('  GET  /health       - Health check / wake-up ping');
    console.log('  GET  /api/session  - Check X login status');
    console.log('  GET  /api/tweets   - Get recent tweets');
    console.log('  POST /api/fetch-now - Trigger manual fetch');
    console.log('  GET  /api/status   - Overall status');

} catch (err) {
    fastify.log.error(err);
    process.exit(1);
}
