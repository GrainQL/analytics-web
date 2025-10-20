'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ReactComponents() {
  const [selectedHook, setSelectedHook] = useState<string | null>(null);

  const hooks = [
    {
      name: 'useConfig',
      description: 'Cache-first configuration access with automatic background refresh',
      features: [
        'Returns cached values immediately',
        'Fetches fresh data in background',
        'Auto-updates components when config changes',
        'Includes loading states and error handling'
      ],
      example: `const { value, isRefreshing, error } = useConfig('hero_variant');`
    },
    {
      name: 'useAllConfigs',
      description: 'Get all configurations as a reactive object',
      features: [
        'Returns all configurations at once',
        'Reactive updates when any config changes',
        'Efficient for components needing multiple configs'
      ],
      example: `const configs = useAllConfigs();`
    },
    {
      name: 'useTrack',
      description: 'Returns stable, memoized track function',
      features: [
        'Prevents unnecessary re-renders',
        'Stable reference across renders',
        'Optimized for performance'
      ],
      example: `const track = useTrack();
track('button_click', { button: 'cta' });`
    },
    {
      name: 'useGrainAnalytics',
      description: 'Access full client instance for advanced operations',
      features: [
        'Full SDK access',
        'Advanced configuration management',
        'Manual event tracking',
        'User management'
      ],
      example: `const grain = useGrainAnalytics();
grain.setUserId('user123');`
    },
    {
      name: 'useConsent',
      description: 'Manage user consent state',
      features: [
        'Check consent status',
        'Grant/revoke consent',
        'Listen to consent changes',
        'Privacy compliance'
      ],
      example: `const { hasConsent, grantConsent, revokeConsent } = useConsent();`
    },
    {
      name: 'usePrivacyPreferences',
      description: 'Manage detailed privacy preferences',
      features: [
        'Category-based consent',
        'Granular control',
        'Preference persistence',
        'Compliance reporting'
      ],
      example: `const { preferences, updatePreference } = usePrivacyPreferences();`
    }
  ];

  const components = [
    {
      name: 'GrainProvider',
      description: 'Context provider for Grain Analytics',
      features: [
        'Automatic client lifecycle management',
        'Configuration management',
        'Error boundary integration',
        'Performance optimization'
      ],
      example: `function App() {
  return (
    <GrainProvider config={{ tenantId: 'your-tenant-id' }}>
      <YourApp />
    </GrainProvider>
  );
}`
    },
    {
      name: 'ConsentBanner',
      description: 'Glassmorphic consent popup with themes',
      features: [
        'Multiple themes (glass, solid, minimal)',
        'Configurable positions',
        'Customizable styling',
        'Accessibility compliant'
      ],
      example: `function App() {
  return (
    <GrainProvider config={{ tenantId: 'your-tenant-id' }}>
      <ConsentBanner 
        position="bottom" 
        theme="glass" 
        privacyPolicyUrl="https://example.com/privacy" 
      />
      <YourApp />
    </GrainProvider>
  );
}`
    },
    {
      name: 'PrivacyPreferenceCenter',
      description: 'Detailed preference management interface',
      features: [
        'Category-based toggles',
        'Detailed descriptions',
        'Save/cancel functionality',
        'Responsive design'
      ],
      example: `function PrivacySettings() {
  return (
    <PrivacyPreferenceCenter
      categories={['necessary', 'analytics', 'functional']}
      onSave={(preferences) => console.log(preferences)}
    />
  );
}`
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
            ← Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">React Components</h1>
          <p className="text-gray-600">Preview and test React hooks, providers, and privacy components</p>
        </div>

        {/* Hooks Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">React Hooks</h2>
          <div className="grid gap-6">
            {hooks.map((hook, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{hook.name}</h3>
                    <p className="text-gray-600 mb-4">{hook.description}</p>
                  </div>
                  <button
                    onClick={() => setSelectedHook(selectedHook === hook.name ? null : hook.name)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    {selectedHook === hook.name ? 'Hide' : 'Show'} Details
                  </button>
                </div>
                
                {selectedHook === hook.name && (
                  <div className="border-t pt-4">
                    <div className="mb-4">
                      <h4 className="font-medium mb-2">Features:</h4>
                      <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                        {hook.features.map((feature, idx) => (
                          <li key={idx}>{feature}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Example Usage:</h4>
                      <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                        <code>{hook.example}</code>
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Components Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">React Components</h2>
          <div className="grid gap-6">
            {components.map((component, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{component.name}</h3>
                    <p className="text-gray-600 mb-4">{component.description}</p>
                  </div>
                  <button
                    onClick={() => setSelectedHook(selectedHook === component.name ? null : component.name)}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                  >
                    {selectedHook === component.name ? 'Hide' : 'Show'} Details
                  </button>
                </div>
                
                {selectedHook === component.name && (
                  <div className="border-t pt-4">
                    <div className="mb-4">
                      <h4 className="font-medium mb-2">Features:</h4>
                      <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                        {component.features.map((feature, idx) => (
                          <li key={idx}>{feature}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Example Usage:</h4>
                      <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                        <code>{component.example}</code>
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Integration Examples */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-6">Integration Examples</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">Basic Setup</h3>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
                <code>{`import { GrainProvider, useConfig, useTrack } from '@grainql/analytics-web/react';

function App() {
  return (
    <GrainProvider config={{ tenantId: 'your-tenant-id' }}>
      <YourApp />
    </GrainProvider>
  );
}

function YourComponent() {
  const { value } = useConfig('hero_variant');
  const track = useTrack();
  
  return (
    <button onClick={() => track('clicked')}>
      Click me
    </button>
  );
}`}</code>
              </pre>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-3">With Privacy Components</h3>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
                <code>{`import { 
  GrainProvider, 
  ConsentBanner, 
  useConsent 
} from '@grainql/analytics-web/react';

function App() {
  return (
    <GrainProvider config={{ 
      tenantId: 'your-tenant-id',
      consentMode: 'opt-in' 
    }}>
      <ConsentBanner 
        position="bottom" 
        theme="glass" 
        privacyPolicyUrl="/privacy" 
      />
      <YourApp />
    </GrainProvider>
  );
}

function AnalyticsComponent() {
  const { hasConsent } = useConsent();
  
  if (!hasConsent('analytics')) {
    return <div>Analytics disabled</div>;
  }
  
  return <div>Analytics enabled</div>;
}`}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
