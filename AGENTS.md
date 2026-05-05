# AGENTS.md

## Token-efficient working rules

- Do not scan the whole repository unless necessary.
- First inspect only files directly related to the task.
- If more files are needed, explain why before reading them.
- Do not paste long logs or full file contents.
- Show only relevant error lines.
- Make the smallest possible patch.
- Do not redesign global UI unless explicitly requested.
- Do not modify unrelated files.
- Prefer targeted tests over full build/test.
- Final answer must be short: changed files, what changed, how to test.

## Project context

- Frontend: Next.js App Router, TypeScript, Tailwind CSS.
- Backend: Go Gin + GORM.
- Database: PostgreSQL.
- Keep frontend and backend changes separated.