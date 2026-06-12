/**
 * generate_index.js
 * -----------------
 * Run with Node.js to scan the chapters/ folder and produce chapters.json.
 *
 * Usage (from inside website/ folder):
 *   node generate_index.js
 */

const fs   = require("fs");
const path = require("path");

const WEBSITE_DIR    = __dirname;
const CHAPTERS_DIR   = path.join(WEBSITE_DIR, "chapters");
const OUTPUT_FILE    = path.join(WEBSITE_DIR, "chapters.json");
const CHAPTER_REGEX  = /^Chapter (\d+)$/i;
const IMAGE_EXTS     = new Set([".jpg", ".jpeg", ".png", ".webp"]);

// ── Scan ──────────────────────────────────────────────────────────────────

function scanChapters() {
  if (!fs.existsSync(CHAPTERS_DIR)) {
    console.error(`❌  'chapters/' folder not found at:\n   ${CHAPTERS_DIR}`);
    process.exit(1);
  }

  const entries = fs.readdirSync(CHAPTERS_DIR, { withFileTypes: true });
  const chapters = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const match = CHAPTER_REGEX.exec(entry.name);
    if (!match) {
      console.log(`  ⏭  Skipping "${entry.name}" (not a "Chapter N" folder)`);
      continue;
    }

    const chapterNum  = parseInt(match[1], 10);
    const chapterPath = path.join(CHAPTERS_DIR, entry.name);

    // Collect image files, sorted by filename
    const images = fs
      .readdirSync(chapterPath)
      .filter((f) => IMAGE_EXTS.has(path.extname(f).toLowerCase()))
      .sort();

    if (images.length === 0) {
      console.log(`  ⚠️  Skipping "${entry.name}" (no images found)`);
      continue;
    }

    chapters.push({
      num:    chapterNum,
      name:   entry.name,
      images: images,
    });

    console.log(`  ✓  ${entry.name}  (${images.length} pages)`);
  }

  // Sort by chapter number (ascending)
  chapters.sort((a, b) => a.num - b.num);
  return chapters;
}

// ── Main ──────────────────────────────────────────────────────────────────

function main() {
  console.log("📂 Scanning chapters/ ...\n");
  const chapters = scanChapters();

  // Wrap in a single manhwa object.
  // The manhwa name is taken from the parent folder name of website/.
  // You can hard-code it here if you prefer:
  const manhwaName = path.basename(path.dirname(WEBSITE_DIR));
  // Or override manually: const manhwaName = "Youth Set Meal";

  const output = { [manhwaName]: chapters };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), "utf-8");

  console.log(`\n✅  Generated chapters.json`);
  console.log(`   Manhwa : ${manhwaName}`);
  console.log(`   Chapters: ${chapters.length}`);
  console.log(`   Saved to: ${OUTPUT_FILE}`);
}

main();
