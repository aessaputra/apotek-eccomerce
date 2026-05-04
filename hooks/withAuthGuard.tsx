import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAppSlice } from '@/slices';

const VERIFY_MFA_ROUTE = '/(auth)/verify-mfa';

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
    const { authPhase } = useAppSlice();
    const router = useRouter();

    useEffect(() => {
      if (authPhase === 'initializing' || authPhase === 'checking-mfa') return;

      const nextRoute =
        authPhase === 'signed-out'
          ? redirectPath
          : authPhase === 'requires-mfa'
            ? VERIFY_MFA_ROUTE
            : null;

      if (!nextRoute) return;

      const id = setTimeout(() => {
        router.replace(nextRoute);
      }, 0);

      return () => clearTimeout(id);
    }, [authPhase, redirectPath, router]);

    if (authPhase !== 'authenticated') return null;

    return (
      <AuthGuardErrorBoundary>
        <Component {...props} />
      </AuthGuardErrorBoundary>
    );
  }

  GuardedComponent.displayName = `withAuthGuard(${Component.displayName ?? Component.name ?? 'Component'})`;

  return GuardedComponent;
}
