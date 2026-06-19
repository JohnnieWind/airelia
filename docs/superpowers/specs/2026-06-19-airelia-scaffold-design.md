# Airelia Scaffold Design

## Goal

Create a clean, runnable scaffold for a desktop-first agent app. Detailed product features are intentionally out of scope for this pass.

## Architecture

Use a root npm workspace as the desktop orchestrator. Electron lives at the repository root and loads the Vite renderer in development. The renderer lives in `packages/web` and talks to the local Spring Boot API in `packages/server`.

## Backend

The backend uses Spring Boot 3.5.14 on JDK 17. It exposes a small API surface:

- `GET /api/health` returns service health.
- `GET /api/runtime` confirms the Java runtime and AgentScope Harness classpath.
- `POST /api/agent/echo` provides a minimal request-response endpoint for wiring.

AgentScope is included as `io.agentscope:agentscope-harness:2.0.0-RC2`. The first scaffold validates the dependency is available without binding the future agent workflow to a premature API design.

## Frontend

The renderer uses Vite, React 18.2.0, and Tailwind CSS 3.4.17. It renders the shell status, calls the backend health/runtime endpoints, and includes a small echo form to prove end-to-end API communication.

## Verification

The scaffold is complete when `npm install`, `npm test`, and `npm run build` pass, and when `npm run dev` can start Spring Boot, Vite, and Electron together.

