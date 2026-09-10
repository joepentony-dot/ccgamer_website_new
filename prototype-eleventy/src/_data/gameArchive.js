import games from "./games.js";

const initialFor = (title) => {
  const first = title.trim().charAt(0).toUpperCase();
  return /^[A-Z]$/.test(first) ? first : "#";
};

const groups = new Map();

for (const game of games) {
  const initial = initialFor(game.title);
  if (!groups.has(initial)) groups.set(initial, []);
  groups.get(initial).push(game);
}

const orderedInitials = [...groups.keys()].sort((a, b) => {
  if (a === "#") return 1;
  if (b === "#") return -1;
  return a.localeCompare(b, "en-GB");
});

export default {
  initials: orderedInitials,
  groups: orderedInitials.map((initial) => ({
    initial,
    id: initial === "#" ? "games-other" : `games-${initial.toLowerCase()}`,
    games: groups.get(initial)
  }))
};
