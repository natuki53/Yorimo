import {
  CheckCircle2,
  Clock3,
  Filter,
  LogIn,
  LogOut,
  MapPinned,
  RefreshCw,
  RouteIcon,
  ShieldAlert,
  Sparkles,
  WalletCards
} from "lucide-react";
import { BottomNav, type AppTab } from "./BottomNav";
import { BrandMark } from "./BrandMark";
import { GoogleMapCanvas } from "./GoogleMapCanvas";
import { RecommendationCard } from "./RecommendationCard";
import { CreatePostPage, ProfilePage, RecommendationsPage, SavedPage } from "./Pages";
import { resolveMediaUrl } from "../lib/api";
import { formatRecommendationDistance, formatRecommendationDistanceParts, type GeoPoint } from "../lib/geo";
import { moodFilterTags } from "../lib/interestTags";
import { formatRouteEndpoints, formatRouteWithMode } from "../lib/routes";
import type {
  FeedbackAction,
  Post,
  PostCreatePayload,
  ProfileUpdatePayload,
  RecommendationItem,
  Route,
  RoutePayload,
  SavedSpot,
  Spot,
  User
} from "../lib/types";

type Props = {
  activeTab: AppTab;
  apiMessage?: string | null;
  availableMinutes: number;
  budgetMax: number;
  currentLocation: { lat: number; lng: number };
  mapCenter: { lat: number; lng: number };
  showCurrentLocation: boolean;
  loading: boolean;
  feedPosts: Post[];
  recommendations: RecommendationItem[];
  route?: Route;
  routes: Route[];
  savedSpots: SavedSpot[];
  selectedRouteId?: string | null;
  selectedRecommendation?: RecommendationItem;
  selectedSpot?: Spot | null;
  spots: Spot[];
  tags: string[];
  user?: User | null;
  onAvailableMinutesChange: (minutes: number) => void;
  onBudgetMaxChange: (budget: number) => void;
  onAuthOpen: () => void;
  onFeedRefresh: () => void;
  onLogout: () => void;
  onPostCreate: (payload: PostCreatePayload) => Promise<void>;
  onProfileUpdate: (payload: ProfileUpdatePayload) => Promise<void>;
  onRefresh: () => void;
  onRouteCreate: (payload: RoutePayload) => Promise<void>;
  onRouteDelete: (routeId: string) => Promise<void>;
  onRouteSelect: (routeId: string | null) => void;
  onSavedDelete: (spotId: string) => void;
  onSpotAction: (action: FeedbackAction, spot: Spot) => void;
  onSpotSelect: (spot: Spot) => void;
  onTabChange: (tab: AppTab) => void;
  onTagToggle: (tag: string) => void;
};

const priceText = (spot?: Spot | null) => {
  if (!spot) return "--";
  if (spot.priceMax === 0) return "無料";
  if (spot.priceMin != null && spot.priceMax != null) {
    return `${spot.priceMin.toLocaleString()}-${spot.priceMax.toLocaleString()}円`;
  }
  return spot.priceMax != null ? `${spot.priceMax.toLocaleString()}円以内` : "目安なし";
};

function DesktopSpotPanel({
  item,
  currentLocation,
  spot,
  onRefresh,
  onSpotAction,
  route
}: {
  item?: RecommendationItem;
  currentLocation: GeoPoint;
  onSpotAction: (action: FeedbackAction, spot: Spot) => void;
  route?: Route;
  spot?: Spot | null;
  onRefresh: () => void;
}) {
  const target = spot ?? item?.spot;

  if (!target) {
    return <div className="desktop-empty">地図またはおすすめからスポットを選択してください。</div>;
  }

  const distanceLabel = formatRecommendationDistance(target, currentLocation, route);

  return (
    <section className="desktop-detail-panel" aria-label="選択中のスポット">
      {resolveMediaUrl(target.imageUrl) ? (
        <img alt="" className="desktop-detail-image" src={resolveMediaUrl(target.imageUrl)} />
      ) : (
        <div className="desktop-detail-image empty-detail-image" aria-hidden="true" />
      )}
      <div className="desktop-detail-body">
        <div className="panel-label">{target.category}</div>
        <h2>{target.name}</h2>
        <p>{target.description}</p>

        <div className="desktop-metrics">
          <div>
            <MapPinned size={18} />
            <span>{distanceLabel}</span>
          </div>
          <div>
            <Clock3 size={18} />
            <span>{target.averageStayMinutes ?? "--"}分</span>
          </div>
          <div>
            <WalletCards size={18} />
            <span>{priceText(target)}</span>
          </div>
        </div>

        <div className="reason-row">
          {(item?.reasons ?? target.tags).slice(0, 3).map((reason) => (
            <span className="reason" key={reason}>
              {reason}
            </span>
          ))}
        </div>

        <div className="desktop-action-row">
          <button className="primary-action" onClick={() => onRefresh()} type="button">
            <MapPinned size={18} />
            ここに寄る
          </button>
          <button
            className="icon-button success"
            aria-label="訪問済み"
            onClick={() => onSpotAction("visited", target)}
            type="button"
          >
            <CheckCircle2 size={19} />
          </button>
          <button className="icon-button danger" aria-label="通報" type="button">
            <ShieldAlert size={19} />
          </button>
          <button className="icon-button" aria-label="再計算" onClick={onRefresh} type="button">
            <RefreshCw size={19} />
          </button>
        </div>
      </div>
    </section>
  );
}

export function DesktopLayout({
  activeTab,
  apiMessage,
  availableMinutes,
  budgetMax,
  currentLocation,
  mapCenter,
  showCurrentLocation,
  loading,
  feedPosts,
  recommendations,
  route,
  routes,
  savedSpots,
  selectedRouteId,
  selectedRecommendation,
  selectedSpot,
  spots,
  tags,
  user,
  onAvailableMinutesChange,
  onBudgetMaxChange,
  onAuthOpen,
  onFeedRefresh,
  onLogout,
  onPostCreate,
  onProfileUpdate,
  onRefresh,
  onRouteCreate,
  onRouteDelete,
  onRouteSelect,
  onSavedDelete,
  onSpotAction,
  onSpotSelect,
  onTabChange,
  onTagToggle
}: Props) {
  const topItem = recommendations[0];
  const topDistanceParts = topItem ? formatRecommendationDistanceParts(topItem.spot, currentLocation, route) : null;
  const topDistance = topDistanceParts ? `${topDistanceParts.value}${topDistanceParts.unit}` : null;
  const selectedItem = selectedRecommendation ?? (!selectedSpot ? topItem : undefined);
  const isMapPage = activeTab === "map";
  const showRecommendationControls = activeTab === "map" || activeTab === "recommendations";
  const pageTitle: Record<AppTab, { eyebrow: string; title: string; description: string }> = {
    map: {
      eyebrow: "いまの条件",
      title: "帰り道で寄れる場所を絞る",
      description: "時間、予算、気分を変えると候補を再計算できます。"
    },
    recommendations: {
      eyebrow: "おすすめ一覧",
      title: "候補を比較して選ぶ",
      description: "スコア、理由、滞在時間を見比べて寄り道先を決められます。"
    },
    create: {
      eyebrow: "投稿",
      title: "寄り道体験を残す",
      description: "選んだスポットに写真、リール、レビューを紐づけられます。"
    },
    saved: {
      eyebrow: "保存",
      title: "あとで寄りたい場所",
      description: "保存したスポットを見直して、次の寄り道候補に戻せます。"
    },
    profile: {
      eyebrow: "プロフィール",
      title: "好みとルートを管理する",
      description: "興味、予算、いつもの移動ルートを推薦条件に反映します。"
    }
  };

  const pageContent =
    activeTab === "recommendations" ? (
      <RecommendationsPage
        availableMinutes={availableMinutes}
        budgetMax={budgetMax}
        currentLocation={currentLocation}
        items={recommendations}
        onSpotAction={onSpotAction}
        onSpotSelect={onSpotSelect}
        route={route}
      />
    ) : activeTab === "create" ? (
      <CreatePostPage
        feedPosts={feedPosts}
        loading={loading}
        onCreatePost={onPostCreate}
        onFeedRefresh={onFeedRefresh}
        onSpotSelect={onSpotSelect}
        selectedSpot={selectedSpot}
        spots={spots}
      />
    ) : activeTab === "saved" ? (
      <SavedPage items={savedSpots} onDelete={onSavedDelete} onSpotSelect={onSpotSelect} />
    ) : (
      <ProfilePage
        currentLocation={currentLocation}
        loading={loading}
        onLogout={onLogout}
        onProfileUpdate={onProfileUpdate}
        onRouteCreate={onRouteCreate}
        onRouteDelete={onRouteDelete}
        onRouteSelect={onRouteSelect}
        routes={routes}
        selectedRouteId={selectedRouteId}
        user={user}
      />
    );

  const pageContext =
    activeTab === "profile" ? (
      <section className="desktop-context-card" aria-label="選択中のマイルート">
        <div className="panel-label">推薦条件</div>
        <h2>選択中のマイルート</h2>
        <p>{route ? formatRouteWithMode(route) : "まだマイルートが選択されていません。"}</p>
        <label className="desktop-range">
          <span>
            <RouteIcon size={17} />
            推薦に使うマイルート
          </span>
          <select
            className="input-like compact-select"
            onChange={(event) => onRouteSelect(event.target.value || null)}
            value={selectedRouteId ?? route?.id ?? ""}
          >
            <option value="">現在地周辺のみ</option>
            {routes.map((item) => (
              <option key={item.id} value={item.id}>
                {formatRouteEndpoints(item)}
              </option>
            ))}
          </select>
        </label>
      </section>
    ) : (
      <DesktopSpotPanel
        currentLocation={currentLocation}
        item={selectedItem}
        onRefresh={onRefresh}
        onSpotAction={onSpotAction}
        route={route}
        spot={selectedSpot}
      />
    );

  return (
    <main className="desktop-experience" data-testid="desktop-experience">
      <header className="desktop-topbar">
        <div className="desktop-brand">
          <BrandMark />
          <div>
            <strong>Yorimo</strong>
            <span className="brand-subtitle">日常ルートの寄り道マップ</span>
          </div>
        </div>
        <BottomNav activeTab={activeTab} onTabChange={onTabChange} />
        <div className="desktop-topbar-actions">
          <div className="desktop-route-summary">
            <RouteIcon size={18} />
            <span>{route ? formatRouteWithMode(route) : "現在地周辺"}</span>
          </div>
          {user ? (
            <button className="desktop-account" onClick={onLogout} type="button">
              <span>{user.name}</span>
              <LogOut size={17} />
            </button>
          ) : (
            <button className="primary-action compact-action" disabled={loading} onClick={onAuthOpen} type="button">
              <LogIn size={17} />
              ログイン
            </button>
          )}
        </div>
      </header>

      <div className={`desktop-grid ${isMapPage ? "desktop-map-grid" : "desktop-page-grid"}`} data-route={activeTab}>
        <aside className="desktop-sidebar" aria-label="メインメニュー">
          <section className="desktop-section">
            <div className="panel-label">{pageTitle[activeTab].eyebrow}</div>
            <h1>{pageTitle[activeTab].title}</h1>
            <p>{pageTitle[activeTab].description}</p>
          </section>

          {showRecommendationControls ? (
            <>
              <section className="desktop-control-group">
                <label className="desktop-range">
                  <span>
                    <RouteIcon size={17} />
                    推薦に使うマイルート
                  </span>
                  <select
                    className="input-like compact-select"
                    onChange={(event) => onRouteSelect(event.target.value || null)}
                    value={selectedRouteId ?? route?.id ?? ""}
                  >
                    <option value="">現在地周辺のみ</option>
                    {routes.map((item) => (
                      <option key={item.id} value={item.id}>
                        {formatRouteEndpoints(item)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="desktop-range">
                  <span>
                    <Clock3 size={17} />
                    {availableMinutes}分
                  </span>
                  <input
                    max={120}
                    min={15}
                    onChange={(event) => onAvailableMinutesChange(Number(event.target.value))}
                    step={15}
                    type="range"
                    value={availableMinutes}
                  />
                </label>
                <label className="desktop-range">
                  <span>
                    <WalletCards size={17} />
                    {budgetMax.toLocaleString()}円
                  </span>
                  <input
                    max={5000}
                    min={0}
                    onChange={(event) => onBudgetMaxChange(Number(event.target.value))}
                    step={500}
                    type="range"
                    value={budgetMax}
                  />
                </label>
              </section>

              <section className="desktop-section">
                <div className="desktop-chip-head">
                  <span className="panel-label">気分</span>
                  <Filter size={16} />
                </div>
                <div className="desktop-chip-list">
                  {moodFilterTags.map((tag) => (
                    <button
                      className="app-chip"
                      data-active={tags.includes(tag)}
                      key={tag}
                      onClick={() => onTagToggle(tag)}
                      type="button"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </section>

              <button className="primary-action desktop-refresh" disabled={loading} onClick={onRefresh} type="button">
                <RefreshCw className={loading ? "spin" : ""} size={18} />
                {loading ? "再計算中" : "おすすめを更新"}
              </button>
            </>
          ) : (
            <section className="desktop-context-card compact">
              <div className="panel-label">現在のルート</div>
              <p>{route ? formatRouteWithMode(route) : "現在地周辺のみ"}</p>
            </section>
          )}

          {apiMessage ? <p className="desktop-message">{apiMessage}</p> : null}
        </aside>

        {isMapPage ? (
          <section className="desktop-map-area" aria-label="寄り道マップ" data-testid="desktop-map-page">
            <GoogleMapCanvas
              center={mapCenter}
              onSpotSelect={onSpotSelect}
              recommendations={recommendations}
              route={route}
              selectedSpot={selectedSpot}
              showCurrentLocation={showCurrentLocation}
              spots={spots}
            />
            {topItem ? (
              <div className="desktop-map-summary">
                {topDistanceParts ? (
                  <span className="score mini-score distance-score" aria-label={`距離 ${topDistance}`}>
                    <strong>{topDistanceParts.value}</strong>
                    <span>{topDistanceParts.unit}</span>
                  </span>
                ) : null}
                <div>
                  <strong>{topItem.spot.name}</strong>
                  <span>{topDistance ? `${topDistance} / ${topItem.reasons[0]}` : topItem.reasons[0]}</span>
                </div>
              </div>
            ) : null}
          </section>
        ) : (
          <section className="desktop-page-area" aria-label={pageTitle[activeTab].title} data-testid={`desktop-${activeTab}-page`}>
            {pageContent}
          </section>
        )}

        <aside className="desktop-inspector" aria-label="詳細パネル">
          {isMapPage ? (
            <>
              <DesktopSpotPanel
                currentLocation={currentLocation}
                item={selectedItem}
                onRefresh={onRefresh}
                onSpotAction={onSpotAction}
                route={route}
                spot={selectedSpot}
              />
              <section className="desktop-recommendations-head">
                <div>
                  <div className="panel-label">近くの候補</div>
                  <h2>おすすめ</h2>
                </div>
                <Sparkles color="#e1306c" size={22} />
              </section>
              <div className="desktop-recommendation-list">
                {recommendations.slice(0, 4).map((item, index) => (
                  <RecommendationCard
                    compact
                    currentLocation={currentLocation}
                    item={item}
                    key={item.spot.id}
                    onAction={onSpotAction}
                    onSelect={onSpotSelect}
                    rank={index + 1}
                    route={route}
                  />
                ))}
              </div>
            </>
          ) : (
            pageContext
          )}
        </aside>
      </div>
    </main>
  );
}
