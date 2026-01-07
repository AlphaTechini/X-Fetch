import { Resend } from 'resend';
import 'dotenv/config';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send email notification with scraped tweets
 */
export async function sendNotification(tweets) {
    if (!tweets || tweets.length === 0) {
        console.log('No tweets to notify about, skipping email');
        return null;
    }

    const notificationEmail = process.env.NOTIFICATION_EMAIL;
    if (!notificationEmail) {
        console.error('NOTIFICATION_EMAIL not configured');
        return null;
    }

    // Take top 5 newest tweets
    const topTweets = tweets.slice(0, 5);

    // Build email content
    const tweetsList = topTweets.map((tweet, i) => {
        const excerpt = tweet.text.length > 150
            ? tweet.text.substring(0, 150) + '...'
            : tweet.text;

        return `
${i + 1}. @${tweet.username} (${formatFollowers(tweet.followers)} followers)
"${excerpt}"
→ ${tweet.url}
`;
    }).join('\n');

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    h1 { color: #1da1f2; font-size: 24px; }
    .tweet { background: #f8f9fa; padding: 15px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #1da1f2; }
    .author { font-weight: bold; color: #14171a; }
    .followers { color: #657786; font-size: 14px; }
    .text { margin: 10px 0; color: #14171a; }
    .link { color: #1da1f2; text-decoration: none; }
    .summary { background: #e8f5fd; padding: 10px 15px; border-radius: 8px; margin-bottom: 20px; }
  </style>
</head>
<body>
  <h1>🐦 X-Fetch: Developer Tweets</h1>
  <div class="summary">
    <strong>${tweets.length} new tweets</strong> from high-signal developer accounts
  </div>
  ${topTweets.map((tweet, i) => `
  <div class="tweet">
    <div class="author">@${tweet.username} <span class="followers">(${formatFollowers(tweet.followers)} followers)</span></div>
    <div class="text">${escapeHtml(tweet.text.substring(0, 200))}${tweet.text.length > 200 ? '...' : ''}</div>
    <a class="link" href="${tweet.url}">View Tweet →</a>
  </div>
  `).join('')}
  <p style="color: #657786; font-size: 12px;">Fetched at ${new Date().toISOString()}</p>
</body>
</html>
`;

    try {
        const { data, error } = await resend.emails.send({
            from: 'X-Fetch <noreply@cyberpunkinc.xyz>',
            to: [notificationEmail],
            subject: `🐦 ${tweets.length} Developer Tweets Found`,
            html,
            text: `X-Fetch found ${tweets.length} developer tweets!\n\n${tweetsList}`
        });

        if (error) {
            console.error('Email send failed:', error);
            return null;
        }

        console.log('Email sent successfully:', data?.id);
        return data;
    } catch (error) {
        console.error('Email send error:', error.message);
        return null;
    }
}

function formatFollowers(count) {
    if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
    if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
    return count.toString();
}

function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
