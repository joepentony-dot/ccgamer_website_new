const fs = require("fs");
const path = require("path");

// CONFIG — adjust if needed
const GAMES_JSON_PATH = path.join(__dirname, "games.json");
const GAMES_DIR = path.join(__dirname);

// 1. Read games.json
const gamesData = JSON.parse(fs.readFileSync(GAMES_JSON_PATH, "utf8"));

// 2. Build a set of valid filenames from slugs
const validFiles = new Set(
  gamesData.map(game => `${game.slug}.html`)
);

// 3. Read /games directory
const filesInDir = fs.readdirSync(GAMES_DIR);

// 4. Filter orphaned HTML files
const orphanFiles = filesInDir.filter(file => {
  return (
    file.endsWith(".html") &&
    file !== "index.html" &&      // keep index
    file !== "game.html" &&       // keep shared template
    !validFiles.has(file)
  );
});

// 5. Output results
console.log("🧹 SAFE-TO-DELETE GAME FILES");
console.log("================================");

if (orphanFiles.length === 0) {
  console.log("✅ No orphaned files found.");
} else {
  orphanFiles.forEach(file => {
    console.log(file);
  });
}

console.log("\nTotal:", orphanFiles.length);