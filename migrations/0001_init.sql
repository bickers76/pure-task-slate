-- GetShitDone schema for Cloudflare D1 (SQLite).
-- Timestamps are ISO-8601 UTC strings; dates are YYYY-MM-DD; tags are a JSON array.

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_sessions_user ON sessions(user_id);

-- Failed sign-in attempts, used to slow down password guessing.
CREATE TABLE login_attempts (
  ip TEXT NOT NULL,
  at TEXT NOT NULL
);
CREATE INDEX idx_login_attempts_ip_at ON login_attempts(ip, at);

-- Small key/value store (holds the hash of the one-time setup code).
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Keys agents use to call the bot API. Only a hash of each key is stored.
CREATE TABLE api_keys (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  agent TEXT NOT NULL CHECK (agent IN ('Wayne', 'Mervbot')),
  key_hash TEXT NOT NULL UNIQUE,
  key_hint TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_used_at TEXT
);

CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'Backlog' CHECK (status IN ('Backlog', 'In Progress', 'Review', 'Done')),
  priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High')),
  assignee TEXT NOT NULL DEFAULT 'Mervbot' CHECK (assignee IN ('Wayne', 'Mervbot')),
  due_date TEXT,
  tags TEXT,
  deliverable TEXT,
  review_feedback TEXT,
  blocked_reason TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_status_sort ON tasks(status, sort_order);

CREATE TABLE task_comments (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author TEXT NOT NULL CHECK (author IN ('Wayne', 'Mervbot')),
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_task_comments_task ON task_comments(task_id, created_at);
