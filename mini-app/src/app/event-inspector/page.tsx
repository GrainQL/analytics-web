'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function EventInspector() {
  const [events, setEvents] = useState<any[]>([]);
  const [filter, setFilter] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Mock event data for demonstration
  const mockEvents = [
    {
      id: 1,
      eventName: '_grain_heartbeat',
      timestamp: new Date(Date.now() - 1000).toISOString(),
      userId: 'user-123',
      properties: {
        type: 'heartbeat',
        heartbeat_type: 'page_load',
        status: 'active',
        timestamp: Date.now() - 1000,
        page: '/event-inspector',
        _minimal: false,
        _consent_status: 'granted'
      }
    },
    {
      id: 2,
      eventName: 'page_view',
      timestamp: new Date(Date.now() - 2000).toISOString(),
      userId: 'user-123',
      properties: {
        page: '/event-inspector',
        timestamp: Date.now() - 2000,
        referrer: '/privacy-components',
        title: 'Event Inspector - Grain Analytics SDK',
        full_url: 'http://localhost:3000/event-inspector',
        _minimal: false,
        _consent_status: 'granted'
      }
    },
    {
      id: 3,
      eventName: 'button_click',
      timestamp: new Date(Date.now() - 3000).toISOString(),
      userId: 'user-123',
      properties: {
        button: 'test-button',
        location: 'event-inspector',
        element: 'button',
        _minimal: false,
        _consent_status: 'granted'
      }
    },
    {
      id: 4,
      eventName: '_grain_heartbeat',
      timestamp: new Date(Date.now() - 120000).toISOString(),
      userId: 'user-123',
      properties: {
        type: 'heartbeat',
        heartbeat_type: 'periodic',
        status: 'active',
        timestamp: Date.now() - 120000,
        page: '/event-inspector',
        duration: 120000,
        event_count: 3,
        _minimal: false,
        _consent_status: 'granted'
      }
    }
  ];

  useEffect(() => {
    setEvents(mockEvents);
  }, []);

  const filteredEvents = events.filter(event =>
    event.eventName.toLowerCase().includes(filter.toLowerCase()) ||
    JSON.stringify(event.properties).toLowerCase().includes(filter.toLowerCase())
  );

  const eventTypes = [...new Set(events.map(e => e.eventName))];

  const getEventTypeColor = (eventName: string) => {
    if (eventName.startsWith('_grain_')) return 'bg-blue-100 text-blue-800';
    if (eventName === 'page_view') return 'bg-green-100 text-green-800';
    if (eventName === 'button_click') return 'bg-purple-100 text-purple-800';
    return 'bg-gray-100 text-gray-800';
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const clearEvents = () => {
    setEvents([]);
    setSelectedEvent(null);
  };

  const addMockEvent = () => {
    const newEvent = {
      id: Date.now(),
      eventName: 'custom_event',
      timestamp: new Date().toISOString(),
      userId: 'user-123',
      properties: {
        custom_prop: 'custom_value',
        number: Math.floor(Math.random() * 100),
        timestamp: Date.now(),
        _minimal: false,
        _consent_status: 'granted'
      }
    };
    setEvents(prev => [newEvent, ...prev]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
            ← Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Event Inspector</h1>
          <p className="text-gray-600">Monitor and inspect all analytics events in real-time</p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${isMonitoring ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <span className="text-sm font-medium">
                  Monitoring: {isMonitoring ? 'Active' : 'Inactive'}
                </span>
              </div>
              <button
                onClick={() => setIsMonitoring(!isMonitoring)}
                className={`px-3 py-1 rounded text-sm ${
                  isMonitoring 
                    ? 'bg-red-100 text-red-800 hover:bg-red-200' 
                    : 'bg-green-100 text-green-800 hover:bg-green-200'
                }`}
              >
                {isMonitoring ? 'Stop' : 'Start'} Monitoring
              </button>
            </div>
            
            <div className="flex items-center space-x-3">
              <input
                type="text"
                placeholder="Filter events..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={addMockEvent}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Add Mock Event
              </button>
              <button
                onClick={clearEvents}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Event List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold">Events ({filteredEvents.length})</h2>
              </div>
              <div className="h-96 overflow-y-auto">
                {filteredEvents.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    No events found. {filter ? 'Try adjusting your filter.' : 'Start monitoring to see events.'}
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {filteredEvents.map((event) => (
                      <div
                        key={event.id}
                        onClick={() => setSelectedEvent(event)}
                        className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                          selectedEvent?.id === event.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getEventTypeColor(event.eventName)}`}>
                              {event.eventName}
                            </span>
                            <span className="text-sm text-gray-500">{formatTimestamp(event.timestamp)}</span>
                          </div>
                          <div className="text-sm text-gray-500">ID: {event.id}</div>
                        </div>
                        <div className="text-sm text-gray-600">
                          User: {event.userId}
                        </div>
                        {Object.keys(event.properties).length > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            {Object.keys(event.properties).length} properties
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Event Details */}
          <div>
            <div className="bg-white rounded-lg shadow-md">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold">Event Details</h2>
              </div>
              <div className="p-6">
                {selectedEvent ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Basic Information</h3>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium">Event Name:</span>
                          <span className="ml-2 text-gray-600">{selectedEvent.eventName}</span>
                        </div>
                        <div>
                          <span className="font-medium">Timestamp:</span>
                          <span className="ml-2 text-gray-600">{selectedEvent.timestamp}</span>
                        </div>
                        <div>
                          <span className="font-medium">User ID:</span>
                          <span className="ml-2 text-gray-600">{selectedEvent.userId}</span>
                        </div>
                        <div>
                          <span className="font-medium">Event ID:</span>
                          <span className="ml-2 text-gray-600">{selectedEvent.id}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Properties</h3>
                      <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
                        {JSON.stringify(selectedEvent.properties, null, 2)}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p>Select an event to view details</p>
                  </div>
                )}
              </div>
            </div>

            {/* Event Types Summary */}
            <div className="mt-6 bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Event Types</h3>
              <div className="space-y-2">
                {eventTypes.map((eventType) => {
                  const count = events.filter(e => e.eventName === eventType).length;
                  return (
                    <div key={eventType} className="flex items-center justify-between">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getEventTypeColor(eventType)}`}>
                        {eventType}
                      </span>
                      <span className="text-sm text-gray-600">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
