import { useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Bot,
  Box,
  Check,
  CheckCircle2,
  ChevronRight,
  CodeXml,
  Copy,
  Database,
  ExternalLink,
  KeyRound,
  Layers3,
  Menu,
  Mic,
  Rocket,
  Server,
  ShieldCheck,
  Smartphone,
  Sprout,
  Terminal,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type Icon = typeof Sprout;

const navigation: Array<{ id: string; label: string; icon: Icon }> = [
  { id: "overview", label: "Overview", icon: Sprout },
  { id: "architecture", label: "Architecture", icon: Layers3 },
  { id: "docker", label: "Docker quick start", icon: Box },
  { id: "local", label: "Local development", icon: Terminal },
  { id: "database", label: "Supabase & database", icon: Database },
  { id: "api", label: "API reference", icon: Server },
  { id: "voice", label: "Voice typing", icon: Mic },
  { id: "security", label: "Security & deployment", icon: ShieldCheck },
  { id: "troubleshooting", label: "Troubleshooting", icon: AlertCircle },
];

const migrations = [
  "001_create_vokai_user_profiles.sql",
  "002_create_vokai_user_checkins.sql",
  "003_add_vokai_indexes.sql",
  "004_enable_vokai_rls.sql",
  "005_add_vokai_rls_policies.sql",
  "006_add_vokai_profile_updated_at_trigger.sql",
  "007_add_vokai_language_and_routine.sql",
  "008_add_vokai_syllabus.sql",
  "009_add_vokai_routine_note.sql",
];

function CodeBlock({ title, code }: { title: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard?.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-stone-800 bg-[#1F2B23] shadow-sm">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
        <span className="font-mono text-[11px] font-medium text-stone-300">{title}</span>
        <button onClick={() => void copy()} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-stone-300 transition hover:bg-white/10 hover:text-white" aria-label={`Copy ${title}`}>
          {copied ? <Check className="size-3.5 text-emerald-300" /> : <Copy className="size-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-[12px] leading-6 text-[#E8F2E5]"><code>{code}</code></pre>
    </div>
  );
}

function SectionTitle({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8 max-w-3xl">
      <p className="mb-2 text-xs font-bold tracking-[0.16em] text-vokai-forest uppercase">{eyebrow}</p>
      <h2 className="font-display text-3xl tracking-tight text-vokai-ink sm:text-4xl">{title}</h2>
      <div className="mt-3 text-[15px] leading-7 text-stone-600">{children}</div>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, children }: { icon: Icon; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-[0_2px_10px_rgba(51,67,49,0.04)]">
      <div className="mb-4 grid size-10 place-items-center rounded-xl bg-vokai-moss text-vokai-forest"><Icon className="size-5" /></div>
      <h3 className="font-semibold text-vokai-ink">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-stone-600">{children}</p>
    </div>
  );
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="min-h-screen bg-[#F8F6F0]">
      <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-[#F8F6F0]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:px-6">
          <a href="#overview" className="flex items-center gap-2.5 text-vokai-ink">
            <span className="grid size-9 place-items-center rounded-xl bg-vokai-forest text-white"><Sprout className="size-4.5" /></span>
            <span className="font-semibold tracking-wide">VOKAI <span className="font-normal text-stone-400">Docs</span></span>
          </a>
          <div className="hidden items-center gap-3 sm:flex">
            <a href="https://github.com/aadityakumarsah/vokai-app" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-600 hover:text-vokai-ink"><CodeXml className="size-4" /> GitHub</a>
            <Button asChild size="sm"><a href="#docker">Get started <ArrowRight /></a></Button>
          </div>
          <Button variant="outline" size="icon" className="sm:hidden" onClick={() => setMenuOpen((open) => !open)} aria-label="Toggle documentation navigation">
            {menuOpen ? <X /> : <Menu />}
          </Button>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1440px] lg:grid-cols-[252px_minmax(0,1fr)]">
        <aside className={`${menuOpen ? "block" : "hidden"} fixed inset-x-0 top-16 z-20 max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-stone-200 bg-[#F8F6F0] p-4 lg:sticky lg:top-16 lg:block lg:h-[calc(100vh-4rem)] lg:border-r lg:border-b-0 lg:px-5 lg:py-8`}>
          <p className="mb-3 px-3 text-[11px] font-bold tracking-[0.16em] text-stone-400 uppercase">Documentation</p>
          <nav className="space-y-1">
            {navigation.map(({ id, label, icon: Icon }) => (
              <a key={id} href={`#${id}`} onClick={closeMenu} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-stone-600 transition hover:bg-white hover:text-vokai-ink">
                <Icon className="size-4 text-stone-400" /> {label}
              </a>
            ))}
          </nav>
          <div className="mt-8 rounded-2xl bg-vokai-ink p-4 text-white">
            <p className="text-xs font-semibold text-[#B8D6B6]">Need the API?</p>
            <p className="mt-1 text-sm leading-5 text-stone-200">Explore the live FastAPI schema after starting the server.</p>
            <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#CBE3C7] hover:text-white">Open Swagger UI <ExternalLink className="size-3" /></a>
          </div>
        </aside>

        <main className="min-w-0 px-4 py-10 sm:px-8 lg:px-14 lg:py-14">
          <section id="overview" className="scroll-mt-24 border-b border-stone-200 pb-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#CFE1CB] bg-[#F1F8EF] px-3 py-1 text-xs font-semibold text-vokai-forest"><span className="size-1.5 rounded-full bg-vokai-forest" /> Version 1.0 · Android-first</div>
            <h1 className="mt-6 max-w-4xl font-display text-5xl leading-[1.03] tracking-tight text-vokai-ink sm:text-6xl">Build a coding habit that <span className="text-vokai-forest">actually grows.</span></h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600">VOKAI is a personalised 90-day coding journey: daily learning tasks, an accountable progress garden, and an AI Focus Coach that knows the learner’s plan.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg"><a href="#docker">Run with Docker <Box /></a></Button>
              <Button asChild variant="outline" size="lg"><a href="#architecture">Explore the architecture <ArrowRight /></a></Button>
            </div>
            <div className="mt-12 grid gap-4 md:grid-cols-3">
              <FeatureCard icon={Rocket} title="Small daily wins">Turn big ambitions into a learn, build, and reflect loop that fits real schedules.</FeatureCard>
              <FeatureCard icon={Bot} title="Context-aware coach">Get next-step help informed by the learner’s language, routine, streak, and check-ins.</FeatureCard>
              <FeatureCard icon={ShieldCheck} title="Private by design">Supabase authentication and RLS keep each learner’s data scoped to their own account.</FeatureCard>
            </div>
          </section>

          <section id="architecture" className="scroll-mt-24 border-b border-stone-200 py-16">
            <SectionTitle eyebrow="01 · Architecture" title="A mobile experience with a secure backend.">The Expo app presents the journey and sends the signed-in learner’s Supabase token to FastAPI. The server verifies the token before reading or changing data in Supabase PostgreSQL.</SectionTitle>
            <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white p-5 sm:p-8">
              <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center">
                <div className="rounded-2xl bg-[#FFF8E8] p-5"><Smartphone className="mb-4 size-6 text-[#A7782F]" /><h3 className="font-semibold text-vokai-ink">Expo client</h3><p className="mt-1 text-sm leading-6 text-stone-600">React Native UI, local cache, reminders, voice typing, and Supabase session.</p></div>
                <ChevronRight className="mx-auto hidden text-stone-300 md:block" />
                <div className="rounded-2xl bg-[#EDF6EB] p-5"><Server className="mb-4 size-6 text-vokai-forest" /><h3 className="font-semibold text-vokai-ink">FastAPI server</h3><p className="mt-1 text-sm leading-6 text-stone-600">Authenticated profile, journey, syllabus, garden, and Focus Coach endpoints.</p></div>
                <ChevronRight className="mx-auto hidden text-stone-300 md:block" />
                <div className="rounded-2xl bg-[#F5F0FB] p-5"><Database className="mb-4 size-6 text-[#765B92]" /><h3 className="font-semibold text-vokai-ink">Supabase</h3><p className="mt-1 text-sm leading-6 text-stone-600">Auth, PostgreSQL, owner-scoped Row Level Security, and durable progress.</p></div>
              </div>
              <div className="mt-6 rounded-xl border border-dashed border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600"><strong className="text-vokai-ink">Focus Coach:</strong> FastAPI can call Gemini with the learner context. The Gemini key stays on the server and is never exposed to the client.</div>
            </div>
          </section>

          <section id="docker" className="scroll-mt-24 border-b border-stone-200 py-16">
            <SectionTitle eyebrow="02 · Docker quick start" title="Run the API and web app together.">Docker Compose starts a FastAPI container on port 8000 and an Nginx-served Expo web export on port 8080. Native Android/iOS development still runs on the host machine.</SectionTitle>
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="space-y-4"><div className="rounded-2xl border border-[#D7E7D3] bg-[#F2F9F0] p-5"><p className="font-semibold text-vokai-ink">Before you run Compose</p><ol className="mt-3 space-y-2 text-sm leading-6 text-stone-600"><li><span className="mr-2 font-semibold text-vokai-forest">1.</span>Copy the server environment template.</li><li><span className="mr-2 font-semibold text-vokai-forest">2.</span>Set Supabase URLs, database connection strings, and the publishable key.</li><li><span className="mr-2 font-semibold text-vokai-forest">3.</span>Run all nine SQL migrations in Supabase SQL Editor.</li></ol></div><CodeBlock title="Terminal" code={"cp vokai-server/.env.example vokai-server/.env\n# Edit vokai-server/.env with your Supabase values\ndocker compose up --build"} /></div>
              <div className="space-y-4"><CodeBlock title="Custom client API URL" code={"EXPO_PUBLIC_VOKAI_API_URL=http://192.168.1.10:8000 \\\n  docker compose up --build"} /><div className="rounded-2xl border border-stone-200 bg-white p-5 text-sm leading-6 text-stone-600"><p className="font-semibold text-vokai-ink">Open after startup</p><ul className="mt-3 space-y-2"><li><span className="font-mono text-vokai-forest">http://localhost:8080</span> — web client</li><li><span className="font-mono text-vokai-forest">http://localhost:8000/docs</span> — Swagger UI</li><li><span className="font-mono text-vokai-forest">docker compose logs -f server</span> — server logs</li></ul></div></div>
            </div>
          </section>

          <section id="local" className="scroll-mt-24 border-b border-stone-200 py-16">
            <SectionTitle eyebrow="03 · Local development" title="Work on the client and server independently.">Use local development for native Android, FastAPI auto-reload, and the fastest UI iteration. The backend must be running before the sign-in screen can load its Supabase configuration.</SectionTitle>
            <div className="grid gap-5 lg:grid-cols-2">
              <div><div className="mb-3 flex items-center gap-2"><Server className="size-4 text-vokai-forest" /><h3 className="font-semibold text-vokai-ink">FastAPI server</h3></div><CodeBlock title="vokai-server" code={"cd vokai-server\npython3 -m venv .venv\nsource .venv/bin/activate\npip install -r requirements.txt\nfastapi dev app/main.py --host 0.0.0.0 --port 8000"} /></div>
              <div><div className="mb-3 flex items-center gap-2"><Smartphone className="size-4 text-vokai-forest" /><h3 className="font-semibold text-vokai-ink">Expo client</h3></div><CodeBlock title="vokai-client" code={"cd vokai-client\nbun install\ncp .env.example .env\nbun run dev\n\n# Or create / refresh an Android development build\nbun run android"} /></div>
            </div>
            <div className="mt-5 rounded-2xl border border-[#F0D9A8] bg-[#FFF9EB] p-4 text-sm leading-6 text-stone-700"><strong className="text-vokai-ink">Physical Android phone:</strong> set <code>EXPO_PUBLIC_VOKAI_API_URL</code> to your computer’s LAN IP, not <code>localhost</code>. Keep the phone and computer on the same network.</div>
          </section>

          <section id="database" className="scroll-mt-24 border-b border-stone-200 py-16">
            <SectionTitle eyebrow="04 · Supabase & database" title="Set up authentication and schema once.">VOKAI stores each learner’s profile, check-ins, and generated syllabus in Supabase PostgreSQL. The server validates bearer tokens and its database startup check confirms that all required tables and profile columns exist.</SectionTitle>
            <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]"><div className="rounded-2xl border border-stone-200 bg-white p-5"><h3 className="font-semibold text-vokai-ink">Run migrations in this order</h3><div className="mt-4 space-y-2">{migrations.map((migration, index) => <div key={migration} className="flex items-center gap-3 rounded-xl bg-stone-50 px-3 py-2 font-mono text-xs text-stone-600"><span className="grid size-5 place-items-center rounded-full bg-vokai-moss font-sans text-[10px] font-bold text-vokai-forest">{index + 1}</span>{migration}</div>)}</div></div><div className="space-y-5"><div className="rounded-2xl bg-vokai-ink p-5 text-white"><KeyRound className="size-5 text-[#BEDFBA]" /><h3 className="mt-4 font-semibold">Authentication</h3><p className="mt-2 text-sm leading-6 text-stone-300">Enable Email and Google in Supabase Authentication. For Google, register <code className="text-[#D5EFD1]">vokai://auth/callback</code> as a Supabase redirect URL.</p></div><div className="rounded-2xl border border-stone-200 bg-white p-5"><h3 className="font-semibold text-vokai-ink">Environment variables</h3><p className="mt-2 text-sm leading-6 text-stone-600">Server: <code>DIRECT_URL</code>, <code>DATABASE_URL</code>, <code>SUPABASE_URL</code>, and <code>SUPABASE_PUBLISHABLE_KEY</code>. Add <code>GEMINI_API_KEY</code> to activate Focus Coach.</p></div></div></div>
          </section>

          <section id="api" className="scroll-mt-24 border-b border-stone-200 py-16">
            <SectionTitle eyebrow="05 · API reference" title="The server API is simple and account-aware.">All protected endpoints require <code>Authorization: Bearer &lt;supabase-access-token&gt;</code>. Explore request and response schemas interactively at <code>/docs</code> once the server is running.</SectionTitle>
            <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white"><div className="grid grid-cols-[88px_1fr] border-b border-stone-200 bg-stone-50 px-4 py-2 text-[11px] font-bold tracking-wider text-stone-400 uppercase"><span>Method</span><span>Endpoint</span></div>{[
              ["GET", "/vokai/auth/config"], ["GET", "/vokai/bootstrap"], ["PUT", "/vokai/profile"], ["GET", "/vokai/garden"], ["GET", "/vokai/check-ins/today"], ["PUT", "/vokai/check-ins"], ["GET", "/vokai/syllabus"], ["POST", "/vokai/syllabus/generate"], ["PUT", "/vokai/syllabus/topics"], ["POST", "/vokai/focus/coach"], ["DELETE", "/vokai/journey"],
            ].map(([method, endpoint]) => <div key={endpoint} className="grid grid-cols-[88px_1fr] border-b border-stone-100 px-4 py-3 last:border-b-0"><span className={`w-fit rounded px-1.5 py-0.5 text-[10px] font-bold ${method === "GET" ? "bg-blue-50 text-blue-700" : method === "POST" ? "bg-emerald-50 text-emerald-700" : method === "PUT" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>{method}</span><code className="text-sm text-stone-700">{endpoint}</code></div>)}</div>
          </section>

          <section id="voice" className="scroll-mt-24 border-b border-stone-200 py-16">
            <SectionTitle eyebrow="06 · Voice typing" title="Speak to the Focus Coach, then send when ready.">The microphone in the Focus Coach transcribes live speech into the message field. Learners can review and edit the text before the message is sent.</SectionTitle>
            <div className="grid gap-4 md:grid-cols-3"><FeatureCard icon={Mic} title="Tap to listen">The mic asks for microphone and speech-recognition access on first use. Tap again to stop.</FeatureCard><FeatureCard icon={CheckCircle2} title="Edit before sending">Speech is placed in the composer, never sent automatically. This keeps the learner in control.</FeatureCard><FeatureCard icon={Smartphone} title="Use a native build">Run <code>bun run android</code> after adding voice support. Expo Go cannot load the native speech module.</FeatureCard></div>
          </section>

          <section id="security" className="scroll-mt-24 border-b border-stone-200 py-16">
            <SectionTitle eyebrow="07 · Security & deployment" title="Keep learner data and keys protected.">VOKAI’s security model separates the public mobile client from private server secrets and protects data at the database layer.</SectionTitle>
            <div className="grid gap-4 md:grid-cols-2"><div className="rounded-2xl border border-stone-200 bg-white p-5"><h3 className="font-semibold text-vokai-ink">Do</h3><ul className="mt-4 space-y-3 text-sm leading-6 text-stone-600"><li className="flex gap-2"><CheckCircle2 className="mt-1 size-4 shrink-0 text-vokai-forest" />Keep Gemini, database, and Supabase secret keys in server-side environment variables.</li><li className="flex gap-2"><CheckCircle2 className="mt-1 size-4 shrink-0 text-vokai-forest" />Set specific <code>ALLOWED_ORIGINS</code> values in production.</li><li className="flex gap-2"><CheckCircle2 className="mt-1 size-4 shrink-0 text-vokai-forest" />Use HTTPS and rotate any credential that is exposed.</li></ul></div><div className="rounded-2xl border border-[#F3D8D8] bg-[#FFF7F7] p-5"><h3 className="font-semibold text-vokai-ink">Never do</h3><ul className="mt-4 space-y-3 text-sm leading-6 text-stone-600"><li className="flex gap-2"><AlertCircle className="mt-1 size-4 shrink-0 text-[#B95C5C]" />Commit a real <code>.env</code>, database password, or a Gemini key.</li><li className="flex gap-2"><AlertCircle className="mt-1 size-4 shrink-0 text-[#B95C5C]" />Put a Supabase service-role key in the Expo client.</li><li className="flex gap-2"><AlertCircle className="mt-1 size-4 shrink-0 text-[#B95C5C]" />Use the Android debug keystore to sign a public release.</li></ul></div></div>
          </section>

          <section id="troubleshooting" className="scroll-mt-24 py-16">
            <SectionTitle eyebrow="08 · Troubleshooting" title="Common setup issues, solved quickly.">Most startup issues come from running a command in the wrong folder, an incomplete Supabase schema, or a client URL that a phone cannot reach.</SectionTitle>
            <div className="space-y-3">{[
              ["requirements.txt or app/main.py cannot be found", "Run the FastAPI commands from vokai-server, not vokai-client."],
              ["Server says to run SQL 001 through 009", "Open Supabase SQL Editor and apply every migration in order, including 009."],
              ["Mobile sign-in cannot reach the server", "Set EXPO_PUBLIC_VOKAI_API_URL to the computer’s LAN IP when testing on a phone."],
              ["Voice typing is unavailable", "Create a native Android development build, grant microphone access, and enable a speech-recognition service on the device."],
              ["Docker is not installed", "Install Docker Desktop, then rerun docker compose up --build from the repository root."],
            ].map(([question, answer]) => <details key={question} className="group rounded-2xl border border-stone-200 bg-white px-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-semibold text-vokai-ink"><span>{question}</span><ChevronRight className="size-4 text-stone-400 transition group-open:rotate-90" /></summary><p className="border-t border-stone-100 py-4 text-sm leading-6 text-stone-600">{answer}</p></details>)}</div>
          </section>

          <footer className="border-t border-stone-200 py-8 text-sm text-stone-500">Built for steady progress, not perfect streaks. <a href="https://github.com/aadityakumarsah/vokai-app" className="font-medium text-vokai-forest hover:underline">View VOKAI on GitHub</a>.</footer>
        </main>
      </div>
    </div>
  );
}

export default App;
