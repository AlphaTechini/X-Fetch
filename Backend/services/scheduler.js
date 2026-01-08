import cron from 'node-cron';
import { scrapeTweets } from './scraper.js';
import { sendNotification } from './emailService.js';
import { checkSession, closeBrowser } from './browser.js';

let isRunning = false;
let lastFetchTime = null;

/**
 * Main fetch job - scrapes tweets and emails them directly
 */
export async function runFetchJob() {
    if (isRunning) {
        console.log('Fetch job already running, skipping...');
        return { status: 'skipped', reason: 'already_running' };
    }

    isRunning = true;
    const startTime = new Date().toISOString();
    console.log(`\n=== Starting fetch job at ${startTime} ===`);

    try {
        // Check session first
        const session = await checkSession();
        if (!session.loggedIn) {
            console.error('Not logged in to X. Please run login.js first.');
            return { status: 'error', reason: 'not_logged_in' };
        }

        console.log(`Logged in as: ${session.username || 'unknown'}`);

        // Scrape tweets
        const tweets = await scrapeTweets(50);
        console.log(`Scraped ${tweets.length} tweets above follower threshold`);

        // Update last fetch time
        lastFetchTime = startTime;

        // Send notification with all scraped tweets
        if (tweets.length > 0) {
            await sendNotification(tweets);
            console.log(`Sent email with ${tweets.length} tweets`);
        } else {
            console.log('No tweets found, skipping email');
        }

        // Close browser to free resources
        await closeBrowser();

        return {
            status: 'success',
            tweetCount: tweets.length,
            lastFetch: startTime
        };

    } catch (error) {
        console.error('Fetch job failed:', error.message);
        await closeBrowser();
        return { status: 'error', reason: error.message };
    } finally {
        isRunning = false;
    }
}

/**
 * Start hourly scheduler
 */
export function startScheduler() {
    console.log('Starting hourly scheduler...');

    // Run every hour at minute 0
    cron.schedule('0 * * * *', async () => {
        console.log('Hourly trigger fired');
        await runFetchJob();
    });

    console.log('Scheduler started. Will run every hour at :00');
}

/**
 * Get scheduler status
 */
export function getSchedulerStatus() {
    return {
        running: isRunning,
        lastFetch: lastFetchTime,
        nextRun: getNextRunTime()
    };
}

function getNextRunTime() {
    const now = new Date();
    const next = new Date(now);
    next.setMinutes(0, 0, 0);
    next.setHours(next.getHours() + 1);
    return next.toISOString();
}
