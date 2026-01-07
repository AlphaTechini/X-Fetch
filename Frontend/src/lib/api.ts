const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface Tweet {
    id: string;
    text: string;
    username: string;
    displayName: string;
    followers: number;
    url: string;
    createdAt: string;
    scrapedAt?: string;
}

export interface SessionStatus {
    loggedIn: boolean;
    username?: string;
    error?: string;
}

export interface TweetsResponse {
    tweets: Tweet[];
    total: number;
    lastFetch: string | null;
}

export interface StatusResponse {
    session: SessionStatus;
    scheduler: {
        running: boolean;
        lastFetch: string | null;
        nextRun: string;
    };
    tweetCount: number;
}

/**
 * Health check / wake-up ping
 */
export async function ping(): Promise<boolean> {
    try {
        const res = await fetch(`${API_URL}/health`, { method: 'GET' });
        return res.ok;
    } catch {
        return false;
    }
}

/**
 * Get session status
 */
export async function getSessionStatus(): Promise<SessionStatus> {
    const res = await fetch(`${API_URL}/api/session`);
    if (!res.ok) throw new Error('Failed to get session');
    return res.json();
}

/**
 * Get recent tweets
 */
export async function getTweets(limit = 50): Promise<TweetsResponse> {
    const res = await fetch(`${API_URL}/api/tweets?limit=${limit}`);
    if (!res.ok) throw new Error('Failed to get tweets');
    return res.json();
}

/**
 * Trigger manual fetch
 */
export async function triggerFetch(): Promise<any> {
    const res = await fetch(`${API_URL}/api/fetch-now`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to trigger fetch');
    return res.json();
}

/**
 * Get overall status
 */
export async function getStatus(): Promise<StatusResponse> {
    const res = await fetch(`${API_URL}/api/status`);
    if (!res.ok) throw new Error('Failed to get status');
    return res.json();
}
