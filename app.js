const STORAGE_KEY = "character-png-generator.state.v1";
const DEFAULT_COVER_PATH = "./artifacts/cover/book_cover.jfif";

const $ = (selector, root = document) => root.querySelector(selector);

const refs = {
  heroStats: $("#heroStats"),
  coverInput: $("#coverInput"),
  dropzone: $("#dropzone"),
  clearCoverButton: $("#clearCoverButton"),
  coverPreview: $("#coverPreview"),
  characterForm: $("#characterForm"),
  projectTitle: $("#projectTitle"),
  characterName: $("#characterName"),
  characterRole: $("#characterRole"),
  visualTraits: $("#visualTraits"),
  distinctiveAnatomy: $("#distinctiveAnatomy"),
  expressionPose: $("#expressionPose"),
  styleNotes: $("#styleNotes"),
  coverStoryNotes: $("#coverStoryNotes"),
  promptSeed: $("#promptSeed"),
  generateButton: $("#generateButton"),
  loadExampleButton: $("#loadExampleButton"),
  resultPreview: $("#resultPreview"),
  downloadButton: $("#downloadButton"),
  copyPromptButton: $("#copyPromptButton"),
  statusLabel: $("#statusLabel"),
  statusText: $("#statusText"),
  promptOutput: $("#promptOutput"),
  notesOutput: $("#notesOutput"),
};

const defaultState = () => ({
  projectTitle: "Tiny Paws, Big Hooves",
  characterName: "Harvey",
  characterRole: "Cat protagonist",
  visualTraits:
    "A small tabby cat with warm brown stripes, a soft fluffy coat, bright eyes, and an easy-to-read storybook silhouette.",
  distinctiveAnatomy: "Harvey is polydactyl and has seven toes.",
  expressionPose:
    "Walking forward on a road with a calm, curious expression, as if heading into the next chapter.",
  styleNotes:
    "Style lock: soft hand-painted children's-book illustration, warm sunset palette, painterly brush texture, gentle storybook realism, simplified readable shapes, and no photorealism. Keep Harvey and Marlin visually consistent across all scenes.",
  coverStoryNotes:
    "The cover shows Harvey the cat and Marlin the horse walking together away from a sunset on a road.",
  promptSeed:
    "Locked book style: warm, softly painted, storybook illustration with gentle realism, readable silhouettes, and consistent character design.",
  coverFileName: "",
  coverPreviewUrl: "",
  coverReferenceUrl: "",
  generatedImageUrl: "",
  lastPrompt: "",
  lastNotes: "",
  status: "Ready",
  statusDetail: "Upload a cover and describe the character, then generate the first PNG.",
});

let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return {
      ...defaultState(),
      ...parsed,
      coverFileName: "",
      coverPreviewUrl: "",
      coverReferenceUrl: "",
      generatedImageUrl: "",
      lastPrompt: "",
      lastNotes: "",
      status: "Ready",
      statusDetail: defaultState().statusDetail,
    };
  } catch {
    return defaultState();
  }
}

function saveState() {
  const {
    coverFileName,
    coverPreviewUrl,
    coverReferenceUrl,
    generatedImageUrl,
    lastPrompt,
    lastNotes,
    status,
    statusDetail,
    ...serializable
  } = state;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
  } catch {
    // Ignore storage failures in file:// or private mode contexts.
  }
}

function setStatus(label, detail) {
  state.status = label;
  state.statusDetail = detail;
  refs.statusLabel.textContent = label;
  refs.statusText.textContent = detail;
  renderHeroStats();
}

function renderState() {
  refs.projectTitle.value = state.projectTitle;
  refs.characterName.value = state.characterName;
  refs.characterRole.value = state.characterRole;
  refs.visualTraits.value = state.visualTraits;
  refs.distinctiveAnatomy.value = state.distinctiveAnatomy;
  refs.expressionPose.value = state.expressionPose;
  refs.styleNotes.value = state.styleNotes;
  refs.coverStoryNotes.value = state.coverStoryNotes;
  refs.promptSeed.value = state.promptSeed;

  refs.coverPreview.innerHTML = state.coverPreviewUrl
    ? `<img src="${state.coverPreviewUrl}" alt="Uploaded cover reference" />`
    : `<div class="cover-placeholder"><span>No cover loaded yet</span></div>`;

  refs.resultPreview.innerHTML = state.generatedImageUrl
    ? `<img src="${state.generatedImageUrl}" alt="Generated first character" />`
    : `<div class="cover-placeholder"><span>Generate a PNG to see the first main character here.</span></div>`;

  refs.promptOutput.value = state.lastPrompt || "";
  refs.notesOutput.value = state.lastNotes || "";

  refs.downloadButton.hidden = !state.generatedImageUrl;
  refs.downloadButton.href = state.generatedImageUrl || "#";
  refs.copyPromptButton.disabled = !state.lastPrompt;

  renderHeroStats();
}

function renderHeroStats() {
  refs.heroStats.innerHTML = [
    statCard(`Cover: ${state.coverFileName ? "Loaded" : "Waiting"}`, "The book cover is the visual style reference."),
    statCard(state.characterName || "Unnamed character", "This will be the first canonical character PNG."),
    statCard(state.status, state.statusDetail),
  ].join("");
}

function statCard(title, detail) {
  return `
    <div class="stat-card">
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(detail)}</span>
    </div>
  `;
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

async function handleCoverFile(file) {
  setStatus("Preparing cover", "Resizing the cover locally so it can be used as a style reference.");
  const previewUrl = await resizeFileToDataUrl(file, 900, 0.9);
  const referenceUrl = await resizeFileToDataUrl(file, 1400, 0.9);
  state.coverFileName = file.name;
  state.coverPreviewUrl = previewUrl;
  state.coverReferenceUrl = referenceUrl;
  state.generatedImageUrl = "";
  state.lastPrompt = "";
  state.lastNotes = "";
  setStatus("Cover loaded", "The cover is ready to anchor the first character image.");
  saveState();
  renderState();
  refs.coverInput.value = "";
}

async function loadDefaultCover() {
  try {
    const response = await fetch(DEFAULT_COVER_PATH);
    if (!response.ok) return;
    const blob = await response.blob();
    const coverFile = new File([blob], "book_cover.jfif", {
      type: blob.type || "image/jpeg",
    });
    await handleCoverFile(coverFile);
  } catch {
    setStatus(
      "No cover yet",
      "Upload the book cover from artifacts/cover if auto-load does not work."
    );
  }
}

async function generateCharacter(event) {
  event.preventDefault();
  if (!state.characterName.trim()) {
    setStatus("Missing name", "Add a character name before generating the PNG.");
    return;
  }

  refs.generateButton.disabled = true;
  setStatus("Generating", "Sending the cover reference and character brief to OpenAI.");

  const payload = {
    project_title: state.projectTitle,
    character_name: state.characterName,
    character_role: state.characterRole,
    visual_traits: state.visualTraits,
    distinctive_anatomy: state.distinctiveAnatomy,
    expression_pose: state.expressionPose,
    style_notes: state.styleNotes,
    cover_story_notes: state.coverStoryNotes,
    prompt_seed: state.promptSeed,
    cover_data_url: state.coverReferenceUrl,
  };

  try {
    const response = await fetch("/api/generate-character", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "Character generation failed.");
    }

    state.generatedImageUrl = result.file_url;
    refs.downloadButton.download = result.file_name || "first-character.png";
    state.lastPrompt = result.prompt;
    state.lastNotes = [
      `Model: ${result.model}`,
      `Output: ${result.file_name}`,
      result.response_id ? `Response id: ${result.response_id}` : null,
      result.cover_used ? "Cover reference: included" : "Cover reference: not provided",
    ]
      .filter(Boolean)
      .join("\n");
    setStatus("Done", "The first canonical character PNG is ready.");
    saveState();
    renderState();
  } catch (error) {
    setStatus("Error", error.message || "Something went wrong while generating the PNG.");
  } finally {
    refs.generateButton.disabled = false;
  }
}

function loadExample() {
  const preset = defaultState();
  state.projectTitle = preset.projectTitle;
  state.characterName = preset.characterName;
  state.characterRole = preset.characterRole;
  state.visualTraits = preset.visualTraits;
  state.distinctiveAnatomy = preset.distinctiveAnatomy;
  state.expressionPose = preset.expressionPose;
  state.styleNotes = preset.styleNotes;
  state.coverStoryNotes = preset.coverStoryNotes;
  state.promptSeed = preset.promptSeed;
  state.generatedImageUrl = "";
  state.lastPrompt = "";
  state.lastNotes = "";
  setStatus("Preset loaded", "You can generate Harvey's first canonical PNG from these starter values.");
  saveState();
  renderState();
}

refs.coverInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  await handleCoverFile(file);
});

refs.dropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  refs.dropzone.classList.add("is-dragging");
});

refs.dropzone.addEventListener("dragleave", () => {
  refs.dropzone.classList.remove("is-dragging");
});

refs.dropzone.addEventListener("drop", async (event) => {
  event.preventDefault();
  refs.dropzone.classList.remove("is-dragging");
  const file = event.dataTransfer?.files?.[0];
  if (!file) return;
  await handleCoverFile(file);
});

refs.clearCoverButton.addEventListener("click", () => {
  state.coverFileName = "";
  state.coverPreviewUrl = "";
  state.coverReferenceUrl = "";
  state.generatedImageUrl = "";
  state.lastPrompt = "";
  state.lastNotes = "";
  setStatus("Cover cleared", "Upload the cover again if you want it to guide the next PNG.");
  saveState();
  renderState();
  refs.coverInput.value = "";
});

refs.characterForm.addEventListener("input", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
  const keyMap = {
    projectTitle: "projectTitle",
    characterName: "characterName",
    characterRole: "characterRole",
    visualTraits: "visualTraits",
    distinctiveAnatomy: "distinctiveAnatomy",
    expressionPose: "expressionPose",
    styleNotes: "styleNotes",
    coverStoryNotes: "coverStoryNotes",
    promptSeed: "promptSeed",
  };
  const key = keyMap[target.id];
  if (!key) return;
  state[key] = target.value;
  saveState();
  renderHeroStats();
});

refs.characterForm.addEventListener("submit", generateCharacter);
refs.loadExampleButton.addEventListener("click", loadExample);

refs.copyPromptButton.addEventListener("click", async () => {
  if (!state.lastPrompt) return;
  try {
    await navigator.clipboard.writeText(state.lastPrompt);
    setStatus("Prompt copied", "The generation prompt is on your clipboard.");
  } catch {
    setStatus("Copy failed", "Your browser blocked clipboard access.");
  }
});

renderState();
loadDefaultCover();
