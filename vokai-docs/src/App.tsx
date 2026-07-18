import { useState, type ReactNode } from "react";
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
  KeyRound,
  Laptop,
  Layers3,
  LockKeyhole,
  Menu,
  Mic,
  Rocket,
  Server,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Sprout,
  Target,
  Terminal,
  Timer,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type Icon = typeof Sprout;
type NavItem = { id: string; label: string; icon: Icon };

const learnerNavigation: NavItem[] = [
  { id: "start", label: "Getting started", icon: Rocket },
  { id: "daily-journey", label: "Your daily journey", icon: Target },
  { id: "coach", label: "Focus Coach", icon: Bot },
  { id: "progress", label: "Progress & garden", icon: Sprout },
  { id: "insights", label: "Focus insights · planned", icon: Timer },
  { id: "desktop", label: "Desktop companion · planned", icon: Laptop },
  { id: "privacy", label: "Privacy & control", icon: ShieldCheck },
];

const developerNavigation: NavItem[] = [
  { id: "developer", label: "Developer overview", icon: Layers3 },
  { id: "docker", label: "Docker quick start", icon: Box },
  { id: "local", label: "Local development", icon: Terminal },
  { id: "database", label: "Supabase & database", icon: Database },
  { id: "api", label: "API reference", icon: Server },
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

function StatusPill({ children, tone = "available" }: { children: ReactNode; tone?: "available" | "planned" }) {
  const palette = tone === "available"
    ? "border-[#CFE1CB] bg-[#F1F8EF] text-vokai-forest"
    : "border-[#F0D9A8] bg-[#FFF8E8] text-[#9C7026]";

  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase ${palette}`}><span className="size-1.5 rounded-full bg-current" />{children}</span>;
}

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

function SectionTitle({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <div className="mb-8 max-w-3xl">
      <p className="mb-2 text-xs font-bold tracking-[0.16em] text-vokai-forest uppercase">{eyebrow}</p>
      <h2 className="font-display text-3xl tracking-tight text-vokai-ink sm:text-4xl">{title}</h2>
      <div className="mt-3 text-[15px] leading-7 text-stone-600">{children}</div>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, children, status }: { icon: Icon; title: string; children: ReactNode; status?: "available" | "planned" }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-[0_2px_10px_rgba(51,67,49,0.04)]">
      <div className="mb-4 flex items-start justify-between gap-3"><div className="grid size-10 place-items-center rounded-xl bg-vokai-moss text-vokai-forest"><Icon className="size-5" /></div>{status && <StatusPill tone={status}>{status}</StatusPill>}</div>
      <h3 className="font-semibold text-vokai-ink">{title}</h3>
      <div className="mt-2 text-sm leading-6 text-stone-600">{children}</div>
    </div>
  );
}

function NavLinks({ items, onNavigate }: { items: NavItem[]; onNavigate: () => void }) {
  return (
    <nav className="space-y-1">
      {items.map(({ id, label, icon: Icon }) => (
        <a key={id} href={`#${id}`} onClick={onNavigate} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-stone-600 transition hover:bg-white hover:text-vokai-ink">
          <Icon className="size-4 text-stone-400" /> {label}
        </a>
      ))}
    </nav>
  );
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="min-h-screen bg-[#F8F6F0]">
      <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-[#F8F6F0]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:px-6">
          <a href="#start" className="flex items-center gap-2.5 text-vokai-ink">
            <span className="grid size-9 place-items-center rounded-xl bg-vokai-forest text-white"><Sprout className="size-4.5" /></span>
            <span className="font-semibold tracking-wide">VOKAI <span className="font-normal text-stone-400">Guide</span></span>
          </a>
          <div className="hidden items-center gap-3 sm:flex">
            <a href="#developer" className="text-sm font-medium text-stone-600 hover:text-vokai-ink">For developers</a>
            <Button asChild size="sm"><a href="#start">Start your journey <ArrowRight /></a></Button>
          </div>
          <Button variant="outline" size="icon" className="sm:hidden" onClick={() => setMenuOpen((open) => !open)} aria-label="Toggle documentation navigation">
            {menuOpen ? <X /> : <Menu />}
          </Button>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1440px] lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className={`${menuOpen ? "block" : "hidden"} fixed inset-x-0 top-16 z-20 max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-stone-200 bg-[#F8F6F0] p-4 lg:sticky lg:top-16 lg:block lg:h-[calc(100vh-4rem)] lg:border-r lg:border-b-0 lg:px-5 lg:py-8`}>
          <p className="mb-3 px-3 text-[11px] font-bold tracking-[0.16em] text-stone-400 uppercase">For learners</p>
          <NavLinks items={learnerNavigation} onNavigate={closeMenu} />
          <p className="mb-3 mt-7 px-3 text-[11px] font-bold tracking-[0.16em] text-stone-400 uppercase">For developers</p>
          <NavLinks items={developerNavigation} onNavigate={closeMenu} />
          <div className="mt-8 rounded-2xl bg-vokai-ink p-4 text-white">
            <p className="text-xs font-semibold text-[#B8D6B6]">A note on privacy</p>
            <p className="mt-1 text-sm leading-5 text-stone-200">Your practice should feel supported, never silently watched. Planned insights are opt-in by design.</p>
            <a href="#privacy" onClick={closeMenu} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#CBE3C7] hover:text-white">Read privacy principles <ArrowRight className="size-3" /></a>
          </div>
        </aside>

        <main className="min-w-0 px-4 py-10 sm:px-8 lg:px-14 lg:py-14">
          <section id="start" className="scroll-mt-24 border-b border-stone-200 pb-16">
            <StatusPill>Available today</StatusPill>
            <h1 className="mt-6 max-w-4xl font-display text-5xl leading-[1.03] tracking-tight text-vokai-ink sm:text-6xl">Make room for coding in the life you <span className="text-vokai-forest">already have.</span></h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600">VOKAI helps you turn a vague goal—“I want to learn to code”—into one clear, manageable next step each day. It is built to lower the friction of starting and make your effort visible over time.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg"><a href="#daily-journey">See your daily flow <ArrowRight /></a></Button>
              <Button asChild variant="outline" size="lg"><a href="#insights">Explore future focus insights <Sparkles /></a></Button>
            </div>
            <div className="mt-12 grid gap-4 md:grid-cols-3">
              <FeatureCard icon={Rocket} title="Start without overwhelm" status="available">Your plan is broken into three small actions: learn, build, and reflect. You always know what comes next.</FeatureCard>
              <FeatureCard icon={Bot} title="Ask when you are stuck" status="available">Use Focus Coach for a smaller next step, an explanation, or a simple plan for the time you have right now.</FeatureCard>
              <FeatureCard icon={Sprout} title="See effort become momentum" status="available">Check-ins, streaks, and a growing garden make consistent practice easier to notice and celebrate.</FeatureCard>
            </div>
          </section>

          <section id="daily-journey" className="scroll-mt-24 border-b border-stone-200 py-16">
            <SectionTitle eyebrow="01 · Your daily journey" title="A gentle loop for making progress, even on busy days.">VOKAI is designed around the moments when you need to decide what to do with the next 10, 20, or 45 minutes—not around an ideal schedule you can never keep.</SectionTitle>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="relative rounded-2xl border border-stone-200 bg-white p-5"><span className="absolute right-4 top-4 text-3xl font-display text-vokai-moss">01</span><h3 className="font-semibold text-vokai-ink">Open today</h3><p className="mt-2 text-sm leading-6 text-stone-600">See the day’s coding tasks, your current streak, and the one task that makes the most sense to start with.</p></div>
              <div className="relative rounded-2xl border border-stone-200 bg-white p-5"><span className="absolute right-4 top-4 text-3xl font-display text-vokai-moss">02</span><h3 className="font-semibold text-vokai-ink">Do one small thing</h3><p className="mt-2 text-sm leading-6 text-stone-600">Learn a concept, build a tiny piece, or reflect on what clicked. You do not have to finish everything at once.</p></div>
              <div className="relative rounded-2xl border border-stone-200 bg-white p-5"><span className="absolute right-4 top-4 text-3xl font-display text-vokai-moss">03</span><h3 className="font-semibold text-vokai-ink">Mark your effort</h3><p className="mt-2 text-sm leading-6 text-stone-600">Complete the task, let your garden grow, and come back tomorrow with a clear memory of where you left off.</p></div>
            </div>
            <div className="mt-5 rounded-2xl border border-[#D7E7D3] bg-[#F2F9F0] p-5 text-sm leading-6 text-stone-700"><strong className="text-vokai-ink">What this can change:</strong> when the next action is obvious and achievable, practice stops competing with motivation. You can build confidence through repeatable evidence that you showed up.</div>
          </section>

          <section id="coach" className="scroll-mt-24 border-b border-stone-200 py-16">
            <SectionTitle eyebrow="02 · Focus Coach" title="Get unstuck without leaving your learning flow.">The coach is a place to think out loud when a task feels unclear. It uses the context you have already given VOKAI—your chosen language, routine, current day, and check-ins—to help you find a realistic next move.</SectionTitle>
            <div className="grid gap-4 md:grid-cols-3"><FeatureCard icon={Bot} title="Ask practical questions" status="available">Try “What should I do now?”, “Break this into smaller steps,” or “Plan my next 20 minutes.”</FeatureCard><FeatureCard icon={Mic} title="Speak your thought" status="available">Tap the microphone, say your question, review the transcription, then choose whether to send it.</FeatureCard><FeatureCard icon={CheckCircle2} title="Keep ownership" status="available">The coach suggests a path, but you decide what to do and when. Voice transcription is never sent automatically.</FeatureCard></div>
          </section>

          <section id="progress" className="scroll-mt-24 border-b border-stone-200 py-16">
            <SectionTitle eyebrow="03 · Progress & garden" title="Make the work you do feel real.">A coding journey can feel invisible when you only remember what is unfinished. VOKAI turns completed practice into a visual garden and a simple check-in history, so progress is easier to recognize.</SectionTitle>
            <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]"><div className="rounded-3xl bg-vokai-ink p-7 text-white"><Sprout className="size-7 text-[#BFE2BC]" /><h3 className="mt-8 font-display text-3xl">Your garden grows with consistency.</h3><p className="mt-3 max-w-md text-sm leading-6 text-stone-300">Milestones unlock as you return: a pot, flowers, a tree, berries, bees, and a full garden. It is a visual reminder that small sessions add up.</p></div><div className="space-y-4"><FeatureCard icon={Timer} title="Record the practice you choose" status="available">Your daily check-ins show which parts of the learning loop you completed, without requiring every session to look the same.</FeatureCard><FeatureCard icon={Target} title="Protect the habit, not perfection" status="available">Streaks provide encouragement, but a missed day does not erase the skills or confidence you already built.</FeatureCard></div></div>
          </section>

          <section id="insights" className="scroll-mt-24 border-b border-stone-200 py-16">
            <div className="mb-5"><StatusPill tone="planned">Planned feature</StatusPill></div>
            <SectionTitle eyebrow="04 · Focus insights" title="Understand where your attention goes—only if you choose to share it.">VOKAI does not currently track screen time, app use, or editor time. The planned Focus Insights experience is intended to help learners see patterns in their own practice, with clear permission and control.</SectionTitle>
            <div className="grid gap-4 md:grid-cols-3"><FeatureCard icon={Timer} title="Screen-time summary" status="planned">A simple, opt-in view of time spent in supported categories so you can compare intended practice time with actual focus time.</FeatureCard><FeatureCard icon={Target} title="Productive-time reflection" status="planned">A review of self-chosen productive categories—such as coding, reading, or courses—rather than a judgment about how you use your phone.</FeatureCard><FeatureCard icon={CodeXml} title="Editor practice time" status="planned">A desktop companion could summarize time spent in supported code editors, including VS Code, to help you understand your practice rhythm.</FeatureCard></div>
            <div className="mt-5 rounded-2xl border border-[#F0D9A8] bg-[#FFF9EB] p-5 text-sm leading-6 text-stone-700"><strong className="text-vokai-ink">Important:</strong> this is a roadmap item, not a current feature. If introduced, it will require explicit device permission and opt-in setup. VOKAI should show you a meaningful summary—not quietly collect personal activity.</div>
          </section>

          <section id="desktop" className="scroll-mt-24 border-b border-stone-200 py-16">
            <div className="mb-5"><StatusPill tone="planned">Planned companion</StatusPill></div>
            <SectionTitle eyebrow="05 · Mobile + desktop" title="Carry your learning plan from your phone to your coding desk.">The planned VOKAI desktop companion for macOS and Windows is meant to bridge intention and practice: set a goal on mobile, then see the time you intentionally spend learning or coding on your computer.</SectionTitle>
            <div className="grid gap-5 lg:grid-cols-2"><div className="rounded-2xl border border-stone-200 bg-white p-6"><Smartphone className="size-6 text-vokai-forest" /><h3 className="mt-4 font-semibold text-vokai-ink">On your phone</h3><ul className="mt-3 space-y-2 text-sm leading-6 text-stone-600"><li className="flex gap-2"><Check className="mt-1 size-4 text-vokai-forest" />Choose your learning goal and time window.</li><li className="flex gap-2"><Check className="mt-1 size-4 text-vokai-forest" />See your daily plan and ask Focus Coach for help.</li><li className="flex gap-2"><Check className="mt-1 size-4 text-vokai-forest" />Review your own practice summary when you are ready.</li></ul></div><div className="rounded-2xl border border-stone-200 bg-white p-6"><Laptop className="size-6 text-vokai-forest" /><h3 className="mt-4 font-semibold text-vokai-ink">On Mac or Windows</h3><ul className="mt-3 space-y-2 text-sm leading-6 text-stone-600"><li className="flex gap-2"><Check className="mt-1 size-4 text-vokai-forest" />Connect the planned desktop companion to the same VOKAI account.</li><li className="flex gap-2"><Check className="mt-1 size-4 text-vokai-forest" />Opt in to measure time in supported learning and editor tools.</li><li className="flex gap-2"><Check className="mt-1 size-4 text-vokai-forest" />See a simple VS Code/editor practice-time summary back in mobile VOKAI.</li></ul></div></div>
          </section>

          <section id="privacy" className="scroll-mt-24 border-b border-stone-200 py-16">
            <SectionTitle eyebrow="06 · Privacy & control" title="Your learning data should serve you, not surveil you.">VOKAI already keeps a signed-in learner’s profile and coding progress separate by account. Any future activity insights should follow the same principle: clear purpose, clear permission, and easy control.</SectionTitle>
            <div className="grid gap-4 md:grid-cols-3"><div className="rounded-2xl border border-stone-200 bg-white p-5"><LockKeyhole className="size-5 text-vokai-forest" /><h3 className="mt-4 font-semibold text-vokai-ink">What VOKAI uses today</h3><p className="mt-2 text-sm leading-6 text-stone-600">Your selected learning plan, profile, daily check-ins, syllabus progress, and messages you choose to send to Focus Coach.</p></div><div className="rounded-2xl border border-stone-200 bg-white p-5"><AlertCircle className="size-5 text-vokai-forest" /><h3 className="mt-4 font-semibold text-vokai-ink">What it does not track today</h3><p className="mt-2 text-sm leading-6 text-stone-600">VOKAI does not read your screen, app use, browser history, desktop activity, or VS Code/editor time.</p></div><div className="rounded-2xl border border-[#F0D9A8] bg-[#FFF9EB] p-5"><ShieldCheck className="size-5 text-[#9C7026]" /><h3 className="mt-4 font-semibold text-vokai-ink">How planned insights should work</h3><p className="mt-2 text-sm leading-6 text-stone-600">Explicit opt-in, visible categories and time totals, no hidden monitoring, and a way to disconnect or turn off collection whenever you choose.</p></div></div>
          </section>

          <section id="developer" className="scroll-mt-24 border-b border-stone-200 py-16">
            <SectionTitle eyebrow="Developer section" title="Build, run, and extend VOKAI.">The details below are for contributors and deployment owners. They explain the existing mobile client, FastAPI server, Supabase schema, and Docker setup without getting in the way of the learner guide above.</SectionTitle>
            <div className="rounded-3xl border border-stone-200 bg-white p-6"><div className="grid gap-4 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center"><div><Smartphone className="mb-3 size-5 text-vokai-forest" /><h3 className="font-semibold text-vokai-ink">Expo client</h3><p className="mt-1 text-sm leading-6 text-stone-600">Mobile UI, local cache, reminders, authentication session, and Focus Coach composer.</p></div><ChevronRight className="mx-auto hidden text-stone-300 md:block" /><div><Server className="mb-3 size-5 text-vokai-forest" /><h3 className="font-semibold text-vokai-ink">FastAPI server</h3><p className="mt-1 text-sm leading-6 text-stone-600">Authenticated profile, journey, syllabus, garden, and coach endpoints.</p></div><ChevronRight className="mx-auto hidden text-stone-300 md:block" /><div><Database className="mb-3 size-5 text-vokai-forest" /><h3 className="font-semibold text-vokai-ink">Supabase</h3><p className="mt-1 text-sm leading-6 text-stone-600">Authentication, PostgreSQL, and Row Level Security for account-owned data.</p></div></div></div>
          </section>

          <section id="docker" className="scroll-mt-24 border-b border-stone-200 py-16">
            <SectionTitle eyebrow="Developer · Docker" title="Run the web client and API together.">Docker Compose serves FastAPI on port 8000 and the Expo web build on port 8080. Run the Supabase migrations before starting the API.</SectionTitle>
            <div className="grid gap-5 lg:grid-cols-2"><div><CodeBlock title="Start Docker Compose" code={"cp vokai-server/.env.example vokai-server/.env\n# Add Supabase connection values to vokai-server/.env\ndocker compose up --build"} /></div><div className="rounded-2xl border border-stone-200 bg-white p-5 text-sm leading-6 text-stone-600"><p className="font-semibold text-vokai-ink">After startup</p><ul className="mt-3 space-y-2"><li><span className="font-mono text-vokai-forest">http://localhost:8080</span> — web client</li><li><span className="font-mono text-vokai-forest">http://localhost:8000/docs</span> — Swagger UI</li><li><span className="font-mono text-vokai-forest">docker compose logs -f server</span> — API logs</li></ul></div></div>
          </section>

          <section id="local" className="scroll-mt-24 border-b border-stone-200 py-16">
            <SectionTitle eyebrow="Developer · Local" title="Run client and server separately while you build.">Start FastAPI from <code>vokai-server</code>, then start Expo from <code>vokai-client</code>. The server command only works from the server directory because that is where <code>requirements.txt</code> and <code>app/main.py</code> live.</SectionTitle>
            <div className="grid gap-5 lg:grid-cols-2"><CodeBlock title="Terminal 1 · FastAPI server" code={"cd vokai-server\npython3 -m venv .venv\nsource .venv/bin/activate\npip install -r requirements.txt\nfastapi dev app/main.py --host 0.0.0.0 --port 8000"} /><CodeBlock title="Terminal 2 · Expo client" code={"cd vokai-client\nnpm install\nnpm run start\n# Or launch a native Android development build:\nANDROID_HOME=\"$HOME/Library/Android/sdk\" npm run android"} /></div>
          </section>

          <section id="database" className="scroll-mt-24 border-b border-stone-200 py-16">
            <SectionTitle eyebrow="Developer · Data" title="Configure Supabase in the right order.">Enable Email and Google authentication, then apply all nine SQL files in Supabase SQL Editor. The API validates the schema at startup and exits if required tables or profile columns are missing.</SectionTitle>
            <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]"><div className="rounded-2xl border border-stone-200 bg-white p-5"><h3 className="font-semibold text-vokai-ink">SQL migration order</h3><div className="mt-4 space-y-2">{migrations.map((migration, index) => <div key={migration} className="flex items-center gap-3 rounded-xl bg-stone-50 px-3 py-2 font-mono text-xs text-stone-600"><span className="grid size-5 place-items-center rounded-full bg-vokai-moss font-sans text-[10px] font-bold text-vokai-forest">{index + 1}</span>{migration}</div>)}</div></div><div className="space-y-4"><div className="rounded-2xl bg-vokai-ink p-5 text-white"><KeyRound className="size-5 text-[#BEDFBA]" /><h3 className="mt-4 font-semibold">Required server variables</h3><p className="mt-2 text-sm leading-6 text-stone-300"><code>DIRECT_URL</code>, <code>DATABASE_URL</code>, <code>SUPABASE_URL</code>, and <code>SUPABASE_PUBLISHABLE_KEY</code>. Add <code>GEMINI_API_KEY</code> to enable Focus Coach replies.</p></div><CodeBlock title="Start FastAPI locally" code={"cd vokai-server\npython3 -m venv .venv\nsource .venv/bin/activate\npip install -r requirements.txt\nfastapi dev app/main.py --host 0.0.0.0 --port 8000"} /></div></div>
          </section>

          <section id="api" className="scroll-mt-24 py-16">
            <SectionTitle eyebrow="Developer · API" title="Account-aware endpoints for the VOKAI journey.">Protected endpoints require <code>Authorization: Bearer &lt;supabase-access-token&gt;</code>. The running API exposes full request and response schemas at <code>/docs</code>.</SectionTitle>
            <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white"><div className="grid grid-cols-[88px_1fr] border-b border-stone-200 bg-stone-50 px-4 py-2 text-[11px] font-bold tracking-wider text-stone-400 uppercase"><span>Method</span><span>Endpoint</span></div>{[
              ["GET", "/vokai/auth/config"], ["GET", "/vokai/bootstrap"], ["PUT", "/vokai/profile"], ["GET", "/vokai/garden"], ["GET", "/vokai/check-ins/today"], ["PUT", "/vokai/check-ins"], ["GET", "/vokai/syllabus"], ["POST", "/vokai/syllabus/generate"], ["PUT", "/vokai/syllabus/topics"], ["POST", "/vokai/focus/coach"], ["DELETE", "/vokai/journey"],
            ].map(([method, endpoint]) => <div key={endpoint} className="grid grid-cols-[88px_1fr] border-b border-stone-100 px-4 py-3 last:border-b-0"><span className={`w-fit rounded px-1.5 py-0.5 text-[10px] font-bold ${method === "GET" ? "bg-blue-50 text-blue-700" : method === "POST" ? "bg-emerald-50 text-emerald-700" : method === "PUT" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>{method}</span><code className="text-sm text-stone-700">{endpoint}</code></div>)}</div>
          </section>

          <section id="troubleshooting" className="scroll-mt-24 py-16">
            <SectionTitle eyebrow="Developer · Help" title="Fix common setup issues quickly.">Most startup problems come from running commands in the wrong directory, missing Supabase migrations, or an API URL a phone cannot reach.</SectionTitle>
            <div className="space-y-3">{[
              ["requirements.txt or app/main.py cannot be found", "Run the FastAPI commands from vokai-server, not vokai-client or the repository root."],
              ["Server asks for SQL migrations", "Open Supabase SQL Editor and apply every migration from 001 through 009 in order."],
              ["A phone cannot reach the local server", "Set EXPO_PUBLIC_VOKAI_API_URL to your computer’s LAN IP address, not localhost."],
              ["Voice typing is unavailable", "Use a native Android development build, grant microphone access, and ensure a speech-recognition service is enabled on the device."],
              ["Docker command is unavailable", "Install Docker Desktop, then rerun docker compose up --build from the repository root."],
            ].map(([question, answer]) => <details key={question} className="group rounded-2xl border border-stone-200 bg-white px-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-semibold text-vokai-ink"><span>{question}</span><ChevronRight className="size-4 text-stone-400 transition group-open:rotate-90" /></summary><p className="border-t border-stone-100 py-4 text-sm leading-6 text-stone-600">{answer}</p></details>)}</div>
          </section>

          <footer className="border-t border-stone-200 py-8 text-sm text-stone-500">Built for steady progress, not perfect streaks. <a href="https://github.com/aadityakumarsah/vokai-app" className="font-medium text-vokai-forest hover:underline">View VOKAI on GitHub</a>.</footer>
        </main>
      </div>
    </div>
  );
}

export default App;
