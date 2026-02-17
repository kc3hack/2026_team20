import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-4xl">Plot Platform</CardTitle>
          <CardDescription className="text-xl">
            「架空の欲しいもの」をみんなで作り上げる Wiki 共同編集プラットフォーム
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">🚧 プロジェクト基盤構築中...</p>

          <Separator />

          <div className="space-y-2">
            <h3 className="font-semibold">shadcn/ui コンポーネントテスト</h3>
            <div className="flex flex-wrap gap-2">
              <Button variant="default">Default Button</Button>
              <Button variant="outline">Outline Button</Button>
              <Button variant="ghost">Ghost Button</Button>
            </div>
            <div className="flex gap-2 items-center">
              <Badge>Badge</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
            </div>
            <Input placeholder="Input コンポーネント" />
            <div className="flex items-center gap-2">
              <Avatar>
                <AvatarImage src="https://github.com/shadcn.png" />
                <AvatarFallback>CN</AvatarFallback>
              </Avatar>
              <span>Avatar コンポーネント</span>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>

          <Separator />

          <p className="text-sm text-muted-foreground">
            ✅ 全 shadcn/ui コンポーネントが正常にインポートされました
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
