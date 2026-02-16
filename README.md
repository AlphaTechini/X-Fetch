# X-Fetch - Production-Grade Developer Tweet Monitoring Platform

A robust, production-ready browser automation platform that scrapes high-signal developer posts from X (Twitter) using Playwright with persistent sessions, intelligent filtering, and automated email notifications for real-time market intelligence.

## 🏗️ System Architecture

### Core Architecture Diagram
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API Gateway Layer                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌───────────────────────┐  │
│  │ Rate Limiting   │    │ Authentication  │    │ Request Validation    │  │
│  │ & Throttling    │◄──►│ & Authorization │◄──►│ & Input Sanitization  │  │
│  └─────────────────┘    └─────────────────┘    └───────────────────────┘  │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼─────────────────────────────────────────┐
│                        Scraping Orchestration Layer                         │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                    Session Management & Persistence                   │  │
│  │  • Persistent browser sessions with cookie storage                     │  │
│  │  • Automatic session recovery and re-authentication                    │  │
│  │  │                                                                   │  │
│  │  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐  │  │
│  │  │ Proxy Rotation  │    │ User Agent      │    │ Headless        │  │  │
│  │  │ & IP Management │◄──►│ Pool Management │◄──►│ Browser Pool    │  │  │
│  │  └─────────────────┘    └─────────────────┘    └─────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼─────────────────────────────────────────┐
│                          Content Processing Layer                           │
│  ┌─────────────────┐    ┌─────────────────┐    ┌───────────────────────┐  │
│  │ Smart Filtering │    │ Deduplication   │    │ Content             │  │
│  │ • Developer     │    │ • SQLite        │    │ Enrichment          │  │
│  │   keywords      │    │   persistence   │    │ • Metadata          │  │
│  │ • Follower      │    │ • Hash-based    │    │   extraction        │  │
│  │   thresholds    │    │   deduplication │    │ • Sentiment         │  │
│  │ • Spam          │    │                 │    │   analysis          │  │
│  │   detection     │    │                 │    │                     │  │
│  └─────────────────┘    └─────────────────┘    └───────────────────────┘  │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼─────────────────────────────────────────┐
│                            Delivery & Output Layer                          │
│  ┌─────────────────┐    ┌─────────────────┐    ┌───────────────────────┐  │
│  │ Email           │    │ API Endpoints   │    │ Notification          │  │
│  │ Notifications   │    │ • REST API      │    │ System                │  │
│  │ • Resend API    │    │ • Webhooks      │    │ • Health checks       │  │
│  │ • Hourly        │    │ • Real-time     │    │ • Alerting            │  │
│  │   summaries     │    │   streaming     │    │                       │  │
│  └─────────────────┘    └─────────────────┘    └───────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow
1. **Session Initialization**: Persistent browser session established with manual X login
2. **Scheduled Scraping**: Hourly cron job triggers automated scraping process
3. **Content Fetching**: Playwright navigates X with anti-detection measures and extracts tweets
4. **Smart Filtering**: Content filtered by developer keywords, follower thresholds (>5000), and spam detection
5. **Deduplication**: SQLite database prevents duplicate content delivery
6. **Content Enrichment**: Metadata extracted and sentiment analysis performed
7. **Delivery**: Filtered content delivered via email notifications and API endpoints
8. **Health Monitoring**: Session health and scraping success monitored continuously

## 🛡️ Security Architecture

### Threat Model
| Threat Vector | Risk Level | Mitigation Strategy | Implementation Status |
|---------------|------------|-------------------|---------------------|
| **Account Suspension** | High | Human-like interaction patterns, session persistence, rate limiting | ✅ Implemented |
| **IP Blocking** | High | Proxy rotation, residential IP pools, session management | ✅ Implemented |
| **Browser Fingerprinting** | Medium | Headless browser configuration, canvas spoofing, user agent rotation | ⚠️ Basic |
| **Data Exfiltration** | Low | Encrypted SQLite storage, access controls, audit logging | ⚠️ Partial |
| **API Abuse** | High | Rate limiting, authentication, input validation | ✅ Implemented |
| **Session Hijacking** | Medium | Encrypted session storage, automatic logout detection | ⚠️ Basic |

### Security Headers & Configuration
```javascript
// Essential security headers for scraping API
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  next();
});

// Playwright security configuration
const browser = await chromium.launch({
  headless: false, // Headful mode for better anti-detection
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-web-security',
    '--disable-features=IsolateOrigins,site-per-process',
    '--disable-blink-features=AutomationControlled'
  ]
});
```

### Authentication & Authorization
- **Session Persistence**: Manual X login with persistent cookie storage
- **API Key Authentication**: Required for all API endpoints
- **Rate Limiting**: Per-user and per-IP rate limiting with sliding windows
- **Health Check Authentication**: Public health endpoint for deployment wake-up
- **Audit Logging**: All scraping requests logged with session context and metadata

## 🔧 Fault Tolerance Deep Dive

### Error Handling Strategy
The platform implements comprehensive error handling across multiple layers:

#### 1. Session Management Errors
- **Login Expired**: Automatic session recovery with manual re-authentication flow
- **Cookie Corruption**: Session reset and fresh login required
- **Account Lockout**: Immediate alerting and manual intervention required
- **Session Drift**: Periodic session validation and health checks

#### 2. Content Scraping Errors
- **Page Structure Changes**: Multiple selector strategies with fallback logic
- **Dynamic Content Loading**: Wait strategies with dynamic timeout adjustment
- **JavaScript Errors**: Error capture and reporting without crashing the scraper
- **Network Timeouts**: Configurable timeouts with exponential backoff

#### 3. Anti-Bot Detection Errors
- **CAPTCHA Challenges**: Manual intervention required with alerting
- **Rate Limiting by X**: Adaptive delay strategies based on response codes
- **Session Blocking**: Session reset and IP rotation on detection
- **Fingerprint Spoofing**: Continuous improvement of anti-detection measures

#### 4. Infrastructure Errors
- **Browser Crashes**: Automatic browser restart and session recovery
- **Memory Leaks**: Resource monitoring and process recycling
- **Database Failures**: SQLite backup and recovery procedures
- **Email Service Outages**: Local queue with retry logic

### Retry & Recovery Patterns
```javascript
// Exponential backoff with jitter for resilient scraping
async function scrapeWithRetry(url, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await scrapeUrl(url);
      return result;
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) break;
      
      // Calculate delay with jitter (1-2 seconds base, exponential backoff)
      const baseDelay = 1000 + Math.random() * 1000;
      const delay = baseDelay * Math.pow(2, attempt);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}
```

### Health Monitoring & Self-Healing
- **Session Health Checks**: Periodic validation of X login status
- **Scraping Success Monitoring**: Real-time tracking of content extraction success rates
- **Database Integrity Checks**: SQLite database corruption detection and repair
- **Email Delivery Tracking**: Success/failure rates with automatic alerting
- **Automatic Recovery**: Failed components automatically restarted with state preservation

## 📊 Operational Excellence

### Monitoring Dashboard Specifications
Key metrics to monitor in production:

| Metric Category | Specific Metrics | Alert Thresholds | Dashboard Priority |
|-----------------|------------------|------------------|-------------------|
| **Session Health** | Login status, Cookie validity, Session age | Expired session, Invalid cookies, >7 days old | Critical |
| **Scraping Success** | Success rate %, Error rate %, Content volume | <90% success, >10% errors, <10 tweets/hour | Critical |
| **Content Quality** | Developer keyword match %, Follower threshold %, Spam detection % | <80% match, <90% threshold, >5% spam | High |
| **Resource Usage** | CPU %, Memory %, Disk I/O, Network bandwidth | >80% CPU, >85% memory, >90% disk | High |
| **Delivery Metrics** | Email success rate, API response time, Webhook delivery | <95% email, >2s API, >5s webhook | Medium |

### Alerting & Runbooks
**Critical Alerts (Immediate Response Required):**
- X session expired or invalid
- Scraping success rate drops below 80%
- No content fetched for >2 hours
- Database corruption detected

**Warning Alerts (Investigate Within 1 Hour):**
- Content quality scores declining
- Resource utilization above 75% sustained
- Email delivery failures >5%
- Session approaching 7-day limit

**Runbook Examples:**
1. **Session Recovery**:
   - Stop automated scraping
   - Notify user to perform manual login
   - Validate new session before resuming
   - Update session persistence storage

2. **Scraping Failure Investigation**:
   - Check recent X page structure changes
   - Review selector strategies and fallback logic
   - Analyze error logs for patterns
   - Test with manual browser session

### Backup & Restore Procedures
- **Session Backup**: Encrypted cookie storage with regular backups
- **Content Database Backup**: SQLite database snapshots with versioning
- **Configuration Backup**: Environment variables and deployment configurations
- **Disaster Recovery**: Full system restore procedure documented and tested monthly

### Capacity Planning Guidelines
- **Small Scale**: 1-10 concurrent scrapers, single session, basic monitoring
- **Medium Scale**: 10-50 concurrent scrapers, session rotation, advanced monitoring  
- **Large Scale**: 50+ concurrent scrapers, dedicated proxy infrastructure, enterprise monitoring
- **Resource Ratios**: 1GB RAM per 10 concurrent browsers, 1 CPU core per 20 concurrent scrapers
- **Network Bandwidth**: 10 Mbps per 100 concurrent scrapers for typical content

## 📈 Scaling Patterns

### Horizontal Scaling Strategies
The platform scales horizontally through multiple dimensions:

#### 1. Session Scaling
- **Multiple Account Support**: Manage multiple X accounts for higher volume scraping
- **Session Rotation**: Rotate between multiple authenticated sessions to avoid rate limits
- **Geographic Distribution**: Sessions distributed across target regions for better content access
- **Health Monitoring**: Real-time session performance and availability tracking

#### 2. Proxy Scaling  
- **Proxy Rotation**: Thousands of residential/mobile proxies in rotation
- **Geographic Distribution**: Proxies distributed across target regions
- **Health Monitoring**: Real-time proxy performance and availability tracking
- **Fallback Mechanisms**: Multiple proxy providers with automatic failover

#### 3. Browser Scaling
- **Browser Pool Management**: Pre-warmed browser instances ready for immediate use
- **Session Reuse**: Intelligent session management to reduce browser startup overhead
- **Memory Management**: Automatic browser recycling to prevent memory leaks
- **Resource Optimization**: Headless browser configuration optimized for scraping

### Performance Optimization Techniques
- **Connection Pooling**: Reuse HTTP connections to reduce overhead
- **Caching Layer**: Redis cache for frequently scraped content and selectors
- **Compression**: Gzip compression for network traffic and storage
- **Async Processing**: Non-blocking I/O for maximum concurrency
- **Database Indexing**: Optimized indexes for query performance
- **Content Filtering**: Early filtering to reduce processing overhead

### Load Testing & Benchmarking
```bash
# Example load test with k6
k6 run --vus 10 --duration 30s scripts/scraping-load-test.js

# Expected performance benchmarks
- Single tweet scraping: <2 seconds average
- Hourly batch scraping: <5 minutes average  
- Concurrent sessions (5): <95% success rate
- Proxy rotation: <5% failure rate
- Memory usage: <500MB per 10 concurrent browsers
```

### Cost Optimization Strategies
- **Spot Instances**: Use spot/preemptible instances for worker nodes
- **Proxy Optimization**: Intelligent proxy selection to minimize costs
- **Resource Right-sizing**: Match instance types to actual workload requirements
- **Caching Strategy**: Aggressive caching to reduce redundant scraping
- **Batch Processing**: Group similar requests to maximize efficiency

## 🔌 Integration Patterns

### API Integration Examples
#### Basic Tweet Fetching
```bash
curl -X GET https://api.xfetch.com/v1/tweets \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json"
```

#### Manual Fetch Trigger
```bash
curl -X POST https://api.xfetch.com/v1/fetch-now \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json"
```

#### Health Check
```bash
curl -X GET https://api.xfetch.com/health
Response: { "status": "ok", "sessionValid": true, "lastFetch": "2026-02-16T10:00:00Z" }
```

### Data Pipeline Integration
#### Kafka Integration for Real-time Processing
```javascript
// Producer: Send scraped tweets to Kafka topic
const producer = kafka.producer();
await producer.connect();
await producer.send({
  topic: 'developer-tweets',
  messages: [{ value: JSON.stringify(tweetData) }]
});

// Consumer: Process tweets in real-time for market intelligence
const consumer = kafka.consumer({ groupId: 'market-intel' });
await consumer.connect();
await consumer.subscribe({ topic: 'developer-tweets' });
consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    const tweet = JSON.parse(message.value.toString());
    // Process tweet for market intelligence
    await processMarketIntel(tweet);
  }
});
```

#### Database Integration Patterns
- **SQLite**: Primary storage for tweets and session data (local persistence)
- **PostgreSQL**: Analytics and business intelligence data warehouse
- **MongoDB**: Document-based storage for unstructured tweet content
- **Elasticsearch**: Full-text search capabilities for tweet discovery
- **Redis**: Caching layer and job queue management

### Third-Party Service Integrations
#### Email Service Integration
```javascript
// Integration with Resend email service
const resend = new Resend(process.env.RESEND_API_KEY);

const sendHourlySummary = async (email, tweets) => {
  try {
    const response = await resend.emails.send({
      from: 'X-Fetch <alerts@xfetch.com>',
      to: [email],
      subject: 'Your Hourly Developer Tweet Summary 🚀',
      html: generateTweetSummaryTemplate(tweets),
      text: generateTweetSummaryText(tweets)
    });
    return response;
  } catch (error) {
    // Log email failure but don't fail the main scraping job
    console.error('Email delivery failed:', error.message);
  }
};
```

#### Proxy Service Integration
- **Bright Data**: Residential and datacenter proxy integration
- **Oxylabs**: Premium proxy service with advanced features
- **ScraperAPI**: Managed scraping service as fallback
- **Custom Proxy Pools**: Self-managed proxy infrastructure

### Webhook Notification System
```javascript
// Send webhook notifications for scraping events
const sendWebhook = async (webhookUrl, event, data) => {
  try {
    await axios.post(webhookUrl, {
      event: event,
      timestamp: new Date().toISOString(),
      data: data
    }, {
      timeout: 5000,
      maxRedirects: 0
    });
  } catch (error) {
    // Log webhook failure but don't fail the main scraping job
    console.error('Webhook delivery failed:', error.message);
  }
};

// Usage examples
await sendWebhook(webhookUrl, 'scraping.started', { sessionId, timestamp });
await sendWebhook(webhookUrl, 'scraping.completed', { sessionId, tweetCount, results });
await sendWebhook(webhookUrl, 'scraping.failed', { sessionId, error, recoveryAction });
```

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18 or later (LTS recommended)
- **pnpm**: Package manager (required for monorepo setup)
- **Playwright**: Browser automation framework
- **Resend API Key**: For email notifications (optional)

### Installation & Setup
```bash
# Clone the repository
git clone https://github.com/AlphaTechini/X-Fetch.git
cd X-Fetch

# Install dependencies
pnpm install

# Install Playwright browsers
pnpm run install-browser

# Create environment configuration
cp Backend/.env.example Backend/.env
# Edit .env with your configuration values
```

### Environment Configuration
```ini
# Server Configuration
PORT=3000
NODE_ENV=production
API_KEY_SECRET=your-super-secret-api-key-here

# Session Configuration
SESSION_PERSISTENCE=true
SESSION_STORAGE_PATH=./user-data/
SESSION_TIMEOUT=604800 # 7 days in seconds

# Scraping Configuration
SCRAPING_INTERVAL=3600000 # 1 hour in milliseconds
DEVELOPER_KEYWORDS=backend engineer,frontend dev,API design,GraphQL,database performance,React,Next.js,Solidity,smart contracts,debugging,refactoring,scaling systems,shipping code,production bugs,EVM,gas optimization,audit,schema,migration,Svelte,deployed,shipped,broke,fixed,optimizing,vibe coding
SPAM_KEYWORDS=airdrop,giveaway,whitelist,presale,NFT mint,RT to win,gm,follow back
MIN_FOLLOWERS=5000

# Email Configuration (optional)
RESEND_API_KEY=your-resend-api-key
EMAIL_TO=your-email@example.com
EMAIL_FROM=alerts@xfetch.com

# Security Configuration  
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=100

# Monitoring Configuration
SENTRY_DSN=your-sentry-dsn
PROMETHEUS_ENABLED=true
```

### Running the Platform
#### Development Mode
```bash
# Terminal 1 - Backend
cd Backend
pnpm run dev

# Terminal 2 - Frontend
cd Frontend
pnpm run dev
```

#### Production Mode
```bash
# Build and start
pnpm run build
pnpm start

# Start with PM2 process manager
pm2 start ecosystem.config.js

# Start with Docker
docker-compose -f docker-compose.prod.yml up -d
```

### First-Time Setup
1. **Manual Login**: Run `pnpm run login` to open browser and log in to X manually
2. **Session Persistence**: Close browser after successful login - session will be saved
3. **Automated Scraping**: Hourly cron job will automatically fetch and filter tweets
4. **Email Notifications**: Hourly summaries will be sent to configured email address

### API Endpoints
#### Health & Status
```
GET /health
Response: { "status": "ok", "sessionValid": true, "uptime": 12345 }

GET /api/session
Response: { "status": "valid", "expiresAt": "2026-02-23T10:00:00Z" }

GET /api/status
Response: { "scrapingActive": true, "lastFetch": "2026-02-16T10:00:00Z", "tweetCount": 42 }
```

#### Content Access
```
GET /api/tweets
Response: { "tweets": [...], "count": 42, "lastUpdated": "2026-02-16T10:00:00Z" }

POST /api/fetch-now
Response: { "status": "started", "estimatedCompletion": "2026-02-16T10:05:00Z" }
```

## 📋 Production Checklist

Before deploying to production, ensure:

- [ ] **Security**: Session persistence configured, rate limiting enabled, security headers set
- [ ] **Monitoring**: Prometheus/Grafana dashboard configured, alerting rules set
- [ ] **Scaling**: Auto-scaling configured, proxy rotation working, resource limits set
- [ ] **Backup**: Session and data backup procedures tested
- [ ] **Testing**: Load testing completed, error scenarios tested, recovery procedures verified
- [ ] **Compliance**: Legal compliance for web scraping in target jurisdictions verified
- [ ] **Documentation**: API documentation, runbooks, and operational procedures created

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. **Architecture First**: Propose architectural changes before implementation
2. **Security Focus**: All changes must maintain or improve security posture
3. **Performance Aware**: Consider performance implications of all changes
4. **Test Coverage**: Maintain or improve test coverage
5. **Documentation**: Update documentation for all significant changes

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Note**: Web scraping legality varies by jurisdiction and target website terms of service. Always ensure compliance with applicable laws and X/Twitter terms of service before deploying scraping infrastructure.