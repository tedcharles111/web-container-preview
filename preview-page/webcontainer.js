// preview-page/webcontainer.js
// No static import – we'll use dynamic import for better error handling

// Your WebContainer client ID
const CLIENT_ID = 'wc_api_tedcharles111_bd5f206360ac8bf1d9000f48ff00949b';

// Get session ID from URL
const sessionId = window.location.pathname.split('/').pop();

const loadingEl = document.getElementById('loading');
const frameEl = document.getElementById('preview-frame');
const fallbackEl = document.getElementById('fallback');

/**
 * Ensure essential files exist for React/HTML projects.
 */
function ensureEssentialFiles(files) {
  let isReact = false;
  if (files['package.json']) {
    try {
      const pkg = JSON.parse(files['package.json']);
      if (pkg.dependencies?.react) isReact = true;
    } catch (e) {}
  }

  if (isReact) {
    if (!files['public/index.html']) {
      files['public/index.html'] = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>React App</title>
</head>
<body>
  <div id="root"></div>
</body>
</html>`;
    }

    const hasIndexJs = Object.keys(files).some(f => f === 'src/index.js' || f === 'src/index.tsx');
    if (!hasIndexJs) {
      const usesTs = Object.keys(files).some(f => f.endsWith('.tsx'));
      const indexFile = usesTs ? 'src/index.tsx' : 'src/index.js';
      files[indexFile] = usesTs
        ? `import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);`
        : `import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);`;
    }
  }

  if (!isReact && !files['index.html']) {
    files['index.html'] = '<h1>Hello World</h1>';
  }

  return files;
}

async function startWebContainer(rawFiles) {
  const files = ensureEssentialFiles({ ...rawFiles });

  try {
    // Dynamically import the WebContainer module
    const module = await import('https://cdn.jsdelivr.net/npm/@webcontainer/api@1.1.9/+esm');
    
    // Extract named exports – adjust based on actual module shape
    const { WebContainer, auth } = module;
    if (!WebContainer || !auth) {
      throw new Error('WebContainer module does not provide expected exports');
    }

    await auth.init({ clientId: CLIENT_ID, scope: '' });

    loadingEl.innerText = '⏳ Booting WebContainer...';
    const webcontainer = await WebContainer.boot();

    loadingEl.innerText = '⏳ Writing files...';
    await webcontainer.mount(files);

    let startCmd = 'npm run dev';
    if (files['package.json']) {
      try {
        const pkg = JSON.parse(files['package.json']);
        if (pkg.scripts?.start) startCmd = 'npm start';
        else if (pkg.scripts?.dev) startCmd = 'npm run dev';
        else if (pkg.scripts?.serve) startCmd = 'npm run serve';
      } catch (e) {}
    }

    loadingEl.innerText = `⏳ Running ${startCmd}...`;
    const installProcess = await webcontainer.spawn('npm', ['install']);
    const installExit = await installProcess.exit;
    if (installExit !== 0) throw new Error('npm install failed');

    const startProcess = await webcontainer.spawn('npm', startCmd.split(' ').slice(1), { cwd: '/' });

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

  const sbDiv = document.createElement('div');
  sbDiv.id = 'stackblitz-container';
  sbDiv.style.height = '100%';
  document.getElementById('container').appendChild(sbDiv);

  const script = document.createElement('script');
  script.src = 'https://unpkg.com/@stackblitz/sdk/bundles/sdk.umd.js';
  script.onload = () => {
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
