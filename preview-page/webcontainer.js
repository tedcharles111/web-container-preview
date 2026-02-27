// preview-page/webcontainer.js – Universal StackBlitz preview engine
// FIXED: CSS now renders in ALL cases – existing or new entry files

// Get session ID from URL
const sessionId = window.location.pathname.split('/').pop();

const loadingEl = document.getElementById('loading');
const fallbackEl = document.getElementById('fallback');

/**
 * Detect project type: 'vite' or 'cra' (Create React App)
 */
function detectProjectType(files) {
  // Check for Vite config files
  if (files['vite.config.ts'] || files['vite.config.js'] || files['vite.config.mjs']) {
    return 'vite';
  }
  // Check package.json for vite dependency
  if (files['package.json']) {
    try {
      const pkg = JSON.parse(files['package.json']);
      if (pkg.dependencies?.vite || pkg.devDependencies?.vite) {
        return 'vite';
      }
      if (pkg.dependencies?.react && pkg.dependencies?.['react-scripts']) {
        return 'cra';
      }
    } catch (e) {}
  }
  // Default to CRA if React and no Vite indicators
  const hasReact = Object.keys(files).some(f => f.endsWith('.jsx') || f.endsWith('.tsx'));
  if (hasReact) return 'cra';
  return 'html';
}

/**
 * Auto‑inject missing files based on project type.
 * NOW WITH GUARANTEED CSS INJECTION
 */
function prepareProjectForStackBlitz(rawFiles) {
  // Deep copy
  const files = JSON.parse(JSON.stringify(rawFiles));
  const projectType = detectProjectType(files);

  // Ensure package.json exists
  if (!files['package.json']) {
    if (projectType === 'vite') {
      const usesTs = Object.keys(files).some(f => f.endsWith('.ts') || f.endsWith('.tsx'));
      files['package.json'] = JSON.stringify({
        name: "vite-react-app",
        private: true,
        version: "0.0.0",
        type: "module",
        scripts: {
          dev: "vite",
          build: "tsc && vite build",
          preview: "vite preview"
        },
        dependencies: {
          react: "^18.2.0",
          "react-dom": "^18.2.0",
          "react-router-dom": "^6.8.0"
        },
        devDependencies: {
          ...(usesTs && {
            typescript: "^5.0.0",
            "@types/react": "^18.0.28",
            "@types/react-dom": "^18.0.11",
            "@types/react-router-dom": "^5.3.3"
          }),
          "@vitejs/plugin-react": "^4.0.0",
          vite: "^4.3.0"
        }
      }, null, 2);
    } else if (projectType === 'cra') {
      const usesTs = Object.keys(files).some(f => f.endsWith('.ts') || f.endsWith('.tsx'));
      files['package.json'] = JSON.stringify({
        name: "cra-app",
        version: "0.1.0",
        private: true,
        dependencies: {
          react: "^18.2.0",
          "react-dom": "^18.2.0",
          "react-router-dom": "^6.8.0",
          "react-scripts": "5.0.1"
        },
        ...(usesTs && {
          devDependencies: {
            typescript: "^4.9.5",
            "@types/react": "^18.0.28",
            "@types/react-dom": "^18.0.11",
            "@types/react-router-dom": "^5.3.3"
          }
        }),
        scripts: {
          start: "react-scripts start",
          build: "react-scripts build",
          test: "react-scripts test",
          eject: "react-scripts eject"
        },
        eslintConfig: { extends: ["react-app"] },
        browserslist: {
          production: [">0.2%", "not dead", "not op_mini all"],
          development: ["last 1 chrome version", "last 1 firefox version", "last 1 safari version"]
        }
      }, null, 2);
    } else {
      files['package.json'] = JSON.stringify({
        name: "html-app",
        version: "1.0.0",
        scripts: {
          start: "npx serve"
        }
      }, null, 2);
    }
  }

  // Ensure index.html exists
  if (!files['index.html'] && !files['public/index.html']) {
    if (projectType === 'vite') {
      files['index.html'] = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <link rel="icon" type="image/svg+xml" href="/vite.svg" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Vite + React App</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>`;
    } else if (projectType === 'cra') {
      files['public/index.html'] = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>React App</title>
</head>
<body>
  <div id="root"></div>
</body>
</html>`;
    } else {
      files['index.html'] = '<h1>Hello World</h1>';
    }
  }

  // ========== FIX: GUARANTEED CSS INJECTION ==========
  // Helper to add CSS import to a file if not already present
  function ensureCssImport(content, cssPath) {
    const importStatement = `import './${cssPath}';`;
    const importStatementDouble = `import "./${cssPath}";`;
    
    // Check if already imported (any variant)
    if (content.includes(importStatement) || content.includes(importStatementDouble)) {
      return content;
    }
    
    // Add at the very top (after any "use strict" or comments? Simple prepend is fine)
    return importStatement + '\n' + content;
  }

  // For Vite projects
  if (projectType === 'vite') {
    const entryFile = 'src/main.tsx';
    const cssFile = 'src/index.css';
    
    // If entry file doesn't exist, create it with CSS import
    if (!files[entryFile]) {
      let entryContent = `import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
`;
      if (files[cssFile]) {
        entryContent = `import './index.css';\n` + entryContent;
      }
      entryContent += `
ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
)`;
      files[entryFile] = entryContent;
    } 
    // If entry file EXISTS, ensure CSS import is present
    else if (files[cssFile]) {
      files[entryFile] = ensureCssImport(files[entryFile], 'index.css');
    }
  }
  
  // For CRA projects
  else if (projectType === 'cra') {
    const possibleEntries = ['src/index.tsx', 'src/index.js'];
    const cssFile = 'src/index.css';
    
    // Find which entry file exists
    let existingEntry = null;
    for (const entry of possibleEntries) {
      if (files[entry]) {
        existingEntry = entry;
        break;
      }
    }
    
    // If no entry file exists, create one
    if (!existingEntry) {
      const usesTs = Object.keys(files).some(f => f.endsWith('.ts') || f.endsWith('.tsx'));
      const entryFile = usesTs ? 'src/index.tsx' : 'src/index.js';
      let entryContent = `import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
`;
      if (files[cssFile]) {
        entryContent = `import './index.css';\n` + entryContent;
      }
      entryContent += `
const root = ReactDOM.createRoot(document.getElementById('root')${usesTs ? ' as HTMLElement' : ''});
root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);`;
      files[entryFile] = entryContent;
    }
    // If entry file EXISTS, ensure CSS import is present
    else if (files[cssFile]) {
      files[existingEntry] = ensureCssImport(files[existingEntry], 'index.css');
    }
  }

  // ========== HARD FALLBACK: Add CSS to index.html if still not imported ==========
  // This ensures CSS works even if entry file modification fails
  if (projectType !== 'html') {
    const cssFile = 'src/index.css';
    if (files[cssFile]) {
      // Check if any entry file imports CSS (rough check)
      const entryContent = projectType === 'vite' ? files['src/main.tsx'] : (files['src/index.tsx'] || files['src/index.js']);
      const hasCssImport = entryContent && (entryContent.includes('./index.css') || entryContent.includes('"./index.css"'));
      
      // If no CSS import found, add link tag to index.html as fallback
      if (!hasCssImport) {
        const htmlFile = projectType === 'vite' ? 'index.html' : 'public/index.html';
        if (files[htmlFile]) {
          // Insert <link> before </head>
          files[htmlFile] = files[htmlFile].replace('</head>', `  <link rel="stylesheet" href="/src/index.css">\n</head>`);
        }
      }
    }
  }

  return files;
}

async function startStackBlitzPreview(rawFiles) {
  const files = prepareProjectForStackBlitz(rawFiles);

  loadingEl.style.display = 'block';
  loadingEl.innerText = '⏳ Preparing StackBlitz preview...';
  fallbackEl.style.display = 'none';

  // Remove any existing StackBlitz container
  const existing = document.getElementById('stackblitz-container');
  if (existing) existing.remove();

  const sbDiv = document.createElement('div');
  sbDiv.id = 'stackblitz-container';
  sbDiv.style.width = '100%';
  sbDiv.style.height = '100%';
  document.getElementById('container').appendChild(sbDiv);

  // Load StackBlitz SDK
  const script = document.createElement('script');
  script.src = 'https://unpkg.com/@stackblitz/sdk/bundles/sdk.umd.js';
  script.onload = () => {
    loadingEl.style.display = 'none';

    const projectType = detectProjectType(files);
    let template = 'node';
    if (projectType === 'vite' || projectType === 'cra') {
      template = 'node'; // StackBlitz node template works for both
    } else if (projectType === 'html') {
      template = 'html';
    }

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
        openFile: projectType === 'vite' ? 'src/App.tsx' : (projectType === 'cra' ? 'src/App.tsx' : 'index.html')
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
