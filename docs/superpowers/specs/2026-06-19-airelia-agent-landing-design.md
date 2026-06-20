# Airelia Agent Landing Design

## Goal

Replace the scaffold-style Airelia homepage with a polished desktop Agent workbench entry screen closely matching the provided light WorkBuddy reference. The first screen should feel like the app is ready for work: create a task, choose an agent mode, pick a workspace, and scan practical workflows without scrolling.

## Non-Goals

- Do not keep the old health/runtime/echo cards on the landing page.
- Do not keep the Spark preview surface on the landing page.
- Do not add new backend APIs, Electron main-process behavior, or persistence.
- Do not implement real task submission yet; this change is visual and structural.
- Do not use the earlier dark SoftAurora landing concept for this page.

## Placement

This change belongs in `packages/web`.

- `packages/web/src/App.tsx` renders the new static workbench home.
- `packages/web/src/App.test.tsx` verifies the main user-facing regions and labels.
- `packages/web/src/styles.css` keeps global theme/font defaults only; page-level styling stays in Tailwind classes in `App.tsx`.

No `packages/server` or `electron` changes are expected.

## UX Structure

The page uses a two-column desktop shell:

- Left sidebar: app controls, brand/version, primary navigation, recent tasks, spaces, and user footer.
- Main panel: local Agent status pill, a centered workbench column, large heading, primary mode tabs, secondary skill/category chips, prompt composer, workspace picker, and a three-card best-practice row below the composer.

The visual language is light, quiet, and desktop-native:

- Off-white main background.
- Light gray sidebar.
- Rounded but restrained controls.
- Dense, scannable navigation.
- A large composer as the main action point.
- A compact best-practice row below the composer, matching the reference page structure.
- Subtle generated mini previews instead of external image assets.

## Content

Use Airelia-specific copy:

- Brand: `Airelia v0.1.0`
- Heading: `Airelia` / `你的桌面智能工作台`
- Status: `本地 Agent 已连接`
- Main modes: `日常办公`, `代码开发`, `设计创意`
- Secondary modes: `文档处理`, `资料调研`, `项目推进`, `更多`
- Composer placeholder: `今天帮你做些什么？ @ 引用对话文件，/ 调用技能与指令`
- Best-practice workflows: `工作总结日报`, `行业研报精读摘要`, `项目数据分析仪表盘`

## Behavior

All controls are presentational in this iteration. Buttons and tabs should be accessible as buttons where they look actionable, but they do not need to mutate state yet. The composer is a styled textarea so future task submission can be added without changing the visual structure.

Responsive behavior:

- Desktop: fixed left sidebar around the reference width and a centered main workbench column.
- Narrower widths: the left sidebar remains visible and shrinks within a bounded range; the main column compresses while preserving the same structure.
- The best-practice cards remain as a row and shrink to fit the available width.

## Error Handling

There are no new remote requests. The page must render without relying on backend availability. Future API errors are outside this change.

## Testing Strategy

Update React Testing Library tests to assert:

- The Airelia workbench heading and local Agent status render.
- The sidebar navigation and recent-task sections render.
- The composer placeholder and workspace picker render.
- The best-practice example row and cards render.
- Old scaffold labels such as backend/runtime status and Spark preview are not required by the homepage tests anymore.

Run:

- `npm --workspace @airelia/web test`
- `npm --workspace @airelia/web run lint`
- `git diff --check`

If feasible, start the Vite dev server and visually verify the page in the in-app browser.
