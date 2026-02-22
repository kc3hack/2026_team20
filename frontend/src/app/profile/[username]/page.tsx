"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { PlotList } from "@/components/plot/PlotList/PlotList";
import { Pagination } from "@/components/shared/Pagination/Pagination";
import { UserProfile } from "@/components/user/UserProfile/UserProfile";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserProfile, useUserPlots, useUserContributions } from "@/hooks/useUser";
import styles from "./page.module.scss";

const DEFAULT_LIMIT = 20;

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const username = params.username;

  const [activeTab, setActiveTab] = useState("plots");
  const [plotsOffset, setPlotsOffset] = useState(0);
  const [contributionsOffset, setContributionsOffset] = useState(0);

  const {
    data: profile,
    isLoading: isProfileLoading,
    isError: isProfileError,
  } = useUserProfile(username);

  const {
    data: plotsData,
    isLoading: isPlotsLoading,
  } = useUserPlots(username, { limit: DEFAULT_LIMIT, offset: plotsOffset });

  const {
    data: contributionsData,
    isLoading: isContributionsLoading,
  } = useUserContributions(username, { limit: DEFAULT_LIMIT, offset: contributionsOffset });

  if (isProfileLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.skeletonProfile}>
          <Skeleton className={styles.skeletonAvatar} />
          <div className={styles.skeletonInfo}>
            <Skeleton className={styles.skeletonName} />
            <Skeleton className={styles.skeletonDate} />
          </div>
        </div>
      </div>
    );
  }

  if (isProfileError || !profile) {
    return (
      <div className={styles.page}>
        <div className={styles.notFound}>
          <h1 className={styles.notFoundHeading}>404</h1>
          <p>ユーザーが見つかりません</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <UserProfile profile={profile} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className={styles.tabs}>
        <TabsList>
          <TabsTrigger value="plots">作成した Plot</TabsTrigger>
          <TabsTrigger value="contributions">コントリビューション</TabsTrigger>
        </TabsList>

        <TabsContent value="plots">
          <PlotList
            items={plotsData?.items ?? []}
            isLoading={isPlotsLoading}
          />
          {plotsData && plotsData.total > DEFAULT_LIMIT && (
            <Pagination
              total={plotsData.total}
              limit={DEFAULT_LIMIT}
              offset={plotsOffset}
              onPageChange={setPlotsOffset}
            />
          )}
        </TabsContent>

        <TabsContent value="contributions">
          <PlotList
            items={contributionsData?.items ?? []}
            isLoading={isContributionsLoading}
          />
          {contributionsData && contributionsData.total > DEFAULT_LIMIT && (
            <Pagination
              total={contributionsData.total}
              limit={DEFAULT_LIMIT}
              offset={contributionsOffset}
              onPageChange={setContributionsOffset}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
