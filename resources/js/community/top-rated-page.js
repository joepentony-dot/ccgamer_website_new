import { listTopRated } from './community-api.js';

const msg = document.getElementById('topRatedMessage');
const listEl = document.getElementById('topRatedList');

function make(tag, text, className) {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
}

function buildRow(item, index) {
  const row = make('div', '', 'profile-row');
  const name = item.game_slug.replace(/-/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
  const label = make('span', '#' + (index + 1) + ' · ' + name);
  const details = make('strong', '');
  const count = item.rating_count;
  const text = make('span', Number(item.avg_rating).toFixed(1) + '/10 · ' + count + (count === 1 ? ' vote' : ' votes'));
  const link = make('a', 'View or rate game', 'auth-btn');
  link.href = '/games/' + encodeURIComponent(item.game_slug) + '/#ccg-community-game-title';
  details.append(text, document.createTextNode(' '), link);
  row.append(label, details);
  return row;
}

async function init() {
  msg.textContent = 'Loading community ratings…';
  const {data,error} = await listTopRated(30);
  if (error) {
    msg.textContent = 'Community rankings are temporarily unavailable. Please try again later.';
    msg.classList.add('auth-error');
    return;
  }
  msg.textContent = data.length ? 'Ranked by average member score, then number of votes. Games with one vote are early results.' : 'No community ratings yet. Choose a game to leave the first score.';
  listEl.replaceChildren(...data.map(buildRow));
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
else void init();
