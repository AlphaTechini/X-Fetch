import { launchBrowser } from './browser.js';

// Keywords to include (OR logic)
const INCLUDE_KEYWORDS = [
    'backend engineer',
    'frontend dev',
    'API design',
    'GraphQL',
    'database performance',
    'React',
    'Next.js',
    'Solidity',
    'smart contracts',
    'debugging',
    'refactoring',
    'scaling systems',
    'shipping code',
    'production bugs',
    'EVM',
    'gas optimization',
    'audit',
    'schema',
    'migration',
    'Svelte',
    'deployed',
    'shipped',
    'broke',
    'fixed',
    'optimizing',
    'vibe coding'
];

// Keywords to exclude
const EXCLUDE_KEYWORDS = [
    'airdrop',
    'giveaway',
    'whitelist',
    'presale',
    'NFT mint',
    'RT to win',
    'gm',
    'follow back'
];

const MIN_FOLLOWERS = 5000;

/**
 * Build search query string for X
 */
function buildSearchQuery() {
    const includeTerms = INCLUDE_KEYWORDS.map(k =>
        k.includes(' ') ? `"${k}"` : k
    ).join(' OR ');

    const excludeTerms = EXCLUDE_KEYWORDS.map(k =>
        k.includes(' ') ? `-"${k}"` : `-${k}`
    ).join(' ');

    return `(${includeTerms}) ${excludeTerms} lang:en -is:retweet`;
}

/**
 * Extract tweet data from a tweet element
 */
async function extractTweetData(tweetElement) {
    try {
        // Get tweet text
        const textElement = await tweetElement.locator('[data-testid="tweetText"]').first();
        const text = await textElement.textContent().catch(() => '');

        // Get author info
        const userLink = await tweetElement.locator('a[role="link"][href^="/"]').first();
        const href = await userLink.getAttribute('href').catch(() => '');
        const username = href?.replace('/', '').split('/')[0] || '';

        // Get display name
        const displayNameElement = await tweetElement.locator('[data-testid="User-Name"] span').first();
        const displayName = await displayNameElement.textContent().catch(() => username);

        // Get timestamp
        const timeElement = await tweetElement.locator('time').first();
        const datetime = await timeElement.getAttribute('datetime').catch(() => new Date().toISOString());

        // Get tweet URL
        const tweetLink = await tweetElement.locator('a[href*="/status/"]').first();
        const tweetHref = await tweetLink.getAttribute('href').catch(() => '');
        const tweetUrl = tweetHref ? `https://x.com${tweetHref}` : '';

        // Extract tweet ID from URL
        const tweetId = tweetUrl.match(/\/status\/(\d+)/)?.[1] || '';

        return {
            id: tweetId,
            text: text?.trim() || '',
            username,
            displayName: displayName?.trim() || username,
            url: tweetUrl,
            createdAt: datetime,
            followers: 0 // Will be fetched separately
        };
    } catch (error) {
        console.error('Failed to extract tweet:', error.message);
        return null;
    }
}

/**
 * Get follower count for a user by visiting their profile
 */
async function getFollowerCount(page, username) {
    try {
        await page.goto(`https://x.com/${username}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(2000);

        // Look for followers count
        const followersLink = await page.locator(`a[href="/${username}/verified_followers"], a[href="/${username}/followers"]`).first();
        if (await followersLink.count() > 0) {
            const followersText = await followersLink.textContent();
            // Parse follower count (e.g., "10.5K Followers" or "1.2M Followers")
            const match = followersText.match(/([\d,.]+)([KMB]?)/i);
            if (match) {
                let count = parseFloat(match[1].replace(/,/g, ''));
                const suffix = match[2].toUpperCase();
                if (suffix === 'K') count *= 1000;
                else if (suffix === 'M') count *= 1000000;
                else if (suffix === 'B') count *= 1000000000;
                return Math.round(count);
            }
        }
        return 0;
    } catch (error) {
        console.error(`Failed to get followers for ${username}:`, error.message);
        return 0;
    }
}

/**
 * Scrape tweets from X search
 * Returns array of tweet objects
 */
export async function scrapeTweets(maxTweets = 50) {
    const ctx = await launchBrowser();
    const page = await ctx.newPage();
    const tweets = [];
    const seenIds = new Set();

    try {
        const query = buildSearchQuery();
        const searchUrl = `https://x.com/search?q=${encodeURIComponent(query)}&src=typed_query&f=live`;

        console.log('Navigating to search:', searchUrl);
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(5000);

        // Scroll and collect tweets
        let scrollAttempts = 0;
        const maxScrolls = 10;

        while (tweets.length < maxTweets && scrollAttempts < maxScrolls) {
            const tweetElements = await page.locator('[data-testid="tweet"]').all();

            for (const element of tweetElements) {
                if (tweets.length >= maxTweets) break;

                const tweetData = await extractTweetData(element);
                if (tweetData && tweetData.id && !seenIds.has(tweetData.id)) {
                    seenIds.add(tweetData.id);
                    tweets.push(tweetData);
                }
            }

            // Scroll down for more tweets
            await page.evaluate(() => window.scrollBy(0, 1000));
            await page.waitForTimeout(2000);
            scrollAttempts++;
        }

        console.log(`Collected ${tweets.length} raw tweets`);

        // Get follower counts and filter
        const filteredTweets = [];
        const checkedUsers = new Map();

        for (const tweet of tweets) {
            // Cache follower counts per user
            if (!checkedUsers.has(tweet.username)) {
                const followers = await getFollowerCount(page, tweet.username);
                checkedUsers.set(tweet.username, followers);
                await page.waitForTimeout(1000); // Rate limiting
            }

            tweet.followers = checkedUsers.get(tweet.username);

            if (tweet.followers >= MIN_FOLLOWERS) {
                filteredTweets.push(tweet);
                console.log(`✓ @${tweet.username} (${tweet.followers} followers)`);
            } else {
                console.log(`✗ @${tweet.username} (${tweet.followers} followers) - below threshold`);
            }
        }

        await page.close();
        return filteredTweets;

    } catch (error) {
        console.error('Scraping failed:', error.message);
        await page.close();
        throw error;
    }
}

export { buildSearchQuery, MIN_FOLLOWERS };
