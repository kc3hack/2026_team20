import type { Session } from "@supabase/supabase-js";
import type { UserResponse } from "@/lib/api/types";

export type AuthContextValue = {
  user: UserResponse | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signInWithGitHub: (redirectTo?: string) => Promise<void>;
  signInWithGoogle: (redirectTo?: string) => Promise<void>;
  signOut: () => Promise<void>;
  handleUnauthorized: () => Promise<void>;
};
