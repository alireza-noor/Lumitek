-- Lumitek v0.3.0 D1 schema
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  coins INTEGER NOT NULL DEFAULT 10,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  vip_until INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  last_login INTEGER NOT NULL DEFAULT 0,
  disabled INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  product_id TEXT,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'IRR',
  status TEXT NOT NULL DEFAULT 'pending',
  authority TEXT,
  gateway TEXT,
  created_at INTEGER NOT NULL,
  paid_at INTEGER,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS donations (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'IRR',
  status TEXT NOT NULL DEFAULT 'pending',
  authority TEXT,
  gateway TEXT,
  supporter_name TEXT,
  created_at INTEGER NOT NULL,
  paid_at INTEGER
);

CREATE TABLE IF NOT EXISTS game_scores (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  game_id TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  read_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_scores_game ON game_scores(game_id, score DESC);


-- v0.3.1 additions: daily rewards, store and purchases
CREATE TABLE IF NOT EXISTS daily_rewards (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  reward_date TEXT NOT NULL,
  coins INTEGER NOT NULL DEFAULT 10,
  xp INTEGER NOT NULL DEFAULT 5,
  created_at INTEGER NOT NULL,
  UNIQUE(user_id, reward_date),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS store_items (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  cost INTEGER NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  cost INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(item_id) REFERENCES store_items(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_daily_rewards_user_date ON daily_rewards(user_id, reward_date);
CREATE INDEX IF NOT EXISTS idx_purchases_user_created ON purchases(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);

-- Starter catalog. Coins are never granted by the client.
INSERT OR IGNORE INTO store_items(id,slug,name,description,cost,category,active,created_at)
VALUES
  ('store_theme_blue','blue-theme','Blue Theme','Unlock the blue profile theme.',25,'theme',1,0),
  ('store_badge_star','star-badge','Star Badge','Unlock a profile star badge.',50,'badge',1,0),
  ('store_xp_boost','xp-boost','XP Boost','A store item prepared for future game integrations.',100,'boost',1,0);
