/**
 * React Hooks Example
 * 
 * Demonstrates how to use Grain Analytics React hooks for
 * seamless configuration management and event tracking
 */

import { GrainAnalytics } from '@grainql/analytics-web';
import { 
  GrainProvider, 
  useConfig, 
  useAllConfigs,
  useTrack, 
  useGrainAnalytics 
} from '@grainql/analytics-web/react';

// Example 1: Provider-Managed Client (Recommended for most cases)
function AppWithProviderManaged() {
  return (
    <GrainProvider config={{ 
      tenantId: 'your-tenant-id',
      authStrategy: 'NONE',
      defaultConfigurations: {
        hero_variant: 'A',
        theme: 'light',
        feature_enabled: 'false'
      }
    }}>
      <YourApp />
    </GrainProvider>
  );
}

// Example 2: External Client (Advanced use case)
const grain = new GrainAnalytics({
  tenantId: 'your-tenant-id',
  authStrategy: 'JWT',
  authProvider: {
    getToken: async () => {
      // Return your JWT token from Auth0, Firebase, etc.
      return await getAccessToken();
    }
  }
});

function AppWithExternalClient() {
  return (
    <GrainProvider client={grain}>
      <YourApp />
    </GrainProvider>
  );
}

// Example 3: A/B Testing with useConfig
const heroVariants = {
  A: HeroVariantA,
  B: HeroVariantB,
  C: HeroVariantC
};

function DynamicHero() {
  const { value: variant, isRefreshing, error } = useConfig('hero_variant');
  const track = useTrack();
  
  if (error) {
    return <div>Failed to load variant</div>;
  }
  
  const HeroComponent = heroVariants[variant || 'A'];
  
  return (
    <div>
      {isRefreshing && <div className="loading">Loading...</div>}
      <HeroComponent 
        onCtaClick={() => track('hero_cta_clicked', { variant })} 
      />
    </div>
  );
}

// Example 4: Feature Flags
function FeatureGatedComponent() {
  const { value: featureEnabled } = useConfig('new_feature_enabled');
  
  return featureEnabled === 'true' ? (
    <NewFeature />
  ) : (
    <LegacyFeature />
  );
}

// Example 5: Personalized Content
function PersonalizedBanner() {
  const { value: bannerText } = useConfig('banner_text', {
    properties: {
      plan: 'premium',
      location: 'US',
      signupDate: '2024-01-15'
    }
  });
  
  return (
    <div className="banner">
      {bannerText || 'Welcome to our app!'}
    </div>
  );
}

// Example 6: Multiple Configurations
function ThemedComponent() {
  const { configs } = useAllConfigs();
  
  const styles = {
    backgroundColor: configs.primary_color || '#007bff',
    color: configs.text_color || '#ffffff',
    fontSize: configs.font_size || '16px',
    borderRadius: configs.border_radius || '4px'
  };
  
  return (
    <button style={styles}>
      {configs.button_text || 'Click Me'}
    </button>
  );
}

// Example 7: Event Tracking with useTrack
function ProductCard({ product }) {
  const track = useTrack();
  
  const handleAddToCart = () => {
    track('add_to_cart', {
      productId: product.id,
      productName: product.name,
      price: product.price,
      category: product.category
    });
  };
  
  const handleViewDetails = () => {
    track('product_viewed', {
      productId: product.id,
      category: product.category
    });
  };
  
  return (
    <div className="product-card">
      <h3>{product.name}</h3>
      <p>${product.price}</p>
      <button onClick={handleViewDetails}>View Details</button>
      <button onClick={handleAddToCart}>Add to Cart</button>
    </div>
  );
}

// Example 8: User Authentication Flow
function LoginForm() {
  const grain = useGrainAnalytics();
  const track = useTrack();
  
  const handleLogin = async (email: string, password: string) => {
    try {
      const user = await authenticateUser(email, password);
      
      // Identify user in Grain
      grain.identify(user.id);
      
      // Set user properties
      await grain.setProperty({
        email: user.email,
        plan: user.plan,
        signupDate: user.signupDate,
        lastLogin: new Date().toISOString()
      });
      
      // Track successful login with immediate flush
      await track('login', {
        method: 'email',
        success: true,
        twoFactorEnabled: user.twoFactorEnabled
      }, { flush: true });
      
      // Redirect to dashboard
      window.location.href = '/dashboard';
      
    } catch (error) {
      // Track failed login
      await track('login', {
        method: 'email',
        success: false,
        errorMessage: error.message
      });
      
      // Show error to user
      showError('Login failed. Please try again.');
    }
  };
  
  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      handleLogin(formData.get('email'), formData.get('password'));
    }}>
      <input name="email" type="email" placeholder="Email" required />
      <input name="password" type="password" placeholder="Password" required />
      <button type="submit">Login</button>
    </form>
  );
}

// Example 9: Config with Manual Refresh
function ConfigDashboard() {
  const { configs, isRefreshing, error, refresh } = useAllConfigs();
  
  return (
    <div>
      <div className="header">
        <h2>Configuration Dashboard</h2>
        <button 
          onClick={refresh} 
          disabled={isRefreshing}
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh Configs'}
        </button>
      </div>
      
      {error && <div className="error">Error: {error.message}</div>}
      
      <table>
        <thead>
          <tr>
            <th>Key</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(configs).map(([key, value]) => (
            <tr key={key}>
              <td>{key}</td>
              <td>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Example 10: Checkout Flow with Critical Event Tracking
function CheckoutButton({ cart }) {
  const track = useTrack();
  
  const handleCheckout = async () => {
    const orderId = generateOrderId();
    const total = calculateTotal(cart);
    
    // Track checkout with immediate flush (critical event)
    await track('checkout_completed', {
      orderId,
      total,
      currency: 'USD',
      itemCount: cart.length,
      items: cart.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      }))
    }, { flush: true });
    
    // Redirect to payment
    window.location.href = `/checkout/${orderId}`;
  };
  
  return (
    <button onClick={handleCheckout} className="checkout-btn">
      Complete Checkout (${calculateTotal(cart)})
    </button>
  );
}

// Helper functions (examples)
async function getAccessToken() {
  // Implement your auth token retrieval logic
  return 'your-jwt-token';
}

async function authenticateUser(email: string, password: string) {
  // Implement your authentication logic
  return {
    id: 'user123',
    email,
    plan: 'premium',
    signupDate: '2024-01-01',
    twoFactorEnabled: false
  };
}

function showError(message: string) {
  console.error(message);
}

function generateOrderId() {
  return `order_${Date.now()}`;
}

function calculateTotal(cart: any[]) {
  return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

// Placeholder components
function YourApp() {
  return <div>Your App Content</div>;
}

function HeroVariantA() {
  return <div>Hero Variant A</div>;
}

function HeroVariantB() {
  return <div>Hero Variant B</div>;
}

function HeroVariantC() {
  return <div>Hero Variant C</div>;
}

function NewFeature() {
  return <div>New Feature</div>;
}

function LegacyFeature() {
  return <div>Legacy Feature</div>;
}

