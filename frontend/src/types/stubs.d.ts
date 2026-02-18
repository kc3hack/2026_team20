// Type stubs for missing dependencies
// This file silences TypeScript errors for modules that are not yet installed

declare module "next" {
  export * from "next/types";
}

declare module "next/head" {
  import React from "react";
  const Head: React.FC<{ children?: React.ReactNode }>;
  export default Head;
}

declare module "next/link" {
  import React from "react";
  interface LinkProps {
    href: string;
    as?: string;
    replace?: boolean;
    scroll?: boolean;
    shallow?: boolean;
    passHref?: boolean;
    prefetch?: boolean;
    locale?: string | false;
    children?: React.ReactNode;
  }
  const Link: React.FC<LinkProps>;
  export default Link;
}

declare module "next/navigation" {
  export function useRouter(): {
    push: (url: string) => void;
    replace: (url: string) => void;
    back: () => void;
    forward: () => void;
    refresh: () => void;
    prefetch: (url: string) => void;
  };
  export function usePathname(): string;
  export function useSearchParams(): URLSearchParams;
  export function useParams(): Record<string, string | string[]>;
}

declare module "lucide-react" {
  import React from "react";
  interface IconProps {
    size?: number | string;
    color?: string;
    strokeWidth?: number;
    className?: string;
    style?: React.CSSProperties;
  }

  export const X: React.FC<IconProps>;
  export const Menu: React.FC<IconProps>;
  export const ChevronDown: React.FC<IconProps>;
  export const ChevronUp: React.FC<IconProps>;
  export const ChevronLeft: React.FC<IconProps>;
  export const ChevronRight: React.FC<IconProps>;
  export const Search: React.FC<IconProps>;
  export const Plus: React.FC<IconProps>;
  export const Edit: React.FC<IconProps>;
  export const Trash: React.FC<IconProps>;
  export const Star: React.FC<IconProps>;
  export const History: React.FC<IconProps>;
  export const Settings: React.FC<IconProps>;
  export const User: React.FC<IconProps>;
  export const LogOut: React.FC<IconProps>;
  export const Bell: React.FC<IconProps>;
  export const MessageSquare: React.FC<IconProps>;
  export const Share: React.FC<IconProps>;
  export const Download: React.FC<IconProps>;
  export const Upload: React.FC<IconProps>;
  export const Image: React.FC<IconProps>;
  export const FileText: React.FC<IconProps>;
  export const MoreHorizontal: React.FC<IconProps>;
  export const Check: React.FC<IconProps>;
  export const CheckCircle: React.FC<IconProps>;
  export const AlertCircle: React.FC<IconProps>;
  export const Info: React.FC<IconProps>;
  export const Loader2: React.FC<IconProps>;
  export const Circle: React.FC<IconProps>;
  export const CircleCheck: React.FC<IconProps>;
  export const OctagonX: React.FC<IconProps>;
  export const TriangleAlert: React.FC<IconProps>;
}
