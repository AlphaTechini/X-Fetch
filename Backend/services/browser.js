import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USER_DATA_DIR = path.join(__dirname, '..', 'user-data');

let browser = null;
let context = null;

// Run headless in production (Render)
const IS_HEADLESS = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

/**
 * Launch browser with persistent context
 */
export async function launchBrowser() {
  if (context) {
    return context;
  }

  console.log(`Launching browser (headless: ${IS_HEADLESS})...`);

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

  return context;
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
 * Log in to X with credentials
 * @param {string} username - X username or email
 * @param {string} password - X password
 * @returns {Promise<{success: boolean, error?: string, needsVerification?: boolean}>}
 */
export async function loginToX(username, password) {
  let page = null;
  try {
    const ctx = await launchBrowser();
    page = await ctx.newPage();

    console.log('Navigating to X login...');
    await page.goto('https://x.com/login', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Enter username
    console.log('Entering username...');
    const usernameInput = page.locator('input[autocomplete="username"]');
    await usernameInput.waitFor({ timeout: 10000 });
    await usernameInput.fill(username);

    // Click next
    await page.locator('button:has-text("Next")').click();
    await page.waitForTimeout(2000);

    // Check if X asks for phone/email verification
    const verificationInput = await page.locator('input[data-testid="ocfEnterTextTextInput"]').count();
    if (verificationInput > 0) {
      await page.close();
      return {
        success: false,
        needsVerification: true,
        error: 'X requires phone/email verification. Please use web login or verify your account.'
      };
    }

    // Enter password
    console.log('Entering password...');
    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.waitFor({ timeout: 10000 });
    await passwordInput.fill(password);

    // Click login
    await page.locator('[data-testid="LoginForm_Login_Button"]').click();
    await page.waitForTimeout(5000);

    // Check result
    const currentUrl = page.url();

    if (currentUrl.includes('/home')) {
      console.log('Login successful!');
      await page.close();
      return { success: true };
    }

    // Check for 2FA
    const twoFaInput = await page.locator('input[data-testid="ocfEnterTextTextInput"]').count();
    if (twoFaInput > 0) {
      await page.close();
      return {
        success: false,
        needsVerification: true,
        error: 'Two-factor authentication required. Please disable 2FA temporarily or use cookie import.'
      };
    }

    // Check for error messages
    const errorText = await page.locator('[data-testid="toast"]').textContent().catch(() => null);

    await page.close();
    return {
      success: false,
      error: errorText || 'Login failed. Check credentials and try again.'
    };

  } catch (error) {
    console.error('Login failed:', error.message);
    if (page) await page.close().catch(() => { });
    return { success: false, error: error.message };
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
