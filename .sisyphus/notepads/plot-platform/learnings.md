# Plot Platform Learnings

## Task 9: Plot Detail Page + Tiptap Editor

### Tiptap v2 / v3 incompatibility
- `@tiptap/extension-collaboration@3.19.0` exports `getUpdatedPosition` which does NOT exist in `@tiptap/core@2.x`
- This causes a hard build failure: `Module not found: Can't resolve 'getUpdatedPosition' from '@tiptap/core'`
- Solution: Remove `@tiptap/extension-collaboration` entirely. Task spec allows omitting Y.js sync.

### Supabase env in build
- `npm run build` fails at SSG for `/auth/login` because `supabaseUrl` is required at import time
- This is a pre-existing issue — not related to Task 9 changes
- `npx tsc --noEmit` passes cleanly, confirming TS correctness

### Section CRUD design
- `useSection` hook returns `createSection`, `deleteSection`, `canAddSection` (max 255), `uploadImage`
- Page.tsx wires inline input in the section tab bar for creating sections
- Delete button appears on hover (opacity transition) within each tab wrapper
- Delete requires `window.confirm()` guard; disabled when only 1 section remains

### Mobile behavior
- `useIsMobile(768)` controls `editable` flag
- When `!editable`: no section create/delete buttons, no image upload, TiptapEditor is read-only
- HistorySidebar hidden entirely on mobile
