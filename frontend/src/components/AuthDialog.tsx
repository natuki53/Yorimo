import { FormEvent, useState } from "react";
import { LogIn, UserPlus, X } from "lucide-react";
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
  return (
    <main className="auth-gate" data-testid="auth-gate">
      <section className="auth-hero" aria-label="Yorimo">
        <div className="desktop-brand auth-brand">
          <BrandMark />
          <div>
            <strong>Yorimo</strong>
            <span className="brand-subtitle">日常ルートの寄り道マップ</span>
          </div>
        </div>
        <div className="auth-copy">
          <div className="panel-label">Route-based Recommendation</div>
          <h1>いつもの移動に、ちょうどいい寄り道を。</h1>
          <p>現在地、登録ルート、興味、保存履歴をもとに、帰り道で無理なく寄れる場所を推薦します。</p>
        </div>
        <div className="auth-preview" aria-hidden="true">
          <div className="auth-preview-route" />
          <span className="auth-pin one">91</span>
          <span className="auth-pin two">88</span>
          <span className="auth-pin three">76</span>
        </div>
      </section>

      <section className="auth-card" aria-label={mode === "register" ? "アカウント作成" : "ログイン"}>
        <div className="auth-card-head">
          <div>
            <div className="panel-label">Account Required</div>
            <h2>{mode === "register" ? "アカウント作成" : "ログイン"}</h2>
          </div>
          <p>Yorimoはルートと行動履歴を使うため、ログイン後に利用できます。</p>
        </div>
        {statusMessage ? <p className="inline-alert">{statusMessage}</p> : null}
        <AuthForm error={error} loading={loading} mode={mode} onModeChange={onModeChange} onSubmit={onSubmit} />
      </section>
    </main>
  );
}
