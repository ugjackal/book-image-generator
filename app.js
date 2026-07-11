const STORAGE_KEY = "author-book-builder.state.v2";
const DEFAULT_COVER_PATH = "./artifacts/cover/book_cover.jfif";
const DEFAULT_PAGE_LAYOUT = "stacked-image-top";
const DEFAULT_PAGE_FONT = "storybook-serif";
const DEFAULT_PRINT_SIZE = "landscape-10x8";
const DEFAULT_PAGE_TEXT_SCALE = 1;
const DEFAULT_PAGE_TEXT_VERTICAL = "top";
const DEFAULT_PAGE_TEXT_HORIZONTAL = "center";
const DEFAULT_PAGE_TEXT_SPACE = "Leave a calm open area for real page text";
const DEFAULT_IMAGE_SCALE = 1;
const DEFAULT_IMAGE_OFFSET = 0;
const IMAGE_OFFSET_MIN = -100;
const IMAGE_OFFSET_MAX = 100;
const IMAGE_NUDGE_STEP = 10;
const IMAGE_MIN_PAN_SCALE = 0.7;
const PRINT_SIZES = {
  "landscape-10x8": { label: "Landscape picture book 12 x 8 in", width: 3600, height: 2400, aspect: 1.5 },
  "portrait-8x10": { label: "Portrait picture book 8 x 12 in", width: 2400, height: 3600, aspect: 0.6666667 },
  "portrait-8.5x11": { label: "Portrait picture book 8.5 x 11 in", width: 2550, height: 3300, aspect: 0.7727273 },
  "square-10x10": { label: "Square picture book 10 x 10 in", width: 3000, height: 3000, aspect: 1 },
};
const PAGE_LAYOUT_OPTIONS = [
  "stacked-image-top",
  "stacked-text-top",
  "single-overlay-top",
  "single-overlay-bottom",
  "spread-text-left",
  "spread-image-left",
  "overlay-centered",
  "overlay-left",
  "overlay-right",
  "overlay-top",
  "overlay-bottom",
];
const SINGLE_PAGE_LAYOUT_OPTIONS = [
  "stacked-image-top",
  "stacked-text-top",
  "single-overlay-top",
  "single-overlay-bottom",
];
const TWO_PAGE_LAYOUT_OPTIONS = [
  "spread-text-left",
  "spread-image-left",
  "overlay-centered",
  "overlay-left",
  "overlay-right",
  "overlay-top",
  "overlay-bottom",
];
const PAGE_TEXT_HORIZONTAL_OPTIONS = ["left", "center", "right"];
const PAGE_FONT_OPTIONS = ["storybook-serif", "clean-sans", "playful-hand"];
const PAGE_TEXT_VERTICAL_OPTIONS = ["top", "center", "bottom"];
const TEXT_SCALE_MIN = 0.7;
const TEXT_SCALE_MAX = 5;
const FONT_POINT_STEP = 1;
const MAX_FONT_POINTS = 48;

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
  pageCountLabel: $("#pageCountLabel"),
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
  updatePromptButton: $("#updatePromptButton"),
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
  textSpace: defaultTextSpaceForLayout(layout),
  composition: "Landscape picture-book page composition with readable character silhouettes.",
  layout: normalizeLayout(layout),
  fontPreset: DEFAULT_PAGE_FONT,
  fontScale: DEFAULT_PAGE_TEXT_SCALE,
  textHorizontalAlign: DEFAULT_PAGE_TEXT_HORIZONTAL,
  textVerticalAlign: DEFAULT_PAGE_TEXT_VERTICAL,
  printSize: DEFAULT_PRINT_SIZE,
  imageScale: 1,
  imageOffsetX: DEFAULT_IMAGE_OFFSET,
  imageOffsetY: DEFAULT_IMAGE_OFFSET,
  imageNaturalWidth: 0,
  imageNaturalHeight: 0,
  linkedPairKey: "",
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
    imageLibrary: [],
    linkedPagePairs: [],
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
      textSpace: "",
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
    selectedPreviewPageIds: [],
    authors: ["Kim Stewart", "Tony Stewart"],
    characters: [],
    status: "Ready",
    statusDetail: "Add page text, describe the scene, and generate the illustration.",
    isGenerating: false,
    generatingPageId: "",
  };
};

const legacyBookFromState = (parsed) => {
  const pages = normalizePages(parsed.pages);
  return {
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
    pages,
    linkedPagePairs: normalizeLinkedPagePairs(parsed.linkedPagePairs, pages),
    activePageId: parsed.activePageId || "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

let state = defaultState();
let stateSaveTimer = null;
let selectedPreviewPageIds = [];
let openGeneratedImagePickerPageIds = new Set();
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
    const selectedPreviewPageIds = normalizeSelectedPreviewPageIds(parsed.selectedPreviewPageIds, book);
    return {
      books: [book],
      activeBookId: book.id,
      selectedPreviewPageIds,
      authors: normalizeAuthors(parsed.authors, book.authorName),
      characters: [],
      status: "Ready",
      statusDetail: fallback.statusDetail,
      isGenerating: false,
      generatingPageId: "",
    };
  }
  const books = parsed.books.length ? parsed.books.map(normalizeBook) : fallback.books;
  const activeBookId = books.some((book) => book.id === parsed.activeBookId) ? parsed.activeBookId : books[0].id;
  const activeBook = books.find((book) => book.id === activeBookId) || books[0];
  return {
    ...fallback,
    ...parsed,
    books,
    activeBookId,
    selectedPreviewPageIds: normalizeSelectedPreviewPageIds(parsed.selectedPreviewPageIds, activeBook),
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

async function loadGeneratedImagesFromOutputs() {
  try {
    const response = await fetch("/api/outputs", { headers: { Accept: "application/json" } });
    if (!response.ok) return [];
    const result = await response.json();
    if (!Array.isArray(result.files)) return [];
    return result.files
      .map((file) => {
        const name = String(file.name || "").trim();
        const pageMatch = name.match(/^page-(\d+)-scene/i);
        return {
          id: `output:${String(file.url || name)}`,
          imageUrl: String(file.url || "").trim(),
          imageDataUrl: "",
          fileName: name,
          prompt: "",
          notes: "Loaded from the outputs folder.",
          sourcePageId: "",
          sourcePageNumber: pageMatch ? Number(pageMatch[1]) : 0,
          createdAt: file.last_modified ? new Date(Number(file.last_modified) * 1000).toISOString() : "",
        };
      })
      .filter((image) => image.imageUrl);
  } catch {
    return [];
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
  state.selectedPreviewPageIds = [...selectedPreviewPageIds];
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
  const pages = normalizePages(book.pages);
  const normalized = {
    ...defaultBook(book.projectTitle || "Untitled Book"),
    ...book,
    printSize: normalizePrintSize(book.printSize),
    pages,
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
    textHorizontalAlign: normalizeTextHorizontalAlign(
      page.textHorizontalAlign || legacyOverlayAlignments(page.layout).horizontal || DEFAULT_PAGE_TEXT_HORIZONTAL,
    ),
    textVerticalAlign: normalizeTextVerticalAlign(
      page.textVerticalAlign || legacyOverlayAlignments(page.layout).vertical || DEFAULT_PAGE_TEXT_VERTICAL,
    ),
    imageDataUrl: page.imageDataUrl || "",
    imageUrl: page.imageDataUrl || page.imageUrl || "",
    linkedPairKey: String(page?.linkedPairKey || "").trim(),
  }));
  normalized.imageLibrary = normalizeGeneratedImageLibrary(normalized.imageLibrary, normalized.pages);
  normalized.linkedPagePairs = normalizeLinkedPagePairs(normalized.linkedPagePairs, normalized.pages);
  return normalized;
}

function normalizeLinkedPagePairs(linkedPagePairs, pages = []) {
  const pageById = new Map((Array.isArray(pages) ? pages : []).map((page) => [page.id, page]));
  const pairs = Array.isArray(linkedPagePairs) ? linkedPagePairs : [];
  const normalized = [];
  const seen = new Set();
  pairs.forEach((pair) => {
    const ids = Array.isArray(pair) ? pair : String(pair || "").split(",");
    const firstId = String(ids[0] || "").trim();
    const secondId = String(ids[1] || "").trim();
    const firstPage = pageById.get(firstId);
    const secondPage = pageById.get(secondId);
    if (!firstPage || !secondPage || !areFacingPages({ pages }, firstPage, secondPage)) return;
    const key = [firstPage.id, secondPage.id].join(",");
    if (seen.has(key)) return;
    seen.add(key);
    normalized.push([firstPage.id, secondPage.id]);
  });
  return normalized;
}

function linkedPairKey(firstPageId, secondPageId) {
  return [firstPageId, secondPageId].join(",");
}

function hasLinkedPagePair(book, firstPageId, secondPageId) {
  const key = linkedPairKey(firstPageId, secondPageId);
  if (Array.isArray(book?.linkedPagePairs) && book.linkedPagePairs.some((pair) => linkedPairKey(pair?.[0], pair?.[1]) === key)) {
    return true;
  }
  return Array.isArray(book?.pages) && book.pages.some((page) => page.linkedPairKey === key);
}

function previewSelectionForPage(book, pageId) {
  const pages = Array.isArray(book?.pages) ? book.pages : [];
  const pageIndex = pages.findIndex((page) => page.id === pageId);
  if (pageIndex < 0) return [];
  const pairStartIndex = pageIndex % 2 === 0 ? pageIndex : pageIndex - 1;
  const firstPage = pages[pairStartIndex];
  const secondPage = pages[pairStartIndex + 1];
  return firstPage && secondPage && hasLinkedPagePair(book, firstPage.id, secondPage.id)
    ? [firstPage.id, secondPage.id]
    : [pageId];
}

function toggleLinkedPagePair(book, firstPageId, secondPageId) {
  if (!book) return;
  const key = linkedPairKey(firstPageId, secondPageId);
  const pairs = normalizeLinkedPagePairs(book.linkedPagePairs, book.pages);
  const existingIndex = pairs.findIndex((pair) => linkedPairKey(pair[0], pair[1]) === key);
  if (existingIndex >= 0) {
    pairs.splice(existingIndex, 1);
    book.pages
      .filter((page) => page.linkedPairKey === key)
      .forEach((page) => {
        page.linkedPairKey = "";
      });
  } else {
    const firstPage = book.pages.find((page) => page.id === firstPageId);
    const secondPage = book.pages.find((page) => page.id === secondPageId);
    if (!firstPage || !secondPage || !areFacingPages(book, firstPage, secondPage)) return;
    pairs.push([firstPage.id, secondPage.id]);
    firstPage.linkedPairKey = key;
    secondPage.linkedPairKey = key;
  }
  book.linkedPagePairs = pairs;
}

function normalizeGeneratedImageLibrary(imageLibrary, pages = []) {
  const items = Array.isArray(imageLibrary) ? imageLibrary : [];
  const normalized = [];
  const seenUrls = new Set();

  const addItem = (item) => {
    const imageUrl = String(item?.imageDataUrl || item?.imageUrl || item?.url || "").trim();
    if (!imageUrl || seenUrls.has(imageUrl)) return;
    seenUrls.add(imageUrl);
    normalized.push({
      id: String(item?.id || makeId()),
      imageUrl,
      imageDataUrl: String(item?.imageDataUrl || ""),
      fileName: String(item?.fileName || item?.file_name || ""),
      prompt: String(item?.prompt || ""),
      notes: String(item?.notes || ""),
      sourcePageId: String(item?.sourcePageId || ""),
      sourcePageNumber: Number(item?.sourcePageNumber) || 0,
      imageNaturalWidth: Number(item?.imageNaturalWidth) || 0,
      imageNaturalHeight: Number(item?.imageNaturalHeight) || 0,
      createdAt: String(item?.createdAt || new Date().toISOString()),
    });
  };

  items.forEach(addItem);
  pages
    .filter((page) => page.imageSource === "generated" && page.imageUrl)
    .forEach((page) =>
      addItem({
        imageUrl: page.imageUrl,
        imageDataUrl: page.imageDataUrl,
        fileName: page.fileName,
        prompt: page.prompt,
        notes: page.notes,
        sourcePageId: page.id,
        sourcePageNumber: page.number,
        imageNaturalWidth: Number(page.imageNaturalWidth) || 0,
        imageNaturalHeight: Number(page.imageNaturalHeight) || 0,
      }),
    );
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
    textHorizontalAlign: normalizeTextHorizontalAlign(
      page?.textHorizontalAlign || legacyOverlayAlignments(page?.layout).horizontal || DEFAULT_PAGE_TEXT_HORIZONTAL,
    ),
    textVerticalAlign: normalizeTextVerticalAlign(
      page?.textVerticalAlign || legacyOverlayAlignments(page?.layout).vertical || DEFAULT_PAGE_TEXT_VERTICAL,
    ),
    imageOffsetX: normalizeImageOffset(page?.imageOffsetX),
    imageOffsetY: normalizeImageOffset(page?.imageOffsetY),
    imageNaturalWidth: Number(page?.imageNaturalWidth) || 0,
    imageNaturalHeight: Number(page?.imageNaturalHeight) || 0,
    textSpace: resolvedTextSpaceForPage(page),
  }));
}

function normalizePrintSize(printSize) {
  const value = String(printSize || "").trim();
  return Object.prototype.hasOwnProperty.call(PRINT_SIZES, value) ? value : DEFAULT_PRINT_SIZE;
}

function normalizeImageScale(scale) {
  const value = Number(scale);
  if (!Number.isFinite(value)) return DEFAULT_IMAGE_SCALE;
  return Math.min(2, Math.max(IMAGE_MIN_PAN_SCALE, value));
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
  if (value === "overlay") return "overlay-centered";
  return PAGE_LAYOUT_OPTIONS.includes(value) ? value : DEFAULT_PAGE_LAYOUT;
}

function normalizeFontPreset(fontPreset) {
  const value = String(fontPreset || "").trim();
  return PAGE_FONT_OPTIONS.includes(value) ? value : DEFAULT_PAGE_FONT;
}

function normalizeTextHorizontalAlign(value) {
  const normalized = String(value || "").trim();
  return PAGE_TEXT_HORIZONTAL_OPTIONS.includes(normalized) ? normalized : DEFAULT_PAGE_TEXT_HORIZONTAL;
}

function normalizeTextVerticalAlign(value) {
  const normalized = String(value || "").trim();
  return PAGE_TEXT_VERTICAL_OPTIONS.includes(normalized) ? normalized : DEFAULT_PAGE_TEXT_VERTICAL;
}

function textHorizontalJustify(value) {
  switch (normalizeTextHorizontalAlign(value)) {
    case "center":
      return "center";
    case "right":
      return "flex-end";
    case "left":
    default:
      return "flex-start";
  }
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
    case "portrait-8.5x11":
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
    case "single-overlay":
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

function baseExportFontPixelSize(book, page) {
  const isYoungAudience = ["3-5", "3-8"].includes(book?.audience);
  return (
    layoutMode(page?.layout) === "spread"
      ? isYoungAudience
        ? 54
        : 42
      : isOverlayLayout(page?.layout)
      ? isYoungAudience
        ? 50
        : 40
      : isYoungAudience
      ? 52
      : 40
  );
}

function maxFontScaleForPage(book, page) {
  return Math.min(TEXT_SCALE_MAX, (MAX_FONT_POINTS * 300) / (72 * baseExportFontPixelSize(book, page)));
}

function exportFontPixelSize(book, page) {
  const scale = Math.min(normalizeTextScale(page?.fontScale), maxFontScaleForPage(book, page));
  return Math.max(22, Math.round(baseExportFontPixelSize(book, page) * scale));
}

function exportFontPointSize(book, page) {
  return (exportFontPixelSize(book, page) * 72) / 300;
}

function integerFontPointSize(book, page) {
  return Math.min(MAX_FONT_POINTS, Math.max(1, Math.round(exportFontPointSize(book, page))));
}

function fontScaleForPointSize(book, page, pointSize) {
  const targetPoints = Math.min(MAX_FONT_POINTS, Math.max(1, Math.round(Number(pointSize) || 1)));
  return clampTextScale((targetPoints * 300) / (72 * baseExportFontPixelSize(book, page)));
}

function previewFontWidthRatio(book, page) {
  const { width } = printSizeDimensions(book?.printSize);
  return exportFontPixelSize(book, page) / width;
}

function fontPointLabel(book, page) {
  return `${integerFontPointSize(book, page)} pt`;
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
    case "single-overlay-top":
      return "Single page: text over image, top";
    case "single-overlay-bottom":
      return "Single page: text over image, bottom";
    case "spread-text-left":
      return "Text left, image right";
    case "spread-image-left":
      return "Image left, text right";
    case "overlay-left":
      return "Image across both, text left";
    case "overlay-right":
      return "Image across both, text right";
    case "overlay-top":
      return "Image across both, text top";
    case "overlay-bottom":
      return "Image across both, text bottom";
    case "overlay-centered":
      return "Image across both, text centered";
    case "stacked-image-top":
    default:
      return "Image top, text bottom";
  }
}

function layoutMode(layout) {
  const value = normalizeLayout(layout);
  if (value.startsWith("single-overlay-")) return "single-overlay";
  if (value.startsWith("spread-")) return "spread";
  if (value.startsWith("overlay")) return "overlay";
  return "stacked";
}

function isOverlayLayout(layout) {
  const mode = layoutMode(layout);
  return mode === "overlay" || mode === "single-overlay";
}

function spreadTextSide(layout) {
  switch (normalizeLayout(layout)) {
    case "spread-image-left":
    case "overlay-right":
      return "right";
    case "spread-text-left":
    case "overlay-left":
    case "overlay-top":
    case "overlay-bottom":
    case "overlay-centered":
      return "left";
    default:
      return "both";
  }
}

function spreadPageTextRole(layout, side) {
  const textSide = spreadTextSide(layout);
  if (textSide === "both") return "text-and-image";
  return textSide === side ? "text" : "image";
}

function overlayTextAreaForLayout(layout) {
  switch (normalizeLayout(layout)) {
    case "overlay-left":
      return "left";
    case "overlay-right":
      return "right";
    case "single-overlay-top":
    case "overlay-top":
      return "top";
    case "single-overlay-bottom":
    case "overlay-bottom":
      return "bottom";
    case "overlay-centered":
    default:
      return "centered";
  }
}

function defaultTextSpaceForLayout(layout) {
  switch (normalizeLayout(layout)) {
    case "stacked-text-top":
    case "spread-text-left":
    case "spread-image-left":
      return "";
    case "overlay-centered":
    case "overlay-left":
    case "overlay-right":
    case "overlay-top":
    case "overlay-bottom":
    case "single-overlay-top":
    case "single-overlay-bottom":
      return overlayTextAreaForLayout(layout);
    case "stacked-image-top":
    default:
      return "";
  }
}

function isAutoTextSpaceValue(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return [
    "leave a calm open area for real page text",
    "leave quiet open space where the page text can sit clearly.",
    "leave a quiet open area at the top left for the story text.",
    "place the story text below the image.",
    "place the story text above the image.",
    "place the story text on the left page.",
    "place the story text on the right page.",
    "upper left",
    "upper center",
    "upper right",
    "centered",
    "left",
    "right",
    "lower left",
    "lower center",
    "lower right",
    "keep the text in a calmer upper area of the image.",
    "keep the text in a calmer lower area of the image.",
    "top",
    "bottom",
  ].includes(normalized);
}

function overlayTextAreaLabel(horizontal, vertical) {
  const h = normalizeTextHorizontalAlign(horizontal);
  const v = normalizeTextVerticalAlign(vertical);
  if (h === "center" && v === "center") return "centered";
  if (h === "left" && v === "center") return "left";
  if (h === "right" && v === "center") return "right";
  if (h === "center" && v === "top") return "top";
  if (h === "center" && v === "bottom") return "bottom";
  const verticalWord = v === "top" ? "upper" : v === "bottom" ? "lower" : "center";
  const horizontalWord = h === "center" ? "center" : h;
  return `${verticalWord} ${horizontalWord}`.trim();
}

function resolvedTextSpaceForPage(page) {
  const current = String(page?.textSpace || "").trim();
  const layout = normalizeLayout(page?.layout);
  if (!current) {
    return isOverlayLayout(layout) ? defaultTextSpaceForLayout(layout) : "";
  }
  if (isOverlayLayout(layout)) {
    return isAutoTextSpaceValue(current) ? defaultTextSpaceForLayout(layout) : current;
  }
  return "";
}

function textVerticalAlignForLayout(layout) {
  switch (normalizeLayout(layout)) {
    case "overlay-centered":
    case "overlay-left":
    case "overlay-right":
    case "overlay-top":
    case "overlay-bottom":
    case "single-overlay-top":
    case "single-overlay-bottom":
      return "center";
    default:
      return DEFAULT_PAGE_TEXT_VERTICAL;
  }
}

function textHorizontalAlignForLayout(layout) {
  switch (normalizeLayout(layout)) {
    case "overlay-centered":
    case "overlay-left":
    case "overlay-right":
    case "overlay-top":
    case "overlay-bottom":
    case "single-overlay-top":
    case "single-overlay-bottom":
      return "center";
    default:
      return DEFAULT_PAGE_TEXT_HORIZONTAL;
  }
}

function overlayPlacementClass(horizontal, vertical) {
  const h = normalizeTextHorizontalAlign(horizontal);
  const v = normalizeTextVerticalAlign(vertical);
  return `overlay-pos-${v}-${h}`;
}

function overlayPlacementClassForLayout(layout) {
  switch (normalizeLayout(layout)) {
    case "overlay-left":
      return overlayPlacementClass("left", "center");
    case "overlay-right":
      return overlayPlacementClass("right", "center");
    case "single-overlay-top":
    case "overlay-top":
      return overlayPlacementClass("center", "top");
    case "single-overlay-bottom":
    case "overlay-bottom":
      return overlayPlacementClass("center", "bottom");
    case "overlay-centered":
    default:
      return overlayPlacementClass("center", "center");
  }
}

function legacyOverlayAlignments(layout) {
  const value = String(layout || "").trim();
  switch (value) {
    case "overlay-left":
      return { horizontal: "left", vertical: "center" };
    case "overlay-right":
      return { horizontal: "right", vertical: "center" };
    case "single-overlay-top":
    case "overlay-top":
      return { horizontal: "center", vertical: "top" };
    case "single-overlay-bottom":
    case "overlay-bottom":
      return { horizontal: "center", vertical: "bottom" };
    case "overlay-centered":
    default:
      return { horizontal: "center", vertical: "center" };
  }
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
    case "single-overlay-top":
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect class="layout-icon-page" x="3" y="3" width="18" height="18" rx="2"></rect>
          <rect class="layout-icon-image" x="5" y="5" width="14" height="14" rx="1.5"></rect>
          <rect class="layout-icon-text" x="7" y="6" width="10" height="5" rx="1.5"></rect>
        </svg>
      `;
    case "single-overlay-bottom":
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect class="layout-icon-page" x="3" y="3" width="18" height="18" rx="2"></rect>
          <rect class="layout-icon-image" x="5" y="5" width="14" height="14" rx="1.5"></rect>
          <rect class="layout-icon-text" x="7" y="13" width="10" height="5" rx="1.5"></rect>
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
    case "overlay-left":
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect class="layout-icon-image" x="3" y="3" width="18" height="18" rx="2"></rect>
          <rect class="layout-icon-text" x="5" y="7" width="6" height="10" rx="1.5"></rect>
        </svg>
      `;
    case "overlay-right":
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect class="layout-icon-image" x="3" y="3" width="18" height="18" rx="2"></rect>
          <rect class="layout-icon-text" x="13" y="7" width="6" height="10" rx="1.5"></rect>
        </svg>
      `;
    case "overlay-top":
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect class="layout-icon-image" x="3" y="3" width="18" height="18" rx="2"></rect>
          <rect class="layout-icon-text" x="7" y="5" width="10" height="5" rx="1.5"></rect>
        </svg>
      `;
    case "overlay-bottom":
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect class="layout-icon-image" x="3" y="3" width="18" height="18" rx="2"></rect>
          <rect class="layout-icon-text" x="7" y="14" width="10" height="5" rx="1.5"></rect>
        </svg>
      `;
    case "overlay-centered":
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect class="layout-icon-image" x="3" y="3" width="18" height="18" rx="2"></rect>
          <rect class="layout-icon-text" x="8" y="8" width="8" height="8" rx="1.5"></rect>
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
    case "portrait-8.5x11":
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
  return `
    <div class="layout-toolbar" role="toolbar" aria-label="Page layout"${pageAttr}>
      ${PAGE_LAYOUT_OPTIONS
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
  const options = ["landscape-10x8", "portrait-8x10", "portrait-8.5x11", "square-10x10"];
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

function renderPreviewLayoutToolbar(activeLayout, pageId = "", layoutOptions = PAGE_LAYOUT_OPTIONS) {
  const pageAttr = pageId ? ` data-page-id="${escapeHtml(pageId)}"` : "";
  return `
    <div class="page-preview-layout-toolbar" role="toolbar" aria-label="Page layout"${pageAttr}>
      ${layoutOptions.map((layout) => {
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

function renderPreviewTextHorizontalToolbarCompact(activeValue, pageId = "") {
  const pageAttr = pageId ? ` data-page-id="${escapeHtml(pageId)}"` : "";
  return `
    <div class="page-preview-text-horizontal-toolbar page-preview-text-horizontal-compact" role="toolbar" aria-label="Text horizontal position"${pageAttr}>
      ${PAGE_TEXT_HORIZONTAL_OPTIONS.map((choice) => {
        const selected = normalizeTextHorizontalAlign(activeValue) === choice ? " is-active" : "";
        const label = choice === "left" ? "Left" : choice === "right" ? "Right" : "Center";
        return `
          <button
            class="text-horizontal-button${selected}"
            type="button"
            data-text-horizontal-choice="${choice}"
            ${pageId ? `data-page-id="${escapeHtml(pageId)}"` : ""}
            aria-pressed="${normalizeTextHorizontalAlign(activeValue) === choice ? "true" : "false"}"
            title="${escapeHtml(`${label} align`)}"
            aria-label="${escapeHtml(`${label} align`)}"
          >
            ${textHorizontalIcon(choice)}
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function renderPreviewTextScaleToolbarCompact(book, page, pageId = "") {
  const pageAttr = pageId ? ` data-page-id="${escapeHtml(pageId)}"` : "";
  const pointLabel = fontPointLabel(book, page);
  return `
    <div class="page-preview-text-scale-toolbar page-preview-text-scale-compact" role="toolbar" aria-label="Text size controls"${pageAttr}>
      <button class="ghost-button icon-button" type="button" data-font-point-step="-${FONT_POINT_STEP}" ${pageId ? `data-page-id="${escapeHtml(pageId)}"` : ""} aria-label="Decrease text size" title="Decrease text size">
        <svg class="icon-updown" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12h14" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2"/>
        </svg>
      </button>
      <output title="Target font size in the exported 300 DPI PDF">${pointLabel}</output>
      <button class="ghost-button icon-button" type="button" data-font-point-step="${FONT_POINT_STEP}" ${pageId ? `data-page-id="${escapeHtml(pageId)}"` : ""} aria-label="Increase text size" title="Increase text size">
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

function textHorizontalIcon(choice) {
  switch (choice) {
    case "center":
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect class="text-horizontal-frame" x="4" y="5" width="16" height="14" rx="2"></rect>
          <rect class="text-horizontal-block" x="8" y="9" width="8" height="6" rx="1.2"></rect>
        </svg>
      `;
    case "right":
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect class="text-horizontal-frame" x="4" y="5" width="16" height="14" rx="2"></rect>
          <rect class="text-horizontal-block" x="12" y="9" width="6" height="6" rx="1.2"></rect>
        </svg>
      `;
    case "left":
    default:
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect class="text-horizontal-frame" x="4" y="5" width="16" height="14" rx="2"></rect>
          <rect class="text-horizontal-block" x="6" y="9" width="6" height="6" rx="1.2"></rect>
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
      <button class="ghost-button icon-button" type="button" data-font-point-step="-${FONT_POINT_STEP}" ${pageId ? `data-page-id="${escapeHtml(pageId)}"` : ""} aria-label="Decrease text size" title="Decrease text size">
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
      <button class="ghost-button icon-button" type="button" data-font-point-step="${FONT_POINT_STEP}" ${pageId ? `data-page-id="${escapeHtml(pageId)}"` : ""} aria-label="Increase text size" title="Increase text size">
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
  if (hasTextOutsideTextSlots(book)) {
    reflowManuscriptTextIntoTextSlots(book);
    touchBook(book);
    saveState();
  }
  const page = activePage();
  refs.projectTitle.value = book.projectTitle;
  refs.authorSelect.value = book.authorName || "";
  refs.newAuthorName.value = "";
  refs.printSizeSelect.value = normalizePrintSize(book.printSize);
  refs.printSizeToolbar.innerHTML = renderPrintSizeToolbar(book.printSize);
  refs.backCoverSummary.value = book.backCoverSummary || "";
  refs.audienceSelect.value = book.audience || "3-8";
  syncPageCountControl(book);
  refs.storyManuscript.value = book.manuscript || "";
  refs.buildPagesButton.textContent = book.pages.length ? "Rebuild page drafts" : "Create page drafts";
  refs.sceneDescription.value = page.sceneDescription;
  refs.pageCharacters.value = page.characters;
  refs.pageSetting.value = page.setting;
  refs.pageMood.value = page.mood;
  refs.pageLighting.value = page.lighting;
  refs.textSpace.value = resolvedTextSpaceForPage(page);
  refs.composition.value = page.composition;
  if (refs.activePageLabel) refs.activePageLabel.textContent = `Page ${page.number}`;
  refs.promptOutput.value = page.prompt || "";
  refs.updatePromptButton.disabled = false;
  refs.copyPromptButton.disabled = !page.prompt;
  refs.deletePageButton.disabled = book.pages.length <= 1;
  if (refs.publishBookButton) {
    refs.publishBookButton.disabled = !book.pages.length || bookPublishing;
    refs.publishBookButton.textContent = bookPublishing ? "Publishing..." : "Publish";
    refs.publishBookButton.classList.toggle("is-loading", bookPublishing);
    refs.publishBookButton.setAttribute("aria-busy", bookPublishing ? "true" : "false");
  }

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
  const isGroupReference = parseBool(character.isGroupReference ?? character.is_group_reference);
  return {
    name: String(character.name || "").trim(),
    role: String(character.role || character.characterRole || "").trim(),
    isGroupReference,
    groupMembers: Array.isArray(character.groupMembers)
      ? character.groupMembers.map((item) => String(item).trim()).filter(Boolean)
      : String(character.groupMembers || character.group_members || "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
    visualTraits: isGroupReference ? "" : String(character.visualTraits || character.visual_traits || "").trim(),
    birthState: isGroupReference ? "" : String(character.birthState || character.birth_state || "").trim(),
    distinctiveAnatomy: isGroupReference ? "" : String(character.distinctiveAnatomy || character.distinctive_anatomy || "").trim(),
    expressionPose: String(character.expressionPose || character.expression_pose || "").trim(),
    styleNotes: String(character.styleNotes || character.style_notes || "").trim(),
    personality: isGroupReference ? "" : String(character.personality || "").trim(),
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

function syncPageCountControl(book = activeBook()) {
  const autoPageCount = automaticPageCount(book.manuscript, book.audience);
  refs.suggestedPageCount.value = book.suggestedPageCount || autoPageCount;
  refs.suggestedPageCount.title = book.suggestedPageCount
    ? `Fixed at ${book.suggestedPageCount} pages. Rebuild page drafts to rebalance the manuscript.`
    : `Auto-calculated as ${autoPageCount} pages for this audience. Type a number to set a fixed target.`;
  if (refs.pageCountLabel) {
    refs.pageCountLabel.textContent = book.suggestedPageCount ? "Page count (Fixed)" : "Page count (Auto)";
  }
}

function setCharacterGroupFieldVisibility(isGroupReference) {
  const fields = [
    refs.characterEditorVisualTraits,
    refs.characterEditorBirthState,
    refs.characterEditorDistinctiveAnatomy,
  ];
  for (const input of fields) {
    const wrapper = input?.closest("label.field");
    if (!wrapper) continue;
    const shouldHide = Boolean(isGroupReference);
    wrapper.hidden = shouldHide;
    wrapper.style.display = shouldHide ? "none" : "";
  }
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
    visualTraits: normalized.isGroupReference ? "" : normalized.visualTraits,
    birthState: normalized.isGroupReference ? "" : normalized.birthState,
    distinctiveAnatomy: normalized.isGroupReference ? "" : normalized.distinctiveAnatomy,
    expressionPose: normalized.expressionPose,
    styleNotes: normalized.styleNotes,
    personality: normalized.isGroupReference ? "" : normalized.personality,
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
  const isGroupReference = Boolean(draft.isGroupReference);
  refs.characterEditorName.value = draft.name || "";
  refs.characterEditorRole.value = draft.role || "";
  if (refs.characterEditorIsGroupReference) refs.characterEditorIsGroupReference.checked = Boolean(draft.isGroupReference);
  if (refs.characterEditorGroupMembers) refs.characterEditorGroupMembers.value = Array.isArray(draft.groupMembers) ? draft.groupMembers.join(", ") : "";
  setCharacterGroupFieldVisibility(isGroupReference);
  if (refs.characterEditorVisualTraits) refs.characterEditorVisualTraits.value = isGroupReference ? "" : (draft.visualTraits || "");
  if (refs.characterEditorBirthState) refs.characterEditorBirthState.value = isGroupReference ? "" : (draft.birthState || "");
  if (refs.characterEditorDistinctiveAnatomy) refs.characterEditorDistinctiveAnatomy.value = isGroupReference ? "" : (draft.distinctiveAnatomy || "");
  refs.characterEditorExpressionPose.value = draft.expressionPose || "";
  refs.characterEditorStyleNotes.value = draft.styleNotes || "";
  if (refs.characterEditorPersonality) refs.characterEditorPersonality.value = isGroupReference ? "" : (draft.personality || "");
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
  refs.fullBookPreview.querySelector(".page-slider-card.is-focused")?.scrollIntoView({
    behavior: "auto",
    block: "nearest",
    inline: "center",
  });
}

function renderBookPreview() {
  renderFullBookPreview();
  syncMissingPageImageDimensions(activeBook());
}

const pendingImageDimensionLoads = new Set();

function syncMissingPageImageDimensions(book) {
  const pages = Array.isArray(book?.pages) ? book.pages : [];
  pages
    .filter((page) => page?.imageUrl && (!Number(page.imageNaturalWidth) || !Number(page.imageNaturalHeight)))
    .forEach((page) => {
      const key = `${page.id}:${page.imageUrl}`;
      const resolvedPageUrl = (() => {
        try {
          return new URL(page.imageUrl, window.location.href).href;
        } catch {
          return String(page.imageUrl || "");
        }
      })();
      if (pendingImageDimensionLoads.has(key)) return;
      pendingImageDimensionLoads.add(key);
      const image = new Image();
      image.onload = () => {
        pendingImageDimensionLoads.delete(key);
        if (resolvedPageUrl !== image.src) return;
        const nextWidth = image.naturalWidth || 0;
        const nextHeight = image.naturalHeight || 0;
        if (!nextWidth || !nextHeight) return;
        if (page.imageNaturalWidth === nextWidth && page.imageNaturalHeight === nextHeight) return;
        page.imageNaturalWidth = nextWidth;
        page.imageNaturalHeight = nextHeight;
        touchActiveBook();
        saveState();
        renderBookPreview();
      };
      image.onerror = () => {
        pendingImageDimensionLoads.delete(key);
      };
      image.src = page.imageUrl;
    });
}

function pagePreviewStyle(book, page) {
  return `--page-text-font:${fontStack(page.fontPreset).replace(/"/g, "&quot;")};--page-text-scale:${effectiveTextScale(book, page)};--page-text-ratio:${previewFontWidthRatio(book, page)};--page-text-points:${exportFontPointSize(book, page)};--page-image-scale:${normalizeImageScale(page.imageScale)};--page-image-offset-x:${normalizeImageOffset(page.imageOffsetX)};--page-image-offset-y:${normalizeImageOffset(page.imageOffsetY)};--page-text-justify:${textVerticalJustify(page.textVerticalAlign)};`;
}

function pageImageStyle(page) {
  const imageScale = Math.max(normalizeImageScale(page.imageScale), imageMinimumScale(page));
  const imageOffsetX = normalizeImageOffset(page.imageOffsetX);
  const imageOffsetY = normalizeImageOffset(page.imageOffsetY);
  const naturalWidth = Number(page.imageNaturalWidth) || 0;
  const naturalHeight = Number(page.imageNaturalHeight) || 0;
  const centerForAxis = (offset, renderedScale) => {
    if (renderedScale <= 1) return "50%";
    const edgeLimit = (renderedScale * 100) / 2;
    return `clamp(calc(100% - ${edgeLimit}%), calc(50% + ${offset}px), ${edgeLimit}%)`;
  };
  if (naturalWidth > 0 && naturalHeight > 0) {
    const frameAspect = printSizeAspect(page.printSize);
    const sourceAspect = naturalWidth / naturalHeight;
    const widthScale = (sourceAspect > frameAspect ? sourceAspect / frameAspect : 1) * imageScale;
    const heightScale = (sourceAspect > frameAspect ? 1 : frameAspect / sourceAspect) * imageScale;
    const left = centerForAxis(imageOffsetX, widthScale);
    const top = centerForAxis(imageOffsetY, heightScale);
    if (sourceAspect > frameAspect) {
      return `left:${left};top:${top};width:calc(100% * ${widthScale});height:calc(100% * ${heightScale});max-width:none;max-height:none;transform:translate(-50%,-50%);object-fit:cover;object-position:center center;`;
    }
    return `left:${left};top:${top};width:calc(100% * ${widthScale});height:calc(100% * ${heightScale});max-width:none;max-height:none;transform:translate(-50%,-50%);object-fit:cover;object-position:center center;`;
  }
  const fallbackScale = Math.max(1, imageScale);
  return `left:${centerForAxis(imageOffsetX, fallbackScale)};top:${centerForAxis(imageOffsetY, fallbackScale)};width:calc(100% * ${fallbackScale});height:calc(100% * ${fallbackScale});max-width:none;max-height:none;transform:translate(-50%,-50%);object-fit:cover;object-position:center center;`;
}

function imageMinimumScale(page) {
  return DEFAULT_IMAGE_SCALE;
}

function renderPageImageMarkup(page, isGeneratingPage) {
  const imageStyle = pageImageStyle(page);
  return `
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
}

function renderPageTextMarkup(book, page, className = "mini-text-preview") {
  const text = page.text.trim();
  const textFontStyle = `font-family:${fontStack(page.fontPreset).replace(/"/g, "&quot;")};`;
  const textScaleStyle = `font-size:calc(var(--page-text-ratio) * 100cqw);`;
  const textJustifyStyle = `justify-content:${textVerticalJustify(page.textVerticalAlign)};`;
  const textAlignStyle = `text-align:${normalizeTextHorizontalAlign(page.textHorizontalAlign)};`;
  const textEditorAttrs = `contenteditable="true" spellcheck="true" role="textbox" aria-label="Edit page text" data-inline-page-text-editor="true" data-page-id="${escapeHtml(page.id)}" data-placeholder="Click to edit page text"`;
  return `<div class="${className} inline-page-text-editor${text ? "" : " is-empty"}" ${textEditorAttrs} style="${textFontStyle}${textScaleStyle}${textJustifyStyle}${textAlignStyle}">${text ? escapeHtml(text) : ""}</div>`;
}

function renderPageActions(book, page, isGeneratingPage) {
  const hasExistingImages = normalizeGeneratedImageLibrary(book.imageLibrary, book.pages).length > 0;
  const isPickerOpen = openGeneratedImagePickerPageIds.has(page.id);
  return `
    <div class="full-book-page-action-row">
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
      <button
        class="ghost-button icon-button"
        type="button"
        data-toggle-generated-image-picker="${escapeHtml(page.id)}"
        aria-label="Select from existing images"
        title="Select from existing images"
        aria-expanded="${isPickerOpen ? "true" : "false"}"
        ${hasExistingImages ? "" : "disabled"}
      >
        <svg class="icon-updown" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="5" width="14" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
          <path d="M6 14l3-3 2.5 2.5 2-2L17 15M8 9h.01M19 8h2v11a2 2 0 0 1-2 2H7v-2" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
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
  `;
}

function renderGeneratedImagePicker(book, page) {
  const images = normalizeGeneratedImageLibrary(book.imageLibrary, book.pages);
  if (!images.length) {
    return `<span class="generated-image-picker-empty">Generated images will appear here.</span>`;
  }
  const thumbnails = images
    .map((image, index) => {
      const isSelected = image.imageUrl === page.imageUrl;
      const sourceLabel = image.sourcePageNumber ? `Page ${image.sourcePageNumber}` : `Image ${index + 1}`;
      return `
        <div class="generated-image-thumbnail-shell">
          <button
            class="generated-image-thumbnail${isSelected ? " is-selected" : ""}"
            type="button"
            data-use-generated-image-id="${escapeHtml(image.id)}"
            data-target-page-id="${escapeHtml(page.id)}"
            aria-label="Use generated image ${index + 1} on page ${page.number}"
            aria-pressed="${isSelected ? "true" : "false"}"
            title="Use ${escapeHtml(image.fileName || sourceLabel)}"
          >
            <img src="${escapeHtml(image.imageUrl)}" alt="" loading="lazy" />
            <span>${escapeHtml(sourceLabel)}</span>
          </button>
          <button
            class="generated-image-thumbnail-delete"
            type="button"
            data-delete-generated-image-id="${escapeHtml(image.id)}"
            aria-label="Delete generated image ${index + 1}"
            title="Delete ${escapeHtml(image.fileName || sourceLabel)}"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
      `;
    })
    .join("");
  return `
    <div class="generated-image-picker" data-generated-image-picker="${escapeHtml(page.id)}"${openGeneratedImagePickerPageIds.has(page.id) ? "" : " hidden"}>
      <div class="generated-image-thumbnail-grid" aria-label="Generated image choices">
        ${thumbnails}
      </div>
    </div>
  `;
}

function renderFullBookPageCard(book, page, activeGeneratingPageId, spreadRole = "") {
  const layout = normalizeLayout(page.layout);
  const pageStyle = pagePreviewStyle(book, page);
  const isGeneratingPage = activeGeneratingPageId === page.id;
  const overlayPlacement = overlayPlacementClassForLayout(page.layout);
  const imageMarkup = renderPageImageMarkup(page, isGeneratingPage);
  const textMarkup = renderPageTextMarkup(book, page);
  const stackClass = layout === "stacked-text-top" ? "stack-text-top" : "stack-image-top";
  const body = spreadRole === "text"
      ? `<div class="mini-single-page mini-single-page-text">${textMarkup}</div>`
      : spreadRole === "image"
      ? `<div class="mini-single-page mini-single-page-image">${imageMarkup}</div>`
      : layoutMode(layout) === "spread"
      ? `<div class="mini-spread">
          <div class="mini-spread-side">${layout === "spread-text-left" ? textMarkup : imageMarkup}</div>
          <div class="mini-spread-spine"></div>
          <div class="mini-spread-side">${layout === "spread-text-left" ? imageMarkup : textMarkup}</div>
        </div>`
      : isOverlayLayout(layout)
      ? `<div class="mini-overlay ${overlayPlacement}">
          ${imageMarkup}
          ${renderPageTextMarkup(book, page, "mini-overlay-text")}
        </div>`
      : layout === "stacked-text-top"
      ? `<div class="mini-stack ${stackClass}">${textMarkup}${imageMarkup}</div>`
      : `<div class="mini-stack ${stackClass}">${imageMarkup}${textMarkup}</div>`;
  return `
    <article class="full-book-page layout-${layout}" data-page-id="${escapeHtml(page.id)}" style="${pageStyle}">
      ${body}
    </article>
  `;
}

function selectedPreviewPages(book) {
  selectedPreviewPageIds = normalizeSelectedPreviewPageIds(selectedPreviewPageIds, book);
  state.selectedPreviewPageIds = [...selectedPreviewPageIds];
  let pages = selectedPreviewPageIds
    .map((id) => book.pages.find((page) => page.id === id))
    .filter(Boolean)
    .sort((a, b) => a.number - b.number);
  if (pages.length === 2 && !areFacingPages(book, pages[0], pages[1])) {
    pages = [pages.find((page) => page.id === book.activePageId) || pages[0]];
    selectedPreviewPageIds = pages.map((page) => page.id);
    state.selectedPreviewPageIds = [...selectedPreviewPageIds];
  }
  return pages;
}

function normalizeSelectedPreviewPageIds(value, book) {
  const pages = Array.isArray(book?.pages) ? book.pages : [];
  const validIds = [...new Set((Array.isArray(value) ? value : []).filter((id) => pages.some((page) => page.id === id)))].slice(0, 2);
  if (!validIds.length) {
    const fallbackId = book?.activePageId || pages[0]?.id || "";
    return fallbackId ? [fallbackId] : [];
  }
  if (validIds.length === 2) {
    const selectedPages = validIds
      .map((id) => pages.find((page) => page.id === id))
      .filter(Boolean)
      .sort((a, b) => a.number - b.number);
    if (selectedPages.length === 2 && !areFacingPages(book, selectedPages[0], selectedPages[1])) {
      const fallbackId = book?.activePageId || selectedPages[0]?.id || "";
      return fallbackId ? [fallbackId] : [];
    }
  }
  return validIds;
}

function areFacingPages(book, firstPage, secondPage) {
  const firstIndex = book.pages.findIndex((page) => page.id === firstPage?.id);
  const secondIndex = book.pages.findIndex((page) => page.id === secondPage?.id);
  const leftIndex = Math.min(firstIndex, secondIndex);
  const rightIndex = Math.max(firstIndex, secondIndex);
  return leftIndex >= 0 && leftIndex % 2 === 0 && rightIndex === leftIndex + 1;
}

function resetTwoPageLayouts(pageIds) {
  const book = activeBook();
  pageIds.forEach((pageId) => {
    const page = book.pages.find((item) => item.id === pageId);
    if (!page || !TWO_PAGE_LAYOUT_OPTIONS.includes(normalizeLayout(page.layout))) return;
    page.layout = DEFAULT_PAGE_LAYOUT;
    page.textSpace = defaultTextSpaceForLayout(page.layout);
  });
}

function renderContextualPreviewToolbar(book, pages) {
  const targetPages = pages.filter(Boolean);
  const pageIds = targetPages.map((page) => page.id).join(",");
  const sourcePage = targetPages.find((page) => page.id === book.activePageId) || targetPages[0] || defaultPage();
  const isPair = targetPages.length === 2;
  const layoutPage = isPair ? targetPages[0] : sourcePage;
  const layout = normalizeLayout(layoutPage.layout);
  const spreadLayout = isPair && layoutMode(layout) === "spread";
  const imagePage = spreadLayout
    ? (spreadTextSide(layout) === "right" ? targetPages[0] : targetPages[1])
    : sourcePage;
  const imagePageId = escapeHtml(imagePage.id);
  const layoutOptions = isPair ? TWO_PAGE_LAYOUT_OPTIONS : SINGLE_PAGE_LAYOUT_OPTIONS;
  const hasImage = targetPages.some((page) => page.imageUrl);
  const isGeneratingSourcePage = state.isGenerating && (state.generatingPageId || book.activePageId) === imagePage.id;
  return `
    <section class="contextual-page-toolbar" data-page-id="${escapeHtml(pageIds)}">
      <div class="contextual-page-toolbar-head">
        <strong>${isPair ? `Pages ${targetPages[0].number} + ${targetPages[1].number}` : `Page ${sourcePage.number}`}</strong>
        <span>${isPair ? "Two-page layouts unlocked" : "Select one more page for spread layouts"}</span>
      </div>
      <div class="contextual-toolbar-section">
        <span class="contextual-toolbar-label">Layout</span>
        ${renderPreviewLayoutToolbar(layout, pageIds, layoutOptions)}
      </div>
      <div class="contextual-toolbar-section">
        <span class="contextual-toolbar-label">Text</span>
        ${renderPreviewFontToolbar(sourcePage.fontPreset, pageIds)}
        ${renderPreviewTextVerticalToolbarCompact(sourcePage.textVerticalAlign, pageIds)}
        ${renderPreviewTextHorizontalToolbarCompact(sourcePage.textHorizontalAlign, pageIds)}
        ${renderPreviewTextScaleToolbarCompact(book, sourcePage, pageIds)}
        <button
          class="primary-button apply-text-style-all-button"
          type="button"
          data-apply-text-style-all="${escapeHtml(sourcePage.id)}"
          title="Use this font, size, and alignment on every page"
        >
          Apply to all pages
        </button>
      </div>
      <div class="contextual-toolbar-section">
        <span class="contextual-toolbar-label">Image</span>
        ${renderPageActions(book, imagePage, isGeneratingSourcePage)}
        <div class="page-image-nudge-group">
          <button class="ghost-button icon-button page-image-nudge-button" type="button" data-page-id="${imagePageId}" data-image-nudge="up" aria-label="Move image up" title="Move image up"${hasImage ? "" : " disabled"}>&#8593;</button>
          <button class="ghost-button icon-button page-image-nudge-button" type="button" data-page-id="${imagePageId}" data-image-nudge="left" aria-label="Move image left" title="Move image left"${hasImage ? "" : " disabled"}>&#8592;</button>
          <button class="ghost-button icon-button page-image-nudge-button" type="button" data-page-id="${imagePageId}" data-image-reset-position="true" aria-label="Center image" title="Center image"${hasImage ? "" : " disabled"}>&#10226;</button>
          <button class="ghost-button icon-button page-image-nudge-button" type="button" data-page-id="${imagePageId}" data-image-nudge="right" aria-label="Move image right" title="Move image right"${hasImage ? "" : " disabled"}>&#8594;</button>
          <button class="ghost-button icon-button page-image-nudge-button" type="button" data-page-id="${imagePageId}" data-image-nudge="down" aria-label="Move image down" title="Move image down"${hasImage ? "" : " disabled"}>&#8595;</button>
        </div>
        <div class="page-image-scale-group">
          <button class="ghost-button icon-button" type="button" data-page-id="${imagePageId}" data-image-scale-step="-0.12" aria-label="Scale image smaller" title="Scale image smaller"${hasImage ? "" : " disabled"}>&#8722;</button>
          <button class="ghost-button icon-button" type="button" data-page-id="${imagePageId}" data-image-scale-step="0.12" aria-label="Scale image larger" title="Scale image larger"${hasImage ? "" : " disabled"}>+</button>
        </div>
        ${renderGeneratedImagePicker(book, imagePage)}
      </div>
    </section>
  `;
}

function renderSelectedPairPreview(book, leftPage, rightPage, activeGeneratingPageId) {
  const layout = normalizeLayout(leftPage.layout);
  if (layoutMode(layout) === "spread") {
    const leftContent = layout === "spread-text-left"
      ? renderPageTextMarkup(book, leftPage)
      : renderPageImageMarkup(leftPage, activeGeneratingPageId === leftPage.id);
    const rightContent = layout === "spread-text-left"
      ? renderPageImageMarkup(rightPage, activeGeneratingPageId === rightPage.id)
      : renderPageTextMarkup(book, rightPage);
    return `<div class="selected-pair-preview mini-spread" style="${pagePreviewStyle(book, leftPage)}">
      <div class="mini-spread-side">${leftContent}</div>
      <div class="mini-spread-spine"></div>
      <div class="mini-spread-side">${rightContent}</div>
    </div>`;
  }
  if (layoutMode(layout) !== "overlay") return "";
  const textSide = spreadTextSide(layout);
  const textPage = textSide === "right" && rightPage ? rightPage : leftPage;
  const imagePage = [leftPage, rightPage].find((page) => page?.imageUrl) || leftPage;
  const isGeneratingImage = [leftPage, rightPage].some((page) => page && activeGeneratingPageId === page.id);
  const imageMarkup = imagePage.imageUrl || isGeneratingImage
    ? renderPageImageMarkup(imagePage, isGeneratingImage)
    : `<div class="page-art">
        <div class="page-art-empty-state">
          <span class="page-art-empty-state-label">Choose or generate one image in the toolbar for pages ${leftPage.number}-${rightPage.number}</span>
        </div>
      </div>`;
  const overlayPlacement = overlayPlacementClassForLayout(layout);
  const textPlacementClass = textSide === "right" ? "overlay-right" : layout === "overlay-right" ? "overlay-right" : "overlay-left";
  const previewStyle = `${pagePreviewStyle(book, textPage)}--page-image-scale:${normalizeImageScale(imagePage.imageScale)};--page-image-offset-x:${normalizeImageOffset(imagePage.imageOffsetX)};--page-image-offset-y:${normalizeImageOffset(imagePage.imageOffsetY)};`;

  return `
    <div class="selected-pair-preview full-book-spread-overlay-preview ${overlayPlacement} ${textPlacementClass}" style="${previewStyle}">
      ${imageMarkup}
      <div class="full-book-spread-spine" aria-hidden="true"></div>
      ${renderPageTextMarkup(book, textPage, "mini-overlay-text")}
    </div>
  `;
}

function renderFullBookPreviewMarkup(book) {
  const activeGeneratingPageId = state.isGenerating ? state.generatingPageId || activeBook().activePageId : "";
  const selectedPages = selectedPreviewPages(book);
  const selectedIds = new Set(selectedPages.map((page) => page.id));
  const pageCards = [];
  for (let pageIndex = 0; pageIndex < book.pages.length; pageIndex += 1) {
    const page = book.pages[pageIndex];
    const nextPage = book.pages[pageIndex + 1];
    const isFocused = page.id === book.activePageId;
    const isSelected = selectedIds.has(page.id);
    let spreadRole = "";
    const linkedPairStartIndex = pageIndex % 2 === 0 ? pageIndex : pageIndex - 1;
    const linkedLeftPage = book.pages[linkedPairStartIndex];
    const linkedRightPage = book.pages[linkedPairStartIndex + 1];
    const isInLinkedPair = Boolean(linkedLeftPage && linkedRightPage)
      && hasLinkedPagePair(book, linkedLeftPage.id, linkedRightPage.id);
    if (isInLinkedPair) {
      const pairLayout = normalizeLayout(linkedLeftPage.layout);
      const isLeftPage = page.id === linkedLeftPage.id;
      if (layoutMode(pairLayout) === "spread") {
        spreadRole = pairLayout === "spread-text-left"
          ? (isLeftPage ? "text" : "image")
          : (isLeftPage ? "image" : "text");
      } else if (layoutMode(pairLayout) === "overlay") {
        const textPage = spreadTextSide(pairLayout) === "right" ? linkedRightPage : linkedLeftPage;
        spreadRole = page.id === textPage.id ? "text" : "image";
      }
    } else if (selectedPages.length === 2 && isSelected) {
      const pairLayout = normalizeLayout(selectedPages[0].layout);
      if (layoutMode(pairLayout) === "spread") {
        const isLeftPage = page.id === selectedPages[0].id;
        spreadRole = pairLayout === "spread-text-left"
          ? (isLeftPage ? "text" : "image")
          : (isLeftPage ? "image" : "text");
      } else if (layoutMode(pairLayout) === "overlay") {
        const textPage = spreadTextSide(pairLayout) === "right" ? selectedPages[1] : selectedPages[0];
        spreadRole = page.id === textPage.id ? "text" : "image";
      }
    }
    const isFacingPairStart = Boolean(nextPage) && page.number % 2 === 1 && nextPage.number === page.number + 1;
    const pairIsLinked = isFacingPairStart && hasLinkedPagePair(book, page.id, nextPage.id);
    const pairLinkButton = isFacingPairStart
      ? `
        <button
          class="page-pair-link-button${pairIsLinked ? " is-active" : ""}"
          type="button"
          data-link-preview-pages="${escapeHtml(`${page.id},${nextPage.id}`)}"
          aria-pressed="${pairIsLinked}"
          title="${pairIsLinked ? `Unlink pages ${page.number}-${nextPage.number}` : `Link pages ${page.number}-${nextPage.number}`}"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9.5 14.5l5-5M7.2 16.8l-1 1a3 3 0 0 1-4.2-4.2l3.1-3.1a3 3 0 0 1 4.2 0M16.8 7.2l1-1a3 3 0 1 1 4.2 4.2l-3.1 3.1a3 3 0 0 1-4.2 0" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2"/>
          </svg>
          <span>${page.number}-${nextPage.number}</span>
        </button>
      `
      : "";
    const card = `
      <article
        class="page-slider-card${isFocused ? " is-focused" : ""}${isSelected ? " is-selected" : ""}"
        data-page-id="${escapeHtml(page.id)}"
      >
        <div class="page-slider-card-head">
          <div class="page-slider-card-head-row">
            <button
              class="page-slider-card-focus"
              type="button"
              data-focus-preview-page="${escapeHtml(page.id)}"
              aria-label="Focus page ${page.number}"
            >
              <strong>Page ${page.number}</strong>
              <span>${escapeHtml(layoutLabel(page.layout))}</span>
            </button>
            <button
              class="page-selection-toggle${isSelected ? " is-active" : ""}"
              type="button"
              data-toggle-preview-selection="${escapeHtml(page.id)}"
              aria-pressed="${isSelected}"
              title="${isSelected ? "Remove page from layout selection" : "Select page for layout"}"
            >
              ${isSelected ? "Selected" : "Select"}
            </button>
            ${pairLinkButton}
          </div>
        </div>
        <div class="page-slider-card-body">
          ${renderFullBookPageCard(book, page, activeGeneratingPageId, spreadRole)}
        </div>
      </article>
    `;
    pageCards.push(card);
  }
  return `
    <div class="full-book-preview-head">
      <div class="full-book-preview-head-copy">
        <strong>${escapeHtml(book.projectTitle || "Untitled Book")}</strong>
        <span>${book.pages.length} pages</span>
      </div>
    </div>
    ${renderContextualPreviewToolbar(book, selectedPages)}
    <div class="full-book-preview-list page-slider" aria-label="Book pages">
      ${pageCards.join("")}
    </div>
  `;
}

function updateActivePage(values) {
  updatePageById(activePage().id, values);
}

function pageIdsFromControl(control, fallbackPageId = activePage().id) {
  const raw = control?.dataset?.pageId || control?.closest?.("[data-page-id]")?.dataset?.pageId || fallbackPageId;
  const ids = String(raw || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  return ids.length ? ids : [fallbackPageId];
}

function updatePageById(pageId, values) {
  const book = activeBook();
  const page = book.pages.find((item) => item.id === pageId);
  if (!page) return;
  Object.assign(page, values);
  if (isOverlayLayout(page.layout)) {
    page.textSpace = resolvedTextSpaceForPage(page);
  } else {
    page.textSpace = "";
  }
  book.activePageId = pageId;
  touchActiveBook();
  saveState();
  renderPageList();
  renderBookPreview();
}

function updatePagesByIds(pageIds, valuesForPage) {
  const book = activeBook();
  const ids = Array.isArray(pageIds) ? pageIds : [pageIds];
  let firstUpdatedPageId = "";
  ids.forEach((pageId) => {
    const page = book.pages.find((item) => item.id === pageId);
    if (!page) return;
    const values = typeof valuesForPage === "function" ? valuesForPage(page) : valuesForPage;
    Object.assign(page, values);
    if (isOverlayLayout(page.layout)) {
      page.textSpace = resolvedTextSpaceForPage(page);
    } else {
      page.textSpace = "";
    }
    if (!firstUpdatedPageId) firstUpdatedPageId = pageId;
  });
  if (!firstUpdatedPageId) return;
  book.activePageId = firstUpdatedPageId;
  touchActiveBook();
  saveState();
  renderPageList();
  renderBookPreview();
}

async function setPageImageFromFile(file, pageId = activePage().id) {
  const book = activeBook();
  const page = book.pages.find((item) => item.id === pageId) || activePage();
  setStatus("Preparing page image", "Resizing the uploaded image for this page.");
  const { dataUrl: imageDataUrl, width: naturalWidth, height: naturalHeight } = await resizeFileToDataUrl(file, 2400, 0.92);
  const previewUrl = imageDataUrl;
  revokeBlobUrl(page.imageUrl);
  Object.assign(page, {
    imageUrl: previewUrl,
    imageDataUrl,
    fileName: file.name,
    imageSource: "uploaded",
    imageScale: DEFAULT_IMAGE_SCALE,
    imageOffsetX: DEFAULT_IMAGE_OFFSET,
    imageOffsetY: DEFAULT_IMAGE_OFFSET,
    imageNaturalWidth: naturalWidth,
    imageNaturalHeight: naturalHeight,
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

function useGeneratedImageOnPage(imageId, pageId) {
  const book = activeBook();
  const page = book.pages.find((item) => item.id === pageId);
  const image = normalizeGeneratedImageLibrary(book.imageLibrary, book.pages).find((item) => item.id === imageId);
  if (!page || !image) return;
  book.imageLibrary = normalizeGeneratedImageLibrary(book.imageLibrary, book.pages);
  Object.assign(page, {
    imageUrl: image.imageUrl,
    imageDataUrl: image.imageDataUrl,
    fileName: image.fileName,
    imageSource: "generated",
    imageScale: DEFAULT_IMAGE_SCALE,
    imageOffsetX: DEFAULT_IMAGE_OFFSET,
    imageOffsetY: DEFAULT_IMAGE_OFFSET,
    imageNaturalWidth: Number(image.imageNaturalWidth) || 0,
    imageNaturalHeight: Number(image.imageNaturalHeight) || 0,
    prompt: image.prompt,
    notes: image.notes,
  });
  book.activePageId = page.id;
  touchActiveBook();
  saveState();
  setStatus("Generated image selected", `Page ${page.number} now uses ${image.fileName || "the selected illustration"}.`);
  render();
}

function deleteGeneratedImage(imageId, keepOpenPageId = "") {
  const book = activeBook();
  const images = normalizeGeneratedImageLibrary(book.imageLibrary, book.pages);
  const image = images.find((item) => item.id === imageId);
  if (!image) return;
  const imageLabel = image.fileName || `image from page ${image.sourcePageNumber || "the library"}`;
  const confirmed = window.confirm(`Move ${imageLabel} to the deleted folder? It will stay on disk but be removed from the active gallery and any pages using it.`);
  if (!confirmed) return;
  const imagePath = (() => {
    try {
      return new URL(image.imageUrl, window.location.href).pathname;
    } catch {
      return "";
    }
  })();
  if (!imagePath.startsWith("/outputs/")) {
    setStatus("Generated image move failed", "This image cannot be moved to the deleted folder.");
    return;
  }
  const nextLibrary = images.filter((item) => item.id !== imageId);
  const responsePromise = fetch(`/api/outputs?path=${encodeURIComponent(imagePath)}`, {
    method: "DELETE",
    headers: {
      Accept: "application/json",
    },
  });
  responsePromise
    .then(async (response) => {
      if (!response.ok) {
        let message = "Could not move the image file.";
        try {
          const result = await response.json();
          if (result?.error) message = result.error;
        } catch {
          /* ignore */
        }
        throw new Error(message);
      }
      const affectedPages = [];
      book.pages.forEach((page) => {
        if (page.imageUrl !== image.imageUrl) return;
        if (page.imageSource !== "generated") return;
        affectedPages.push(page.number);
        Object.assign(page, {
          imageUrl: "",
          imageDataUrl: "",
          fileName: "",
          imageSource: "",
          imageScale: DEFAULT_IMAGE_SCALE,
          imageOffsetX: DEFAULT_IMAGE_OFFSET,
          imageOffsetY: DEFAULT_IMAGE_OFFSET,
          imageNaturalWidth: 0,
          imageNaturalHeight: 0,
          prompt: "",
          notes: "",
        });
      });
      book.imageLibrary = nextLibrary;
      if (keepOpenPageId) {
        openGeneratedImagePickerPageIds.add(keepOpenPageId);
      }
      touchActiveBook();
      saveState();
      if (affectedPages.length) {
        setStatus("Generated image moved", `Moved ${imageLabel} to the deleted folder and cleared it from page${affectedPages.length > 1 ? "s" : ""} ${affectedPages.join(", ")}.`);
      } else {
        setStatus("Generated image moved", `Moved ${imageLabel} to the deleted folder.`);
      }
      render();
    })
    .catch((error) => {
      setStatus("Generated image move failed", error.message || "Could not move the image file.");
    });
}

function addGeneratedImageToLibrary(book, page, result, prompt, notes) {
  const nextImage = {
    id: makeId(),
    imageUrl: result.file_url,
    imageDataUrl: "",
    fileName: result.file_name,
    prompt,
    notes,
    sourcePageId: page.id,
    sourcePageNumber: page.number,
    imageNaturalWidth: Number(page.imageNaturalWidth) || 0,
    imageNaturalHeight: Number(page.imageNaturalHeight) || 0,
    createdAt: new Date().toISOString(),
  };
  book.imageLibrary = normalizeGeneratedImageLibrary([...(book.imageLibrary || []), nextImage], book.pages);
  return book.imageLibrary.find((image) => image.imageUrl === result.file_url) || nextImage;
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
    textHorizontalAlign: source.textHorizontalAlign,
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
  const resolvedTextSpace = promptTextSpaceForPage(page);
  if (!page.sceneDescription.trim() && !page.text.trim()) {
    setStatus("Missing page", "Add page text or illustration direction before generating.");
    return;
  }

  const approved = window.confirm("We will be charged 6 cents to generate this illustration. Continue?");
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
    text_space: resolvedTextSpace,
    text_horizontal_align: page.textHorizontalAlign,
    text_vertical_align: page.textVerticalAlign,
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

    const generatedPrompt = replacePromptTextArea(result.prompt, resolvedTextSpace);
    const generatedNotes = [
        `Model: ${result.model}`,
        `Output: ${result.file_name}`,
        `Layout: ${layoutLabel(page.layout)}`,
        result.response_id ? `Response id: ${result.response_id}` : null,
        result.cover_used ? "Cover reference: included" : "Cover reference: not provided",
      ]
        .filter(Boolean)
        .join("\n");
    const libraryImage = addGeneratedImageToLibrary(book, page, result, generatedPrompt, generatedNotes);
  Object.assign(page, {
    imageUrl: libraryImage.imageUrl,
    imageDataUrl: libraryImage.imageDataUrl,
    fileName: libraryImage.fileName,
    imageSource: "generated",
      imageScale: DEFAULT_IMAGE_SCALE,
      imageOffsetX: DEFAULT_IMAGE_OFFSET,
      imageOffsetY: DEFAULT_IMAGE_OFFSET,
      prompt: libraryImage.prompt,
      notes: libraryImage.notes,
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

async function updatePagePrompt(pageId = activePage().id) {
  const book = activeBook();
  const page = book.pages.find((item) => item.id === pageId) || activePage();
  const resolvedTextSpace = promptTextSpaceForPage(page);
  if (page.textSpace !== resolvedTextSpace) {
    page.textSpace = resolvedTextSpace;
  }
  const payload = {
    project_title: book.projectTitle,
    page_number: String(page.number),
    page_text: page.text,
    scene_description: page.sceneDescription || page.text,
    setting: page.setting,
    mood: page.mood,
    lighting: page.lighting,
    text_space: resolvedTextSpace,
    text_horizontal_align: page.textHorizontalAlign,
    text_vertical_align: page.textVerticalAlign,
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

  refs.updatePromptButton.disabled = true;
  refs.updatePromptButton.classList.add("is-loading");
  refs.updatePromptButton.textContent = "Updating...";
  refs.updatePromptButton.setAttribute("aria-busy", "true");
  setStatus("Updating prompt", `Refreshing the prompt for page ${page.number}.`);

  try {
    const response = await fetch("/api/generate-page-prompt", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "Prompt update failed.");
    }

    page.prompt = replacePromptTextArea(result.prompt, resolvedTextSpace);
    touchActiveBook();
    saveState();
    setStatus("Prompt updated", `Page ${page.number} prompt refreshed.`);
    render();
  } catch (error) {
    setStatus("Update failed", error.message || "Could not update the prompt.");
  } finally {
    refs.updatePromptButton.disabled = false;
    refs.updatePromptButton.classList.remove("is-loading");
    refs.updatePromptButton.textContent = "Update prompt";
    refs.updatePromptButton.removeAttribute("aria-busy");
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
  if (refs.publishBookButton) {
    refs.publishBookButton.disabled = true;
    refs.publishBookButton.textContent = "Publishing...";
    refs.publishBookButton.classList.add("is-loading");
    refs.publishBookButton.setAttribute("aria-busy", "true");
  }
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
    if (refs.publishBookButton) {
      refs.publishBookButton.disabled = !book.pages.length;
      refs.publishBookButton.textContent = "Publish";
      refs.publishBookButton.classList.remove("is-loading");
      refs.publishBookButton.removeAttribute("aria-busy");
    }
    renderBookPreview();
  }
}

async function generateActivePage() {
  return generatePageForId(activePage().id);
}

async function handleCoverFile(file) {
  const book = activeBook();
  setStatus("Preparing cover", "Resizing the cover locally for style reference.");
  const previewResult = await resizeFileToDataUrl(file, 900, 0.9);
  const referenceResult = await resizeFileToDataUrl(file, 1400, 0.9);
  book.coverFileName = file.name;
  book.coverPreviewUrl = previewResult.dataUrl;
  book.coverReferenceUrl = referenceResult.dataUrl;
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
        resolve({
          dataUrl: canvas.toDataURL("image/jpeg", quality),
          width: image.width,
          height: image.height,
        });
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
    visualTraits: draft.isGroupReference ? "" : (draft.visualTraits || ""),
    birthState: draft.isGroupReference ? "" : (draft.birthState || ""),
    distinctiveAnatomy: draft.isGroupReference ? "" : (draft.distinctiveAnatomy || ""),
    expressionPose: draft.expressionPose || "",
    styleNotes: draft.styleNotes || "",
    personality: draft.isGroupReference ? "" : (draft.personality || ""),
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
    payload.visual_traits = draft.isGroupReference ? "" : (draft.visualTraits || "");
    payload.birth_state = draft.isGroupReference ? "" : (draft.birthState || "");
    payload.distinctive_anatomy = draft.isGroupReference ? "" : (draft.distinctiveAnatomy || "");
    payload.expression_pose = draft.expressionPose || "";
    payload.style_notes = draft.styleNotes || "";
    payload.personality = draft.isGroupReference ? "" : (draft.personality || "");
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
  const result = await resizeFileToDataUrl(file, 1024, 0.9);
  if (!characterDraft) {
    setNewCharacterDraft();
  }
  characterDraft.seedImageDataUrl = result.dataUrl;
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
    const page = defaultPage(index + 1, defaultLayoutForAudience(book.audience));
    page.text = text;
    page.characters = inferCharacters(text);
    page.sceneDescription = buildSceneDirection(text, page.characters, book.audience);
    page.setting = "Use the story context to choose the clearest setting for this moment.";
    page.mood = inferMood(text);
    page.lighting = audienceLighting(book.audience);
    page.textSpace = defaultTextSpaceForLayout(page.layout);
    page.composition = audienceComposition(book.audience);
    return page;
  });
}

function renumberPages(book) {
  book.pages.forEach((page, index) => {
    page.number = index + 1;
  });
}

function textSlotPages(book) {
  const slots = [];
  for (let i = 0; i < book.pages.length; i += 2) {
    const leftPage = book.pages[i];
    const rightPage = book.pages[i + 1] || null;
    if (!leftPage) continue;
    const side = spreadTextSide(leftPage.layout);
    if (side === "both") {
      slots.push(leftPage);
      if (rightPage) slots.push(rightPage);
    } else if (side === "right" && rightPage) {
      slots.push(rightPage);
    } else {
      slots.push(leftPage);
    }
  }
  return slots;
}

function manuscriptTextBlocksFromBook(book) {
  const fromManuscript = extractPageTextsFromManuscript(book.manuscript);
  if (fromManuscript.length) return fromManuscript;
  return book.pages.map((page) => String(page.text || "").trim()).filter(Boolean);
}

function ensureTextSlotCapacity(book, textCount, layout = defaultLayoutForAudience(book.audience)) {
  while (textSlotPages(book).length < textCount) {
    const first = defaultPage(book.pages.length + 1, layout);
    const second = defaultPage(book.pages.length + 2, layout);
    book.pages.push(first, second);
  }
  renumberPages(book);
}

function reflowManuscriptTextIntoTextSlots(book, layout = defaultLayoutForAudience(book.audience)) {
  const texts = manuscriptTextBlocksFromBook(book);
  ensureTextSlotCapacity(book, texts.length, layout);
  const slotIds = new Set(textSlotPages(book).map((page) => page.id));
  let textIndex = 0;
  book.pages.forEach((page) => {
    if (slotIds.has(page.id)) {
      page.text = texts[textIndex] || "";
      textIndex += 1;
    } else {
      page.text = "";
    }
  });
  syncManuscriptFromPages(book);
}

function hasTextOutsideTextSlots(book) {
  const slotIds = new Set(textSlotPages(book).map((page) => page.id));
  return book.pages.some((page) => !slotIds.has(page.id) && String(page.text || "").trim());
}

function syncManuscriptFromPages(book) {
  const sections = textSlotPages(book)
    .filter((page) => String(page.text || "").trim())
    .map((page) => ({ number: page.number, text: page.text || "" }));
  book.manuscript = formatManuscriptWithPageBreaks(sections);
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

  ensureTextSlotCapacity(book, pageTexts.length);
  const slotIds = new Set(textSlotPages(book).map((page) => page.id));
  let textIndex = 0;
  book.pages.forEach((page) => {
    if (slotIds.has(page.id)) {
      page.text = pageTexts[textIndex] || "";
      textIndex += 1;
    } else {
      page.text = "";
    }
  });
  if (!book.pages.some((page) => page.id === book.activePageId)) {
    book.activePageId = book.pages[0]?.id || "";
  }
  syncManuscriptFromPages(book);
  return true;
}

function splitStoryIntoPages(text, audience, requestedCount) {
  const clean = stripPageBreakMarkers(text).replace(/\s+/g, " ").trim();
  const sentences = clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((item) => item.trim()).filter(Boolean) || [clean];
  const totalWords = countWords(clean);
  const autoCount = automaticPageCount(clean, audience);
  const requestedPageCount = Number.isFinite(requestedCount) && requestedCount > 0 ? requestedCount : autoCount;
  const pageCount = Math.max(1, Math.min(Math.round(requestedPageCount), Math.max(1, totalWords)));
  const units = [...sentences];

  while (units.length < pageCount) {
    let longestIndex = -1;
    let longestWordCount = 1;
    units.forEach((unit, index) => {
      const wordCount = countWords(unit);
      if (wordCount > longestWordCount) {
        longestIndex = index;
        longestWordCount = wordCount;
      }
    });
    if (longestIndex < 0) break;
    const words = units[longestIndex].split(/\s+/).filter(Boolean);
    const midpoint = Math.ceil(words.length / 2);
    units.splice(longestIndex, 1, words.slice(0, midpoint).join(" "), words.slice(midpoint).join(" "));
  }

  const pages = [];
  let unitIndex = 0;
  let remainingWords = totalWords;

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    const remainingPages = pageCount - pageIndex;
    if (remainingPages === 1) {
      pages.push(units.slice(unitIndex).join(" "));
      break;
    }

    const target = remainingWords / remainingPages;
    const maxUnitIndex = units.length - (remainingPages - 1);
    const current = [];
    let currentWords = 0;

    while (unitIndex < maxUnitIndex) {
      const unit = units[unitIndex];
      const unitWords = countWords(unit);
      const currentDistance = Math.abs(target - currentWords);
      const nextDistance = Math.abs(target - (currentWords + unitWords));
      if (current.length && nextDistance > currentDistance) break;
      current.push(unit);
      currentWords += unitWords;
      unitIndex += 1;
    }

    if (!current.length && unitIndex < maxUnitIndex) {
      const unit = units[unitIndex];
      current.push(unit);
      currentWords += countWords(unit);
      unitIndex += 1;
    }

    pages.push(current.join(" "));
    remainingWords -= currentWords;
  }

  return pages.filter(Boolean);
}

function automaticPageCount(text, audience) {
  const clean = stripPageBreakMarkers(text).replace(/\s+/g, " ").trim();
  if (!clean) return 1;
  return Math.max(1, Math.min(64, Math.ceil(countWords(clean) / wordsPerPage(audience))));
}

function stripPageBreakMarkers(text) {
  return String(text || "")
    .split(/\r?\n/)
    .filter((line) => !/^\s*(?:[-=_]{3,}\s*Page\s+\d+\s*[-=_]{3,}|[-=_]{8,})\s*$/.test(line))
    .join("\n");
}

function formatManuscriptWithPageBreaks(pageTexts) {
  const sections = pageTexts.map((entry, index) => {
    const isStructured = entry && typeof entry === "object";
    const number = isStructured ? entry.number || index + 1 : index + 1;
    const text = isStructured ? entry.text || "" : entry || "";
    return [`--- Page ${number} ---`, String(text).trim()].join("\n");
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

function replacePromptTextArea(prompt, textSpace) {
  const normalizedPrompt = String(prompt ?? "").trim();
  const resolvedTextSpace = String(textSpace ?? "").trim();
  if (!normalizedPrompt) return resolvedTextSpace ? `Text area: ${resolvedTextSpace}.` : "";
  const lines = normalizedPrompt.split("\n");
  const index = lines.findIndex((line) => /^Text area:/i.test(line.trim()));
  if (!resolvedTextSpace) {
    if (index >= 0) {
      lines.splice(index, 1);
    }
    return lines.join("\n").trim();
  }
  const replacement = `Text area: ${resolvedTextSpace}.`;
  if (index >= 0) {
    lines[index] = replacement;
    return lines.join("\n");
  }
  return `${normalizedPrompt}\n${replacement}`;
}

function promptTextSpaceForPage(page) {
  return resolvedTextSpaceForPage(page);
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
  syncPageCountControl();
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
  if (refs.pageCountLabel) {
    refs.pageCountLabel.textContent = event.target.value ? "Page count (Fixed)" : "Page count (Auto)";
  }
});

refs.suggestedPageCount.addEventListener("change", () => {
  syncPageCountControl();
});

refs.storyManuscript.addEventListener("input", (event) => {
  const book = activeBook();
  book.manuscript = event.target.value;
  syncPagesFromManuscript(book);
  touchActiveBook();
  saveState();
  if (!book.suggestedPageCount) syncPageCountControl(book);
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

refs.publishBookButton.addEventListener("click", () => {
  publishBook();
});

refs.fullBookPreview.addEventListener("click", (event) => {
  const pageId = event.target.closest(".full-book-page")?.dataset.pageId || activePage().id;
  const pairLinkButton = event.target.closest("[data-link-preview-pages]");
  if (pairLinkButton) {
    const pairIds = pairLinkButton.dataset.linkPreviewPages.split(",").filter(Boolean);
    const pairPages = pairIds.map((id) => activeBook().pages.find((page) => page.id === id));
    if (pairPages.length === 2 && areFacingPages(activeBook(), pairPages[0], pairPages[1])) {
      const alreadyLinked = hasLinkedPagePair(activeBook(), pairIds[0], pairIds[1]);
      if (alreadyLinked) resetTwoPageLayouts(pairIds);
      toggleLinkedPagePair(activeBook(), pairIds[0], pairIds[1]);
      selectedPreviewPageIds = [...pairIds];
      activeBook().activePageId = pairIds[0];
      saveState();
      render();
    }
    return;
  }
  const focusPageButton = event.target.closest("[data-focus-preview-page]");
  if (focusPageButton) {
    const focusPageId = focusPageButton.dataset.focusPreviewPage;
    activeBook().activePageId = focusPageId;
    selectedPreviewPageIds = previewSelectionForPage(activeBook(), focusPageId);
    saveState();
    render();
    return;
  }
  const selectionButton = event.target.closest("[data-toggle-preview-selection]");
  if (selectionButton) {
    const selectedPageId = selectionButton.dataset.togglePreviewSelection;
    const linkedSelection = previewSelectionForPage(activeBook(), selectedPageId);
    if (linkedSelection.length === 2) {
      selectedPreviewPageIds = linkedSelection;
      activeBook().activePageId = selectedPageId;
      saveState();
      render();
      return;
    }
    const wasSelected = selectedPreviewPageIds.includes(selectedPageId);
    const selectedPage = activeBook().pages.find((page) => page.id === selectedPageId);
    const currentPage = activeBook().pages.find((page) => page.id === selectedPreviewPageIds[0]);
    if (wasSelected) {
      selectedPreviewPageIds = selectedPreviewPageIds.filter((id) => id !== selectedPageId);
    } else {
      selectedPreviewPageIds = currentPage && areFacingPages(activeBook(), currentPage, selectedPage)
        ? [currentPage.id, selectedPage.id]
        : [selectedPageId];
    }
    if (!selectedPreviewPageIds.length) selectedPreviewPageIds = [selectedPageId];
    activeBook().activePageId = wasSelected ? selectedPreviewPageIds[0] : selectedPageId;
    saveState();
    render();
    return;
  }
  const imagePickerButton = event.target.closest("[data-toggle-generated-image-picker]");
  if (imagePickerButton) {
    const targetPageId = imagePickerButton.dataset.toggleGeneratedImagePicker;
    const picker = [...refs.fullBookPreview.querySelectorAll("[data-generated-image-picker]")].find(
      (item) => item.dataset.generatedImagePicker === targetPageId,
    );
    if (picker) {
      const willOpen = picker.hidden;
      picker.hidden = !willOpen;
      if (willOpen) {
        openGeneratedImagePickerPageIds.add(targetPageId);
      } else {
        openGeneratedImagePickerPageIds.delete(targetPageId);
      }
      imagePickerButton.setAttribute("aria-expanded", String(!picker.hidden));
      if (!picker.hidden) picker.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
    return;
  }
  const generatedImageButton = event.target.closest("[data-use-generated-image-id]");
  if (generatedImageButton) {
    useGeneratedImageOnPage(
      generatedImageButton.dataset.useGeneratedImageId,
      generatedImageButton.dataset.targetPageId || pageId,
    );
    return;
  }
  const deleteGeneratedImageButton = event.target.closest("[data-delete-generated-image-id]");
  if (deleteGeneratedImageButton) {
    deleteGeneratedImage(deleteGeneratedImageButton.dataset.deleteGeneratedImageId, pageId);
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
    const nextLayout = normalizeLayout(layoutButton.dataset.layoutChoice);
    const nextValues = { layout: nextLayout, textSpace: defaultTextSpaceForLayout(nextLayout) };
    updatePagesByIds(pageIdsFromControl(layoutButton, pageId), nextValues);
    touchActiveBook();
    saveState();
    renderPageList();
    render();
    return;
  }
  const fontButton = event.target.closest("[data-font-choice]");
  if (fontButton) {
    updatePagesByIds(pageIdsFromControl(fontButton, pageId), { fontPreset: fontButton.dataset.fontChoice });
    render();
    return;
  }
  const verticalButton = event.target.closest("[data-text-vertical-choice]");
  if (verticalButton) {
    const nextVertical = verticalButton.dataset.textVerticalChoice;
    updatePagesByIds(pageIdsFromControl(verticalButton, pageId), { textVerticalAlign: nextVertical });
    render();
    return;
  }
  const horizontalButton = event.target.closest("[data-text-horizontal-choice]");
  if (horizontalButton) {
    const nextHorizontal = horizontalButton.dataset.textHorizontalChoice;
    updatePagesByIds(pageIdsFromControl(horizontalButton, pageId), { textHorizontalAlign: nextHorizontal });
    render();
    return;
  }
  const pointStepButton = event.target.closest("[data-font-point-step]");
  if (pointStepButton) {
    const step = Number(pointStepButton.dataset.fontPointStep || 0);
    updatePagesByIds(pageIdsFromControl(pointStepButton, pageId), (page) => ({
      fontScale: Math.min(
        maxFontScaleForPage(activeBook(), page),
        fontScaleForPointSize(activeBook(), page, integerFontPointSize(activeBook(), page) + step),
      ),
    }));
    render();
    return;
  }
  const applyTextStyleButton = event.target.closest("[data-apply-text-style-all]");
  if (applyTextStyleButton) {
    const book = activeBook();
    const sourcePage = book.pages.find(
      (page) => page.id === applyTextStyleButton.dataset.applyTextStyleAll,
    );
    if (!sourcePage) return;
    const sharedTextStyle = {
      fontPreset: sourcePage.fontPreset,
      fontScale: sourcePage.fontScale,
      textHorizontalAlign: sourcePage.textHorizontalAlign,
      textVerticalAlign: sourcePage.textVerticalAlign,
    };
    updatePagesByIds(
      book.pages.map((page) => page.id),
      sharedTextStyle,
    );
    setStatus(
      "Text style applied",
      `${fontLabel(sourcePage.fontPreset)}, ${fontPointLabel(book, sourcePage)}, and its alignment now apply to every page.`,
    );
    render();
    return;
  }
  const nudgeButton = event.target.closest("[data-image-nudge]");
  if (nudgeButton) {
    updatePagesByIds(pageIdsFromControl(nudgeButton, pageId), (page) => {
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
      return next;
    });
    return;
  }
  const resetImageButton = event.target.closest("[data-image-reset-position]");
  if (resetImageButton) {
    updatePagesByIds(pageIdsFromControl(resetImageButton, pageId), {
      imageOffsetX: DEFAULT_IMAGE_OFFSET,
      imageOffsetY: DEFAULT_IMAGE_OFFSET,
      imageScale: DEFAULT_IMAGE_SCALE,
    });
    return;
  }
  const imageScaleStepButton = event.target.closest("[data-image-scale-step]");
  if (imageScaleStepButton) {
    const step = Number(imageScaleStepButton.dataset.imageScaleStep || 0);
    updatePagesByIds(pageIdsFromControl(imageScaleStepButton, pageId), (page) => ({
      ...(() => {
        const currentScale = Math.max(normalizeImageScale(page.imageScale), imageMinimumScale(page));
        const nextScale = Math.max(normalizeImageScale(currentScale + step), imageMinimumScale(page));
        const scaleRatio = currentScale > 0 ? nextScale / currentScale : 1;
        return {
          imageScale: nextScale,
          imageOffsetX: normalizeImageOffset(normalizeImageOffset(page.imageOffsetX) * scaleRatio),
          imageOffsetY: normalizeImageOffset(normalizeImageOffset(page.imageOffsetY) * scaleRatio),
        };
      })(),
    }));
  }
});

refs.fullBookPreview.addEventListener(
  "wheel",
  (event) => {
    const pageSlider = event.target.closest(".page-slider");
    if (!pageSlider) return;
    const wheelDelta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
    if (!wheelDelta) return;
    const maxScrollLeft = pageSlider.scrollWidth - pageSlider.clientWidth;
    if (maxScrollLeft <= 0) return;
    const movingLeft = wheelDelta < 0;
    const canScroll = movingLeft ? pageSlider.scrollLeft > 0 : pageSlider.scrollLeft < maxScrollLeft;
    if (!canScroll) return;
    event.preventDefault();
    const step = Math.max(180, pageSlider.clientWidth * 0.55);
    pageSlider.scrollBy({
      left: movingLeft ? -step : step,
      behavior: "smooth",
    });
  },
  { passive: false, capture: true },
);

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
  selectedPreviewPageIds = previewSelectionForPage(activeBook(), button.dataset.pageId);
  saveState();
  render();
});

refs.bookSelect.addEventListener("change", (event) => {
  state.activeBookId = event.target.value;
  selectedPreviewPageIds = [];
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
  } else {
    characterDraft.visualTraits = "";
    characterDraft.birthState = "";
    characterDraft.distinctiveAnatomy = "";
    characterDraft.personality = "";
  }
  syncCharacterEditorChrome(characterDraft.seedImageDataUrl || characterDraft.thumbnailUrl || characterDraft.seedImageUrl || "");
  renderCharacterEditor();
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

refs.updatePromptButton.addEventListener("click", () => {
  void updatePagePrompt();
});

async function bootstrap() {
  const [serverState, outputImages] = await Promise.all([loadStateFromServer(), loadGeneratedImagesFromOutputs()]);
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
  selectedPreviewPageIds = normalizeSelectedPreviewPageIds(state.selectedPreviewPageIds, activeBook());
  state.selectedPreviewPageIds = [...selectedPreviewPageIds];
  if (outputImages.length) {
    activeBook().imageLibrary = normalizeGeneratedImageLibrary(
      [...outputImages, ...(activeBook().imageLibrary || [])],
      activeBook().pages,
    );
    saveState();
  }
  render();
  loadCharacters();
  loadDefaultCover();
}

bootstrap();

let devServerVersion = "";
let devServerWasUnavailable = false;

async function watchForDevelopmentReload() {
  try {
    const response = await fetch("/api/dev-version", { cache: "no-store" });
    if (!response.ok) return;
    const result = await response.json();
    const nextVersion = String(result.version || "");
    if (devServerVersion && (devServerWasUnavailable || nextVersion !== devServerVersion)) {
      window.location.reload();
      return;
    }
    devServerVersion = nextVersion;
    devServerWasUnavailable = false;
  } catch {
    if (devServerVersion) devServerWasUnavailable = true;
  }
}

void watchForDevelopmentReload();
setInterval(watchForDevelopmentReload, 1000);
