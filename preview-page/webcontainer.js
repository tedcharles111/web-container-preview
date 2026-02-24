// preview-page/webcontainer.js – StackBlitz-only preview engine
// No WebContainer – pure StackBlitz embed with auto-injection

// Get session ID from URL
const sessionId = window.location.pathname.split('/').pop();

const loadingEl = document.getElementById('loading');
const frameEl = document.getElementById('preview-frame'); // not used, but keep for consistency
const fallbackEl = document.getElementById('fallback');

/**
 * Automatically inject missing files to make any project work in StackBlitz.
 * Returns a complete project object ready for StackBlitz.
 */
function prepareProjectForStackBlitz(rawFiles) {
  // Deep copy to avoid mutating original
  const files = JSON.parse(JSON.stringify(rawFiles));

  // Detect if it's a React project (presence of .jsx/.tsx files or react in package.json)
  let isReact = false;
  const hasJsxTsx = Object.keys(files).some(f => f.endsWith('.jsx') || f.endsWith('.tsx'));
  
  if (files['package.json']) {
    try {
      const pkg = JSON.parse(files['package.json']);
      if (pkg.dependencies?.react || pkg.devDependencies?.react) isReact = true;
    } catch (e) {}
  } else if (hasJsxTsx) {
    isReact = true;
  }

  // If React, ensure package.json exists with proper dependencies
  if (isReact) {
    if (!files['package.json']) {
      // Detect if TypeScript is used
      const usesTs = Object.keys(files).some(f => f.endsWith('.tsx') || f.endsWith('.ts'));
      
      files['package.json'] = JSON.stringify({
        name: "ai-generated-app",
        version: "1.0.0",
        private: true,
        dependencies: {
          "react": "^18.2.0",
          "react-dom": "^18.2.0",
          "react-router-dom": "^6.8.0", // stable version
          "react-scripts": "5.0.1"
        },
        ...(usesTs && {
          devDependencies: {
            "typescript": "^4.9.5",
            "@types/react": "^18.0.28",
            "@types/react-dom": "^18.0.11",
            "@types/react-router-dom": "^5.3.3"
          }
        }),
        scripts: {
          "start": "react-scripts start",
          "build": "react-scripts build",
          "test": "react-scripts test",
          "eject": "react-scripts eject"
        },
        eslintConfig: {
          "extends": ["react-app"]
        },
        browserslist: {
          "production": [">0.2%", "not dead", "not op_mini all"],
          "development": ["last 1 chrome version", "last 1 firefox version", "last 1 safari version"]
        }
      }, null, 2);
    }

    // Ensure public/index.html
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

    // Ensure src/index.js or src/index.tsx
    const usesTs = Object.keys(files).some(f => f.endsWith('.tsx') || f.endsWith('.ts'));
    const indexFile = usesTs ? 'src/index.tsx' : 'src/index.js';
    if (!files[indexFile]) {
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
  } else {
    // Non-React: ensure index.html exists
    if (!files['index.html']) {
      files['index.html'] = '<h1>Hello World</h1>';
    }
  }

  return files;
}

/**
 * Detect the appropriate StackBlitz template.
 */
function detectTemplate(files) {
  if (files['package.json']) {
    try {
      const pkg = JSON.parse(files['package.json']);
      if (pkg.dependencies?.react) return 'create-react-app';
      if (pkg.dependencies?.vue) return 'vue';
      if (pkg.dependencies?.next) return 'node';
    } catch (e) {}
  }
  // Default to node (which can handle many things) or html if only index.html
  if (files['index.html'] && Object.keys(files).length === 1) return 'html';
  return 'node';
}

async function startStackBlitzPreview(rawFiles) {
  // Prepare files with auto-injection
  const files = prepareProjectForStackBlitz(rawFiles);

  // Show loading message
  loadingEl.style.display = 'block';
  loadingEl.innerText = '⏳ Preparing StackBlitz preview...';
  fallbackEl.style.display = 'none';

  // Clear any previous StackBlitz container
  const existingContainer = document.getElementById('stackblitz-container');
  if (existingContainer) existingContainer.remove();

  // Create container for StackBlitz
  const sbDiv = document.createElement('div');
  sbDiv.id = 'stackblitz-container';
  sbDiv.style.width = '100%';
  sbDiv.style.height = '100%';
  document.getElementById('container').appendChild(sbDiv);

  // Load StackBlitz SDK dynamically
  const script = document.createElement('script');
  script.src = 'https://unpkg.com/@stackblitz/sdk/bundles/sdk.umd.js';
  script.onload = () => {
    // Hide loading
    loadingEl.style.display = 'none';
    
    const template = detectTemplate(files);
    const project = {
      files: files,
      title: 'AI Generated App',
      description: 'Live preview',
      template: template,
    };

    try {
      window.StackBlitzSDK.embedProject(sbDiv, project, {
        view: 'preview',
        height: '100%',
        hideExplorer: true,
        hideNavigation: true,
        forceEmbedLayout: true,
        openFile: template === 'create-react-app' ? 'src/App.js' : 'index.html'
      });
    } catch (err) {
      console.error('StackBlitz embed error:', err);
      fallbackEl.style.display = 'block';
      fallbackEl.innerHTML = `⚠️ StackBlitz embed failed. 
        <a href="https://stackblitz.com/~/github.com?files=${encodeURIComponent(JSON.stringify(files))}" target="_blank">
          Open in new tab
        </a>`;
    }
  };

  script.onerror = () => {
    loadingEl.style.display = 'none';
    fallbackEl.style.display = 'block';
    fallbackEl.innerHTML = `⚠️ Failed to load StackBlitz SDK. 
      <a href="https://stackblitz.com/~/github.com?files=${encodeURIComponent(JSON.stringify(files))}" target="_blank">
        Open project in StackBlitz
      </a>`;
  };

  document.head.appendChild(script);
}

// Fetch files from API and start preview
async function fetchFiles() {
  try {
    const res = await fetch(`/api/sessions/${sessionId}/files`);
    if (!res.ok) throw new Error('Session not found');
    const files = await res.json();
    startStackBlitzPreview(files);
  } catch (err) {
    loadingEl.innerText = '❌ Failed to load project.';
    console.error(err);
  }
}

fetchFiles();
