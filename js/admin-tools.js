/* ============================================================
   ADMIN TOOLS — GAME UPLOAD HELPER
   ------------------------------------------------------------
   • Fetches live games.json for context
   • Accepts JSON uploads and merges staged entries
   • Form for manually staging a new game
   • Download merged JSON for commit-ready use
============================================================ */

(function () {
    'use strict';

    const gameCountEl = document.querySelector('[data-admin-game-count]');
    const stagedCountEl = document.querySelector('[data-admin-staged-count]');
    const previewBody = document.getElementById('adminGamePreview');
    const statusEl = document.getElementById('adminStatus');

    const fileInput = document.getElementById('adminFileInput');
    const refreshBtn = document.getElementById('adminRefresh');
    const form = document.getElementById('adminGameForm');
    const downloadBtn = document.getElementById('adminDownload');
    const clearBtn = document.getElementById('adminClear');

    let liveGames = [];
    let staged = [];

    /* --------------------------------------------------------
       STATUS HELPERS
    -------------------------------------------------------- */
    function setStatus(message, state) {
        if (!statusEl) return;
        statusEl.textContent = message;
        statusEl.dataset.state = state || '';
    }

    function updateBadges() {
        if (gameCountEl) gameCountEl.textContent = liveGames.length + staged.length;
        if (stagedCountEl) stagedCountEl.textContent = staged.length;
    }

    /* --------------------------------------------------------
       DATA LOADING + MERGE
    -------------------------------------------------------- */
    async function fetchLiveGames() {
        try {
            const res = await fetch('../games/games.json', { cache: 'no-store' });
            if (!res.ok) throw new Error(res.statusText);
            liveGames = await res.json();
            setStatus(`Loaded ${liveGames.length} games from games.json`, 'success');
        } catch (err) {
            setStatus('Could not fetch games.json — using local cache only', 'error');
        }
        updateBadges();
        renderPreview();
    }

    function mergeStagedInto(base) {
        const merged = base.slice();
        staged.forEach(game => {
            const existingIndex = merged.findIndex(g => g.id === game.id);
            if (existingIndex >= 0) {
                merged[existingIndex] = game;
            } else {
                merged.push(game);
            }
        });
        return merged;
    }

    /* --------------------------------------------------------
       FILE HANDLING
    -------------------------------------------------------- */
    function handleFileUpload(evt) {
        const file = evt.target && evt.target.files ? evt.target.files[0] : null;
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            try {
                const parsed = JSON.parse(reader.result);
                if (Array.isArray(parsed)) {
                    staged = parsed;
                    setStatus(`Imported ${parsed.length} games from upload`, 'success');
                } else {
                    setStatus('Uploaded file did not contain an array', 'error');
                }
                updateBadges();
                renderPreview();
            } catch (err) {
                setStatus('Upload could not be parsed as JSON', 'error');
            }
        };
        reader.readAsText(file);
    }

    /* --------------------------------------------------------
       FORM HANDLING
    -------------------------------------------------------- */
    function toList(value) {
        if (!value) return [];
        return value.split(',').map(v => v.trim()).filter(Boolean);
    }

    function handleFormSubmit(event) {
        event.preventDefault();
        if (!form) return;

        const formData = new FormData(form);
        const entry = {
            id: (formData.get('id') || '').toString().trim(),
            title: (formData.get('title') || '').toString().trim(),
            sorttitle: (formData.get('title') || '').toString().trim(),
            year: formData.get('year') ? Number(formData.get('year')) : undefined,
            system: formData.get('system') || 'C64',
            genres: toList(formData.get('genres')),
            developer: (formData.get('developer') || '').toString().trim(),
            videoid: (formData.get('videoid') || '').toString().trim(),
            thumbnail: (formData.get('thumbnail') || '').toString().trim(),
            pdf: (formData.get('manual') || '').toString().trim(),
            disk: toList(formData.get('disk'))
        };

        if (!entry.id || !entry.title) {
            setStatus('ID and title are required.', 'error');
            return;
        }

        staged.unshift(entry);
        staged = staged.slice(0, 24);
        updateBadges();
        renderPreview();
        setStatus(`Staged ${entry.title}`, 'success');
        form.reset();
    }

    /* --------------------------------------------------------
       DOWNLOAD
    -------------------------------------------------------- */
    function downloadMerged() {
        const merged = mergeStagedInto(liveGames);
        const blob = new Blob([JSON.stringify(merged, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'games.json';
        link.click();
        URL.revokeObjectURL(url);
    }

    /* --------------------------------------------------------
       PREVIEW RENDER
    -------------------------------------------------------- */
    function renderPreview() {
        if (!previewBody) return;
        previewBody.innerHTML = '';

        if (!staged.length) {
            previewBody.innerHTML = '<tr><td colspan="4">Nothing staged yet.</td></tr>';
            return;
        }

        staged.slice(0, 12).forEach(game => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${game.title || 'Untitled'}</td>
                <td>${game.system || '—'}</td>
                <td>${game.year || '—'}</td>
                <td>${Array.isArray(game.genres) ? game.genres.join(', ') : '—'}</td>
            `;
            previewBody.appendChild(row);
        });
    }

    /* --------------------------------------------------------
       RESET
    -------------------------------------------------------- */
    function clearStaged() {
        staged = [];
        renderPreview();
        updateBadges();
        setStatus('Cleared staged entries.', '');
    }

    /* --------------------------------------------------------
       WIRE EVENTS
    -------------------------------------------------------- */
    document.addEventListener('DOMContentLoaded', () => {
        if (refreshBtn) refreshBtn.addEventListener('click', fetchLiveGames);
        if (fileInput) fileInput.addEventListener('change', handleFileUpload);
        if (form) form.addEventListener('submit', handleFormSubmit);
        if (downloadBtn) downloadBtn.addEventListener('click', downloadMerged);
        if (clearBtn) clearBtn.addEventListener('click', clearStaged);

        fetchLiveGames();
    });
})();
