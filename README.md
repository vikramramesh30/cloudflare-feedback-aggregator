# Product Feedback Aggregator

A serverless feedback analysis tool built with Cloudflare Workers, D1 Database, and Workers AI. Aggregates product feedback from multiple sources (Discord, GitHub, Support, Twitter) and uses AI to analyze sentiment and urgency.

**Live Demo:** https://pmproject.vikramramesh04.workers.dev

---

## Features

- **📊 Feedback Dashboard** - Clean interface showing all feedback with filtering
- **🤖 AI Sentiment Analysis** - Automatic sentiment detection (positive/negative/neutral)
- **⚡ Urgency Scoring** - AI-powered urgency classification (1-5 scale)
- **🔍 Source Filtering** - Filter by Discord, GitHub, Support, or Twitter
- **📈 Analytics** - Real-time statistics and sentiment distribution

---

## Tech Stack

- **Cloudflare Workers** - Serverless edge computing platform
- **D1 Database** - SQLite database for storing feedback
- **Workers AI** - Llama 3 model for sentiment analysis
- **TypeScript** - Type-safe backend code
- **Vanilla JS** - Simple frontend (no framework needed)

---

## Project Structure

```
pmproject/
├── src/
│   ├── index.ts              # Main Worker (API + routing)
│   ├── ai/
│   │   └── analyzer.ts       # AI sentiment analysis logic
│   └── db/
│       └── schema.sql        # Database schema
├── public/
│   └── index.html            # Dashboard UI
├── wrangler.jsonc            # Cloudflare configuration
└── FRICTION_LOG.md           # Product insights
```

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/feedback` | GET | List all feedback (supports `?source=` and `?limit=` filters) |
| `/api/feedback` | POST | Add new feedback entry |
| `/api/stats` | GET | Get aggregated statistics |
| `/api/analyze` | POST | Analyze sentiment for feedback (by `id` or `content`) |
| `/api/seed` | POST | Seed database with mock data |

---

## Local Development

### Prerequisites
- Node.js 18+
- npm or yarn
- Cloudflare account (free tier works)

### Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd pmproject
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Login to Cloudflare**
   ```bash
   npx wrangler login
   ```

4. **Create D1 database**
   ```bash
   npx wrangler d1 create feedback-db
   ```
   Copy the database ID and update `wrangler.jsonc`

5. **Apply database schema**
   ```bash
   npx wrangler d1 execute feedback-db --local --file=./src/db/schema.sql
   ```

6. **Start dev server**
   ```bash
   npm run dev
   ```
   Open http://localhost:8787

7. **Seed with mock data**
   ```bash
   curl -X POST http://localhost:8787/api/seed
   ```

---

## Deployment

1. **Apply schema to remote database**
   ```bash
   npx wrangler d1 execute feedback-db --remote --file=./src/db/schema.sql
   ```

2. **Deploy to Cloudflare**
   ```bash
   npm run deploy
   ```

3. **Seed production database**
   ```bash
   curl -X POST https://your-worker.workers.dev/api/seed
   ```

---

## Example Usage

### Add Feedback
```bash
curl -X POST https://pmproject.vikramramesh04.workers.dev/api/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "source": "github",
    "content": "The new feature is amazing!",
    "author": "developer123"
  }'
```

### Analyze Sentiment
```bash
curl -X POST https://pmproject.vikramramesh04.workers.dev/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "content": "This is broken and needs urgent attention!"
  }'
```

Response:
```json
{
  "success": true,
  "analysis": {
    "sentiment": "negative",
    "urgency": 5,
    "confidence": 0.9,
    "reasoning": "Urgent language indicates critical issue"
  }
}
```

### Get Statistics
```bash
curl https://pmproject.vikramramesh04.workers.dev/api/stats
```

---

## Database Schema

```sql
CREATE TABLE feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,           -- discord, github, support, twitter
  content TEXT NOT NULL,
  author TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  sentiment TEXT,                 -- positive, negative, neutral
  urgency INTEGER DEFAULT 3,      -- 1-5 scale
  themes TEXT
);
```

---

## Features to Add

- [ ] Real API integrations (Discord, GitHub, Twitter, Zendesk)
- [ ] User authentication
- [ ] Export to CSV/JSON
- [ ] Email alerts for urgent feedback
- [ ] Theme extraction (identify common topics)
- [ ] Historical trend analysis

---

## Built For

Cloudflare Product Manager Intern Assignment (2026)

This project demonstrates:
- Rapid prototyping with AI-assisted development
- Full-stack serverless architecture
- AI/ML integration for text analysis
- Product thinking and user experience design

---

## License

MIT License - feel free to use this for your own projects!

---

## Acknowledgments

Built with [Claude Code](https://claude.com/claude-code) CLI for rapid prototyping.
