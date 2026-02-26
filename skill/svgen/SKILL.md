---
name: svgen
description: Use the svgen CLI to generate SVGs from text prompts, vectorize images to SVG, manage QuiverAI API config, and poll generation results. Trigger on "svgen", "quiver", "text to svg", "image to svg", "vectorize", "svg generation".
---

# svgen

## Quick start

```bash
# Install
npm i -g @vforsh/svgen

# Configure API key (stdin only for secret)
printf '<QUIVER_API_KEY>' | svgen cfg set apiKey -

# Generate SVG from prompt
svgen gen -p "A minimalist whale icon" --save-dir ./out

# Vectorize image
svgen vectorize --image-url https://example.com/logo.png --save-dir ./out
```

## Model notes (Quiver docs)

- SVG output is vector markup (`image/svg+xml`) suited for scalable logos/icons/illustrations.
- Current documented model examples use `arrow-preview`.
- Streaming responses emit progressive phases: `reasoning`, `draft`, `content`.

### Text to SVG (`/v1/svgs/generations`)

- Required fields: `model`, `prompt`.
- Optional fields: `instructions`, `n`, `stream`, `temperature`, `top_p`, `presence_penalty`, `max_output_tokens`, `references`.
- References accept image `url` or `base64`; up to 4 references.
- Parameter ranges from docs:
  - `n`: `1..16`
  - `temperature`: `0..2`
  - `top_p`: `0..1`
  - `presence_penalty`: `-2..2`
  - `max_output_tokens`: `1..131072`

```bash
svgen gen \
  --model arrow-preview \
  -p "Monoline whale logo, geometric, no text" \
  --instructions "flat monochrome icon, clean paths" \
  --reference-url https://example.com/style-ref.png \
  --temperature 0.4 \
  --top-p 0.9 \
  --save-dir ./out
```

### Image to SVG (`/v1/svgs/vectorizations`)

- Required fields: `model`, `image` (`{url}` or `{base64}`).
- Optional fields: `auto_crop`, `target_size`, plus shared sampling fields.
- Docs guidance: crop tightly to the subject when possible; use `auto_crop` as fallback.
- `target_size` range: `128..4096`.

```bash
svgen vectorize \
  --model arrow-preview \
  --image-url https://example.com/logo.png \
  --auto-crop \
  --target-size 1024 \
  --save-dir ./out
```

## Commands

- `svgen gen|run|do`: text-to-SVG generation
- `svgen vectorize`: image-to-SVG vectorization
- `svgen result <id>`: fetch generation payload by id
- `svgen wait <id>`: poll until generation appears complete
- `svgen models list|ls`: list models
- `svgen models get <model>`: get model metadata
- `svgen config|cfg list|ls|path|get|set|unset|import|export`: config management
- `svgen doctor|check`: read-only readiness checks
- `svgen skill`: print install URL for this skill

## Global flags

- `--json`: JSON output object
- `--plain`: stable plain-text lines
- `-q, --quiet`: reduce stderr logs
- `-v, --verbose`: verbose logs
- `--timeout <ms>`: request timeout
- `--retries <n>`: retry count for 429/5xx/network failures
- `--endpoint <url>`: override API endpoint
- `--region <name>`: optional region label in effective config

## Common errors

- Exit `1`: API/network failure or readiness failure
- Exit `2`: invalid CLI usage or validation error
- Typical API codes: `401` invalid key, `402` insufficient credits, `429` rate-limited, `5xx` upstream/internal
