from __future__ import annotations

import base64
import json
import os
import secrets
import sys
import mimetypes
import threading
from io import BytesIO
from functools import partial
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from PIL import Image, ImageDraw, ImageFont
from openai import OpenAI


BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "outputs"
PAGE_OUTPUT_DIR = OUTPUT_DIR / "pages"
BOOK_OUTPUT_DIR = OUTPUT_DIR / "books"
STATE_FILE = BASE_DIR / "data" / "studio-state.json"
STATE_LOCK = threading.Lock()
DEFAULT_MODEL = os.environ.get("OPENAI_TEXT_MODEL", "gpt-5.4")
CHARACTER_DIR = BASE_DIR / "characters"
try:
    PIL_LANCZOS = Image.Resampling.LANCZOS
except AttributeError:
    PIL_LANCZOS = Image.LANCZOS


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


def data_url_to_bytes(data_url: str) -> bytes:
    if not data_url.startswith("data:") or "," not in data_url:
        raise ValueError("Expected a data URL.")
    _, encoded = data_url.split(",", 1)
    return base64.b64decode(encoded)


def extract_json_object(text: str) -> dict[str, Any]:
    raw = str(text or "").strip()
    if not raw:
        raise ValueError("Empty model response.")
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass
    start = raw.find("{")
    end = raw.rfind("}")
    if start >= 0 and end > start:
        parsed = json.loads(raw[start : end + 1])
        if isinstance(parsed, dict):
            return parsed
    raise ValueError("Model response did not contain a JSON object.")


def parse_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    return str(value).strip().lower() in {"1", "true", "yes", "on"}


def parse_name_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str):
        return [item.strip() for item in value.split(",") if item.strip()]
    return []


def resolve_image_reference(reference: str) -> str:
    value = str(reference or "").strip()
    if not value:
        return ""
    if value.startswith("data:"):
        return value
    if value.startswith("/"):
        path = BASE_DIR / value.lstrip("/")
        if path.exists():
            return image_file_to_data_url(path)
        return ""
    path = Path(value)
    if not path.is_absolute():
        path = BASE_DIR / path
    if path.exists():
        return image_file_to_data_url(path)
    return ""


def write_data_url_to_file(data_url: str, output_dir: Path, file_prefix: str) -> str:
    image_bytes = data_url_to_bytes(data_url)
    data_header = data_url.split(",", 1)[0]
    mime_type = data_header[5:].split(";", 1)[0].strip() if data_header.startswith("data:") else ""
    extension = mimetypes.guess_extension(mime_type) or ".png"
    output_dir.mkdir(parents=True, exist_ok=True)
    file_name = f"{slugify(file_prefix) or 'generated-image'}-{secrets.token_hex(4)}{extension}"
    file_path = output_dir / file_name
    file_path.write_bytes(image_bytes)
    return f"/{file_path.relative_to(BASE_DIR).as_posix()}"


def find_character_profile_path(name: str) -> Path:
    normalized = slugify(name)
    if not normalized:
        return CHARACTER_DIR / "character.json"

    exact_name = str(name).strip().casefold()
    if CHARACTER_DIR.exists():
        for path in sorted(CHARACTER_DIR.glob("*.json")):
            if path.name == "scene-style.json":
                continue
            if slugify(path.stem) == normalized or path.stem.casefold() == exact_name:
                return path
            try:
                profile = json.loads(path.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                continue
            profile_name = str(profile.get("name", "")).strip()
            if profile_name and (profile_name.casefold() == exact_name or slugify(profile_name) == normalized):
                return path
    return CHARACTER_DIR / f"{normalized}.json"


def save_character_profile(payload: dict[str, Any], *, thumbnail_url: str = "") -> dict[str, Any]:
    from datetime import datetime, timezone

    name = str(payload.get("name") or payload.get("character_name") or "").strip()
    if not name:
        raise ValueError("Character name is required.")

    original_name = str(payload.get("original_name") or payload.get("originalName") or "").strip()
    source_name = original_name or name
    existing_path = find_character_profile_path(source_name)
    existing_profile = load_character_profile(source_name) if existing_path.exists() else {}
    seed_image_reference = str(payload.get("seed_image_data_url") or payload.get("seedImageDataUrl") or "").strip()
    seed_image_url = str(payload.get("seed_image_url") or payload.get("seedImageUrl") or existing_profile.get("seedImageUrl", "")).strip()
    group_members = parse_name_list(payload.get("groupMembers") or payload.get("group_members") or existing_profile.get("groupMembers", []))

    if seed_image_reference.startswith("data:"):
        seed_image_url = write_data_url_to_file(seed_image_reference, OUTPUT_DIR / "characters", f"{name}-seed")
    elif seed_image_reference and not seed_image_url:
        seed_image_url = seed_image_reference

    profile = {
        "name": name,
        "role": str(payload.get("role") or payload.get("character_role") or existing_profile.get("role", "")).strip(),
        "visualTraits": str(payload.get("visualTraits") or payload.get("visual_traits") or existing_profile.get("visualTraits", "")).strip(),
        "birthState": str(payload.get("birthState") or payload.get("birth_state") or existing_profile.get("birthState", "")).strip(),
        "distinctiveAnatomy": str(payload.get("distinctiveAnatomy") or payload.get("distinctive_anatomy") or existing_profile.get("distinctiveAnatomy", "")).strip(),
        "expressionPose": str(payload.get("expressionPose") or payload.get("expression_pose") or existing_profile.get("expressionPose", "")).strip(),
        "styleNotes": str(payload.get("styleNotes") or payload.get("style_notes") or existing_profile.get("styleNotes", "")).strip(),
        "personality": str(payload.get("personality") or payload.get("personality_notes") or existing_profile.get("personality", "")).strip(),
        "groupIdentity": str(payload.get("groupIdentity") or payload.get("group_identity") or existing_profile.get("groupIdentity", "")).strip(),
        "familyNotes": str(payload.get("familyNotes") or payload.get("family_notes") or existing_profile.get("familyNotes", "")).strip(),
        "isGroupReference": parse_bool(payload.get("isGroupReference") or payload.get("is_group_reference") or existing_profile.get("isGroupReference", False)),
        "groupMembers": group_members,
        "seedImageUrl": seed_image_url,
        "thumbnailUrl": str(thumbnail_url or payload.get("thumbnailUrl") or payload.get("thumbnail_url") or existing_profile.get("thumbnailUrl", "")).strip(),
        "createdAt": existing_profile.get("createdAt") or payload.get("createdAt") or payload.get("created_at") or "",
        "updatedAt": "",
    }
    now = datetime.now(timezone.utc).isoformat()
    if not profile["createdAt"]:
        profile["createdAt"] = now
    profile["updatedAt"] = now

    CHARACTER_DIR.mkdir(parents=True, exist_ok=True)
    path = find_character_profile_path(name)
    if original_name and slugify(original_name) != slugify(name) and existing_path.exists() and existing_path != path:
        try:
            existing_path.unlink()
        except OSError:
            pass
    path.write_text(json.dumps(profile, indent=2, ensure_ascii=False), encoding="utf-8")
    return profile


def list_character_summaries() -> list[dict[str, Any]]:
    characters: list[dict[str, Any]] = []
    if not CHARACTER_DIR.exists():
        return characters

    for path in sorted(CHARACTER_DIR.glob("*.json")):
        if path.name == "scene-style.json":
            continue
        profile = load_character_profile(path.stem)
        characters.append(
            {
                "name": profile.get("name", path.stem.title()),
                "role": profile.get("role", ""),
                "visualTraits": profile.get("visualTraits", ""),
                "birthState": profile.get("birthState", ""),
                "distinctiveAnatomy": profile.get("distinctiveAnatomy", ""),
                "expressionPose": profile.get("expressionPose", ""),
                "styleNotes": profile.get("styleNotes", ""),
                "personality": profile.get("personality", ""),
                "groupIdentity": profile.get("groupIdentity", ""),
                "familyNotes": profile.get("familyNotes", ""),
                "isGroupReference": profile.get("isGroupReference", False),
                "groupMembers": profile.get("groupMembers", []),
                "thumbnailUrl": profile.get("thumbnailUrl", ""),
                "seedImageUrl": profile.get("seedImageUrl", ""),
                "file": path.name,
            }
        )
    return characters


def build_prompt(payload: dict[str, Any]) -> str:
    project_title = str(payload.get("project_title", "")).strip() or "Untitled book"
    character_name = str(payload.get("character_name", "")).strip() or "First main character"
    character_role = str(payload.get("character_role", "")).strip() or "Protagonist"
    group_name = str(payload.get("group_name", "")).strip()
    character_profile = load_character_profile(character_name)
    group_profile = load_character_profile(group_name) if group_name else {}
    group_members = parse_name_list(payload.get("group_members") or payload.get("groupMembers") or character_profile.get("groupMembers", []))
    visual_traits = str(payload.get("visual_traits", "")).strip() or str(character_profile.get("visualTraits", "")).strip()
    birth_state = str(payload.get("birth_state", "")).strip() or str(character_profile.get("birthState", "")).strip()
    distinctive_anatomy = str(payload.get("distinctive_anatomy", "")).strip() or str(character_profile.get("distinctiveAnatomy", "")).strip()
    expression_pose = str(payload.get("expression_pose", "")).strip() or str(character_profile.get("expressionPose", "")).strip()
    style_notes = str(payload.get("style_notes", "")).strip() or str(character_profile.get("styleNotes", "")).strip()
    personality = str(payload.get("personality", "")).strip() or str(character_profile.get("personality", "")).strip()
    group_identity = str(payload.get("group_identity", "")).strip() or str(character_profile.get("groupIdentity", "")).strip()
    family_notes = str(payload.get("family_notes", "")).strip() or str(character_profile.get("familyNotes", "")).strip()
    is_group_reference = parse_bool(payload.get("isGroupReference") or payload.get("is_group_reference") or character_profile.get("isGroupReference", False))
    cover_story_notes = str(payload.get("cover_story_notes", "")).strip()
    prompt_seed = str(payload.get("prompt_seed", "")).strip()

    lines = [
        f"Create a canonical character thumbnail for the picture book '{project_title}'.",
        f"Character name: {character_name}.",
        f"Role: {character_role}.",
        "Make this a clean, reusable character thumbnail that feels like the character as they would appear in the book illustrations.",
        "Use a simple plain background and keep the figure clearly centered.",
        "Keep the whole body visible and the silhouette easy to recognize at a glance.",
        "Use the book's locked children's-book illustration style.",
        "Preserve the cover's visual language, mood, palette, texture, softness, and simplified shapes.",
        "Do not copy the seed image composition or turn the thumbnail into a traced reference image.",
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
    if personality:
        lines.append(f"Personality: {personality}.")
    if group_identity:
        lines.append(f"Group identity: {group_identity}.")
    if family_notes:
        lines.append(f"Family notes: {family_notes}.")
    if group_name and group_profile:
        lines.append(f"Group name: {group_name}.")
        if group_profile.get("groupIdentity"):
            lines.append(f"Group identity: {group_profile.get('groupIdentity')}.")
        if group_profile.get("familyNotes"):
            lines.append(f"Family notes: {group_profile.get('familyNotes')}.")
    if group_members:
        lines.append(f"Group members: {', '.join(group_members)}.")
    if is_group_reference or group_members:
        lines.append("This is a group reference profile. Depict the listed members together as a cohesive group image, with each member clearly readable and distinguishable.")
        if group_members:
            lines.append(f"Group avatar members: {', '.join(group_members)}.")
        lines.append("Do not collapse the group into one person; show the collection as the canonical avatar for the family or group.")
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


def analyze_character_seed(payload: dict[str, Any]) -> dict[str, Any]:
    character_name = str(payload.get("name") or payload.get("character_name") or "").strip()
    role = str(payload.get("role") or payload.get("character_role") or "").strip()
    seed_image_reference = str(payload.get("seed_image_data_url") or payload.get("seedImageDataUrl") or payload.get("seed_image_url") or payload.get("seedImageUrl") or "").strip()
    if not seed_image_reference:
        raise ValueError("A seed image is required for analysis.")

    current_profile = load_character_profile(character_name) if character_name else {}
    prompt_lines = [
        "Analyze this character seed image for a children's picture book profile.",
        "Return only a valid JSON object with these keys: name, role, visualTraits, birthState, distinctiveAnatomy, expressionPose, styleNotes, personality, groupIdentity, familyNotes.",
        "Use the current character name and role as anchors if they are provided. Do not rename the character unless the name is empty.",
        "Describe only what is visible or strongly implied by the image. Do not normalize unusual anatomy or disguise it into a different species or body type.",
        "Keep each field concise, specific, and useful for a character profile editor.",
        "If a field is unknown, return an empty string for it.",
    ]
    if character_name:
        prompt_lines.append(f"Current name: {character_name}.")
    if role:
        prompt_lines.append(f"Current role: {role}.")
    if current_profile.get("visualTraits"):
        prompt_lines.append(f"Existing visual traits: {current_profile.get('visualTraits')}.")
    if current_profile.get("styleNotes"):
        prompt_lines.append(f"Existing style notes: {current_profile.get('styleNotes')}.")
    if current_profile.get("personality"):
        prompt_lines.append(f"Existing personality: {current_profile.get('personality')}.")

    client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
    response = client.responses.create(
        model=DEFAULT_MODEL,
        input=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": "\n".join(prompt_lines),
                    },
                    {
                        "type": "input_image",
                        "image_url": resolve_image_reference(seed_image_reference),
                        "detail": "high",
                    },
                ],
            }
        ],
    )

    response_text = getattr(response, "output_text", "") or ""
    if not response_text and getattr(response, "output", None):
        for item in response.output:
            for content in getattr(item, "content", []) or []:
                if getattr(content, "type", None) == "output_text":
                    response_text += getattr(content, "text", "")
    analysis = extract_json_object(response_text)

    normalized = {
        "name": str(analysis.get("name") or character_name or current_profile.get("name", "")).strip(),
        "role": str(analysis.get("role") or role or current_profile.get("role", "")).strip(),
        "visualTraits": str(analysis.get("visualTraits") or analysis.get("visual_traits") or "").strip(),
        "birthState": str(analysis.get("birthState") or analysis.get("birth_state") or "").strip(),
        "distinctiveAnatomy": str(analysis.get("distinctiveAnatomy") or analysis.get("distinctive_anatomy") or "").strip(),
        "expressionPose": str(analysis.get("expressionPose") or analysis.get("expression_pose") or "").strip(),
        "styleNotes": str(analysis.get("styleNotes") or analysis.get("style_notes") or "").strip(),
        "personality": str(analysis.get("personality") or "").strip(),
        "groupIdentity": str(analysis.get("groupIdentity") or analysis.get("group_identity") or "").strip(),
        "familyNotes": str(analysis.get("familyNotes") or analysis.get("family_notes") or "").strip(),
        "seedImageUrl": "",
        "thumbnailUrl": "",
    }

    if not normalized["name"]:
        normalized["name"] = character_name or current_profile.get("name", "") or "Untitled Character"
    if not normalized["role"] and role:
      normalized["role"] = role

    if payload.get("save_profile") or payload.get("saveProfile"):
        save_payload = dict(payload)
        save_payload.update(normalized)
        save_payload["seed_image_data_url"] = seed_image_reference if seed_image_reference.startswith("data:") else ""
        save_payload["seed_image_url"] = seed_image_reference if not seed_image_reference.startswith("data:") else ""
        normalized_profile = save_character_profile(save_payload)
        return {
            "analysis": normalized,
            "character": normalized_profile,
        }

    return {
        "analysis": normalized,
        "character": normalized,
    }


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
    provided_profiles = payload.get("character_profiles", [])
    scene_style = load_scene_style()

    if isinstance(selected_characters, str):
        selected_characters = [
            item.strip()
            for item in selected_characters.split(",")
            if item.strip()
        ]
    if not isinstance(selected_characters, list):
        selected_characters = []

    profiles: list[dict[str, Any]] = []
    seen_profiles: set[str] = set()

    def profile_key(profile: dict[str, Any]) -> str:
        return slugify(str(profile.get("name", "")).strip()) or str(profile.get("name", "")).strip().casefold()

    def add_profile(profile: dict[str, Any]) -> None:
        if not isinstance(profile, dict):
            return
        normalized_profile = {
            "name": str(profile.get("name", "")).strip(),
            "role": str(profile.get("role", "")).strip(),
            "visualTraits": str(profile.get("visualTraits", "")).strip(),
            "birthState": str(profile.get("birthState", "")).strip(),
            "distinctiveAnatomy": str(profile.get("distinctiveAnatomy", "")).strip(),
            "expressionPose": str(profile.get("expressionPose", "")).strip(),
            "styleNotes": str(profile.get("styleNotes", "")).strip(),
            "personality": str(profile.get("personality", "")).strip(),
            "groupIdentity": str(profile.get("groupIdentity", "")).strip(),
            "familyNotes": str(profile.get("familyNotes", "")).strip(),
            "isGroupReference": parse_bool(profile.get("isGroupReference", False)),
            "groupMembers": parse_name_list(profile.get("groupMembers", [])),
        }
        name_key = profile_key(normalized_profile)
        if not normalized_profile["name"] or name_key in seen_profiles:
            return
        seen_profiles.add(name_key)
        profiles.append(normalized_profile)
        if normalized_profile["isGroupReference"]:
            for member_name in normalized_profile["groupMembers"]:
                member_profile = load_character_profile(member_name)
                if member_profile:
                    add_profile(member_profile)

    if isinstance(provided_profiles, list):
        for profile in provided_profiles:
            add_profile(profile)

    if not profiles:
        for name in selected_characters:
            profile = load_character_profile(str(name))
            if profile:
                add_profile(profile)

    page_label = f"page {page_number}" if page_number else "a picture book page"
    lines = [
        f"Create one picture-book illustration for {page_label} of '{project_title}'.",
        "Generate only this page.",
        "Do not include printed text in the image; leave space for editable page text.",
        "Style: warm soft hand-painted children's-book art, sunrise palette, gentle realism, readable shapes.",
        "Use the uploaded cover image as the primary style reference. Match its palette, mood, brushwork, lighting, and visual finish across the book.",
        "Keep character design consistent from page to page. Do not redesign the characters, and preserve their proportions, markings, species, and clothing or accessories.",
        "If multiple characters are listed, every one of them must appear in the image and be visually readable.",
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
        padding_instruction = layout_padding_guidance(layout)
        if padding_instruction:
            lines.append(f"Padding: {padding_instruction}")
    if print_size:
        size_label = print_size_label(print_size)
        if size_label:
            lines.append(f"Print size: {size_label}.")
        print_padding_instruction = print_size_padding_guidance(print_size)
        if print_padding_instruction:
            lines.append(f"Print safety: {print_padding_instruction}")

    if profiles:
        lines.append(f"Characters required in this scene: {len(profiles)}.")
        lines.append("All listed characters must appear clearly and be recognizable. Do not omit any of them.")
        lines.append("Characters:")
        for profile in profiles:
            character_lines = [
                f"- {profile.get('name', 'Unnamed character')}: {profile.get('role', 'character')}",
            ]
            if profile.get("isGroupReference"):
                member_list = ", ".join(parse_name_list(profile.get("groupMembers", [])))
                if member_list:
                    character_lines.append(f"group reference for: {member_list}")
            if profile.get("visualTraits"):
                character_lines.append(f"visual traits: {profile.get('visualTraits')}")
            if profile.get("birthState"):
                character_lines.append(f"birth state: {profile.get('birthState')}")
            if profile.get("distinctiveAnatomy"):
                character_lines.append(f"distinctive anatomy: {profile.get('distinctiveAnatomy')}")
            if profile.get("personality"):
                character_lines.append(f"personality: {profile.get('personality')}")
            if profile.get("groupIdentity"):
                character_lines.append(f"group identity: {profile.get('groupIdentity')}")
            if profile.get("familyNotes"):
                character_lines.append(f"family notes: {profile.get('familyNotes')}")
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


def layout_padding_guidance(layout: str) -> str:
    normalized = str(layout).strip()
    guidance = {
        "stacked-image-top": "Keep the main art high in the frame and leave generous quiet space beneath it, with extra breathing room around every edge in case the page crop shifts later.",
        "stacked-text-top": "Keep the main art low in the frame and leave generous quiet space above it, with extra breathing room around every edge in case the page crop shifts later.",
        "spread-text-left": "Compose with the art anchored on the right side but give it extra surrounding context and wide outer margins so it can be moved or cropped without losing important details.",
        "spread-image-left": "Compose with the art anchored on the left side but give it extra surrounding context and wide outer margins so it can be moved or cropped without losing important details.",
        "overlay-centered": "Keep the focal art large but surrounded by a generous full-bleed safety zone so text placement and later cropping still have room to breathe.",
        "overlay-top": "Keep the focal art slightly lower than center and leave generous open space above, with wide outer margins for future repositioning.",
        "overlay-bottom": "Keep the focal art slightly higher than center and leave generous open space below, with wide outer margins for future repositioning.",
    }
    return guidance.get(normalized, "")


def print_size_padding_guidance(print_size: str) -> str:
    normalized = str(print_size).strip()
    guidance = {
        "landscape-10x8": "Use a wide landscape canvas with expansive left and right bleed and no important detail pressed against the edges.",
        "portrait-8x10": "Use a tall portrait canvas with expansive top and bottom bleed and no important detail pressed against the edges.",
        "square-10x10": "Use a balanced square canvas with generous padding on all sides and no important detail pressed against the edges.",
    }
    return guidance.get(normalized, "")


def load_character_profile(name: str) -> dict[str, Any]:
    path = find_character_profile_path(name)
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


def open_image_reference(reference: str) -> Image.Image | None:
    resolved = resolve_image_reference(reference)
    if not resolved:
        return None
    if not resolved.startswith("data:") or "," not in resolved:
        return None
    try:
        image = Image.open(BytesIO(data_url_to_bytes(resolved)))
        return image.convert("RGBA")
    except Exception:
        return None


def normalize_pdf_book_state(payload: dict[str, Any]) -> dict[str, Any]:
    if "book" in payload and isinstance(payload["book"], dict):
        book = payload["book"]
    else:
        book = payload
    if not isinstance(book, dict):
        return {}
    pages = book.get("pages", [])
    normalized_pages: list[dict[str, Any]] = []
    if isinstance(pages, list):
        for page in pages:
            if not isinstance(page, dict):
                continue
            normalized_pages.append(
                {
                    "number": int(page.get("number", len(normalized_pages) + 1) or len(normalized_pages) + 1),
                    "text": str(page.get("text", "")).strip(),
                    "layout": str(page.get("layout", "")).strip(),
                    "fontPreset": str(page.get("fontPreset", "")).strip(),
                    "fontScale": page.get("fontScale", 1),
                    "textVerticalAlign": str(page.get("textVerticalAlign", "")).strip(),
                    "imageScale": page.get("imageScale", 1),
                    "imageOffsetX": page.get("imageOffsetX", 0),
                    "imageOffsetY": page.get("imageOffsetY", 0),
                    "imageUrl": str(page.get("imageUrl", "")).strip(),
                    "imageDataUrl": str(page.get("imageDataUrl", "")).strip(),
                    "fileName": str(page.get("fileName", "")).strip(),
                }
            )
    return {
        "projectTitle": str(book.get("projectTitle", "")).strip(),
        "authorName": str(book.get("authorName", "")).strip(),
        "printSize": str(book.get("printSize", "")).strip(),
        "audience": str(book.get("audience", "")).strip(),
        "pages": normalized_pages,
    }


def font_candidates(font_key: str) -> list[str]:
    windows = Path(os.environ.get("WINDIR", r"C:\Windows")) / "Fonts"
    candidates = {
        "clean-sans": [
            windows / "segoeui.ttf",
            windows / "arial.ttf",
        ],
        "playful-hand": [
            windows / "segoepr.ttf",
            windows / "comic.ttf",
        ],
        "storybook-serif": [
            windows / "times.ttf",
            windows / "georgia.ttf",
            windows / "timesnewroman.ttf",
        ],
    }
    return [str(path) for path in candidates.get(font_key, candidates["storybook-serif"])]


def load_pdf_font(font_key: str, size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in font_candidates(font_key):
        try:
            return ImageFont.truetype(path, size=size)
        except OSError:
            continue
    return ImageFont.load_default()


def normalize_layout_mode(layout: str) -> str:
    normalized = str(layout or "").strip()
    if normalized.startswith("overlay"):
        return "overlay"
    if normalized.startswith("spread"):
        return "spread"
    return "stacked"


def layout_side_order(layout: str) -> tuple[str, str]:
    normalized = str(layout or "").strip()
    if normalized == "stacked-text-top":
        return "text", "image"
    if normalized == "spread-text-left":
        return "text", "image"
    return "image", "text"


def render_wrapped_lines(draw: ImageDraw.ImageDraw, text: str, font, max_width: int) -> list[str]:
    paragraphs = str(text or "").replace("\r", "").split("\n")
    lines: list[str] = []
    for paragraph in paragraphs:
        words = paragraph.split()
        if not words:
            lines.append("")
            continue
        current = words[0]
        for word in words[1:]:
            candidate = f"{current} {word}"
            if draw.textbbox((0, 0), candidate, font=font)[2] <= max_width:
                current = candidate
                continue
            lines.append(current)
            current = word
        lines.append(current)
    return lines or [""]


def text_block_metrics(draw: ImageDraw.ImageDraw, lines: list[str], font, line_spacing: int) -> tuple[int, int]:
    line_heights = []
    max_width = 0
    for line in lines:
        bbox = draw.textbbox((0, 0), line or " ", font=font)
        width = bbox[2] - bbox[0]
        height = bbox[3] - bbox[1]
        max_width = max(max_width, width)
        line_heights.append(height)
    if not line_heights:
        return 0, 0
    total_height = sum(line_heights) + max(0, len(lines) - 1) * line_spacing
    return max_width, total_height


def fit_text_font(
    draw: ImageDraw.ImageDraw,
    text: str,
    font_key: str,
    *,
    max_width: int,
    max_height: int,
    start_size: int,
    min_size: int = 20,
) -> tuple[ImageFont.FreeTypeFont | ImageFont.ImageFont, list[str], int, int]:
    size = start_size
    best_font = load_pdf_font(font_key, size)
    best_lines = render_wrapped_lines(draw, text, best_font, max_width)
    best_spacing = max(8, int(size * 0.28))
    _, best_height = text_block_metrics(draw, best_lines, best_font, best_spacing)
    while size > min_size:
        font = load_pdf_font(font_key, size)
        lines = render_wrapped_lines(draw, text, font, max_width)
        spacing = max(8, int(size * 0.28))
        _, total_height = text_block_metrics(draw, lines, font, spacing)
        if total_height <= max_height:
            return font, lines, spacing, total_height
        best_font, best_lines, best_spacing, best_height = font, lines, spacing, total_height
        size -= 2
    return best_font, best_lines, best_spacing, best_height


def paste_fitted_image(
    canvas: Image.Image,
    image: Image.Image | None,
    box: tuple[int, int, int, int],
    *,
    scale: float = 1.0,
    offset_x: float = 0.0,
    offset_y: float = 0.0,
    fill: tuple[int, int, int, int] = (250, 244, 236, 255),
) -> None:
    left, top, right, bottom = box
    box_w = max(1, int(right - left))
    box_h = max(1, int(bottom - top))
    layer = Image.new("RGBA", (box_w, box_h), fill)
    if image is None:
        canvas.alpha_composite(layer, (int(left), int(top)))
        return

    source = image.convert("RGBA")
    base_scale = max(box_w / max(1, source.width), box_h / max(1, source.height))
    final_scale = max(0.12, float(scale or 1.0)) * base_scale
    render_w = max(1, int(source.width * final_scale))
    render_h = max(1, int(source.height * final_scale))
    resized = source.resize((render_w, render_h), PIL_LANCZOS)
    paste_x = int((box_w / 2) + float(offset_x or 0) - (render_w / 2))
    paste_y = int((box_h / 2) + float(offset_y or 0) - (render_h / 2))
    layer.paste(resized, (paste_x, paste_y), resized)
    canvas.alpha_composite(layer, (int(left), int(top)))


def draw_placeholder(canvas: Image.Image, box: tuple[int, int, int, int], label: str = "No image yet") -> None:
    draw = ImageDraw.Draw(canvas)
    left, top, right, bottom = box
    box_w = right - left
    box_h = bottom - top
    badge_w = min(int(box_w * 0.56), 240)
    badge_h = 52
    badge_left = left + int((box_w - badge_w) / 2)
    badge_top = top + int((box_h - badge_h) / 2)
    draw.rounded_rectangle(
        (badge_left, badge_top, badge_left + badge_w, badge_top + badge_h),
        radius=12,
        fill=(255, 249, 242, 240),
        outline=(233, 198, 172, 255),
        width=1,
    )
    font = load_pdf_font("storybook-serif", 22)
    bbox = draw.textbbox((0, 0), label, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    draw.text(
        (badge_left + (badge_w - text_w) / 2, badge_top + (badge_h - text_h) / 2 - 2),
        label,
        font=font,
        fill=(117, 94, 74, 255),
    )


def render_pdf_page(book: dict[str, Any], page: dict[str, Any]) -> Image.Image:
    width, height = size_for_print_size(str(book.get("printSize", "")).strip()).split("x")
    page_w = int(width)
    page_h = int(height)
    canvas = Image.new("RGBA", (page_w, page_h), (252, 247, 240, 255))
    draw = ImageDraw.Draw(canvas)

    layout = str(page.get("layout", "")).strip()
    layout_mode = normalize_layout_mode(layout)
    text = str(page.get("text", "")).strip()
    font_key = str(page.get("fontPreset", "")).strip() or "storybook-serif"
    font_scale = float(page.get("fontScale", 1) or 1)
    text_align = str(page.get("textVerticalAlign", "")).strip() or "top"
    image = open_image_reference(str(page.get("imageDataUrl") or page.get("imageUrl") or ""))

    outer_margin_x = max(48, int(page_w * 0.06))
    outer_margin_y = max(40, int(page_h * 0.05))
    gap = max(18, int(min(page_w, page_h) * 0.03))
    paper_fill = (255, 252, 248, 255)
    image_fill = (250, 244, 236, 255)
    text_fill = (255, 254, 251, 255)

    if layout_mode == "spread":
        half_w = page_w // 2
        image_side, text_side = layout_side_order(layout)
        side_padding = max(28, int(page_w * 0.05))
        image_box = (
            0 + side_padding,
            outer_margin_y,
            half_w - side_padding,
            page_h - outer_margin_y,
        )
        text_box = (
            half_w + side_padding,
            outer_margin_y,
            page_w - side_padding,
            page_h - outer_margin_y,
        )
        if image_side == "text":
            image_box, text_box = text_box, image_box
        draw.rectangle((0, 0, half_w - 2, page_h), fill=paper_fill, outline=(231, 215, 200, 255), width=1)
        draw.rectangle((half_w + 2, 0, page_w, page_h), fill=paper_fill, outline=(231, 215, 200, 255), width=1)
        paste_fitted_image(canvas, image, image_box, scale=float(page.get("imageScale", 1) or 1), offset_x=float(page.get("imageOffsetX", 0) or 0), offset_y=float(page.get("imageOffsetY", 0) or 0), fill=image_fill)
        if image is None:
            draw_placeholder(canvas, image_box)
        text_region = Image.new("RGBA", (text_box[2] - text_box[0], text_box[3] - text_box[1]), text_fill)
        region_draw = ImageDraw.Draw(text_region)
        start_size = max(22, int((54 if book.get("audience") in {"3-5", "3-8"} else 42) * font_scale))
        font, lines, spacing, total_height = fit_text_font(
            region_draw,
            text,
            font_key,
            max_width=max(1, text_region.width - 18),
            max_height=max(1, text_region.height - 18),
            start_size=start_size,
        )
        if text:
            _, text_height = text_block_metrics(region_draw, lines, font, spacing)
            y = 10
            if text_align == "center":
                y = max(10, int((text_region.height - text_height) / 2))
            elif text_align == "bottom":
                y = max(10, text_region.height - text_height - 10)
            x = 10
            for line in lines:
                region_draw.text((x, y), line, font=font, fill=(58, 42, 31, 255))
                bbox = region_draw.textbbox((0, 0), line or " ", font=font)
                y += (bbox[3] - bbox[1]) + spacing
        canvas.alpha_composite(text_region, (text_box[0], text_box[1]))
        return canvas.convert("RGB")

    if layout_mode == "overlay":
        paste_fitted_image(canvas, image, (0, 0, page_w, page_h), scale=float(page.get("imageScale", 1) or 1), offset_x=float(page.get("imageOffsetX", 0) or 0), offset_y=float(page.get("imageOffsetY", 0) or 0), fill=image_fill)
        if image is None:
            draw_placeholder(canvas, (0, 0, page_w, page_h))
        overlay_w = max(360, int(page_w * 0.54))
        overlay_h = max(170, int(page_h * 0.26))
        overlay_x = int((page_w - overlay_w) / 2)
        if text_align == "top":
            overlay_y = outer_margin_y
        elif text_align == "bottom":
            overlay_y = page_h - outer_margin_y - overlay_h
        else:
            overlay_y = int((page_h - overlay_h) / 2)
        overlay = Image.new("RGBA", (overlay_w, overlay_h), (255, 252, 248, 0))
        overlay_draw = ImageDraw.Draw(overlay)
        overlay_draw.rounded_rectangle((0, 0, overlay_w, overlay_h), radius=22, fill=(255, 253, 249, 212), outline=(229, 208, 189, 255), width=1)
        start_size = max(22, int((50 if book.get("audience") in {"3-5", "3-8"} else 40) * font_scale))
        font, lines, spacing, total_height = fit_text_font(
            overlay_draw,
            text,
            font_key,
            max_width=max(1, overlay_w - 48),
            max_height=max(1, overlay_h - 34),
            start_size=start_size,
        )
        if text:
            _, text_height = text_block_metrics(overlay_draw, lines, font, spacing)
            y = max(18, int((overlay_h - text_height) / 2))
            for line in lines:
                overlay_draw.text((24, y), line, font=font, fill=(58, 42, 31, 255))
                bbox = overlay_draw.textbbox((0, 0), line or " ", font=font)
                y += (bbox[3] - bbox[1]) + spacing
        canvas.alpha_composite(overlay, (overlay_x, overlay_y))
        return canvas.convert("RGB")

    if layout == "stacked-text-top":
        text_box = (outer_margin_x, outer_margin_y, page_w - outer_margin_x, int(page_h * 0.40))
        image_box = (outer_margin_x, int(page_h * 0.38), page_w - outer_margin_x, page_h - outer_margin_y)
    else:
        image_box = (outer_margin_x, outer_margin_y, page_w - outer_margin_x, int(page_h * 0.62))
        text_box = (outer_margin_x, int(page_h * 0.64), page_w - outer_margin_x, page_h - outer_margin_y)

    draw.rounded_rectangle(text_box, radius=18, fill=paper_fill, outline=(231, 215, 200, 255), width=1)
    paste_fitted_image(canvas, image, image_box, scale=float(page.get("imageScale", 1) or 1), offset_x=float(page.get("imageOffsetX", 0) or 0), offset_y=float(page.get("imageOffsetY", 0) or 0), fill=image_fill)
    if image is None:
        draw_placeholder(canvas, image_box)

    text_region = Image.new("RGBA", (text_box[2] - text_box[0], text_box[3] - text_box[1]), (0, 0, 0, 0))
    text_draw = ImageDraw.Draw(text_region)
    start_size = max(22, int((52 if book.get("audience") in {"3-5", "3-8"} else 40) * font_scale))
    font, lines, spacing, total_height = fit_text_font(
        text_draw,
        text,
        font_key,
        max_width=max(1, text_region.width - 36),
        max_height=max(1, text_region.height - 28),
        start_size=start_size,
    )
    if text:
        _, text_height = text_block_metrics(text_draw, lines, font, spacing)
        y = 14
        if text_align == "center":
            y = max(14, int((text_region.height - text_height) / 2))
        elif text_align == "bottom":
            y = max(14, text_region.height - text_height - 16)
        for line in lines:
            text_draw.text((18, y), line, font=font, fill=(58, 42, 31, 255))
            bbox = text_draw.textbbox((0, 0), line or " ", font=font)
            y += (bbox[3] - bbox[1]) + spacing
    canvas.alpha_composite(text_region, (text_box[0], text_box[1]))
    return canvas.convert("RGB")


def publish_book_pdf(payload: dict[str, Any]) -> dict[str, Any]:
    book = normalize_pdf_book_state(payload)
    if not book:
        raise ValueError("Missing book payload.")
    pages = book.get("pages", [])
    if not pages:
        raise ValueError("No pages available to publish.")

    BOOK_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    title = str(book.get("projectTitle", "")).strip() or "book"
    timestamp = secrets.token_hex(4)
    file_name = f"{slugify(title) or 'book'}-{timestamp}.pdf"
    file_path = BOOK_OUTPUT_DIR / file_name

    rendered_pages: list[Image.Image] = []
    for page in pages:
        rendered_pages.append(render_pdf_page(book, page))

    first, *rest = rendered_pages
    first.save(file_path, save_all=True, append_images=rest, format="PDF", resolution=300.0)
    return {
        "file_url": f"/{file_path.relative_to(BASE_DIR).as_posix()}",
        "file_name": file_name,
        "page_count": len(rendered_pages),
        "title": title,
    }


def create_image(
    *,
    prompt: str,
    output_dir: Path,
    file_prefix: str,
    cover_data_url: str = "",
    reference_data_urls: list[str] | None = None,
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
    image_references = [cover_data_url] if cover_data_url else []
    if reference_data_urls:
        image_references.extend(reference_data_urls)
    for reference in image_references:
        resolved_reference = resolve_image_reference(reference)
        if not resolved_reference:
            continue
        input_content.append(
            {
                "type": "input_image",
                "image_url": resolved_reference,
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
    cover_data_url = str(payload.get("cover_data_url") or "").strip()
    seed_image_data_url = str(payload.get("seed_image_data_url") or payload.get("seedImageDataUrl") or "").strip()
    result = create_image(
        prompt=prompt,
        output_dir=OUTPUT_DIR,
        file_prefix=character_name,
        cover_data_url=cover_data_url,
        reference_data_urls=[reference for reference in [seed_image_data_url] if reference and reference != cover_data_url],
        background="auto",
        size="1024x1536",
    )
    if payload.get("save_profile") or payload.get("saveProfile"):
        profile_payload = dict(payload)
        profile_payload["seed_image_data_url"] = seed_image_data_url
        save_character_profile(profile_payload, thumbnail_url=result["file_url"])
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
        if parsed.path == "/api/characters":
            self.handle_upsert_character()
            return
        self.send_error(HTTPStatus.NOT_FOUND, "Unknown endpoint")

    def do_POST(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        if parsed.path == "/api/generate-character":
            self.handle_generate_character()
            return
        if parsed.path == "/api/analyze-character-seed":
            self.handle_analyze_character_seed()
            return
        if parsed.path == "/api/generate-page-scene":
            self.handle_generate_page_scene()
            return
        if parsed.path == "/api/publish-book":
            self.handle_publish_book()
            return
        if parsed.path == "/api/characters":
            self.handle_upsert_character()
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
        self.send_json(HTTPStatus.OK, {"characters": list_character_summaries()})

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

    def handle_analyze_character_seed(self) -> None:
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
            self.send_json(HTTPStatus.OK, analyze_character_seed(payload))
        except Exception as exc:  # noqa: BLE001
            self.send_json(
                HTTPStatus.INTERNAL_SERVER_ERROR,
                {
                    "error": f"Character seed analysis failed: {exc}",
                },
            )

    def handle_upsert_character(self) -> None:
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
                {"error": "Character payload must be a JSON object."},
            )
            return

        try:
            profile = save_character_profile(payload)
            self.send_json(
                HTTPStatus.OK,
                {
                    "character": profile,
                    "characters": list_character_summaries(),
                },
            )
        except Exception as exc:  # noqa: BLE001
            self.send_json(
                HTTPStatus.INTERNAL_SERVER_ERROR,
                {"error": f"Could not save character profile: {exc}"},
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

    def handle_publish_book(self) -> None:
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
            self.send_json(HTTPStatus.OK, publish_book_pdf(payload))
        except Exception as exc:  # noqa: BLE001
            self.send_json(
                HTTPStatus.INTERNAL_SERVER_ERROR,
                {"error": f"Book publish failed: {exc}"},
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
    print("API endpoint: POST /api/publish-book")
    print("API endpoint: GET/PUT /api/characters")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
