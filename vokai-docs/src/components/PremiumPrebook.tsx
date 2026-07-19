import { useState, type FormEvent } from "react";
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

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!apiBaseUrl) {
      setMessage("Pre-booking is not connected to the VOKAI server yet. Please check back shortly.");
      return;
    }
    setSubmitting(true);
    setMessage("");
    try {
      const response = await fetch(`${apiBaseUrl}/vokai/premium/prebook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, name, email }),
      });
      const payload = await response.json().catch(() => null) as { data?: { checkout_url?: string }; detail?: string } | null;
      if (!response.ok || !payload?.data?.checkout_url) {
        throw new Error(payload?.detail || "We could not start your secure checkout. Please try again.");
      }
      window.location.assign(payload.data.checkout_url);
    } catch (error) {
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        setMessage("We could not reach the VOKAI payment server. Start FastAPI on port 8000 locally, or configure VITE_VOKAI_API_URL with a public HTTPS API before deploying Docs.");
      } else {
        setMessage(error instanceof Error ? error.message : "We could not start your secure checkout. Please try again.");
      }
      setSubmitting(false);
    }
  };

  return (
    <section id="premium" className="scroll-mt-24 border-b border-stone-200 py-16">
      <div className="relative overflow-hidden rounded-[2rem] bg-[#18374A] px-5 py-8 text-white shadow-[0_22px_60px_rgba(22,55,74,.22)] sm:px-8 sm:py-10 lg:px-10">
        <div className="pointer-events-none absolute -right-20 -top-28 size-80 rounded-full bg-[#E7A1B2]/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/4 size-72 rounded-full bg-[#A4D7C6]/15 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)] lg:items-start">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-bold tracking-[.14em] text-[#FBE8B6] uppercase"><Crown className="size-3.5" /> VOKAI Premium</div>
            <h2 className="mt-5 max-w-xl font-display text-4xl leading-[.98] tracking-tight sm:text-5xl">Protect more room for your coding journey.</h2>
            <p className="mt-4 max-w-xl text-[15px] leading-7 text-white/76">Choose a plan now and continue to Dodo’s secure checkout. Your details are added to VOKAI only after Dodo confirms the payment.</p>

            <div className="mt-7 grid grid-cols-3 gap-2 sm:gap-3">
              {plans.map((item) => {
                const selected = plan === item.id;
                return <button key={item.id} type="button" onClick={() => setPlan(item.id)} className={`relative rounded-2xl border p-3 text-left transition duration-200 sm:p-4 ${selected ? "border-[#F9DEA3] bg-white/16 shadow-[0_10px_24px_rgba(0,0,0,.15)]" : "border-white/14 bg-white/[.06] hover:border-white/30 hover:bg-white/[.1]"}`} aria-pressed={selected}>
                  {item.featured && <span className="absolute -top-2.5 left-3 rounded-full bg-[#F9DEA3] px-2 py-0.5 text-[9px] font-extrabold tracking-wider text-[#5C431D] uppercase">Popular</span>}
                  <p className="text-xs font-bold text-white/72">{item.label}</p>
                  <p className="mt-2 font-display text-2xl tracking-tight sm:text-3xl">{item.price}<span className="ml-1 font-sans text-[10px] font-medium text-white/60 sm:text-xs">{item.period}</span></p>
                  <p className="mt-2 hidden text-xs leading-5 text-white/65 sm:block">{item.detail}</p>
                  <span className={`mt-2 inline-flex size-4 items-center justify-center rounded-full border sm:mt-3 ${selected ? "border-[#F9DEA3] bg-[#F9DEA3] text-[#34513E]" : "border-white/35 text-transparent"}`}><Check className="size-3 stroke-[3]" /></span>
                </button>;
              })}
            </div>

            <div className="mt-7 flex items-center gap-2 text-xs leading-5 text-white/66"><ShieldCheck className="size-4 shrink-0 text-[#A4D7C6]" /> Payment details are entered only on Dodo’s hosted checkout page.</div>
          </div>

          <form onSubmit={submit} className="rounded-[1.45rem] border border-white/16 bg-[#0E2635]/72 p-5 shadow-xl backdrop-blur-sm sm:p-6">
            <p className="text-xs font-bold tracking-[.15em] text-[#A4D7C6] uppercase">Pre-book Premium</p>
            <h3 className="mt-2 font-display text-3xl tracking-tight">Reserve {plans.find((item) => item.id === plan)?.label}</h3>
            <label className="mt-5 block text-xs font-semibold text-white/75" htmlFor="premium-name">Your name
              <input id="premium-name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={80} autoComplete="name" placeholder="Your name" className="mt-2 h-11 w-full rounded-xl border border-white/18 bg-white/10 px-3 text-sm text-white outline-none placeholder:text-white/40 transition focus:border-[#F9DEA3] focus:bg-white/[.14]" />
            </label>
            <label className="mt-4 block text-xs font-semibold text-white/75" htmlFor="premium-email">Email address
              <input id="premium-email" value={email} onChange={(event) => setEmail(event.target.value)} required type="email" maxLength={320} autoComplete="email" placeholder="you@example.com" className="mt-2 h-11 w-full rounded-xl border border-white/18 bg-white/10 px-3 text-sm text-white outline-none placeholder:text-white/40 transition focus:border-[#F9DEA3] focus:bg-white/[.14]" />
            </label>
            {message && <p className="mt-4 rounded-xl border border-[#F8D7A7]/30 bg-[#7F4D3E]/35 px-3 py-2 text-xs leading-5 text-[#FFE1B3]" role="status">{message}</p>}
            <button type="submit" disabled={submitting} className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#F9DEA3] px-4 text-sm font-extrabold text-[#34513E] transition hover:bg-[#FFF0C8] disabled:cursor-wait disabled:opacity-70">
              {submitting ? <LoaderCircle className="size-4 animate-spin" /> : <Crown className="size-4" />} {submitting ? "Opening checkout…" : `Pre-book for ${plans.find((item) => item.id === plan)?.price}`} <ArrowRight className="size-4" />
            </button>
            <p className="mt-3 text-center text-[11px] leading-5 text-white/52">You will be redirected to Dodo Payments to complete this pre-booking.</p>
          </form>
        </div>
      </div>
    </section>
  );
}
