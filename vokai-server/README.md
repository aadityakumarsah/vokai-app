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
9. `sql/009_add_vokai_routine_note.sql`
10. `sql/010_add_vokai_friendships.sql`
11. `sql/011_add_vokai_user_codes.sql`
12. `sql/012_add_vokai_profile_images.sql`
13. `sql/013_add_vokai_rewards.sql`
14. `sql/014_add_vokai_premium_prebookings.sql`
15. `sql/015_store_only_paid_premium_prebookings.sql`

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

Migration `010` adds authenticated friend requests. Friends can be added by
their VOKAI account email, must accept the request, and then share only their
name, learning language, journey day, and current streak.

Migration `011` assigns every learner a permanent, random 10-digit VOKAI ID.
Migration `012` stores the URL of a learner's uploaded profile photo.
Migration `013` awards 10 coins and 5 points for each completed daily check-in,
with bonus rewards on days 2, 3, 4, 10, and 60. Rewards are granted once per
completed calendar day and are visible to accepted friends.

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

## Deploy the Docker server to Render

This repository includes a root-level `render.yaml` Blueprint for the FastAPI
server. It uses `vokai-server/Dockerfile`, listens on Render's assigned `PORT`,
and checks `/health` before accepting traffic.

1. Push the repository to GitHub.
2. In Render, select **New → Blueprint** and select this repository.
3. Render reads `render.yaml` and prompts for the server values. Copy values
   from your local `vokai-server/.env`; do not commit that file.
4. Set `ALLOWED_ORIGINS` to the public Docs origin, for example
   `https://docs-vokai.vercel.app`.
5. After deploy, open `https://<render-service>.onrender.com/health`.

For Dodo Premium, set `DODO_CHECKOUT_RETURN_URL` to the public Docs URL and
then create the Dodo webhook at:

```text
https://<render-service>.onrender.com/vokai/premium/webhooks/dodo
```

Copy its signing secret into `DODO_PAYMENTS_WEBHOOK_KEY` in Render, then deploy
again. It is intentionally not a first-deploy Blueprint prompt because Dodo
generates that secret only after the public webhook endpoint exists. Dodo contact
details are only stored after the signed `payment.succeeded` event reaches this
endpoint.

## Enable authentication

Enable **Email** and **Google** in Supabase Authentication. For Google, add
`vokai://auth/callback` to **Authentication → URL Configuration → Redirect URLs**
after adding your Google OAuth client ID and secret. In Google Cloud, use
`https://<project-ref>.supabase.co/auth/v1/callback` as the authorised redirect
URI. VOKAI's Android app is already configured with the `vokai` deep-link scheme.

The client uses these endpoints:

- `PUT /vokai/profile`
- `POST /vokai/profile/photo`
- `GET /vokai/bootstrap`
- `GET /vokai/auth/config`
- `POST /vokai/focus/coach`
- `GET /vokai/friends`
- `POST /vokai/friends/requests`
- `PUT /vokai/friends/requests/{requester_id}`
- `DELETE /vokai/friends/{friend_id}`
- `GET /vokai/friends/{friend_id}/profile`
- `GET /vokai/syllabus`
- `POST /vokai/syllabus/generate`
- `PUT /vokai/syllabus/topics`
- `PUT /vokai/check-ins`
- `DELETE /vokai/journey`
- `GET /vokai/check-ins/today`
- `GET /vokai/check-ins/history`
- `GET /vokai/garden`
