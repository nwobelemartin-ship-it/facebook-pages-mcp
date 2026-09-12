# Guardrails

Engineering guardrails for **facebook-pages-mcp**. These are binding rules for
every human and automated contributor (including AI coding agents) working in
this repository. When a tool's default behavior conflicts with this document,
this document wins for work committed to this repo.

---

## 1. Commit authorship and trailers

**Rule: never add AI co-author, "generated-by", or assistant attribution
trailers to commits in this repository.**

Specifically, commit messages **must not** contain:

```
Co-authored-by: CommandCodeBot <noreply@commandcode.ai>
```

or any equivalent trailer/line naming an AI assistant, bot, or code-generation
tool as a co-author (e.g. `Co-authored-by: GitHub Copilot`, `Generated-by: …`,
`Assisted-by: …`, `Made-with: …`).

Rationale:

- Commit authorship should reflect the human(s) accountable for the change.
- Attribution trailers create noise in `git log`, break conventional tooling
  that parses trailers, and can misrepresent responsibility.
- Repository history should remain tool-agnostic.

Enforcement:

- Author commits with the human committer's identity.
- If an agent or tool defaults to injecting such a trailer, strip it before
  committing. Do not accept the tool's default message unchanged.
- Reviewers should reject any PR whose commits carry AI attribution trailers.

---

## 2. Commit hygiene

- One logical change per commit. Do not mix refactors with behavior changes.
- Use [Conventional Commits](https://www.conventionalcommits.org/) prefixes:
  `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`, `build:`, `ci:`.
- Subject line: imperative mood, ≤ 72 characters, no trailing period.
- Body (when needed): explain **why**, not what — the diff shows the what.
- Keep history linear and reviewable. Rebase feature branches; avoid merge
  commits on short-lived branches.
- Never rewrite shared history (`git push --force` to `main` is forbidden).

## 3. Secrets and configuration

- Never commit credentials, tokens, or `.env` files. `.env` is gitignored —
  keep it that way.
- Access tokens (`FB_PAGE_ACCESS_TOKEN`) and IDs (`FB_PAGE_ID`) are supplied via
  environment variables at runtime only.
- Configuration is validated at boot (`src/env.ts`); fail fast, never fall back
  to hardcoded defaults for secrets.
- If a secret is ever committed, treat it as compromised: rotate immediately and
  purge from history — do not merely delete it in a follow-up commit.

## 4. Dependencies

- Pin direct dependencies with a caret range and commit the lockfile.
- `npm ci` (never `npm install`) in CI and Docker builds for reproducibility.
- Run `npm audit --omit=dev` on every dependency change and record the result.
  Known transitive advisories must be tracked with a remediation owner, not
  silently ignored.
- Do not apply `npm audit fix --force` or cross-major-version bumps in a PR
  unrelated to that upgrade.

## 5. Build, test, and CI gates

- `npm run build` must pass with zero TypeScript errors before merge.
- New behavior requires tests; bug fixes require a regression test.
- CI must run: install → build → lint → test → audit.
- Never bypass hooks (`--no-verify`) or required checks to land a change.

## 6. Review and merge

- All changes land via pull request against `main`.
- At least one human approval is required; a human is accountable for every
  merged change regardless of how it was authored.
- PRs must state the problem, the approach, and how it was verified.
- Keep PRs small and scoped. Large, mixed PRs are rejected.

## 7. Runtime and deployment

- The server is stateless: a fresh `McpServer` instance per request. Do not
  introduce shared mutable session state without an explicit design review.
- Containers run as published in the `Dockerfile`; runtime images install
  production dependencies only (`npm ci --omit=dev`).
- Expose a `/health` readiness endpoint and keep it dependency-free.
- Log to stdout/stderr; do not write state to the container filesystem.

## 8. Tool/API surface stability

- MCP tool names, descriptions, and input schemas are a public contract. Treat
  description text as API: no paraphrasing, no silent drift.
- Any change to a tool's name, description, or schema requires review and a
  version bump.
- Keep the `McpServer` version in sync with `package.json`.

---

_This document is a repository policy. It applies to all contributors and
automation operating on this codebase._
