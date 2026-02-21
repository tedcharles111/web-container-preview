const API_BASE = 'https://your-render-app.onrender.com'; // Replace after deploy

export async function createPreview(files) {
  const res = await fetch(`${API_BASE}/api/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files }),
  });
  const { sessionId, previewUrl } = await res.json();
  return {
    sessionId,
    embedUrl: `${API_BASE}${previewUrl}`, // the iframe src
  };
}
