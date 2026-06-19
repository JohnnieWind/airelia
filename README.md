# Airelia

Airelia is a desktop-first agent app scaffold.

## Stack

- Desktop shell: Electron
- Frontend: Vite, React 18.2.0, Tailwind CSS 3.4.17
- Backend: Spring Boot 3.5.14, JDK 17, AgentScope Harness 2.0.0-RC2

## Layout

```text
.
├── electron/          # Electron main process and preload bridge
├── packages/web/      # Vite + React renderer
└── packages/server/   # Spring Boot local API
```

## Development

Install Java 17, Maven, Node.js, and npm, then run:

```bash
npm install
npm run dev
```

The dev command starts:

- Spring Boot on `http://localhost:8080`
- Vite on `http://localhost:5173`
- Electron after both local servers are ready

If Electron's first binary download is slow, run installation once with a mirror:

```bash
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ npm install
```

## Verification

```bash
npm test
npm run build
```

Backend-only commands:

```bash
cd packages/server
mvn test
mvn package
```
