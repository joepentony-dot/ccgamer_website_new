/* CCG Member Hub public supporter recognition opt-in */
(function () {
  'use strict';

  function setMessage(text, state) {
    const node = document.getElementById('hallOfFamePreferenceStatus');
    if (!node) return;
    node.textContent = text || '';
    node.dataset.state = state || 'info';
  }

  async function getClient() {
    if (!window.ccgSupabase || typeof window.ccgSupabase.getClient !== 'function') return null;
    return await window.ccgSupabase.getClient();
  }

  function buildControl() {
    const form = document.getElementById('prefsForm');
    if (!form || document.getElementById('hallOfFameOptIn')) return null;

    const label = document.createElement('label');
    label.className = 'member-hall-of-fame-choice';
    label.innerHTML = [
      '<input type="checkbox" id="hallOfFameOptIn" />',
      '<span>List my display name on the CCG Supporters page after CCG verifies my supporter status.</span>'
    ].join('');

    const note = document.createElement('p');
    note.className = 'member-local-note';
    note.id = 'hallOfFamePreferenceStatus';
    note.setAttribute('aria-live', 'polite');
    note.textContent = 'This is optional. Everyone is shown simply as a CCG Supporter; payment amount, membership level, email address and account ID are never displayed.';

    const preferredSystemLabel = form.querySelector('label[for="preferredSystem"]');
    if (preferredSystemLabel) {
      form.insertBefore(label, preferredSystemLabel);
      form.insertBefore(note, preferredSystemLabel);
    } else {
      form.append(label, note);
    }

    return label.querySelector('#hallOfFameOptIn');
  }

  async function init() {
    const checkbox = buildControl();
    if (!checkbox) return;

    try {
      const client = await getClient();
      if (!client) throw new Error('Account service unavailable');

      const { data: authData, error: authError } = await client.auth.getUser();
      if (authError) throw authError;
      const user = authData?.user;
      if (!user) return;

      const { data: profile, error: profileError } = await client
        .from('profiles')
        .select('hall_of_fame_opt_in, supporter_verified')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        if (['42703', 'PGRST204'].includes(String(profileError.code || ''))) {
          checkbox.disabled = true;
          setMessage('Supporter recognition will become available after the database migration is applied.', 'warning');
          return;
        }
        throw profileError;
      }

      checkbox.checked = Boolean(profile?.hall_of_fame_opt_in);
      setMessage(
        profile?.supporter_verified
          ? 'Your supporter status is verified. Your display name appears only while this option remains enabled.'
          : 'Your display name will appear only after CCG verifies that you are a supporter.',
        profile?.supporter_verified ? 'success' : 'info'
      );

      checkbox.addEventListener('change', async () => {
        checkbox.disabled = true;
        setMessage('Saving supporter recognition preference…', 'info');

        const { error: updateError } = await client
          .from('profiles')
          .update({ hall_of_fame_opt_in: checkbox.checked })
          .eq('id', user.id);

        checkbox.disabled = false;

        if (updateError) {
          console.error('[hall-of-fame-preference] save failed', updateError);
          checkbox.checked = !checkbox.checked;
          setMessage('Could not save the supporter recognition preference. Please try again.', 'error');
          return;
        }

        setMessage(
          checkbox.checked
            ? 'Public recognition requested. Your display name appears only after supporter verification.'
            : 'Public recognition disabled. Your profile will not appear on the CCG Supporters page.',
          'success'
        );
      });
    } catch (error) {
      console.error('[hall-of-fame-preference] initialisation failed', error);
      checkbox.disabled = true;
      setMessage('Supporter recognition preferences are temporarily unavailable.', 'error');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
