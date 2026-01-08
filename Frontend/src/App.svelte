<script lang="ts">
  import { onMount } from "svelte";
  import {
    ping,
    getStatus,
    triggerFetch,
    importCookies,
    type StatusResponse,
    type FetchResult,
  } from "./lib/api";

  let status: StatusResponse | null = $state(null);
  let lastResult: FetchResult | null = $state(null);
  let loading = $state(true);
  let error = $state("");
  let fetching = $state(false);

  // Cookie import state
  let showImport = $state(false);
  let cookieInput = $state("");
  let importing = $state(false);
  let importError = $state("");
  let importSuccess = $state("");

  const PING_INTERVAL = 5 * 60 * 1000;

  onMount(() => {
    loadStatus();
    const pingInterval = setInterval(() => ping(), PING_INTERVAL);
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

  async function handleImport() {
    if (!cookieInput.trim()) {
      importError = "Paste your cookies";
      return;
    }

    importing = true;
    importError = "";
    importSuccess = "";

    try {
      const result = await importCookies(cookieInput.trim());
      if (result.success) {
        importSuccess = `✓ Connected as @${result.username || "user"}`;
        cookieInput = "";
        setTimeout(() => {
          showImport = false;
          importSuccess = "";
        }, 2000);
        await loadStatus();
      } else {
        importError = result.error || "Import failed";
      }
    } catch (e: any) {
      importError = e.message || "Import failed";
    } finally {
      importing = false;
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
        {#if status?.session?.loggedIn}
          <span class="ok">✓ @{status?.session?.username || "Connected"}</span>
        {:else}
          <button class="link-btn" onclick={() => (showImport = true)}
            >🔐 Connect to X</button
          >
        {/if}
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

    <!-- Cookie Import Modal -->
    {#if showImport}
      <div class="modal-overlay" onclick={() => (showImport = false)}>
        <div class="modal" onclick={(e) => e.stopPropagation()}>
          <h2>🔐 Connect to X</h2>

          <div class="steps">
            <p>
              <strong>Step 1:</strong> Open X.com in your browser and log in
            </p>
            <p>
              <strong>Step 2:</strong> Install
              <a
                href="https://chrome.google.com/webstore/detail/editthiscookie/fngmhnnpilhplaeedifhccceomclgfbg"
                target="_blank">EditThisCookie</a
              > extension
            </p>
            <p>
              <strong>Step 3:</strong> Click the extension on X.com → Export → Copy
            </p>
            <p><strong>Step 4:</strong> Paste below:</p>
          </div>

          <textarea
            placeholder="Paste exported cookies JSON here..."
            bind:value={cookieInput}
            disabled={importing}
            rows="4"
          ></textarea>

          {#if importError}
            <p class="error-text">{importError}</p>
          {/if}
          {#if importSuccess}
            <p class="success-text">{importSuccess}</p>
          {/if}

          <div class="modal-buttons">
            <button
              class="secondary"
              onclick={() => (showImport = false)}
              disabled={importing}>Cancel</button
            >
            <button onclick={handleImport} disabled={importing}>
              {importing ? "⏳ Importing..." : "Import Cookies"}
            </button>
          </div>
        </div>
      </div>
    {/if}

    <section class="action-card">
      <h2>Manual Fetch</h2>
      <p class="description">Scrape developer tweets and send to your email.</p>

      <button
        onclick={handleFetch}
        disabled={fetching || !status?.session?.loggedIn}
      >
        {fetching ? "⏳ Fetching..." : "📧 Fetch & Email Now"}
      </button>

      {#if !status?.session?.loggedIn}
        <p class="warn-text">⚠️ Connect to X first using the button above.</p>
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
        <li>🔍 Scrapes your X "For You" timeline hourly</li>
        <li>🎯 Filters for dev tweets (5K+ followers)</li>
        <li>📧 Sends matches directly to your email</li>
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
    align-items: center;
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

  .link-btn {
    background: transparent;
    border: 1px solid #1d9bf0;
    color: #1d9bf0;
    padding: 0.4rem 0.8rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
  }
  .link-btn:hover {
    background: rgba(29, 155, 240, 0.1);
  }

  .description {
    color: #888;
    margin: 0 0 1rem 0;
    font-size: 0.9rem;
  }

  button {
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
    background: #1d9bf0;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
  }
  button:hover:not(:disabled) {
    background: #1a8cd8;
  }
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .action-card button {
    width: 100%;
  }

  .warn-text {
    color: #f59e0b;
    font-size: 0.85rem;
    margin: 1rem 0 0 0;
  }
  .error-text {
    color: #ef4444;
    font-size: 0.85rem;
    margin: 0.5rem 0;
  }
  .success-text {
    color: #4ade80;
    font-size: 0.85rem;
    margin: 0.5rem 0;
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

  /* Modal */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: 1rem;
  }

  .modal {
    background: #1a1a1a;
    padding: 1.5rem;
    border-radius: 12px;
    width: 100%;
    max-width: 400px;
  }

  .modal h2 {
    text-align: center;
    margin-bottom: 1rem;
  }

  .steps {
    background: #0a0a0a;
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1rem;
    font-size: 0.85rem;
  }
  .steps p {
    margin: 0.5rem 0;
    color: #aaa;
  }
  .steps a {
    color: #1d9bf0;
  }

  .modal textarea {
    width: 100%;
    padding: 0.75rem;
    margin-bottom: 0.75rem;
    border: 1px solid #333;
    border-radius: 6px;
    background: #0a0a0a;
    color: white;
    font-size: 0.9rem;
    font-family: monospace;
    box-sizing: border-box;
    resize: vertical;
  }
  .modal textarea:focus {
    outline: none;
    border-color: #1d9bf0;
  }

  .modal-buttons {
    display: flex;
    gap: 0.75rem;
    margin-top: 0.5rem;
  }
  .modal-buttons button {
    flex: 1;
  }
  .modal-buttons .secondary {
    background: #333;
  }
  .modal-buttons .secondary:hover {
    background: #444;
  }
</style>
