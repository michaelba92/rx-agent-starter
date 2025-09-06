# RX Agent Starter (Next.js)

A minimal starter that wraps your prescription form as a **live assistant** and adds a pluggable **drug autocomplete**.

## Run locally
```bash
npm install
npm run dev
# open http://localhost:3000
```

## Where to plug in G‑Standaard (Z-Index)
- Replace `public/data/prk_sample.json` with your licensed dataset export (e.g., PRK description list).
- Update `app/api/search/route.js` to read from your dataset or a secure DB.
- **Note:** Using the G‑Standaard requires a license from Z‑Index. See their price/terms pages.

## PDF Export
For a production-ready vector PDF, port your current `buildPdf()` logic into an API route and return a PDF blob. The current demo uses a print window for simplicity.
