import { FormEvent, useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { BrandMark } from "./BrandMark";
import { interestOptions } from "../lib/interestTags";
import type { ProfileUpdatePayload, User } from "../lib/types";

type SetupStep = "details" | "profile";

const setupSteps: { id: SetupStep; label: string }[] = [
  { id: "details", label: "情報" },
  { id: "profile", label: "プロフィール" }
];

const ageRangeOptions = ["10代", "20代", "30代", "40代", "50代", "60代以上"];

type Props = {
  error?: string | null;
  loading: boolean;
  user: User;
  onSubmit: (payload: ProfileUpdatePayload) => void;
};

const toOptionalNumber = (value: string) => {
  if (!value.trim()) {
    return undefined;
  }
  return Number(value);
};

const toOptionalString = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export function AccountSetup({ error, loading, user, onSubmit }: Props) {
  const [ageRange, setAgeRange] = useState(user.ageRange ?? "");
  const [defaultBudgetMax, setDefaultBudgetMax] = useState(String(user.defaultBudgetMax ?? 1500));
  const [defaultBudgetMin, setDefaultBudgetMin] = useState(String(user.defaultBudgetMin ?? 0));
  const [interests, setInterests] = useState<string[]>(
    user.interests.length > 0 ? user.interests : ["甘いもの"]
  );
  const [setupStep, setSetupStep] = useState<SetupStep>("details");

  const currentStepIndex = setupSteps.findIndex((step) => step.id === setupStep);
  const isLastStep = currentStepIndex === setupSteps.length - 1;
  const title = setupStep === "details" ? "アカウント情報登録" : "プロフィール登録";

  const handleInterestToggle = (interest: string) => {
    setInterests((current) =>
      current.includes(interest) ? current.filter((item) => item !== interest) : [...current, interest]
    );
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isLastStep) {
      setSetupStep(setupSteps[currentStepIndex + 1].id);
      return;
    }

    onSubmit({
      ageRange: toOptionalString(ageRange),
      defaultBudgetMax: toOptionalNumber(defaultBudgetMax),
      defaultBudgetMin: toOptionalNumber(defaultBudgetMin),
      interests
    });
  };

  return (
    <main className="auth-gate account-setup-gate" data-testid="account-setup">
      <section className="auth-hero" aria-label="Yorimo">
        <div className="desktop-brand auth-brand">
          <BrandMark />
          <div>
            <strong>Yorimo</strong>
            <span className="brand-subtitle">日常ルートの寄り道マップ</span>
          </div>
        </div>
        <div className="auth-copy">
          <div className="panel-label">Account Setup</div>
          <h1>{user.name}さんの寄り道条件を整えます。</h1>
          <p>年代、興味、予算を登録すると、ログイン後すぐに条件に合う候補を出せます。</p>
        </div>
        <div className="auth-preview" aria-hidden="true">
          <div className="auth-preview-route" />
          <span className="auth-pin one">91</span>
          <span className="auth-pin two">88</span>
          <span className="auth-pin three">76</span>
        </div>
      </section>

      <section className="auth-card" aria-label={title}>
        <div className="auth-card-head">
          <div>
            <div className="panel-label">After Account Creation</div>
            <h2>{title}</h2>
          </div>
          <p>アカウント作成は完了しています。続けて推薦に使う初期情報を登録してください。</p>
        </div>

        <form className="form auth-form" onSubmit={handleSubmit}>
          <div className="auth-progress" aria-label="初期設定ステップ">
            {setupSteps.map((step, index) => (
              <span
                className="auth-progress-step"
                data-active={step.id === setupStep}
                data-complete={index < currentStepIndex}
                key={step.id}
              >
                <span className="auth-progress-index">
                  {index < currentStepIndex ? <Check size={14} /> : index + 1}
                </span>
                <span>{step.label}</span>
              </span>
            ))}
          </div>

          <div className="auth-step-lead">
            <strong>{title}</strong>
            <span>
              {setupStep === "details"
                ? "年代を登録します。"
                : "興味と予算を登録して、推薦条件の初期値にします。"}
            </span>
          </div>

          {setupStep === "details" ? (
            <>
              <label className="field">
                <span>年代</span>
                <select className="input-like" onChange={(event) => setAgeRange(event.target.value)} value={ageRange}>
                  <option value="">未選択</option>
                  {ageRangeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : (
            <>
              <div className="field">
                <span>興味のある寄り道</span>
                <div className="interest-grid">
                  {interestOptions.map((interest) => (
                    <button
                      className="app-chip"
                      data-active={interests.includes(interest)}
                      key={interest}
                      onClick={() => handleInterestToggle(interest)}
                      type="button"
                    >
                      {interest}
                    </button>
                  ))}
                </div>
              </div>
              <label className="field">
                <span>最低予算</span>
                <input
                  className="input-like"
                  inputMode="numeric"
                  min={0}
                  onChange={(event) => setDefaultBudgetMin(event.target.value)}
                  step={100}
                  type="number"
                  value={defaultBudgetMin}
                />
              </label>
              <label className="field">
                <span>最高予算</span>
                <input
                  className="input-like"
                  inputMode="numeric"
                  min={0}
                  onChange={(event) => setDefaultBudgetMax(event.target.value)}
                  required
                  step={100}
                  type="number"
                  value={defaultBudgetMax}
                />
              </label>
            </>
          )}

          {error ? <p className="inline-alert">{error}</p> : null}

          <div className="auth-form-actions">
            {setupStep !== "details" ? (
              <button
                className="secondary-action"
                disabled={loading}
                onClick={() => setSetupStep(setupSteps[currentStepIndex - 1].id)}
                type="button"
              >
                <ArrowLeft size={17} />
                戻る
              </button>
            ) : null}
            <button className="primary-action submit" disabled={loading} type="submit">
              {loading ? "保存中" : setupStep === "details" ? "プロフィール登録へ" : "保存してはじめる"}
              {!isLastStep ? <ArrowRight size={17} /> : null}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
