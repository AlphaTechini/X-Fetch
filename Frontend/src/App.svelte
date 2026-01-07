<script lang="ts">
  import { onMount } from 'svelte';
  import { ping, getTweets, getStatus, triggerFetch, type Tweet, type StatusResponse } from './lib/api';

  let tweets: Tweet[] = $state([]);
  let status: StatusResponse | null = $state(null);
  let loading = $state(true);
  let error = $state('');
  let fetching = $state(false);

  // Ping interval for cold start prevention (5 min)
  const PING_INTERVAL = 5 * 60 * 1000;

  onMount(() => {
    loadData();
    
    // Wake-up ping every 5 minutes
    const pingInterval = setInterval(() => {
      ping();
    }, PING_INTERVAL);

    // Refresh data every 5 minutes
    const refreshInterval = setInterval(loadData, PING_INTERVAL);

    return () => {
      clearInterval(pingInterval);
      clearInterval(refreshInterval);
    };
  });

  async function loadData() {
    try {
      const [tweetsRes, statusRes] = await Promise.all([
        getTweets(50),
        getStatus()
      ]);
      tweets = tweetsRes.tweets;
      status = statusRes;
      error = '';
    } catch (e: any) {
      error = e.message || 'Failed to load data';
    } finally {
      loading = false;
    }
  }

  async function handleFetch() {
    fetching = true;
    try {
      await triggerFetch();
      await loadData();
    } catch (e: any) {
      error = e.message;
    } finally {
      fetching = false;
    }
  }

  function formatFollowers(count: number): string {
    if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
    if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
    return count.toString();
  }

  function timeAgo(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (mins > 0) return `${mins}m ago`;
    return 'just now';
  }
</script>

<main>
  <header>
    <h1>🐦 X-Fetch</h1>
    <p class="subtitle">Developer Tweet Monitor</p>
  </header>

  {#if loading}
    <div class="loading">Loading...</div>
  {:else if error}
    <div class="error">{error}</div>
  {:else}
    <section class="status-bar">
      <div class="status-item">
        <span class="label">Session:</span>
        <span class={status?.session?.loggedIn ? 'ok' : 'warn'}>
          {status?.session?.loggedIn ? `✓ ${status?.session?.username || 'Connected'}` : '✗ Not logged in'}
        </span>
      </div>
      <div class="status-item">
        <span class="label">Tweets:</span>
        <span>{status?.tweetCount || 0}</span>
      </div>
      <div class="status-item">
        <span class="label">Next fetch:</span>
        <span>{status?.scheduler?.nextRun ? new Date(status.scheduler.nextRun).toLocaleTimeString() : 'N/A'}</span>
      </div>
      <button onclick={handleFetch} disabled={fetching}>
        {fetching ? 'Fetching...' : 'Fetch Now'}
      </button>
    </section>

    {#if tweets.length === 0}
      <div class="empty">No tweets yet. Click "Fetch Now" or wait for the hourly fetch.</div>
    {:else}
      <ul class="tweet-list">
        {#each tweets as tweet (tweet.id)}
          <li class="tweet">
            <div class="tweet-header">
              <a href={`https://x.com/${tweet.username}`} target="_blank" class="author">
                @{tweet.username}
              </a>
              <span class="followers">{formatFollowers(tweet.followers)} followers</span>
              <span class="time">{timeAgo(tweet.createdAt)}</span>
            </div>
            <p class="tweet-text">{tweet.text}</p>
            <a href={tweet.url} target="_blank" class="tweet-link">View on X →</a>
          </li>
        {/each}
      </ul>
    {/if}
  {/if}
</main>

<style>
  main {
    max-width: 700px;
    margin: 0 auto;
    padding: 2rem 1rem;
  }

  header {
    text-align: center;
    margin-bottom: 2rem;
  }

  h1 {
    font-size: 2rem;
    margin: 0;
  }

  .subtitle {
    color: #888;
    margin: 0.5rem 0;
  }

  .status-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: center;
    padding: 1rem;
    background: #1a1a1a;
    border-radius: 8px;
    margin-bottom: 1.5rem;
  }

  .status-item {
    display: flex;
    gap: 0.5rem;
    font-size: 0.9rem;
  }

  .status-item .label {
    color: #888;
  }

  .status-item .ok {
    color: #4ade80;
  }

  .status-item .warn {
    color: #f59e0b;
  }

  .status-bar button {
    margin-left: auto;
  }

  .loading, .error, .empty {
    text-align: center;
    padding: 2rem;
    color: #888;
  }

  .error {
    color: #ef4444;
  }

  .tweet-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .tweet {
    padding: 1rem;
    border-bottom: 1px solid #333;
  }

  .tweet:hover {
    background: #1a1a1a;
  }

  .tweet-header {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    align-items: center;
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
  }

  .author {
    font-weight: 600;
    color: #1d9bf0;
  }

  .followers {
    color: #888;
  }

  .time {
    color: #666;
    margin-left: auto;
  }

  .tweet-text {
    margin: 0.5rem 0;
    line-height: 1.5;
    word-break: break-word;
  }

  .tweet-link {
    font-size: 0.85rem;
    color: #1d9bf0;
  }
</style>
