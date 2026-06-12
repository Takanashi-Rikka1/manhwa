/**
 * reader.js – Webtoon chapter reader (canvas-stitched)
 *
 * Instead of stacking <img> elements (which always produce a
 * sub-pixel boundary), we draw batches of images onto a single
 * <canvas> each. Multiple canvases still touch seamlessly because
 * canvas elements have no baseline / line-height artefacts.
 *
 * CANVAS_BATCH   – how many source images share one canvas.
 *                  Lower = faster first-paint; Higher = fewer canvases.
 *
 * Features:
 *  - URL params: ?manhwa=...&chapter=...
 *  - Sticky nav: ← chapter-select →
 *  - Floating buttons: Prev / Top / Next
 *  - Bottom footer navigation
 *  - Reading progress bar (scroll %)
 *  - Page counter (approx. current page / total)
 *  - Saves & restores scroll position via localStorage
 *  - Keyboard: ← / → or A / D
 */

const CANVAS_BATCH    = 6;          // images drawn per canvas element
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

function imageSrc(chapterName, filename) {
  return `chapters/${encodeURIComponent(chapterName)}/${encodeURIComponent(filename)}`;
}

// ── LocalStorage ──────────────────────────────────────────────────────────

function saveProgress(manhwa, chapterName, scrollY) {
  try {
    localStorage.setItem(LS_KEY_PROGRESS, JSON.stringify({ manhwa, chapter: chapterName, scroll: scrollY }));
  } catch {}
}

function getSavedScroll(manhwa, chapterName) {
  try {
    const d = JSON.parse(localStorage.getItem(LS_KEY_PROGRESS));
    if (d && d.manhwa === manhwa && d.chapter === chapterName) return d.scroll || 0;
  } catch {}
  return 0;
}

// ── Image loader ──────────────────────────────────────────────────────────

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload  = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load: ${src}`));
    img.src     = src;
  });
}

// ── Canvas stitching ──────────────────────────────────────────────────────

/**
 * Draw a batch of already-loaded HTMLImageElements onto one canvas.
 * All images are scaled to the width of the first image so that the
 * strip is uniform — the result is pixel-perfect with zero seams.
 */
function drawBatchToCanvas(imgs) {
  // Use the natural width of the first image as the reference width
  const refWidth = imgs[0].naturalWidth;

  const scaledHeights = imgs.map(img =>
    Math.round(img.naturalHeight * (refWidth / img.naturalWidth))
  );
  const totalHeight = scaledHeights.reduce((a, b) => a + b, 0);

  const canvas    = document.createElement("canvas");
  canvas.width    = refWidth;
  canvas.height   = totalHeight;
  canvas.className = "webtoon-canvas";

  const ctx = canvas.getContext("2d");
  let y = 0;
  imgs.forEach((img, i) => {
    ctx.drawImage(img, 0, y, refWidth, scaledHeights[i]);
    y += scaledHeights[i];
  });

  return canvas;
}

// ── Render chapter ────────────────────────────────────────────────────────

async function renderChapter(chapter) {
  const container = document.getElementById("image-container");
  const loadingEl = document.getElementById("loading-screen");

  container.innerHTML = "";
  container.classList.add("hidden");
  loadingEl.classList.remove("hidden");

  // Split image list into batches
  const batches = [];
  for (let i = 0; i < chapter.images.length; i += CANVAS_BATCH) {
    batches.push(chapter.images.slice(i, i + CANVAS_BATCH));
  }

  let firstBatch = true;

  for (const batch of batches) {
    let imgs;
    try {
      imgs = await Promise.all(batch.map(f => loadImage(imageSrc(chapter.name, f))));
    } catch (err) {
      console.warn("Batch load error:", err);
      continue;
    }

    const canvas = drawBatchToCanvas(imgs);
    container.appendChild(canvas);

    // Show content as soon as the first batch is ready
    if (firstBatch) {
      firstBatch = false;
      loadingEl.classList.add("hidden");
      container.classList.remove("hidden");
    }
  }
}

// ── Progress bar & page counter ───────────────────────────────────────────

const progressFill = document.getElementById("progress-fill");
const pageInfoEl   = document.getElementById("page-info");

function updateProgress() {
  const chapter = chapters[currentIndex];
  if (!chapter) return;

  const scrollTop = window.scrollY;
  const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const pct       = (scrollTop / maxScroll) * 100;

  progressFill.style.width = `${pct.toFixed(1)}%`;

  // Approximate page number from scroll percentage
  const approxPage = Math.min(
    chapter.images.length,
    Math.round((scrollTop / maxScroll) * chapter.images.length) + 1
  );
  pageInfoEl.textContent = `${approxPage} / ${chapter.images.length}`;

  saveProgress(currentManhwa, chapter.name, scrollTop);

  document.getElementById("float-nav").classList.toggle("visible", scrollTop > 200);
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
  ["btn-prev", "float-prev", "bottom-prev"].forEach(id => {
    document.getElementById(id).disabled = !hasPrev;
  });
  ["btn-next", "float-next", "bottom-next"].forEach(id => {
    document.getElementById(id).disabled = !hasNext;
  });
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

// ── Scroll (throttled) ────────────────────────────────────────────────────

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

  const errorEl  = document.getElementById("error-screen");
  const errorMsg = document.getElementById("error-msg");

  function showError(msg) {
    document.getElementById("loading-screen").classList.add("hidden");
    errorEl.classList.remove("hidden");
    errorMsg.textContent = msg;
  }

  if (!manhwa || !chapter) {
    showError("Missing manhwa or chapter in URL.");
    return;
  }

  try {
    const res = await fetch("chapters.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    allData = await res.json();
  } catch (err) {
    showError(`Could not load chapters.json: ${err.message}`);
    return;
  }

  currentManhwa = manhwa;
  chapters      = allData[manhwa] || [];

  if (!chapters.length) { showError(`Manhwa "${manhwa}" not found.`); return; }

  currentIndex = chapters.findIndex(c => c.name === chapter);
  if (currentIndex === -1) { showError(`Chapter "${chapter}" not found.`); return; }

  const current = chapters[currentIndex];
  document.title = `${current.name} – ${manhwa}`;

  buildSelect();
  updateNavButtons();
  wireButtons();
  wireKeyboard();

  // Render (async – shows content as batches complete)
  await renderChapter(current);

  // Restore scroll position
  const saved = getSavedScroll(manhwa, chapter);
  if (saved > 100) {
    setTimeout(() => window.scrollTo({ top: saved, behavior: "instant" }), 80);
  }

  updateProgress();
}

document.addEventListener("DOMContentLoaded", init);
