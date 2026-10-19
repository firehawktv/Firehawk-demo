const sanitizeHtml = require('sanitize-html');

// Presentation messages are authored in the admin HTML editor and rendered
// unescaped on the public /hello/* pages, so everything is passed through here
// on the way into the database (see the `message` setter in models/Presentation.js).
const MESSAGE_OPTIONS = {
  // TODO(human): decide which tags/attributes the editor output may keep.
  // Anything not listed is stripped. An empty list is the safe default
  // (plain text only) until you choose.
  allowedTags: [],
  allowedAttributes: {},
  allowedSchemes: ['http', 'https', 'mailto']
};

function sanitizeMessage(html) {
  if (!html) return html;
  const clean = sanitizeHtml(html, MESSAGE_OPTIONS).trim();
  // Quill emits an empty paragraph when the editor is cleared
  return clean === '<p><br></p>' ? '' : clean;
}

// Messages saved before the HTML editor are plain text with newlines
function messageToHtml(message) {
  if (!message) return '';
  if (/<[a-z][\s\S]*>/i.test(message)) return message;
  const escaped = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped
    .split(/\n{2,}/)
    .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

module.exports = { sanitizeMessage, messageToHtml };
