# svgen

Bun CLI for QuiverAI SVG generation API.

- Text to SVG (`gen` / aliases `run`, `do`)
- Image to SVG (`vectorize`)
- Result polling (`result`, `wait`)
- Config management (`config` / alias `cfg`)
- Diagnostics (`doctor` / alias `check`)
- Skill URL discovery (`skill`)

## Install

```bash
bun install
bun link
svgen --help
```

## Auth

Use env var or config (stdin for secrets):

```bash
export SVGEN_API_KEY="<your-key>"
# or
printf '<your-key>' | svgen cfg set apiKey -
```

## Quick start

```bash
# generate one SVG
svgen gen -p "A flat rocket logo" --save-dir ./out

# vectorize image URL
svgen vectorize --image-url https://example.com/logo.png --save-dir ./out

# list models
svgen models list

# fetch or wait for a generation id
svgen result resp_123
svgen wait resp_123 --interval 2000 --max-wait 120000
```

## Config

```bash
svgen cfg ls
svgen cfg get endpoint model retries
svgen cfg set endpoint=https://api.quiver.ai retries=3 model=arrow-preview
printf '<key>' | svgen cfg set apiKey -
svgen cfg unset retries model
cat config.json | svgen cfg import --json
svgen cfg export --json
```

## Output modes

- `--json`: single JSON object to stdout
- `--plain`: stable plain lines for scripts
- default: human-readable output

## Doctor

```bash
svgen doctor
svgen doctor --json
```

Exit codes:

- `0`: ready / success
- `1`: runtime failure or not ready
- `2`: invalid usage

## Skill install URL

```bash
svgen skill
```
