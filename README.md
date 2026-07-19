# VOKAI

VOKAI is an Android-first learning companion for a focused, personalised 90-day coding journey. It combines a calm mobile learning experience with a FastAPI backend that securely stores a learner’s profile, syllabus, daily check-ins, streaks, and progress garden.

**Documentation**: [docs-vokai.vercel.app](https://docs-vokai.vercel.app/)

## The problem

Most coding courses give learners content, but not a sustainable routine. People lose momentum because the next step is unclear, the plan is not adapted to their available time, and progress is difficult to see. Generic chat tools can answer questions, but they do not know the learner’s journey day, routine, completed tasks, or long-term goal.

## The solution

VOKAI turns coding practice into a small daily habit:

- a 90-day path built around the learner’s language, experience, and schedule;
- three focused daily actions: learn, build, and reflect;
- an AI-generated syllabus with one topic per day;
- a Focus Coach that uses the saved plan and today’s progress to suggest the next tiny step;
- streaks, check-ins, and a visual garden that grows with consistent work;
- voice typing in the coach so learners can speak questions and edit the transcription before sending;
- local daily reminders on Android.

## What the project contains

```text
vokai-app/
├── vokai-client/       Expo / React Native mobile and web client
│   ├── app/             Screens and application entry point
│   ├── src/             API, storage, theme, notifications, and garden components
│   ├── android/         Generated Android development project
│   └── ios/             Generated iOS development project
├── vokai-server/       FastAPI backend
│   ├── app/             API implementation
│   └── sql/             Supabase schema migrations (001–012)
├── compose.yaml         Docker Compose setup for server and web client
└── README.md
```

## Who should use VOKAI

VOKAI is intended for:

- beginners who need a clear first coding path;
- intermediate learners who want a consistent project routine;
- self-directed learners who struggle with planning or follow-through;
- mentors, bootcamps, and learning communities that want a habit-oriented coding companion;
- developers who want a private, account-based progress record rather than a disposable chat session.

It is not a replacement for an accredited course, professional code review, or production security review. AI suggestions should be checked before being used in important systems.

## When to use it

Use VOKAI when you want to study in short, repeatable sessions and need help deciding what to do next. A typical session is:

1. Open today’s check-in.
2. Complete the learn, build, and reflect tasks at your own pace.
3. Open Focus Coach when you are stuck or need a smaller next step.
4. Mark the task complete and let the garden record the progress.

## Architecture

```text
Expo / React Native client
        │ Supabase access token + JSON API
        ▼
FastAPI server ─── Gemini Focus Coach (optional)
        │
        ▼
Supabase PostgreSQL + Row Level Security
```

The client never receives the Gemini API key. The server validates the Supabase bearer token on protected requests and uses the authenticated Supabase user ID as the owner of profiles, check-ins, and syllabi.

## Requirements

For local development:

- Node.js 20 or newer and npm;
- Python 3.11 or newer;
- a Supabase project with PostgreSQL and Authentication enabled;
- Docker Desktop, if using the container workflow;
- Android Studio and an Android SDK for a native Android build;
- a Gemini API key only if the Focus Coach endpoint is required.

## Fastest start with Docker

Docker runs the FastAPI server and exports the Expo client as a web application. The web client is available at `http://localhost:8080` and the API documentation at `http://localhost:8000/docs`.

### 1. Configure the server

Copy the example server environment file and fill in the Supabase values:

```bash
cp vokai-server/.env.example vokai-server/.env
```

At minimum, configure `DIRECT_URL`, `DATABASE_URL`, `SUPABASE_URL`, and `SUPABASE_PUBLISHABLE_KEY`. Add `GEMINI_API_KEY` to enable Focus Coach responses.

### 2. Apply the database schema

In the Supabase Dashboard, open **SQL Editor** and run these files in order. Run every file, including `012`:

```text
vokai-server/sql/001_create_vokai_user_profiles.sql
vokai-server/sql/002_create_vokai_user_checkins.sql
vokai-server/sql/003_add_vokai_indexes.sql
vokai-server/sql/004_enable_vokai_rls.sql
vokai-server/sql/005_add_vokai_rls_policies.sql
vokai-server/sql/006_add_vokai_profile_updated_at_trigger.sql
vokai-server/sql/007_add_vokai_language_and_routine.sql
vokai-server/sql/008_add_vokai_syllabus.sql
vokai-server/sql/009_add_vokai_routine_note.sql
vokai-server/sql/010_add_vokai_friendships.sql
vokai-server/sql/011_add_vokai_user_codes.sql
vokai-server/sql/012_add_vokai_profile_images.sql
```

The server checks these tables and required profile columns during startup. It intentionally stops if the schema is incomplete.

### 3. Start both containers

```bash
docker compose up --build
```

Open:

- Web client: `http://localhost:8080`
- FastAPI Swagger UI: `http://localhost:8000/docs`
- FastAPI OpenAPI JSON: `http://localhost:8000/openapi.json`

Stop the services with `Ctrl+C`, or run `docker compose down` from another terminal.

The client API URL is injected at build time. To use another API host:

```bash
EXPO_PUBLIC_VOKAI_API_URL=http://192.168.1.10:8000 docker compose up --build
```

For a browser opened on the same computer, the default `http://localhost:8000` is normally correct. For a phone, use the computer’s LAN IP and ensure the phone and computer are on the same network.

## Local server setup without Docker

```bash
cd vokai-server
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
fastapi dev app/main.py --host 0.0.0.0 --port 8000
```

The server reads `vokai-server/.env` automatically. Keep this terminal running.

## Local client setup without Docker

In a second terminal:

```bash
cd vokai-client
npm install
cp .env.example .env
npm start
```

Use `npm run web` for Expo web, or `npm run android` for a native Android development build.

### Native Android voice typing

Voice typing uses native speech-recognition code and microphone permission. After installing dependencies or changing the Expo plugin configuration, rebuild the development app:

```bash
cd vokai-client
npm run android
```

Expo Go alone cannot provide the native speech-recognition module. On Android, the device must have a speech-recognition service enabled. The first voice-typing attempt asks for microphone and speech-recognition access.

## Docker details

The server image is built from `vokai-server/Dockerfile` and runs FastAPI on port 8000. The client image is a multi-stage build: Node exports the Expo web bundle, then Nginx serves the static files on port 80. Native Android and iOS builds are not produced inside the web client container; use Android Studio/Xcode or `npm run android` / `npx expo run:ios` on the host.

Useful commands:

```bash
docker compose ps
docker compose logs -f server
docker compose logs -f client
docker compose build --no-cache
docker compose down
```

## Authentication and Supabase setup

Enable Email and Google providers under **Supabase → Authentication → Providers**. For Google OAuth:

1. Create a Google OAuth client ID and secret.
2. Use `https://<project-ref>.supabase.co/auth/v1/callback` as the authorised redirect URI in Google Cloud.
3. Add `vokai://auth/callback` to Supabase **Authentication → URL Configuration → Redirect URLs**.
4. Build the native Android client so the `vokai` deep link is registered.

The server uses Supabase authentication to verify bearer tokens. Row Level Security policies restrict each learner to their own profile and check-ins.

## Backend API

The main endpoints are:

```text
GET    /vokai/auth/config
GET    /vokai/bootstrap
PUT    /vokai/profile
POST   /vokai/profile/photo
GET    /vokai/garden
GET    /vokai/check-ins/today
GET    /vokai/check-ins/history
PUT    /vokai/check-ins
GET    /vokai/syllabus
POST   /vokai/syllabus/generate
PUT    /vokai/syllabus/topics
POST   /vokai/focus/coach
GET    /vokai/friends
POST   /vokai/friends/requests
PUT    /vokai/friends/requests/{requester_id}
DELETE /vokai/friends/{friend_id}
DELETE /vokai/journey
```

Protected endpoints require `Authorization: Bearer <supabase-access-token>`.

## Configuration reference

### Server: `vokai-server/.env`

| Variable | Required | Purpose |
|---|---:|---|
| `DIRECT_URL` | Yes | Direct/session PostgreSQL connection used for schema checks and migrations |
| `DATABASE_URL` | Yes | Runtime PostgreSQL connection |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Yes | Public Supabase key used to verify sessions |
| `GEMINI_API_KEY` | No | Enables AI Focus Coach responses |
| `GEMINI_MODEL` | No | Gemini model; defaults to `gemini-2.5-flash` |
| `CLOUDINARY_CLOUD_NAME` | For profile photos | Cloudinary cloud name, configured only on the server |
| `CLOUDINARY_API_KEY` | For profile photos | Cloudinary API key, configured only on the server |
| `CLOUDINARY_API_SECRET` | For profile photos | Cloudinary API secret, configured only on the server |
| `ALLOWED_ORIGINS` | No | Comma-separated CORS origins; defaults to `*` |

### Client: `vokai-client/.env`

```env
EXPO_PUBLIC_VOKAI_API_URL=http://localhost:8000
```

Use the computer’s LAN IP instead of `localhost` when the client runs on a physical phone.

## Development checks

```bash
cd vokai-client
npm run typecheck
```

For a production-style web bundle:

```bash
npx expo export --platform web
```

## Security notes

- Never commit `.env` files, database passwords, Supabase secret keys, or Gemini keys.
- Keep `SUPABASE_SERVICE_ROLE_KEY` out of the client and out of public repositories.
- Use a restricted `ALLOWED_ORIGINS` value in production instead of `*`.
- Use HTTPS and a managed secret store in production.
- Rotate any credential that has been accidentally exposed.
- The included Android debug keystore is for development only; use a private release signing key for distribution.

## Troubleshooting

**`Could not open requirements file` or `Path does not exist app/main.py`**

Run the server commands from `vokai-server`, not `vokai-client`.

**The server exits with “Run vokai-server/sql/001 through 012”**

The Supabase schema is incomplete. Run all twelve SQL migrations in order.

**The mobile app cannot reach the server**

Check `EXPO_PUBLIC_VOKAI_API_URL`, use the computer’s LAN IP on a physical phone, and confirm port 8000 is reachable through the firewall.

**Voice typing is unavailable**

Rebuild the native development app with `npm run android`, grant microphone permission, and verify that Google Speech Recognition or another Android speech service is enabled.

## License and asset attribution

Review `vokai-client/assets/LICENSE-SOURCES.txt` for the included visual asset licenses and attribution details.
