'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NotificationPreferences } from '@/shared/types/domain';
import { getDataProvider } from '@/infrastructure/providers/factory';
import { queryKeys } from '@/core/data/query-keys';

export function useNotifications() {
  const provider = getDataProvider();
  return useQuery({ queryKey: queryKeys.notifications, queryFn: () => provider.notifications.list() });
}

export function useMarkNotificationRead() {
  const provider = getDataProvider();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => provider.notifications.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
  });
}

export function useMarkAllNotificationsRead() {
  const provider = getDataProvider();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => provider.notifications.markAllRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
  });
}

export function useNotificationPreferences() {
  const provider = getDataProvider();
  return useQuery({
    queryKey: queryKeys.notificationPreferences,
    queryFn: () => provider.notifications.getPreferences(),
  });
}

export function useSaveNotificationPreferences() {
  const provider = getDataProvider();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (prefs: NotificationPreferences) => provider.notifications.savePreferences(prefs),
    onSuccess: (prefs) => queryClient.setQueryData(queryKeys.notificationPreferences, prefs),
  });
}
