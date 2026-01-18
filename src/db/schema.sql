-- Feedback Aggregator Database Schema
-- Stores product feedback from multiple sources

CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,           -- discord, github, support, twitter
  content TEXT NOT NULL,          -- the feedback text
  author TEXT,                    -- username/handle
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  sentiment TEXT,                 -- positive, negative, neutral (populated by AI)
  urgency INTEGER DEFAULT 3,      -- 1-5 scale (populated by AI)
  themes TEXT                     -- JSON array of themes (populated by AI)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_source ON feedback(source);
CREATE INDEX IF NOT EXISTS idx_sentiment ON feedback(sentiment);
CREATE INDEX IF NOT EXISTS idx_created_at ON feedback(created_at);
CREATE INDEX IF NOT EXISTS idx_urgency ON feedback(urgency);
