from __future__ import annotations

import base64
import json
import os
import secrets
import sys
import mimetypes
import threading
from functools import partial
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from openai import OpenAI


BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "outputs"
PAGE_OUTPUT_DIR = OUTPUT_DIR / "pages"
STATE_FILE = BASE_DIR / "data" / "studio-state.json"
STATE_LOCK = threading.Lock()
DEFAULT_MODEL = os.environ.get("OPENAI_TEXT_MODEL", "gpt-5.4")
CHARACTER_DIR = BASE_DIR / "characters"


def load_env_file(path: Path) -> None:
    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key:
            os.environ[key] = value


def slugify(value: str) -> str:
    chars = []
    last_dash = False
    for char in value.lower():
        if char.isalnum():
            chars.append(char)
            last_dash = False
        elif not last_dash:
            chars.append("-")
            last_dash = True
    return "".join(chars).strip("-")


def build_prompt(payload: dict[str, Any]) -> str:
    project_title = str(payload.get("project_title", "")).strip() or "Untitled book"
    character_name = str(payload.get("character_name", "")).strip() or "First main character"
    character_role = str(payload.get("character_role", "")).strip() or "Protagonist"
    group_name = str(payload.get("group_name", "")).strip()
    character_profile = load_character_profile(character_name)
    group_profile = load_character_profile(group_name) if group_name else {}
    visual_traits = str(payload.get("visual_traits", "")).strip() or str(character_profile.get("visualTraits", "")).strip()
    birth_state = str(payload.get("birth_state", "")).strip() or str(character_profile.get("birthState", "")).strip()
    distinctive_anatomy = str(payload.get("distinctive_anatomy", "")).strip() or str(character_profile.get("distinctiveAnatomy", "")).strip()
    expression_pose = str(payload.get("expression_pose", "")).strip() or str(character_profile.get("expressionPose", "")).strip()
    style_notes = str(payload.get("style_notes", "")).strip() or str(character_profile.get("styleNotes", "")).strip()
    cover_story_notes = str(payload.get("cover_story_notes", "")).strip()
    prompt_seed = str(payload.get("prompt_seed", "")).strip()

    lines = [
        f"Create the first canonical main character for the picture book '{project_title}'.",
        f"Character name: {character_name}.",
        f"Role: {character_role}.",
        "Make this a clean, reusable character reference PNG with a transparent background.",
        "Keep the whole body visible and the silhouette easy to recognize at a glance.",
        "Use the book's locked children's-book illustration style.",
        "Preserve the cover's visual language, mood, palette, texture, softness, and simplified shapes.",
        "Do not drift toward photorealism or overly detailed rendering.",
    ]

    if visual_traits:
        lines.append(f"Visual traits: {visual_traits}.")
    if birth_state:
        lines.append(f"Birth state: {birth_state}.")
    if distinctive_anatomy:
        lines.append(f"Distinctive anatomy: {distinctive_anatomy}.")
    if expression_pose:
        lines.append(f"Expression and pose: {expression_pose}.")
    if style_notes:
        lines.append(f"Style lock notes: {style_notes}.")
    if group_name and group_profile:
        lines.append(f"Group name: {group_name}.")
        if group_profile.get("groupIdentity"):
            lines.append(f"Group identity: {group_profile.get('groupIdentity')}.")
        if group_profile.get("familyNotes"):
            lines.append(f"Family notes: {group_profile.get('familyNotes')}.")
    if cover_story_notes:
        lines.append(f"Cover story notes: {cover_story_notes}.")
    if prompt_seed:
        lines.append(f"Prompt seed: {prompt_seed}.")

    lines.extend(
        [
            "Avoid text, logos, borders, or scene backgrounds.",
            "This is the first style anchor for the book, so the design should be distinctive and consistent.",
            "Future images must stay in this same locked art style.",
        ]
    )

    return "\n".join(lines)


def build_page_scene_prompt(payload: dict[str, Any]) -> str:
    project_title = str(payload.get("project_title", "")).strip() or "Untitled book"
    page_number = str(payload.get("page_number", "")).strip()
    page_text = str(payload.get("page_text", "")).strip()
    scene_description = str(payload.get("scene_description", "")).strip()
    setting = str(payload.get("setting", "")).strip()
    mood = str(payload.get("mood", "")).strip()
    lighting = str(payload.get("lighting", "")).strip()
    composition = str(payload.get("composition", "")).strip()
    text_space = str(payload.get("text_space", "")).strip()
    layout = str(payload.get("layout", "")).strip()
    print_size = str(payload.get("print_size", "")).strip()
    selected_characters = payload.get("characters", [])
    scene_style = load_scene_style()

    if isinstance(selected_characters, str):
        selected_characters = [
            item.strip()
            for item in selected_characters.split(",")
            if item.strip()
        ]
    if not isinstance(selected_characters, list):
        selected_characters = []

    profiles = []
    for name in selected_characters:
        profile = load_character_profile(str(name))
        if profile:
            profiles.append(profile)

    page_label = f"page {page_number}" if page_number else "a picture book page"
    lines = [
        f"Create one picture-book illustration for {page_label} of '{project_title}'.",
        "Generate only this page.",
        "Do not include printed text in the image; leave space for editable page text.",
        "Style: warm soft hand-painted children's-book art, sunrise palette, gentle realism, readable shapes.",
        "Use the uploaded cover image as the primary style reference. Match its palette, mood, brushwork, lighting, and visual finish across the book.",
        "Keep character design consistent from page to page. Do not redesign the characters, and preserve their proportions, markings, species, and clothing or accessories.",
        "Avoid text, captions, watermarks, logos, borders, speech bubbles, and photorealism.",
    ]

    if page_text:
        lines.append(f"Page text context: {page_text}")
    if scene_description:
        lines.append(f"Illustration: {scene_description}.")
    if setting:
        lines.append(f"Setting: {setting}.")
    if mood:
        lines.append(f"Mood: {mood}.")
    if lighting:
        lines.append(f"Lighting: {lighting}.")
    if composition:
        lines.append(f"Composition: {composition}.")
    if text_space:
        lines.append(f"Text area: {text_space}.")
    else:
        lines.append("Text area: leave a calm open area for real page text.")
    if layout:
        layout_label = layout_title(layout)
        layout_instruction = layout_guidance(layout)
        if layout_label:
            lines.append(f"Layout: {layout_label}. {layout_instruction}")
    if print_size:
        size_label = print_size_label(print_size)
        if size_label:
            lines.append(f"Print size: {size_label}.")

    if profiles:
        lines.append("Characters:")
        for profile in profiles:
            character_lines = [
                f"- {profile.get('name', 'Unnamed character')}: {profile.get('role', 'character')}",
            ]
            if profile.get("visualTraits"):
                character_lines.append(f"visual traits: {profile.get('visualTraits')}")
            if profile.get("distinctiveAnatomy"):
                character_lines.append(f"distinctive anatomy: {profile.get('distinctiveAnatomy')}")
            if profile.get("personality"):
                character_lines.append(f"personality: {profile.get('personality')}")
            lines.append("; ".join(character_lines) + ".")

    lines.extend(
        [
            "Treat the cover art and character profiles as canon for this book.",
            "Keep it safe, expressive, uncluttered, and appropriate for the target audience.",
        ]
    )

    return "\n".join(lines)


def print_size_label(print_size: str) -> str:
    normalized = str(print_size).strip()
    labels = {
        "landscape-10x8": "Landscape picture book 12 x 8 in",
        "portrait-8x10": "Portrait picture book 8 x 12 in",
        "square-10x10": "Square picture book 10 x 10 in",
    }
    return labels.get(normalized, "")


def size_for_print_size(print_size: str) -> str:
    normalized = str(print_size).strip()
    sizes = {
        "landscape-10x8": "1536x1024",
        "portrait-8x10": "1024x1536",
        "square-10x10": "1024x1024",
    }
    return sizes.get(normalized, "1536x1024")


def layout_title(layout: str) -> str:
    normalized = str(layout).strip()
    titles = {
        "stacked-image-top": "Image top, text bottom",
        "stacked-text-top": "Text top, image bottom",
        "spread-text-left": "Text left, image right",
        "spread-image-left": "Image left, text right",
        "overlay-centered": "Background image, centered text",
        "overlay-top": "Background image, top text",
        "overlay-bottom": "Background image, bottom text",
    }
    return titles.get(normalized, "")


def layout_guidance(layout: str) -> str:
    normalized = str(layout).strip()
    guidance = {
        "stacked-image-top": "Compose the illustration with the main art above and a calm text-safe area below.",
        "stacked-text-top": "Compose the illustration with a quiet text-safe area above and the main art below.",
        "spread-text-left": "Compose as a wide two-page spread with calmer negative space on the left and the main action on the right.",
        "spread-image-left": "Compose as a wide two-page spread with the main action on the left and calmer negative space on the right.",
        "overlay-centered": "Create a full-bleed background image with a soft, readable center area where text can sit over the art.",
        "overlay-top": "Create a full-bleed background image with a calmer upper area for text overlay.",
        "overlay-bottom": "Create a full-bleed background image with a calmer lower area for text overlay.",
    }
    return guidance.get(normalized, "")


def load_character_profile(name: str) -> dict[str, Any]:
    path = CHARACTER_DIR / f"{name.lower()}.json"
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def load_scene_style() -> dict[str, Any]:
    path = CHARACTER_DIR / "scene-style.json"
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def load_saved_state() -> dict[str, Any]:
    if not STATE_FILE.exists():
        return {}
    try:
        return json.loads(STATE_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def save_saved_state(payload: dict[str, Any]) -> None:
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    temp_file = STATE_FILE.with_suffix(".tmp")
    temp_file.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    temp_file.replace(STATE_FILE)


def image_file_to_data_url(path: Path, max_bytes: int = 8_000_000) -> str:
    image_bytes = path.read_bytes()
    if len(image_bytes) > max_bytes:
        raise ValueError(f"{path.name} is too large to send as a reference image.")
    mime_type = mimetypes.guess_type(path.name)[0] or "image/jpeg"
    return f"data:{mime_type};base64,{base64.b64encode(image_bytes).decode('ascii')}"


def create_image(
    *,
    prompt: str,
    output_dir: Path,
    file_prefix: str,
    cover_data_url: str = "",
    background: str = "auto",
    size: str = "1536x1024",
) -> dict[str, Any]:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not set.")

    input_content: list[dict[str, Any]] = [
        {
            "type": "input_text",
            "text": prompt,
        }
    ]
    cover_used = False
    if cover_data_url:
        input_content.append(
            {
                "type": "input_image",
                "image_url": cover_data_url,
                "detail": "high",
            }
        )
        cover_used = True

    client = OpenAI(api_key=api_key)
    tool: dict[str, Any] = {
        "type": "image_generation",
        "model": "gpt-image-2",
        "action": "generate",
        "background": background,
        "quality": "high",
        "size": size,
        "output_format": "png",
    }

    response = client.responses.create(
        model=DEFAULT_MODEL,
        input=[
            {
                "role": "user",
                "content": input_content,
            }
        ],
        tools=[tool],
    )

    image_calls = [
        item
        for item in response.output
        if getattr(item, "type", None) == "image_generation_call"
    ]
    if not image_calls:
        raise RuntimeError("The model did not return an image.")

    image_bytes = base64.b64decode(image_calls[0].result)
    output_dir.mkdir(parents=True, exist_ok=True)
    file_name = f"{slugify(file_prefix) or 'generated-image'}-{secrets.token_hex(4)}.png"
    file_path = output_dir / file_name
    file_path.write_bytes(image_bytes)

    return {
        "model": DEFAULT_MODEL,
        "response_id": response.id,
        "file_name": file_name,
        "file_url": f"/{file_path.relative_to(BASE_DIR).as_posix()}",
        "file_path": str(file_path),
        "prompt": prompt,
        "cover_used": cover_used,
    }


def generate_character_image(payload: dict[str, Any]) -> dict[str, Any]:
    prompt = build_prompt(payload)
    character_name = str(payload.get("character_name", "first-character")) or "first-character"
    result = create_image(
        prompt=prompt,
        output_dir=OUTPUT_DIR,
        file_prefix=character_name,
        cover_data_url=str(payload.get("cover_data_url") or "").strip(),
        background="transparent",
        size="1024x1536",
    )
    result.update(
        {
            "characters": {
                "harvey": load_character_profile("harvey"),
                "marlin": load_character_profile("marlin"),
            },
            "scene_style": load_scene_style(),
        }
    )
    return result


def generate_page_scene_image(payload: dict[str, Any]) -> dict[str, Any]:
    prompt = build_page_scene_prompt(payload)
    page_number = str(payload.get("page_number", "")).strip()
    prefix = f"page-{page_number}-scene" if page_number else "page-scene"
    return create_image(
        prompt=prompt,
        output_dir=PAGE_OUTPUT_DIR,
        file_prefix=prefix,
        cover_data_url=str(payload.get("cover_data_url") or "").strip(),
        background="auto",
        size=size_for_print_size(str(payload.get("print_size", "")).strip()),
    )


class CharacterGeneratorHandler(SimpleHTTPRequestHandler):
    server_version = "CharacterPNGGenerator/1.0"

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        if parsed.path == "/api/state":
            self.handle_get_state()
            return
        if parsed.path == "/api/outputs":
            self.handle_list_outputs()
            return
        if parsed.path == "/api/characters":
            self.handle_list_characters()
            return
        super().do_GET()

    def do_PUT(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        if parsed.path == "/api/state":
            self.handle_put_state()
            return
        self.send_error(HTTPStatus.NOT_FOUND, "Unknown endpoint")

    def do_POST(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        if parsed.path == "/api/generate-character":
            self.handle_generate_character()
            return
        if parsed.path == "/api/generate-page-scene":
            self.handle_generate_page_scene()
            return
        self.send_error(HTTPStatus.NOT_FOUND, "Unknown endpoint")

    def handle_list_outputs(self) -> None:
        if not OUTPUT_DIR.exists():
            self.send_json(HTTPStatus.OK, {"files": []})
            return

        files = [
            {
                "name": path.name,
                "url": f"/outputs/{path.name}",
                "last_modified": path.stat().st_mtime,
            }
            for path in sorted(OUTPUT_DIR.glob("*.png"), key=lambda item: item.stat().st_mtime)
        ]
        self.send_json(HTTPStatus.OK, {"files": files})

    def handle_list_characters(self) -> None:
        characters = []
        for path in sorted(CHARACTER_DIR.glob("*.json")):
            if path.name == "scene-style.json":
                continue
            profile = load_character_profile(path.stem)
            characters.append(
                {
                    "name": profile.get("name", path.stem.title()),
                    "role": profile.get("role", ""),
                    "visual_traits": profile.get("visualTraits", ""),
                    "file": path.name,
                }
            )
        self.send_json(HTTPStatus.OK, {"characters": characters})

    def handle_get_state(self) -> None:
        with STATE_LOCK:
            state = load_saved_state()
        if not state:
            self.send_json(HTTPStatus.NOT_FOUND, {"error": "No saved state yet."})
            return
        self.send_json(HTTPStatus.OK, state)

    def handle_put_state(self) -> None:
        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            body = self.rfile.read(content_length)
            payload = json.loads(body.decode("utf-8"))
        except Exception as exc:  # noqa: BLE001
            self.send_json(
                HTTPStatus.BAD_REQUEST,
                {"error": f"Invalid JSON payload: {exc}"},
            )
            return

        if not isinstance(payload, dict):
            self.send_json(
                HTTPStatus.BAD_REQUEST,
                {"error": "State payload must be a JSON object."},
            )
            return

        with STATE_LOCK:
            save_saved_state(payload)
        self.send_json(HTTPStatus.OK, {"ok": True})

    def handle_generate_character(self) -> None:
        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            body = self.rfile.read(content_length)
            payload = json.loads(body.decode("utf-8"))
        except Exception as exc:  # noqa: BLE001
            self.send_json(
                HTTPStatus.BAD_REQUEST,
                {"error": f"Invalid JSON payload: {exc}"},
            )
            return

        try:
            self.send_json(HTTPStatus.OK, generate_character_image(payload))
        except Exception as exc:  # noqa: BLE001
            self.send_json(
                HTTPStatus.INTERNAL_SERVER_ERROR,
                {
                    "error": f"OpenAI image generation failed: {exc}",
                },
            )

    def handle_generate_page_scene(self) -> None:
        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            body = self.rfile.read(content_length)
            payload = json.loads(body.decode("utf-8"))
        except Exception as exc:  # noqa: BLE001
            self.send_json(
                HTTPStatus.BAD_REQUEST,
                {"error": f"Invalid JSON payload: {exc}"},
            )
            return

        try:
            self.send_json(HTTPStatus.OK, generate_page_scene_image(payload))
        except Exception as exc:  # noqa: BLE001
            message = str(exc)
            if "Limit 0" in message or "rate_limit_exceeded" in message:
                message = (
                    "OpenAI could not generate this single page because the account currently has a zero image-generation "
                    "rate limit for gpt-image-2. The app is only sending the selected page. Add billing or increase image "
                    "rate limits on the OpenAI account, then try again."
                )
            self.send_json(
                HTTPStatus.INTERNAL_SERVER_ERROR,
                {
                    "error": f"OpenAI page scene generation failed: {message}",
                },
            )

    def send_json(self, status: HTTPStatus, payload: dict[str, Any]) -> None:
        data = json.dumps(payload, indent=2).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


def main() -> None:
    load_env_file(BASE_DIR / ".env")
    handler = partial(CharacterGeneratorHandler, directory=str(BASE_DIR))
    port = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get("PORT", "8000"))
    host = sys.argv[2] if len(sys.argv) > 2 else os.environ.get("HOST", "127.0.0.1")
    server = ThreadingHTTPServer((host, port), handler)
    display_host = "127.0.0.1" if host in {"0.0.0.0", ""} else host
    print(f"Serving on http://{display_host}:{port}")
    if host == "0.0.0.0":
        print(f"LAN access enabled on this machine's network IP, for example http://<your-ip>:{port}")
    print("API endpoint: POST /api/generate-character")
    print("API endpoint: POST /api/generate-page-scene")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
