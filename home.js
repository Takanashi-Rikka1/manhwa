/**
 * home.js – Library page logic
 *
 * Loads chapters.json, renders the chapter grid,
 * and handles the "Continue Reading" badge.
 *
 * Image path convention (relative to website/ root):
 *   chapters/<ChapterName>/<filename>
 */

const LS_KEY_PROGRESS = "manhwa_progress"; // { manhwa, chapter, scroll }

// ── Helpers ───────────────────────────────────────────────────────────────

function getProgress() {
  try { return JSON.parse(localStorage.getItem(LS_KEY_PROGRESS)) || null; }
  catch { return null; }
}

function chapterUrl(manhwa, chapterName) {
  return `reader.html?manhwa=${encodeURIComponent(manhwa)}&chapter=${encodeURIComponent(chapterName)}`;
}

// Images live at:  website/chapters/<ChapterName>/<filename>
function coverImagePath(chapterName, filename) {
  return `chapters/${encodeURIComponent(chapterName)}/${encodeURIComponent(filename)}`;
}

// ── Render ────────────────────────────────────────────────────────────────

function renderLibrary(data) {
  const library = document.getElementById("library");
  library.innerHTML = "";

  const manhwaNames = Object.keys(data);
  if (manhwaNames.length === 0) {
    library.innerHTML = `
      <p style="color:var(--text-muted);padding:60px 0;text-align:center">
        No manhwa found.<br>
        Add chapters to <code>chapters/</code> and run <code>node generate_index.js</code>.
      </p>`;
    return;
  }

  manhwaNames.forEach((manhwa) => {
    const chapters = data[manhwa];
    const section  = document.createElement("section");
    section.className = "manhwa-section";

    section.innerHTML = `<h2 class="manhwa-title">${manhwa}</h2>`;

    const grid = document.createElement("div");
    grid.className = "chapters-grid";

    const progress = getProgress();

    chapters.forEach((ch, idx) => {
      const card = document.createElement("a");
      card.className = "chapter-card";
      card.href      = chapterUrl(manhwa, ch.name);
      card.title     = ch.name;

      const isCurrentReading =
        progress &&
        progress.manhwa  === manhwa &&
        progress.chapter === ch.name;

      const coverSrc = ch.images.length > 0
        ? coverImagePath(ch.name, ch.images[0])
        : null;

      card.innerHTML = `
        <div class="card-cover-wrap">
          ${coverSrc
            ? `<img class="card-cover" src="${coverSrc}" alt="${ch.name}" loading="lazy" />`
            : `<div class="card-cover-placeholder">📄</div>`
          }
        </div>
        <div class="card-info">
          <div class="card-chapter-num">Ch. ${ch.num}</div>
          <div class="card-chapter-name">${ch.name}</div>
          <div class="card-pages">${ch.images.length} pages</div>
        </div>
        ${isCurrentReading ? `<div class="card-read-badge">READING</div>` : ""}
      `;

      // Extra stagger for cards beyond 10
      if (idx >= 10) {
        card.style.animationDelay = `${Math.min(idx * 20, 400)}ms`;
      }

      grid.appendChild(card);
    });

    section.appendChild(grid);
    library.appendChild(section);
  });
}

function setupContinueBadge(data) {
  const prog = getProgress();
  if (!prog) return;

  const badge = document.getElementById("continue-badge");
  const label = document.getElementById("continue-text");

  const chapters = data[prog.manhwa];
  if (!chapters) return;
  if (!chapters.some((c) => c.name === prog.chapter)) return;

  label.textContent = `Continue – ${prog.chapter}`;
  badge.classList.remove("hidden");

  badge.addEventListener("click", () => {
    window.location.href = chapterUrl(prog.manhwa, prog.chapter);
  });
}

// ── Init ──────────────────────────────────────────────────────────────────

async function init() {
  const loadingEl = document.getElementById("loading-screen");
  const errorEl   = document.getElementById("error-screen");
  const errorMsg  = document.getElementById("error-msg");
  const library   = document.getElementById("library");

  try {
    const res = await fetch("chapters.json");
    if (!res.ok) throw new Error(`HTTP ${res.status} – ${res.statusText}`);
    const data = await res.json();

    loadingEl.classList.add("hidden");
    library.classList.remove("hidden");

    renderLibrary(data);
    setupContinueBadge(data);

    const names = Object.keys(data);
    if (names.length === 1) {
      document.title = `${names[0]} – Manhwa Reader`;
    }

  } catch (err) {
    loadingEl.classList.add("hidden");
    errorEl.classList.remove("hidden");
    errorMsg.textContent = err.message.includes("fetch")
      ? "Could not load chapters.json. Run: node generate_index.js"
      : err.message;
  }
}

document.addEventListener("DOMContentLoaded", init);
