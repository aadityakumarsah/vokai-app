# VOKAI Server

FastAPI backend for VOKAI's authenticated 90-day coding journey. It stores data
in Supabase PostgreSQL, verifies the Supabase access token on every protected
request, and loads `DIRECT_URL` from the local `.env` automatically.

## Set up the database once

In Supabase **SQL Editor**, run these files in this exact order. They are
idempotent, so rerunning them is safe:

1. `sql/001_create_vokai_user_profiles.sql`
2. `sql/002_create_vokai_user_checkins.sql`
3. `sql/003_add_vokai_indexes.sql`
4. `sql/004_enable_vokai_rls.sql`
5. `sql/005_add_vokai_rls_policies.sql`
6. `sql/006_add_vokai_profile_updated_at_trigger.sql`
7. `sql/007_add_vokai_language_and_routine.sql`
8. `sql/008_add_vokai_syllabus.sql`

The tables are keyed by `auth.users.id`, not a phone/device ID. RLS policies
allow only the signed-in owner to access their own profile and check-ins. The
server verifies each bearer token with Supabase before reading or writing data.
The server derives the journey day from the saved start date. The garden unlocks pot (day 1),
butterfly/bee (day 5), tree (day 21), berries (day 45), more bees (day 60),
and frog (day 90).

Each profile also stores the chosen language, an optional custom language, busy
routine blocks, the recommended learning start time, `current_streak`, and
`longest_streak`, and an experience level. A generated syllabus is stored per
user in `vokai_user_syllabi`, including its topic completion state.

## Enable Focus Coach

Put the Gemini key in `vokai-server/.env`, never in the Expo client:

```env
GEMINI_API_KEY=your-key
GEMINI_MODEL=gemini-2.5-flash
```

The signed-in Focus Coach endpoint reads the learner's saved language, routine,
journey day, streak, and today’s check-ins before it asks Gemini for a concise
next-step suggestion. The key is kept on FastAPI and is never returned to the
mobile app.

## Run the server

After the SQL files above have been run:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
fastapi dev app/main.py --host 0.0.0.0 --port 8000
```

## Enable authentication

Enable **Email** and **Google** in Supabase Authentication. For Google, add
`vokai://auth/callback` to **Authentication → URL Configuration → Redirect URLs**
after adding your Google OAuth client ID and secret. In Google Cloud, use
`https://<project-ref>.supabase.co/auth/v1/callback` as the authorised redirect
URI. VOKAI's Android app is already configured with the `vokai` deep-link scheme.

The client uses these endpoints:

- `PUT /vokai/profile`
- `GET /vokai/bootstrap`
- `GET /vokai/auth/config`
- `POST /vokai/focus/coach`
- `GET /vokai/syllabus`
- `POST /vokai/syllabus/generate`
- `PUT /vokai/syllabus/topics`
- `PUT /vokai/check-ins`
- `DELETE /vokai/journey`
- `GET /vokai/check-ins/today`
- `GET /vokai/check-ins/history`
- `GET /vokai/garden`
