const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { createSession, getSession } = require('./store');

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

// 1. Create a new preview session
app.post('/api/sessions', (req, res) => {
  const { files } = req.body;
  if (!files || typeof files !== 'object') {
    return res.status(400).json({ error: 'Missing or invalid files' });
  }
  const sessionId = createSession(files);
  res.json({ sessionId, previewUrl: `/preview/${sessionId}` });
});

// 2. Get files for a session (used by the preview iframe)
app.get('/api/sessions/:sessionId/files', (req, res) => {
  const session = getSession(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json(session.files);
});

// 3. Serve the preview iframe page
app.use('/preview', express.static('../preview-page'));

// Optional: health check
app.get('/health', (req, res) => res.send('OK'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Preview API running on port ${PORT}`));
