import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAppSlice } from '@/slices';

export function withAuthGuard<P extends object>(
  Component: React.ComponentType<P>,
  redirectPath = '/(auth)/login',
) {
  class AuthGuardErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean }
  > {
    constructor(props: { children: React.ReactNode }) {
      super(props);
      this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
      return { hasError: true };
    }

    render() {
      if (this.state.hasError) return null;
      return this.props.children;
    }
  }

  function GuardedComponent(props: P) {
    const { checked, loggedIn } = useAppSlice();
    const router = useRouter();

    useEffect(() => {
      if (!checked || loggedIn) return;

      const id = setTimeout(() => {
        router.replace(redirectPath);
      }, 0);

      return () => clearTimeout(id);
    }, [checked, loggedIn, router]);

    if (!checked || !loggedIn) return null;

    return (
      <AuthGuardErrorBoundary>
        <Component {...props} />
      </AuthGuardErrorBoundary>
    );
  }

  GuardedComponent.displayName = `withAuthGuard(${Component.displayName ?? Component.name ?? 'Component'})`;

  return GuardedComponent;
}
