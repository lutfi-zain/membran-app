import { useQuery } from "@tanstack/react-query";

export const useAuth = () => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me");
      if (!res.ok) return { user: null };
      return res.json();
    },
  });

  return {
    user: data?.user ?? null,
    isLoading,
    error,
    refetch,
  };
};
