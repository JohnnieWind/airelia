# Web Vite Template Rebuild Design

## Goal

Rebuild `packages/web` around the latest Vite React TypeScript template shape while keeping React on the current stable 18.x line. The result should make `tsconfig.json` and `vite.config.ts` look standard and easy to read, with AgentScope Spark Chat compatibility isolated away from the main Vite config.

## Non-Goals

- Do not rewrite backend or Electron code.
- Do not redesign the current Airelia UI.
- Do not upgrade React to 19 in this change.
- Do not remove the existing ReactBits Ferrofluid, Spark Design, or Spark Chat surface.

## Architecture

`packages/web` will adopt the latest template-style TypeScript split:

- `tsconfig.json` becomes a references-only entry.
- `tsconfig.app.json` owns browser React source settings.
- `tsconfig.node.json` owns Vite config and Node-side tooling settings.

`vite.config.ts` will stay close to the official template:

- import Vite plugins
- import a small local Spark Chat compatibility helper
- define plugins
- keep the existing dev server proxy
- keep Vitest settings

Spark Chat's package-level quirks will move to `packages/web/config/vite/sparkChatCompat.ts`. That helper will expose the root alias and optimizeDeps entries needed to use only the required Spark Chat submodules without loading the AGUI/CopilotKit barrel.

## Data Flow

Frontend runtime behavior remains unchanged:

- React mounts `src/main.tsx`.
- `App.tsx` renders the current status panels, Ferrofluid background, and Spark UI surface.
- API calls still use `/api` and are proxied to `http://localhost:8080` in development.
- Spark Chat components are imported from submodule paths and resolved through the compatibility helper during Vite dev pre-bundling.

## Error Handling

The UI keeps its current frontend behavior for unavailable backend services: API failures are rendered as request failure states rather than causing a blank page. Vite compatibility errors should be caught by real dev-browser verification, not only by production build.

## Testing Strategy

Run frontend verification after implementation:

- TypeScript compile: `npm --workspace @airelia/web run lint`
- Production build: `npm --workspace @airelia/web run build`
- Unit tests: `npm --workspace @airelia/web test`
- Whitespace check: `git diff --check`
- TS-only source check for `packages/web`
- Real Vite dev page load in a browser, checking that Ferrofluid and Spark UI render without the previous runtime SyntaxError

## Commit Strategy

Commit the design first. Then implement as a separate frontend refactor commit. No backend commit is expected.
