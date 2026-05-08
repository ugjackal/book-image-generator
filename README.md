# Whoka Story Studio

A local authoring website for drafting a picture book page by page, then generating illustrations from your page text, character names, and scene direction.

## What it does

- Create and switch between multiple saved books in the browser.
- Give each book a title and select an author from a reusable local author list.
- Use the Whoka sunrise constellation-tree logo and early-sunrise visual theme.
- Paste a full manuscript and create page drafts from it based on target audience and optional page count.
- Create and manage a list of book pages for each book.
- Paste the exact text for each page.
- Add character names such as Layla, Ginger, Harvey, Marlin, Kim, and Tony.
- Describe the scene, setting, mood, lighting, composition, and text-safe area.
- Generate a full page illustration and save it locally in `outputs/pages/`.
- Preview each page with the generated illustration and editable page text.
- Launching `serve.bat` also mirrors today's Codex-generated PNGs into `outputs/` automatically.

## How to use

1. Set `OPENAI_API_KEY` in your environment.
2. Run `serve.bat` from this folder, or start `python server.py 8000`.
3. Open `http://127.0.0.1:8000`.
4. Use `Start new book`, enter the title, author, target audience, and paste the story.
5. Click `Create book pages` to divide the manuscript into page drafts.
6. Review or edit each page's text, character names, and illustration direction, then click `Generate illustration`.
7. The app will auto-load `artifacts/cover/book_cover.jfif` if it is present and use it as a style reference for the active book.

## Network access

By default the app only listens on this computer. To open it from another computer on the same network, start it on all interfaces:

```powershell
python server.py 8000 0.0.0.0
```

Or with the batch file:

```powershell
.\serve.bat 8000 0.0.0.0
```

Then open `http://<this-computer-ip>:8000` from the other computer. Windows Firewall may ask you to allow Python on private networks.

## CLI commands

Generate a full page scene:

```powershell
python bookgen.py page --page-number 5 --characters Layla Ginger --scene "Layla and Ginger are having a playful tug-of-war over a bone in the dirt yard." --setting "A rustic yard with packed dirt and dry grass around the edges." --mood "Playful and mischievous." --text-space "Quiet open space at top left." --show-prompt
```

Generate a transparent character PNG like the browser app:

```powershell
python bookgen.py character --name Layla --expression-pose "Standing calmly with a loyal farm-dog presence." --show-prompt
```

Preview the prompt without spending an image generation call:

```powershell
python bookgen.py --dry-run page --characters Layla Ginger --scene "Layla and Ginger tug at opposite ends of a bone in the dirt yard."
```

## Notes

- The browser only talks to the local Python server.
- Books and page drafts are saved in this browser's local storage.
- The Python server calls the OpenAI API and writes the resulting PNG to `outputs/`.
- Character names are loaded from `characters/*.json`.
- Page scenes use `/api/generate-page-scene` and write PNGs to `outputs/pages/`.
- Character PNGs can still be generated from the CLI and are saved to `outputs/`.
- The sync script copies Codex chat-generated PNGs from the local cache into `outputs/` on startup, so the repo stays in step with the latest art.
