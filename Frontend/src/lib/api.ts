const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface SessionStatus {
    loggedIn: boolean;
    username?: string;
    error?: string;
}

export interface StatusResponse {
    session: SessionStatus;
    scheduler: {
        running: boolean;
        lastFetch: string | null;
        nextRun: string;
    };
}

export interface FetchResult {
    status: string;
    tweetCount?: number;
    lastFetch?: string;
    reason?: string;
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
 * Trigger manual fetch (scrapes and emails)
 */
export async function triggerFetch(): Promise<FetchResult> {
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
