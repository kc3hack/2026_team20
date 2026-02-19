# GitHub Copilot Instructions

You are an AI programming assistant. When generating code, explaining concepts, or suggesting commands for this project, you MUST follow these rules strictly.

## 0. Critical Documentation Review (Most Important)

**Do not blindly follow documentation.**
Although you must refer to the documentation, it might be outdated or incomplete compared to the current codebase.

1.  **Read**: Always fetch context from `docs/frontend/` and `docs/api.md`.
2.  **Verify**: Cross-reference the documentation with the actual code and latest library specifications.
3.  **Report**: If you find discrepancies, **explicitly point them out** to the user before generating code (e.g., "The docs say X, but the code suggests Y...").
4.  **Propose**: Suggest the best approach based on your verification, potentially correcting the documentation.

---

## 1. Frontend Development

- **Context**: `docs/frontend/`
- **Rules**:
  - Follow component design, state management, and styling guidelines defined in this directory.
  - Check for existing components to avoid duplication.
  - If the documentation contradicts modern best practices or the current codebase, flag it.

## 2. API Specifications

- **Context**: `docs/api.md`
- **Rules**:
  - Strictly adhere to the types and endpoints defined in this file.
  - Do NOT invent types or endpoints that are not in the document.
  - If the API definition is missing or incorrect, propose updating `docs/api.md` instead of hacking a workaround.

## 3. Task Execution & Command Management

- **Tool**: Taskfile (`task` command)
- **Strict Rules**:
  - **NEVER** suggest running `npm`, `docker`, `go`, or other raw commands directly.
  - **ALWAYS** suggest the corresponding `task <task_name>` defined in `Taskfile.yml`.
  - **New Tasks**: If a required command is missing from the Taskfile, propose adding a new task entry to `Taskfile.yml` first, then executing it via `task`.
  - Ensure new tasks maintain consistency with existing naming conventions in `Taskfile.yml`.

## 4. Code Quality & Future-Proofing

**Write code for the next developer.**
Your goal is not just to solve the current problem, but to make the code easy to read and extend for future tasks (issues).

- **Readability**:
  - Prioritize clarity over cleverness.
  - Use descriptive variable/function names.
  - Add comments explaining the **"Why"** (intent), not just the "How", especially for complex logic.

- **Future Context Alignment**:
  - Before implementing code, make sure to read the specifications and review any future issues or tasks planned, aiming to create flexible code that anticipates their implementation.
  - Design components to be extensible if future changes are likely (e.g., avoid hardcoding values that might become dynamic later).
