import { useCallback, useEffect, useMemo, useState } from "react";
import { AccountSetup } from "./components/AccountSetup";
import { AuthGate, type AuthMode, type AuthSubmitPayload } from "./components/AuthDialog";
import { tabToPath, type AppTab } from "./components/BottomNav";
import { DesktopLayout } from "./components/DesktopLayout";
import { MobileLayout } from "./components/MobileLayout";
import { api } from "./lib/api";
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
} from "./lib/types";

const tokenStorageKey = "yorimo.accessToken";
const desktopQuery = "(min-width: 900px)";
const defaultMapCenter = { lat: 35.681236, lng: 139.767125 };

const routeStartLocation = (route: Route) => ({ lat: route.startLat, lng: route.startLng });

const routeMidpoint = (route: Route) => ({
  lat: (route.startLat + route.endLat) / 2,
  lng: (route.startLng + route.endLng) / 2
});

const pathToTab = (path: string): AppTab => {
  const normalizedPath = path.replace(/\/+$/, "") || "/";
  if (normalizedPath === "/recommendations") return "recommendations";
  if (normalizedPath === "/short" || normalizedPath === "/posts" || normalizedPath === "/feed") return "create";
  if (normalizedPath === "/saved") return "saved";
  if (normalizedPath === "/profile" || normalizedPath === "/routes") return "profile";
  return "map";
};

const canonicalPathFor = (path: string) => tabToPath[pathToTab(path)];

const getStoredToken = () => {
  try {
    return window.localStorage.getItem(tokenStorageKey);
  } catch {
    return null;
  }
};

const saveToken = (token: string | null) => {
  try {
    if (token) {
      window.localStorage.setItem(tokenStorageKey, token);
    } else {
      window.localStorage.removeItem(tokenStorageKey);
    }
  } catch {
    // localStorage can be unavailable in strict browser contexts.
  }
};

const useIsDesktop = () => {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === "undefined") return true;
    if (typeof window.matchMedia === "function") return window.matchMedia(desktopQuery).matches;
    return window.innerWidth >= 900;
  });

  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return undefined;
    }

    const media = window.matchMedia(desktopQuery);
    const handleChange = () => setIsDesktop(media.matches);
    handleChange();
    media.addEventListener("change", handleChange);

    return () => media.removeEventListener("change", handleChange);
  }, []);

  return isDesktop;
};

function App() {
  const isDesktop = useIsDesktop();
  const [activeTab, setActiveTab] = useState<AppTab>(() => {
    if (typeof window === "undefined") return "map";
    return pathToTab(window.location.pathname);
  });
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [accountSetupOpen, setAccountSetupOpen] = useState(false);
  const [accountSetupError, setAccountSetupError] = useState<string | null>(null);
  const [accountSetupSubmitting, setAccountSetupSubmitting] = useState(false);
  const [sessionChecking, setSessionChecking] = useState(() => Boolean(getStoredToken()));
  const [detailOpen, setDetailOpen] = useState(false);
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [user, setUser] = useState<User | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number }>(defaultMapCenter);
  const [currentLocationResolved, setCurrentLocationResolved] = useState(false);
  const [routeDataReady, setRouteDataReady] = useState(() => !Boolean(getStoredToken()));
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [savedSpots, setSavedSpots] = useState<SavedSpot[]>([]);
  const [feedPosts, setFeedPosts] = useState<Post[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [activeTags, setActiveTags] = useState(["甘いもの"]);
  const [availableMinutes, setAvailableMinutes] = useState(45);
  const [budgetMax, setBudgetMax] = useState(1500);
  const [loading, setLoading] = useState(false);
  const [apiMessage, setApiMessage] = useState<string | null>(null);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);

  const currentRoute = selectedRouteId ? routes.find((route) => route.id === selectedRouteId) : undefined;
  const effectiveCurrentLocation = currentLocationResolved
    ? currentLocation
    : currentRoute
      ? routeStartLocation(currentRoute)
      : defaultMapCenter;
  const mapCenter = currentLocationResolved ? currentLocation : currentRoute ? routeMidpoint(currentRoute) : defaultMapCenter;
  const mood = activeTags.length > 0 ? activeTags.join(" / ") : "寄り道したい";

  const selectedRecommendation = useMemo(
    () => recommendations.find((item) => item.spot.id === selectedSpot?.id),
    [recommendations, selectedSpot?.id]
  );

  const requestCurrentLocation = useCallback((silent = false) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationMessage("このブラウザではGPS現在地を取得できません。");
      return;
    }

    if (!silent) {
      setLocationMessage("GPSで現在地を確認しています。");
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setCurrentLocationResolved(true);
        setLocationMessage(null);
      },
      () => {
        setCurrentLocationResolved(false);
        setLocationMessage("現在地を取得できませんでした。ブラウザの位置情報許可を確認してください。");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 60_000,
        timeout: 10_000
      }
    );
  }, []);

  const refreshRecommendations = useCallback(
    async (nextToken = token, nextRoutes = routes, nextSelectedRouteId: string | null | undefined = undefined) => {
      if (!nextToken) {
        setRecommendations([]);
        setApiMessage(null);
        return;
      }

      setLoading(true);
      try {
        const routeId = nextSelectedRouteId === undefined ? selectedRouteId : nextSelectedRouteId;
        const routeForRequest = routeId ? nextRoutes.find((route) => route.id === routeId) : undefined;
        const origin = currentLocationResolved
          ? currentLocation
          : routeForRequest
            ? routeStartLocation(routeForRequest)
            : currentLocation;
        const result = await api.recommendations(nextToken, {
          currentLat: origin.lat,
          currentLng: origin.lng,
          routeId: routeForRequest?.id ?? null,
          availableMinutes,
          budgetMax,
          mood,
          interestTags: activeTags
        });
        setRecommendations(result.items);
        setSpots(result.items.map((item) => item.spot));
        setSelectedSpot(result.items[0]?.spot ?? null);
        setApiMessage(null);
      } catch (error) {
        setRecommendations([]);
        setApiMessage("現在地周辺のおすすめを取得できませんでした。時間をおいてもう一度お試しください。");
      } finally {
        setLoading(false);
      }
    },
    [
      activeTags,
      availableMinutes,
      budgetMax,
      currentLocation,
      currentLocationResolved,
      currentLocation.lat,
      currentLocation.lng,
      mood,
      routes,
      selectedRouteId,
      token
    ]
  );

  const refreshUserCollections = useCallback(
    async (nextToken = token) => {
      if (!nextToken) {
        setSavedSpots([]);
        setFeedPosts([]);
        return;
      }

      try {
        const [savedItems, feedItems] = await Promise.all([api.savedSpots(nextToken), api.feed(nextToken)]);
        setSavedSpots(savedItems);
        setFeedPosts(feedItems);
      } catch {
        setApiMessage("保存スポットまたはフィードを更新できませんでした。");
      }
    },
    [token]
  );

  useEffect(() => {
    if (!token || !user) {
      return;
    }
    if (selectedRouteId) {
      return;
    }
    if (!currentLocationResolved) {
      return;
    }

    let mounted = true;

    api
      .spots({ lat: currentLocation.lat, lng: currentLocation.lng, radiusKm: 5, limit: 40 })
      .then((result) => {
        if (!mounted) return;
        setSpots(result.items);
        setSelectedSpot((current) => current ?? result.items[0] ?? null);
      })
      .catch(() => {
        if (mounted) {
          setApiMessage("現在地周辺の店舗情報を更新できませんでした。");
        }
      });

    return () => {
      mounted = false;
    };
  }, [currentLocation.lat, currentLocation.lng, currentLocationResolved, selectedRouteId, token, user]);

  useEffect(() => {
    if (user) {
      requestCurrentLocation();
    }
  }, [requestCurrentLocation, user]);

  useEffect(() => {
    if (!token) {
      setRouteDataReady(true);
      setSessionChecking(false);
      return;
    }

    let mounted = true;
    setSessionChecking(true);
    setRouteDataReady(false);

    api
      .me(token)
      .then(async (me) => {
        const routeItems = await api.routes(token);
        if (!mounted) return;
        const nextSelectedRouteId = routeItems[0]?.id ?? null;
        setRoutes(routeItems);
        setSelectedRouteId(nextSelectedRouteId);
        setUser(me);
        setRouteDataReady(true);
        setSessionChecking(false);
        void refreshUserCollections(token);
      })
      .catch(() => {
        if (!mounted) return;
        saveToken(null);
        setToken(null);
        setUser(null);
        setRoutes([]);
        setSelectedRouteId(null);
        setRouteDataReady(true);
        setSessionChecking(false);
        setApiMessage("セッションの有効期限が切れました。再度ログインしてください。");
      });

    return () => {
      mounted = false;
    };
  }, [token]);

  const handleAuthOpen = (mode: AuthMode = "login") => {
    setAuthError(null);
    setAuthMode(mode);
  };

  const handleAuthSubmit = async (mode: AuthMode, payload: AuthSubmitPayload) => {
    setAuthSubmitting(true);
    setAuthError(null);
    try {
      const result =
        mode === "login"
          ? await api.login(payload.email, payload.password)
          : await api.register({
              email: payload.email,
              name: payload.name ?? payload.email.split("@")[0],
              password: payload.password
            });
      saveToken(result.token);
      setToken(result.token);
      setUser(result.user);
      setAccountSetupOpen(mode === "register");
      setAccountSetupError(null);
      setRouteDataReady(mode === "register");
      setSessionChecking(mode === "login");
      setApiMessage(null);
    } catch (error) {
      setAuthError(
        mode === "login"
          ? "ログインできませんでした。メールアドレスとパスワードを確認してください。"
          : "アカウントを作成できませんでした。入力内容を確認してください。"
      );
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = () => {
    saveToken(null);
    setToken(null);
    setUser(null);
    setAccountSetupOpen(false);
    setAccountSetupError(null);
    setSessionChecking(false);
    setRoutes([]);
    setSelectedRouteId(null);
    setCurrentLocationResolved(false);
    setRouteDataReady(true);
    setSpots([]);
    setSavedSpots([]);
    setFeedPosts([]);
    setRecommendations([]);
    setSelectedSpot(null);
    setApiMessage(null);
    setLocationMessage(null);
  };

  const handleTabChange = (tab: AppTab) => {
    setDetailOpen(false);
    setActiveTab(tab);
    if (typeof window !== "undefined" && window.location.pathname !== tabToPath[tab]) {
      window.history.pushState({ tab }, "", tabToPath[tab]);
    }
  };

  useEffect(() => {
    const canonicalPath = canonicalPathFor(window.location.pathname);
    if (window.location.pathname !== canonicalPath) {
      window.history.replaceState({ tab: pathToTab(canonicalPath) }, "", canonicalPath);
    }

    const handlePopState = () => {
      setDetailOpen(false);
      setActiveTab(pathToTab(window.location.pathname));
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleSpotSelect = (spot: Spot) => {
    setSelectedSpot(spot);
    setDetailOpen(!isDesktop && activeTab !== "map");
  };

  const handleSpotAction = async (action: FeedbackAction, spot: Spot) => {
    setSelectedSpot(spot);

    if (!token) {
      setApiMessage("保存や訪問記録にはログインが必要です。");
      handleAuthOpen("login");
      return;
    }

    const successMessage =
      action === "save"
        ? `${spot.name}を保存しました。`
        : action === "visited"
          ? `${spot.name}を訪問済みにしました。`
          : action === "report"
            ? `${spot.name}を通報候補として記録しました。`
            : `${spot.name}を今後の候補から下げます。`;

    setLoading(true);
    try {
      await api.feedback(token, spot.id, action);
      if (action === "save") {
        void refreshUserCollections(token);
      }
      setApiMessage(successMessage);
    } catch {
      setApiMessage("操作を完了できませんでした。時間をおいてもう一度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  const handleTagToggle = (tag: string) => {
    setActiveTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]
    );
  };

  const handleAccountSetupSubmit = async (payload: ProfileUpdatePayload) => {
    if (!token) {
      setAccountSetupError("セッションを確認できませんでした。再度ログインしてください。");
      return;
    }

    setAccountSetupSubmitting(true);
    setAccountSetupError(null);
    try {
      const updatedUser = await api.updateProfile(token, payload);
      setUser(updatedUser);
      setActiveTags(updatedUser.interests.length > 0 ? updatedUser.interests : activeTags);
      if (updatedUser.defaultBudgetMax != null) {
        setBudgetMax(updatedUser.defaultBudgetMax);
      }
      setAccountSetupOpen(false);
      setApiMessage(null);
    } catch {
      setAccountSetupError("プロフィールを保存できませんでした。入力内容を確認してください。");
    } finally {
      setAccountSetupSubmitting(false);
    }
  };

  const handleProfileUpdate = async (payload: ProfileUpdatePayload) => {
    if (!token) {
      setApiMessage("プロフィール変更にはログインが必要です。");
      return;
    }

    setLoading(true);
    try {
      const updatedUser = await api.updateProfile(token, payload);
      setUser(updatedUser);
      setActiveTags(updatedUser.interests.length > 0 ? updatedUser.interests : activeTags);
      if (updatedUser.defaultBudgetMax != null) {
        setBudgetMax(updatedUser.defaultBudgetMax);
      }
      setApiMessage("プロフィールを保存しました。");
      await refreshRecommendations(token, routes, selectedRouteId);
    } catch {
      setApiMessage("プロフィールを保存できませんでした。入力内容を確認してください。");
    } finally {
      setLoading(false);
    }
  };

  const handleRouteCreate = async (payload: RoutePayload) => {
    if (!token) {
      setApiMessage("マイルート作成にはログインが必要です。");
      return;
    }

    setLoading(true);
    try {
      const existingRoute = routes.find((route) => route.name === payload.name);
      const savedRoute = existingRoute
        ? await api.updateRoute(token, existingRoute.id, payload)
        : await api.createRoute(token, payload);
      const nextRoutes = [savedRoute, ...routes.filter((route) => route.id !== savedRoute.id)];
      setRoutes(nextRoutes);
      setSelectedRouteId(savedRoute.id);
      setApiMessage(existingRoute ? "マイルートを更新しました。" : "マイルートを保存しました。");
      await refreshRecommendations(token, nextRoutes, savedRoute.id);
    } catch {
      setApiMessage("マイルートを保存できませんでした。駅指定を確認してください。");
      throw new Error("Route save failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRouteDelete = async (routeId: string) => {
    if (!token) {
      setApiMessage("マイルート削除にはログインが必要です。");
      return;
    }

    setLoading(true);
    try {
      await api.deleteRoute(token, routeId);
      const nextRoutes = routes.filter((route) => route.id !== routeId);
      setRoutes(nextRoutes);
      const nextSelectedRouteId = selectedRouteId === routeId ? nextRoutes[0]?.id ?? null : selectedRouteId;
      setSelectedRouteId(nextSelectedRouteId);
      setApiMessage("マイルートを削除しました。");
      await refreshRecommendations(token, nextRoutes, nextSelectedRouteId);
    } catch {
      setApiMessage("マイルートを削除できませんでした。");
    } finally {
      setLoading(false);
    }
  };

  const handleRouteSelect = (routeId: string | null) => {
    setSelectedRouteId(routeId);
    setApiMessage(routeId ? "このマイルートを推薦条件に使います。" : "現在地周辺のみで推薦します。");
    void refreshRecommendations(token, routes, routeId);
  };

  const handlePostCreate = async (payload: PostCreatePayload) => {
    if (!token) {
      setApiMessage("投稿にはログインが必要です。");
      return;
    }

    setLoading(true);
    try {
      const created = await api.createPost(token, payload);
      setFeedPosts((current) => [created, ...current]);
      setApiMessage(payload.type === "short_video" ? "リールを投稿しました。" : "投稿を作成しました。");
      await refreshUserCollections(token);
    } catch {
      setApiMessage("投稿を作成できませんでした。スポット、URL、公開範囲を確認してください。");
    } finally {
      setLoading(false);
    }
  };

  const handleSavedDelete = async (spotId: string) => {
    if (!token) {
      setApiMessage("保存解除にはログインが必要です。");
      return;
    }

    setLoading(true);
    try {
      await api.deleteSavedSpot(token, spotId);
      setSavedSpots((current) => current.filter((item) => item.spotId !== spotId));
      setApiMessage("保存を解除しました。");
    } catch {
      setApiMessage("保存を解除できませんでした。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && routeDataReady) {
      void refreshRecommendations();
    }
  }, [
    activeTags,
    availableMinutes,
    budgetMax,
    currentLocation.lat,
    currentLocation.lng,
    currentLocationResolved,
    routeDataReady
  ]);

  const commonProps = {
    activeTab,
    apiMessage: apiMessage ?? locationMessage,
    availableMinutes,
    budgetMax,
    currentLocation: effectiveCurrentLocation,
    mapCenter,
    showCurrentLocation: currentLocationResolved,
    loading,
    mood,
    onAvailableMinutesChange: setAvailableMinutes,
    onBudgetMaxChange: setBudgetMax,
    onAuthOpen: handleAuthOpen,
    onLocateMe: () => requestCurrentLocation(),
    onRefresh: () => void refreshRecommendations(),
    onFeedRefresh: () => void refreshUserCollections(),
    onPostCreate: handlePostCreate,
    onProfileUpdate: handleProfileUpdate,
    onRouteCreate: handleRouteCreate,
    onRouteDelete: handleRouteDelete,
    onRouteSelect: handleRouteSelect,
    onSavedDelete: handleSavedDelete,
    onSpotAction: handleSpotAction,
    onSpotSelect: handleSpotSelect,
    onTabChange: handleTabChange,
    onTagToggle: handleTagToggle,
    recommendations,
    route: currentRoute,
    routes,
    selectedRouteId,
    selectedRecommendation,
    selectedSpot,
    feedPosts,
    savedSpots,
    spots,
    tags: activeTags,
    user
  };

  if (!user) {
    return (
      <AuthGate
        error={authError}
        loading={authSubmitting || sessionChecking}
        mode={authMode}
        onModeChange={(mode) => {
          setAuthError(null);
          setAuthMode(mode);
        }}
        onSubmit={handleAuthSubmit}
        statusMessage={sessionChecking ? "セッションを確認しています。" : apiMessage}
      />
    );
  }

  if (accountSetupOpen) {
    return (
      <AccountSetup
        error={accountSetupError}
        loading={accountSetupSubmitting}
        onSubmit={handleAccountSetupSubmit}
        user={user}
      />
    );
  }

  if (!routeDataReady) {
    return (
      <AuthGate
        error={authError}
        loading
        mode={authMode}
        onModeChange={(mode) => {
          setAuthError(null);
          setAuthMode(mode);
        }}
        onSubmit={handleAuthSubmit}
        statusMessage="ルート情報を読み込んでいます。"
      />
    );
  }

  return (
    <>
      {isDesktop ? (
        <DesktopLayout {...commonProps} onLogout={handleLogout} />
      ) : (
        <MobileLayout
          {...commonProps}
          detailOpen={detailOpen}
          onDetailClose={() => setDetailOpen(false)}
          user={user}
        />
      )}
    </>
  );
}

export default App;
