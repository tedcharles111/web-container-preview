// preview-page/webcontainer.js
import { WebContainer, auth } from '@webcontainer/api';

// Your WebContainer client ID (provided by user)
const CLIENT_ID = 'wc_api_tedcharles111_bd5f206360ac8bf1d9000f48ff00949b';

// Get session ID from URL
const sessionId = window.location.pathname.split('/').pop();

const loadingEl = document.getElementById('loading');
const frameEl = document.getElementById('preview-frame');
const fallbackEl = document.getElementById('fallback');

async function startWebContainer(files) {
  try {
    // Initialize WebContainer authentication
    await auth.init({ clientId: CLIENT_ID, scope: '' });

    loadingEl.innerText = '⏳ Booting WebContainer...';
    const webcontainer = await WebContainer.boot();

    loadingEl.innerText = '⏳ Writing files...';
    // Mount files – files is an object { 'path/to/file': 'content' }
    await webcontainer.mount(files);

    // Detect start command (look for package.json scripts)
    let startCmd = 'npm run dev';
    if (files['package.json']) {
      try {
        const pkg = JSON.parse(files['package.json']);
        if (pkg.scripts && pkg.scripts.start) startCmd = 'npm start';
        else if (pkg.scripts && pkg.scripts.dev) startCmd = 'npm run dev';
        else if (pkg.scripts && pkg.scripts.serve) startCmd = 'npm run serve';
      } catch (e) { /* ignore */ }
    }

    loadingEl.innerText = `⏳ Running ${startCmd}...`;
    const installProcess = await webcontainer.spawn('npm', ['install']);
    const installExit = await installProcess.exit;
    if (installExit !== 0) throw new Error('npm install failed');

    const startProcess = await webcontainer.spawn('npm', startCmd.split(' ').slice(1), {
      cwd: '/',
    });

    // Wait for the server to be ready
    startProcess.output.pipeTo(new WritableStream({
      write(data) { console.log('[server]', data); }
    }));

    webcontainer.on('server-ready', (port, url) => {
      loadingEl.style.display = 'none';
      frameEl.style.display = 'block';
      frameEl.src = url;
    });

  } catch (error) {
    console.error('WebContainer failed:', error);
    fallbackToStackBlitz(files);
  }
}

function fallbackToStackBlitz(files) {
  loadingEl.style.display = 'none';
  fallbackEl.style.display = 'block';
  fallbackEl.innerHTML = '⚠️ WebContainer not available – using StackBlitz fallback.';

  // Create a div for StackBlitz
  const sbDiv = document.createElement('div');
  sbDiv.id = 'stackblitz-container';
  sbDiv.style.height = '100%';
  document.getElementById('container').appendChild(sbDiv);

  // Load StackBlitz SDK dynamically
  const script = document.createElement('script');
  script.src = 'https://unpkg.com/@stackblitz/sdk/bundles/sdk.umd.js';
  script.onload = () => {
    // Convert files to StackBlitz project format
    const project = {
      files: files,
      title: 'Preview',
      description: 'Generated app',
      template: detectTemplate(files),
    };
    window.StackBlitzSDK.embedProject(sbDiv, project, {
      view: 'preview',
      height: '100%',
      hideExplorer: true,
      hideNavigation: true,
    });
  };
  document.head.appendChild(script);
}

function detectTemplate(files) {
  if (files['package.json']) {
    try {
      const pkg = JSON.parse(files['package.json']);
      if (pkg.dependencies?.react) return 'create-react-app';
      if (pkg.dependencies?.vue) return 'vue';
      if (pkg.dependencies?.next) return 'node';
    } catch (e) {}
  }
  if (files['index.html']) return 'html';
  return 'node';
}

// Fetch files from API
async function fetchFiles() {
  try {
    const res = await fetch(`/api/sessions/${sessionId}/files`);
    if (!res.ok) throw new Error('Session not found');
    const files = await res.json();
    startWebContainer(files);
  } catch (err) {
    loadingEl.innerText = '❌ Failed to load project.';
    console.error(err);
  }
}

fetchFiles();
