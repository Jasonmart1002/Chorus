#!/usr/bin/env python3
"""
nano_banana.py - Nano Banana Image Generation CLI

Wraps Google Gemini image generation via the google-genai SDK.
Supports text-to-image, image editing, multi-image composition,
and search grounding.

Usage:
  python3 nano_banana.py generate --prompt "..." [options]
  python3 nano_banana.py edit --prompt "..." --image img1.png [img2.png ...] [options]
"""

import argparse
import datetime
import io
import os
import sys


MODEL_MAP = {
    "flash": "gemini-2.5-flash-image",
    "pro": "gemini-3-pro-image-preview",
}


def resolve_output_path(output_arg):
    if output_arg:
        return output_arg
    ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    return f"nano_banana_{ts}.png"


def build_prompt(base_prompt, aspect_ratio, image_size, model):
    parts = [base_prompt]
    if aspect_ratio and aspect_ratio != "1:1":
        parts.append(f"Aspect ratio: {aspect_ratio}")
    if image_size and model == "pro":
        parts.append(f"Output resolution: {image_size}")
    return "\n\n".join(parts)


def run_generate(args, client, types):
    model_name = MODEL_MAP[args.model]
    full_prompt = build_prompt(args.prompt, args.aspect_ratio, args.image_size, args.model)

    config_kwargs = {"response_modalities": ["IMAGE", "TEXT"]}
    if args.ground_search and args.model == "pro":
        config_kwargs["tools"] = [types.Tool(google_search=types.GoogleSearch())]

    config = types.GenerateContentConfig(**config_kwargs)

    print(f"Generating with {model_name}...", file=sys.stderr)
    response = client.models.generate_content(
        model=model_name,
        contents=full_prompt,
        config=config,
    )

    return response


def run_edit(args, client, types, Image):
    model_name = MODEL_MAP[args.model]
    full_prompt = build_prompt(args.prompt, args.aspect_ratio, args.image_size, args.model)

    # Load reference images
    contents = []
    for img_path in args.image:
        if not os.path.exists(img_path):
            print(f"Error: Image not found: {img_path}", file=sys.stderr)
            sys.exit(1)
        img = Image.open(img_path)
        contents.append(img)
    contents.append(full_prompt)

    config_kwargs = {"response_modalities": ["IMAGE", "TEXT"]}
    if args.ground_search and args.model == "pro":
        config_kwargs["tools"] = [types.Tool(google_search=types.GoogleSearch())]

    config = types.GenerateContentConfig(**config_kwargs)

    print(f"Editing with {model_name} ({len(args.image)} reference image(s))...", file=sys.stderr)
    response = client.models.generate_content(
        model=model_name,
        contents=contents,
        config=config,
    )

    return response


def extract_and_save(response, output_path, Image):
    for part in response.candidates[0].content.parts:
        if part.inline_data is not None:
            image = Image.open(io.BytesIO(part.inline_data.data))
            image.save(output_path)
            print(f"Saved: {output_path}")

            # Print dimensions
            w, h = image.size
            print(f"Dimensions: {w}x{h}", file=sys.stderr)
            return True
        elif part.text:
            print(f"Model note: {part.text}", file=sys.stderr)

    print("Error: No image was generated in the response.", file=sys.stderr)
    return False


def main():
    parser = argparse.ArgumentParser(
        prog="nano_banana",
        description="Nano Banana Image Generator - Gemini-powered image creation & editing",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    # --- generate ---
    gen = subparsers.add_parser("generate", help="Text-to-image generation")
    gen.add_argument("--prompt", required=True, help="Detailed text prompt (narrative, not keywords)")
    gen.add_argument("--model", choices=["flash", "pro"], default="flash", help="flash=fast, pro=highest quality")
    gen.add_argument("--aspect-ratio", default="1:1", help="e.g. 1:1, 16:9, 9:16, 3:4, 4:3")
    gen.add_argument("--image-size", choices=["1K", "2K", "4K"], default=None, help="Resolution (pro model only)")
    gen.add_argument("--ground-search", action="store_true", help="Enable Google Search grounding (pro only)")
    gen.add_argument("--output", "-o", default=None, help="Output file path (default: auto-timestamped)")

    # --- edit ---
    edit = subparsers.add_parser("edit", help="Edit/compose images with text prompts")
    edit.add_argument("--prompt", required=True, help="Editing instruction")
    edit.add_argument("--model", choices=["flash", "pro"], default="pro", help="flash=fast, pro=highest quality")
    edit.add_argument("--image", nargs="+", required=True, help="Reference image path(s)")
    edit.add_argument("--aspect-ratio", default="1:1", help="e.g. 1:1, 16:9, 9:16, 3:4, 4:3")
    edit.add_argument("--image-size", choices=["1K", "2K", "4K"], default=None, help="Resolution (pro model only)")
    edit.add_argument("--ground-search", action="store_true", help="Enable Google Search grounding (pro only)")
    edit.add_argument("--output", "-o", default=None, help="Output file path (default: auto-timestamped)")

    args = parser.parse_args()

    # --- Check API key ---
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        print("Error: Set GEMINI_API_KEY or GOOGLE_API_KEY environment variable.", file=sys.stderr)
        sys.exit(1)

    # --- Import dependencies ---
    try:
        from google import genai
        from google.genai import types
        from PIL import Image
    except ImportError as e:
        print(f"Missing dependency: {e}", file=sys.stderr)
        print("Install with: uv pip install google-genai pillow", file=sys.stderr)
        print("  Fallback:   python3 -m pip install google-genai pillow", file=sys.stderr)
        sys.exit(1)

    client = genai.Client(api_key=api_key)
    output_path = resolve_output_path(args.output)

    # --- Dispatch ---
    if args.command == "generate":
        response = run_generate(args, client, types)
    elif args.command == "edit":
        response = run_edit(args, client, types, Image)
    else:
        parser.print_help()
        sys.exit(1)

    if not extract_and_save(response, output_path, Image):
        sys.exit(1)


if __name__ == "__main__":
    main()
