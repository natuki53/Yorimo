import { FormEvent, useState } from "react";
import {
  ArrowRight,
  Clock3,
  LogIn,
  Map,
  MapPin,
  MessageCircle,
  Navigation,
  Route,
  UserPlus,
  X
} from "lucide-react";
import { BrandMark } from "./BrandMark";

export type AuthMode = "login" | "register";

export type AuthSubmitPayload = {
  email: string;
  name?: string;
  password: string;
};

type AuthGateProps = {
  error?: string | null;
  loading: boolean;
  onStart: () => void;
  onSubmit: (mode: AuthMode, payload: AuthSubmitPayload) => void;
  statusMessage?: string | null;
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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(mode, {
      email: email.trim(),
      name: isRegister ? name.trim() : undefined,
      password
    });
  };

  return (
    <>
      <div className="auth-tabs" role="tablist" aria-label="認証方法">
        <button
          aria-selected={mode === "login"}
          className="auth-tab"
          data-active={mode === "login"}
          disabled={loading}
          onClick={() => onModeChange("login")}
          role="tab"
          type="button"
        >
          <LogIn size={17} />
          ログイン
        </button>
        <button
          aria-selected={mode === "register"}
          className="auth-tab"
          data-active={mode === "register"}
          disabled={loading}
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
              disabled={loading}
              maxLength={50}
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
            disabled={loading}
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
            disabled={loading}
            minLength={isRegister ? 8 : 1}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>

        {error ? (
          <p className="inline-alert" role="alert">
            {error}
          </p>
        ) : null}

        <button className="primary-action submit" disabled={loading} type="submit">
          {loading ? "送信中…" : isRegister ? "アカウントを作成" : "ログイン"}
        </button>
      </form>
    </>
  );
}

export function AuthGate({ error, loading, onStart, onSubmit, statusMessage }: AuthGateProps) {
  const [authOpen, setAuthOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>("login");

  const openAuth = (nextMode: AuthMode) => {
    setMode(nextMode);
    setAuthOpen(true);
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
            <span className="brand-subtitle">寄り道マッピングSNS</span>
          </div>
        </div>
        <nav className="landing-nav" aria-label="Yorimoの特徴">
          <span>地図で探す</span>
          <span>ルートに沿って</span>
          <span>口コミで共有</span>
        </nav>
        <div className="landing-header-actions">
          <button disabled={loading} onClick={() => openAuth("login")} type="button">
            ログイン
          </button>
          <button className="landing-header-primary" disabled={loading} onClick={onStart} type="button">
            {loading ? "準備中…" : "デモを始める"}
          </button>
        </div>
      </header>

      <section className="auth-hero" aria-label="Yorimo">
        <div className="auth-copy">
          <p className="landing-brand-signal">Yorimo prototype</p>
          <h1>
            <span>帰り道に、</span>
            <em>ちょうどいい発見</em>
            <span>を。</span>
          </h1>
          <p>
            通学・通勤ルート沿いの寄り道を、地図・時間・気分から見つけ、口コミで共有できるプロトタイプです。
          </p>
          <div className="landing-hero-actions">
            <button className="landing-main-action" disabled={loading} onClick={onStart} type="button">
              {loading ? "デモを準備しています…" : "デモを始める"} <ArrowRight size={18} />
            </button>
            <button className="landing-account-action" disabled={loading} onClick={() => openAuth("login")} type="button">
              アカウントでログイン
            </button>
            <span>デモは登録不要・1クリックで体験</span>
          </div>
          <p className="landing-demo-note">プロトタイプの確認は「デモを始める」をクリック</p>
          {statusMessage ? <p className="inline-alert">{statusMessage}</p> : null}
          {error ? (
            <p className="inline-alert" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="auth-preview" aria-hidden="true">
          <div className="landing-preview-glow" />
          <div className="landing-map-label">
            <Navigation size={14} /> 東京駅 → 新宿駅
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
            <Map size={16} />
          </span>
          <span className="auth-pin three">
            <MapPin size={16} />
          </span>
          <div className="landing-detour-badge">
            帰り道から <strong>+6分</strong>
          </div>
          <article className="landing-feed-chip">
            <MessageCircle size={14} />
            <span>みか</span>
            帰り道に40分だけ読書。
          </article>
          <article className="landing-spot-card">
            <img className="landing-spot-thumb" src="/demo-assets/book-cafe.svg" alt="" />
            <div>
              <span>今日のおすすめ</span>
              <strong>丸の内ブックカフェ</strong>
              <small>
                <Clock3 size={13} /> 徒歩8分 ・ 予算 ¥1,200
              </small>
            </div>
          </article>
        </div>

        <ul className="landing-benefits" aria-label="Yorimoでできること">
          <li>
            <span className="landing-benefit-icon" aria-hidden="true">
              <Route size={18} strokeWidth={2.2} />
            </span>
            <span>
              <strong>ルート沿い</strong>
              駅ルートから探せる
            </span>
          </li>
          <li>
            <span className="landing-benefit-icon" aria-hidden="true">
              <Map size={18} strokeWidth={2.2} />
            </span>
            <span>
              <strong>地図で推薦</strong>
              時間・予算・気分で絞る
            </span>
          </li>
          <li>
            <span className="landing-benefit-icon" aria-hidden="true">
              <MessageCircle size={18} strokeWidth={2.2} />
            </span>
            <span>
              <strong>口コミ共有</strong>
              訪れた場所を残せる
            </span>
          </li>
        </ul>
      </section>

      {authOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section
            aria-label={mode === "register" ? "アカウント作成" : "ログイン"}
            aria-modal="true"
            className="auth-dialog"
            role="dialog"
          >
            <div className="auth-dialog-head">
              <div>
                <div className="panel-label">Yorimo Account</div>
                <h2>{mode === "register" ? "アカウント作成" : "ログイン"}</h2>
                <p>個人アカウントでは、ルートや保存内容を自分のデータとして利用できます。</p>
              </div>
              <button
                aria-label="認証画面を閉じる"
                className="icon-button"
                disabled={loading}
                onClick={() => setAuthOpen(false)}
                type="button"
              >
                <X size={19} />
              </button>
            </div>
            <AuthForm
              error={error}
              loading={loading}
              mode={mode}
              onModeChange={setMode}
              onSubmit={onSubmit}
            />
          </section>
        </div>
      ) : null}
    </main>
  );
}
