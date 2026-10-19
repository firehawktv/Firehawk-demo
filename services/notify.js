// Fire-and-forget push notification via the self-hosted ntfy server
const NTFY_URL = (process.env.NTFY_URL || 'https://ntfy.firehawk.tv').replace(/\/+$/, '');

async function notifyPresentationView(presentation) {
  const topic = process.env.NTFY_TOPIC;
  if (!topic) return;

  const headers = {
    Title: `${presentation.client} viewed their presentation`,
    Tags: 'eyes'
  };
  // Only needed if the server has access control enabled
  if (process.env.NTFY_TOKEN) {
    headers.Authorization = `Bearer ${process.env.NTFY_TOKEN}`;
  }

  try {
    const res = await fetch(`${NTFY_URL}/${topic}`, {
      method: 'POST',
      headers,
      body: `firehawk.tv/hello/${presentation.slug} — view #${presentation.viewCount}`
    });
    if (!res.ok) {
      console.error(`ntfy notification failed: HTTP ${res.status}`);
    }
  } catch (error) {
    console.error('ntfy notification failed:', error.message);
  }
}

module.exports = { notifyPresentationView };
