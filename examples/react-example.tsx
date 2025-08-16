import React, { useEffect, useState } from 'react';
import { createGrainAnalytics, GrainAnalytics } from '@grain-analytics/web';

// Example React component using Grain Analytics
export default function App() {
  const [grain, setGrain] = useState<GrainAnalytics | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [eventCount, setEventCount] = useState(0);

  useEffect(() => {
    // Initialize Grain Analytics
    const analytics = createGrainAnalytics({
      tenantId: 'your-tenant-id',
      authStrategy: 'NONE', // or 'JWT' with your auth provider
      debug: true,
      batchSize: 10,
      flushInterval: 5000
    });

    setGrain(analytics);

    // Track initial page view
    analytics.track('page_view', {
      page: '/app',
      timestamp: Date.now()
    });

    // Cleanup on unmount
    return () => {
      analytics.destroy();
    };
  }, []);

  const trackEvent = (eventName: string, properties?: Record<string, unknown>) => {
    if (grain) {
      grain.track(eventName, properties);
      setEventCount(prev => prev + 1);
    }
  };

  const handleIdentify = () => {
    if (grain && userId) {
      grain.identify(userId);
      trackEvent('user_identified', { userId });
    }
  };

  const handleFlush = async () => {
    if (grain) {
      try {
        await grain.flush();
        console.log('Events flushed successfully');
      } catch (error) {
        console.error('Failed to flush events:', error);
      }
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h1>Grain Analytics React Example</h1>
      
      <div style={{ marginBottom: '2rem', padding: '1rem', background: '#f5f5f5', borderRadius: '4px' }}>
        <p><strong>Events tracked:</strong> {eventCount}</p>
        <p><strong>SDK status:</strong> {grain ? 'Initialized' : 'Loading...'}</p>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h3>User Identification</h3>
        <input
          type="text"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="Enter user ID"
          style={{ marginRight: '1rem', padding: '0.5rem' }}
        />
        <button onClick={handleIdentify} style={buttonStyle}>
          Identify User
        </button>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h3>Event Tracking</h3>
        <button 
          onClick={() => trackEvent('button_click', { button: 'example' })}
          style={buttonStyle}
        >
          Track Button Click
        </button>
        
        <button 
          onClick={() => trackEvent('feature_used', { feature: 'analytics_demo' })}
          style={buttonStyle}
        >
          Track Feature Usage
        </button>
        
        <button 
          onClick={() => trackEvent('custom_event', { 
            value: Math.floor(Math.random() * 100),
            timestamp: Date.now()
          })}
          style={buttonStyle}
        >
          Track Custom Event
        </button>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h3>Batch Operations</h3>
        <button onClick={handleFlush} style={buttonStyle}>
          Flush All Events
        </button>
        
        <button 
          onClick={() => {
            // Track multiple events
            for (let i = 0; i < 5; i++) {
              trackEvent(`batch_event_${i}`, { sequence: i, batch: true });
            }
          }}
          style={buttonStyle}
        >
          Track 5 Events
        </button>
      </div>

      <div>
        <h3>Real-time Examples</h3>
        <ProductCard 
          product={{ id: 'abc123', name: 'Example Product', price: 29.99 }}
          onView={() => trackEvent('product_viewed', { product_id: 'abc123' })}
          onPurchase={() => trackEvent('purchase', { 
            product_id: 'abc123', 
            price: 29.99,
            currency: 'USD'
          })}
        />
      </div>
    </div>
  );
}

// Example product card component
function ProductCard({ 
  product, 
  onView, 
  onPurchase 
}: {
  product: { id: string; name: string; price: number };
  onView: () => void;
  onPurchase: () => void;
}) {
  useEffect(() => {
    // Track product view when component mounts
    onView();
  }, [onView]);

  return (
    <div style={{
      border: '1px solid #ddd',
      borderRadius: '4px',
      padding: '1rem',
      marginTop: '1rem',
      maxWidth: '300px'
    }}>
      <h4>{product.name}</h4>
      <p style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#007cba' }}>
        ${product.price}
      </p>
      <button onClick={onPurchase} style={buttonStyle}>
        Purchase
      </button>
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  background: '#007cba',
  color: 'white',
  border: 'none',
  padding: '0.5rem 1rem',
  borderRadius: '4px',
  cursor: 'pointer',
  marginRight: '0.5rem',
  marginBottom: '0.5rem'
};
