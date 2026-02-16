"use client";

import { useParams } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";
import UserCard, { UserCardSkeleton } from "@/components/UserCard";
import PlotCard, { PlotCardSkeleton } from "@/components/PlotCard";
import styles from "./page.module.scss";

type TabId = "plots" | "contributions";

import { useState } from "react";

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const username = params.username;
  const { user, plots, contributions, isLoading, error } = useUser(username);
  const { user: authUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("plots");

  const isOwnProfile = !!(
    authUser &&
    user &&
    authUser.id === user.id
  );

  const activeItems = activeTab === "plots" ? plots : contributions;

  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          {error ? (
            <div className={styles.error}>
              <div className={styles.errorIcon}>!</div>
              <p className={styles.errorText}>{error}</p>
              <a href="/" className={styles.errorLink}>
                トップに戻る
              </a>
            </div>
          ) : (
            <>
              {/* User Card */}
              <div className={styles.cardWrap}>
                {isLoading ? (
                  <UserCardSkeleton />
                ) : user ? (
                  <UserCard user={user} isOwnProfile={isOwnProfile} />
                ) : null}
              </div>

              {/* Tab Navigation */}
              <div className={styles.tabs} role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "plots"}
                  className={`${styles.tab} ${activeTab === "plots" ? styles.tabActive : ""}`}
                  onClick={() => setActiveTab("plots")}
                >
                  <svg
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    width={16}
                    height={16}
                    className={styles.tabIcon}
                  >
                    <path d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z" />
                  </svg>
                  自分のPlot
                  {user && (
                    <span className={styles.tabCount}>{user.plotCount}</span>
                  )}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "contributions"}
                  className={`${styles.tab} ${activeTab === "contributions" ? styles.tabActive : ""}`}
                  onClick={() => setActiveTab("contributions")}
                >
                  <svg
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    width={16}
                    height={16}
                    className={styles.tabIcon}
                  >
                    <path d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H4.233a.75.75 0 00-.75.75v4a.75.75 0 001.5 0v-2.37l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.455-8.174a.75.75 0 00-.75.75v2.37l-.31-.31a7 7 0 00-11.712 3.138.75.75 0 001.449.39 5.5 5.5 0 019.201-2.466l.312.311h-2.433a.75.75 0 000 1.5h3.999a.75.75 0 00.75-.75v-4a.75.75 0 00-.75-.75z" />
                  </svg>
                  コントリビューション
                  {user && (
                    <span className={styles.tabCount}>
                      {user.contributionCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Tab Content */}
              <div
                className={styles.tabContent}
                data-testid={
                  activeTab === "plots"
                    ? "user-plots"
                    : "user-contributions"
                }
              >
                {isLoading ? (
                  <div className={styles.grid}>
                    {Array.from({ length: 6 }, (_, i) => (
                      <PlotCardSkeleton key={`skeleton-${i}`} />
                    ))}
                  </div>
                ) : activeItems.length > 0 ? (
                  <div className={styles.grid}>
                    {activeItems.map((plot) => (
                      <PlotCard key={plot.id} plot={plot} />
                    ))}
                  </div>
                ) : (
                  <div className={styles.empty}>
                    <div className={styles.emptyIcon}>
                      {activeTab === "plots" ? (
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.5}
                          width={40}
                          height={40}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                          />
                        </svg>
                      ) : (
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.5}
                          width={40}
                          height={40}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                          />
                        </svg>
                      )}
                    </div>
                    <p className={styles.emptyText}>
                      {activeTab === "plots"
                        ? "まだPlotを作成していません"
                        : "まだコントリビューションがありません"}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
