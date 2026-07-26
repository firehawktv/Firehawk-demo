// Fire-and-forget push notification via ntfy.sh
async function notifyPresentationView(presentation) {
  const topic = process.env.NTFY_TOPIC;
  if (!topic) return;

  try {
    await fetch(`https://ntfy.sh/${topic}`, {
      method: 'POST',
      headers: {
        Title: `${presentation.client} viewed their presentation`,
        Tags: 'eyes'
      },
      body: `firehawk.tv/hello/${presentation.slug} — view #${presentation.viewCount}`
    });
  } catch (error) {
    console.error('ntfy notification failed:', error.message);
  }
}

module.exports = { notifyPresentationView };
