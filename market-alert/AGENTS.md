# AGENTS.md

## Project overview

`market-alert` is a standalone TypeScript/Node.js alert service inside the CCXT repository. It consumes public CCXT Pro market data, evaluates YAML-defined price rules, persists rule state in SQLite, and sends console or webhook notifications.

## Scope and source of truth

- This file applies to all work under `market-alert/`.
- Keep application source in `src/` and tests in `test/`.
- Do not modify generated output in `dist/`.
- Do not modify the parent CCXT exchange implementations for a market-alert-only change.
- The parent repository's `CLAUDE.md` remains relevant for changes to CCXT itself, especially anything under `ts/src/`.
- This project is TypeScript-first. There is no cross-language transpilation requirement for files under `market-alert/`.

## Runtime and commands

Run commands from `market-alert/` in PowerShell. Prefer `npm.cmd` over `npm`.

```powershell
npm.cmd install
npm.cmd run build
npm.cmd test
npm.cmd run test:watch
npm.cmd run dev -- rules.example.yaml
```

Before declaring a change complete:

1. Run `npm.cmd run build`.
2. Run `npm.cmd test`.
3. For runtime or WebSocket changes, perform a short smoke test with a safe, public-data rules file when practical.

## Code conventions

- Use strict TypeScript compatible with the existing `tsconfig.json`: ES2022, NodeNext modules, and explicit `.js` extensions in relative imports.
- Preserve the existing ESM style and avoid introducing CommonJS modules.
- Prefer small, testable functions and dependency injection for exchange, clock, storage, and output boundaries.
- Keep domain types in `src/types/` and validate external configuration at the boundary with Zod.
- Keep market-data normalization separate from rule evaluation and output delivery.
- Preserve graceful shutdown: stop workers, close SQLite state, and allow queued outputs to finish where possible.
- Avoid `any` in new code. If CCXT's dynamic API makes it unavoidable, isolate and document the cast at the boundary and add a focused test.
- Maintain the existing public behavior of `rules.example.yaml` unless the task explicitly changes it.

## Architecture map

- `src/main.ts`: startup, wiring, signal handling, and worker lifecycle.
- `src/config/`: YAML loading and Zod configuration schemas.
- `src/market/`: CCXT exchange creation, market seeding, subscriptions, and ticker normalization.
- `src/rules/`: price-change and price-target rule evaluation.
- `src/state/`: in-memory and SQLite state persistence.
- `src/outputs/`: console formatting, webhook delivery, retries, HMAC, and dead-letter handling.
- `src/types/`: shared event and market types.
- `test/`: Vitest unit and integration-style tests.
- `data/`: local runtime SQLite data; do not commit runtime state.

## CCXT and live-data safety

- Public market data does not require API keys. Never add credentials to source, YAML examples, tests, logs, or committed files.
- Do not add withdrawal, order creation, transfer, or other trading actions to this service unless explicitly requested and separately reviewed.
- Keep the current exchange scope (`binance`) and market types (`spot` and `swap`) unless the task explicitly expands them.
- Preserve subscription deduplication by exchange and market type. Do not create one worker per symbol when a shared subscription is possible.
- Preserve the distinction between `last` and `markPrice`, and between spot and swap symbols.
- Treat live exchange behavior as external and flaky: use mocks or deterministic fixtures for unit tests, and keep live smoke tests short and read-only.

## Configuration and persistence

- Configuration is YAML and must pass `configSchema` validation.
- Keep defaults backward-compatible unless a migration is part of the task.
- SQLite state must remain restart-safe. Test persistence and recovery changes across close/reopen cycles.
- Do not commit `data/market-alert.sqlite`, WAL/SHM files, `dead-letter.jsonl`, or other runtime artifacts.
- Webhook retries must remain bounded; do not create unbounded retry loops or block market-data workers indefinitely.

## Testing expectations

- Add or update a test for every behavior change.
- Test rule transitions, cooldowns, resets, symbol filtering, normalization, webhook payloads/retries, and persistence at the narrowest relevant layer.
- Keep tests deterministic and independent of real exchanges and external webhook services.
- When changing output payloads, update both console and webhook expectations if they share the same rendered shape.
- When changing configuration, update `rules.example.yaml` and README documentation when user-facing behavior changes.

## Change boundaries

- Keep changes focused on the requested behavior; do not reformat unrelated files.
- Avoid editing `package-lock.json` unless dependencies actually change.
- Do not delete or overwrite user runtime data. If a local database must be reset for testing, use a temporary path or obtain explicit direction.
- Review `git diff -- market-alert` before finishing and ensure no secrets, generated files, runtime data, or unrelated parent-repository changes are included.
