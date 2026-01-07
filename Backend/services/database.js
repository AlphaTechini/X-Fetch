import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'tweets.db');

let db = null;

/**
 * Initialize database and create tables
 */
export function initDatabase() {
    db = new Database(DB_PATH);

    db.exec(`
    CREATE TABLE IF NOT EXISTS tweets (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      username TEXT NOT NULL,
      display_name TEXT,
      followers INTEGER DEFAULT 0,
      url TEXT,
      created_at TEXT,
      scraped_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_tweets_created_at ON tweets(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_tweets_username ON tweets(username);
  `);

    // Track last fetch time
    db.exec(`
    CREATE TABLE IF NOT EXISTS metadata (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

    return db;
}

/**
 * Check if tweet already exists
 */
export function tweetExists(tweetId) {
    const stmt = db.prepare('SELECT 1 FROM tweets WHERE id = ?');
    return stmt.get(tweetId) !== undefined;
}

/**
 * Insert a tweet (with deduplication)
 */
export function insertTweet(tweet) {
    if (tweetExists(tweet.id)) {
        return false; // Already exists
    }

    const stmt = db.prepare(`
    INSERT INTO tweets (id, text, username, display_name, followers, url, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

    stmt.run(
        tweet.id,
        tweet.text,
        tweet.username,
        tweet.displayName,
        tweet.followers,
        tweet.url,
        tweet.createdAt
    );

    return true;
}

/**
 * Insert multiple tweets, returns count of new tweets
 */
export function insertTweets(tweets) {
    let newCount = 0;
    const insertMany = db.transaction((items) => {
        for (const tweet of items) {
            if (insertTweet(tweet)) {
                newCount++;
            }
        }
    });

    insertMany(tweets);
    return newCount;
}

/**
 * Get recent tweets
 */
export function getRecentTweets(limit = 50) {
    const stmt = db.prepare(`
    SELECT id, text, username, display_name as displayName, followers, url, created_at as createdAt, scraped_at as scrapedAt
    FROM tweets
    ORDER BY created_at DESC
    LIMIT ?
  `);

    return stmt.all(limit);
}

/**
 * Get tweets since a certain time
 */
export function getTweetsSince(since) {
    const stmt = db.prepare(`
    SELECT id, text, username, display_name as displayName, followers, url, created_at as createdAt
    FROM tweets
    WHERE scraped_at > ?
    ORDER BY created_at DESC
  `);

    return stmt.all(since);
}

/**
 * Set last fetch time
 */
export function setLastFetchTime(time) {
    const stmt = db.prepare(`
    INSERT OR REPLACE INTO metadata (key, value) VALUES ('last_fetch_time', ?)
  `);
    stmt.run(time);
}

/**
 * Get last fetch time
 */
export function getLastFetchTime() {
    const stmt = db.prepare('SELECT value FROM metadata WHERE key = ?');
    const row = stmt.get('last_fetch_time');
    return row?.value || null;
}

/**
 * Get tweet count
 */
export function getTweetCount() {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM tweets');
    return stmt.get().count;
}

/**
 * Close database
 */
export function closeDatabase() {
    if (db) {
        db.close();
        db = null;
    }
}

export { db };
