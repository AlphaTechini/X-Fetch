import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USER_DATA_DIR = path.join(__dirname, '..', 'user-data');

let browser = null;
let context = null;

/**
 * Launch browser with persistent context
 * Uses user-data directory to maintain session across runs
 */
export async function launchBrowser() {
  if (context) {
    return context;
  }

  context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });

  return context;
}

/**
 * Check if user is logged in to X
 * Returns: { loggedIn: boolean, username?: string }
 */
export async function checkSession() {
  try {
    const ctx = await launchBrowser();
    const page = await ctx.newPage();

    await page.goto('https://x.com/home', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Check for login indicators
    const url = page.url();
    
    // If redirected to login page, not authenticated
    if (url.includes('/login') || url.includes('/i/flow/login')) {
      await page.close();
      return { loggedIn: false };
    }

    // Check for home feed elements (primary timeline)
    const hasTimeline = await page.locator('[data-testid="primaryColumn"]').count() > 0;
    
    // Try to get username
    let username = null;
    try {
      const profileLink = await page.locator('[data-testid="AppTabBar_Profile_Link"]').first();
      if (await profileLink.count() > 0) {
        const href = await profileLink.getAttribute('href');
        if (href) {
          username = href.replace('/', '');
        }
      }
    } catch (e) {
      // Username extraction failed, not critical
    }

    await page.close();
    return { loggedIn: hasTimeline, username };
  } catch (error) {
    console.error('Session check failed:', error.message);
    return { loggedIn: false, error: error.message };
  }
}

/**
 * Close browser and cleanup
 */
export async function closeBrowser() {
  if (context) {
    await context.close();
    context = null;
  }
  if (browser) {
    await browser.close();
    browser = null;
  }
}

/**
 * Get the current browser context
 */
export function getContext() {
  return context;
}
