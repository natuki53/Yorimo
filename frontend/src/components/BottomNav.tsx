import type { MouseEvent } from "react";
import { Bookmark, Map, PlusSquare, Sparkles, UserRound } from "lucide-react";

export type AppTab = "map" | "recommendations" | "create" | "saved" | "profile";

export const tabToPath: Record<AppTab, string> = {
  map: "/map",
  recommendations: "/recommendations",
  create: "/short",
  saved: "/saved",
  profile: "/profile"
};

type Props = {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
};

const navItems = [
  { tab: "map", label: "地図", icon: Map, path: tabToPath.map },
  { tab: "recommendations", label: "おすすめ", icon: Sparkles, path: tabToPath.recommendations },
  { tab: "create", label: "リール", icon: PlusSquare, path: tabToPath.create },
  { tab: "saved", label: "保存", icon: Bookmark, path: tabToPath.saved },
  { tab: "profile", label: "自分", icon: UserRound, path: tabToPath.profile }
] as const;

export function BottomNav({ activeTab, onTabChange }: Props) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>, tab: AppTab) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) {
      return;
    }

    event.preventDefault();
    onTabChange(tab);
  };

  return (
    <nav className="bottom-nav" aria-label="メインナビゲーション">
      {navItems.map(({ tab, label, icon: Icon, path }) => (
        <a
          aria-current={activeTab === tab ? "page" : undefined}
          href={path}
          className={`nav-item ${activeTab === tab ? "active" : ""}`}
          key={tab}
          onClick={(event) => handleClick(event, tab)}
        >
          <Icon aria-hidden="true" size={19} strokeWidth={2.4} />
          <span>{label}</span>
        </a>
      ))}
    </nav>
  );
}
