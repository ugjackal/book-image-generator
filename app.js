const STORAGE_KEY = "author-book-builder.state.v2";
const DEFAULT_COVER_PATH = "./artifacts/cover/book_cover.jfif";
const DEFAULT_PAGE_LAYOUT = "stacked-image-top";
const DEFAULT_PAGE_FONT = "storybook-serif";
const DEFAULT_PRINT_SIZE = "landscape-10x8";
const DEFAULT_PAGE_TEXT_SCALE = 1;
const DEFAULT_PAGE_TEXT_VERTICAL = "top";
const DEFAULT_IMAGE_OFFSET = 0;
const IMAGE_OFFSET_MIN = -100;
const IMAGE_OFFSET_MAX = 100;
const IMAGE_NUDGE_STEP = 20;
const IMAGE_MIN_PAN_SCALE = 1.12;
const PRINT_SIZES = {
  "landscape-10x8": { label: "Landscape picture book 12 x 8 in", width: 3000, height: 2000, aspect: 1.5 },
  "portrait-8x10": { label: "Portrait picture book 8 x 12 in", width: 2000, height: 3000, aspect: 0.6666667 },
  "square-10x10": { label: "Square picture book 10 x 10 in", width: 3000, height: 3000, aspect: 1 },
};
const PAGE_LAYOUT_OPTIONS = [
  "stacked-image-top",
  "stacked-text-top",
  "spread-text-left",
  "spread-image-left",
  "overlay-centered",
  "overlay-top",
  "overlay-bottom",
];
const PAGE_FONT_OPTIONS = ["storybook-serif", "clean-sans", "playful-hand"];
const PAGE_TEXT_VERTICAL_OPTIONS = ["top", "center", "bottom"];
const TEXT_SCALE_MIN = 0.7;
const TEXT_SCALE_MAX = 1.5;
const TEXT_SCALE_STEP = 0.05;

const $ = (selector, root = document) => root.querySelector(selector);
const makeId = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const random = Math.random().toString(36).slice(2);
  return `id-${Date.now().toString(36)}-${random}`;
};

function parseBool(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  return ["true", "1", "yes", "on"].includes(String(value).trim().toLowerCase());
}

const refs = {
  bookSelect: $("#bookSelect"),
  newBookButton: $("#newBookButton"),
  startBookPanel: $("#startBookPanel"),
  cancelStartBookButton: $("#cancelStartBookButton"),
  startBookTitle: $("#startBookTitle"),
  startAuthorSelect: $("#startAuthorSelect"),
  startAuthorName: $("#startAuthorName"),
  startAudienceSelect: $("#startAudienceSelect"),
  startStoryManuscript: $("#startStoryManuscript"),
  startPageCount: $("#startPageCount"),
  createStartedBookButton: $("#createStartedBookButton"),
  globalStatus: $("#globalStatus"),
  globalStatusLabel: $("#globalStatusLabel"),
  globalStatusText: $("#globalStatusText"),
  publishBookButton: $("#publishBookButton"),
  addPageButton: $("#addPageButton"),
  duplicatePageButton: $("#duplicatePageButton"),
  deletePageButton: $("#deletePageButton"),
  projectTitle: $("#projectTitle"),
  authorSelect: $("#authorSelect"),
  newAuthorName: $("#newAuthorName"),
  addAuthorButton: $("#addAuthorButton"),
  printSizeSelect: $("#printSizeSelect"),
  printSizeToolbar: $("#printSizeToolbar"),
  backCoverSummary: $("#backCoverSummary"),
  audienceSelect: $("#audienceSelect"),
  suggestedPageCount: $("#suggestedPageCount"),
  storyManuscript: $("#storyManuscript"),
  buildPagesButton: $("#buildPagesButton"),
  coverInput: $("#coverInput"),
  clearCoverButton: $("#clearCoverButton"),
  coverPreview: $("#coverPreview"),
  pageList: $("#pageList"),
  pageForm: $("#pageForm"),
  activePageLabel: $("#activePageLabel"),
  sceneDescription: $("#sceneDescription"),
  pageCharacters: $("#pageCharacters"),
  pageSetting: $("#pageSetting"),
  pageMood: $("#pageMood"),
  pageLighting: $("#pageLighting"),
  textSpace: $("#textSpace"),
  composition: $("#composition"),
  pageTextScale: $("#pageTextScale"),
  pageTextScaleValue: $("#pageTextScaleValue"),
  pageTextVerticalToolbar: $("#pageTextVerticalToolbar"),
  decreasePageTextScale: $("#decreasePageTextScale"),
  increasePageTextScale: $("#increasePageTextScale"),
  characterNames: $("#characterNames"),
  characterList: $("#characterList"),
  characterEditor: $("#characterEditor"),
  characterEditorThumbnail: $("#characterEditorThumbnail"),
  characterEditorTitle: $("#characterEditorTitle"),
  characterEditorSummary: $("#characterEditorSummary"),
  characterEditorStatus: $("#characterEditorStatus"),
  characterEditorName: $("#characterEditorName"),
  characterEditorRole: $("#characterEditorRole"),
  characterEditorIsGroupReference: $("#characterEditorIsGroupReference"),
  characterEditorGroupMembers: $("#characterEditorGroupMembers"),
  characterEditorVisualTraits: $("#characterEditorVisualTraits"),
  characterEditorBirthState: $("#characterEditorBirthState"),
  characterEditorDistinctiveAnatomy: $("#characterEditorDistinctiveAnatomy"),
  characterEditorExpressionPose: $("#characterEditorExpressionPose"),
  characterEditorStyleNotes: $("#characterEditorStyleNotes"),
  characterEditorPersonality: $("#characterEditorPersonality"),
  characterEditorGroupIdentity: $("#characterEditorGroupIdentity"),
  characterEditorFamilyNotes: $("#characterEditorFamilyNotes"),
  newCharacterButton: $("#newCharacterButton"),
  seedCharacterButton: $("#seedCharacterButton"),
  saveCharacterButton: $("#saveCharacterButton"),
  generateCharacterThumbnailButton: $("#generateCharacterThumbnailButton"),
  analyzeCharacterSeedButton: $("#analyzeCharacterSeedButton"),
  useCharacterOnPageButton: $("#useCharacterOnPageButton"),
  characterSeedInput: $("#characterSeedInput"),
  fullBookPreview: $("#fullBookPreview"),
  pageEditorCard: $("#pageEditorCard"),
  statusLabel: $("#statusLabel"),
  statusText: $("#statusText"),
  promptOutput: $("#promptOutput"),
  copyPromptButton: $("#copyPromptButton"),
};

const defaultPage = (number = 1, layout = DEFAULT_PAGE_LAYOUT) => ({
  id: makeId(),
  number,
  text: "",
  sceneDescription: "",
  characters: "",
  setting: "",
  mood: "",
  lighting: "Warm natural children's-book daylight.",
  textSpace: "Leave quiet open space where the page text can sit clearly.",
  composition: "Landscape picture-book page composition with readable character silhouettes.",
  layout: normalizeLayout(layout),
  fontPreset: DEFAULT_PAGE_FONT,
  fontScale: DEFAULT_PAGE_TEXT_SCALE,
  textVerticalAlign: DEFAULT_PAGE_TEXT_VERTICAL,
  printSize: DEFAULT_PRINT_SIZE,
  imageScale: 1,
  imageOffsetX: DEFAULT_IMAGE_OFFSET,
  imageOffsetY: DEFAULT_IMAGE_OFFSET,
  imageSource: "",
  imageDataUrl: "",
  imageUrl: "",
  fileName: "",
  prompt: "",
  notes: "",
});

const defaultBook = (title = "Untitled Book") => {
  const firstPage = defaultPage(1);
  return {
    id: makeId(),
    projectTitle: title,
    authorName: "",
    coverFileName: "",
    coverPreviewUrl: "",
    coverReferenceUrl: "",
    backCoverSummary: "",
    audience: "3-8",
    suggestedPageCount: "",
    manuscript: "",
    printSize: DEFAULT_PRINT_SIZE,
    pages: [firstPage],
    activePageId: firstPage.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

const exampleBook = () => {
  const book = defaultBook("Tiny Paws, Big Hooves");
  book.pages = [
    {
      ...defaultPage(1),
      text: "Layla and Ginger both spotted the same bone at the very same time.",
      sceneDescription: "Layla and Ginger playfully tug at opposite ends of a bone in the dirt yard.",
      characters: "Layla, Ginger",
      setting: "A rustic yard with packed dirt and dry grass around the edges.",
      mood: "Playful, mischievous, energetic, and safe for young readers.",
      textSpace: "Leave a quiet open area at the top left for the story text.",
    },
  ];
  book.activePageId = book.pages[0].id;
  return book;
};

const defaultState = () => {
  const book = exampleBook();
  return {
    books: [book],
    activeBookId: book.id,
    authors: ["Kim Stewart", "Tony Stewart"],
    characters: [],
    status: "Ready",
    statusDetail: "Add page text, describe the scene, and generate the illustration.",
    isGenerating: false,
    generatingPageId: "",
  };
};

const legacyBookFromState = (parsed) => ({
  id: makeId(),
  projectTitle: parsed.projectTitle || "Untitled Book",
  authorName: parsed.authorName || "",
  coverFileName: parsed.coverFileName || "",
  coverPreviewUrl: parsed.coverPreviewUrl || "",
  coverReferenceUrl: parsed.coverReferenceUrl || "",
  backCoverSummary: parsed.backCoverSummary || "",
  audience: parsed.audience || "3-8",
  suggestedPageCount: parsed.suggestedPageCount || "",
  manuscript: parsed.manuscript || "",
  printSize: normalizePrintSize(parsed.printSize),
  pages: normalizePages(parsed.pages),
  activePageId: parsed.activePageId || "",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

let state = defaultState();
let stateSaveTimer = null;
let activeCharacterName = "";
let characterDraft = null;
let characterEditorOpen = false;
let characterThumbnailGenerating = false;
let characterSeedAnalyzing = false;
let bookPublishing = false;

function normalizeLoadedState(parsed) {
  const fallback = defaultState();
  if (!Array.isArray(parsed.books)) {
    const book = legacyBookFromState(parsed);
    if (!book.activePageId || !book.pages.some((page) => page.id === book.activePageId)) {
      book.activePageId = book.pages[0]?.id || "";
    }
    return {
      books: [book],
      activeBookId: book.id,
      authors: normalizeAuthors(parsed.authors, book.authorName),
      characters: [],
      status: "Ready",
      statusDetail: fallback.statusDetail,
      isGenerating: false,
      generatingPageId: "",
    };
  }
  const books = parsed.books.length ? parsed.books.map(normalizeBook) : fallback.books;
  return {
    ...fallback,
    ...parsed,
    books,
    activeBookId: books.some((book) => book.id === parsed.activeBookId) ? parsed.activeBookId : books[0].id,
    authors: normalizeAuthors(parsed.authors, books.map((book) => book.authorName)),
    characters: [],
    status: "Ready",
    statusDetail: fallback.statusDetail,
    isGenerating: false,
    generatingPageId: "",
  };
}

function loadStateFromLocalStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return normalizeLoadedState(parsed);
  } catch {
    return defaultState();
  }
}

async function loadStateFromServer() {
  try {
    const response = await fetch("/api/state", { headers: { Accept: "application/json" } });
    if (!response.ok) return null;
    const parsed = await response.json();
    if (!parsed || typeof parsed !== "object") return null;
    return normalizeLoadedState(parsed);
  } catch {
    return null;
  }
}

function serializeState() {
  const { characters, status, statusDetail, isGenerating, generatingPageId, previewMode, ...serializable } = state;
  return serializable;
}

function queueServerStateSave(immediate = false) {
  if (stateSaveTimer) {
    clearTimeout(stateSaveTimer);
    stateSaveTimer = null;
  }
  const pushState = async () => {
    try {
      await fetch("/api/state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(serializeState()),
      });
    } catch {
      // Server sync is best-effort; local cache still keeps the current browser usable.
    }
  };
  if (immediate) {
    void pushState();
    return;
  }
  stateSaveTimer = setTimeout(() => {
    void pushState();
  }, 200);
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeState()));
  } catch {
    // Local storage can fail in private browsing or file contexts.
  }
  queueServerStateSave();
}

function ensureBookPresence() {
  if (!Array.isArray(state.books) || !state.books.length) {
    const book = exampleBook();
    state.books = [book];
    state.activeBookId = book.id;
    return;
  }
  state.books = state.books.map((book) => {
    const normalized = normalizeBook(book);
    if (!normalized.pages.length) {
      normalized.pages = [defaultPage(1)];
      normalized.activePageId = normalized.pages[0].id;
    }
    return normalized;
  });
  if (!state.books.some((book) => book.id === state.activeBookId)) {
    state.activeBookId = state.books[0].id;
  }
}

function normalizeBook(book) {
  const normalized = {
    ...defaultBook(book.projectTitle || "Untitled Book"),
    ...book,
    printSize: normalizePrintSize(book.printSize),
    pages: normalizePages(book.pages),
  };
  if (!normalized.activePageId || !normalized.pages.some((page) => page.id === normalized.activePageId)) {
    normalized.activePageId = normalized.pages[0]?.id || "";
  }
  normalized.pages = normalized.pages.map((page) => ({
    ...page,
    imageSource: page.imageSource || (page.imageUrl ? "generated" : ""),
    imageScale: normalizeImageScale(page.imageScale),
    imageOffsetX: normalizeImageOffset(page.imageOffsetX),
    imageOffsetY: normalizeImageOffset(page.imageOffsetY),
    fontPreset: normalizeFontPreset(page.fontPreset),
    fontScale: normalizeTextScale(page.fontScale),
    textVerticalAlign: normalizeTextVerticalAlign(page.textVerticalAlign),
    imageDataUrl: page.imageDataUrl || "",
    imageUrl: page.imageDataUrl || page.imageUrl || "",
  }));
  return normalized;
}

function normalizePages(pages) {
  const fallback = [defaultPage(1)];
  const source = Array.isArray(pages) && pages.length ? pages : fallback;
  return source.map((page, index) => ({
    ...defaultPage(index + 1),
    ...page,
    number: index + 1,
    layout: normalizeLayout(page?.layout),
    fontPreset: normalizeFontPreset(page?.fontPreset),
    fontScale: normalizeTextScale(page?.fontScale),
    textVerticalAlign: normalizeTextVerticalAlign(page?.textVerticalAlign),
    imageOffsetX: normalizeImageOffset(page?.imageOffsetX),
    imageOffsetY: normalizeImageOffset(page?.imageOffsetY),
  }));
}

function normalizePrintSize(printSize) {
  const value = String(printSize || "").trim();
  return Object.prototype.hasOwnProperty.call(PRINT_SIZES, value) ? value : DEFAULT_PRINT_SIZE;
}

function normalizeImageScale(scale) {
  const value = Number(scale);
  if (!Number.isFinite(value)) return 1;
  return Math.min(2, Math.max(0.75, value));
}

function normalizeImageOffset(offset) {
  const value = Number(offset);
  if (!Number.isFinite(value)) return DEFAULT_IMAGE_OFFSET;
  return Math.min(IMAGE_OFFSET_MAX, Math.max(IMAGE_OFFSET_MIN, value));
}

function imageOffsetLabel(offset) {
  const value = Math.round(normalizeImageOffset(offset));
  return `${value > 0 ? "+" : ""}${value}%`;
}

function printSizeLabel(printSize) {
  return PRINT_SIZES[normalizePrintSize(printSize)].label;
}

function printSizeAspect(printSize) {
  return PRINT_SIZES[normalizePrintSize(printSize)].aspect;
}

function printSizeDimensions(printSize) {
  const option = PRINT_SIZES[normalizePrintSize(printSize)];
  return { width: option.width, height: option.height };
}

function normalizeLayout(layout) {
  const value = String(layout || "").trim();
  return PAGE_LAYOUT_OPTIONS.includes(value) ? value : DEFAULT_PAGE_LAYOUT;
}

function normalizeFontPreset(fontPreset) {
  const value = String(fontPreset || "").trim();
  return PAGE_FONT_OPTIONS.includes(value) ? value : DEFAULT_PAGE_FONT;
}

function normalizeTextVerticalAlign(value) {
  const normalized = String(value || "").trim();
  return PAGE_TEXT_VERTICAL_OPTIONS.includes(normalized) ? normalized : DEFAULT_PAGE_TEXT_VERTICAL;
}

function textVerticalJustify(value) {
  switch (normalizeTextVerticalAlign(value)) {
    case "center":
      return "center";
    case "bottom":
      return "flex-end";
    case "top":
    default:
      return "flex-start";
  }
}

function normalizeTextScale(scale) {
  const value = Number(scale);
  if (!Number.isFinite(value)) return DEFAULT_PAGE_TEXT_SCALE;
  return Math.min(TEXT_SCALE_MAX, Math.max(TEXT_SCALE_MIN, value));
}

function clampTextScale(scale) {
  return Math.min(TEXT_SCALE_MAX, Math.max(TEXT_SCALE_MIN, Number(scale) || DEFAULT_PAGE_TEXT_SCALE));
}

function defaultLayoutForAudience(audience) {
  if (audience === "9-12") return "spread-text-left";
  return "stacked-image-top";
}

function fontStack(fontPreset) {
  switch (normalizeFontPreset(fontPreset)) {
    case "clean-sans":
      return 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
    case "playful-hand":
      return '"Segoe Print", "Bradley Hand", "Comic Sans MS", cursive';
    case "storybook-serif":
    default:
      return 'ui-serif, Georgia, "Times New Roman", serif';
  }
}

function recommendedTextScale(book, page) {
  let scale = 1;
  switch (book?.audience) {
    case "3-5":
      scale *= 1.18;
      break;
    case "3-8":
      scale *= 1.08;
      break;
    case "6-8":
      scale *= 1;
      break;
    case "9-12":
      scale *= 0.92;
      break;
    default:
      scale *= 1;
      break;
  }

  switch (normalizePrintSize(book?.printSize)) {
    case "portrait-8x10":
      scale *= 1.03;
      break;
    case "square-10x10":
      scale *= 1;
      break;
    case "landscape-10x8":
    default:
      scale *= 0.96;
      break;
  }

  switch (layoutMode(page?.layout)) {
    case "spread":
      scale *= 0.94;
      break;
    case "overlay":
      scale *= 0.9;
      break;
    default:
      scale *= 1;
      break;
  }

  const textLength = String(page?.text || "").trim().length;
  if (textLength > 450) scale *= 0.88;
  else if (textLength > 250) scale *= 0.94;
  else if (textLength < 60) scale *= 1.05;

  return Math.min(1.4, Math.max(0.72, scale));
}

function effectiveTextScale(book, page) {
  const scale = recommendedTextScale(book, page) * normalizeTextScale(page?.fontScale);
  return Math.min(1.65, Math.max(0.65, scale));
}

function fontScaleLabel(scale) {
  return `${Math.round(normalizeTextScale(scale) * 100)}%`;
}

function fontLabel(fontPreset) {
  switch (normalizeFontPreset(fontPreset)) {
    case "clean-sans":
      return "Clean sans";
    case "playful-hand":
      return "Playful hand";
    case "storybook-serif":
    default:
      return "Storybook serif";
  }
}

function layoutLabel(layout) {
  switch (normalizeLayout(layout)) {
    case "stacked-text-top":
      return "Text top, image bottom";
    case "spread-text-left":
      return "Text left, image right";
    case "spread-image-left":
      return "Image left, text right";
    case "overlay-centered":
      return "Background image, centered text";
    case "overlay-top":
      return "Background image, top text";
    case "overlay-bottom":
      return "Background image, bottom text";
    case "stacked-image-top":
    default:
      return "Image top, text bottom";
  }
}

function layoutMode(layout) {
  const value = normalizeLayout(layout);
  if (value.startsWith("spread-")) return "spread";
  if (value.startsWith("overlay-")) return "overlay";
  return "stacked";
}

function layoutOverlayPosition(layout) {
  const value = normalizeLayout(layout);
  if (value === "overlay-top") return "top";
  if (value === "overlay-bottom") return "bottom";
  return "center";
}

function layoutIcon(layout) {
  switch (normalizeLayout(layout)) {
    case "stacked-text-top":
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect class="layout-icon-text" x="4" y="4" width="16" height="6" rx="1.5"></rect>
          <rect class="layout-icon-image" x="4" y="13" width="16" height="7" rx="1.5"></rect>
        </svg>
      `;
    case "spread-text-left":
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect class="layout-icon-text" x="3" y="4" width="7" height="16" rx="1.5"></rect>
          <rect class="layout-icon-image" x="13" y="4" width="8" height="16" rx="1.5"></rect>
        </svg>
      `;
    case "spread-image-left":
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect class="layout-icon-image" x="3" y="4" width="8" height="16" rx="1.5"></rect>
          <rect class="layout-icon-text" x="13" y="4" width="8" height="16" rx="1.5"></rect>
        </svg>
      `;
    case "overlay-centered":
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect class="layout-icon-image" x="3" y="3" width="18" height="18" rx="2"></rect>
          <rect class="layout-icon-text" x="8" y="8" width="8" height="8" rx="1.5"></rect>
        </svg>
      `;
    case "overlay-top":
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect class="layout-icon-image" x="3" y="3" width="18" height="18" rx="2"></rect>
          <rect class="layout-icon-text" x="6" y="5" width="12" height="4" rx="1.25"></rect>
        </svg>
      `;
    case "overlay-bottom":
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect class="layout-icon-image" x="3" y="3" width="18" height="18" rx="2"></rect>
          <rect class="layout-icon-text" x="6" y="15" width="12" height="4" rx="1.25"></rect>
        </svg>
      `;
    case "stacked-image-top":
    default:
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect class="layout-icon-image" x="4" y="4" width="16" height="7" rx="1.5"></rect>
          <rect class="layout-icon-text" x="4" y="14" width="16" height="6" rx="1.5"></rect>
        </svg>
      `;
  }
}

function printSizeIcon(printSize) {
  const size = normalizePrintSize(printSize);
  switch (size) {
    case "portrait-8x10":
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect class="print-icon-frame" x="7" y="3" width="10" height="18" rx="2"></rect>
          <rect class="print-icon-hint" x="10" y="5" width="4" height="14" rx="1"></rect>
        </svg>
      `;
    case "square-10x10":
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect class="print-icon-frame" x="4" y="4" width="16" height="16" rx="2"></rect>
          <rect class="print-icon-hint" x="8" y="8" width="8" height="8" rx="1.5"></rect>
        </svg>
      `;
    case "landscape-10x8":
    default:
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect class="print-icon-frame" x="3" y="7" width="18" height="10" rx="2"></rect>
          <rect class="print-icon-hint" x="5" y="9" width="14" height="6" rx="1.2"></rect>
        </svg>
      `;
  }
}

function renderLayoutToolbar(activeLayout, pageId = "") {
  const pageAttr = pageId ? ` data-page-id="${escapeHtml(pageId)}"` : "";
  const options = [
    "stacked-image-top",
    "stacked-text-top",
    "spread-text-left",
    "spread-image-left",
    "overlay-centered",
    "overlay-top",
    "overlay-bottom",
  ];
  return `
    <div class="layout-toolbar" role="toolbar" aria-label="Page layout"${pageAttr}>
      ${options
        .map((layout) => {
          const selected = normalizeLayout(activeLayout) === layout ? " is-active" : "";
          return `
            <button
              class="layout-button${selected}"
              type="button"
              data-layout-choice="${layout}"
              ${pageId ? `data-page-id="${escapeHtml(pageId)}"` : ""}
              aria-pressed="${normalizeLayout(activeLayout) === layout ? "true" : "false"}"
              title="${escapeHtml(layoutLabel(layout))}"
            >
              ${layoutIcon(layout)}
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderPrintSizeToolbar(activePrintSize) {
  const options = ["landscape-10x8", "portrait-8x10", "square-10x10"];
  return `
    <div class="print-size-toolbar" role="toolbar" aria-label="Print size">
      ${options
        .map((size) => {
          const selected = normalizePrintSize(activePrintSize) === size ? " is-active" : "";
          return `
            <button
              class="print-size-button${selected}"
              type="button"
              data-print-size-choice="${size}"
              aria-pressed="${normalizePrintSize(activePrintSize) === size ? "true" : "false"}"
              title="${escapeHtml(printSizeLabel(size))}"
            >
              ${printSizeIcon(size)}
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderPreviewLayoutToolbar(activeLayout, pageId = "") {
  const pageAttr = pageId ? ` data-page-id="${escapeHtml(pageId)}"` : "";
  return `
    <div class="page-preview-layout-toolbar" role="toolbar" aria-label="Page layout"${pageAttr}>
      ${PAGE_LAYOUT_OPTIONS.map((layout) => {
        const selected = normalizeLayout(activeLayout) === layout ? " is-active" : "";
        return `
          <button
            class="layout-button${selected}"
            type="button"
            data-layout-choice="${layout}"
            ${pageId ? `data-page-id="${escapeHtml(pageId)}"` : ""}
            aria-pressed="${normalizeLayout(activeLayout) === layout ? "true" : "false"}"
            title="${escapeHtml(layoutLabel(layout))}"
            aria-label="${escapeHtml(layoutLabel(layout))}"
          >
            ${layoutIcon(layout)}
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function renderPreviewFontToolbar(activeFontPreset, pageId = "") {
  const pageAttr = pageId ? ` data-page-id="${escapeHtml(pageId)}"` : "";
  return `
    <div class="page-preview-font-toolbar" role="toolbar" aria-label="Font style"${pageAttr}>
      ${PAGE_FONT_OPTIONS.map((fontPreset) => {
        const selected = normalizeFontPreset(activeFontPreset) === fontPreset ? " is-active" : "";
        return `
          <button
            class="font-button${selected}"
            type="button"
            data-font-choice="${fontPreset}"
            ${pageId ? `data-page-id="${escapeHtml(pageId)}"` : ""}
            aria-pressed="${normalizeFontPreset(activeFontPreset) === fontPreset ? "true" : "false"}"
            title="${escapeHtml(fontLabel(fontPreset))}"
            aria-label="${escapeHtml(fontLabel(fontPreset))}"
          >
            <span class="font-button-sample font-sample-${fontPreset}">Aa</span>
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function renderPreviewTextVerticalToolbarCompact(activeValue, pageId = "") {
  const pageAttr = pageId ? ` data-page-id="${escapeHtml(pageId)}"` : "";
  return `
    <div class="page-preview-text-vertical-toolbar page-preview-text-vertical-compact" role="toolbar" aria-label="Text position"${pageAttr}>
      ${PAGE_TEXT_VERTICAL_OPTIONS.map((choice) => {
        const selected = normalizeTextVerticalAlign(activeValue) === choice ? " is-active" : "";
        const label = choice === "top" ? "Top" : choice === "center" ? "Middle" : "Bottom";
        return `
          <button
            class="text-vertical-button${selected}"
            type="button"
            data-text-vertical-choice="${choice}"
            ${pageId ? `data-page-id="${escapeHtml(pageId)}"` : ""}
            aria-pressed="${normalizeTextVerticalAlign(activeValue) === choice ? "true" : "false"}"
            title="${escapeHtml(`${label} align`)}"
            aria-label="${escapeHtml(`${label} align`)}"
          >
            ${textVerticalIcon(choice)}
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function renderPreviewTextScaleToolbarCompact(activeScale, pageId = "") {
  const pageAttr = pageId ? ` data-page-id="${escapeHtml(pageId)}"` : "";
  return `
    <div class="page-preview-text-scale-toolbar page-preview-text-scale-compact" role="toolbar" aria-label="Text size controls"${pageAttr}>
      <button class="ghost-button icon-button" type="button" data-text-scale-step="-${TEXT_SCALE_STEP}" ${pageId ? `data-page-id="${escapeHtml(pageId)}"` : ""} aria-label="Decrease text size" title="Decrease text size">
        <svg class="icon-updown" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12h14" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2"/>
        </svg>
      </button>
      <button class="ghost-button icon-button" type="button" data-text-scale-step="${TEXT_SCALE_STEP}" ${pageId ? `data-page-id="${escapeHtml(pageId)}"` : ""} aria-label="Increase text size" title="Increase text size">
        <svg class="icon-updown" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12h14M12 5v14" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2"/>
        </svg>
      </button>
    </div>
  `;
}

function renderFontToolbar(activeFontPreset, pageId = "") {
  const pageAttr = pageId ? ` data-page-id="${escapeHtml(pageId)}"` : "";
  return `
    <div class="font-toolbar" role="toolbar" aria-label="Font style"${pageAttr}>
      ${PAGE_FONT_OPTIONS.map((fontPreset) => {
        const selected = normalizeFontPreset(activeFontPreset) === fontPreset ? " is-active" : "";
        return `
          <button
            class="font-button${selected}"
            type="button"
            data-font-choice="${fontPreset}"
            ${pageId ? `data-page-id="${escapeHtml(pageId)}"` : ""}
            aria-pressed="${normalizeFontPreset(activeFontPreset) === fontPreset ? "true" : "false"}"
            title="${escapeHtml(fontLabel(fontPreset))}"
            aria-label="${escapeHtml(fontLabel(fontPreset))}"
          >
            <span class="font-button-sample font-sample-${fontPreset}">Aa</span>
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function renderTextVerticalToolbar(activeValue, pageId = "") {
  const pageAttr = pageId ? ` data-page-id="${escapeHtml(pageId)}"` : "";
  return `
    <div class="text-vertical-toolbar" role="toolbar" aria-label="Text position"${pageAttr}>
      <span class="toolbar-label">Text position</span>
      ${PAGE_TEXT_VERTICAL_OPTIONS.map((choice) => {
        const selected = normalizeTextVerticalAlign(activeValue) === choice ? " is-active" : "";
        const label =
          choice === "top" ? "Top" : choice === "center" ? "Middle" : "Bottom";
        return `
          <button
            class="text-vertical-button${selected}"
            type="button"
            data-text-vertical-choice="${choice}"
            ${pageId ? `data-page-id="${escapeHtml(pageId)}"` : ""}
            aria-pressed="${normalizeTextVerticalAlign(activeValue) === choice ? "true" : "false"}"
            title="${escapeHtml(`${label} align`)}"
            aria-label="${escapeHtml(`${label} align`)}"
          >
            ${textVerticalIcon(choice)}
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function textVerticalIcon(choice) {
  switch (choice) {
    case "center":
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect class="text-vertical-frame" x="5" y="4" width="14" height="16" rx="2"></rect>
          <rect class="text-vertical-block" x="7" y="10" width="10" height="4" rx="1.2"></rect>
        </svg>
      `;
    case "bottom":
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect class="text-vertical-frame" x="5" y="4" width="14" height="16" rx="2"></rect>
          <rect class="text-vertical-block" x="7" y="14" width="10" height="4" rx="1.2"></rect>
        </svg>
      `;
    case "top":
    default:
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect class="text-vertical-frame" x="5" y="4" width="14" height="16" rx="2"></rect>
          <rect class="text-vertical-block" x="7" y="6" width="10" height="4" rx="1.2"></rect>
        </svg>
      `;
  }
}

function renderTextScaleToolbar(activeScale, pageId = "") {
  const scaleInputId = pageId ? `pageTextScale-${pageId}` : "pageTextScale";
  const scaleValueId = pageId ? `pageTextScaleValue-${pageId}` : "pageTextScaleValue";
  const pageAttr = pageId ? ` data-page-id="${escapeHtml(pageId)}"` : "";
  return `
    <div class="text-scale-toolbar" aria-label="Text size controls"${pageAttr}>
      <span class="toolbar-label">Text size</span>
      <button class="ghost-button icon-button" type="button" data-text-scale-step="-${TEXT_SCALE_STEP}" ${pageId ? `data-page-id="${escapeHtml(pageId)}"` : ""} aria-label="Decrease text size" title="Decrease text size">
        <svg class="icon-updown" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12h14" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2"/>
        </svg>
      </button>
      <input
        id="${scaleInputId}"
        type="range"
        min="${TEXT_SCALE_MIN}"
        max="${TEXT_SCALE_MAX}"
        step="0.01"
        value="${normalizeTextScale(activeScale)}"
        aria-label="Text size"
      />
      <button class="ghost-button icon-button" type="button" data-text-scale-step="${TEXT_SCALE_STEP}" ${pageId ? `data-page-id="${escapeHtml(pageId)}"` : ""} aria-label="Increase text size" title="Increase text size">
        <svg class="icon-updown" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12h14M12 5v14" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2"/>
        </svg>
      </button>
      <output id="${scaleValueId}">${fontScaleLabel(activeScale)}</output>
    </div>
  `;
}

function normalizeAuthors(authors, extra = []) {
  const extras = Array.isArray(extra) ? extra : [extra];
  return [...(Array.isArray(authors) ? authors : []), ...extras]
    .map((name) => String(name || "").trim())
    .filter(Boolean)
    .filter((name, index, list) => list.findIndex((item) => item.toLowerCase() === name.toLowerCase()) === index);
}

function activeBook() {
  return state.books.find((book) => book.id === state.activeBookId) || state.books[0];
}

function activePage() {
  const book = activeBook();
  return book.pages.find((page) => page.id === book.activePageId) || book.pages[0];
}

function setStatus(label, detail) {
  state.status = label;
  state.statusDetail = detail;
  if (refs.statusLabel) refs.statusLabel.textContent = label;
  if (refs.statusText) refs.statusText.textContent = detail;
  if (refs.globalStatusLabel) refs.globalStatusLabel.textContent = label;
  if (refs.globalStatusText) refs.globalStatusText.textContent = detail;
  if (refs.globalStatus) refs.globalStatus.classList.toggle("is-busy", Boolean(state.isGenerating));
}

function setGenerating(isGenerating, pageId = "") {
  state.isGenerating = isGenerating;
  state.generatingPageId = isGenerating ? pageId : "";
  if (refs.globalStatus) refs.globalStatus.classList.toggle("is-busy", isGenerating);
  renderBookPreview();
}

function setThumbnailButtonLoading(
  isLoading,
  button = refs.generateCharacterThumbnailButton,
  loadingLabel = "Generating thumbnail...",
  idleLabel = "",
) {
  if (!button) return;
  if (!idleLabel && !button.dataset.defaultLabel) {
    button.dataset.defaultLabel = button.textContent || "Generate thumbnail";
  }
  if (isLoading) {
    button.disabled = true;
    button.classList.add("is-loading");
    button.textContent = loadingLabel;
    button.setAttribute("aria-busy", "true");
  } else {
    button.classList.remove("is-loading");
    button.disabled = !characterDraft?.name?.trim();
    button.textContent = idleLabel || button.dataset.defaultLabel || "Generate thumbnail";
    button.removeAttribute("aria-busy");
  }
}

function revokeBlobUrl(url) {
  if (typeof url === "string" && url.startsWith("blob:")) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // Ignore revocation failures.
    }
  }
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Unable to load the uploaded image."));
    };
    image.src = url;
  });
}

async function fitImageFileToPrintDataUrl(file, printSize) {
  const image = await loadImageFromFile(file);
  const { width, height } = printSizeDimensions(printSize);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Unable to prepare the uploaded image for print.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = Math.round(image.naturalWidth * scale);
  const drawHeight = Math.round(image.naturalHeight * scale);
  const x = Math.round((width - drawWidth) / 2);
  const y = Math.round((height - drawHeight) / 2);
  ctx.drawImage(image, x, y, drawWidth, drawHeight);
  return {
    dataUrl: canvas.toDataURL("image/jpeg", 0.96),
    sourceWidth: image.naturalWidth,
    sourceHeight: image.naturalHeight,
  };
}

function render() {
  ensureBookPresence();
  const book = activeBook();
  const page = activePage();
  refs.projectTitle.value = book.projectTitle;
  refs.authorSelect.value = book.authorName || "";
  refs.newAuthorName.value = "";
  refs.printSizeSelect.value = normalizePrintSize(book.printSize);
  refs.printSizeToolbar.innerHTML = renderPrintSizeToolbar(book.printSize);
  refs.backCoverSummary.value = book.backCoverSummary || "";
  refs.audienceSelect.value = book.audience || "3-8";
  refs.suggestedPageCount.value = book.suggestedPageCount || "";
  refs.storyManuscript.value = book.manuscript || "";
  refs.sceneDescription.value = page.sceneDescription;
  refs.pageCharacters.value = page.characters;
  refs.pageSetting.value = page.setting;
  refs.pageMood.value = page.mood;
  refs.pageLighting.value = page.lighting;
  refs.textSpace.value = page.textSpace;
  refs.composition.value = page.composition;
  if (refs.activePageLabel) refs.activePageLabel.textContent = `Page ${page.number}`;
  refs.promptOutput.value = page.prompt || "";
  refs.copyPromptButton.disabled = !page.prompt;
  refs.deletePageButton.disabled = book.pages.length <= 1;

  refs.coverPreview.innerHTML = book.coverPreviewUrl
    ? `<img src="${book.coverPreviewUrl}" alt="Style reference cover" />`
    : `<div class="empty-state">No cover loaded</div>`;

  renderBookSelect();
  renderAuthorSelect();
  renderPageList();
  renderCharacters();
  renderFullBookPreview();
  renderStatsOnly();
}

function renderStatsOnly() {
  if (refs.statusLabel) refs.statusLabel.textContent = state.status;
  if (refs.statusText) refs.statusText.textContent = state.statusDetail;
  if (refs.globalStatusLabel) refs.globalStatusLabel.textContent = state.status;
  if (refs.globalStatusText) refs.globalStatusText.textContent = state.statusDetail;
  if (refs.globalStatus) refs.globalStatus.classList.toggle("is-busy", Boolean(state.isGenerating));
}

function renderBookSelect() {
  refs.bookSelect.innerHTML = state.books
    .map((book) => {
      const selected = book.id === state.activeBookId ? " selected" : "";
      const title = book.projectTitle.trim() || "Untitled Book";
      return `<option value="${book.id}"${selected}>${escapeHtml(title)}</option>`;
    })
    .join("");
}

function renderAuthorSelect() {
  const book = activeBook();
  const options = [
    `<option value="">No author selected</option>`,
    ...state.authors.map((author) => {
      const selected = author === book.authorName ? " selected" : "";
      return `<option value="${escapeHtml(author)}"${selected}>${escapeHtml(author)}</option>`;
    }),
  ];
  refs.authorSelect.innerHTML = options.join("");
  refs.authorSelect.value = book.authorName || "";
  refs.startAuthorSelect.innerHTML = options.join("");
}

function renderPageList() {
  const book = activeBook();
  refs.pageList.innerHTML = book.pages
    .map((page) => {
      const selected = page.id === book.activePageId ? " is-active" : "";
      const title = page.text.trim() || page.sceneDescription.trim() || "Untitled page";
      const imageStatus = page.imageUrl ? (page.imageSource === "uploaded" ? "Uploaded" : "Illustrated") : "Draft";
      const layout = layoutLabel(page.layout);
      return `
        <button class="page-list-item${selected}" type="button" data-page-id="${page.id}">
          <span class="page-number">${page.number}</span>
          <span class="page-list-copy">
            <strong>${escapeHtml(title)}</strong>
            <small>${imageStatus} - ${escapeHtml(layout)}</small>
          </span>
        </button>
      `;
    })
    .join("");
}

function normalizeCharacterRecord(character = {}) {
  return {
    name: String(character.name || "").trim(),
    role: String(character.role || character.characterRole || "").trim(),
    isGroupReference: parseBool(character.isGroupReference ?? character.is_group_reference),
    groupMembers: Array.isArray(character.groupMembers)
      ? character.groupMembers.map((item) => String(item).trim()).filter(Boolean)
      : String(character.groupMembers || character.group_members || "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
    visualTraits: String(character.visualTraits || character.visual_traits || "").trim(),
    birthState: String(character.birthState || character.birth_state || "").trim(),
    distinctiveAnatomy: String(character.distinctiveAnatomy || character.distinctive_anatomy || "").trim(),
    expressionPose: String(character.expressionPose || character.expression_pose || "").trim(),
    styleNotes: String(character.styleNotes || character.style_notes || "").trim(),
    personality: String(character.personality || "").trim(),
    groupIdentity: String(character.groupIdentity || character.group_identity || "").trim(),
    familyNotes: String(character.familyNotes || character.family_notes || "").trim(),
    thumbnailUrl: String(character.thumbnailUrl || character.thumbnail_url || "").trim(),
    seedImageUrl: String(character.seedImageUrl || character.seed_image_url || "").trim(),
    file: String(character.file || "").trim(),
  };
}

function blankCharacterDraft() {
  return {
    originalName: "",
    name: "",
    role: "",
    isGroupReference: false,
    groupMembers: [],
    visualTraits: "",
    birthState: "",
    distinctiveAnatomy: "",
    expressionPose: "",
    styleNotes: "",
    personality: "",
    groupIdentity: "",
    familyNotes: "",
    thumbnailUrl: "",
    seedImageUrl: "",
    seedImageDataUrl: "",
    seedImageFileName: "",
    isNew: false,
  };
}

function activeCharacter() {
  return state.characters.find((character) => character.name === activeCharacterName) || null;
}

function characterBadge(characterName) {
  const trimmed = String(characterName || "").trim();
  if (!trimmed) return "C";
  const words = trimmed.split(/\s+/).filter(Boolean);
  const initials = words.length > 1 ? `${words[0][0] || ""}${words[1][0] || ""}` : trimmed.slice(0, 2);
  return initials.toUpperCase();
}

function setCharacterDraftFromRecord(character, { isNew = false } = {}) {
  const normalized = normalizeCharacterRecord(character);
  characterEditorOpen = true;
  characterDraft = {
    originalName: normalized.name,
    name: normalized.name,
    role: normalized.role,
    isGroupReference: normalized.isGroupReference,
    groupMembers: normalized.groupMembers,
    visualTraits: normalized.visualTraits,
    birthState: normalized.birthState,
    distinctiveAnatomy: normalized.distinctiveAnatomy,
    expressionPose: normalized.expressionPose,
    styleNotes: normalized.styleNotes,
    personality: normalized.personality,
    groupIdentity: normalized.groupIdentity,
    familyNotes: normalized.familyNotes,
    thumbnailUrl: normalized.thumbnailUrl,
    seedImageUrl: normalized.seedImageUrl,
    seedImageDataUrl: "",
    seedImageFileName: "",
    isNew,
  };
  activeCharacterName = normalized.name;
  renderCharacterEditor();
}

function setNewCharacterDraft() {
  characterEditorOpen = true;
  characterDraft = {
    ...blankCharacterDraft(),
    isNew: true,
  };
  activeCharacterName = "";
  renderCharacterEditor();
}

function renderCharacters() {
  const characters = state.characters.map(normalizeCharacterRecord);
  state.characters = characters;
  refs.characterNames.innerHTML = characters
    .map((character) => `<option value="${escapeHtml(character.name)}"></option>`)
    .join("");

  refs.characterList.innerHTML = characters.length
    ? characters
        .map(
          (character) => `
            <button class="character-chip${character.name === activeCharacterName ? " is-active" : ""}" type="button" data-character-name="${escapeHtml(character.name)}">
              <span class="character-chip-thumb">
                ${
                  character.thumbnailUrl || character.seedImageUrl
                    ? `<img src="${escapeHtml(character.thumbnailUrl || character.seedImageUrl)}" alt="${escapeHtml(character.name)} thumbnail" loading="lazy" />`
                  : `<span class="character-chip-initials" aria-hidden="true">${escapeHtml(characterBadge(character.name))}</span>`
                }
              </span>
              <span class="character-chip-copy">
                <strong>${escapeHtml(character.name)}</strong>
                <span>${escapeHtml(character.role || "Character")}</span>
              </span>
            </button>
          `
        )
        .join("")
    : `<div class="empty-state compact">No character profiles found yet.</div>`;

  renderCharacterEditor();
}

function renderCharacterEditor() {
  if (!refs.characterEditor) return;
  const draft = characterDraft || blankCharacterDraft();
  const selected = draft.name ? activeCharacter() : null;
  const previewUrl = draft.seedImageDataUrl || draft.thumbnailUrl || draft.seedImageUrl || selected?.thumbnailUrl || selected?.seedImageUrl || "";
  const hasOpenDraft = Boolean(characterEditorOpen && (draft.isNew || draft.originalName || activeCharacterName.trim()));
  const shouldShow = Boolean(characterEditorOpen && hasOpenDraft);
  refs.characterEditor.hidden = !shouldShow;
  refs.characterEditor.style.display = shouldShow ? "" : "none";
  if (!shouldShow) return;
  refs.characterEditorName.value = draft.name || "";
  refs.characterEditorRole.value = draft.role || "";
  if (refs.characterEditorIsGroupReference) refs.characterEditorIsGroupReference.checked = Boolean(draft.isGroupReference);
  if (refs.characterEditorGroupMembers) refs.characterEditorGroupMembers.value = Array.isArray(draft.groupMembers) ? draft.groupMembers.join(", ") : "";
  refs.characterEditorVisualTraits.value = draft.visualTraits || "";
  if (refs.characterEditorBirthState) refs.characterEditorBirthState.value = draft.birthState || "";
  refs.characterEditorDistinctiveAnatomy.value = draft.distinctiveAnatomy || "";
  refs.characterEditorExpressionPose.value = draft.expressionPose || "";
  refs.characterEditorStyleNotes.value = draft.styleNotes || "";
  if (refs.characterEditorPersonality) refs.characterEditorPersonality.value = draft.personality || "";
  if (refs.characterEditorGroupIdentity) refs.characterEditorGroupIdentity.value = draft.groupIdentity || "";
  if (refs.characterEditorFamilyNotes) refs.characterEditorFamilyNotes.value = draft.familyNotes || "";
  syncCharacterEditorChrome(previewUrl, draft);
}

function syncCharacterEditorChrome(previewUrl = "", draft = characterDraft || blankCharacterDraft()) {
  if (!refs.characterEditor) return;
  const hasOpenDraft = Boolean(characterEditorOpen && (draft.isNew || draft.originalName || activeCharacterName.trim()));
  const shouldShow = Boolean(characterEditorOpen && hasOpenDraft);
  refs.characterEditor.hidden = !shouldShow;
  refs.characterEditor.style.display = shouldShow ? "" : "none";
  if (!shouldShow) return;
  refs.characterEditor.classList.toggle("is-empty", !draft.name);
  refs.characterEditorTitle.textContent = draft.name || "Select a character";
  refs.characterEditorSummary.textContent = draft.name
    ? draft.isGroupReference
      ? `Group reference profile${Array.isArray(draft.groupMembers) && draft.groupMembers.length ? ` for ${draft.groupMembers.join(", ")}` : ""}. Tweak the canonical group profile, then save it for the whole studio.`
      : "Tweak the cast profile, then save it for the whole studio."
    : "Choose an extra cast member to tweak their visual notes, or start a new one from a seed image.";
  refs.characterEditorStatus.textContent = draft.seedImageFileName
    ? `Seed image loaded: ${draft.seedImageFileName}`
    : draft.seedImageUrl
    ? "Seed image already attached to this profile."
    : draft.thumbnailUrl
    ? "Thumbnail already generated for this character."
    : draft.isGroupReference && Array.isArray(draft.groupMembers) && draft.groupMembers.length
    ? `Group reference for: ${draft.groupMembers.join(", ")}.`
    : "No thumbnail yet.";

  refs.characterEditorThumbnail.innerHTML = characterThumbnailGenerating
    ? `<div class="character-editor-placeholder is-loading" aria-live="polite" aria-busy="true"><span></span><strong>Generating</strong></div>`
    : previewUrl
    ? `<img src="${escapeHtml(previewUrl)}" alt="${escapeHtml(draft.name || "Character")} preview" loading="lazy" />`
    : `<div class="character-editor-placeholder"><span>${escapeHtml(characterBadge(draft.name || "Character"))}</span></div>`;

  if (refs.useCharacterOnPageButton) {
    refs.useCharacterOnPageButton.disabled = !draft.name;
  }
  if (refs.saveCharacterButton) {
    refs.saveCharacterButton.textContent = draft.isNew ? "Create profile" : "Save profile";
    refs.saveCharacterButton.disabled = !draft.name.trim();
  }
  if (refs.generateCharacterThumbnailButton) {
    refs.generateCharacterThumbnailButton.disabled = !draft.name.trim();
    setThumbnailButtonLoading(characterThumbnailGenerating, refs.generateCharacterThumbnailButton, "Generating character...", "Generate Character");
  }
  if (refs.analyzeCharacterSeedButton) {
    const hasSeed = Boolean(draft.seedImageDataUrl || draft.seedImageUrl);
    refs.analyzeCharacterSeedButton.disabled = Boolean(characterSeedAnalyzing);
    const idleLabel = hasSeed ? "Analyze seed" : "Upload seed image";
    setThumbnailButtonLoading(characterSeedAnalyzing, refs.analyzeCharacterSeedButton, hasSeed ? "Analyzing seed..." : "Uploading seed...", idleLabel);
  }
}

function renderFullBookPreview() {
  const book = activeBook();
  refs.fullBookPreview.className = "book-page-preview full-book-preview";
  refs.fullBookPreview.style.setProperty("--page-aspect", String(printSizeAspect(book.printSize)));
  refs.fullBookPreview.innerHTML = renderFullBookPreviewMarkup(book);
}

function renderBookPreview() {
  renderFullBookPreview();
}

function renderFullBookPreviewMarkup(book) {
  const activeGeneratingPageId = state.isGenerating ? state.generatingPageId || activeBook().activePageId : "";
  return `
    <div class="full-book-preview-head">
      <div class="full-book-preview-head-copy">
        <strong>${escapeHtml(book.projectTitle || "Untitled Book")}</strong>
        <span>${book.pages.length} pages</span>
      </div>
      <div class="full-book-preview-head-actions">
        <button class="primary-button${bookPublishing ? " is-loading" : ""}" type="button" id="publishBookButton" data-publish-book="true" aria-busy="${bookPublishing ? "true" : "false"}" ${book.pages.length && !bookPublishing ? "" : "disabled"}>${bookPublishing ? "Publishing..." : "Publish"}</button>
      </div>
    </div>
    <div class="full-book-preview-list">
      ${book.pages
        .map((page) => {
          const layout = normalizeLayout(page.layout);
          const text = page.text.trim();
          const pageStyle = `--page-text-font:${fontStack(page.fontPreset)};--page-text-scale:${effectiveTextScale(book, page)};--page-image-scale:${normalizeImageScale(page.imageScale)};--page-image-offset-x:${normalizeImageOffset(page.imageOffsetX)};--page-image-offset-y:${normalizeImageOffset(page.imageOffsetY)};--page-text-justify:${textVerticalJustify(page.textVerticalAlign)};`;
          const isGeneratingPage = activeGeneratingPageId === page.id;
          const imageScale = normalizeImageScale(page.imageScale);
          const imageOffsetX = normalizeImageOffset(page.imageOffsetX);
          const imageOffsetY = normalizeImageOffset(page.imageOffsetY);
          const imageStyle = `left:calc(50% + ${imageOffsetX}px);top:calc(50% + ${imageOffsetY}px);width:${(imageScale * 100).toFixed(2)}%;height:${(imageScale * 100).toFixed(2)}%;transform:translate(-50%,-50%);object-fit:cover;object-position:center center;`;
          const textFontStyle = `font-family:${fontStack(page.fontPreset).replace(/"/g, "&quot;")};`;
          const textScaleStyle = `font-size:${effectiveTextScale(book, page).toFixed(3)}rem;`;
          const textJustifyStyle = `justify-content:${textVerticalJustify(page.textVerticalAlign)};`;
          const overlayTextStyle = `font-family:${fontStack(page.fontPreset).replace(/"/g, "&quot;")};font-size:${(effectiveTextScale(book, page) * 0.95).toFixed(3)}rem;`;
          const textEditorAttrs = `contenteditable="true" spellcheck="true" role="textbox" aria-label="Edit page text" data-inline-page-text-editor="true" data-page-id="${escapeHtml(page.id)}" data-placeholder="Click to edit page text"`;
          const imageMarkup = `
            <div class="page-art${isGeneratingPage ? " is-generating" : ""}">
              ${
                isGeneratingPage
                  ? `
                    <div class="loading-indicator" aria-hidden="true"></div>
                    <div class="page-art-empty-state"><span class="page-art-empty-state-label">Generating page ${page.number} illustration...</span></div>
                  `
                  : page.imageUrl
                  ? `<div class="page-art-frame"><img src="${escapeHtml(page.imageUrl)}" alt="Preview for page ${page.number}" style="${imageStyle}" /></div>`
                  : `<div class="page-art-empty-state"><span class="page-art-empty-state-label">No image yet</span></div>`
              }
            </div>`;
          const textMarkup = `<div class="mini-text-preview inline-page-text-editor${text ? "" : " is-empty"}" ${textEditorAttrs} style="${textFontStyle}${textScaleStyle}${textJustifyStyle}">${text ? escapeHtml(text) : ""}</div>`;
          const previewToolbar = `
            <div class="page-preview-toolbar" data-page-id="${escapeHtml(page.id)}">
              <div class="page-preview-layout-row">
                ${renderPreviewLayoutToolbar(layout, page.id)}
              </div>
              <div class="page-preview-font-row">
                ${renderPreviewFontToolbar(page.fontPreset, page.id)}
                ${renderPreviewTextVerticalToolbarCompact(page.textVerticalAlign, page.id)}
                ${renderPreviewTextScaleToolbarCompact(page.fontScale, page.id)}
              </div>
              <div class="page-preview-image-actions">
                <button
                  class="ghost-button icon-button"
                  type="button"
                  data-generate-page-id="${escapeHtml(page.id)}"
                  aria-label="Generate illustration"
                  title="Generate illustration"
                  ${isGeneratingPage ? "disabled" : ""}
                >
                  <svg class="icon-updown" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 3l1.8 4.6L18 9.5l-4.2 1.4L12 15l-1.8-4.1L6 9.5l4.2-1.9L12 3zM5 16l1 2.2L8 19l-2 .8L5 22l-1-2.2L2 19l2-.8L5 16zm14-2l1.3 3 3 .7-3 .8-1.2 3-1.2-3-3-.8 3-.7 1.1-3z" fill="currentColor"/>
                  </svg>
                </button>
                <a
                  class="ghost-button icon-button${page.imageUrl ? "" : " is-disabled"}"
                  href="${page.imageUrl || "#"}"
                  download="${escapeHtml(page.fileName || `page-${page.number}-scene.png`)}"
                  ${page.imageUrl ? "" : 'aria-disabled="true" tabindex="-1"'}
                  aria-label="Download page image"
                  title="Download page image"
                >
                  <svg class="icon-updown" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 3v11M8 10l4 4 4-4M5 19h14" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                  </svg>
                </a>
                <label class="ghost-button icon-button file-button" aria-label="Upload image to this page" title="Upload image to this page">
                  <svg class="icon-updown" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 21V11m0 0l4 4m-4-4-4 4M5 5h14" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2"/>
                  </svg>
                  <input type="file" accept="image/*" data-page-upload-input="true" data-page-id="${escapeHtml(page.id)}" />
                </label>
                <button
                  class="ghost-button icon-button"
                  type="button"
                  data-clear-page-image-id="${escapeHtml(page.id)}"
                  aria-label="Clear page image"
                  title="Clear page image"
                >
                  <svg class="icon-updown" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 7h16M9 7V5h6v2m-7 0 1 12h6l1-12M10 11v5M14 11v5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2"/>
                  </svg>
                </button>
              </div>
            </div>
          `;
          const body =
            layoutMode(layout) === "spread"
              ? `<div class="mini-spread">
                  <div class="mini-spread-side">${layout === "spread-text-left" ? textMarkup : imageMarkup}</div>
                  <div class="mini-spread-spine"></div>
                  <div class="mini-spread-side">${layout === "spread-text-left" ? imageMarkup : textMarkup}</div>
                </div>`
              : layoutMode(layout) === "overlay"
              ? `<div class="mini-overlay overlay-${layoutOverlayPosition(layout)}">
                  ${imageMarkup}
                  <div class="mini-overlay-text inline-page-text-editor${text ? "" : " is-empty"}" ${textEditorAttrs} style="${overlayTextStyle}">${text ? escapeHtml(text) : ""}</div>
                </div>`
              : layout === "stacked-text-top"
              ? `<div class="mini-stack">${textMarkup}${imageMarkup}</div>`
              : `<div class="mini-stack">${imageMarkup}${textMarkup}</div>`;
          const imageControls = `
            <div class="page-image-controls" data-page-id="${escapeHtml(page.id)}">
              <div class="page-image-controls-row page-image-adjust-row">
                <div class="page-image-nudge-group">
                  <button class="ghost-button icon-button page-image-nudge-button" type="button" data-image-nudge="up" aria-label="Move image up" title="Move image up"${page.imageUrl ? "" : " disabled"}>&#8593;</button>
                  <button class="ghost-button icon-button page-image-nudge-button" type="button" data-image-nudge="left" aria-label="Move image left" title="Move image left"${page.imageUrl ? "" : " disabled"}>&#8592;</button>
                  <button class="ghost-button icon-button page-image-nudge-button" type="button" data-image-reset-position="true" aria-label="Center image" title="Center image"${page.imageUrl ? "" : " disabled"}>&#10226;</button>
                  <button class="ghost-button icon-button page-image-nudge-button" type="button" data-image-nudge="right" aria-label="Move image right" title="Move image right"${page.imageUrl ? "" : " disabled"}>&#8594;</button>
                  <button class="ghost-button icon-button page-image-nudge-button" type="button" data-image-nudge="down" aria-label="Move image down" title="Move image down"${page.imageUrl ? "" : " disabled"}>&#8595;</button>
                </div>
                <div class="page-image-scale-group">
                  <button class="ghost-button icon-button" type="button" data-image-scale-step="-0.05" aria-label="Scale image smaller" title="Scale image smaller"${page.imageUrl ? "" : " disabled"}>&#8722;</button>
                  <button class="ghost-button icon-button" type="button" data-image-scale-step="0.05" aria-label="Scale image larger" title="Scale image larger"${page.imageUrl ? "" : " disabled"}>+</button>
                </div>
              </div>
            </div>
          `;
          return `
            <article class="full-book-page" data-page-id="${escapeHtml(page.id)}" style="${pageStyle}">
              <header class="full-book-page-head">
                <strong>Page ${page.number}</strong>
                <button class="ghost-button small-button" type="button" data-edit-page-id="${page.id}">Edit</button>
              </header>
              ${previewToolbar}
              ${body}
              ${imageControls}
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function updateActivePage(values) {
  updatePageById(activePage().id, values);
}

function updatePageById(pageId, values) {
  const book = activeBook();
  const page = book.pages.find((item) => item.id === pageId);
  if (!page) return;
  Object.assign(page, values);
  book.activePageId = pageId;
  touchActiveBook();
  saveState();
  renderPageList();
  renderBookPreview();
}

async function setPageImageFromFile(file, pageId = activePage().id) {
  const book = activeBook();
  const page = book.pages.find((item) => item.id === pageId) || activePage();
  setStatus("Preparing page image", "Resizing the uploaded image for this page.");
  const imageDataUrl = await resizeFileToDataUrl(file, 2400, 0.92);
  const previewUrl = imageDataUrl;
  revokeBlobUrl(page.imageUrl);
  Object.assign(page, {
    imageUrl: previewUrl,
    imageDataUrl,
    fileName: file.name,
    imageSource: "uploaded",
    imageScale: 1,
    imageOffsetX: DEFAULT_IMAGE_OFFSET,
    imageOffsetY: DEFAULT_IMAGE_OFFSET,
    prompt: "",
    notes: `Uploaded image: ${file.name}`,
  });
  touchActiveBook();
  saveState();
  setStatus("Image attached", `The uploaded image is now saved to page ${page.number}.`);
  render();
}

function clearPageImage(pageId = activePage().id) {
  const book = activeBook();
  const page = book.pages.find((item) => item.id === pageId) || activePage();
  revokeBlobUrl(page.imageUrl);
  Object.assign(page, {
    imageUrl: "",
    imageDataUrl: "",
    fileName: "",
    imageSource: "",
    notes: "",
  });
  touchActiveBook();
  saveState();
  setStatus("Page image cleared", "This page is back to its draft state.");
  render();
}

function addPage() {
  const book = activeBook();
  const page = defaultPage(book.pages.length + 1, defaultLayoutForAudience(book.audience));
  book.pages.push(page);
  book.activePageId = page.id;
  syncManuscriptFromPages(book);
  touchActiveBook();
  saveState();
  setStatus("Page added", `Page ${page.number} is ready for text and scene direction.`);
  render();
}

function duplicatePage() {
  const book = activeBook();
  const source = activePage();
  const page = {
    ...defaultPage(book.pages.length + 1, source.layout),
    text: source.text,
    sceneDescription: source.sceneDescription,
    characters: source.characters,
    setting: source.setting,
    mood: source.mood,
    lighting: source.lighting,
    textSpace: source.textSpace,
    composition: source.composition,
    layout: source.layout,
    fontPreset: source.fontPreset,
    fontScale: source.fontScale,
    textVerticalAlign: source.textVerticalAlign,
    imageScale: source.imageScale,
    imageOffsetX: source.imageOffsetX,
    imageOffsetY: source.imageOffsetY,
  };
  book.pages.push(page);
  book.activePageId = page.id;
  syncManuscriptFromPages(book);
  touchActiveBook();
  saveState();
  setStatus("Page duplicated", `Page ${page.number} copied the current page direction.`);
  render();
}

function deletePage() {
  const book = activeBook();
  if (book.pages.length <= 1) return;
  const index = book.pages.findIndex((page) => page.id === book.activePageId);
  book.pages.splice(index, 1);
  book.pages.forEach((page, pageIndex) => {
    page.number = pageIndex + 1;
  });
  book.activePageId = book.pages[Math.max(0, index - 1)].id;
  syncManuscriptFromPages(book);
  touchActiveBook();
  saveState();
  setStatus("Page deleted", "The manuscript page list has been renumbered.");
  render();
}

async function generatePageForId(pageId) {
  const book = activeBook();
  const page = book.pages.find((item) => item.id === pageId) || activePage();
  if (!page.sceneDescription.trim() && !page.text.trim()) {
    setStatus("Missing page", "Add page text or illustration direction before generating.");
    return;
  }

  const approved = window.confirm("We will be charged 0.01 cent to generate this illustration. Continue?");
  if (!approved) {
    setStatus("Generation canceled", "No image was generated.");
    return;
  }

  setGenerating(true, page.id);
  setStatus("Generating", `Creating illustration for page ${page.number}.`);

  const payload = {
    project_title: book.projectTitle,
    page_number: String(page.number),
    page_text: page.text,
    scene_description: page.sceneDescription || page.text,
    setting: page.setting,
    mood: page.mood,
    lighting: page.lighting,
    text_space: page.textSpace,
    composition: page.composition,
    layout: page.layout,
    print_size: book.printSize,
    characters: mergeCharacterNames(inferCharacters(page.text), page.characters),
    character_profiles: mergeCharacterNames(inferCharacters(page.text), page.characters)
      .map((name) => state.characters.find((character) => character.name === name))
      .filter(Boolean)
      .map((character) => ({
        name: character.name,
        role: character.role,
        visualTraits: character.visualTraits,
        birthState: character.birthState,
        distinctiveAnatomy: character.distinctiveAnatomy,
        expressionPose: character.expressionPose,
        styleNotes: character.styleNotes,
        personality: character.personality,
        groupIdentity: character.groupIdentity,
        familyNotes: character.familyNotes,
      })),
    cover_data_url: book.coverReferenceUrl || book.coverPreviewUrl || "",
  };

  try {
    const response = await fetch("/api/generate-page-scene", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "Page scene generation failed.");
    }

    Object.assign(page, {
      imageUrl: result.file_url,
      fileName: result.file_name,
      imageSource: "generated",
      imageScale: 1,
      imageOffsetX: DEFAULT_IMAGE_OFFSET,
      imageOffsetY: DEFAULT_IMAGE_OFFSET,
      prompt: result.prompt,
      notes: [
        `Model: ${result.model}`,
        `Output: ${result.file_name}`,
        `Layout: ${layoutLabel(page.layout)}`,
        result.response_id ? `Response id: ${result.response_id}` : null,
        result.cover_used ? "Cover reference: included" : "Cover reference: not provided",
      ]
        .filter(Boolean)
        .join("\n"),
    });
    touchActiveBook();
    saveState();
    setStatus("Illustration ready", `Page ${page.number} has a generated image.`);
    render();
  } catch (error) {
    setStatus("Error", error.message || "Something went wrong while generating the page.");
  } finally {
    setGenerating(false);
  }
}

async function publishBook() {
  const book = activeBook();
  if (!book.pages.length) {
    setStatus("Nothing to publish", "Add at least one page before creating a PDF.");
    return;
  }

  saveState();
  bookPublishing = true;
  setStatus("Publishing book", "Building a PDF from the current pages and layouts.");
  renderBookPreview();

  try {
    const response = await fetch("/api/publish-book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ book }),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "Book publish failed.");
    }
    const downloadLink = document.createElement("a");
    downloadLink.href = result.file_url;
    downloadLink.download = result.file_name || "book.pdf";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    setStatus("Book published", `PDF ready for download: ${result.file_name || "book.pdf"}`);
  } catch (error) {
    setStatus("Publish failed", error.message || "Could not create the PDF.");
  } finally {
    bookPublishing = false;
    renderBookPreview();
  }
}

async function generateActivePage() {
  return generatePageForId(activePage().id);
}

async function handleCoverFile(file) {
  const book = activeBook();
  setStatus("Preparing cover", "Resizing the cover locally for style reference.");
  const previewUrl = await resizeFileToDataUrl(file, 900, 0.9);
  const referenceUrl = await resizeFileToDataUrl(file, 1400, 0.9);
  book.coverFileName = file.name;
  book.coverPreviewUrl = previewUrl;
  book.coverReferenceUrl = referenceUrl;
  touchActiveBook();
  saveState();
  setStatus("Cover loaded", "The cover will guide new page illustrations.");
  render();
}

async function loadDefaultCover() {
  const book = activeBook();
  if (book.coverPreviewUrl) return;
  try {
    const response = await fetch(DEFAULT_COVER_PATH);
    if (!response.ok) return;
    const blob = await response.blob();
    const coverFile = new File([blob], "book_cover.jfif", {
      type: blob.type || "image/jpeg",
    });
    await handleCoverFile(coverFile);
  } catch {
    setStatus("No cover yet", "Upload a cover when you want a visual style reference.");
  }
}

async function loadCharacters() {
  try {
    const response = await fetch("/api/characters");
    if (!response.ok) throw new Error("Unable to load character profiles.");
    const result = await response.json();
    state.characters = Array.isArray(result.characters) ? result.characters.map(normalizeCharacterRecord) : [];
    renderCharacters();
  } catch (error) {
    state.characters = [];
    setStatus("Characters unavailable", error.message || "Could not load character profiles.");
    renderCharacters();
  }
}

function resizeFileToDataUrl(file, maxSide = 1024, quality = 0.92) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      try {
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Unable to process the cover image.");
        ctx.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      } catch (error) {
        reject(error);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Unable to load the cover image."));
    };
    image.src = url;
  });
}

function splitNames(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function mergeCharacterNames(...sources) {
  const seen = new Set();
  const merged = [];
  for (const source of sources) {
    const names = Array.isArray(source) ? source : splitNames(String(source || ""));
    for (const name of names) {
      const normalized = name.trim();
      const key = normalized.toLowerCase();
      if (!normalized || seen.has(key)) continue;
      seen.add(key);
      merged.push(normalized);
    }
  }
  return merged;
}

async function saveCharacterDraft({ generateThumbnail = false } = {}) {
  const draft = characterDraft || blankCharacterDraft();
  const name = draft.name.trim();
  if (!name) {
    setStatus("Missing character name", "Give the character a name before saving.");
    return;
  }

  const book = activeBook();
  const payload = {
    original_name: draft.originalName || "",
    name,
    role: draft.role || "",
    isGroupReference: Boolean(draft.isGroupReference),
    groupMembers: Array.isArray(draft.groupMembers) ? draft.groupMembers : splitNames(String(draft.groupMembers || "")),
    visualTraits: draft.visualTraits || "",
    birthState: draft.birthState || "",
    distinctiveAnatomy: draft.distinctiveAnatomy || "",
    expressionPose: draft.expressionPose || "",
    styleNotes: draft.styleNotes || "",
    personality: draft.personality || "",
    groupIdentity: draft.groupIdentity || "",
    familyNotes: draft.familyNotes || "",
    seed_image_data_url: draft.seedImageDataUrl || "",
    seed_image_url: draft.seedImageUrl || "",
  };

  if (generateThumbnail) {
    payload.save_profile = true;
    payload.project_title = book.projectTitle || "Untitled book";
    payload.character_name = name;
    payload.character_role = draft.role || "";
    payload.isGroupReference = Boolean(draft.isGroupReference);
    payload.groupMembers = Array.isArray(draft.groupMembers) ? draft.groupMembers : splitNames(String(draft.groupMembers || ""));
    payload.visual_traits = draft.visualTraits || "";
    payload.birth_state = draft.birthState || "";
    payload.distinctive_anatomy = draft.distinctiveAnatomy || "";
    payload.expression_pose = draft.expressionPose || "";
    payload.style_notes = draft.styleNotes || "";
    payload.personality = draft.personality || "";
    payload.group_identity = draft.groupIdentity || "";
    payload.family_notes = draft.familyNotes || "";
    payload.cover_data_url = book.coverReferenceUrl || book.coverPreviewUrl || "";

    characterThumbnailGenerating = true;
    setThumbnailButtonLoading(true);
    setStatus("Generating character", `Creating a canonical avatar for ${name}.`);
    try {
      const response = await fetch("/api/generate-character", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Character generation failed.");
      }
      characterDraft.thumbnailUrl = result.file_url || "";
      characterDraft.seedImageDataUrl = "";
      characterDraft.seedImageFileName = "";
      characterDraft.originalName = name;
      characterDraft.isNew = false;
      activeCharacterName = name;
      syncCharacterEditorChrome(characterDraft.thumbnailUrl, characterDraft);
      setStatus("Character ready", `${name} now has a styled character avatar.`);
    } finally {
      characterThumbnailGenerating = false;
      setThumbnailButtonLoading(false);
    }
  } else {
    setStatus("Saving character", `Updating the character profile for ${name}.`);
    const response = await fetch("/api/characters", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "Could not save the character profile.");
    }
    characterDraft.originalName = name;
    characterDraft.isNew = false;
    if (result.character) {
      characterDraft.thumbnailUrl = result.character.thumbnailUrl || characterDraft.thumbnailUrl;
      characterDraft.seedImageUrl = result.character.seedImageUrl || characterDraft.seedImageUrl;
      characterDraft.isGroupReference = Boolean(result.character.isGroupReference);
      characterDraft.groupMembers = Array.isArray(result.character.groupMembers) ? result.character.groupMembers : splitNames(String(result.character.groupMembers || ""));
    }
    activeCharacterName = name;
    setStatus("Character saved", `${name} is now available for this book.`);
  }

  characterDraft.name = name;
  if (generateThumbnail) {
    characterDraft.thumbnailUrl = characterDraft.thumbnailUrl || "";
    characterDraft.seedImageDataUrl = "";
    syncCharacterEditorChrome(characterDraft.thumbnailUrl, characterDraft);
  }
  await loadCharacters();
  const refreshed = state.characters.find((character) => character.name === name);
  if (refreshed) {
    characterDraft = {
      ...blankCharacterDraft(),
      ...refreshed,
      originalName: refreshed.name,
      name: refreshed.name,
      role: refreshed.role,
      isGroupReference: refreshed.isGroupReference,
      groupMembers: refreshed.groupMembers,
      visualTraits: refreshed.visualTraits,
      birthState: refreshed.birthState,
      distinctiveAnatomy: refreshed.distinctiveAnatomy,
      expressionPose: refreshed.expressionPose,
      styleNotes: refreshed.styleNotes,
      personality: refreshed.personality,
      groupIdentity: refreshed.groupIdentity,
      familyNotes: refreshed.familyNotes,
      thumbnailUrl: refreshed.thumbnailUrl,
      seedImageUrl: refreshed.seedImageUrl,
      seedImageDataUrl: "",
      seedImageFileName: "",
      isNew: false,
    };
  }
  renderCharacterEditor();
}

async function analyzeCharacterSeed({ saveAfterAnalysis = false } = {}) {
  const draft = characterDraft || blankCharacterDraft();
  const seedImageDataUrl = draft.seedImageDataUrl || "";
  const seedImageUrl = draft.seedImageUrl || "";
  const seedReference = seedImageDataUrl || seedImageUrl;
  if (!seedReference) {
    setStatus("Missing seed image", "Attach a seed image before analyzing the character.");
    return;
  }

  const name = draft.name.trim();
  const payload = {
    name,
    role: draft.role || "",
    visualTraits: draft.visualTraits || "",
    birthState: draft.birthState || "",
    distinctiveAnatomy: draft.distinctiveAnatomy || "",
    expressionPose: draft.expressionPose || "",
    styleNotes: draft.styleNotes || "",
    personality: draft.personality || "",
    groupIdentity: draft.groupIdentity || "",
    familyNotes: draft.familyNotes || "",
    seed_image_data_url: seedImageDataUrl,
    seed_image_url: seedImageUrl,
    save_profile: Boolean(saveAfterAnalysis && name),
  };

  characterSeedAnalyzing = true;
  setThumbnailButtonLoading(true, refs.analyzeCharacterSeedButton, "Analyzing seed...");
  setStatus("Analyzing seed image", "Reading the seed image and filling the character profile.");
  try {
    const response = await fetch("/api/analyze-character-seed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "Character seed analysis failed.");
    }

    const analysis = result.character || result.analysis || {};
    characterDraft = {
      ...(characterDraft || blankCharacterDraft()),
      originalName: characterDraft?.originalName || analysis.name || draft.originalName || "",
      name: name || analysis.name || draft.name || "",
      role: draft.role || analysis.role || "",
      visualTraits: analysis.visualTraits || draft.visualTraits || "",
      birthState: analysis.birthState || draft.birthState || "",
      distinctiveAnatomy: analysis.distinctiveAnatomy || draft.distinctiveAnatomy || "",
      expressionPose: analysis.expressionPose || draft.expressionPose || "",
      styleNotes: analysis.styleNotes || draft.styleNotes || "",
      personality: analysis.personality || draft.personality || "",
      groupIdentity: analysis.groupIdentity || draft.groupIdentity || "",
      familyNotes: analysis.familyNotes || draft.familyNotes || "",
      thumbnailUrl: analysis.thumbnailUrl || draft.thumbnailUrl || "",
      seedImageUrl: analysis.seedImageUrl || seedImageUrl || "",
      seedImageDataUrl,
      seedImageFileName: draft.seedImageFileName || "",
      isNew: draft.isNew,
    };
    activeCharacterName = characterDraft.name.trim() || activeCharacterName;
    await loadCharacters();
    renderCharacterEditor();
    if (saveAfterAnalysis && characterDraft.name.trim()) {
      setStatus("Seed analyzed", "The character profile was updated from the seed image.");
    } else {
      setStatus("Seed analyzed", "The character fields were updated from the seed image.");
    }
  } finally {
    characterSeedAnalyzing = false;
    setThumbnailButtonLoading(false, refs.analyzeCharacterSeedButton, "Analyzing seed...");
  }
}

async function setCharacterSeedFromFile(file) {
  const dataUrl = await resizeFileToDataUrl(file, 1024, 0.9);
  if (!characterDraft) {
    setNewCharacterDraft();
  }
  characterDraft.seedImageDataUrl = dataUrl;
  characterDraft.seedImageFileName = file.name;
  renderCharacterEditor();
  await analyzeCharacterSeed({ saveAfterAnalysis: Boolean(characterDraft?.name?.trim()) });
}

function appendCharacter(name) {
  const page = activePage();
  const names = splitNames(page.characters);
  if (!names.some((item) => item.toLowerCase() === name.toLowerCase())) {
    names.push(name);
  }
  page.characters = names.join(", ");
  touchActiveBook();
  saveState();
  render();
}

function touchActiveBook() {
  touchBook(activeBook());
}

function touchBook(book) {
  book.updatedAt = new Date().toISOString();
}

function openStartBookFlow() {
  refs.startBookPanel.hidden = false;
  refs.startBookTitle.value = "";
  refs.startAuthorSelect.value = "";
  refs.startAuthorName.value = "";
  refs.startAudienceSelect.value = "3-8";
  refs.startStoryManuscript.value = "";
  refs.startPageCount.value = "";
  refs.startBookTitle.focus();
  setStatus("Start book", "Add the basics, paste the story, and create page drafts.");
}

function closeStartBookFlow() {
  refs.startBookPanel.hidden = true;
}

function createStartedBook() {
  const title = refs.startBookTitle.value.trim() || "Untitled Book";
  const author = refs.startAuthorName.value.trim() || refs.startAuthorSelect.value.trim();
  const manuscript = refs.startStoryManuscript.value.trim();
  if (!manuscript) {
    setStatus("Missing story", "Paste the story before creating the book pages.");
    refs.startStoryManuscript.focus();
    return;
  }

  const book = defaultBook(title);
  book.authorName = author;
  book.audience = refs.startAudienceSelect.value;
  book.suggestedPageCount = refs.startPageCount.value;
  book.manuscript = manuscript;
  if (author) state.authors = normalizeAuthors(state.authors, author);
  const pageTexts = splitStoryIntoPages(manuscript, book.audience, Number(book.suggestedPageCount));
  book.pages = pagesFromTextBlocks(book, pageTexts);
  book.manuscript = formatManuscriptWithPageBreaks(pageTexts);
  book.activePageId = book.pages[0]?.id || "";
  touchBook(book);
  state.books.push(book);
  state.activeBookId = book.id;
  saveState();
  closeStartBookFlow();
  setStatus("Book created", `"${book.projectTitle}" has ${book.pages.length} page drafts.`);
  render();
}

function addAuthor() {
  const author = refs.newAuthorName.value.trim();
  if (!author) {
    setStatus("Missing author", "Enter an author name before adding it.");
    return;
  }
  state.authors = normalizeAuthors(state.authors, author);
  activeBook().authorName = author;
  touchActiveBook();
  saveState();
  setStatus("Author added", `${author} is selected for this book.`);
  render();
}

function buildPagesFromStory() {
  const book = activeBook();
  const manuscript = book.manuscript.trim();
  if (!manuscript) {
    setStatus("Missing story", "Paste the story manuscript before creating page drafts.");
    return;
  }

  const pageTexts = splitStoryIntoPages(manuscript, book.audience, Number(book.suggestedPageCount));
  book.pages = pagesFromTextBlocks(book, pageTexts);
  book.manuscript = formatManuscriptWithPageBreaks(pageTexts);
  book.activePageId = book.pages[0]?.id || "";
  touchActiveBook();
  saveState();
  setStatus("Pages drafted", `${book.pages.length} page drafts were created from the pasted story.`);
  render();
}

function pagesFromTextBlocks(book, pageTexts) {
  return pageTexts.map((text, index) => {
    const page = defaultPage(index + 1);
    page.text = text;
    page.characters = inferCharacters(text);
    page.sceneDescription = buildSceneDirection(text, page.characters, book.audience);
    page.setting = "Use the story context to choose the clearest setting for this moment.";
    page.mood = inferMood(text);
    page.lighting = audienceLighting(book.audience);
    page.textSpace = audienceTextSpace(book.audience);
    page.composition = audienceComposition(book.audience);
    page.layout = defaultLayoutForAudience(book.audience);
    return page;
  });
}

function syncManuscriptFromPages(book) {
  book.manuscript = formatManuscriptWithPageBreaks(book.pages.map((page) => page.text || ""));
}

function extractPageTextsFromManuscript(manuscript) {
  const lines = String(manuscript || "").split(/\r?\n/);
  const blocks = [];
  let current = [];
  let sawPageHeader = false;

  for (const line of lines) {
    if (/^\s*---\s*Page\s+\d+\s*---\s*$/i.test(line)) {
      sawPageHeader = true;
      if (current.length) {
        blocks.push(current.join("\n").trim());
        current = [];
      }
      continue;
    }

    if (/^\s*-{8,}\s*$/.test(line)) {
      if (current.length) {
        blocks.push(current.join("\n").trim());
        current = [];
      }
      continue;
    }

    current.push(line);
  }

  if (current.length) blocks.push(current.join("\n").trim());

  const cleaned = blocks.map((block) => block.trim()).filter(Boolean);
  return sawPageHeader ? cleaned : [];
}

function syncPagesFromManuscript(book) {
  const pageTexts = extractPageTextsFromManuscript(book.manuscript);
  if (!pageTexts.length) return false;

  const nextPages = pageTexts.map((text, index) => {
    const source = book.pages[index];
    const page = source ? { ...source } : defaultPage(index + 1, defaultLayoutForAudience(book.audience));
    page.id = source?.id || page.id;
    page.number = index + 1;
    page.text = text;
    return page;
  });

  book.pages = nextPages;
  if (!book.pages.some((page) => page.id === book.activePageId)) {
    book.activePageId = book.pages[0]?.id || "";
  }
  book.manuscript = formatManuscriptWithPageBreaks(pageTexts);
  return true;
}

function splitStoryIntoPages(text, audience, requestedCount) {
  const clean = stripPageBreakMarkers(text).replace(/\s+/g, " ").trim();
  const sentences = clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((item) => item.trim()).filter(Boolean) || [clean];
  const targetWords = wordsPerPage(audience);
  const totalWords = countWords(clean);
  const autoCount = Math.max(1, Math.ceil(totalWords / targetWords));
  const pageCount = Number.isFinite(requestedCount) && requestedCount > 0 ? requestedCount : autoCount;
  const target = Math.max(6, Math.ceil(totalWords / pageCount));
  const pages = [];
  let current = [];
  let currentWords = 0;

  for (const sentence of sentences) {
    const sentenceWords = countWords(sentence);
    const shouldBreak = current.length && currentWords + sentenceWords > target && pages.length < pageCount - 1;
    if (shouldBreak) {
      pages.push(current.join(" "));
      current = [];
      currentWords = 0;
    }
    current.push(sentence);
    currentWords += sentenceWords;
  }

  if (current.length) pages.push(current.join(" "));
  return pages.filter(Boolean);
}

function stripPageBreakMarkers(text) {
  return String(text || "")
    .split(/\r?\n/)
    .filter((line) => !/^\s*(?:[-=_]{3,}\s*Page\s+\d+\s*[-=_]{3,}|[-=_]{8,})\s*$/.test(line))
    .join("\n");
}

function formatManuscriptWithPageBreaks(pageTexts) {
  const sections = pageTexts.map((text, index) => {
    const number = index + 1;
    return [`--- Page ${number} ---`, text.trim()].join("\n");
  });
  return sections.join("\n\n--------------------------------\n\n");
}

function wordsPerPage(audience) {
  const map = {
    "3-5": 14,
    "3-8": 24,
    "6-8": 38,
    "9-12": 70,
  };
  return map[audience] || 28;
}

function countWords(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

function inferCharacters(text) {
  const lower = text.toLowerCase();
  return state.characters
    .filter((character) => lower.includes(character.name.toLowerCase()))
    .map((character) => character.name)
    .join(", ");
}

function buildSceneDirection(text, characters, audience) {
  const focus = characters ? `Feature ${characters}. ` : "";
  const visualScale =
    audience === "3-5" || audience === "3-8"
      ? "Make the illustration carry most of the storytelling with simple, expressive shapes. "
      : "Use a richer scene with clear action and emotional detail. ";
  return `${focus}${visualScale}Illustrate this story moment: ${text}`;
}

function inferMood(text) {
  const lower = text.toLowerCase();
  if (/(happy|laugh|smile|play|joy|excited|fun)/.test(lower)) return "Warm, playful, and joyful.";
  if (/(sad|lonely|cry|afraid|scared|worried)/.test(lower)) return "Tender, gentle, and emotionally clear.";
  if (/(run|race|jump|chase|dash|hurry)/.test(lower)) return "Energetic, lively, and safe for young readers.";
  return "Warm, clear, and storybook gentle.";
}

function audienceLighting(audience) {
  if (audience === "3-5" || audience === "3-8") return "Bright warm sunrise or daytime light with soft friendly contrast.";
  return "Warm natural light with enough contrast to support a richer illustrated scene.";
}

function audienceTextSpace(audience) {
  if (audience === "3-5") return "Reserve a large quiet text area with very high readability, preferably in the lower third or a calm sky area.";
  if (audience === "3-8") return "Reserve a generous quiet text area for large readable type, with the illustration doing most of the storytelling.";
  if (audience === "6-8") return "Reserve a clear text-safe area that can hold a short paragraph without covering the main action.";
  return "Reserve a smaller text-safe area; the page may carry more words and a slightly denser illustration.";
}

function audienceComposition(audience) {
  if (audience === "3-5") return "Simple picture-book composition, big characters, clear emotion, uncluttered background, strong image-first storytelling.";
  if (audience === "3-8") return "Image-forward picture-book composition with large characters, readable action, and room for large text.";
  if (audience === "6-8") return "Balanced picture-book composition with clear action, expressive characters, and moderate detail.";
  return "Detailed illustrated page composition with richer setting, clear focal point, and room for a longer text block.";
}

function audiencePreviewClass(audience) {
  if (audience === "3-5" || audience === "3-8") return "audience-young";
  if (audience === "6-8") return "audience-middle";
  return "audience-older";
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return map[char] ?? char;
  });
}

function escapeCssUrl(value) {
  return String(value ?? "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function normalizeInlinePageText(value) {
  return String(value ?? "")
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .trim();
}


refs.newBookButton.addEventListener("click", openStartBookFlow);
refs.cancelStartBookButton.addEventListener("click", closeStartBookFlow);
refs.createStartedBookButton.addEventListener("click", createStartedBook);
refs.addPageButton.addEventListener("click", addPage);
refs.duplicatePageButton.addEventListener("click", duplicatePage);
refs.deletePageButton.addEventListener("click", deletePage);

refs.projectTitle.addEventListener("input", (event) => {
  activeBook().projectTitle = event.target.value;
  touchActiveBook();
  saveState();
  renderBookSelect();
});

refs.authorSelect.addEventListener("change", (event) => {
  activeBook().authorName = event.target.value;
  touchActiveBook();
  saveState();
  renderAuthorSelect();
});

refs.addAuthorButton.addEventListener("click", addAuthor);
refs.buildPagesButton.addEventListener("click", buildPagesFromStory);

refs.audienceSelect.addEventListener("change", (event) => {
  activeBook().audience = event.target.value;
  touchActiveBook();
  saveState();
  renderBookPreview();
});

refs.printSizeSelect.addEventListener("change", (event) => {
  activeBook().printSize = normalizePrintSize(event.target.value);
  touchActiveBook();
  saveState();
  render();
});

refs.printSizeToolbar.addEventListener("click", (event) => {
  const button = event.target.closest("[data-print-size-choice]");
  if (!button) return;
  activeBook().printSize = normalizePrintSize(button.dataset.printSizeChoice);
  touchActiveBook();
  saveState();
  render();
});

refs.backCoverSummary.addEventListener("input", (event) => {
  activeBook().backCoverSummary = event.target.value;
  touchActiveBook();
  saveState();
});

refs.suggestedPageCount.addEventListener("input", (event) => {
  activeBook().suggestedPageCount = event.target.value;
  touchActiveBook();
  saveState();
});

refs.storyManuscript.addEventListener("input", (event) => {
  const book = activeBook();
  book.manuscript = event.target.value;
  syncPagesFromManuscript(book);
  touchActiveBook();
  saveState();
  renderPageList();
  renderBookPreview();
});

refs.pageForm.addEventListener("input", (event) => {
  const keyMap = {
    sceneDescription: "sceneDescription",
    pageCharacters: "characters",
    pageSetting: "setting",
    pageMood: "mood",
    pageLighting: "lighting",
    textSpace: "textSpace",
    composition: "composition",
  };
  const key = keyMap[event.target.id];
  if (!key) return;
  updateActivePage({ [key]: event.target.value });
});

refs.fullBookPreview.addEventListener("click", (event) => {
  const pageId = event.target.closest(".full-book-page")?.dataset.pageId || activePage().id;
  const publishButton = event.target.closest("[data-publish-book]");
  if (publishButton) {
    publishBook();
    return;
  }
  const generateButton = event.target.closest("[data-generate-page-id]");
  if (generateButton) {
    generatePageForId(generateButton.dataset.generatePageId);
    return;
  }
  const clearImageButton = event.target.closest("[data-clear-page-image-id]");
  if (clearImageButton) {
    clearPageImage(clearImageButton.dataset.clearPageImageId);
    return;
  }
  const layoutButton = event.target.closest("[data-layout-choice]");
  if (layoutButton) {
    updatePageById(pageId, { layout: layoutButton.dataset.layoutChoice });
    render();
    return;
  }
  const fontButton = event.target.closest("[data-font-choice]");
  if (fontButton) {
    updatePageById(pageId, { fontPreset: fontButton.dataset.fontChoice });
    render();
    return;
  }
  const verticalButton = event.target.closest("[data-text-vertical-choice]");
  if (verticalButton) {
    updatePageById(pageId, { textVerticalAlign: verticalButton.dataset.textVerticalChoice });
    render();
    return;
  }
  const scaleStepButton = event.target.closest("[data-text-scale-step]");
  if (scaleStepButton) {
    const page = activeBook().pages.find((item) => item.id === pageId) || activePage();
    const nextScale = clampTextScale(normalizeTextScale(page.fontScale) + Number(scaleStepButton.dataset.textScaleStep || 0));
    updatePageById(pageId, { fontScale: nextScale });
    render();
    return;
  }
  const editButton = event.target.closest("[data-edit-page-id]");
  if (editButton) {
    const nextPageId = editButton.dataset.editPageId;
    activeBook().activePageId = nextPageId;
    saveState();
    render();
    refs.pageEditorCard?.scrollIntoView({ block: "start", behavior: "smooth" });
    return;
  }
  const nudgeButton = event.target.closest("[data-image-nudge]");
  if (nudgeButton) {
    const page = activeBook().pages.find((item) => item.id === pageId);
    if (!page) return;
    const next = {
      imageOffsetX: normalizeImageOffset(page.imageOffsetX),
      imageOffsetY: normalizeImageOffset(page.imageOffsetY),
    };
    switch (nudgeButton.dataset.imageNudge) {
      case "up":
        next.imageOffsetY -= IMAGE_NUDGE_STEP;
        break;
      case "down":
        next.imageOffsetY += IMAGE_NUDGE_STEP;
        break;
      case "left":
        next.imageOffsetX -= IMAGE_NUDGE_STEP;
        break;
      case "right":
        next.imageOffsetX += IMAGE_NUDGE_STEP;
        break;
      default:
        break;
    }
    if (normalizeImageScale(page.imageScale) < IMAGE_MIN_PAN_SCALE) {
      next.imageScale = IMAGE_MIN_PAN_SCALE;
    }
    updatePageById(pageId, next);
    return;
  }
  if (event.target.closest("[data-image-reset-position]")) {
    updatePageById(pageId, {
      imageOffsetX: DEFAULT_IMAGE_OFFSET,
      imageOffsetY: DEFAULT_IMAGE_OFFSET,
      imageScale: 1,
    });
    return;
  }
  const imageScaleStepButton = event.target.closest("[data-image-scale-step]");
  if (imageScaleStepButton) {
    const page = activeBook().pages.find((item) => item.id === pageId);
    if (!page) return;
    const nextScale = normalizeImageScale(normalizeImageScale(page.imageScale) + Number(imageScaleStepButton.dataset.imageScaleStep || 0));
    updatePageById(pageId, { imageScale: nextScale });
  }
});

refs.fullBookPreview.addEventListener("change", async (event) => {
  const uploadInput = event.target.closest("[data-page-upload-input]");
  if (!uploadInput) return;
  const pageId = uploadInput.dataset.pageId;
  const file = uploadInput.files?.[0];
  if (!file) return;
  try {
    await setPageImageFromFile(file, pageId);
  } catch (error) {
    setStatus("Image upload failed", error.message || "Could not attach the page image.");
  } finally {
    uploadInput.value = "";
  }
});

refs.fullBookPreview.addEventListener("input", (event) => {
  const editor = event.target.closest("[data-inline-page-text-editor]");
  if (!editor) return;
  const pageId = editor.dataset.pageId;
  const page = activeBook().pages.find((item) => item.id === pageId);
  if (!page) return;
  const nextText = normalizeInlinePageText(editor.innerText);
  if (page.text === nextText) return;
  page.text = nextText;
  syncManuscriptFromPages(activeBook());
  touchActiveBook();
  saveState();
  refs.storyManuscript.value = activeBook().manuscript;
  renderPageList();
});

refs.fullBookPreview.addEventListener("focusout", (event) => {
  const editor = event.target.closest("[data-inline-page-text-editor]");
  if (!editor) return;
  const pageId = editor.dataset.pageId;
  const page = activeBook().pages.find((item) => item.id === pageId);
  if (!page) return;
  const nextText = normalizeInlinePageText(editor.innerText);
  if (page.text !== nextText) {
    page.text = nextText;
    syncManuscriptFromPages(activeBook());
    touchActiveBook();
    saveState();
    refs.storyManuscript.value = activeBook().manuscript;
    renderPageList();
  }
  renderBookPreview();
});

refs.pageList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-page-id]");
  if (!button) return;
  activeBook().activePageId = button.dataset.pageId;
  saveState();
  render();
});

refs.bookSelect.addEventListener("change", (event) => {
  state.activeBookId = event.target.value;
  saveState();
  setStatus("Book opened", `"${activeBook().projectTitle || "Untitled Book"}" is loaded.`);
  render();
});

refs.newCharacterButton.addEventListener("click", () => {
  setNewCharacterDraft();
  refs.characterEditorName?.focus();
});

refs.seedCharacterButton.addEventListener("click", () => {
  setNewCharacterDraft();
  refs.characterSeedInput?.click();
});

refs.characterList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-character-name]");
  if (!button) return;
  const name = button.dataset.characterName;
  const character = state.characters.find((item) => item.name === name);
  if (character) {
    setCharacterDraftFromRecord(character);
  }
});

refs.characterEditor.addEventListener("input", (event) => {
  if (!characterDraft) {
    characterDraft = blankCharacterDraft();
  }
  const map = {
    characterEditorName: "name",
    characterEditorRole: "role",
    characterEditorVisualTraits: "visualTraits",
    characterEditorBirthState: "birthState",
    characterEditorDistinctiveAnatomy: "distinctiveAnatomy",
    characterEditorExpressionPose: "expressionPose",
    characterEditorStyleNotes: "styleNotes",
    characterEditorPersonality: "personality",
    characterEditorGroupIdentity: "groupIdentity",
    characterEditorFamilyNotes: "familyNotes",
    characterEditorGroupMembers: "groupMembers",
  };
  const key = map[event.target.id];
  if (!key) return;
  if (key === "groupMembers") {
    characterDraft.groupMembers = splitNames(event.target.value);
  } else {
    characterDraft[key] = event.target.value;
  }
  if (key === "name") {
    activeCharacterName = event.target.value.trim();
  }
  syncCharacterEditorChrome(characterDraft.seedImageDataUrl || characterDraft.thumbnailUrl || characterDraft.seedImageUrl || "");
});

refs.characterEditor.addEventListener("change", (event) => {
  if (event.target.id !== "characterEditorIsGroupReference") return;
  if (!characterDraft) characterDraft = blankCharacterDraft();
  characterDraft.isGroupReference = Boolean(event.target.checked);
  if (!characterDraft.isGroupReference) {
    characterDraft.groupMembers = Array.isArray(characterDraft.groupMembers) ? characterDraft.groupMembers : splitNames(String(characterDraft.groupMembers || ""));
  }
  syncCharacterEditorChrome(characterDraft.seedImageDataUrl || characterDraft.thumbnailUrl || characterDraft.seedImageUrl || "");
});

refs.characterSeedInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    await setCharacterSeedFromFile(file);
    setStatus("Seed image loaded", `${file.name} is ready to shape a new character.`);
  } catch (error) {
    setStatus("Seed image failed", error.message || "Could not load the seed image.");
  } finally {
    event.target.value = "";
  }
});

refs.saveCharacterButton.addEventListener("click", async () => {
  try {
    await saveCharacterDraft({ generateThumbnail: false });
  } catch (error) {
    setStatus("Character save failed", error.message || "Could not save the character profile.");
  }
});

refs.generateCharacterThumbnailButton.addEventListener("click", async () => {
  try {
    await saveCharacterDraft({ generateThumbnail: true });
  } catch (error) {
      setStatus("Character generation failed", error.message || "Could not generate the character avatar.");
  }
});

refs.analyzeCharacterSeedButton.addEventListener("click", async () => {
  try {
    const draft = characterDraft || blankCharacterDraft();
    const hasSeed = Boolean(draft.seedImageDataUrl || draft.seedImageUrl);
    if (!hasSeed) {
      refs.characterSeedInput?.click();
      return;
    }
    await analyzeCharacterSeed({ saveAfterAnalysis: Boolean(characterDraft?.name?.trim()) });
  } catch (error) {
    setStatus("Seed analysis failed", error.message || "Could not analyze the seed image.");
  }
});

refs.useCharacterOnPageButton.addEventListener("click", () => {
  if (!characterDraft?.name) return;
  appendCharacter(characterDraft.name);
});

refs.coverInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  await handleCoverFile(file);
});

refs.clearCoverButton.addEventListener("click", () => {
  const book = activeBook();
  book.coverFileName = "";
  book.coverPreviewUrl = "";
  book.coverReferenceUrl = "";
  refs.coverInput.value = "";
  touchActiveBook();
  saveState();
  setStatus("Cover cleared", "New page illustrations will generate without a cover reference.");
  render();
});

refs.copyPromptButton.addEventListener("click", async () => {
  const prompt = activePage().prompt;
  if (!prompt) return;
  try {
    await navigator.clipboard.writeText(prompt);
    setStatus("Prompt copied", "The page prompt is on your clipboard.");
  } catch {
    setStatus("Copy failed", "Your browser blocked clipboard access.");
  }
});

async function bootstrap() {
  const serverState = await loadStateFromServer();
  if (serverState) {
    state = serverState;
  } else {
    const localState = loadStateFromLocalStorage();
    state = localState;
    queueServerStateSave(true);
  }
  delete state.previewMode;
  state.isGenerating = false;
  state.generatingPageId = "";
  ensureBookPresence();
  if (!activeBook()) {
    const book = exampleBook();
    state.books = [book];
    state.activeBookId = book.id;
  }
  if (!activeBook().activePageId || !activeBook().pages.some((page) => page.id === activeBook().activePageId)) {
    activeBook().activePageId = activeBook().pages[0]?.id || "";
  }
  render();
  loadCharacters();
  loadDefaultCover();
}

bootstrap();




