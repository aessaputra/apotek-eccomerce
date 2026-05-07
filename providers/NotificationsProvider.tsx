import React, { createContext, useContext } from 'react';
import { useNotifications, type UseNotificationsReturn } from '@/hooks/useNotifications';
import { useAppSlice } from '@/slices';

const NotificationsContext = createContext<UseNotificationsReturn | null>(null);

export function useNotificationsContext(): UseNotificationsReturn {
  const value = useContext(NotificationsContext);
  if (!value) {
    throw new Error('useNotificationsContext must be used within NotificationsProvider');
  }
  return value;
}

interface NotificationsProviderProps {
  children: React.ReactNode;
}

export default function NotificationsProvider({ children }: NotificationsProviderProps) {
  const { user } = useAppSlice();
  const notificationsState = useNotifications({ userId: user?.id });

  return (
    <NotificationsContext.Provider value={notificationsState}>
      {children}
    </NotificationsContext.Provider>
  );
}
