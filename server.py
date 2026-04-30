from __future__ import annotations

import base64
import json
import os
import secrets
import sys
from functools import partial
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from openai import OpenAI


BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "outputs"
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
        if key and key not in os.environ:
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


class CharacterGeneratorHandler(SimpleHTTPRequestHandler):
    server_version = "CharacterPNGGenerator/1.0"

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        if parsed.path == "/api/outputs":
            self.handle_list_outputs()
            return
        super().do_GET()

    def do_POST(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        if parsed.path == "/api/generate-character":
            self.handle_generate_character()
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

    def handle_generate_character(self) -> None:
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            self.send_json(
                HTTPStatus.INTERNAL_SERVER_ERROR,
                {
                    "error": "OPENAI_API_KEY is not set.",
                },
            )
            return

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

        prompt = build_prompt(payload)
        cover_data_url = str(payload.get("cover_data_url") or "").strip()
        scene_style = load_scene_style()
        harvey_profile = load_character_profile("harvey")
        marlin_profile = load_character_profile("marlin")

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

        try:
            response = client.responses.create(
                model=DEFAULT_MODEL,
                input=[
                    {
                        "role": "user",
                        "content": input_content,
                    }
                ],
                tools=[
                    {
                        "type": "image_generation",
                        "model": "gpt-image-2",
                        "action": "generate",
                        "background": "transparent",
                        "quality": "high",
                        "size": "1024x1536",
                        "output_format": "png",
                        "input_fidelity": "high",
                    }
                ],
            )

            image_calls = [
                item
                for item in response.output
                if getattr(item, "type", None) == "image_generation_call"
            ]
            if not image_calls:
                raise RuntimeError("The model did not return an image.")

            image_base64 = image_calls[0].result
            image_bytes = base64.b64decode(image_base64)
            OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
            name_slug = slugify(str(payload.get("character_name", "first-character")) or "first-character")
            file_name = f"{name_slug or 'first-character'}-{secrets.token_hex(4)}.png"
            file_path = OUTPUT_DIR / file_name
            file_path.write_bytes(image_bytes)

            self.send_json(
                HTTPStatus.OK,
                {
                    "model": DEFAULT_MODEL,
                    "response_id": response.id,
                    "file_name": file_name,
                    "file_url": f"/outputs/{file_name}",
                    "prompt": prompt,
                    "cover_used": cover_used,
                    "characters": {
                        "harvey": harvey_profile,
                        "marlin": marlin_profile,
                    },
                    "scene_style": scene_style,
                },
            )
        except Exception as exc:  # noqa: BLE001
            self.send_json(
                HTTPStatus.INTERNAL_SERVER_ERROR,
                {
                    "error": f"OpenAI image generation failed: {exc}",
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
    server = ThreadingHTTPServer(("127.0.0.1", port), handler)
    print(f"Serving on http://127.0.0.1:{port}")
    print("API endpoint: POST /api/generate-character")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
