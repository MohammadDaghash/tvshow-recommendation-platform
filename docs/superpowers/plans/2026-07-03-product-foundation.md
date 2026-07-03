# Product Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the frontend into maintainable modules, add a first-party interaction event foundation, and apply scoped premium UI polish without exceeding 1000 lines per file.

**Architecture:** Keep the app as a modular monolith with microservice-style boundaries. Frontend orchestration moves out of `App.jsx` into focused hooks/services. Backend interaction collection follows the existing Express/Mongoose controller-service-model pattern.

**Tech Stack:** React, Vite, CSS modules-by-file, Express, Mongoose, Node test runner.

---

### Task 1: Frontend App Decomposition

**Files:**
- Create: `client-react/src/sessionStorage.js`
- Create: `client-react/src/httpClient.js`
- Create: `client-react/src/hooks/useInitialData.js`
- Create: `client-react/src/hooks/useLibraryViewModel.js`
- Modify: `client-react/src/App.jsx`
- Test: `client-react/src/fileSize.test.js`

- [ ] **Step 1: Move session helpers**

Create `client-react/src/sessionStorage.js` with the current session constants and `readStoredSession`, `saveStoredSession`, and `clearStoredSession`.

- [ ] **Step 2: Move response/header helpers**

Create `client-react/src/httpClient.js` with `authHeaders`, `parseJSONResponse`, `fetchInitialData`, and `fetchIgnoredSuggestionIds`.

- [ ] **Step 3: Extract initial data hook**

Create `client-react/src/hooks/useInitialData.js` to own `recommendations`, `mlSuggestions`, `ignoredSuggestionIds`, `initialLoad`, `loadAppData`, `refreshRecommendations`, and `refreshMLSuggestions`.

- [ ] **Step 4: Extract derived page data hook**

Create `client-react/src/hooks/useLibraryViewModel.js` to own demo/private list derivation, AI suggestion visibility, filtering, grouping, carousel config, and page counts.

- [ ] **Step 5: Wire `App.jsx` to new modules**

Replace duplicated logic in `App.jsx` with imports from the new modules. Preserve existing component props and behavior.

- [ ] **Step 6: Verify file limits**

Run: `cd client-react && npm test -- src/fileSize.test.js`

Expected: pass with no file over 1000 lines.

### Task 2: Interaction Event Foundation

**Files:**
- Create: `cinema-ws/models/UserInteraction.js`
- Create: `cinema-ws/services/interactionEvent.service.js`
- Create: `cinema-ws/test/interactionEvent.service.test.js`
- Modify: `cinema-ws/app.js`
- Modify: `cinema-ws/controllers/recommendation.controller.js`
- Modify: `cinema-ws/controllers/ignoredSuggestion.controller.js`

- [ ] **Step 1: Write service tests first**

Add tests that prove event payloads keep allowed metadata, reject missing users/event types, and normalize object ids without requiring a database connection.

- [ ] **Step 2: Implement model**

Add a `UserInteraction` Mongoose model with `user`, `eventType`, optional `tvShow`, optional `tmdbId`, optional `title`, optional `sourcePage`, optional `rating`, optional `status`, and `metadata`.

- [ ] **Step 3: Implement service**

Add `buildInteractionEvent` and `recordInteractionEvent`. The builder returns a plain object for tests. The recorder should swallow logging failures only when explicitly called as best-effort from existing product flows.

- [ ] **Step 4: Record meaningful actions**

Record events for user status updates, rating submissions, TMDB suggestion accepts, library removals, and ignored suggestions. Do not record logged-out demo-mode actions because those do not hit protected backend routes.

- [ ] **Step 5: Run backend tests**

Run: `cd cinema-ws && npm test`

Expected: all backend tests pass.

### Task 3: Premium UI Polish

**Files:**
- Modify: `client-react/src/styles/base.css`
- Modify: `client-react/src/styles/cards.css`
- Modify: `client-react/src/styles/modals.css`
- Modify: `client-react/src/styles/responsive.css` only if mobile fixes are needed

- [ ] **Step 1: Improve cinematic shell depth**

Strengthen background layering, hero glass, stat pills, and control panels using existing variables and restrained color.

- [ ] **Step 2: Improve card depth and motion**

Add stronger poster framing, glass highlights, hover lift, press states, and badge polish while keeping default cards clean.

- [ ] **Step 3: Improve modal/action surface**

Refine modal glass, action panels, and button depth while keeping centered modal behavior.

- [ ] **Step 4: Verify frontend**

Run:

```bash
cd client-react
npm test
npm run build
```

Expected: tests and build pass.

### Task 4: Final Verification And Commit

**Files:**
- All changed project files.

- [ ] **Step 1: Check global line limit**

Run:

```bash
find . \( -path './.git' -o -path './*/node_modules' -o -path './*/dist' \) -prune -o -type f -print | while IFS= read -r f; do lines=$(wc -l < "$f"); if [ "$lines" -gt 1000 ]; then printf '%5s %s\n' "$lines" "$f"; fi; done | sort -nr
```

Expected: no output.

- [ ] **Step 2: Review scoped diff**

Run: `git diff -- client-react/src cinema-ws docs`

Expected: only planned frontend, backend, and docs changes.

- [ ] **Step 3: Commit scoped changes**

Run:

```bash
git add client-react/src cinema-ws docs
git commit -m "Add product foundation and interaction tracking"
```

Expected: commit excludes unrelated Docker and README changes.
