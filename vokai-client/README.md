# VOKAI

An Android-first Expo / React Native app for a 90-day coding journey. It includes a personalised setup flow, daily lesson tasks, a focus timer, local reminders, and a progress garden that grows as users complete each day.

Users sign in with Supabase email/password or Google. Their VOKAI profile,
streak, and check-ins are tied to the authenticated Supabase user ID.

## Workspace layout

```text
vokai-app/
├── vokai-client/      # Expo / React Native mobile frontend
└── vokai-server/      # FastAPI profile and check-in backend
```

## Run the mobile frontend

```bash
npm install
npm run android
```

For the Expo development server, use `npm start`. Local reminders are configured for Android builds; grant notification permission during setup or turn reminders on later in Settings.

## Connect the backend

Start the backend from `../vokai-server/`, then launch Expo with its URL:

```bash
cd ../vokai-server
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
fastapi dev app/main.py --host 0.0.0.0 --port 8000

# In a second terminal, from vokai-client/
cp .env.example .env
# Change the URL in .env to your computer's LAN IP address.
npx expo start -c
```

Use your computer's LAN IP for a physical Android phone. Without this variable,
the sign-in screen cannot reach the server. Google OAuth needs a development
build (`npm run android`), because its `vokai://auth/callback` redirect must be
registered with Android.

## Main implementation points

- `app/index.tsx` contains the onboarding, dashboard, garden, timer, and settings views.
- `src/data.ts` generates the language-specific daily task path and garden milestones.
- `src/storage.ts` keeps each signed-in learner's offline cache separate with AsyncStorage.
- `src/supabase.ts` handles the persisted Supabase email/password and Google OAuth session.
- `src/vokaiApi.ts` sends the signed-in learner's access token to the FastAPI garden API.
- `src/notifications.ts` schedules the Android local daily reminder.
