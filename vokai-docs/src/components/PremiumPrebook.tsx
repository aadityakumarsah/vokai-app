import { useState, useEffect, type FormEvent } from "react";
import { ArrowRight, Check, Crown, LoaderCircle, ShieldCheck } from "lucide-react";

type PlanId = "weekly" | "monthly" | "yearly";

const plans: Array<{ id: PlanId; label: string; price: string; period: string; detail: string; featured?: boolean }> = [
  { id: "weekly", label: "Weekly", price: "$3", period: "/ week", detail: "A flexible way to begin." },
  { id: "monthly", label: "Monthly", price: "$10", period: "/ month", detail: "A steady learning rhythm.", featured: true },
  { id: "yearly", label: "Yearly", price: "$198", period: "/ year", detail: "A full year of focused growth." },
];

const apiBaseUrl = (import.meta.env.VITE_VOKAI_API_URL || (import.meta.env.DEV ? "http://localhost:8000" : "")).replace(/\/$/, "");

export function PremiumPrebook() {
  const [plan, setPlan] = useState<PlanId>("monthly");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [showWakingUpNotice, setShowWakingUpNotice] = useState(false);

  useEffect(() => {
    if (apiBaseUrl) {
      // Warm up the server in the background on page load to eliminate Render free-tier spin-up delay
      fetch(`${apiBaseUrl}/health`).catch(() => {});
    }
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!apiBaseUrl) {
      setMessage("Pre-booking is not connected to the VOKAI server yet. Please check back shortly.");
      return;
    }
    setSubmitting(true);
    setMessage("");
    setShowWakingUpNotice(false);

    // If the request takes longer than 1.5 seconds, show a spin-up notice
    const noticeTimeout = setTimeout(() => {
      setShowWakingUpNotice(true);
    }, 1500);

    try {
      const response = await fetch(`${apiBaseUrl}/vokai/premium/prebook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, name, email }),
      });
      clearTimeout(noticeTimeout);
      setShowWakingUpNotice(false);

      const payload = await response.json().catch(() => null) as { data?: { checkout_url?: string }; detail?: string } | null;
      if (!response.ok || !payload?.data?.checkout_url) {
        throw new Error(payload?.detail || "We could not start your secure checkout. Please try again.");
      }
      window.location.assign(payload.data.checkout_url);
    } catch (error) {
      clearTimeout(noticeTimeout);
      setShowWakingUpNotice(false);
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        setMessage("We could not reach the VOKAI payment server. Start FastAPI on port 8000 locally, or configure VITE_VOKAI_API_URL with a public HTTPS API before deploying Docs.");
      } else {
        setMessage(error instanceof Error ? error.message : "We could not start your secure checkout. Please try again.");
      }
      setSubmitting(false);
    }
  };

  return (
    <section id="premium" className="scroll-mt-24 border-b border-stone-200 py-10 sm:py-16">
      <div className="relative overflow-hidden rounded-[1.5rem] bg-[#18374A] px-5 py-8 text-white shadow-[0_22px_60px_rgba(22,55,74,.22)] sm:rounded-[2rem] sm:px-8 sm:py-10 lg:px-10">
        <div className="pointer-events-none absolute -right-20 -top-28 size-80 rounded-full bg-[#E7A1B2]/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/4 size-72 rounded-full bg-[#A4D7C6]/15 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)] lg:items-start">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-bold tracking-[.14em] text-[#FBE8B6] uppercase sm:gap-2 sm:px-3 sm:py-1.5 sm:text-[11px]"><Crown className="size-3 sm:size-3.5" /> VOKAI Premium</div>
            <h2 className="mt-4 max-w-xl font-display text-3xl leading-[1.05] tracking-tight sm:mt-5 sm:text-5xl sm:leading-[.98]">Protect more room for your coding journey.</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/76 sm:mt-4 sm:text-[15px] sm:leading-7">Choose a plan now and continue to Dodo’s secure checkout. Your details are added to VOKAI only after Dodo confirms the payment.</p>

            <div className="mt-6 flex flex-col gap-2.5 sm:mt-7 sm:grid sm:grid-cols-3 sm:gap-3">
              {plans.map((item) => {
                const selected = plan === item.id;
                return <button key={item.id} type="button" onClick={() => setPlan(item.id)} className={`relative flex w-full items-center justify-between rounded-xl border px-4 py-3.5 text-left transition duration-200 sm:block sm:rounded-2xl sm:p-4 ${selected ? "border-[#F9DEA3] bg-white/16 shadow-[0_10px_24px_rgba(0,0,0,.15)]" : "border-white/14 bg-white/[.06] hover:border-white/30 hover:bg-white/[.1]"}`} aria-pressed={selected}>
                  {item.featured && <span className="absolute -top-2.5 left-4 rounded-full bg-[#F9DEA3] px-2 py-0.5 text-[9px] font-extrabold tracking-wider text-[#5C431D] uppercase sm:left-3">Popular</span>}
                  
                  <div className="flex items-baseline gap-2 sm:block sm:gap-0">
                    <p className="w-14 text-xs font-bold text-white/72 sm:w-auto">{item.label}</p>
                    <p className="font-display text-xl tracking-tight sm:mt-2 sm:text-3xl">{item.price}<span className="ml-1 font-sans text-xs font-medium text-white/60">{item.period}</span></p>
                  </div>
                  
                  <p className="mt-2 hidden text-xs leading-5 text-white/65 sm:block">{item.detail}</p>
                  <span className={`inline-flex size-4 shrink-0 items-center justify-center rounded-full border sm:mt-3 ${selected ? "border-[#F9DEA3] bg-[#F9DEA3] text-[#34513E]" : "border-white/35 text-transparent"}`}><Check className="size-3 stroke-[3]" /></span>
                </button>;
              })}
            </div>

            <div className="mt-5 flex items-center gap-1.5 text-[11px] leading-4 text-white/66 sm:mt-7 sm:gap-2 sm:text-xs sm:leading-5"><ShieldCheck className="size-3.5 shrink-0 text-[#A4D7C6] sm:size-4" /> Payment details are entered only on Dodo’s hosted checkout page.</div>
          </div>

          <form onSubmit={submit} className="rounded-[1.25rem] border border-white/16 bg-[#0E2635]/72 p-5 shadow-xl backdrop-blur-sm sm:rounded-[1.45rem] sm:p-6">
            <p className="text-[11px] font-bold tracking-[.15em] text-[#A4D7C6] uppercase sm:text-xs">Pre-book Premium</p>
            <h3 className="mt-1.5 font-display text-2xl tracking-tight sm:mt-2 sm:text-3xl">Reserve {plans.find((item) => item.id === plan)?.label}</h3>
            <label className="mt-4 block text-xs font-semibold text-white/75 sm:mt-5" htmlFor="premium-name">Your name
              <input id="premium-name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={80} autoComplete="name" placeholder="Your name" className="mt-1.5 h-10 w-full rounded-xl border border-white/18 bg-white/10 px-3 text-sm text-white outline-none placeholder:text-white/40 transition focus:border-[#F9DEA3] focus:bg-white/[.14] sm:mt-2 sm:h-11" />
            </label>
            <label className="mt-3 block text-xs font-semibold text-white/75 sm:mt-4" htmlFor="premium-email">Email address
              <input id="premium-email" value={email} onChange={(event) => setEmail(event.target.value)} required type="email" maxLength={320} autoComplete="email" placeholder="you@example.com" className="mt-1.5 h-10 w-full rounded-xl border border-white/18 bg-white/10 px-3 text-sm text-white outline-none placeholder:text-white/40 transition focus:border-[#F9DEA3] focus:bg-white/[.14] sm:mt-2 sm:h-11" />
            </label>
            {showWakingUpNotice && (
              <p className="mt-3 rounded-xl border border-sky-400/30 bg-sky-950/40 px-3 py-2 text-xs leading-5 text-sky-200 sm:mt-4" role="status">
                Our secure payments server is waking up (Render free tier). This can take 30-40 seconds if it was inactive. Thank you for your patience!
              </p>
            )}
            {message && <p className="mt-3 rounded-xl border border-[#F8D7A7]/30 bg-[#7F4D3E]/35 px-3 py-2 text-xs leading-5 text-[#FFE1B3] sm:mt-4" role="status">{message}</p>}
            <button type="submit" disabled={submitting} className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#F9DEA3] px-4 text-sm font-extrabold text-[#34513E] transition hover:bg-[#FFF0C8] disabled:cursor-wait disabled:opacity-70 sm:mt-5 sm:h-11">
              {submitting ? <LoaderCircle className="size-4 animate-spin" /> : <Crown className="size-4" />} {submitting ? "Opening checkout…" : `Pre-book for ${plans.find((item) => item.id === plan)?.price}`} <ArrowRight className="size-4" />
            </button>
            <p className="mt-3 text-center text-[11px] leading-5 text-white/52">You will be redirected to Dodo Payments to complete this pre-booking.</p>
          </form>
        </div>
      </div>
    </section>
  );
}
