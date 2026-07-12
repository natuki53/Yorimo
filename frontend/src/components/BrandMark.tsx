import { useId } from "react";

type BrandMarkProps = {
  className?: string;
};

export function BrandMark({ className }: BrandMarkProps) {
  const uid = useId().replace(/:/g, "");
  const bgId = `yorimo-bg-${uid}`;
  const shineId = `yorimo-shine-${uid}`;
  const shadowId = `yorimo-shadow-${uid}`;

  return (
    <span className={["brand-mark", className].filter(Boolean).join(" ")} aria-hidden="true">
      <svg viewBox="0 0 1024 1024" fill="none" focusable="false">
        <defs>
          <linearGradient id={bgId} x1="96" y1="80" x2="928" y2="944" gradientUnits="userSpaceOnUse">
            <stop stopColor="#833AB4" />
            <stop offset="0.42" stopColor="#E1306C" />
            <stop offset="0.76" stopColor="#F77737" />
            <stop offset="1" stopColor="#FCAF45" />
          </linearGradient>
          <linearGradient id={shineId} x1="224" y1="120" x2="760" y2="824" gradientUnits="userSpaceOnUse">
            <stop stopColor="white" stopOpacity="0.7" />
            <stop offset="0.65" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <filter id={shadowId} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="20" stdDeviation="24" floodColor="#0F1419" floodOpacity="0.16" />
          </filter>
        </defs>
        <rect x="64" y="64" width="896" height="896" rx="228" fill={`url(#${bgId})`} />
        <path
          d="M263 643C321 471 425 684 513 513C583 376 703 441 761 326"
          stroke="white"
          strokeWidth="78"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#${shadowId})`}
        />
        <circle cx="263" cy="643" r="58" fill="white" />
        <circle cx="761" cy="326" r="58" fill="white" />
        <rect x="64" y="64" width="896" height="896" rx="228" fill={`url(#${shineId})`} />
      </svg>
    </span>
  );
}
