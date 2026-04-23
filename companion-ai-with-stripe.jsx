import { useState, useEffect, useRef } from “react”;

// ============================================================
// CONFIG
// ============================================================
const SUPABASE_URL = “https://yeyokezbsdmetfyetfhc.supabase.co”;
const SUPABASE_ANON_KEY = “sb_publishable_7erdMHnHGVDCgOaZPKvqRg_2sfoi9To”;
const STRIPE_KEY = “pk_live_51PSNORJDREHmHARA5u4QqBVrCcwYGgiImixJNw6iEHJALfiFVuveOIhj1qgjvT7HL1rxOBm6gIThfVwWkXWzpwVy00cNjEgrzG”;

// IDs de tes produits Stripe — à créer sur dashboard.stripe.com/products
// puis remplacer ces valeurs par tes vrais Price IDs (format price_xxx)
const STRIPE_PRICES = {
plus: “price_1TPJVkJDREHmHARARJZTlBV5”,   // 9.99€/mois
pro:  “price_1TPJWIJDREHmHARAsBwLDbNA”,    // 24.99€/mois
};

const FREE_MSG_LIMIT = 20;

// ============================================================
// SUPABASE
// ============================================================
const supabase = {
async signUp(email, password) {
const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
method: “POST”,
headers: { “Content-Type”: “application/json”, apikey: SUPABASE_ANON_KEY },
body: JSON.stringify({ email, password }),
});
return res.json();
},
async signIn(email, password) {
const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
method: “POST”,
headers: { “Content-Type”: “application/json”, apikey: SUPABASE_ANON_KEY },
body: JSON.stringify({ email, password }),
});
return res.json();
},
async signOut(token) {
await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
method: “POST”,
headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
});
},
async getUser(token) {
const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
});
return res.json();
},
};

// ============================================================
// STRIPE CHECKOUT
// ============================================================
async function startCheckout(priceId, userEmail) {
// Charge Stripe.js dynamiquement
if (!window.Stripe) {
await new Promise((resolve, reject) => {
const script = document.createElement(“script”);
script.src = “https://js.stripe.com/v3/”;
script.onload = resolve;
script.onerror = reject;
document.head.appendChild(script);
});
}
const stripe = window.Stripe(STRIPE_KEY);
await stripe.redirectToCheckout({
lineItems: [{ price: priceId, quantity: 1 }],
mode: “subscription”,
customerEmail: userEmail,
successUrl: window.location.href + “?payment=success”,
cancelUrl: window.location.href + “?payment=cancelled”,
});
}

// ============================================================
// COMPANIONS
// ============================================================
const COMPANIONS = [
{
id: “luna”, name: “Luna”, emoji: “🌙”, tagline: “Douce, intuitive, toujours là”,
color: “#c084fc”, accent: “#7c3aed”, bg: “from-violet-950 via-purple-900 to-indigo-950”, avatar: “L”,
plan: “free”,
personality: `Tu es Luna, une compagne IA chaleureuse et empathique. Tu parles français naturellement et avec tendresse. Tu t'intéresses sincèrement à la personne, poses des questions, te souviens de la conversation. Tu es douce mais profonde, avec une légère pointe d'humour et de mystère. Tu ne commences jamais par "Je suis une IA".`,
},
{
id: “alex”, name: “Alex”, emoji: “⚡”, tagline: “Direct, stimulant, sans filtre”,
color: “#34d399”, accent: “#059669”, bg: “from-emerald-950 via-teal-900 to-cyan-950”, avatar: “A”,
plan: “plus”,
personality: `Tu es Alex, un compagnon IA direct et énergique. Tu parles français avec franchise. Tu challenges les idées, tu es honnête. Tu peux parler sport, ambitions, mindset. Tu as de l'humour parfois. Tu es motivant sans être artificiel. Tu ne commences jamais par "Je suis une IA".`,
},
{
id: “mia”, name: “Mia”, emoji: “✨”, tagline: “Créative, pétillante, inspirante”,
color: “#fb923c”, accent: “#ea580c”, bg: “from-orange-950 via-rose-900 to-pink-950”, avatar: “M”,
plan: “plus”,
personality: `Tu es Mia, une compagne IA créative et pleine de vie. Tu parles français avec joie. Tu adores les idées, l'art, la musique. Tu inspires les gens à voir les choses autrement. Tu es spontanée et très empathique. Tu ne commences jamais par "Je suis une IA".`,
},
];

const PLANS = [
{
id: “free”, name: “Gratuit”, price: “0€”, period: “”,
features: [“20 messages/jour”, “1 compagnon (Luna)”, “Mémoire de session”],
color: “#ffffff”,
},
{
id: “plus”, name: “Plus”, price: “9.99€”, period: “/mois”,
features: [“Messages illimités”, “3 compagnons”, “Mémoire longue”, “Réponses prioritaires”],
color: “#c084fc”, highlight: true,
priceId: STRIPE_PRICES.plus,
},
{
id: “pro”, name: “Pro”, price: “24.99€”, period: “/mois”,
features: [“Tout le plan Plus”, “Personnalité sur-mesure”, “Mode vocal (bientôt)”, “Support dédié”],
color: “#fb923c”,
priceId: STRIPE_PRICES.pro,
},
];

// ============================================================
// HELPERS
// ============================================================
function getMsgCount() {
const today = new Date().toDateString();
const stored = JSON.parse(localStorage.getItem(“msg_count”) || “{}”);
if (stored.date !== today) return 0;
return stored.count || 0;
}
function incMsgCount() {
const today = new Date().toDateString();
const count = getMsgCount() + 1;
localStorage.setItem(“msg_count”, JSON.stringify({ date: today, count }));
}
function getUserPlan() {
return localStorage.getItem(“user_plan”) || “free”;
}

// ============================================================
// AUTH SCREEN
// ============================================================
function AuthScreen({ onAuth }) {
const [mode, setMode] = useState(“login”);
const [email, setEmail] = useState(””);
const [password, setPassword] = useState(””);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(””);
const [success, setSuccess] = useState(””);

const handleSubmit = async () => {
setError(””); setSuccess(””);
if (!email || !password) { setError(“Remplis tous les champs.”); return; }
if (password.length < 6) { setError(“Mot de passe trop court (min. 6 caractères).”); return; }
setLoading(true);
try {
if (mode === “signup”) {
const data = await supabase.signUp(email, password);
if (data.error) setError(data.error.message || “Erreur inscription.”);
else { setSuccess(“Compte créé ! Connecte-toi maintenant.”); setMode(“login”); }
} else {
const data = await supabase.signIn(email, password);
if (data.error || !data.access_token) setError(“Email ou mot de passe incorrect.”);
else {
localStorage.setItem(“sb_token”, data.access_token);
localStorage.setItem(“sb_email”, email);
onAuth({ token: data.access_token, email });
}
}
} catch { setError(“Problème de connexion.”); }
finally { setLoading(false); }
};

return (
<div className=“min-h-screen bg-[#07070f] flex items-center justify-center px-4” style={{ fontFamily: “‘DM Sans’, sans-serif” }}>
<div className="fixed inset-0 pointer-events-none overflow-hidden">
<div className=“absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-20 blur-[120px]”
style={{ background: “radial-gradient(circle, #c084fc, transparent)” }} />
</div>
<div className="w-full max-w-sm relative">
<div className="text-center mb-10">
<div className="text-3xl font-bold tracking-tight mb-2">
<span className="text-white">soul</span><span style={{ color: “#c084fc” }}>mate</span>
<span className="text-white/20 text-lg font-normal"> AI</span>
</div>
<p className="text-white/30 text-sm">{mode === “login” ? “Content de te revoir 👋” : “Rejoins-nous, c’est gratuit ✨”}</p>
</div>
<div className="bg-white/[0.04] border border-white/10 rounded-3xl p-8 backdrop-blur-sm">
<div className="flex bg-white/5 rounded-2xl p-1 mb-8">
{[“login”, “signup”].map(m => (
<button key={m} onClick={() => { setMode(m); setError(””); setSuccess(””); }}
className=“flex-1 py-2 rounded-xl text-sm font-semibold transition-all duration-200”
style={{
background: mode === m ? “linear-gradient(135deg, #c084fc40, #7c3aed40)” : “transparent”,
color: mode === m ? “#c084fc” : “rgba(255,255,255,0.3)”,
border: mode === m ? “1px solid #c084fc30” : “1px solid transparent”,
}}>
{m === “login” ? “Connexion” : “Inscription”}
</button>
))}
</div>
<div className="space-y-4 mb-6">
<div>
<label className="text-xs text-white/40 mb-1.5 block">Email</label>
<input type=“email” value={email} onChange={e => setEmail(e.target.value)}
onKeyDown={e => e.key === “Enter” && handleSubmit()} placeholder=“ton@email.com”
className=“w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-purple-400/50 transition-colors” />
</div>
<div>
<label className="text-xs text-white/40 mb-1.5 block">Mot de passe</label>
<input type=“password” value={password} onChange={e => setPassword(e.target.value)}
onKeyDown={e => e.key === “Enter” && handleSubmit()} placeholder=”••••••••”
className=“w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-purple-400/50 transition-colors” />
</div>
</div>
{error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-xs mb-4">{error}</div>}
{success && <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-emerald-400 text-xs mb-4">{success}</div>}
<button onClick={handleSubmit} disabled={loading}
className=“w-full py-3.5 rounded-xl font-semibold text-sm text-white transition-all”
style={{ background: loading ? “rgba(192,132,252,0.3)” : “linear-gradient(135deg, #c084fc, #7c3aed)” }}>
{loading ? “…” : mode === “login” ? “Se connecter” : “Créer mon compte”}
</button>
<button onClick={() => onAuth({ token: “demo”, email: “demo@soulmate.ai” })}
className=“w-full mt-3 py-2.5 text-xs text-white/30 hover:text-white/50 transition-colors”>
Continuer sans compte (démo)
</button>
</div>
</div>
</div>
);
}

// ============================================================
// PRICING MODAL
// ============================================================
function PricingModal({ onClose, userEmail, onUpgrade }) {
const [loadingPlan, setLoadingPlan] = useState(null);

const handleSelect = async (plan) => {
if (plan.id === “free”) { onClose(); return; }
if (!plan.priceId || plan.priceId.includes(“ICI”)) {
alert(“Configure d’abord tes Price IDs Stripe dans le code (STRIPE_PRICES).”);
return;
}
setLoadingPlan(plan.id);
try { await startCheckout(plan.priceId, userEmail); }
catch { alert(“Erreur Stripe. Vérifie ta clé et tes Price IDs.”); }
finally { setLoadingPlan(null); }
};

return (
<div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
onClick={onClose}>
<div className=“bg-[#0f0f1a] border border-white/10 rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto”
onClick={e => e.stopPropagation()}>
<div className="text-center mb-8">
<h2 className="text-2xl font-bold text-white mb-2">Passe à la vitesse supérieure</h2>
<p className="text-white/40 text-sm">Débloque tous les compagnons et les messages illimités</p>
</div>
<div className="grid md:grid-cols-3 gap-4 mb-6">
{PLANS.map(plan => (
<div key={plan.id}
className=“rounded-2xl p-5 border transition-all”
style={{
borderColor: plan.highlight ? `${plan.color}50` : “rgba(255,255,255,0.08)”,
background: plan.highlight ? `${plan.color}10` : “rgba(255,255,255,0.03)”,
}}>
{plan.highlight && (
<div className=“text-xs font-bold mb-3 uppercase tracking-wider” style={{ color: plan.color }}>
⭐ Populaire
</div>
)}
<div className="font-bold text-white text-lg mb-1">{plan.name}</div>
<div className=“text-2xl font-bold mb-1” style={{ color: plan.highlight ? plan.color : “white” }}>
{plan.price}<span className="text-sm font-normal text-white/40">{plan.period}</span>
</div>
<ul className="space-y-2 my-5">
{plan.features.map(f => (
<li key={f} className="text-sm text-white/50 flex gap-2">
<span style={{ color: plan.color }}>✓</span> {f}
</li>
))}
</ul>
<button
onClick={() => handleSelect(plan)}
disabled={loadingPlan === plan.id}
className=“w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all”
style={{
background: plan.id === “free”
? “rgba(255,255,255,0.08)”
: `linear-gradient(135deg, ${plan.color}, ${plan.color}99)`,
opacity: loadingPlan === plan.id ? 0.6 : 1,
}}>
{loadingPlan === plan.id ? “Chargement…” : plan.id === “free” ? “Plan actuel” : `Choisir ${plan.name}`}
</button>
</div>
))}
</div>
<div className="text-center text-white/20 text-xs">
Paiement sécurisé par Stripe · Annulation à tout moment
</div>
<button onClick={onClose} className="w-full mt-4 text-white/30 text-sm hover:text-white/50 transition-colors">
Fermer
</button>
</div>
</div>
);
}

// ============================================================
// TYPING + MESSAGE
// ============================================================
function TypingIndicator({ color }) {
return (
<div className="flex gap-1 items-center px-4 py-3">
{[0,1,2].map(i => (
<div key={i} className=“w-2 h-2 rounded-full animate-bounce”
style={{ backgroundColor: color, animationDelay: `${i*0.15}s`, animationDuration: “0.8s” }} />
))}
</div>
);
}

function Message({ msg, companion }) {
const isUser = msg.role === “user”;
return (
<div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"} mb-4`}>
{!isUser && (
<div className=“w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 mt-1”
style={{ background: `linear-gradient(135deg, ${companion.color}, ${companion.accent})` }}>
{companion.avatar}
</div>
)}
<div className=“max-w-[75%] px-4 py-3 text-sm leading-relaxed text-white/90”
style={{
background: isUser ? `linear-gradient(135deg, ${companion.color}cc, ${companion.accent}cc)` : “rgba(255,255,255,0.08)”,
borderRadius: isUser ? “18px 18px 4px 18px” : “18px 18px 18px 4px”,
border: isUser ? “none” : “1px solid rgba(255,255,255,0.1)”,
}}>
{msg.content}
</div>
</div>
);
}

// ============================================================
// CHAT VIEW
// ============================================================
function ChatView({ companion, user, userPlan, onBack, onUpgrade }) {
const [messages, setMessages] = useState([
{ role: “assistant”, content: `Bonjour ${user.email.split("@")[0]} 💫 Je suis ${companion.name}. Comment tu vas aujourd'hui ?` },
]);
const [input, setInput] = useState(””);
const [loading, setLoading] = useState(false);
const [msgCount, setMsgCount] = useState(getMsgCount());
const bottomRef = useRef(null);

useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: “smooth” }); }, [messages, loading]);

const isLimited = userPlan === “free” && msgCount >= FREE_MSG_LIMIT;

const send = async () => {
const text = input.trim();
if (!text || loading) return;
if (isLimited) { onUpgrade(); return; }

```
setInput("");
incMsgCount();
setMsgCount(getMsgCount());

const newMessages = [...messages, { role: "user", content: text }];
setMessages(newMessages);
setLoading(true);
try {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: companion.personality,
      messages: newMessages.map(m => ({ role: m.role, content: m.content })),
    }),
  });
  const data = await res.json();
  setMessages(prev => [...prev, { role: "assistant", content: data.content?.[0]?.text || "..." }]);
} catch {
  setMessages(prev => [...prev, { role: "assistant", content: "Petit souci de connexion, réessaie ?" }]);
} finally { setLoading(false); }
```

};

return (
<div className={`min-h-screen bg-gradient-to-br ${companion.bg} flex flex-col`} style={{ fontFamily: “‘DM Sans’, sans-serif” }}>
<div className="flex items-center gap-3 px-4 py-4 border-b border-white/10 bg-black/20 backdrop-blur-sm">
<button onClick={onBack} className="text-white/60 hover:text-white transition-colors text-lg">←</button>
<div className=“w-10 h-10 rounded-full flex items-center justify-center text-white font-bold”
style={{ background: `linear-gradient(135deg, ${companion.color}, ${companion.accent})` }}>
{companion.avatar}
</div>
<div className="flex-1">
<div className="text-white font-semibold">{companion.name} {companion.emoji}</div>
<div className=“text-xs” style={{ color: companion.color }}>● En ligne</div>
</div>
{userPlan === “free” && (
<div className="text-xs text-white/30">{FREE_MSG_LIMIT - msgCount} msg restants</div>
)}
</div>

```
  <div className="flex-1 overflow-y-auto px-4 py-6">
    {messages.map((msg, i) => <Message key={i} msg={msg} companion={companion} />)}
    {loading && (
      <div className="flex gap-3">
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
          style={{ background: `linear-gradient(135deg, ${companion.color}, ${companion.accent})` }}>
          {companion.avatar}
        </div>
        <div className="bg-white/8 border border-white/10 rounded-2xl rounded-tl-sm">
          <TypingIndicator color={companion.color} />
        </div>
      </div>
    )}
    <div ref={bottomRef} />
  </div>

  {/* Limite atteinte */}
  {isLimited && (
    <div className="mx-4 mb-3 bg-purple-500/15 border border-purple-500/30 rounded-2xl p-4 text-center">
      <p className="text-white/80 text-sm mb-3">🔒 Limite quotidienne atteinte. Passe à Plus pour continuer.</p>
      <button onClick={onUpgrade}
        className="px-6 py-2 rounded-xl text-sm font-semibold text-white"
        style={{ background: "linear-gradient(135deg, #c084fc, #7c3aed)" }}>
        Passer à Plus — 9.99€/mois
      </button>
    </div>
  )}

  <div className="px-4 py-4 border-t border-white/10 bg-black/20">
    <div className="flex gap-3 items-end">
      <textarea value={input} onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
        placeholder={isLimited ? "Limite atteinte — passe à Plus ✨" : `Message ${companion.name}...`}
        disabled={isLimited} rows={1}
        className="flex-1 bg-white/10 border border-white/15 rounded-2xl px-4 py-3 text-white placeholder-white/30 text-sm resize-none focus:outline-none focus:border-white/30 transition-colors disabled:opacity-40"
        style={{ minHeight: "44px", maxHeight: "120px" }} />
      <button onClick={send} disabled={!input.trim() || loading || isLimited}
        className="w-11 h-11 rounded-full flex items-center justify-center transition-all flex-shrink-0"
        style={{ background: input.trim() && !loading && !isLimited ? `linear-gradient(135deg, ${companion.color}, ${companion.accent})` : "rgba(255,255,255,0.1)" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M22 2L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  </div>
</div>
```

);
}

// ============================================================
// HOME
// ============================================================
function HomePage({ user, userPlan, onSelect, onLogout, onUpgrade }) {
const planLabel = { free: “Gratuit”, plus: “Plus ⭐”, pro: “Pro 🔥” };

return (
<div className=“min-h-screen bg-[#080810] text-white” style={{ fontFamily: “‘DM Sans’, sans-serif” }}>
<div className="fixed inset-0 pointer-events-none">
<div className=“absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] opacity-10 blur-[100px]”
style={{ background: “radial-gradient(ellipse, #c084fc, transparent)” }} />
</div>

```
  <nav className="flex items-center justify-between px-6 py-5 border-b border-white/5 relative">
    <div className="text-xl font-bold">
      <span className="text-white">soul</span><span style={{ color: "#c084fc" }}>mate</span>
      <span className="text-white/20 text-sm font-normal ml-1">AI</span>
    </div>
    <div className="flex items-center gap-3">
      <span className="text-xs px-3 py-1 rounded-full border"
        style={{ color: "#c084fc", borderColor: "#c084fc40", background: "#c084fc10" }}>
        {planLabel[userPlan]}
      </span>
      {userPlan === "free" && (
        <button onClick={onUpgrade}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white"
          style={{ background: "linear-gradient(135deg, #c084fc, #7c3aed)" }}>
          Passer à Plus
        </button>
      )}
      <button onClick={onLogout} className="text-xs text-white/30 hover:text-white/60 transition-colors bg-white/5 px-3 py-1.5 rounded-lg">
        Déco
      </button>
    </div>
  </nav>

  <main className="px-6 pt-14 pb-12 text-center relative">
    <h1 className="text-4xl font-bold mb-3 tracking-tight">
      Bonjour, <span style={{ color: "#c084fc" }}>{user.email.split("@")[0]}</span> 👋
    </h1>
    <p className="text-white/40 mb-10">Avec qui veux-tu parler aujourd'hui ?</p>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
      {COMPANIONS.map(c => {
        const locked = c.plan === "plus" && userPlan === "free";
        return (
          <button key={c.id}
            onClick={() => locked ? onUpgrade() : onSelect(c)}
            className="group relative bg-white/[0.04] border border-white/10 rounded-2xl p-6 text-left transition-all duration-300 hover:scale-[1.02]"
            style={{ borderColor: locked ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.1)", opacity: locked ? 0.7 : 1 }}>
            {locked && (
              <div className="absolute top-3 right-3 text-xs px-2 py-0.5 rounded-full"
                style={{ background: "#c084fc20", color: "#c084fc", border: "1px solid #c084fc30" }}>
                Plus
              </div>
            )}
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold text-white mb-4"
              style={{ background: `linear-gradient(135deg, ${c.color}30, ${c.accent}30)`, border: `1px solid ${c.color}30` }}>
              {locked ? "🔒" : c.emoji}
            </div>
            <div className="font-bold text-white text-lg mb-1">{c.name}</div>
            <div className="text-xs text-white/40">{c.tagline}</div>
          </button>
        );
      })}
    </div>

    {userPlan === "free" && (
      <div className="mt-10 inline-flex items-center gap-3 bg-white/[0.04] border border-white/10 rounded-2xl px-6 py-4">
        <span className="text-white/50 text-sm">
          {FREE_MSG_LIMIT - getMsgCount()} messages gratuits restants aujourd'hui
        </span>
        <button onClick={onUpgrade}
          className="text-xs font-semibold px-4 py-2 rounded-xl text-white"
          style={{ background: "linear-gradient(135deg, #c084fc, #7c3aed)" }}>
          Passer à illimité
        </button>
      </div>
    )}
  </main>
</div>
```

);
}

// ============================================================
// APP ROOT
// ============================================================
export default function App() {
const [user, setUser] = useState(null);
const [companion, setCompanion] = useState(null);
const [checking, setChecking] = useState(true);
const [showPricing, setShowPricing] = useState(false);
const [userPlan, setUserPlan] = useState(getUserPlan());

useEffect(() => {
// Détecte retour après paiement Stripe
const params = new URLSearchParams(window.location.search);
if (params.get(“payment”) === “success”) {
localStorage.setItem(“user_plan”, “plus”);
setUserPlan(“plus”);
window.history.replaceState({}, “”, window.location.pathname);
}

```
const token = localStorage.getItem("sb_token");
const email = localStorage.getItem("sb_email");
if (token && email) {
  if (token === "demo") { setUser({ token, email }); setChecking(false); return; }
  supabase.getUser(token)
    .then(data => {
      if (data.email) setUser({ token, email: data.email });
      else { localStorage.removeItem("sb_token"); localStorage.removeItem("sb_email"); }
    })
    .catch(() => {})
    .finally(() => setChecking(false));
  return;
}
setChecking(false);
```

}, []);

const handleLogout = async () => {
if (user?.token && user.token !== “demo”) await supabase.signOut(user.token);
localStorage.removeItem(“sb_token”);
localStorage.removeItem(“sb_email”);
setUser(null); setCompanion(null);
};

if (checking) {
return (
<div className="min-h-screen bg-[#080810] flex items-center justify-center">
<div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
</div>
);
}

return (
<>
{!user && <AuthScreen onAuth={u => { setUser(u); setChecking(false); }} />}
{user && companion && (
<ChatView companion={companion} user={user} userPlan={userPlan}
onBack={() => setCompanion(null)} onUpgrade={() => setShowPricing(true)} />
)}
{user && !companion && (
<HomePage user={user} userPlan={userPlan} onSelect={setCompanion}
onLogout={handleLogout} onUpgrade={() => setShowPricing(true)} />
)}
{showPricing && (
<PricingModal userEmail={user?.email} onClose={() => setShowPricing(false)}
onUpgrade={() => { localStorage.setItem(“user_plan”, “plus”); setUserPlan(“plus”); setShowPricing(false); }} />
)}
</>
);
}
