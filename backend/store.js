const crypto = require('crypto'); // 👈 required for randomUUID

const sessions = new Map(); // sessionId -> { files, createdAt }

const ONE_HOUR = 3600000;

function createSession(files) {
  const id = crypto.randomUUID();
  sessions.set(id, { files, createdAt: Date.now() });
  return id;
}

function getSession(id) {
  return sessions.get(id);
}

// Cleanup old sessions every hour
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (now - session.createdAt > ONE_HOUR) {
      sessions.delete(id);
    }
  }
}, ONE_HOUR);

module.exports = { createSession, getSession };
