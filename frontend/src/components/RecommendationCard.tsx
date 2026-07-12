import { Bookmark, Check, X } from "lucide-react";
import { resolveMediaUrl } from "../lib/api";
import { formatRecommendationDistanceParts, type GeoPoint } from "../lib/geo";
import type { FeedbackAction, RecommendationItem, Route, Spot } from "../lib/types";

type Props = {
  item: RecommendationItem;
  rank?: number;
  compact?: boolean;
  currentLocation?: GeoPoint;
  route?: Route;
  onAction?: (action: FeedbackAction, spot: Spot) => void;
  onSelect: (spot: Spot) => void;
};

const money = (value?: number | null) => (value == null ? "目安なし" : `${value.toLocaleString()}円`);

export function RecommendationCard({ item, rank, compact = false, currentLocation, route, onAction, onSelect }: Props) {
  const { spot } = item;
  const stay = spot.averageStayMinutes ? `${spot.averageStayMinutes}分滞在` : "滞在目安なし";
  const budget = spot.priceMax === 0 ? "無料" : `${money(spot.priceMin)}-${money(spot.priceMax)}`;
  const distanceParts = currentLocation ? formatRecommendationDistanceParts(spot, currentLocation, route) : null;
  const distanceLabel = distanceParts ? `${distanceParts.value}${distanceParts.unit}` : undefined;

  return (
    <article className={`recommendation-card ${compact ? "compact" : ""}`}>
      <div className="rank-line">
        {rank ? <div className="rank">{rank}</div> : null}
        <button className="spot-summary" onClick={() => onSelect(spot)} type="button">
          {resolveMediaUrl(spot.imageUrl) ? (
            <img alt="" className="spot-thumb" src={resolveMediaUrl(spot.imageUrl)} />
          ) : (
            <span className="spot-thumb empty-thumb" aria-hidden="true" />
          )}
          <span className="spot-summary-text">
            <span className="spot-name">{spot.name}</span>
            <span className="spot-meta-row">
              {distanceLabel ? <span className="spot-meta-chip distance-chip">{distanceLabel}</span> : null}
              <span className="spot-meta-chip">{stay}</span>
              <span className="spot-meta-chip">{budget}</span>
            </span>
            <span className="meta">{spot.stationName ?? spot.category}</span>
          </span>
        </button>
        {distanceParts ? (
          <div className="score distance-score" aria-label={`距離 ${distanceLabel}`}>
            <strong>{distanceParts.value}</strong>
            <span>{distanceParts.unit}</span>
          </div>
        ) : null}
      </div>

      <div className="reason-row">
        {item.reasons.slice(0, compact ? 2 : 3).map((reason) => (
          <span className="reason" key={reason}>
            {reason}
          </span>
        ))}
      </div>

      {!compact ? (
        <>
          <div className="meter" aria-hidden="true">
            <span style={{ width: `${item.yorimichiScore}%` }} />
          </div>
          <div className="actions">
            <button className="primary-action" onClick={() => onSelect(spot)} type="button">
              ここに寄る
            </button>
            <button className="icon-button" aria-label="保存" onClick={() => onAction?.("save", spot)} type="button">
              <Bookmark size={19} />
            </button>
            <button className="icon-button" aria-label="スキップ" onClick={() => onAction?.("skip", spot)} type="button">
              <X size={19} />
            </button>
            <button
              className="icon-button success"
              aria-label="訪問済み"
              onClick={() => onAction?.("visited", spot)}
              type="button"
            >
              <Check size={19} />
            </button>
          </div>
        </>
      ) : null}
    </article>
  );
}
