<script lang="ts">
  import { onMount } from "svelte";
  import {
    ping,
    getStatus,
    triggerFetch,
    type StatusResponse,
    type FetchResult,
  } from "./lib/api";

  let status: StatusResponse | null = $state(null);
  let lastResult: FetchResult | null = $state(null);
  let loading = $state(true);
  let error = $state("");
  let fetching = $state(false);

  // Ping interval for cold start prevention (5 min)
  const PING_INTERVAL = 5 * 60 * 1000;

  onMount(() => {
    loadStatus();

    // Wake-up ping every 5 minutes
    const pingInterval = setInterval(() => {
      ping();
    }, PING_INTERVAL);

    // Refresh status every 5 minutes
    const refreshInterval = setInterval(loadStatus, PING_INTERVAL);

    return () => {
      clearInterval(pingInterval);
      clearInterval(refreshInterval);
    };
  });

  async function loadStatus() {
    try {
      status = await getStatus();
      error = "";
    } catch (e: any) {
      error = e.message || "Failed to load status";
    } finally {
      loading = false;
    }
  }

  async function handleFetch() {
    fetching = true;
    error = "";
    try {
      lastResult = await triggerFetch();
      await loadStatus();
    } catch (e: any) {
      error = e.message;
    } finally {
      fetching = false;
    }
  }
</script>

<main>
  <header>
    <h1>🐦 X-Fetch</h1>
    <p class="subtitle">Developer Tweet Monitor → Email</p>
  </header>

  {#if loading}
    <div class="loading">Loading...</div>
  {:else if error}
    <div class="error">{error}</div>
  {:else}
    <section class="status-card">
      <h2>Status</h2>

      <div class="status-row">
        <span class="label">X Session:</span>
        <span class={status?.session?.loggedIn ? "ok" : "warn"}>
          {status?.session?.loggedIn
            ? `✓ ${status?.session?.username || "Connected"}`
            : "✗ Not logged in"}
        </span>
      </div>

      <div class="status-row">
        <span class="label">Scheduler:</span>
        <span>{status?.scheduler?.running ? "⏳ Running..." : "✓ Ready"}</span>
      </div>

      <div class="status-row">
        <span class="label">Last Fetch:</span>
        <span
          >{status?.scheduler?.lastFetch
            ? new Date(status.scheduler.lastFetch).toLocaleString()
            : "Never"}</span
        >
      </div>

      <div class="status-row">
        <span class="label">Next Fetch:</span>
        <span
          >{status?.scheduler?.nextRun
            ? new Date(status.scheduler.nextRun).toLocaleTimeString()
            : "N/A"}</span
        >
      </div>
    </section>

    <section class="action-card">
      <h2>Manual Fetch</h2>
      <p class="description">
        Scrape developer tweets and send to your email immediately.
      </p>

      <button
        onclick={handleFetch}
        disabled={fetching || !status?.session?.loggedIn}
      >
        {fetching ? "⏳ Fetching..." : "📧 Fetch & Email Now"}
      </button>

      {#if !status?.session?.loggedIn}
        <p class="warn-text">
          ⚠️ You need to log in to X first. Run <code>pnpm login</code> on the server.
        </p>
      {/if}

      {#if lastResult}
        <div class="result {lastResult.status}">
          {#if lastResult.status === "success"}
            ✅ Sent {lastResult.tweetCount} tweets to your email!
          {:else if lastResult.status === "skipped"}
            ⏭️ Skipped: {lastResult.reason}
          {:else}
            ❌ Error: {lastResult.reason}
          {/if}
        </div>
      {/if}
    </section>

    <section class="info-card">
      <h2>How it works</h2>
      <ul>
        <li>🔍 Scrapes your X "For You" timeline every hour</li>
        <li>🎯 Filters for developer-related tweets (5K+ followers)</li>
        <li>📧 Sends matching tweets directly to your email</li>
        <li>⏰ Runs automatically on Render (hourly cron)</li>
      </ul>
    </section>
  {/if}
</main>

<style>
  main {
    max-width: 600px;
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

  h2 {
    font-size: 1.1rem;
    margin: 0 0 1rem 0;
    color: #ccc;
  }

  .subtitle {
    color: #888;
    margin: 0.5rem 0;
  }

  .loading,
  .error {
    text-align: center;
    padding: 2rem;
    color: #888;
  }

  .error {
    color: #ef4444;
  }

  section {
    padding: 1.25rem;
    background: #1a1a1a;
    border-radius: 8px;
    margin-bottom: 1rem;
  }

  .status-row {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 0;
    border-bottom: 1px solid #333;
  }

  .status-row:last-of-type {
    border-bottom: none;
  }

  .label {
    color: #888;
  }

  .ok {
    color: #4ade80;
  }

  .warn {
    color: #f59e0b;
  }

  .description {
    color: #888;
    margin: 0 0 1rem 0;
    font-size: 0.9rem;
  }

  button {
    width: 100%;
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
    background: #1d9bf0;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.2s;
  }

  button:hover:not(:disabled) {
    background: #1a8cd8;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .warn-text {
    color: #f59e0b;
    font-size: 0.85rem;
    margin: 1rem 0 0 0;
  }

  code {
    background: #333;
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    font-size: 0.85rem;
  }

  .result {
    margin-top: 1rem;
    padding: 0.75rem;
    border-radius: 6px;
    text-align: center;
  }

  .result.success {
    background: rgba(74, 222, 128, 0.1);
    color: #4ade80;
  }

  .result.error {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }

  .result.skipped {
    background: rgba(245, 158, 11, 0.1);
    color: #f59e0b;
  }

  .info-card ul {
    margin: 0;
    padding-left: 1.25rem;
  }

  .info-card li {
    padding: 0.4rem 0;
    color: #aaa;
  }
</style>
