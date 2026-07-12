import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bookmark,
  Check,
  CirclePlay,
  Bike,
  Car,
  Clock3,
  Eye,
  Footprints,
  Filter,
  Heart,
  MapPinned,
  MessageCircle,
  Pause,
  Plus,
  RefreshCw,
  Save,
  Send,
  Share2,
  ShieldAlert,
  Store,
  TrainFront,
  Trash2,
  WalletCards,
  X
} from "lucide-react";
import { RecommendationCard } from "./RecommendationCard";
import { StationSearchField } from "./StationSearchField";
import { api, resolveMediaUrl } from "../lib/api";
import { formatRecommendationDistance, type GeoPoint } from "../lib/geo";
import { interestOptions } from "../lib/interestTags";
import {
  formatRouteEndpoints,
  formatRouteWithMode,
  routeEndpointTypeOptions,
  routeTravelModeLabel,
  routeTravelModeOptions
} from "../lib/routes";
import type {
  FeedbackAction,
  Post,
  PostCreatePayload,
  PostType,
  ProfileUpdatePayload,
  RecommendationItem,
  Route,
  RouteEndpointType,
  RoutePayload,
  RouteTravelMode,
  SavedSpot,
  StationCandidate,
  Spot,
  User,
  Visibility
} from "../lib/types";

const postTypes: Array<{ type: PostType; label: string }> = [
  { type: "photo", label: "写真" },
  { type: "short_video", label: "リール" },
  { type: "story", label: "ストーリー" },
  { type: "review", label: "レビュー" }
];

const visibilityOptions: Array<{ value: Visibility; label: string; note?: string }> = [
  { value: "public", label: "public" },
  { value: "private", label: "private" },
  { value: "followers", label: "followers", note: "準備中" }
];

const formatMoney = (value?: number | null) => (value == null ? "目安なし" : `${value.toLocaleString()}円`);
const parseNumber = (value: string) => (value.trim() === "" ? null : Number(value));
const toTagList = (value: string) =>
  value
    .split(/[,\s、]+/)
    .map((tag) => tag.trim())
    .filter(Boolean);

const formatPostType = (type: PostType) => {
  if (type === "short_video") return "リール";
  if (type === "story") return "ストーリー";
  if (type === "review") return "レビュー";
  return "写真";
};

const formatDate = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
};

const RouteModeIcon = ({ mode }: { mode: RouteTravelMode }) => {
  if (mode === "driving") return <Car size={17} />;
  if (mode === "walking") return <Footprints size={17} />;
  if (mode === "bicycling") return <Bike size={17} />;
  return <TrainFront size={17} />;
};

type RecommendationsPageProps = {
  items: RecommendationItem[];
  availableMinutes: number;
  budgetMax: number;
  currentLocation: GeoPoint;
  route?: Route;
  onSpotAction: (action: FeedbackAction, spot: Spot) => void;
  onSpotSelect: (spot: Spot) => void;
};

export function RecommendationsPage({
  items,
  availableMinutes,
  budgetMax,
  currentLocation,
  route,
  onSpotAction,
  onSpotSelect
}: RecommendationsPageProps) {
  const nearestDistance = items[0] ? formatRecommendationDistance(items[0].spot, currentLocation, route) : null;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">{nearestDistance ? `最短 ${nearestDistance}` : "近くの候補"}</div>
          <div className="title">おすすめ</div>
        </div>
        <button className="icon-button" aria-label="フィルター" type="button">
          <Filter size={19} />
        </button>
      </div>
      <div className="reason-row">
        <span className="app-chip" data-active="true">
          現在地
        </span>
        {nearestDistance ? <span className="app-chip">{nearestDistance}から</span> : null}
        <span className="app-chip">滞在{availableMinutes}分以内</span>
        <span className="app-chip">{budgetMax.toLocaleString()}円以内</span>
        <span className="app-chip">{route ? `${routeTravelModeLabel(route.travelMode)}で${route.endName}まで` : "マイルート未選択"}</span>
      </div>
      <div className="list">
        {items.length === 0 ? <div className="empty-state">現在地周辺の実店舗を取得中です。</div> : null}
        {items.map((item, index) => (
          <RecommendationCard
            item={item}
            key={item.spot.id}
            currentLocation={currentLocation}
            onAction={onSpotAction}
            onSelect={onSpotSelect}
            rank={index + 1}
            route={route}
          />
        ))}
      </div>
    </div>
  );
}

type SpotDetailPageProps = {
  item?: RecommendationItem;
  spot?: Spot | null;
  onAction: (action: FeedbackAction, spot: Spot) => void;
  onClose: () => void;
};

export function SpotDetailPage({ item, spot, onAction, onClose }: SpotDetailPageProps) {
  const target = item?.spot ?? spot;

  if (!target) {
    return (
      <div className="page">
        <div className="empty-state">スポットを選択してください</div>
      </div>
    );
  }

  return (
    <div className="page spot-detail-page">
      <div className="detail-hero" style={{ backgroundImage: resolveMediaUrl(target.imageUrl) ? `url(${resolveMediaUrl(target.imageUrl)})` : undefined }}>
        <div className="detail-hero-overlay" />
        <div className="hero-control">
          <button className="back" onClick={onClose} type="button" aria-label="地図へ戻る">
            <X size={18} />
          </button>
          <button className="overflow danger" type="button" aria-label="通報">
            <AlertTriangle size={18} />
          </button>
        </div>
        <div className="hero-card">
          <div className="eyebrow">
            {target.category} / {target.stationName ?? "現在地周辺"}
          </div>
          <div className="title">{target.name}</div>
          <div className="meta">{target.description ?? target.address ?? "現在地周辺で取得したスポットです。"}</div>
        </div>
      </div>

      <div className="info-grid">
        <div className="info-cell">
          <div className="cell-label">滞在目安</div>
          <div className="cell-value">{target.averageStayMinutes ?? "--"}分</div>
        </div>
        <div className="info-cell">
          <div className="cell-label">予算</div>
          <div className="cell-value">{target.priceMax === 0 ? "無料" : formatMoney(target.priceMax)}</div>
        </div>
        <div className="info-cell">
          <div className="cell-label">ルート適合</div>
          <div className="cell-value">{item?.yorimichiScore ?? "--"}</div>
        </div>
        <div className="info-cell">
          <div className="cell-label">駅</div>
          <div className="cell-value">{target.stationName ?? "現在地"}</div>
        </div>
      </div>

      <div className="reason-row">
        <button className="primary-action" onClick={() => onAction("save", target)} type="button">
          保存する
        </button>
        <button className="icon-button success" aria-label="訪問済み" onClick={() => onAction("visited", target)} type="button">
          <Check size={19} />
        </button>
        <button className="icon-button danger" aria-label="通報" onClick={() => onAction("report", target)} type="button">
          <AlertTriangle size={19} />
        </button>
      </div>

      <section className="safety-panel">
        <ShieldAlert size={18} />
        <div>
          <strong>位置情報は保存されません</strong>
          <span>現在地は推薦計算だけに使い、投稿はスポット単位で紐づきます。</span>
        </div>
      </section>
    </div>
  );
}

type CreatePostPageProps = {
  feedPosts: Post[];
  loading?: boolean;
  selectedSpot?: Spot | null;
  spots: Spot[];
  onCreatePost: (payload: PostCreatePayload) => Promise<void>;
  onFeedRefresh: () => void;
  onSpotSelect?: (spot: Spot) => void;
};

function PostCard({ post, onSpotSelect }: { post: Post; onSpotSelect?: (spot: Spot) => void }) {
  const isVideo = post.type === "short_video" || post.type === "story";
  return (
    <article className={`post-card ${isVideo ? "video" : ""}`}>
      <div className="post-media">
        {post.mediaUrl && isVideo ? (
          <video controls muted playsInline src={resolveMediaUrl(post.mediaUrl)} />
        ) : post.mediaUrl ? (
          <img alt="" src={resolveMediaUrl(post.mediaUrl)} />
        ) : (
          <div className="post-media-placeholder">
            <CirclePlay size={28} />
            <span>{formatPostType(post.type)}</span>
          </div>
        )}
        {isVideo ? <span className="post-type-badge">{formatPostType(post.type)}</span> : null}
      </div>
      <div className="post-body">
        <div className="post-author">
          <span className="avatar mini">{(post.user?.name ?? "Y").slice(0, 1)}</span>
          <div>
            <strong>{post.user?.name ?? "Yorimo User"}</strong>
            <span>
              {post.spot?.name ?? "スポット"} / {formatDate(post.createdAt)}
            </span>
          </div>
        </div>
        {post.caption ? <p>{post.caption}</p> : null}
        <div className="reason-row">
          {post.moodTags.slice(0, 3).map((tag) => (
            <span className="reason" key={tag}>
              {tag}
            </span>
          ))}
          <span className="reason">{post.visibility}</span>
        </div>
        <div className="post-actions">
          <button className="icon-button" type="button" aria-label="再生">
            {isVideo ? <Pause size={18} /> : <Eye size={18} />}
          </button>
          <button
            className="secondary-action"
            disabled={!post.spot || !onSpotSelect}
            onClick={() => post.spot && onSpotSelect?.(post.spot)}
            type="button"
          >
            <MapPinned size={17} />
            スポット
          </button>
          <button className="icon-button danger" type="button" aria-label="通報">
            <AlertTriangle size={18} />
          </button>
        </div>
      </div>
    </article>
  );
}

const formatSpotPrice = (spot?: Spot | null) => {
  if (!spot) return "目安なし";
  if (spot.priceMax === 0) return "無料";
  if (spot.priceMin != null && spot.priceMax != null) {
    return `${spot.priceMin.toLocaleString()}-${spot.priceMax.toLocaleString()}円`;
  }
  return spot.priceMax != null ? `${spot.priceMax.toLocaleString()}円以内` : "目安なし";
};

function ReelCard({ post, onSpotSelect }: { post: Post; onSpotSelect?: (spot: Spot) => void }) {
  const spot = post.spot;
  const mediaUrl = resolveMediaUrl(post.mediaUrl);
  const comments = [
    ...(post.caption
      ? [
          {
            author: post.user?.name ?? "Yorimo User",
            meta: "投稿者",
            text: post.caption
          }
        ]
      : []),
    ...(post.crowdLevel
      ? [
          {
            author: "現地メモ",
            meta: formatDate(post.createdAt),
            text: `混雑: ${post.crowdLevel}`
          }
        ]
      : [])
  ];

  return (
    <article className="reel-card">
      <section className="reel-detail-panel" aria-label="お店の詳細">
        {resolveMediaUrl(spot?.imageUrl) ? (
          <img alt="" className="reel-spot-image" src={resolveMediaUrl(spot?.imageUrl)} />
        ) : (
          <div className="reel-spot-image empty-detail-image">
            <Store size={30} />
          </div>
        )}
        <div className="reel-detail-body">
          <div className="panel-label">お店の詳細</div>
          <h2>{spot?.name ?? "スポット未設定"}</h2>
          <p>{spot?.description ?? post.caption ?? "このリールに紐づくスポット情報です。"}</p>

          <div className="reel-metrics">
            <div>
              <MapPinned size={17} />
              <span>{spot?.stationName ?? spot?.category ?? "周辺"}</span>
            </div>
            <div>
              <Clock3 size={17} />
              <span>{post.stayMinutes ?? spot?.averageStayMinutes ?? "--"}分</span>
            </div>
            <div>
              <WalletCards size={17} />
              <span>{post.budgetUsed != null ? `${post.budgetUsed.toLocaleString()}円` : formatSpotPrice(spot)}</span>
            </div>
          </div>

          <div className="reason-row">
            {(post.moodTags.length > 0 ? post.moodTags : spot?.tags ?? []).slice(0, 4).map((tag) => (
              <span className="reason" key={tag}>
                {tag}
              </span>
            ))}
            <span className="reason">{post.visibility}</span>
          </div>

          <div className="reel-detail-actions">
            <button
              className="secondary-action"
              disabled={!spot || !onSpotSelect}
              onClick={() => spot && onSpotSelect?.(spot)}
              type="button"
            >
              <MapPinned size={17} />
              スポットを見る
            </button>
            <button className="icon-button danger" type="button" aria-label="通報">
              <AlertTriangle size={18} />
            </button>
          </div>
        </div>
      </section>

      <section className="reel-video-panel" aria-label="リール動画">
        <div className="reel-video-frame">
          {mediaUrl ? (
            <video controls muted playsInline src={mediaUrl} />
          ) : (
            <div className="reel-video-placeholder">
              <CirclePlay size={42} />
              <span>リール</span>
            </div>
          )}
          <div className="reel-video-copy">
            <span>{formatDate(post.createdAt)}</span>
            <strong>{spot?.name ?? formatPostType(post.type)}</strong>
          </div>
          <div className="reel-video-actions" aria-label="リール操作">
            <button className="icon-button" type="button" aria-label="いいね">
              <Heart size={19} />
            </button>
            <button className="icon-button" type="button" aria-label="保存">
              <Bookmark size={19} />
            </button>
            <button className="icon-button" type="button" aria-label="共有">
              <Share2 size={19} />
            </button>
          </div>
        </div>
      </section>

      <section className="reel-comments-panel" aria-label="コメント欄">
        <div className="reel-panel-head">
          <div>
            <div className="panel-label">コメント欄</div>
            <h2>コメント</h2>
          </div>
          <MessageCircle color="#536471" size={21} />
        </div>

        <div className="reel-comment-list">
          {comments.length === 0 ? <div className="empty-state">まだコメントはありません。</div> : null}
          {comments.map((comment) => (
            <div className="reel-comment" key={`${comment.author}-${comment.text}`}>
              <span className="avatar mini">{comment.author.slice(0, 1)}</span>
              <div>
                <strong>{comment.author}</strong>
                <small>{comment.meta}</small>
                <p>{comment.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="reel-comment-input">
          <input className="input-like" placeholder="コメントを追加" readOnly />
          <button className="icon-button" type="button" aria-label="コメント送信">
            <Send size={17} />
          </button>
        </div>
      </section>
    </article>
  );
}

export function CreatePostPage({
  feedPosts,
  loading = false,
  selectedSpot,
  spots,
  onCreatePost,
  onFeedRefresh,
  onSpotSelect
}: CreatePostPageProps) {
  const [view, setView] = useState<"reels" | "compose" | "feed">("reels");
  const [spotId, setSpotId] = useState(selectedSpot?.id ?? spots[0]?.id ?? "");
  const [type, setType] = useState<PostType>("short_video");
  const [mediaUrl, setMediaUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [rating, setRating] = useState("5");
  const [moodTags, setMoodTags] = useState("寄り道");
  const [crowdLevel, setCrowdLevel] = useState("");
  const [stayMinutes, setStayMinutes] = useState("");
  const [budgetUsed, setBudgetUsed] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [error, setError] = useState<string | null>(null);
  const reels = feedPosts.filter((post) => post.type === "short_video");

  useEffect(() => {
    if (selectedSpot?.id) {
      setSpotId(selectedSpot.id);
    } else if (!spotId && spots[0]?.id) {
      setSpotId(spots[0].id);
    }
  }, [selectedSpot?.id, spotId, spots]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!spotId) {
      setError("投稿するスポットを選択してください。");
      return;
    }

    setError(null);
    await onCreatePost({
      spotId,
      type,
      mediaUrl: mediaUrl.trim() ? mediaUrl.trim() : null,
      caption: caption.trim() ? caption.trim() : null,
      rating: type === "review" ? parseNumber(rating) : null,
      moodTags: toTagList(moodTags),
      crowdLevel: crowdLevel.trim() ? crowdLevel.trim() : null,
      stayMinutes: parseNumber(stayMinutes),
      budgetUsed: parseNumber(budgetUsed),
      visibility
    });
    setCaption("");
    setMediaUrl("");
    setView(type === "short_video" ? "reels" : "feed");
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">投稿 / フィード / リール</div>
          <div className="title">スポットSNS</div>
        </div>
        <button className="icon-button" onClick={onFeedRefresh} aria-label="フィード更新" type="button">
          <RefreshCw className={loading ? "spin" : ""} size={19} />
        </button>
      </div>

      <div className="segmented page-tabs">
        <button className={`segment ${view === "reels" ? "active" : ""}`} onClick={() => setView("reels")} type="button">
          リール
        </button>
        <button className={`segment ${view === "compose" ? "active" : ""}`} onClick={() => setView("compose")} type="button">
          作成
        </button>
        <button className={`segment ${view === "feed" ? "active" : ""}`} onClick={() => setView("feed")} type="button">
          フィード
        </button>
      </div>

      {view === "compose" ? (
        <form className="form" onSubmit={handleSubmit}>
          {error ? <p className="inline-alert">{error}</p> : null}
          <label className="field">
            <span>スポット</span>
            <select value={spotId} onChange={(event) => setSpotId(event.target.value)} className="input-like">
              {spots.length === 0 ? <option value="">現在地周辺の店舗を取得中</option> : null}
              {spots.map((spot) => (
                <option key={spot.id} value={spot.id}>
                  {spot.name}
                </option>
              ))}
            </select>
          </label>
          <div className="field">
            <span>投稿タイプ</span>
            <div className="segmented">
              {postTypes.map((item) => (
                <button
                  className={`segment ${type === item.type ? "active" : ""}`}
                  key={item.type}
                  onClick={() => setType(item.type)}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <label className="field">
            <span>{type === "short_video" ? "リール動画URL" : "メディアURL"}</span>
            <input
              className="input-like"
              inputMode="url"
              onChange={(event) => setMediaUrl(event.target.value)}
              placeholder="https://..."
              value={mediaUrl}
            />
          </label>
          <label className="field">
            <span>本文</span>
            <textarea
              className="input-like textarea"
              onChange={(event) => setCaption(event.target.value)}
              placeholder="帰り道にちょうどよかった"
              value={caption}
            />
          </label>
          <div className="form-grid two">
            <label className="field">
              <span>評価</span>
              <input className="input-like" max={5} min={1} onChange={(event) => setRating(event.target.value)} type="number" value={rating} />
            </label>
            <label className="field">
              <span>滞在分</span>
              <input className="input-like" min={1} onChange={(event) => setStayMinutes(event.target.value)} type="number" value={stayMinutes} />
            </label>
          </div>
          <div className="form-grid two">
            <label className="field">
              <span>使った金額</span>
              <input className="input-like" min={0} onChange={(event) => setBudgetUsed(event.target.value)} type="number" value={budgetUsed} />
            </label>
            <label className="field">
              <span>混雑</span>
              <input className="input-like" onChange={(event) => setCrowdLevel(event.target.value)} placeholder="空いている" value={crowdLevel} />
            </label>
          </div>
          <label className="field">
            <span>タグ</span>
            <input className="input-like" onChange={(event) => setMoodTags(event.target.value)} value={moodTags} />
          </label>
          <div className="field">
            <span>公開範囲</span>
            <div className="segmented three">
              {visibilityOptions.map((option) => (
                <button
                  className={`segment ${visibility === option.value ? "active" : ""}`}
                  key={option.value}
                  onClick={() => setVisibility(option.value)}
                  type="button"
                >
                  {option.label}
                  {option.note ? <small>{option.note}</small> : null}
                </button>
              ))}
            </div>
          </div>
          <button className="primary-action submit" disabled={loading || !spotId} type="submit">
            <Send size={18} />
            投稿する
          </button>
        </form>
      ) : view === "reels" ? (
        <div className="reel-stack">
          {reels.length === 0 ? (
            <div className="empty-state">まだリールがありません。作成タブからリール投稿を作成できます。</div>
          ) : null}
          {reels.map((post) => (
            <ReelCard key={post.id} post={post} onSpotSelect={onSpotSelect} />
          ))}
        </div>
      ) : (
        <div className="list">
          {feedPosts.length === 0 ? <div className="empty-state">公開投稿はまだありません。</div> : null}
          {feedPosts.map((post) => (
            <PostCard key={post.id} post={post} onSpotSelect={onSpotSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

export function SavedPage({
  items,
  onDelete,
  onSpotSelect
}: {
  items: SavedSpot[];
  onDelete: (spotId: string) => void;
  onSpotSelect: (spot: Spot) => void;
}) {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">あとで寄りたい</div>
          <div className="title">保存スポット</div>
        </div>
        <Bookmark aria-hidden="true" color="#e1306c" />
      </div>
      <div className="list">
        {items.length === 0 ? <div className="empty-state">保存済みスポットはまだありません。</div> : null}
        {items.map((item) => (
          <article className="saved-card" key={item.spotId}>
            <button className="spot-summary" onClick={() => onSpotSelect(item.spot)} type="button">
              {resolveMediaUrl(item.spot.imageUrl) ? (
                <img alt="" className="spot-thumb" src={resolveMediaUrl(item.spot.imageUrl)} />
              ) : (
                <span className="spot-thumb empty-thumb" aria-hidden="true" />
              )}
              <span>
                <span className="spot-name">{item.spot.name}</span>
                <span className="meta">
                  {item.spot.stationName ?? item.spot.category} / {formatDate(item.createdAt)}
                </span>
              </span>
            </button>
            <button className="icon-button danger" onClick={() => onDelete(item.spotId)} type="button" aria-label="保存解除">
              <Trash2 size={18} />
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}

type ProfilePageProps = {
  currentLocation: { lat: number; lng: number };
  loading?: boolean;
  routes: Route[];
  selectedRouteId?: string | null;
  user?: User | null;
  onLogout?: () => void;
  onProfileUpdate: (payload: ProfileUpdatePayload) => Promise<void>;
  onRouteCreate: (payload: RoutePayload) => Promise<void>;
  onRouteDelete: (routeId: string) => Promise<void>;
  onRouteSelect: (routeId: string | null) => void;
};

const buildRoutePayload = (form: {
  name: string;
  startType: RouteEndpointType;
  startName: string;
  startLat: string;
  startLng: string;
  endType: RouteEndpointType;
  endName: string;
  endLat: string;
  endLng: string;
  travelMode: RouteTravelMode;
  viaStationNames: string;
  usualDepartureTime: string;
  usualArrivalTime: string;
},
start: StationCandidate | null,
end: StationCandidate | null): RoutePayload | null => {
  const buildPoint = (
    type: RouteEndpointType,
    candidate: StationCandidate | null,
    name: string,
    latValue: string,
    lngValue: string,
    fallbackName: string
  ) => {
    if (type === "station") {
      return candidate ? { name: candidate.name, lat: candidate.lat, lng: candidate.lng } : null;
    }

    const lat = Number(latValue);
    const lng = Number(lngValue);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return null;
    }

    return {
      name: name.trim() || fallbackName,
      lat,
      lng
    };
  };

  const startPoint = buildPoint(form.startType, start, form.startName, form.startLat, form.startLng, "出発ピン");
  const endPoint = buildPoint(form.endType, end, form.endName, form.endLat, form.endLng, "到着ピン");

  if (!startPoint || !endPoint) {
    return null;
  }

  return {
    name: form.name.trim() || `${startPoint.name}から${endPoint.name}`,
    startType: form.startType,
    startName: startPoint.name,
    startLat: startPoint.lat,
    startLng: startPoint.lng,
    endType: form.endType,
    endName: endPoint.name,
    endLat: endPoint.lat,
    endLng: endPoint.lng,
    travelMode: form.travelMode,
    viaStationNames: toTagList(form.viaStationNames),
    usualDepartureTime: form.usualDepartureTime.trim() || null,
    usualArrivalTime: form.usualArrivalTime.trim() || null
  };
};

export function ProfilePage({
  currentLocation,
  loading = false,
  routes,
  selectedRouteId,
  user,
  onLogout,
  onProfileUpdate,
  onRouteCreate,
  onRouteDelete,
  onRouteSelect
}: ProfilePageProps) {
  const [name, setName] = useState(user?.name ?? "");
  const [ageRange, setAgeRange] = useState(user?.ageRange ?? "");
  const [interests, setInterests] = useState<string[]>(user?.interests ?? []);
  const [budgetMin, setBudgetMin] = useState(String(user?.defaultBudgetMin ?? 0));
  const [budgetMax, setBudgetMax] = useState(String(user?.defaultBudgetMax ?? 1500));
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [routeMessage, setRouteMessage] = useState<string | null>(null);
  const [routeStart, setRouteStart] = useState<StationCandidate | null>(null);
  const [routeEnd, setRouteEnd] = useState<StationCandidate | null>(null);
  const [routeForm, setRouteForm] = useState({
    name: "",
    startType: "station" as RouteEndpointType,
    startName: user?.homeStation ?? "",
    startLat: "",
    startLng: "",
    endType: "station" as RouteEndpointType,
    endName: user?.schoolOrWorkStation ?? "",
    endLat: "",
    endLng: "",
    travelMode: "transit" as RouteTravelMode,
    viaStationNames: "",
    usualDepartureTime: "",
    usualArrivalTime: ""
  });

  const selectedRoute = useMemo(
    () => (selectedRouteId ? routes.find((route) => route.id === selectedRouteId) : undefined),
    [routes, selectedRouteId]
  );

  useEffect(() => {
    setName(user?.name ?? "");
    setAgeRange(user?.ageRange ?? "");
    setInterests(user?.interests ?? []);
    setBudgetMin(String(user?.defaultBudgetMin ?? 0));
    setBudgetMax(String(user?.defaultBudgetMax ?? 1500));
    setRouteStart(null);
    setRouteEnd(null);
    setRouteForm((current) => ({
      ...current,
      startName: current.startName || user?.homeStation || "",
      endName: current.endName || user?.schoolOrWorkStation || ""
    }));
  }, [user?.id]);

  const toggleInterest = (tag: string) => {
    setInterests((current) => (current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]));
  };

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileMessage(null);
    const min = parseNumber(budgetMin);
    const max = parseNumber(budgetMax);

    if (min != null && max != null && min > max) {
      setProfileMessage("最低予算は最高予算以下にしてください。");
      return;
    }

    await onProfileUpdate({
      name: name.trim(),
      ageRange: ageRange || null,
      interests,
      defaultBudgetMin: min,
      defaultBudgetMax: max
    });

    setProfileMessage("プロフィールを保存しました。");
  };

  const resolveRouteStation = async (point: "start" | "end") => {
    const isStart = point === "start";
    const type = isStart ? routeForm.startType : routeForm.endType;
    const name = (isStart ? routeForm.startName : routeForm.endName).trim();
    const candidate = isStart ? routeStart : routeEnd;

    if (type === "pin" || !name) {
      return candidate;
    }

    if (candidate?.name === name) {
      return candidate;
    }

    const payload = await api.stations({
      keyword: name,
      lat: currentLocation.lat,
      lng: currentLocation.lng,
      limit: 1
    });
    return payload.items[0] ?? null;
  };

  const handleRouteSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRouteMessage(null);
    let resolvedStart = routeStart;
    let resolvedEnd = routeEnd;

    try {
      [resolvedStart, resolvedEnd] = await Promise.all([resolveRouteStation("start"), resolveRouteStation("end")]);
    } catch {
      setRouteMessage("駅候補を取得できませんでした。駅名を候補から選択するか、ピン指定で保存してください。");
      return;
    }

    if (resolvedStart && resolvedStart !== routeStart) {
      setRouteStart(resolvedStart);
    }
    if (resolvedEnd && resolvedEnd !== routeEnd) {
      setRouteEnd(resolvedEnd);
    }

    const payload = buildRoutePayload(routeForm, resolvedStart, resolvedEnd);
    if (!payload) {
      setRouteMessage("駅名から候補を特定できませんでした。候補から選択するか、ピン指定で緯度・経度を入力してください。");
      return;
    }

    try {
      await onRouteCreate(payload);
      setRouteMessage("マイルートを保存しました。");
      setRouteForm((current) => ({ ...current, name: "", viaStationNames: "" }));
    } catch {
      setRouteMessage("マイルートを保存できませんでした。入力内容とDBの更新状態を確認してください。");
    }
  };

  const handleRoutePointTypeChange = (point: "start" | "end", type: RouteEndpointType) => {
    setRouteForm((current) => {
      const candidate = point === "start" ? routeStart : routeEnd;
      const lat = candidate?.lat ?? currentLocation.lat;
      const lng = candidate?.lng ?? currentLocation.lng;

      return point === "start"
        ? {
            ...current,
            startType: type,
            startLat: type === "pin" ? String(lat) : current.startLat,
            startLng: type === "pin" ? String(lng) : current.startLng
          }
        : {
            ...current,
            endType: type,
            endLat: type === "pin" ? String(lat) : current.endLat,
            endLng: type === "pin" ? String(lng) : current.endLng
          };
    });
  };

  const useCurrentLocationAsPin = (point: "start" | "end") => {
    const lat = String(currentLocation.lat);
    const lng = String(currentLocation.lng);
    setRouteForm((current) =>
      point === "start"
        ? { ...current, startType: "pin", startName: current.startName || "現在地", startLat: lat, startLng: lng }
        : { ...current, endType: "pin", endName: current.endName || "現在地", endLat: lat, endLng: lng }
    );
    if (point === "start") {
      setRouteStart(null);
    } else {
      setRouteEnd(null);
    }
  };

  const renderRoutePointEditor = (point: "start" | "end") => {
    const isStart = point === "start";
    const type = isStart ? routeForm.startType : routeForm.endType;
    const inputValue = isStart ? routeForm.startName : routeForm.endName;
    const candidate = isStart ? routeStart : routeEnd;
    const latValue = isStart ? routeForm.startLat : routeForm.endLat;
    const lngValue = isStart ? routeForm.startLng : routeForm.endLng;
    const title = isStart ? "出発" : "到着";
    const setCandidate = isStart ? setRouteStart : setRouteEnd;

    return (
      <div className="route-point-editor">
        <div className="route-point-head">
          <span>{title}指定</span>
          <div className="segmented route-point-tabs" aria-label={`${title}指定方法`}>
            {routeEndpointTypeOptions.map((option) => (
              <button
                className={`segment ${type === option.value ? "active" : ""}`}
                key={option.value}
                onClick={() => handleRoutePointTypeChange(point, option.value)}
                type="button"
              >
                {option.value === "station" ? <TrainFront size={16} /> : <MapPinned size={16} />}
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        {type === "station" ? (
          <StationSearchField
            currentLocation={currentLocation}
            helper="候補から選ぶとルート計算用の座標が入ります。"
            inputValue={inputValue}
            label={`${title}駅`}
            onInputChange={(nextValue) => {
              setRouteForm((current) =>
                isStart ? { ...current, startName: nextValue } : { ...current, endName: nextValue }
              );
              if (nextValue !== candidate?.name) {
                setCandidate(null);
              }
            }}
            onSelect={(station) => {
              setCandidate(station);
              setRouteForm((current) =>
                isStart ? { ...current, startName: station.name } : { ...current, endName: station.name }
              );
            }}
            placeholder="駅名を検索"
            required
            value={candidate}
          />
        ) : (
          <div className="route-pin-fields">
            <label className="field">
              <span>{title}ピン名</span>
              <input
                className="input-like"
                onChange={(event) =>
                  setRouteForm((current) =>
                    isStart ? { ...current, startName: event.target.value } : { ...current, endName: event.target.value }
                  )
                }
                placeholder={isStart ? "例: 学校の正門" : "例: 自宅前"}
                value={inputValue}
              />
            </label>
            <div className="form-grid two">
              <label className="field">
                <span>緯度</span>
                <input
                  className="input-like"
                  max={90}
                  min={-90}
                  onChange={(event) =>
                    setRouteForm((current) =>
                      isStart ? { ...current, startLat: event.target.value } : { ...current, endLat: event.target.value }
                    )
                  }
                  step="0.000001"
                  type="number"
                  value={latValue}
                />
              </label>
              <label className="field">
                <span>経度</span>
                <input
                  className="input-like"
                  max={180}
                  min={-180}
                  onChange={(event) =>
                    setRouteForm((current) =>
                      isStart ? { ...current, startLng: event.target.value } : { ...current, endLng: event.target.value }
                    )
                  }
                  step="0.000001"
                  type="number"
                  value={lngValue}
                />
              </label>
            </div>
            <button className="secondary-action route-pin-button" onClick={() => useCurrentLocationAsPin(point)} type="button">
              <MapPinned size={17} />
              現在地をピンにする
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="page">
      <div className="profile-head">
        <div className="profile-avatar">{(user?.name ?? "Y").slice(0, 1)}</div>
        <div>
          <div className="title">{user?.name ?? "ログイン前"}</div>
          <div className="meta">{user?.email ?? "ログインするとルート履歴を同期できます"}</div>
        </div>
      </div>

      <div className="info-grid profile-grid">
        <div className="info-cell">
          <div className="cell-label">興味</div>
          <div className="cell-value">{interests.length}</div>
        </div>
        <div className="info-cell">
          <div className="cell-label">予算</div>
          <div className="cell-value">{formatMoney(user?.defaultBudgetMax)}</div>
        </div>
        <div className="info-cell wide">
          <div className="cell-label">選択中ルート</div>
          <div className="cell-value">{selectedRoute ? formatRouteWithMode(selectedRoute) : "未設定"}</div>
        </div>
      </div>

      <section className="settings-section">
        <div className="section-title-row">
          <div>
            <div className="eyebrow">アカウント設定</div>
            <h2>プロフィール変更</h2>
          </div>
          {onLogout ? (
            <button className="secondary-action" onClick={onLogout} type="button">
              ログアウト
            </button>
          ) : null}
        </div>
        <form className="form" onSubmit={handleProfileSubmit}>
          {profileMessage ? <p className="inline-alert">{profileMessage}</p> : null}
          <label className="field">
            <span>表示名</span>
            <input className="input-like" onChange={(event) => setName(event.target.value)} required value={name} />
          </label>
          <label className="field">
            <span>年代</span>
            <select className="input-like" onChange={(event) => setAgeRange(event.target.value)} value={ageRange}>
              <option value="">未選択</option>
              {["10代", "20代", "30代", "40代", "50代", "60代以上"].map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <div className="field">
            <span>興味</span>
            <div className="interest-grid">
              {interestOptions.map((tag) => (
                <button className="app-chip" data-active={interests.includes(tag)} key={tag} onClick={() => toggleInterest(tag)} type="button">
                  {tag}
                </button>
              ))}
            </div>
          </div>
          <div className="form-grid two">
            <label className="field">
              <span>最低予算</span>
              <input className="input-like" min={0} onChange={(event) => setBudgetMin(event.target.value)} type="number" value={budgetMin} />
            </label>
            <label className="field">
              <span>最高予算</span>
              <input className="input-like" min={0} onChange={(event) => setBudgetMax(event.target.value)} type="number" value={budgetMax} />
            </label>
          </div>
          <button className="primary-action submit" disabled={loading} type="submit">
            <Save size={18} />
            プロフィールを保存
          </button>
        </form>
      </section>

      <section className="settings-section">
        <div className="section-title-row">
          <div>
            <div className="eyebrow">いつもの移動</div>
            <h2>駅指定とマイルート</h2>
          </div>
        </div>
        <form className="form" onSubmit={handleRouteSubmit}>
          {routeMessage ? <p className="inline-alert">{routeMessage}</p> : null}
          <label className="field">
            <span>ルート名</span>
            <input
              className="input-like"
              onChange={(event) => setRouteForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="学校帰りの寄り道ルート"
              value={routeForm.name}
            />
          </label>
          <label className="field">
            <span>移動手段</span>
            <div className="segmented route-mode-tabs" aria-label="移動手段">
              {routeTravelModeOptions.map((option) => (
                <button
                  className={`segment ${routeForm.travelMode === option.value ? "active" : ""}`}
                  key={option.value}
                  onClick={() => setRouteForm((current) => ({ ...current, travelMode: option.value }))}
                  type="button"
                >
                  <RouteModeIcon mode={option.value} />
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </label>
          <div className="form-grid two route-point-grid">
            {renderRoutePointEditor("start")}
            {renderRoutePointEditor("end")}
          </div>
          <label className="field">
            <span>経由駅</span>
            <input
              className="input-like"
              onChange={(event) => setRouteForm((current) => ({ ...current, viaStationNames: event.target.value }))}
              placeholder="神田, 御茶ノ水"
              value={routeForm.viaStationNames}
            />
          </label>
          <div className="form-grid two">
            <label className="field">
              <span>いつもの出発</span>
              <input
                className="input-like"
                onChange={(event) => setRouteForm((current) => ({ ...current, usualDepartureTime: event.target.value }))}
                placeholder="18:30"
                value={routeForm.usualDepartureTime}
              />
            </label>
            <label className="field">
              <span>いつもの到着</span>
              <input
                className="input-like"
                onChange={(event) => setRouteForm((current) => ({ ...current, usualArrivalTime: event.target.value }))}
                placeholder="19:10"
                value={routeForm.usualArrivalTime}
              />
            </label>
          </div>
          <button className="primary-action submit" disabled={loading} type="submit">
            <Plus size={18} />
            マイルートを追加
          </button>
        </form>

        <div className="route-list">
          {routes.length === 0 ? <div className="empty-state">マイルートはまだありません。出発駅と到着駅を指定してください。</div> : null}
          {routes.map((route) => (
            <article className="route-card" data-active={route.id === selectedRouteId} key={route.id}>
              <button className="route-card-main" onClick={() => onRouteSelect(route.id)} type="button">
                <strong>{route.name}</strong>
                <span>{formatRouteEndpoints(route)}</span>
                <small>{routeTravelModeLabel(route.travelMode)}</small>
                {route.viaStationNames.length > 0 ? <small>経由: {route.viaStationNames.join(" / ")}</small> : null}
              </button>
              <button className="icon-button danger" onClick={() => onRouteDelete(route.id)} type="button" aria-label={`${route.name}を削除`}>
                <Trash2 size={18} />
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
