# Airelia Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a clean, runnable scaffold for the Airelia desktop agent app.

**Architecture:** The root npm workspace orchestrates Electron, the Vite React renderer, and the Spring Boot local API. The backend exposes only health/runtime/echo endpoints so future agent features can be added without undoing early decisions.

**Tech Stack:** Electron, Vite, React 18.2.0, Tailwind CSS 3.4.17, Spring Boot 3.5.14, JDK 17, AgentScope Harness 2.0.0-RC2.

---

### Task 1: Repository Structure

**Files:**
- Create: `.gitignore`
- Create: `README.md`
- Create: `package.json`
- Create: `electron/main.cjs`
- Create: `electron/preload.cjs`

- [x] **Step 1: Add root workspace, Electron shell, and documentation**

### Task 2: Backend Scaffold

**Files:**
- Create: `packages/server/package.json`
- Create: `packages/server/pom.xml`
- Create: `packages/server/src/main/java/com/airelia/server/AireliaServerApplication.java`
- Create: `packages/server/src/main/java/com/airelia/server/health/HealthController.java`
- Create: `packages/server/src/main/java/com/airelia/server/runtime/RuntimeController.java`
- Create: `packages/server/src/main/java/com/airelia/server/agent/AgentController.java`
- Create: backend tests

- [x] **Step 1: Add Spring Boot API and tests**

### Task 3: Frontend Scaffold

**Files:**
- Create: `packages/web/package.json`
- Create: `packages/web/index.html`
- Create: `packages/web/src/App.tsx`
- Create: `packages/web/src/api.ts`
- Create: frontend tests and Tailwind config

- [x] **Step 1: Add Vite React renderer and tests**

### Task 4: Verification

- [x] **Step 1: Run `npm install`**
- [x] **Step 2: Run `npm test`**
- [x] **Step 3: Run `npm run build`**
- [x] **Step 4: Start `npm run dev` and confirm the servers launch**
