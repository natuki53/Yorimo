export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiFailure = {
  success: false;
  error: {
    code: string;
    message: string;
  };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export type User = {
  id: string;
  name: string;
  email: string;
  ageRange?: string | null;
  homeStation?: string | null;
  schoolOrWorkStation?: string | null;
  interests: string[];
  defaultBudgetMin?: number | null;
  defaultBudgetMax?: number | null;
  createdAt?: string;
  updatedAt?: string;
};

export type AuthPayload = {
  user: User;
  token: string;
};

export type ProfileUpdatePayload = {
  name?: string;
  ageRange?: string | null;
  homeStation?: string | null;
  schoolOrWorkStation?: string | null;
  interests?: string[];
  defaultBudgetMin?: number | null;
  defaultBudgetMax?: number | null;
};

export type Route = {
  id: string;
  userId?: string;
  name: string;
  startType: RouteEndpointType;
  startName: string;
  startLat: number;
  startLng: number;
  endType: RouteEndpointType;
  endName: string;
  endLat: number;
  endLng: number;
  travelMode: RouteTravelMode;
  viaStationNames: string[];
  usualDepartureTime?: string | null;
  usualArrivalTime?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type RoutePayload = {
  name: string;
  startType?: RouteEndpointType;
  startName: string;
  startLat: number;
  startLng: number;
  endType?: RouteEndpointType;
  endName: string;
  endLat: number;
  endLng: number;
  travelMode?: RouteTravelMode;
  viaStationNames?: string[];
  usualDepartureTime?: string | null;
  usualArrivalTime?: string | null;
};

export type RouteEndpointType = "station" | "pin";
export type RouteTravelMode = "transit" | "driving" | "walking" | "bicycling";

export type GeoPoint = {
  lat: number;
  lng: number;
};

export type RailRoutePayload = {
  points: GeoPoint[];
  source: "osm" | "none";
  total: number;
};

export type StationCandidate = {
  id: string;
  name: string;
  address?: string | null;
  lat: number;
  lng: number;
  primaryType?: string | null;
  types: string[];
};

export type StationSearchPayload = {
  items: StationCandidate[];
  total: number;
};

export type Spot = {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  lat: number;
  lng: number;
  address?: string | null;
  stationName?: string | null;
  priceMin?: number | null;
  priceMax?: number | null;
  openingHours?: string | null;
  tags: string[];
  imageUrl?: string | null;
  averageStayMinutes?: number | null;
};

export type SpotsPayload = {
  items: Spot[];
  total: number;
};

export type ScoreBreakdown = {
  behavior: number;
  route: number;
  interest: number;
  time: number;
  budget: number;
  mood: number;
  freshness: number;
};

export type RecommendationItem = {
  spot: Spot;
  yorimichiScore: number;
  scoreBreakdown: ScoreBreakdown;
  reasons: string[];
};

export type RecommendationsPayload = {
  items: RecommendationItem[];
};

export type RecommendationRequest = {
  currentLat: number;
  currentLng: number;
  routeId?: string | null;
  availableMinutes: number;
  budgetMin?: number | null;
  budgetMax?: number | null;
  mood?: string | null;
  interestTags: string[];
};

export type PostType = "photo" | "short_video" | "story" | "review";
export type Visibility = "public" | "followers" | "private";
export type FeedbackAction = "view" | "save" | "skip" | "visited" | "like" | "dislike" | "report";

export type Post = {
  id: string;
  userId: string;
  spotId: string;
  type: PostType;
  mediaUrl?: string | null;
  caption?: string | null;
  rating?: number | null;
  moodTags: string[];
  crowdLevel?: string | null;
  stayMinutes?: number | null;
  budgetUsed?: number | null;
  visibility: Visibility;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  user?: {
    id: string;
    name: string;
  };
  spot?: Spot;
};

export type PostsPayload = {
  items: Post[];
  total: number;
};

export type PostCreatePayload = {
  spotId: string;
  type: PostType;
  mediaUrl?: string | null;
  caption?: string | null;
  rating?: number | null;
  moodTags?: string[];
  crowdLevel?: string | null;
  stayMinutes?: number | null;
  budgetUsed?: number | null;
  visibility?: Visibility;
  expiresAt?: string | null;
};

export type SavedSpot = {
  userId: string;
  spotId: string;
  createdAt: string;
  spot: Spot;
};
