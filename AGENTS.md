## General Rules
- **Runtime**: Bun-first repo. Use `bun install`, `bun run ...`, `bun test`. Avoid npm/yarn/pnpm for dev workflows.
- **File size**: Keep files under ~500 LOC. Split command handlers and helpers before adding branches.
- **Command shape**: Keep command actions orchestration-only; move payload building/parsing into `src/lib/**` and `src/cli/helpers.ts`.
- **Output contract**: stdout only for primary output. stderr only for logs/errors. Preserve `--json` and `--plain` behavior.
- **Secrets**: Never pass secrets in argv. For config secrets use stdin only (`svgen cfg set apiKey -`).

---

## Build / Test
- **Typecheck**: `bun run typecheck`
- **Unit tests**: `bun test`
- **Full gate**: `bun run typecheck && bun test`
- **CLI smoke**: `bun run cmd -- --help` and `bun run cmd -- doctor --json`

---

## Critical Thinking
- **Fix root cause**: Don’t patch symptoms in command handlers if schema/client layer is wrong.
- **Schema first**: For API changes, update Zod schemas/builders before command flags/output formatting.
- **Conflicts**: Prefer preserving CLI contracts over adding one-off special cases.
- **Unknown changes**: If unrelated files are modified, leave them untouched; scope edits to task files.

---

## Git
- **Commits**: Conventional Commits (`feat|fix|refactor|docs|test|chore`).
- **Atomicity**: Keep commits focused (command behavior vs docs vs tests).
- **Pre-push**: Run `bun run typecheck && bun test` before pushing.

---

## Repo Tour
- **Binary entrypoint**: `bin/svgen`
- **Process entrypoint**: `src/index.ts`
- **CLI wiring**: `src/cli/program.ts`
- **Commands**: `src/cli/commands/*.ts`
- **Config**: `src/config/schema.ts`, `src/config/store.ts`
- **API client/parsing**: `src/lib/quiver/*.ts`
- **Shared output/path helpers**: `src/lib/output.ts`, `src/lib/paths.ts`, `src/cli/helpers.ts`
- **Tests**: `tests/*.test.ts`
- **Consumer skill doc**: `skill/svgen/SKILL.md`

---

## Debug Cookbook
- **Missing API key**: `printf '<key>' | svgen cfg set apiKey -`
- **Effective config dump**: `svgen cfg export --json`
- **Readiness check**: `svgen doctor --plain`
- **Model API sanity**: `svgen models list --json`
- **Generation smoke**: `svgen gen -p "test icon" --json`

---

## Golden Paths
- **Add new CLI command**:
  1. Add file in `src/cli/commands/<name>.ts`
  2. Register in `src/cli/program.ts`
  3. Add/extend helpers in `src/lib/**` or `src/cli/helpers.ts`
  4. Add tests in `tests/*.test.ts`
  5. Update `README.md` and `skill/svgen/SKILL.md` if behavior changed
- **Add config key**:
  1. Update `PersistedConfigSchema` and defaults in `src/config/schema.ts`
  2. Update merge logic in `src/config/store.ts`
  3. Add key support in `src/cli/commands/config.ts`
  4. Add tests covering parsing/validation

---

## Contracts / Invariants
- **Env precedence**: environment variables override file config.
- **JSON mode**: `--json` must emit one JSON object and no extra stdout text.
- **Plain mode**: `--plain` must emit stable, script-friendly lines.
- **Doctor behavior**: `doctor|check` is read-only; no mutations.
- **Exit codes**: `0` success, `1` runtime/readiness failure, `2` invalid usage/validation.
