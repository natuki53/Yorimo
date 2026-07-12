import { useRef, useState, type FormEvent, type PointerEvent } from "react";
import { Clock3, Filter, LocateFixed, MapPinned, RefreshCw, RouteIcon, WalletCards, X } from "lucide-react";
import { GoogleMapCanvas, type CameraFocusRequest } from "./GoogleMapCanvas";
import { RecommendationCard } from "./RecommendationCard";
import { resolveMediaUrl } from "../lib/api";
import { formatRecommendationDistance } from "../lib/geo";
import { moodFilterTags } from "../lib/interestTags";
import { formatRouteEndpoints, routeTravelModeLabel } from "../lib/routes";
import type { FeedbackAction, RecommendationItem, Route, Spot } from "../lib/types";

type Props = {
  currentLocation: { lat: number; lng: number };
  mapCenter: { lat: number; lng: number };
  showCurrentLocation: boolean;
  route?: Route;
  routes?: Route[];
  selectedRouteId?: string | null;
  spots: Spot[];
  recommendations: RecommendationItem[];
  selectedSpot?: Spot | null;
  availableMinutes: number;
  budgetMax: number;
  mood: string;
  activeTags: string[];
  loading: boolean;
  apiMessage?: string | null;
  isAuthenticated?: boolean;
  onAuthOpen?: () => void;
  onSpotSelect: (spot: Spot) => void;
  onTagToggle: (tag: string) => void;
  onAvailableMinutesChange: (minutes: number) => void;
  onBudgetMaxChange: (budget: number) => void;
  onLocateMe?: () => void;
  onRefresh: () => void;
  onRouteSelect?: (routeId: string | null) => void;
  onSpotAction: (action: FeedbackAction, spot: Spot) => void;
};

const priceText = (spot?: Spot | null) => {
  if (!spot) return "--";
  if (spot.priceMax === 0) return "無料";
  if (spot.priceMin != null && spot.priceMax != null) {
    return `${spot.priceMin.toLocaleString()}-${spot.priceMax.toLocaleString()}円`;
  }
  return spot.priceMax != null ? `${spot.priceMax.toLocaleString()}円以内` : "目安なし";
};

export function MapHome({
  currentLocation,
  mapCenter,
  showCurrentLocation,
  route,
  routes = [],
  selectedRouteId,
  spots,
  recommendations,
  selectedSpot,
  availableMinutes,
  budgetMax,
  mood,
  activeTags,
  loading,
  apiMessage,
  isAuthenticated = true,
  onAuthOpen,
  onSpotSelect,
  onTagToggle,
  onAvailableMinutesChange,
  onBudgetMaxChange,
  onLocateMe,
  onRefresh,
  onRouteSelect,
  onSpotAction
}: Props) {
  const [sheetLevel, setSheetLevel] = useState<"collapsed" | "peek" | "expanded">("collapsed");
  const [filterOpen, setFilterOpen] = useState(false);
  const [cameraFocusRequest, setCameraFocusRequest] = useState<CameraFocusRequest | undefined>();
  const sheetRef = useRef<HTMLElement | null>(null);
  const cameraFocusNonce = useRef(0);
  const dragStartY = useRef<number | null>(null);
  const pointerMoved = useRef(false);
  const topRecommendation = recommendations[0];
  const recommendationCount = recommendations.length;
  const selectedRecommendation = selectedSpot
    ? recommendations.find((item) => item.spot.id === selectedSpot.id)
    : undefined;
  const highlightedRecommendation = selectedRecommendation ?? topRecommendation;
  const highlightedSpot = selectedSpot ?? highlightedRecommendation?.spot ?? null;
  const otherRecommendations = highlightedSpot
    ? recommendations.filter((item) => item.spot.id !== highlightedSpot.id)
    : recommendations;
  const highlightedDistance = highlightedSpot ? formatRecommendationDistance(highlightedSpot, currentLocation, route) : null;
  const summary = route
    ? `${routeTravelModeLabel(route.travelMode)} / ${budgetMax.toLocaleString()}円以内`
    : `現在地周辺 / ${budgetMax.toLocaleString()}円以内`;

  const handleSheetPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    dragStartY.current = event.clientY;
    pointerMoved.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleSheetPointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    const startY = dragStartY.current;
    dragStartY.current = null;
    if (startY == null) {
      return;
    }

    const delta = event.clientY - startY;
    if (delta > 36) {
      pointerMoved.current = true;
      setSheetLevel((current) => (current === "expanded" ? "peek" : "collapsed"));
      return;
    }
    if (delta < -36) {
      pointerMoved.current = true;
      setSheetLevel((current) => (current === "collapsed" ? "peek" : "expanded"));
      return;
    }
  };

  const handleSheetToggle = () => {
    if (pointerMoved.current) {
      pointerMoved.current = false;
      return;
    }
    setSheetLevel((current) => (current === "collapsed" ? "peek" : current === "peek" ? "expanded" : "collapsed"));
  };

  const handleSpotSelect = (spot: Spot) => {
    onSpotSelect(spot);
    cameraFocusNonce.current += 1;
    setCameraFocusRequest({ nonce: cameraFocusNonce.current, spotId: spot.id, type: "selected-spot" });
    setSheetLevel("peek");
    window.requestAnimationFrame(() => {
      sheetRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  const handleLocateClick = () => {
    setFilterOpen(false);
    cameraFocusNonce.current += 1;
    setCameraFocusRequest({ nonce: cameraFocusNonce.current, type: "current-location" });
    setSheetLevel((current) => (current === "expanded" ? "peek" : current));
    onLocateMe?.();
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFilterOpen(false);
    onRefresh();
  };

  return (
    <div className="map-screen" role="region" aria-label="地図">
      <GoogleMapCanvas
        cameraFocusRequest={cameraFocusRequest}
        center={mapCenter}
        onSpotSelect={handleSpotSelect}
        recommendations={recommendations}
        route={route}
        selectedSpot={selectedSpot}
        sheetLevel={sheetLevel}
        showCurrentLocation={showCurrentLocation}
        spots={spots}
      />

      <div className="map-header">
        <div className="route-icon">
          <RouteIcon aria-hidden="true" size={22} strokeWidth={2.4} />
        </div>
        <div>
          <div className="search-title">{route?.name ?? "現在地から寄り道"}</div>
          <div className="search-subtitle">{summary}</div>
        </div>
        <div className="map-header-actions">
          <button className="locate-header-button" onClick={handleLocateClick} type="button" aria-label="現在地へ移動">
            <LocateFixed aria-hidden="true" size={20} />
          </button>
          <button
            aria-expanded={filterOpen}
            aria-label="検索条件を開閉"
            className="filter-icon"
            data-active={filterOpen}
            onClick={() => setFilterOpen((current) => !current)}
            type="button"
          >
            <Filter aria-hidden="true" size={20} strokeWidth={2.4} />
          </button>
        </div>
      </div>

      {filterOpen ? (
        <form className="map-search-form" onSubmit={handleSearchSubmit} aria-label="検索条件">
          <div className="map-search-head">
            <strong>検索条件</strong>
            <span>{recommendationCount}件の候補を調整</span>
          </div>

          {onRouteSelect ? (
            <label className="map-search-field">
              <span>ルート</span>
              <select onChange={(event) => onRouteSelect(event.target.value || null)} value={selectedRouteId ?? route?.id ?? ""}>
                <option value="">現在地周辺</option>
                {routes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {formatRouteEndpoints(item)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <div className="map-search-chip-list" aria-label="気分フィルター">
            {moodFilterTags.map((tag) => (
              <button
                className="app-chip"
                data-active={activeTags.includes(tag)}
                key={tag}
                onClick={() => onTagToggle(tag)}
                type="button"
              >
                {tag}
              </button>
            ))}
          </div>

          <div className="map-search-ranges">
            <label>
              <span>滞在時間</span>
              <strong>{availableMinutes}分</strong>
              <input
                max={120}
                min={15}
                onChange={(event) => onAvailableMinutesChange(Number(event.target.value))}
                step={15}
                type="range"
                value={availableMinutes}
              />
            </label>
            <label>
              <span>予算</span>
              <strong>{budgetMax.toLocaleString()}円</strong>
              <input
                max={5000}
                min={0}
                onChange={(event) => onBudgetMaxChange(Number(event.target.value))}
                step={500}
                type="range"
                value={budgetMax}
              />
            </label>
          </div>

          <button className="map-search-submit" disabled={loading} type="submit">
            <RefreshCw size={17} className={loading ? "spin" : ""} />
            {loading ? "更新中" : "条件を反映"}
          </button>
        </form>
      ) : null}

      <section className="sheet" data-level={sheetLevel} aria-label="寄り道候補" ref={sheetRef}>
        <button
          className="sheet-handle-button"
          onPointerDown={handleSheetPointerDown}
          onPointerUp={handleSheetPointerUp}
          onClick={handleSheetToggle}
          type="button"
          aria-label="寄り道候補シートを開閉"
        >
          <span className="handle" />
        </button>
        <div className="sheet-content">
          <div className="sheet-head">
            <div>
              <div className="eyebrow">{recommendationCount > 1 ? `${recommendationCount}件の候補` : "いま一番ちょうどいい"}</div>
              <div className="title">寄り道候補</div>
            </div>
            <button className="icon-button sheet-close" onClick={() => setSheetLevel("collapsed")} type="button" aria-label="候補シートを閉じる">
              <X size={18} />
            </button>
          </div>

          {apiMessage ? <p className="inline-alert">{apiMessage}</p> : null}
          {!isAuthenticated && onAuthOpen ? (
            <div className="sheet-auth">
              <div>
                <strong>アカウント連携</strong>
                <span>ルート履歴と保存スポットを同期できます</span>
              </div>
              <button className="primary-action" disabled={loading} onClick={onAuthOpen} type="button">
                ログイン
              </button>
            </div>
          ) : null}

          {highlightedSpot ? (
            <>
              <section className="sheet-spot-detail" aria-label="選択中のスポット">
                {resolveMediaUrl(highlightedSpot.imageUrl) ? (
                  <img alt="" className="sheet-detail-image" src={resolveMediaUrl(highlightedSpot.imageUrl)} />
                ) : (
                  <div className="sheet-detail-image empty-detail-image" aria-hidden="true" />
                )}
                <div className="sheet-detail-body">
                  <div className="panel-label">{highlightedSpot.category}</div>
                  <h3>{highlightedSpot.name}</h3>
                  <p>{highlightedSpot.description ?? highlightedSpot.address ?? "現在地周辺で取得したスポットです。"}</p>
                  <div className="sheet-detail-metrics">
                    <div>
                      <MapPinned size={17} />
                      <span>{highlightedDistance ?? "--"}</span>
                    </div>
                    <div>
                      <Clock3 size={17} />
                      <span>{highlightedSpot.averageStayMinutes ?? "--"}分</span>
                    </div>
                    <div>
                      <WalletCards size={17} />
                      <span>{priceText(highlightedSpot)}</span>
                    </div>
                  </div>
                  <div className="reason-row sheet-detail-reasons">
                    {(highlightedRecommendation?.reasons ?? highlightedSpot.tags).slice(0, 3).map((reason) => (
                      <span className="reason" key={reason}>
                        {reason}
                      </span>
                    ))}
                  </div>
                </div>
              </section>

              {otherRecommendations.length > 0 ? (
                <div className="sheet-results" aria-label="他の寄り道候補">
                  <div className="sheet-section-label">他の候補</div>
                  {otherRecommendations.map((item, index) => (
                    <RecommendationCard
                      compact
                      currentLocation={currentLocation}
                      item={item}
                      key={item.spot.id}
                      onAction={onSpotAction}
                      onSelect={handleSpotSelect}
                      rank={index + 1}
                      route={route}
                    />
                  ))}
                </div>
              ) : null}
            </>
          ) : recommendationCount > 0 ? (
            <div className="sheet-results" aria-label="寄り道候補一覧">
              {recommendations.map((item, index) => (
                <RecommendationCard
                  compact
                  currentLocation={currentLocation}
                  item={item}
                  key={item.spot.id}
                  onAction={onSpotAction}
                  onSelect={handleSpotSelect}
                  rank={index + 1}
                  route={route}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">{loading ? "おすすめを読み込み中" : `${mood}に合う候補がまだありません`}</div>
          )}

        </div>
      </section>
    </div>
  );
}
