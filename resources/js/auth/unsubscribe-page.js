import { byId, setMessage } from './ui-helpers.js';
import { unsubscribeByToken } from '../community/community-api.js';

const message = byId('unsubMessage');
const button = byId('unsubBtn');

function getTokenFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('token') || params.get('t') || '';
}

function lockButton() {
  if (button) button.disabled = true;
}

function unlockButton() {
  if (button) button.disabled = false;
}

document.addEventListener('DOMContentLoaded', () => {
  const token = getTokenFromUrl();

  if (!token) {
    setMessage(message, 'Missing unsubscribe token.', 'error');
    lockButton();
    return;
  }

  button.addEventListener('click', async () => {
    setMessage(message, 'Processing unsubscribe...', 'info');
    lockButton();

    try {
      const { data, error } = await unsubscribeByToken(token);
      if (error) {
        setMessage(message, 'Unable to process unsubscribe right now.', 'error');
        unlockButton();
        return;
      }

      if (data?.success) {
        setMessage(message, 'You have been unsubscribed from CCG emails.', 'success');
      } else {
        setMessage(message, data?.message || 'Invalid or expired unsubscribe token.', 'error');
        unlockButton();
      }
    } catch (_error) {
      setMessage(message, 'Unable to process unsubscribe right now.', 'error');
      unlockButton();
    }
  });
});
