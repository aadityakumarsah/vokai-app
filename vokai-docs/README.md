# VOKAI Docs

The standalone documentation site for VOKAI. It is a Bun-managed React application styled with Tailwind CSS and initialized with shadcn/ui.

## Run locally

```bash
cd vokai-docs
bun install
bun run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173`.

## Build for production

```bash
bun run build
bun run preview
```

The static production site is written to `vokai-docs/dist`.

## What the site covers

- A learner-first guide to getting started, building a daily coding habit, using Focus Coach, and seeing progress in the garden.
- Privacy and control, including a clear statement of what VOKAI does not monitor today.
- A clearly labelled roadmap for optional Focus Insights, VS Code/editor practice summaries, and a macOS/Windows desktop companion. These are planned ideas, not current product capabilities.
- A separate developer section covering Docker, local Expo/FastAPI setup, Supabase migrations, API endpoints, and troubleshooting.
