import {
  getAuthedUserOrNull,
  listComments,
  addComment,
  softDeleteComment
} from './community-api.js';

function makeRow(label, valueText) {
  const item = document.createElement('div');
  item.className = 'profile-row';

  const labelEl = document.createElement('span');
  labelEl.textContent = label;

  const valueEl = document.createElement('strong');
  valueEl.textContent = valueText;

  item.appendChild(labelEl);
  item.appendChild(valueEl);
  return item;
}

function setMessage(msgEl, text, isError = false) {
  msgEl.textContent = text;
  msgEl.classList.remove('auth-error', 'auth-success');
  if (!text) return;
  msgEl.classList.add(isError ? 'auth-error' : 'auth-success');
}

export async function mountCommentsWidget(rootEl, gameSlug) {
  if (!rootEl || !gameSlug) return;

  rootEl.innerHTML = `
    <div class="profile-list">
      <div class="profile-row"><span>Community comments</span><strong id="ccgCommentsCount">—</strong></div>
    </div>
    <div id="ccgCommentsMsg" class="auth-message" aria-live="polite"></div>
    <div id="ccgCommentsList" class="profile-list"></div>
    <form id="ccgCommentForm" class="pref-grid">
      <label for="ccgCommentText">Add comment</label>
      <textarea id="ccgCommentText" rows="3" placeholder="Write a comment…"></textarea>
      <button type="submit" class="auth-btn">Post comment</button>
    </form>
  `;

  const countEl = rootEl.querySelector('#ccgCommentsCount');
  const msgEl = rootEl.querySelector('#ccgCommentsMsg');
  const listEl = rootEl.querySelector('#ccgCommentsList');
  const formEl = rootEl.querySelector('#ccgCommentForm');
  const textEl = rootEl.querySelector('#ccgCommentText');

  const user = await getAuthedUserOrNull();
  if (!user) {
    formEl.querySelector('button').disabled = true;
    textEl.disabled = true;
    setMessage(msgEl, 'Log in to post comments.');
  }

  async function renderComments() {
    listEl.innerHTML = '';

    const { data, error } = await listComments(gameSlug, 50);
    if (error) {
      countEl.textContent = '0';
      setMessage(msgEl, 'Could not load comments right now.', true);
      return;
    }

    countEl.textContent = String(data.length);
    if (!data.length) {
      listEl.appendChild(makeRow('Status', 'No comments yet.'));
      return;
    }

    data.forEach((comment) => {
      const when = new Date(comment.created_at).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      const text = `${comment.content} (${when})`;
      listEl.appendChild(makeRow(comment.profile_id, text));

      if (user && comment.profile_id === user.id) {
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'auth-btn';
        deleteBtn.textContent = 'Delete my comment';
        deleteBtn.addEventListener('click', async () => {
          setMessage(msgEl, '');
          const { error: deleteError } = await softDeleteComment(comment.id, user.id);
          if (deleteError) {
            setMessage(msgEl, 'Could not delete comment.', true);
            return;
          }
          setMessage(msgEl, 'Comment deleted.');
          await renderComments();
        });
        listEl.appendChild(deleteBtn);
      }
    });
  }

  formEl.addEventListener('submit', async (event) => {
    event.preventDefault();
    setMessage(msgEl, '');

    if (!user) {
      setMessage(msgEl, 'Log in to post comments.', true);
      return;
    }

    const content = textEl.value.trim();
    if (!content) {
      setMessage(msgEl, 'Comment cannot be empty.', true);
      return;
    }

    const { error } = await addComment(user.id, gameSlug, content);
    if (error) {
      setMessage(msgEl, 'Could not save comment.', true);
      return;
    }

    textEl.value = '';
    setMessage(msgEl, 'Comment posted.');
    await renderComments();
  });

  await renderComments();
}
