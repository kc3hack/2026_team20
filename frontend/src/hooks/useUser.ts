"use client";

import { useCallback, useEffect, useState } from "react";
import { type PlotItem, type UserProfile, api } from "@/lib/api";

interface UseUserResult {
  user: UserProfile | null;
  plots: PlotItem[];
  contributions: PlotItem[];
  isLoading: boolean;
  error: string | null;
}

export function useUser(username: string): UseUserResult {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [plots, setPlots] = useState<PlotItem[]>([]);
  const [contributions, setContributions] = useState<PlotItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [profile, userPlots, userContributions] = await Promise.all([
        api.users.get(username),
        api.users.plots(username),
        api.users.contributions(username),
      ]);
      setUser(profile);
      setPlots(userPlots.items);
      setContributions(userContributions.items);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "ユーザー情報の取得に失敗しました";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [username]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return { user, plots, contributions, isLoading, error };
}
