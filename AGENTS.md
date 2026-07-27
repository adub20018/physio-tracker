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
  lives in `src/components/app-providers.tsx` (from the official Next.js guide). Without
  it, only theme CSS variables are injected and components render unstyled.
- **Slot parts often need `as={…}` composition to pick up styling.** e.g.
  `<DatePicker.Input as={InputText} />` (otherwise the input renders with no text-field
  styles) and `<DatePicker.Prev as={Button} iconOnly …>`. When a sub-part looks unstyled,
  check the docs demo for its `as` prop before debugging CSS. Also pass **stable object
  identities** for `value` props (memoize derived `Date` objects) — fresh objects each
  render trigger "Cannot update a component while rendering" warnings from the headless
  state sync.
- **Known v11.0.0 bug (upstream, no patch as of July 2026)**: mounting `DatePicker.Root`
  logs a dev-only React warning ("Cannot update a component (E) while rendering…") from the
  library's own mount-time state sync. Not fixable from our side (fires regardless of
  controlled/uncontrolled value), no functional impact, absent from production builds.
  Re-check on each primereact release; do not burn time debugging it again.
- **License**: v11 is under the PrimeUI license (free Community tier for individuals).
  The key comes from `NEXT_PUBLIC_PRIMEUI_LICENSE_KEY`; without it the app works but
  warns in the console.
- Docs: https://primereact.dev — every page has "Copy Markdown"; the URL index is at
  https://primereact.dev/llms.txt. The primereact README's provider snippet
  (`primereact/core`, `value` prop) is outdated; the provider is
  `@primereact/core`'s `PrimeReactProvider` with config as direct props.
- **`Menu.Item` composed `as={Link}`, when the item lives inside `Menu.Portal`, can silently
  eat the click and never navigate — intermittently.** Root cause (traced through
  `@primereact/headless/menu`): `Menu.Item`'s select/close logic runs on `mousedown`, not
  `click`. For items rendered inside `Menu.Portal` specifically (`inPortal: true` internally),
  that mousedown handler calls the popover's `setOpen(false)` synchronously — unmounting the
  portal, including the `<a>` mid-click — before the browser's `click` event fires. `Link`'s
  `router.push()` lives in its `onClick`, so if React's unmount wins the race, navigation
  never happens. Race outcome depends on timing, so it reproduces intermittently and isn't
  reliably triggerable on demand. Fix: pass `closeOnSelect={false}` on every `Menu.Item
  as={Link}` inside a `Menu.Portal` — this skips the mousedown-triggered close, leaving an
  explicit `onClick={() => setOpen(false)}` (fired safely on `click`, after `Link`'s own
  navigation) as the only thing that closes the menu. See `src/components/ui/nav/account-menu.tsx`.
  Not an issue for `Menu.Item`s rendered *without* a `Menu.Portal` (e.g. an inline menu inside
  an already-controlled `Drawer`, as in `app-nav.tsx`'s mobile nav) — they never hit this
  mousedown branch, so no fix needed there.

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
