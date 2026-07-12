import { BottomNav, type AppTab } from "./BottomNav";
import { MapHome } from "./MapHome";
import {
  CreatePostPage,
  ProfilePage,
  RecommendationsPage,
  SavedPage,
  SpotDetailPage
} from "./Pages";
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
  detailOpen: boolean;
  loading: boolean;
  mood: string;
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
  onDetailClose: () => void;
  onFeedRefresh: () => void;
  onLocateMe?: () => void;
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

export function MobileLayout({
  activeTab,
  apiMessage,
  availableMinutes,
  budgetMax,
  currentLocation,
  mapCenter,
  showCurrentLocation,
  detailOpen,
  loading,
  mood,
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
  onDetailClose,
  onFeedRefresh,
  onLocateMe,
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
  const content = detailOpen ? (
    <SpotDetailPage item={selectedRecommendation} onAction={onSpotAction} onClose={onDetailClose} spot={selectedSpot} />
  ) : activeTab === "recommendations" ? (
    <RecommendationsPage
      availableMinutes={availableMinutes}
      budgetMax={budgetMax}
      currentLocation={currentLocation}
      items={recommendations}
      onSpotSelect={onSpotSelect}
      onSpotAction={onSpotAction}
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
  ) : activeTab === "profile" ? (
    <ProfilePage
      currentLocation={currentLocation}
      loading={loading}
      onProfileUpdate={onProfileUpdate}
      onRouteCreate={onRouteCreate}
      onRouteDelete={onRouteDelete}
      onRouteSelect={onRouteSelect}
      routes={routes}
      selectedRouteId={selectedRouteId}
      user={user}
    />
  ) : (
    <MapHome
      activeTags={tags}
      apiMessage={apiMessage}
      availableMinutes={availableMinutes}
      budgetMax={budgetMax}
      currentLocation={currentLocation}
      mapCenter={mapCenter}
      loading={loading}
      mood={mood}
      onAvailableMinutesChange={onAvailableMinutesChange}
      onBudgetMaxChange={onBudgetMaxChange}
      isAuthenticated={Boolean(user)}
      onAuthOpen={onAuthOpen}
      onLocateMe={onLocateMe}
      onRefresh={onRefresh}
      onRouteSelect={onRouteSelect}
      onSpotAction={onSpotAction}
      onSpotSelect={onSpotSelect}
      onTagToggle={onTagToggle}
      recommendations={recommendations}
      route={route}
      routes={routes}
      selectedRouteId={selectedRouteId}
      selectedSpot={selectedSpot}
      showCurrentLocation={showCurrentLocation}
      spots={spots}
    />
  );

  return (
    <main className="mobile-experience" data-testid="mobile-experience">
      {content}

      <BottomNav activeTab={activeTab} onTabChange={onTabChange} />
    </main>
  );
}
