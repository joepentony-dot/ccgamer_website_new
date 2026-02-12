import { byId, setMessage } from './ui-helpers.js';

async function unsubscribeByToken(token) {
  const endpoint = 'https://sytcvxthkqyjvzbfljeb.functions.supabase.co/unsubscribe-by-token';
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token })
  });
  return res.json();
}

const message = byId('unsubMessage');
const button = byId('unsubBtn');
const token = new URLSearchParams(window.location.search).get('t') || '';

if (!token) {
  setMessage(message, 'Missing unsubscribe token.', 'error');
  button.disabled = true;
} else {
  button.addEventListener('click', async () => {
    setMessage(message, 'Processing unsubscribe...', 'info');
    button.disabled = true;
    try {
      const result = await unsubscribeByToken(token);
      if (result?.success) {
        setMessage(message, 'You have been unsubscribed from newsletter and new game notifications.', 'success');
      } else {
        setMessage(message, 'Invalid or expired unsubscribe token.', 'error');
        button.disabled = false;
      }
    } catch (_error) {
      setMessage(message, 'Unable to process unsubscribe right now.', 'error');
      button.disabled = false;
    }
  });
}
