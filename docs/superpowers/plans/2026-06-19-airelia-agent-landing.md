# Airelia Agent Landing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the scaffold homepage with a light desktop Agent workbench entry screen that closely matches the provided WorkBuddy-style reference and keeps the primary experience in one viewport.

**Architecture:** Keep the change inside `packages/web`. `App.tsx` becomes a static presentational home screen, `App.test.tsx` describes the expected user-facing regions, and global styles remain minimal.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Vitest, React Testing Library, lucide-react.

---

### Task 1: Landing Page Tests

**Files:**
- Modify: `packages/web/src/App.test.tsx`

- [x] **Step 1: Replace scaffold tests with workbench tests**

Test the visible product surface: heading, sidebar navigation, composer, workspace picker, and first-screen best-practice examples. Remove fetch mocking because the new homepage does not call the backend.

- [x] **Step 2: Run the test and verify RED**

Run: `npm --workspace @airelia/web test -- App.test.tsx`

Expected: fail because `App.tsx` still renders the old scaffold labels instead of the new workbench labels.

### Task 2: Workbench UI

**Files:**
- Modify: `packages/web/src/App.tsx`

- [x] **Step 1: Replace old scaffold homepage**

Remove API state, health/runtime cards, echo form, `SoftAurora`, and `SparkSurface` from the homepage. Render the WorkBuddy-like shell using static arrays for navigation, tasks, spaces, modes, tools, and best-practice workflows. Keep the left sidebar visible across adaptive widths and place workflows in the bottom example row to match the reference.

- [x] **Step 2: Run the App test and verify GREEN**

Run: `npm --workspace @airelia/web test -- App.test.tsx`

Expected: pass.

### Task 3: Polish And Verification

**Files:**
- Modify if needed: `packages/web/src/styles.css`

- [x] **Step 1: Keep global styles compatible**

Ensure global styles do not force the old shell background or break the light workbench surface.

- [x] **Step 2: Run focused verification**

Run:

```bash
npm --workspace @airelia/web test
npm --workspace @airelia/web run lint
git diff --check
```

- [x] **Step 3: Browser verification**

Start `npm --workspace @airelia/web run dev -- --port 5173` if no dev server is already running, then open `http://127.0.0.1:5173/` and check desktop/mobile screenshots for obvious overlap or blank rendering.
