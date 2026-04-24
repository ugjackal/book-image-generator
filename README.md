# Character PNG Generator

A small local app for generating the first canonical main character as a transparent PNG from a book cover reference.

## What it does

- Upload a cover and send it to OpenAI as a style reference.
- Start with Harvey, the cat from the cover, and keep Marlin in the cover notes as the horse companion.
- Generate a transparent PNG and save it locally in `outputs/`.
- Reuse the generated prompt as the style anchor for future characters.

## How to use

1. Set `OPENAI_API_KEY` in your environment.
2. Run `serve.bat` from this folder, or start `python server.py 8000`.
3. Open `http://127.0.0.1:8000`.
4. The app will auto-load `artifacts/cover/book_cover.jfif` if it is present, then click `Generate PNG`.

## Notes

- The browser only talks to the local Python server.
- The Python server calls the OpenAI API and writes the resulting PNG to `outputs/`.
- The generated PNG is transparent so it can be reused in later scene layouts.
