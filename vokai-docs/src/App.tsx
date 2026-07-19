import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  AlertCircle,
  ArrowRight,
  Bot,
  Box,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
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
  PanelLeftClose,
  PanelLeftOpen,
  Play,
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
import learningChoiceImage from "../vokai-docs-images/vokai-before-learning-qna-whatareyoulearning.png";
import experienceImage from "../vokai-docs-images/vokai-before-learning-howmuchdoyouknow.png";
import scheduleImage from "../vokai-docs-images/vokai-protechyourtime-afterlogin-qna.png";
import dailyCheckInImage from "../vokai-docs-images/vokai-homepage-dailycheckin.png";
import coachImage from "../vokai-docs-images/vokai-focus-vokai-coach.png";
import gardenImage from "../vokai-docs-images/vokai-garden-milestones.png";
import syllabusImage from "../vokai-docs-images/vokai-syllabus.png";
import syllabusHelpImage from "../vokai-docs-images/vokai-syllabus-askChatGPT-orClaude.png";
import profileImage from "../vokai-docs-images/vokai-user-profile.png";
import friendsImage from "../vokai-docs-images/vokai-friends.png";
import cityImage from "../vokai-docs-images/vokai-explore-yourcity-tower-leaderboard.png";

gsap.registerPlugin(ScrollTrigger);

type Icon = typeof Sprout;
type NavItem = { id: string; label: string; icon: Icon };

const learnerNavigation: NavItem[] = [
  { id: "start", label: "Getting started", icon: Rocket },
  { id: "product-tour", label: "Visual product tour", icon: Smartphone },
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

const heroVideoUrl = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260324_151826_c7218672-6e92-402c-9e45-f1e0f454bdc4.mp4";
// Replace this with VOKAI's published Google Play Store URL before launch.
const playStoreUrl = "#";
const bloomPalette = ["#E795A6", "#EEA3B2", "#D77C93", "#F3B0BC", "#E38CA0"];

type TourStep = {
  id: string;
  group: "Set up" | "Practice" | "Grow together";
  image: string;
  eyebrow: string;
  title: string;
  description: string;
  callout: string;
};

const productTour: TourStep[] = [
  { id: "learning-choice", group: "Set up", image: learningChoiceImage, eyebrow: "Start your plan", title: "Choose what you want to learn", description: "Begin by naming the language or topic you want to focus on. VOKAI uses this choice to shape your daily plan and coach prompts.", callout: "Pick the learning path that feels most exciting right now." },
  { id: "experience", group: "Set up", image: experienceImage, eyebrow: "Start your plan", title: "Set a comfortable starting level", description: "Tell VOKAI whether you are a beginner, intermediate learner, or advanced learner so the first tasks meet you where you are.", callout: "Choose the level that matches today—not the level you feel you should be." },
  { id: "schedule", group: "Set up", image: scheduleImage, eyebrow: "Protect your time", title: "Build around your real schedule", description: "Add your available time and routines. VOKAI turns that information into a plan that respects the rest of your day.", callout: "Use this step to protect a realistic window for learning." },
  { id: "daily-check-in", group: "Practice", image: dailyCheckInImage, eyebrow: "Your home", title: "Complete a daily check-in", description: "Your home screen keeps today’s three focused actions, streak, and garden in one place so you always know the next useful step.", callout: "Start with one of today’s small coding actions." },
  { id: "focus-coach", group: "Practice", image: coachImage, eyebrow: "Get unstuck", title: "Ask Focus Coach for a next step", description: "When a task feels unclear, use the coach to break it down, explain a concept, or plan the time you have available.", callout: "Open the coach when you need help turning a big task into a small move." },
  { id: "syllabus", group: "Practice", image: syllabusImage, eyebrow: "Learn with structure", title: "Follow your guided syllabus", description: "Your syllabus collects the topics, practice steps, and daily plan that make up your learning journey.", callout: "Expand a topic to see the exact practice step for that day." },
  { id: "syllabus-help", group: "Practice", image: syllabusHelpImage, eyebrow: "Learn with support", title: "Bring a topic to your AI helper", description: "Each syllabus topic can give you a ready-to-use question for ChatGPT or Claude, making it easier to ask for the right explanation.", callout: "Tap the suggested prompt to get help without starting from a blank message." },
  { id: "garden", group: "Grow together", image: gardenImage, eyebrow: "See your progress", title: "Unlock garden milestones", description: "Check-ins grow your garden and unlock visible milestones such as pots, flowers, trees, berries, and bees.", callout: "Your next garden unlock is always shown so consistency feels tangible." },
  { id: "profile", group: "Grow together", image: profileImage, eyebrow: "Your identity", title: "Keep your journey in one profile", description: "Your profile shows your VOKAI ID, earned points and coins, daily check-in history, learning language, and achievements.", callout: "Tap your name at the top of the app to open your profile." },
  { id: "friends", group: "Grow together", image: friendsImage, eyebrow: "Learn together", title: "Add your coding circle", description: "Send a friend request using a VOKAI account email, then visit your friends’ profiles and celebrate their learning progress.", callout: "Use this card to invite a friend into your learning circle." },
  { id: "city", group: "Grow together", image: cityImage, eyebrow: "Learn together", title: "Explore the learning city", description: "The private leaderboard turns points into solid 3D towers. More points build higher towers, and you can orbit the city to explore every friend’s progress.", callout: "Drag the city to orbit it, then use the height controls to explore the skyline." },
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

function ProductTour() {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = productTour[activeIndex];
  const selectStep = (index: number) => setActiveIndex((index + productTour.length) % productTour.length);
  const groups: TourStep["group"][] = ["Set up", "Practice", "Grow together"];
  return (
    <section id="product-tour" className="scroll-mt-24 border-b border-stone-200 py-16">
      <SectionTitle eyebrow="See VOKAI in action" title="A visual guide through every part of your learning journey.">Choose a feature on the right to see the exact screen and a quick explanation of what that part of VOKAI does.</SectionTitle>
      <div className="grid gap-8 xl:grid-cols-[minmax(290px,.8fr)_minmax(0,1.2fr)] xl:items-start">
        <div className="xl:sticky xl:top-24">
          <div className="tour-stage">
            <div className="tour-visual-row">
              <div className="tour-phone-shell">
                <img key={active.id} className="tour-phone-image" src={active.image} alt={`${active.title} screen in VOKAI`} />
              </div>
              <div className="tour-callout" aria-live="polite"><ArrowRight className="tour-callout-arrow size-4" aria-hidden="true" /><span>{active.callout}</span></div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <Button variant="outline" size="sm" onClick={() => selectStep(activeIndex - 1)} aria-label="Show previous guide screen"><ChevronLeft /> Previous</Button>
              <span className="text-center text-xs font-semibold text-stone-500">{activeIndex + 1} of {productTour.length}</span>
              <Button variant="outline" size="sm" onClick={() => selectStep(activeIndex + 1)} aria-label="Show next guide screen">Next <ChevronRight /></Button>
            </div>
          </div>
          <div className="mt-5 rounded-2xl border border-[#D5E5D1] bg-[#F1F8EF] p-4">
            <p className="text-[11px] font-bold tracking-[0.15em] text-vokai-forest uppercase">{active.eyebrow}</p>
            <h3 className="mt-1 font-display text-2xl text-vokai-ink">{active.title}</h3>
            <p className="mt-2 text-sm leading-6 text-stone-600">{active.description}</p>
          </div>
        </div>

        <div className="space-y-7">
          {groups.map((group) => {
            const steps = productTour.map((step, index) => ({ step, index })).filter(({ step }) => step.group === group);
            return <div key={group}>
              <p className="mb-3 text-[11px] font-bold tracking-[0.16em] text-stone-400 uppercase">{group}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {steps.map(({ step, index }) => {
                  const isActive = index === activeIndex;
                  return <button key={step.id} type="button" onClick={() => selectStep(index)} className={`tour-step-card text-left ${isActive ? "tour-step-card-active" : ""}`} aria-pressed={isActive}>
                    <div className="tour-step-thumb"><img src={step.image} alt="" /><span className="tour-step-number">{String(index + 1).padStart(2, "0")}</span>{isActive && <span className="tour-step-viewing">Viewing</span>}</div>
                    <div className="min-w-0"><p className="text-[10px] font-bold tracking-[0.13em] text-vokai-forest uppercase">{step.eyebrow}</p><h3 className="mt-1 text-sm font-semibold leading-5 text-vokai-ink">{step.title}</h3><p className="mt-1 line-clamp-2 text-xs leading-5 text-stone-500">{step.description}</p></div>
                  </button>;
                })}
              </div>
            </div>;
          })}
        </div>
      </div>
    </section>
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
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [heroSoundEnabled, setHeroSoundEnabled] = useState(false);
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const heroSectionRef = useRef<HTMLElement>(null);
  const heroContentRef = useRef<HTMLDivElement>(null);
  const guideRevealRef = useRef<HTMLDivElement>(null);
  const bloomLayerRef = useRef<HTMLDivElement>(null);
  const lastTrailPetalAtRef = useRef(0);
  const closeMenu = () => setMenuOpen(false);
  const attemptHeroPlayback = () => {
    const video = heroVideoRef.current;
    if (!video || heroSoundEnabled) return;
    video.muted = false;
    video.volume = 0.8;
    void video.play().then(() => setHeroSoundEnabled(true)).catch(() => {
      video.muted = true;
      void video.play().catch(() => undefined);
    });
  };

  useEffect(() => {
    attemptHeroPlayback();
  }, []);

  const createCursorBloom = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!bloomLayerRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const bloom = document.createElement("span");
    bloom.className = "cursor-bloom";
    bloom.style.left = `${event.clientX}px`;
    bloom.style.top = `${event.clientY}px`;

    const flower = document.createElement("span");
    flower.className = "cursor-bloom-flower";
    bloom.appendChild(flower);

    const burstPaths = Array.from({ length: 9 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const distance = 11 + Math.random() * 27;
      return {
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance * (0.65 + Math.random() * 0.55),
        rotation: -95 + Math.random() * 190,
        scale: 0.45 + Math.random() * 0.65,
      };
    });

    Array.from({ length: 9 }, (_, index) => index).forEach((index) => {
      const petal = document.createElement("span");
      petal.className = "cursor-bloom-petal";
      petal.style.setProperty("--bloom-color", bloomPalette[index % bloomPalette.length]);
      petal.style.setProperty("--bloom-angle", `${Math.round(Math.random() * 180 - 90)}deg`);
      petal.style.setProperty("--bloom-width", `${7 + Math.round(Math.random() * 7)}px`);
      petal.style.setProperty("--bloom-height", `${4 + Math.round(Math.random() * 5)}px`);
      flower.appendChild(petal);
    });

    const core = document.createElement("span");
    core.className = "cursor-bloom-core";
    flower.appendChild(core);
    bloomLayerRef.current.appendChild(bloom);

    const petals = Array.from(flower.querySelectorAll<HTMLElement>(".cursor-bloom-petal"));
    gsap.set(flower, { transformOrigin: "center center", scale: 0.2, rotation: -20 });
    gsap.to(flower, { scale: 1.02, rotation: 14, duration: 0.26, ease: "back.out(2)" });
    gsap.to(petals, {
      x: (index) => burstPaths[index].x,
      y: (index) => burstPaths[index].y,
      rotation: (index) => burstPaths[index].rotation,
      scale: (index) => burstPaths[index].scale,
      duration: 0.3,
      ease: "power2.out",
      stagger: 0.01,
    });
    gsap.to(bloom, { autoAlpha: 0, duration: 0.14, delay: 0.2, ease: "power2.in", onComplete: () => bloom.remove() });
  };

  const createCursorPetalTrail = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || !bloomLayerRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const now = performance.now();
    if (now - lastTrailPetalAtRef.current < 170) return;
    lastTrailPetalAtRef.current = now;

    const petalCount = Math.random() > 0.8 ? 2 : 1;
    Array.from({ length: petalCount }, (_, index) => index).forEach((index) => {
      const petal = document.createElement("span");
      petal.className = "cursor-trail-petal";
      petal.style.left = `${event.clientX + (index ? 4 : -2)}px`;
      petal.style.top = `${event.clientY + (index ? -3 : 2)}px`;
      petal.style.setProperty("--bloom-color", bloomPalette[Math.floor(Math.random() * bloomPalette.length)]);
      petal.style.setProperty("--bloom-width", `${7 + Math.round(Math.random() * 5)}px`);
      petal.style.setProperty("--bloom-height", `${4 + Math.round(Math.random() * 4)}px`);
      bloomLayerRef.current?.appendChild(petal);

      gsap.fromTo(petal,
        { autoAlpha: 0.9, scale: 0.5, rotation: -80 + Math.random() * 160 },
        {
          autoAlpha: 0,
          x: -15 + Math.random() * 30,
          y: 12 + Math.random() * 22,
          rotation: -160 + Math.random() * 320,
          scale: 0.9 + Math.random() * 0.35,
          duration: 0.48,
          ease: "power2.out",
          onComplete: () => petal.remove(),
        },
      );
    });
  };

  useLayoutEffect(() => {
    const hero = heroSectionRef.current;
    const heroContent = heroContentRef.current;
    const guide = guideRevealRef.current;
    if (!hero || !heroContent || !guide || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const context = gsap.context(() => {
      const guideSections = guide.querySelectorAll("main > section");

      gsap.set(guide, { xPercent: 18 });

      gsap.timeline({
        scrollTrigger: {
          trigger: hero,
          start: "top top",
          end: "bottom top",
          scrub: 0.55,
        },
      }).to(heroContent, {
        clipPath: "inset(100% 0 0 0)",
        yPercent: -22,
        ease: "none",
      }, 0);

      gsap.to(guide, {
        xPercent: 0,
        ease: "none",
        scrollTrigger: {
          trigger: guide,
          start: "top 92%",
          end: "top 35%",
          scrub: 0.7,
        },
      });

      gsap.from(guideSections, {
        autoAlpha: 0,
        x: 56,
        duration: 0.75,
        stagger: 0.1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: guide,
          start: "top 76%",
          toggleActions: "play none none reverse",
        },
      });
    });

    return () => context.revert();
  }, []);

  return (
    <div className="docs-theme min-h-screen" onPointerDown={createCursorBloom} onPointerMove={createCursorPetalTrail}>
      <div ref={bloomLayerRef} className="cursor-bloom-layer" aria-hidden="true" />
      <header className="landing-header">
        <div className="landing-header-inner">
          <a href="#start" className="landing-brand" aria-label="VOKAI home">
            <span className="landing-brand-mark"><Sprout className="size-5" /></span>
            <span>VOKAI</span>
          </a>
          <nav className="landing-nav" aria-label="Landing page navigation">
            <a href="#product-tour">Features</a>
            <a href="#progress">Progress</a>
            <a href="#daily-journey">About</a>
            <a href="#privacy">Contact</a>
          </nav>
          <a className="landing-journey-button" href={playStoreUrl} target="_blank" rel="noreferrer">Begin journey</a>
          <Button variant="ghost" size="icon" className="landing-menu-button" onClick={() => setMenuOpen((open) => !open)} aria-label="Toggle documentation navigation">
            {menuOpen ? <X /> : <Menu />}
          </Button>
        </div>
      </header>

      <section ref={heroSectionRef} id="start" className="docs-hero" onPointerDown={attemptHeroPlayback}>
        <video ref={heroVideoRef} className="docs-hero-video" loop playsInline controls={false} muted={!heroSoundEnabled} preload="auto" disablePictureInPicture disableRemotePlayback aria-hidden="true">
          <source src={heroVideoUrl} type="video/mp4" />
        </video>
        <div className="docs-hero-scrim" aria-hidden="true" />
        <div ref={heroContentRef} className="docs-hero-content">
          <div className="docs-hero-copy">
            <h1>Make room for <span>coding.</span></h1>
            <p>AI-powered guidance for the coding life you already have. Choose a focused next step, learn steadily, and make every session count.</p>
          </div>
          <a className="landing-hero-cta" href="#daily-journey"><Play className="size-4 fill-current" /> Begin journey</a>
        </div>
        <a className="landing-scroll-cue" href="#guide" aria-label="Scroll to the VOKAI guide"><ChevronDown /></a>
      </section>

      <div ref={guideRevealRef} className={`docs-guide-shell mx-auto grid max-w-[1440px] ${sidebarHidden ? "lg:grid-cols-1" : "lg:grid-cols-[260px_minmax(0,1fr)]"}`}>
        <aside id="docs-sidebar" className={`${menuOpen ? "block" : "hidden"} fixed inset-x-0 top-20 z-30 max-h-[calc(100dvh-5rem)] overflow-y-auto border-b border-stone-200 bg-[#F8F6F0] p-4 ${sidebarHidden ? "lg:hidden" : "lg:sticky lg:top-0 lg:block lg:h-screen lg:border-r lg:border-b-0 lg:px-5 lg:py-8"}`}>
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
          <section id="guide" className="scroll-mt-6 border-b border-stone-200 pb-16">
            <div className="mb-10 flex items-center justify-between gap-4 border-b border-stone-200 pb-4">
              <div><p className="text-[11px] font-bold tracking-[0.16em] text-vokai-forest uppercase">The VOKAI guide</p><p className="mt-1 text-sm text-stone-500">Everything you need to build a steady coding rhythm.</p></div>
              <Button variant="outline" size="sm" className="hidden lg:inline-flex" onClick={() => setSidebarHidden((hidden) => !hidden)} aria-controls="docs-sidebar" aria-expanded={!sidebarHidden}>
                {sidebarHidden ? <PanelLeftOpen /> : <PanelLeftClose />}
                {sidebarHidden ? "Show guide" : "Hide guide"}
              </Button>
            </div>
            <SectionTitle eyebrow="Start here" title="Build a calm, consistent coding practice.">VOKAI turns a vague goal into one clear, manageable next step each day—so practice can fit around the rest of your life.</SectionTitle>
            <div className="mt-12 grid gap-4 md:grid-cols-3">
              <FeatureCard icon={Rocket} title="Start without overwhelm" status="available">Your plan is broken into three small actions: learn, build, and reflect. You always know what comes next.</FeatureCard>
              <FeatureCard icon={Bot} title="Ask when you are stuck" status="available">Use Focus Coach for a smaller next step, an explanation, or a simple plan for the time you have right now.</FeatureCard>
              <FeatureCard icon={Sprout} title="See effort become momentum" status="available">Check-ins, streaks, and a growing garden make consistent practice easier to notice and celebrate.</FeatureCard>
            </div>
          </section>

          <ProductTour />

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
