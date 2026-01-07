/**
 * Test scraping without starting the full server
 * 
 * Run: node test-scrape.js
 */

import { initDatabase, insertTweets, getRecentTweets } from './services/database.js';
import { checkSession, closeBrowser } from './services/browser.js';
import { scrapeTweets } from './services/scraper.js';

async function test() {
    console.log('🧪 X-Fetch Scrape Test\n');

    // Initialize database
    initDatabase();

    // Check session
    console.log('Checking session...');
    const session = await checkSession();

    if (!session.loggedIn) {
        console.error('❌ Not logged in! Run: npm run login');
        await closeBrowser();
        process.exit(1);
    }

    console.log(`✅ Logged in as: ${session.username || 'unknown'}\n`);

    // Scrape tweets
    console.log('Starting scrape...\n');
    const tweets = await scrapeTweets(20);

    console.log(`\n📊 Results: ${tweets.length} tweets passed filters\n`);

    // Insert into database
    const newCount = insertTweets(tweets);
    console.log(`Inserted ${newCount} new tweets\n`);

    // Show recent tweets
    const recent = getRecentTweets(5);
    console.log('Recent tweets in database:');
    recent.forEach((t, i) => {
        console.log(`${i + 1}. @${t.username} (${t.followers} followers)`);
        console.log(`   "${t.text.substring(0, 80)}..."`);
        console.log(`   ${t.url}\n`);
    });

    await closeBrowser();
    console.log('✅ Test complete!');
}

test().catch(async (err) => {
    console.error('Test failed:', err);
    await closeBrowser();
    process.exit(1);
});
