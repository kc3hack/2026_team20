import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import styles from "./styles/page.module.scss";

export default function HomePage() {
  return (
    <main className={styles.main}>
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-4xl">Plot Platform</CardTitle>
          <CardDescription className="text-xl">
            「架空の欲しいもの」をみんなで作り上げる Wiki 共同編集プラットフォーム
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className={styles.statusText}>🚧 プロジェクト基盤構築中...</p>

          <Separator />

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>shadcn/ui コンポーネントテスト</h3>
            <div className={styles.buttonGroup}>
              <Button variant="default">Default Button</Button>
              <Button variant="outline">Outline Button</Button>
              <Button variant="ghost">Ghost Button</Button>
            </div>
            <div className={styles.badgeRow}>
              <Badge>Badge</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
            </div>
            <Input placeholder="Input コンポーネント" />
            <div className={styles.avatarRow}>
              <Avatar>
                <AvatarImage src="https://github.com/shadcn.png" />
                <AvatarFallback>CN</AvatarFallback>
              </Avatar>
              <span>Avatar コンポーネント</span>
            </div>
            <div className={styles.skeletonGroup}>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>

          <Separator />

          <p className={styles.footerText}>
            ✅ 全 shadcn/ui コンポーネントが正常にインポートされました
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
