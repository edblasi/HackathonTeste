import { useState, useEffect, useRef } from "react"; 
import { useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  ArrowRight,
  Shield,
  Activity,
  User,
  MapPin,
  Building2,
  Package,
  BadgeCheck,
  Lock,
  Mail,
  CreditCard,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../i18n/LanguageContext";
import { TopNav } from "../components/User/TopNav";
import { LanguageToggle } from "../components/LanguageToggle";
import { Stepper } from "../components/Stepper";
import { usePacientePerfil, usePedidos, type UsuarioSistema } from "../hooks/FetchData";
import { apiGet } from "../lib/api";

// ─── Carousel data (left panel imagery) ────────────────────────────────────

const slidePhotos = [
  "https://images.unsplash.com/photo-1706777163227-0f0eade9e932?w=900&h=1200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1597764690523-15bea4c581c9?w=900&h=1200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1748407407936-2aeffd8428dd?w=900&h=1200&fit=crop&auto=format",
];

// ─── Login page (step 1) ────────────────────────────────────────────────────

function LoginStep({ onLoggedIn }: { onLoggedIn: () => Promise<void> }) {
  const { t } = useLang();
  const { signIn } = useAuth();
  const [slide, setSlide] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [slideDir, setSlideDir] = useState<1 | -1>(1);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const slides = [
    { photo: slidePhotos[0], tag: t("auth.login.slide1.tag"), headline: t("auth.login.slide1.headline"), sub: t("auth.login.slide1.sub") },
    { photo: slidePhotos[1], tag: t("auth.login.slide2.tag"), headline: t("auth.login.slide2.headline"), sub: t("auth.login.slide2.sub") },
    { photo: slidePhotos[2], tag: t("auth.login.slide3.tag"), headline: t("auth.login.slide3.headline"), sub: t("auth.login.slide3.sub") },
  ];

  const handleLogin = async () => {
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
      await onLoggedIn();
    } catch {
      setError(t("auth.login.error"));
    } finally {
      setLoading(false);
    }
  };

  const goToSlide = (next: number, dir: 1 | -1) => {
    if (transitioning) return;
    setSlideDir(dir);
    setTransitioning(true);
    setTimeout(() => {
      setSlide(next);
      setTransitioning(false);
    }, 420);
  };

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      goToSlide((slide + 1) % slides.length, 1);
    }, 4500);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slide, transitioning]);

  const current = slides[slide];

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row" style={{ fontFamily: "Inter, sans-serif" }}>
      {/* ── Left: Carousel panel ──────────────────────────────────────────── */}
      <div className="relative lg:w-[44%] min-h-[300px] lg:min-h-screen overflow-hidden bg-[#061626]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${current.photo})`,
            opacity: transitioning ? 0 : 0.28,
            transform: transitioning ? `scale(1.05) translateX(${slideDir * 2}%)` : "scale(1) translateX(0)",
            transition: "opacity 0.5s ease, transform 0.65s ease",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#061626] via-[#0A2845]/75 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#061626] via-transparent to-transparent" />
        <div className="absolute top-1/3 right-[-60px] w-96 h-96 rounded-full bg-cyan-500/8 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col h-full min-h-[300px] lg:min-h-screen p-8 lg:p-12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/8 border border-white/15 flex items-center justify-center">
              <Shield size={18} className="text-cyan-300" />
            </div>
            <div>
              <div className="text-white font-bold text-base tracking-tight leading-none" style={{ fontFamily: "Inter, sans-serif" }}>
                UMDR
              </div>
              <div className="text-cyan-300/60 text-[9px] uppercase tracking-widest leading-none mt-0.5">
                {t("shell.topnav.brandFull")}
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-end pb-6 lg:pb-0">
            <div
              style={{
                opacity: transitioning ? 0 : 1,
                transform: transitioning ? `translateY(${slideDir * 14}px)` : "translateY(0)",
                transition: "opacity 0.42s ease, transform 0.5s ease",
              }}
            >
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-400/12 border border-cyan-400/22 mb-6">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-cyan-300 text-[10px] font-semibold tracking-widest uppercase">{current.tag}</span>
              </div>

              <h1
                className="text-3xl lg:text-4xl xl:text-[2.6rem] text-white leading-[1.1] mb-4 whitespace-pre-line"
                style={{ fontFamily: "Instrument Serif, serif", fontWeight: 400 }}
              >
                {current.headline}
              </h1>

              <p className="text-white/50 text-sm leading-relaxed max-w-xs mb-10">{current.sub}</p>
            </div>

            <div className="flex items-center gap-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goToSlide(i, i > slide ? 1 : -1)}
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    i === slide ? "w-8 bg-cyan-400" : "w-2 bg-white/18 hover:bg-white/35"
                  }`}
                  aria-label={t("auth.login.slideAria", { number: i + 1 })}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Right: Form panel ─────────────────────────────────────────────── */}
      <div className="relative flex-1 flex flex-col items-center justify-center bg-white px-6 py-16 lg:py-0">
        <div className="absolute right-5 top-5 z-30 lg:right-8 lg:top-7">
          <LanguageToggle />
        </div>
        <div className="w-full max-w-[400px]">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shadow-sm shadow-primary/20">
                  <Shield size={13} className="text-white" />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {t("shell.topnav.brandFull")}
                </span>
              </div>
            </div>
            <h2
              className="text-[2.1rem] text-foreground mb-2 leading-tight"
              style={{ fontFamily: "Instrument Serif, serif", fontWeight: 400 }}
            >
              {t("auth.login.portalTitle")}
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">{t("auth.login.portalSubtitle")}</p>
          </div>

          <div className="flex flex-col gap-3.5 mb-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {t("auth.login.emailLabel")}
              </label>
              <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-border bg-input-background focus-within:border-primary/40 focus-within:shadow-[0_0_0_3px_rgba(11,83,148,0.08)] transition-all duration-200">
                <Mail size={14} className="text-muted-foreground shrink-0" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("auth.login.emailPlaceholder")}
                  autoComplete="email"
                  className="flex-1 bg-transparent text-sm text-foreground outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {t("auth.login.passwordLabel")}
              </label>
              <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-border bg-input-background focus-within:border-primary/40 focus-within:shadow-[0_0_0_3px_rgba(11,83,148,0.08)] transition-all duration-200">
                <Lock size={14} className="text-muted-foreground shrink-0" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  autoComplete="current-password"
                  className="flex-1 bg-transparent text-sm text-foreground outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <p className="text-xs text-destructive mb-3" role="alert">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-3.5 px-6 rounded-xl bg-[#0B5394] text-white font-semibold text-sm tracking-wide flex items-center justify-center gap-2 hover:bg-[#0A4880] hover:shadow-lg active:scale-[0.99] transition-all duration-200 mb-5 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ backgroundColor: loading ? "#5F86AD" : "#0B5394", color: "#FFFFFF" }}
          >
            {loading ? t("auth.login.submitting") : t("auth.login.submit")}
            {!loading && <ArrowRight size={15} />}
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[11px] text-muted-foreground">{t("auth.login.orSignInWith")}</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Social buttons (decorativos — sem OAuth configurado ainda) */}
          <div className="flex gap-2.5 mb-6">
            <button className="flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl border border-border bg-white hover:bg-muted/50 hover:border-primary/20 active:scale-[0.98] transition-all duration-200 text-sm font-medium text-foreground">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
              </svg>
              Google
            </button>

            <button className="flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl border border-border bg-white hover:bg-muted/50 hover:border-primary/20 active:scale-[0.98] transition-all duration-200 text-sm font-medium text-foreground">
              <svg width="13" height="15" viewBox="0 0 18 18" fill="currentColor">
                <path d="M13.004 0c.064.862-.243 1.71-.752 2.343-.526.663-1.369 1.175-2.197 1.108-.086-.837.256-1.697.742-2.28C11.32.519 12.19.05 13.004 0zM15.75 12.1c-.32.93-.711 1.794-1.266 2.578-.822 1.163-1.672 2.317-2.984 2.33-1.28.013-1.694-.777-3.158-.777-1.463 0-1.922.754-3.137.79-1.278.04-2.252-1.242-3.08-2.4C.56 12.336-.338 9.09.773 6.95c.546-1.048 1.523-1.71 2.581-1.726 1.247-.019 2.43.847 3.195.847.763 0 2.2-.832 3.703-.71.63.026 2.404.255 3.543 1.921-.092.057-2.114 1.236-2.09 3.682.028 2.921 2.565 3.895 2.595 3.907a8.3 8.3 0 0 1-.55 1.229z" />
              </svg>
              Apple
            </button>

            <button className="flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl border border-border bg-white hover:bg-muted/50 hover:border-primary/20 active:scale-[0.98] transition-all duration-200 text-sm font-medium text-foreground">
              <span className="inline-flex items-baseline gap-px px-1.5 py-0.5 rounded bg-[#1351B4] text-[9px] font-bold leading-none">
                <span className="text-white">gov</span>
                <span className="text-[#FFCD07]">.br</span>
              </span>
              gov.br
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-5">
            {[
              { icon: <Shield size={10} />, label: t("auth.login.badge.lgpd") },
              { icon: <Activity size={10} />, label: t("auth.login.badge.tracking") },
              { icon: <BadgeCheck size={10} />, label: t("auth.login.badge.deviceId") },
            ].map(({ icon, label }) => (
              <div key={label} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted border border-border text-[11px] text-muted-foreground">
                {icon}
                {label}
              </div>
            ))}
          </div>

          <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
            {t("auth.login.securityNote1")}
            <br />
            {t("auth.login.securityNote2")}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Verify page (step 2) ───────────────────────────────────────────────────
// Confirma a identidade com o dado real do paciente (fila.vw_paciente_perfil
// + fila.vw_pedido_atual), no lugar do mock "Ana Luísa Ferreira" que estava
// hardcoded aqui antes.

function VerifyStep({ onContinue, onBack }: { onContinue: () => void; onBack: () => void }) {
  const { t, locale } = useLang();
  const { data: perfil, loading: loadingPerfil } = usePacientePerfil();
  const { data: pedidos, loading: loadingPedidos } = usePedidos();
  const pedidoAtual = pedidos?.[0] ?? null;

  const loading = loadingPerfil || loadingPedidos;

  const infoCards = perfil
    ? [
        { icon: CreditCard, label: t("auth.verify.patientId"), value: `PAT-${String(perfil.paciente_id).padStart(6, "0")}`, highlight: false },
        { icon: CreditCard, label: t("auth.verify.susCard"), value: perfil.cns, highlight: true },
        {
          icon: MapPin,
          label: t("auth.verify.location"),
          value: perfil.nome_municipio ? `${perfil.nome_municipio}, ${perfil.uf_sigla}` : "—",
          highlight: false,
        },
        { icon: Building2, label: t("auth.verify.referralUnit"), value: perfil.unidade_encaminhamento ?? "—", highlight: false },
        { icon: Building2, label: t("auth.verify.rehabCenter"), value: perfil.centro_reabilitacao ?? t("home.pedido.workshopPending"), highlight: false },
        {
          icon: Package,
          label: t("auth.verify.currentRequest"),
          value: pedidoAtual?.nome_procedimento ?? t("home.pedido.noPedido"),
          highlight: true,
        },
      ]
    : [];

  const maskedCpf = perfil?.cpf ? `***.${perfil.cpf.slice(3, 6)}.${perfil.cpf.slice(6, 9)}-**` : "—";
  const firstName = perfil?.nome_completo?.split(" ")[0] ?? "";

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "Inter, sans-serif" }}>
      <TopNav
        onBack={onBack}
        rightSlot={
          <>
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-muted-foreground hidden sm:block">
              {t("shell.topnav.secureSession")}
              {perfil ? ` · ${perfil.nome_completo}` : ""}
            </span>
          </>
        }
      />

      <div className="max-w-xl mx-auto px-6 pt-6">
        <Stepper steps={[t("auth.stepper.login"), t("auth.stepper.verify")]} currentStep={1} />
      </div>

      <main className="max-w-xl mx-auto px-6 py-10">
        <div className="mb-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/8 border border-primary/15 flex items-center justify-center">
              <User size={22} className="text-primary" />
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">
                {t("auth.verify.authenticatedPatient")}
              </div>
              <h1
                className="text-[2rem] text-foreground leading-tight"
                style={{ fontFamily: "Instrument Serif, serif", fontWeight: 400 }}
              >
                {t("auth.verify.welcome")}
                {firstName ? `, ${firstName}` : ""}
              </h1>
            </div>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">{t("auth.verify.confirmInfo")}</p>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">…</div>
        ) : !perfil ? (
          <p className="text-sm text-destructive mb-8">{t("home.pedido.noPedido")}</p>
        ) : (
          <>
            {/* Quick stats bar */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: t("auth.verify.age"), value: `${perfil.idade} ${t("auth.verify.yearsUnit")}` },
                { label: t("auth.verify.cpf"), value: maskedCpf },
                { label: t("auth.verify.phone"), value: perfil.telefone_contato || "—" },
              ].map(({ label, value }) => (
                <div key={label} className="px-3.5 py-3 rounded-xl bg-card border border-border">
                  <div className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">{label}</div>
                  <div className="text-xs font-semibold text-foreground">{value}</div>
                </div>
              ))}
            </div>

            {/* Info cards grid */}
            <div className="grid grid-cols-2 gap-3 mb-8">
              {infoCards.map(({ icon: Icon, label, value, highlight }) => (
                <div
                  key={label}
                  className={`p-4 rounded-2xl border transition-all duration-150 hover:shadow-sm ${
                    highlight ? "bg-primary/5 border-primary/18" : "bg-card border-border"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <Icon size={12} className={highlight ? "text-primary" : "text-muted-foreground"} />
                    <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
                  </div>
                  <div className={`text-sm font-semibold leading-snug ${highlight ? "text-primary" : "text-foreground"}`}>
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <button
          onClick={onContinue}
          disabled={loading || !perfil}
          className="w-full py-4 px-6 rounded-xl bg-primary text-white font-semibold flex items-center justify-center gap-2 hover:bg-[#0A4880] hover:shadow-lg hover:shadow-primary/25 active:scale-[0.99] transition-all duration-200 mb-3 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {t("auth.verify.continue")}
          <ArrowRight size={16} />
        </button>
        <p className="text-center text-[11px] text-muted-foreground leading-relaxed">{t("auth.verify.wrongInfoNote")}</p>
      </main>
    </div>
  );
}

// ─── UserLoginPage ───────────────────────────────────────────────────────────

export function UserLoginPage() {
  const [step, setStep] = useState<"login" | "verify">("login");
  const navigate = useNavigate();

  const handleLoggedIn = async () => {
    const profile = await apiGet<UsuarioSistema>("/api/me");
    if (profile.papel === "GESTOR") {
      navigate("/manager", { replace: true });
      return;
    }
    if (profile.papel === "FISCAL_CRE") {
      navigate("/cre", { replace: true });
      return;
    }
    setStep("verify");
  };

  return (
    <div>
      {step === "login" && <LoginStep onLoggedIn={handleLoggedIn} />}
      {step === "verify" && (
        <VerifyStep onContinue={() => navigate("/", { replace: true })} onBack={() => setStep("login")} />
      )}
    </div>
  );
}
