# GuideWise (educational CRISPR simulator, synthetic DNA only)

## Run (Windows, VS Code terminal, inside the folder that has package.json)
1. Node.js 22.13+ or 24 (nodejs.org LTS). No C++ build tools needed: SQLite is built into Node.
2. `npm.cmd install`   (a .npmrc is included, no extra flags needed)
3. `npm.cmd run dev`
4. Open http://localhost:3000

If PowerShell blocks npm, use `npm.cmd`, or run once:
`Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`

Optional: copy `.env.example` to `.env.local` and set GEMINI_API_KEY. Without a key the Q&A assistant works fully offline.

`npm.cmd test` runs 8 engine tests. A harmless "SQLite is an experimental feature" warning is normal.
