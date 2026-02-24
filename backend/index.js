const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { createSession, getSession } = require('./store');

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

// 1. Create a new preview session
app.post('/api/sessions', async (req, res) => {
  try {
    const { files } = req.body;
    if (!files || typeof files !== 'object') {
      return res.status(400).json({ error: 'Missing or invalid files' });
    }
    const sessionId = createSession(files);
    res.json({ sessionId, previewUrl: `/preview/${sessionId}` });
  } catch (error) {
    console.error('🔥 Error in POST /api/sessions:', error.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 2. Get files for a session
app.get('/api/sessions/:sessionId/files', (req, res) => {
  try {
    const session = getSession(req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json(session.files);
  } catch (error) {
    console.error('🔥 Error in GET /api/sessions/:sessionId/files:', error.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 3. Serve static files from preview-page
const previewDir = path.join(__dirname, '../preview-page');
app.use('/preview', express.static(previewDir));

// 4. Catch-all for /preview/* routes
app.get('/preview/*', (req, res) => {
  res.sendFile(path.join(previewDir, 'index.html'));
});

// 5. Root route
app.get('/', (req, res) => {
  res.send(`
    <h1>Preview Engine API</h1>
    <p>Use <code>POST /api/sessions</code> with JSON <code>{ "files": { ... } }</code> to create a preview.</p>
    <p>Then access <code>/preview/:sessionId</code> to see the live preview.</p>
  `);
});

// Health check
app.get('/health', (req, res) => res.send('OK'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Preview API running on port ${PORT}`));
