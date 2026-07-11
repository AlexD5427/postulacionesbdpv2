'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import type { LoginInput, RegisterInput } from '@/core/auth/types';
import { getDataProvider } from '@/infrastructure/providers/factory';
import { queryKeys } from '@/core/data/query-keys';

/** Current session (null when unauthenticated). */
export function useSession() {
  const provider = getDataProvider();
  return useQuery({
    queryKey: queryKeys.session,
    queryFn: () => provider.auth.getSession(),
    staleTime: 30_000,
  });
}

export function useLogin() {
  const provider = getDataProvider();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) => provider.auth.login(input),
    onSuccess: (session) => {
      queryClient.setQueryData(queryKeys.session, session);
      void queryClient.invalidateQueries();
    },
  });
}

export function useRegister() {
  const provider = getDataProvider();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RegisterInput) => provider.auth.register(input),
    onSuccess: (session) => {
      queryClient.setQueryData(queryKeys.session, session);
      void queryClient.invalidateQueries();
    },
  });
}

export function useLogout() {
  const provider = getDataProvider();
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: () => provider.auth.logout(),
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.session, null);
      queryClient.clear();
      router.push('/');
    },
  });
}

export function useRequestPasswordReset() {
  const provider = getDataProvider();
  return useMutation({
    mutationFn: (email: string) => provider.auth.requestPasswordReset(email),
  });
}

export function useResetPassword() {
  const provider = getDataProvider();
  return useMutation({
    mutationFn: ({ token, password }: { token: string; password: string }) =>
      provider.auth.resetPassword(token, password),
  });
}
