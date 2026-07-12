import { FormEvent, useRef, useState } from "react";
import { ArrowRight, Clock3, Coffee, LogIn, MapPin, Navigation, Sparkles, UserPlus, X } from "lucide-react";
import { BrandMark } from "./BrandMark";

export type AuthMode = "login" | "register";

export type AuthSubmitPayload = {
  email: string;
  name?: string;
  password: string;
};

type Props = {
  error?: string | null;
  loading: boolean;
  mode: AuthMode;
  open: boolean;
  onClose: () => void;
  onModeChange: (mode: AuthMode) => void;
  onSubmit: (mode: AuthMode, payload: AuthSubmitPayload) => void;
};

type AuthFormProps = {
  error?: string | null;
  loading: boolean;
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  onSubmit: (mode: AuthMode, payload: AuthSubmitPayload) => void;
};

function AuthForm({ error, loading, mode, onModeChange, onSubmit }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  const isRegister = mode === "register";
  const title = isRegister ? "アカウント作成" : "ログイン";

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(mode, {
      email,
      name: isRegister ? name.trim() : undefined,
      password
    });
  };

  return (
    <>
      <div className="auth-tabs" role="tablist" aria-label="認証方法">
        <button
          className="auth-tab"
          data-active={mode === "login"}
          onClick={() => onModeChange("login")}
          role="tab"
          type="button"
        >
          <LogIn size={17} />
          ログイン
        </button>
        <button
          className="auth-tab"
          data-active={mode === "register"}
          onClick={() => onModeChange("register")}
          role="tab"
          type="button"
        >
          <UserPlus size={17} />
          新規登録
        </button>
      </div>

      <form className="form auth-form" onSubmit={handleSubmit}>
        {isRegister ? (
          <label className="field">
            <span>表示名</span>
            <input
              autoComplete="name"
              className="input-like"
              onChange={(event) => setName(event.target.value)}
              required
              value={name}
            />
          </label>
        ) : null}
        <label className="field">
          <span>メールアドレス</span>
          <input
            autoComplete="email"
            className="input-like"
            inputMode="email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>
        <label className="field">
          <span>パスワード</span>
          <input
            autoComplete={isRegister ? "new-password" : "current-password"}
            className="input-like"
            minLength={isRegister ? 8 : 1}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>

        {error ? <p className="inline-alert">{error}</p> : null}

        <button className="primary-action submit" disabled={loading} type="submit">
          {loading ? "送信中" : title}
        </button>
      </form>
    </>
  );
}

export function AuthDialog({ error, loading, mode, open, onClose, onModeChange, onSubmit }: Props) {
  if (!open) {
    return null;
  }

  const title = mode === "register" ? "アカウント作成" : "ログイン";

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="auth-dialog" aria-label={title} aria-modal="true" role="dialog">
        <div className="auth-dialog-head">
          <div>
            <div className="panel-label">Yorimo Account</div>
            <h2>{title}</h2>
            <p>ルート、保存スポット、推薦条件をアカウントに同期します。</p>
          </div>
          <button className="icon-button" onClick={onClose} type="button" aria-label="認証画面を閉じる">
            <X size={19} />
          </button>
        </div>

        <AuthForm error={error} loading={loading} mode={mode} onModeChange={onModeChange} onSubmit={onSubmit} />
      </section>
    </div>
  );
}

export function AuthGate({
  error,
  loading,
  mode,
  onModeChange,
  onSubmit,
  statusMessage
}: Omit<AuthFormProps, "error"> & { error?: string | null; statusMessage?: string | null }) {
  const authCardRef = useRef<HTMLElement>(null);

  const showAuthForm = (nextMode: AuthMode) => {
    onModeChange(nextMode);
    window.requestAnimationFrame(() => {
      const card = authCardRef.current;
      if (card && typeof card.scrollIntoView === "function") {
        card.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  };

  return (
    <main className="auth-gate landing-gate" data-testid="auth-gate">
      <div className="landing-atmosphere" aria-hidden="true">
        <span className="landing-orb landing-orb-a" />
        <span className="landing-orb landing-orb-b" />
        <span className="landing-orb landing-orb-c" />
      </div>

      <header className="landing-header">
        <div className="desktop-brand landing-brand">
          <BrandMark />
          <div>
            <strong>Yorimo</strong>
            <span className="brand-subtitle">日常ルートの寄り道マップ</span>
          </div>
        </div>
        <nav className="landing-nav" aria-label="Yorimoの特徴">
          <span>ルートに沿って</span>
          <span>今の気分で</span>
          <span>無理なく寄れる</span>
        </nav>
        <div className="landing-header-actions">
          <button aria-label="ログインフォームを表示" onClick={() => showAuthForm("login")} type="button">ログイン</button>
          <button className="landing-header-primary" onClick={() => showAuthForm("register")} type="button">
            無料ではじめる
          </button>
        </div>
      </header>

      <section className="auth-hero" aria-label="Yorimo">
        <div className="auth-copy">
          <p className="landing-brand-signal">Yorimo</p>
          <h1>
            <span>帰り道に、</span>
            <em>ちょうどいい発見</em>
            <span>を。</span>
          </h1>
          <p>現在地やいつものルート、今の気分をもとに、無理なく立ち寄れる場所を見つけます。</p>
          <div className="landing-hero-actions">
            <button className="landing-main-action" onClick={() => showAuthForm("register")} type="button">
              寄り道を見つける <ArrowRight size={18} />
            </button>
            <span>登録無料・すぐに使えます</span>
          </div>
        </div>

        <div className="auth-preview" aria-hidden="true">
          <div className="landing-preview-glow" />
          <div className="landing-map-label">
            <Navigation size={14} /> 東京駅 → 自宅
          </div>
          <svg className="landing-route-svg" viewBox="0 0 360 400" preserveAspectRatio="none">
            <path
              className="landing-route-path"
              d="M68 290 C 90 210, 140 250, 168 168 C 196 96, 250 128, 292 72"
              fill="none"
              pathLength="1"
            />
            <circle className="landing-route-pulse" cx="168" cy="168" r="18" />
          </svg>
          <span className="auth-pin one">
            <MapPin size={16} />
          </span>
          <span className="auth-pin two">
            <Coffee size={16} />
          </span>
          <span className="auth-pin three">
            <MapPin size={16} />
          </span>
          <div className="landing-detour-badge">
            帰り道から <strong>+6分</strong>
          </div>
          <article className="landing-spot-card">
            <div className="landing-spot-icon">
              <Coffee size={20} />
            </div>
            <div>
              <span>今日のおすすめ</span>
              <strong>路地裏の小さな喫茶店</strong>
              <small>
                <Clock3 size={13} /> 徒歩8分 ・ 予算 ¥1,200
              </small>
            </div>
          </article>
        </div>

        <ul className="landing-benefits" aria-label="Yorimoでできること">
          <li>
            <Navigation size={18} strokeWidth={2.2} />
            <span>
              <strong>ルート基準</strong>
              帰り道から探せる
            </span>
          </li>
          <li>
            <Clock3 size={18} strokeWidth={2.2} />
            <span>
              <strong>時間に合わせる</strong>
              15分から調整
            </span>
          </li>
          <li>
            <Sparkles size={18} strokeWidth={2.2} />
            <span>
              <strong>気分で選ぶ</strong>
              好みに寄り添う
            </span>
          </li>
        </ul>
      </section>

      <section
        className="auth-card landing-auth-card"
        ref={authCardRef}
        aria-label={mode === "register" ? "アカウント作成" : "ログイン"}
      >
        <div className="auth-card-head">
          <div>
            <div className="panel-label">Welcome to Yorimo</div>
            <h2>{mode === "register" ? "アカウント作成" : "ログイン"}</h2>
          </div>
          <p>
            {mode === "register"
              ? "無料アカウントを作って、あなただけの寄り道を見つけましょう。"
              : "続きから、あなたに合う寄り道を探しましょう。"}
          </p>
        </div>
        {statusMessage ? <p className="inline-alert">{statusMessage}</p> : null}
        <AuthForm error={error} loading={loading} mode={mode} onModeChange={onModeChange} onSubmit={onSubmit} />
      </section>
    </main>
  );
}
