/**
 * Authentication Examples for Grain Analytics SDK
 */

import { createGrainAnalytics, AuthProvider } from '@grain-analytics/web';

// Example 1: No Authentication
export function createBasicAnalytics() {
  return createGrainAnalytics({
    tenantId: 'your-tenant-id',
    authStrategy: 'NONE'
  });
}

// Example 2: Server-Side Authentication
export function createServerSideAnalytics() {
  return createGrainAnalytics({
    tenantId: 'your-tenant-id',
    authStrategy: 'SERVER_SIDE',
    secretKey: process.env.GRAIN_SECRET_KEY // Never expose this in client-side code!
  });
}

// Example 3: Auth0 JWT Authentication
export class Auth0Provider implements AuthProvider {
  constructor(private auth0Client: any) {}

  async getToken(): Promise<string> {
    try {
      return await this.auth0Client.getTokenSilently({
        audience: 'your-api-audience'
      });
    } catch (error) {
      console.error('Failed to get Auth0 token:', error);
      throw error;
    }
  }
}

export function createAuth0Analytics(auth0Client: any) {
  return createGrainAnalytics({
    tenantId: 'your-tenant-id',
    authStrategy: 'JWT',
    authProvider: new Auth0Provider(auth0Client)
  });
}

// Example 4: Next.js NextAuth Authentication
export class NextAuthProvider implements AuthProvider {
  async getToken(): Promise<string> {
    // In Next.js client components
    if (typeof window !== 'undefined') {
      const { getSession } = await import('next-auth/react');
      const session = await getSession();
      
      if (!session?.accessToken) {
        throw new Error('No access token available');
      }
      
      return session.accessToken as string;
    }
    
    // In Next.js server components or API routes
    const { getServerSession } = await import('next-auth');
    const session = await getServerSession();
    
    if (!session?.accessToken) {
      throw new Error('No access token available');
    }
    
    return session.accessToken as string;
  }
}

export function createNextAuthAnalytics() {
  return createGrainAnalytics({
    tenantId: 'your-tenant-id',
    authStrategy: 'JWT',
    authProvider: new NextAuthProvider()
  });
}

// Example 5: Custom JWT Provider
export class CustomJWTProvider implements AuthProvider {
  constructor(private tokenEndpoint: string, private clientId: string) {}

  async getToken(): Promise<string> {
    const response = await fetch(this.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: this.clientId,
        grant_type: 'client_credentials'
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to get token: ${response.status}`);
    }

    const data = await response.json();
    return data.access_token;
  }
}

export function createCustomJWTAnalytics() {
  return createGrainAnalytics({
    tenantId: 'your-tenant-id',
    authStrategy: 'JWT',
    authProvider: new CustomJWTProvider(
      'https://your-auth-server.com/oauth/token',
      'your-client-id'
    )
  });
}

// Example 6: Firebase Authentication
export class FirebaseAuthProvider implements AuthProvider {
  constructor(private user: any) {} // Firebase User object

  async getToken(): Promise<string> {
    if (!this.user) {
      throw new Error('User not authenticated');
    }

    return await this.user.getIdToken();
  }
}

export function createFirebaseAnalytics(user: any) {
  return createGrainAnalytics({
    tenantId: 'your-tenant-id',
    authStrategy: 'JWT',
    authProvider: new FirebaseAuthProvider(user)
  });
}

// Example 7: Cached Token Provider (with refresh)
export class CachedTokenProvider implements AuthProvider {
  private token: string | null = null;
  private tokenExpiry: number = 0;

  constructor(
    private refreshToken: () => Promise<{ token: string; expiresIn: number }>
  ) {}

  async getToken(): Promise<string> {
    const now = Date.now();
    
    // Check if token is expired or will expire in the next 5 minutes
    if (!this.token || now >= this.tokenExpiry - 300000) {
      await this.refreshTokenInternal();
    }

    if (!this.token) {
      throw new Error('Failed to obtain access token');
    }

    return this.token;
  }

  private async refreshTokenInternal(): Promise<void> {
    try {
      const { token, expiresIn } = await this.refreshToken();
      this.token = token;
      this.tokenExpiry = Date.now() + (expiresIn * 1000);
    } catch (error) {
      console.error('Failed to refresh token:', error);
      this.token = null;
      this.tokenExpiry = 0;
      throw error;
    }
  }
}

export function createCachedTokenAnalytics(
  refreshTokenFn: () => Promise<{ token: string; expiresIn: number }>
) {
  return createGrainAnalytics({
    tenantId: 'your-tenant-id',
    authStrategy: 'JWT',
    authProvider: new CachedTokenProvider(refreshTokenFn)
  });
}

// Example 8: React Hook for Analytics with Authentication
export function useGrainAnalytics(tenantId: string, authProvider?: AuthProvider) {
  const [analytics, setAnalytics] = useState<ReturnType<typeof createGrainAnalytics> | null>(null);

  useEffect(() => {
    const grain = createGrainAnalytics({
      tenantId,
      authStrategy: authProvider ? 'JWT' : 'NONE',
      authProvider,
      debug: process.env.NODE_ENV === 'development'
    });

    setAnalytics(grain);

    return () => {
      grain.destroy();
    };
  }, [tenantId, authProvider]);

  const track = useCallback((eventName: string, properties?: Record<string, unknown>) => {
    if (analytics) {
      analytics.track(eventName, properties);
    }
  }, [analytics]);

  const identify = useCallback((userId: string) => {
    if (analytics) {
      analytics.identify(userId);
    }
  }, [analytics]);

  const flush = useCallback(async () => {
    if (analytics) {
      await analytics.flush();
    }
  }, [analytics]);

  return { track, identify, flush, analytics };
}
