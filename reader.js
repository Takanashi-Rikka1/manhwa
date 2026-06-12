/**
 * reader.js – Webtoon chapter reader logic
 *
 * Image path convention (relative to website/ root):
 *   chapters/<ChapterName>/<filename>
 *
 * Features:
 *  - Reads ?manhwa=...&chapter=... from URL
 *  - Vertical webtoon scroll strip
 *  - Sticky nav: Prev / Chapter select / Next
 *  - Floating side buttons: Prev / Top / Next
 *  - Bottom footer navigation
 *  - Reading progress bar
 *  - Page counter (visible page / total)
 *  - Saves & restores scroll position via localStorage
 *  - Keyboard shortcuts: ← / → or A / D
 *  - Lazy image loading
 */

const LS_KEY_PROGRESS = "manhwa_progress";

// ── State ─────────────────────────────────────────────────────────────────
let allData       = null;
let currentManhwa = null;
let chapters      = [];
let currentIndex  = -1;

// ── URL helpers ───────────────────────────────────────────────────────────

function getParams() {
  const p = new URLSearchParams(window.location.search);
  return { manhwa: p.get("manhwa"), chapter: p.get("chapter") };
}

function readerUrl(manhwa, chapterName) {
  return `reader.html?manhwa=${encodeURIComponent(manhwa)}&chapter=${encodeURIComponent(chapterName)}`;
}

// Images at: chapters/<ChapterName>/<filename>  (relative to website/)
function imageSrc(chapterName, filename) {
  return `chapters/${encodeURIComponent(chapterName)}/${encodeURIComponent(filename)}`;
}

// ── LocalStorage ──────────────────────────────────────────────────────────

function saveProgress(manhwa, chapterName, scrollY) {
  try {
    localStorage.setItem(LS_KEY_PROGRESS, JSON.stringify({
      manhwa,
      chapter: chapterName,
      scroll:  scrollY,
    }));
  } catch {}
}

function getSavedScroll(manhwa, chapterName) {
  try {
    const d = JSON.parse(localStorage.getItem(LS_KEY_PROGRESS));
    if (d && d.manhwa === manhwa && d.chapter === chapterName) return d.scroll || 0;
  } catch {}
  return 0;
}

// ── Progress bar & page counter ───────────────────────────────────────────

const progressFill = document.getElementById("progress-fill");
const pageInfoEl   = document.getElementById("page-info");

function getVisiblePageIndex() {
  const container = document.getElementById("image-container");
  if (!container) return 0;
  const imgs = container.querySelectorAll(".page-img");
  const midY = window.innerHeight / 2;
  for (let i = imgs.length - 1; i >= 0; i--) {
    if (imgs[i].getBoundingClientRect().top <= midY) return i;
  }
  return 0;
}

function updateProgress() {
  const chapter = chapters[currentIndex];
  if (!chapter) return;

  const scrollTop = window.scrollY;
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const pct       = maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0;

  progressFill.style.width = `${pct.toFixed(1)}%`;

  const visIdx = getVisiblePageIndex();
  pageInfoEl.textContent = `${visIdx + 1} / ${chapter.images.length}`;

  saveProgress(currentManhwa, chapter.name, scrollTop);

  // Show float nav after scrolling down a bit
  const floatNav = document.getElementById("float-nav");
  floatNav.classList.toggle("visible", scrollTop > 200);
}

// ── Render images ─────────────────────────────────────────────────────────

function renderChapter(chapter) {
  const container = document.getElementById("image-container");
  container.innerHTML = "";

  chapter.images.forEach((filename, idx) => {
    const img     = document.createElement("img");
    img.className = "page-img";
    img.alt       = `Page ${idx + 1}`;
    img.loading   = "lazy";
    img.decoding  = "async";
    img.src       = imageSrc(chapter.name, filename);
    container.appendChild(img);
  });
}

// ── Navigation ────────────────────────────────────────────────────────────

function navigateTo(index) {
  if (index < 0 || index >= chapters.length) return;
  window.location.href = readerUrl(currentManhwa, chapters[index].name);
}

function buildSelect() {
  const sel = document.getElementById("chapter-select");
  sel.innerHTML = "";
  chapters.forEach((ch, i) => {
    const opt      = document.createElement("option");
    opt.value      = i;
    opt.textContent = ch.name;
    if (i === currentIndex) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.addEventListener("change", () => navigateTo(parseInt(sel.value, 10)));
}

function updateNavButtons() {
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < chapters.length - 1;

  document.getElementById("btn-prev").disabled    = !hasPrev;
  document.getElementById("btn-next").disabled    = !hasNext;
  document.getElementById("float-prev").disabled  = !hasPrev;
  document.getElementById("float-next").disabled  = !hasNext;
  document.getElementById("bottom-prev").disabled = !hasPrev;
  document.getElementById("bottom-next").disabled = !hasNext;
}

function wireButtons() {
  document.getElementById("btn-prev").addEventListener("click",    () => navigateTo(currentIndex - 1));
  document.getElementById("btn-next").addEventListener("click",    () => navigateTo(currentIndex + 1));
  document.getElementById("float-prev").addEventListener("click",  () => navigateTo(currentIndex - 1));
  document.getElementById("float-next").addEventListener("click",  () => navigateTo(currentIndex + 1));
  document.getElementById("float-top").addEventListener("click",   () => window.scrollTo({ top: 0, behavior: "smooth" }));
  document.getElementById("bottom-prev").addEventListener("click", () => navigateTo(currentIndex - 1));
  document.getElementById("bottom-next").addEventListener("click", () => navigateTo(currentIndex + 1));
}

function wireKeyboard() {
  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "SELECT" || e.target.tagName === "INPUT") return;
    if (e.key === "ArrowLeft"  || e.key === "a" || e.key === "A") navigateTo(currentIndex - 1);
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") navigateTo(currentIndex + 1);
  });
}

// ── Scroll handler (throttled via rAF) ───────────────────────────────────

let scrollTick = false;
window.addEventListener("scroll", () => {
  if (!scrollTick) {
    scrollTick = true;
    requestAnimationFrame(() => { updateProgress(); scrollTick = false; });
  }
}, { passive: true });

// ── Init ──────────────────────────────────────────────────────────────────

async function init() {
  const { manhwa, chapter } = getParams();

  const loadingEl = document.getElementById("loading-screen");
  const errorEl   = document.getElementById("error-screen");
  const errorMsg  = document.getElementById("error-msg");
  const container = document.getElementById("image-container");

  function showError(msg) {
    loadingEl.classList.add("hidden");
    errorEl.classList.remove("hidden");
    errorMsg.textContent = msg;
  }

  if (!manhwa || !chapter) {
    showError("Missing manhwa or chapter in URL. Go back to the home page.");
    return;
  }

  // Load chapters.json
  try {
    const res = await fetch("chapters.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    allData = await res.json();
  } catch (err) {
    showError(`Could not load chapters.json: ${err.message}. Run: node generate_index.js`);
    return;
  }

  currentManhwa = manhwa;
  chapters      = allData[manhwa] || [];

  if (!chapters.length) {
    showError(`Manhwa "${manhwa}" not found in chapters.json.`);
    return;
  }

  currentIndex = chapters.findIndex((c) => c.name === chapter);
  if (currentIndex === -1) {
    showError(`Chapter "${chapter}" not found.`);
    return;
  }

  const currentChapter = chapters[currentIndex];
  document.title = `${currentChapter.name} – ${manhwa}`;

  renderChapter(currentChapter);
  buildSelect();
  updateNavButtons();
  wireButtons();
  wireKeyboard();

  loadingEl.classList.add("hidden");
  container.classList.remove("hidden");

  // Restore saved scroll
  const savedScroll = getSavedScroll(manhwa, chapter);
  if (savedScroll > 100) {
    setTimeout(() => window.scrollTo({ top: savedScroll, behavior: "instant" }), 80);
  }

  updateProgress();
}

document.addEventListener("DOMContentLoaded", init);
