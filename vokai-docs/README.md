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

## Included guides

- Product overview and architecture
- Docker Compose setup
- Local client and FastAPI development
- Supabase migrations and authentication
- API endpoint reference
- Native Android voice typing
- Security, deployment, and troubleshooting
