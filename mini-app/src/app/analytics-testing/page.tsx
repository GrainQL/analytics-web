'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// Import the SDK (we'll need to build it first)
// import { createGrainAnalytics } from '../../../../dist/index.mjs';

export default function AnalyticsTesting() {
  const [isClient, setIsClient] = useState(false);
  const [grain, setGrain] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    // Initialize Grain Analytics
    const initializeGrain = async () => {
      try {
        // For now, we'll create a mock implementation
        // In a real scenario, you'd import from the built SDK
        const mockGrain = {
          tenantId: 'grainql',
          track: (eventName: string, properties?: any) => {
            const event = {
              id: Date.now(),
              eventName,
              properties: properties || {},
              timestamp: new Date().toISOString(),
              userId: 'test-user-123',
              tenantId: 'grainql'
            };
            setEvents(prev => [event, ...prev.slice(0, 49)]); // Keep last 50 events
            console.log('Tracked event:', event);
          },
          setUserId: (userId: string) => {
            console.log('Set user ID:', userId);
          },
          flush: () => {
            console.log('Flushed events');
          },
          getConfig: (key: string) => {
            return `mock-value-${key}`;
          }
        };
        
        setGrain(mockGrain);
        setIsTracking(true);
      } catch (error) {
        console.error('Failed to initialize Grain Analytics:', error);
      }
    };

    initializeGrain();
  }, []);

  const testEvents = [
    { name: 'button_click', properties: { button: 'test-button', location: 'analytics-testing' } },
    { name: 'page_view', properties: { page: '/analytics-testing', title: 'Analytics Testing' } },
    { name: 'user_action', properties: { action: 'test', category: 'testing' } },
    { name: 'form_submit', properties: { form: 'test-form', fields: 3 } },
    { name: 'custom_event', properties: { custom_prop: 'custom_value', number: 42 } }
  ];

  const handleTrackEvent = (eventName: string, properties?: any) => {
    if (grain) {
      grain.track(eventName, properties);
    }
  };

  const clearEvents = () => {
    setEvents([]);
  };

  const flushEvents = () => {
    if (grain) {
      grain.flush();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
            ← Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics Testing</h1>
          <p className="text-gray-600">Test event tracking, heartbeat monitoring, and page view detection</p>
        </div>

        {/* Status */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/30 p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">SDK Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-3 ${isClient ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              <span className="text-sm font-medium">Client Ready: {isClient ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-3 ${grain ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              <span className="text-sm font-medium">SDK Initialized: {grain ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-3 ${isTracking ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              <span className="text-sm font-medium">Tracking Active: {isTracking ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-3 ${grain?.tenantId ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              <span className="text-sm font-medium">Tenant ID: {grain?.tenantId || 'Not set'}</span>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Event Testing */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/30 p-6">
            <h2 className="text-xl font-semibold mb-4">Event Testing</h2>
            <div className="space-y-4">
              {testEvents.map((event, index) => (
                <div key={index} className="border border-gray-200/30 bg-white/30 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900">{event.name}</h3>
                    <button
                      onClick={() => handleTrackEvent(event.name, event.properties)}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                    >
                      Track
                    </button>
                  </div>
                  <pre className="text-xs text-gray-600 bg-gray-50 p-2 rounded overflow-x-auto">
                    {JSON.stringify(event.properties, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
            
            <div className="mt-6 flex space-x-3">
              <button
                onClick={flushEvents}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                Flush Events
              </button>
              <button
                onClick={clearEvents}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              >
                Clear Events
              </button>
            </div>
          </div>

          {/* Event Log */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/30 p-6">
            <h2 className="text-xl font-semibold mb-4">Event Log</h2>
            <div className="h-96 overflow-y-auto border border-gray-200/30 bg-white/30 rounded-xl">
              {events.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No events tracked yet. Click "Track" buttons to start testing.
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {events.map((event) => (
                    <div key={event.id} className="border-l-4 border-blue-500/50 bg-white/20 pl-4 py-2 rounded-r-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-900">{event.eventName}</span>
                        <span className="text-xs text-gray-500">{event.timestamp}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <div>User ID: {event.userId}</div>
                        {Object.keys(event.properties).length > 0 && (
                          <pre className="text-xs text-gray-500 mt-1 overflow-x-auto">
                            {JSON.stringify(event.properties, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Heartbeat Testing */}
        <div className="mt-8 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/30 p-6">
          <h2 className="text-xl font-semibold mb-4">Heartbeat Testing</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-2">Page Load Heartbeat</h3>
              <p className="text-sm text-gray-600 mb-3">
                Heartbeat events are automatically sent when the page loads and at regular intervals.
              </p>
              <div className="text-sm text-gray-500">
                <div>• Page load heartbeat: Sent immediately on page load</div>
                <div>• Periodic heartbeat: Sent every 2 minutes (active) / 5 minutes (inactive)</div>
                <div>• Activity detection: Mouse, keyboard, touch, scroll events</div>
              </div>
            </div>
            <div>
              <h3 className="font-medium mb-2">Heartbeat Properties</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <div><span className="font-medium">type:</span> "heartbeat"</div>
                <div><span className="font-medium">heartbeat_type:</span> "page_load" | "periodic"</div>
                <div><span className="font-medium">status:</span> "active" | "inactive"</div>
                <div><span className="font-medium">timestamp:</span> Unix timestamp</div>
                <div><span className="font-medium">page:</span> Current page path (with consent)</div>
                <div><span className="font-medium">duration:</span> Time since last heartbeat (periodic only)</div>
                <div><span className="font-medium">event_count:</span> Events since last heartbeat (periodic only)</div>
              </div>
            </div>
          </div>
        </div>

        {/* Page View Testing */}
        <div className="mt-8 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/30 p-6">
          <h2 className="text-xl font-semibold mb-4">Page View Testing</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-2">Automatic Page View Tracking</h3>
              <p className="text-sm text-gray-600 mb-3">
                Page views are automatically tracked when navigating between pages.
              </p>
              <div className="text-sm text-gray-500">
                <div>• Initial page load</div>
                <div>• History API changes (pushState, replaceState)</div>
                <div>• Back/forward navigation (popstate)</div>
                <div>• Hash changes</div>
              </div>
            </div>
            <div>
              <h3 className="font-medium mb-2">Page View Properties</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <div><span className="font-medium">page:</span> Page path (query params stripped by default)</div>
                <div><span className="font-medium">timestamp:</span> Unix timestamp</div>
                <div><span className="font-medium">referrer:</span> Previous page (with consent)</div>
                <div><span className="font-medium">title:</span> Page title (with consent)</div>
                <div><span className="font-medium">full_url:</span> Complete URL (with consent)</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
