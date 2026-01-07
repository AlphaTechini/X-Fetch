/**
 * First-time login script
 * 
 * Run this once to authenticate with X:
 *   node login.js
 * 
 * The browser will open - log in manually, then close the browser.
 * Your session will be saved in ./user-data for future runs.
 */

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USER_DATA_DIR = path.join(__dirname, 'user-data');

async function login() {
    console.log('🔐 X-Fetch Login Setup\n');
    console.log('This will open a browser window for you to log in to X.');
    console.log('After logging in, close the browser to save your session.\n');
    console.log(`Session will be saved to: ${USER_DATA_DIR}\n`);

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    await new Promise((resolve) => {
        rl.question('Press Enter to open browser...', () => {
            rl.close();
            resolve();
        });
    });

    const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
        headless: false,
        viewport: { width: 1280, height: 800 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        args: [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox'
        ]
    });

    const page = await context.newPage();
    await page.goto('https://x.com/login');

    console.log('\n✨ Browser opened! Please log in to X.');
    console.log('   Close the browser when done to save your session.\n');

    // Wait for browser to close
    await new Promise((resolve) => {
        context.on('close', resolve);
    });

    console.log('✅ Session saved! You can now run: npm run dev');
}

login().catch(console.error);
