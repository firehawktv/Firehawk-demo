const sanitizeHtml = require('sanitize-html');

// Presentation messages are authored in the admin HTML editor and rendered
// unescaped on the public /hello/* pages, so everything is passed through here
// on the way into the database (see the `message` setter in models/Presentation.js).
const MESSAGE_OPTIONS = {
  // Exactly what the editor toolbar can produce, nothing more
  allowedTags: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'a'],
  allowedAttributes: { a: ['href', 'target', 'rel'] },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowProtocolRelative: false,
  transformTags: {
    // Links open in a new tab; rel stops the new page from controlling this one
    a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' })
  }
};

function sanitizeMessage(html) {
  if (!html) return html;
  const clean = sanitizeHtml(html, MESSAGE_OPTIONS).trim();
  // Quill leaves empty paragraphs (<p><br></p>) when the editor is cleared
  const hasText = sanitizeHtml(clean, { allowedTags: [] }).trim() !== '';
  return hasText ? clean : '';
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
