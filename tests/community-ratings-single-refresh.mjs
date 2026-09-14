import fs from "node:fs";

const source = fs.readFileSync("js/ccg-community-ratings.js", "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const dispatch = "window.dispatchEvent(new CustomEvent('ccg:rating-updated', { detail: { gameSlug: slug } }));";
const listener = "window.addEventListener('ccg:rating-updated', function () { if (!panel || panel.open) render(); });";
const duplicate = dispatch + "\n      render();";

assert(source.includes(dispatch), "successful rating saves must still emit ccg:rating-updated");
assert(source.includes(listener), "rating-updated listener must remain the refresh path");
assert(!source.includes(duplicate), "successful saves must not start a second direct render after dispatch");
assert(source.includes(".upsert({ user_id: activeUser.id, game_key: slug, rating: rating }"), "rating persistence must remain intact");
assert(source.includes("if (isSubmitting) return;"), "duplicate form submission guard must remain intact");

console.log("Ratings single-refresh guard passed.");
