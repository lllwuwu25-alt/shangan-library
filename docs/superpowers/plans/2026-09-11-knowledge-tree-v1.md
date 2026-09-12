# Knowledge Tree V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat resources list with a local-first, infinitely nested knowledge tree while preserving and migrating every legacy resource.

**Architecture:** Keep existing task, mistake, settings, and attachment storage intact. Add a focused `features/knowledge-tree` module with pure indexed tree utilities, a versioned IndexedDB repository, an asynchronous Zustand store, and responsive desktop/mobile views. Legacy `resources` remain as a rollback source; migration writes schema version 2 only after validation succeeds.

**Tech Stack:** React 19, TypeScript 6, Zustand 5, IndexedDB, Tauri 2, Tailwind CSS 4, dnd-kit, Node test runner.

**Spec:** `/Users/qichen/.codex/attachments/79701317-9fb9-41ad-8d19-f11ac7e8598a/pasted-text.txt`

## Global Constraints

- Keep all existing resource and attachment data; migration must be idempotent and failure must not advance schema version.
- Store knowledge structure as flat nodes connected only by stable `id` and `parentId` values.
- Keep files, tags, tag relations, and node relations separate from nodes.
- Do not put file bytes in Zustand; reuse existing IndexedDB attachment bodies and Tauri source paths.
- Preserve the existing local-first behavior and all task, mistake, settings, and Pomodoro data.
- Desktop uses a tree sidebar and workspace; mobile uses progressive drill-down navigation.
- Tree motion stays within 150–240 ms and respects reduced motion.
- Do not implement AI behavior; expose only the future organizer interface.

---

### Task 1: Tree Domain and Invariants

**Files:**
- Create: `src/features/knowledge-tree/types/knowledge.ts`
- Create: `src/features/knowledge-tree/utils/tree.ts`
- Create: `src/features/knowledge-tree/utils/order.ts`
- Create: `src/features/knowledge-tree/tests/tree.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces `KnowledgeNode`, `ResourceFile`, `Tag`, `NodeTagRelation`, `NodeRelation`, `KnowledgeData`.
- Produces `buildTreeIndex`, `getChildren`, `getAncestors`, `getDescendants`, `isDescendant`, `getBreadcrumb`, `moveNode`, `reorderNode`, `softDeleteNode`, `validateKnowledgeTree`.

- [ ] Write literal-fixture tests for nesting, ancestors, descendants, breadcrumbs, cycle rejection, fractional ordering, soft deletion, and validation failures.
- [ ] Run `npm test -- tree.test.ts`; verify failures are caused by missing domain modules.
- [ ] Implement the minimal types and pure utilities with one `nodeMap` and `childrenMap` index per node set.
- [ ] Run `npm test -- tree.test.ts`; verify all tree tests pass.

### Task 2: Safe Legacy Migration

**Files:**
- Create: `src/features/knowledge-tree/services/migration.ts`
- Create: `src/features/knowledge-tree/tests/migration.test.ts`

**Interfaces:**
- Consumes existing `ResourceItem[]` and attachment metadata.
- Produces `migrateLegacyResources(resources, existing?)` with schema version 2 data and a validation report.

- [ ] Write failing tests for category folders, single-file resources, multi-file collections, empty-note resources, attachment identity preservation, repeated migration, and invalid-result version safety.
- [ ] Run the migration tests and confirm expected failures.
- [ ] Implement deterministic legacy IDs and count/integrity checks without altering legacy resources.
- [ ] Run tree and migration tests; verify all pass.

### Task 3: IndexedDB Repository and Store

**Files:**
- Create: `src/features/knowledge-tree/repositories/knowledgeRepository.ts`
- Create: `src/features/knowledge-tree/services/knowledgeService.ts`
- Create: `src/features/knowledge-tree/store/knowledgeStore.ts`
- Create: `src/features/knowledge-tree/services/organizer.ts`
- Create: `src/features/knowledge-tree/tests/service.test.ts`

**Interfaces:**
- Repository reads/writes one atomic `KnowledgeData` snapshot in `shangan-library-knowledge`, version 1.
- Store exposes initialize, select, expand, create, update, move, reorder, archive, tag, status, favorite, recent, filter, search, and view-mode actions.

- [ ] Write failing service tests using a real in-memory repository implementation for persistence, cycle errors, timestamps, and relation cleanup.
- [ ] Run tests and confirm failures.
- [ ] Implement repository, service, store, migration-on-initialize, and `KnowledgeOrganizer` interface.
- [ ] Run all unit tests and TypeScript checks.

### Task 4: Knowledge Tree Navigation

**Files:**
- Create: `src/features/knowledge-tree/components/KnowledgeTreeSidebar.tsx`
- Create: `src/features/knowledge-tree/components/TreeNode.tsx`
- Create: `src/features/knowledge-tree/components/TreeToolbar.tsx`
- Create: `src/features/knowledge-tree/components/NodeContextMenu.tsx`
- Create: `src/features/knowledge-tree/hooks/useKnowledgeTree.ts`

**Interfaces:**
- Consumes indexed nodes and store actions.
- Produces accessible selection, expand/collapse, inline rename, context actions, and keyboard navigation.

- [ ] Add behavior checks for initial collapsed state, selected-node visibility, rename save/cancel, arrow navigation, Enter, F2, Delete, Cmd/Ctrl+N, and Cmd/Ctrl+K.
- [ ] Implement the desktop tree with restrained 180–220 ms transform/opacity motion.
- [ ] Verify keyboard focus, long titles, dark mode, and no horizontal page overflow.

### Task 5: Drag, Move, and Reorder

**Files:**
- Modify: `package.json`, `package-lock.json`
- Create: `src/features/knowledge-tree/components/MoveNodeDialog.tsx`
- Modify: tree components and knowledge store.

**Interfaces:**
- Uses dnd-kit sensors on desktop and a dialog fallback on touch/mobile.
- Calls `moveNode(id, parentId, beforeId?)` and persists fractional order values.

- [ ] Add failing move/reorder integration cases for child moves, sibling insertion, self rejection, descendant rejection, and metadata preservation.
- [ ] Install and wire dnd-kit with visible target feedback and screen-reader announcements.
- [ ] Verify refresh persistence and rapid repeated moves.

### Task 6: Current Node Workspace

**Files:**
- Create: `src/features/knowledge-tree/components/Breadcrumb.tsx`
- Create: `src/features/knowledge-tree/components/NodeWorkspace.tsx`
- Create: `src/features/knowledge-tree/components/NodeCard.tsx`
- Create: `src/features/knowledge-tree/components/NodeList.tsx`
- Create: `src/features/knowledge-tree/components/NodeDetails.tsx`
- Create: `src/features/knowledge-tree/components/CreateNodeDialog.tsx`
- Create: `src/features/knowledge-tree/components/TagSelector.tsx`
- Create: `src/features/knowledge-tree/components/LearningStatusSelector.tsx`

**Interfaces:**
- Workspace renders direct children in persisted grid/list mode.
- Details resolve file, tags, dynamic breadcrumb, relations, timestamps, and actions.

- [ ] Implement creation for knowledge nodes, folders, notes, links, uploaded files/images/videos, and multi-file drop.
- [ ] Reuse existing file preview/open/reveal behavior through `ResourceFile` adapters.
- [ ] Implement tags, learning status, favorite, move, rename, archive, and relation counts.
- [ ] Verify file movement changes only `parentId` and never copies attachment bytes.

### Task 7: Search and Virtual Views

**Files:**
- Create: `src/features/knowledge-tree/hooks/useNodeSearch.ts`
- Modify: toolbar, sidebar, workspace, and store.

**Interfaces:**
- Searches title, description, tag names, and file names with dynamic breadcrumb output.
- Virtual views: recent, favorite, unlearned, learning, review, completed, mastered.

- [ ] Add search cases for all indexed fields and ancestor expansion on result selection.
- [ ] Implement Cmd/Ctrl+K focus, recent 50 limit, filter counts, and persisted selected view.
- [ ] Verify moved nodes immediately show updated search paths.

### Task 8: Responsive Resources Page

**Files:**
- Replace: `src/pages/Resources.tsx`
- Create: `src/features/knowledge-tree/components/MobileKnowledgeBrowser.tsx`
- Create: `src/features/knowledge-tree/components/KnowledgeLibrary.tsx`

**Interfaces:**
- Desktop renders tree plus workspace.
- Mobile renders breadcrumb-backed progressive drill-down with back-stack behavior and long-press actions.

- [ ] Implement loading, migration-error, first-use, empty-tree, desktop, and mobile states.
- [ ] Verify mobile back returns one knowledge level, not the resources root.
- [ ] Verify touch targets, text wrapping, dark theme, and vertical-only page scrolling.

### Task 9: Backup, Counts, and Compatibility

**Files:**
- Modify: `src/pages/Settings.tsx`
- Modify: `src/pages/Dashboard.tsx`
- Modify: `src/lib/files.ts`
- Modify: `src/types.ts`

**Interfaces:**
- Full backup adds optional `knowledge` payload while still importing v1 backups.
- Dashboard and safety center count active knowledge resource nodes after initialization.

- [ ] Add backup/restore compatibility tests for v1 and v2 data.
- [ ] Include knowledge metadata and referenced attachment bodies in export/restore.
- [ ] Verify legacy backup restore triggers one migration and preserves all old files.

### Task 10: Performance and Release Verification

**Files:**
- Create: `src/features/knowledge-tree/tests/performance.test.ts`
- Modify only files implicated by measured failures.

**Interfaces:**
- Validates index, search, move, and render preparation against deterministic 100/500/1000/5000-node fixtures.

- [ ] Run unit and performance tests and correct measured hot paths.
- [ ] Run `npm run lint`, `npm test`, and `npm run build`.
- [ ] Run browser checks at 1440×900, 1080×720, 768×1024, and 390×844 for tree operations, search, upload, preview, dark mode, and overflow.
- [ ] Run `cargo check --manifest-path src-tauri/Cargo.toml` and a Tauri development smoke check where available.
- [ ] Confirm migration counts, restart persistence, node movement, tags, status, search, and mobile navigation using real local sample data.
