from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from server import (
    BASE_DIR,
    build_page_scene_prompt,
    build_prompt,
    generate_character_image,
    generate_page_scene_image,
    image_file_to_data_url,
    load_character_profile,
    load_env_file,
)


def add_cover(payload: dict[str, Any], cover_path: str) -> None:
    if not cover_path:
        return
    path = Path(cover_path)
    if not path.is_absolute():
        path = BASE_DIR / path
    payload["cover_data_url"] = image_file_to_data_url(path)


def print_result(result: dict[str, Any], show_prompt: bool) -> None:
    print(f"Saved: {result.get('file_path')}")
    print(f"Model: {result.get('model')}")
    if result.get("response_id"):
        print(f"Response id: {result.get('response_id')}")
    if show_prompt:
        print("\nPrompt:\n")
        print(result.get("prompt", ""))


def profile_value(name: str, key: str, fallback: str = "") -> str:
    return str(load_character_profile(name).get(key, fallback)).strip()


def character_command(args: argparse.Namespace) -> None:
    name = args.name.strip()
    payload = {
        "project_title": args.project_title,
        "character_name": name,
        "character_role": args.role or profile_value(name, "role", "Character"),
        "visual_traits": args.visual_traits or profile_value(name, "visualTraits"),
        "birth_state": args.birth_state,
        "distinctive_anatomy": args.distinctive_anatomy or profile_value(name, "distinctiveAnatomy"),
        "expression_pose": args.expression_pose or profile_value(name, "expressionPose"),
        "style_notes": args.style_notes or profile_value(name, "styleNotes"),
        "cover_story_notes": args.cover_story_notes,
        "prompt_seed": args.prompt_seed,
    }
    add_cover(payload, args.cover)

    if args.dry_run:
        print(build_prompt(payload))
        return

    print_result(generate_character_image(payload), args.show_prompt)


def page_command(args: argparse.Namespace) -> None:
    payload = {
        "project_title": args.project_title,
        "page_number": args.page_number,
        "page_text": args.page_text,
        "scene_description": args.scene,
        "setting": args.setting,
        "mood": args.mood,
        "lighting": args.lighting,
        "composition": args.composition,
        "text_space": args.text_space,
        "characters": args.characters,
    }
    add_cover(payload, args.cover)

    if args.payload:
        payload_path = Path(args.payload)
        loaded = json.loads(payload_path.read_text(encoding="utf-8"))
        payload.update(loaded)

    if args.dry_run:
        print(build_page_scene_prompt(payload))
        return

    print_result(generate_page_scene_image(payload), args.show_prompt)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Generate character PNGs and full book-page scene illustrations.",
    )
    parser.add_argument(
        "--project-title",
        default="Tiny Paws, Big Hooves",
        help="Book title used in the prompt.",
    )
    parser.add_argument(
        "--cover",
        default="artifacts/cover/book_cover.jfif",
        help="Optional cover/style reference image path. Use an empty string to skip.",
    )
    parser.add_argument(
        "--show-prompt",
        action="store_true",
        help="Print the final prompt after generation.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print the prompt without generating an image.",
    )

    subparsers = parser.add_subparsers(dest="command", required=True)

    def add_shared_options(command_parser: argparse.ArgumentParser) -> None:
        command_parser.add_argument(
            "--project-title",
            default=argparse.SUPPRESS,
            help="Book title used in the prompt.",
        )
        command_parser.add_argument(
            "--cover",
            default=argparse.SUPPRESS,
            help="Optional cover/style reference image path. Use an empty string to skip.",
        )
        command_parser.add_argument(
            "--show-prompt",
            action="store_true",
            default=argparse.SUPPRESS,
            help="Print the final prompt after generation.",
        )
        command_parser.add_argument(
            "--dry-run",
            action="store_true",
            default=argparse.SUPPRESS,
            help="Print the prompt without generating an image.",
        )

    character = subparsers.add_parser(
        "character",
        help="Generate a transparent canonical character PNG.",
    )
    add_shared_options(character)
    character.add_argument("--name", required=True, help="Character name, matching characters/<name>.json when available.")
    character.add_argument("--role", default="", help="Role or type.")
    character.add_argument("--visual-traits", default="", help="Visual traits override.")
    character.add_argument("--birth-state", default="", help="Birth state notes.")
    character.add_argument("--distinctive-anatomy", default="", help="Distinctive anatomy override.")
    character.add_argument("--expression-pose", default="", help="Expression and pose override.")
    character.add_argument("--style-notes", default="", help="Style lock override.")
    character.add_argument("--cover-story-notes", default="", help="Cover story notes.")
    character.add_argument("--prompt-seed", default="", help="Extra prompt seed.")
    character.set_defaults(func=character_command)

    page = subparsers.add_parser(
        "page",
        help="Generate a full illustrated book-page scene.",
    )
    add_shared_options(page)
    page.add_argument("--page-number", default="", help="Page number or spread label.")
    page.add_argument("--page-text", default="", help="Story text for context only; it will not be printed in the image.")
    page.add_argument("--scene", required=True, help="Scene description.")
    page.add_argument("--characters", nargs="*", default=[], help="Character names to load from characters/*.json.")
    page.add_argument("--setting", default="", help="Setting or background.")
    page.add_argument("--mood", default="", help="Mood/emotion.")
    page.add_argument("--lighting", default="", help="Lighting or time of day.")
    page.add_argument("--composition", default="", help="Framing and layout notes.")
    page.add_argument("--text-space", default="", help="Where to leave blank/quiet space for real page text.")
    page.add_argument("--payload", default="", help="Optional JSON payload to merge into the page request.")
    page.set_defaults(func=page_command)

    return parser


def main() -> None:
    load_env_file(BASE_DIR / ".env")
    parser = build_parser()
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
