import { trpc } from "../../lib/trpc";

export function useAuth() {
  const { data, isLoading, refetch } = trpc.auth.me.useQuery();

  const user = data ?? null;
  const isAuthenticated = !!user;

  return {
    user,
    isLoading,
    refetch,
    isAuthenticated,
  };
}
