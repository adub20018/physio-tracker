<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# PrimeReact v11 gotchas (learned the hard way — do not rediscover)

- **Styled components import from `@primereact/ui/<component>`**, e.g.
  `import { CardRoot } from "@primereact/ui/card"`. The plain `primereact` package is the
  headless layer and renders with NO styles. Component CSS lives in `@primereact/styles/*`,
  pulled in automatically by the `@primereact/ui` wrappers.
- **Import the named exports (`CardRoot`, `CardBody`…), not the `Card` namespace** —
  namespace objects break at the React server→client component boundary
  ("Element type is invalid: … got: undefined").
- Components are **compound**: `<CardRoot><CardBody><CardTitle>…` instead of v10's
  `<Card title=…>`. v10 knowledge does not transfer; check the docs.
- **SSR styling** requires the `PrimeReactStyleSheet` + `useServerInsertedHTML` wiring that
  lives in `src/components/ui/app-providers.tsx` (from the official Next.js guide). Without
  it, only theme CSS variables are injected and components render unstyled.
- **License**: v11 is under the PrimeUI license (free Community tier for individuals).
  The key comes from `NEXT_PUBLIC_PRIMEUI_LICENSE_KEY`; without it the app works but
  warns in the console.
- Docs: https://primereact.dev — every page has "Copy Markdown"; the URL index is at
  https://primereact.dev/llms.txt. The primereact README's provider snippet
  (`primereact/core`, `value` prop) is outdated; the provider is
  `@primereact/core`'s `PrimeReactProvider` with config as direct props.

# Project ground rules

See [PLAN.md](PLAN.md) for what is being built. The rules below govern *how* it is built.

## Git workflow

- **One branch per plan phase**, named `phase-N-short-description` (e.g. `phase-1-data-import`),
  branched from `main`.
- **One commit per feature** within a phase — small, self-contained commits with clear
  messages (imperative mood, e.g. `Add flare detection to domain layer`). Never batch a
  whole phase into a single commit.
- **At the end of each phase, open a pull request** into `main`. The phase is merged only
  after the PR review; do not commit directly to `main`.
- Never commit secrets: `.env*` files stay gitignored. Turso credentials and the app
  password live only in env vars (locally and in Vercel).

## Code quality

- **Modular, DRY, minimal entanglement.** Follow the architecture in PLAN.md §5 strictly:
  one-way dependency direction (`app → components / domain / repositories → db`), nothing
  imports upward, `domain/` imports nothing. If two places need the same logic, extract it —
  never copy-paste.
- **Each concern behind its own interface.** UI never touches Drizzle directly; charts hide
  Recharts behind our own props; PrimeReact usage is composed in `components/ui/` where a
  wrapper makes sense. Swapping any library should touch one folder.
- **Comment every code block.** Each file, component, function, and non-trivial logic block
  gets a comment at the top explaining its purpose and what it does. Write for a reader
  approaching the codebase fresh.
- **Domain functions are pure and unit-tested.** All derived metrics (rolling averages,
  physio volume, flare detection, correlations) live in `domain/` with tests; no DB or
  browser needed to test them.
- **Keep dependencies minimal.** Do not add a new library without flagging it to the user
  first — prefer what is already installed.

## Data safety

- This app holds personal health data. The production DB is the source of truth once the
  spreadsheet import runs — **never run destructive migrations or bulk edits against it
  without explicit confirmation**, and verify the import against the spreadsheet before
  treating it as done.
- Schema changes go through Drizzle migrations only; never hand-edit the database.

## Verification

- Run `npm run lint` and `npm run build` before every PR; both must pass.
- UI work must be checked in the browser before being called done — including a
  **mobile-width check** for anything on the `/log` page, since daily logging happens
  on a phone.
