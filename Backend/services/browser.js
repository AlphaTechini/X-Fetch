import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USER_DATA_DIR = path.join(__dirname, '..', 'user-data');
const COOKIES_FILE = path.join(__dirname, '..', 'cookies.json');

let browser = null;
let context = null;

const IS_HEADLESS = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

/**
 * Launch browser with persistent context
 */
export async function launchBrowser() {
  if (context) {
    return context;
  }

  console.log(`Launching browser (headless: ${IS_HEADLESS})...`);

  // Ensure user-data directory exists
  if (!fs.existsSync(USER_DATA_DIR)) {
    fs.mkdirSync(USER_DATA_DIR, { recursive: true });
  }

  context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: IS_HEADLESS,
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });

  // Load cookies from file or env var if they exist
  await loadCookies();

  return context;
}

/**
 * Load cookies from file or X_COOKIES env var
 */
async function loadCookies() {
  if (!context) return;

  try {
    let cookies = null;

    // Try env var first (for Render)
    if (process.env.X_COOKIES) {
      console.log('Loading cookies from X_COOKIES env var...');
      cookies = JSON.parse(Buffer.from(process.env.X_COOKIES, 'base64').toString('utf8'));
    }
    // Then try file
    else if (fs.existsSync(COOKIES_FILE)) {
      console.log('Loading cookies from cookies.json...');
      cookies = JSON.parse(fs.readFileSync(COOKIES_FILE, 'utf8'));
    }

    if (cookies && cookies.length > 0) {
      await context.addCookies(cookies);
      console.log(`Loaded ${cookies.length} cookies`);
    }
  } catch (error) {
    console.error('Failed to load cookies:', error.message);
  }
}

/**
 * Save cookies to file and return base64 for env var
 */
export async function saveCookies() {
  if (!context) return null;

  try {
    const cookies = await context.cookies();
    const xCookies = cookies.filter(c => c.domain.includes('x.com') || c.domain.includes('twitter.com'));

    // Save to file
    fs.writeFileSync(COOKIES_FILE, JSON.stringify(xCookies, null, 2));
    console.log(`Saved ${xCookies.length} cookies to file`);

    // Return base64 for env var
    const base64 = Buffer.from(JSON.stringify(xCookies)).toString('base64');
    return base64;
  } catch (error) {
    console.error('Failed to save cookies:', error.message);
    return null;
  }
}

/**
 * Import cookies from base64 string or JSON array
 */
export async function importCookies(cookiesInput) {
  try {
    let cookies;

    // Try to parse as base64 first
    try {
      cookies = JSON.parse(Buffer.from(cookiesInput, 'base64').toString('utf8'));
    } catch {
      // Try as plain JSON
      cookies = typeof cookiesInput === 'string' ? JSON.parse(cookiesInput) : cookiesInput;
    }

    if (!Array.isArray(cookies) || cookies.length === 0) {
      return { success: false, error: 'Invalid cookies format' };
    }

    // Ensure browser is launched
    await launchBrowser();

    // Add cookies to context
    await context.addCookies(cookies);

    // Save for persistence
    await saveCookies();

    // Verify login worked
    const session = await checkSession();

    return {
      success: session.loggedIn,
      username: session.username,
      cookieCount: cookies.length,
      error: session.loggedIn ? null : 'Cookies imported but not logged in'
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Check if user is logged in to X
 */
export async function checkSession() {
  try {
    const ctx = await launchBrowser();
    const page = await ctx.newPage();

    await page.goto('https://x.com/home', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    const url = page.url();

    if (url.includes('/login') || url.includes('/i/flow/login')) {
      await page.close();
      return { loggedIn: false };
    }

    const hasTimeline = await page.locator('[data-testid="primaryColumn"]').count() > 0;

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
      // Not critical
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

export function getContext() {
  return context;
}
