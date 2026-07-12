type BrandMarkProps = {
  className?: string;
};

export function BrandMark({ className }: BrandMarkProps) {
  return (
    <span className={["brand-mark", className].filter(Boolean).join(" ")} aria-hidden="true">
      <img src="/yorimo-icon.png" alt="" />
    </span>
  );
}
