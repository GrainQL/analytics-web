'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function PrivacyComponents() {
  const [consentState, setConsentState] = useState({
    necessary: true,
    analytics: false,
    functional: false,
    marketing: false
  });
  const [showBanner, setShowBanner] = useState(false);
  const [showPrivacyCenter, setShowPrivacyCenter] = useState(false);
  const [bannerTheme, setBannerTheme] = useState<'glass' | 'solid' | 'minimal'>('glass');
  const [bannerPosition, setBannerPosition] = useState<'top' | 'bottom'>('bottom');
  const [grain, setGrain] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize Grain Analytics
  useEffect(() => {
    const initializeGrain = async () => {
      try {
        // For now, we'll create a mock implementation
        // In a real scenario, you'd import from the built SDK
        const mockGrain = {
          tenantId: 'grainql',
          track: (eventName: string, properties?: any) => {
            console.log('Tracked event:', eventName, properties);
          },
          grantConsent: (categories: string[]) => {
            console.log('Granted consent for:', categories);
            const newState = { necessary: true };
            categories.forEach(cat => {
              newState[cat as keyof typeof newState] = true;
            });
            setConsentState(prev => ({ ...prev, ...newState }));
          },
          revokeConsent: () => {
            console.log('Revoked consent');
            setConsentState({
              necessary: true,
              analytics: false,
              functional: false,
              marketing: false
            });
          },
          hasConsent: (category?: string) => {
            if (!category) return Object.values(consentState).some(Boolean);
            return consentState[category as keyof typeof consentState] || false;
          },
          getConsentState: () => ({
            granted: Object.values(consentState).some(Boolean),
            categories: Object.keys(consentState).filter(key => consentState[key as keyof typeof consentState])
          })
        };
        
        setGrain(mockGrain);
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize Grain Analytics:', error);
      }
    };

    initializeGrain();
  }, []);

  const handleConsentChange = (category: string, value: boolean) => {
    setConsentState(prev => ({
      ...prev,
      [category]: value
    }));
    
    // Update Grain analytics consent
    if (grain) {
      if (value) {
        grain.grantConsent([category]);
      } else {
        grain.revokeConsent();
      }
    }
  };

  const grantAllConsent = () => {
    const newState = {
      necessary: true,
      analytics: true,
      functional: true,
      marketing: true
    };
    setConsentState(newState);
    setShowBanner(false);
    
    if (grain) {
      grain.grantConsent(['analytics', 'functional', 'marketing']);
    }
  };

  const revokeAllConsent = () => {
    const newState = {
      necessary: true, // Always required
      analytics: false,
      functional: false,
      marketing: false
    };
    setConsentState(newState);
    
    if (grain) {
      grain.revokeConsent();
    }
  };

  const resetBanner = () => {
    setShowBanner(true);
    setConsentState({
      necessary: true,
      analytics: false,
      functional: false,
      marketing: false
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
            ← Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Components</h1>
          <p className="text-gray-600">Test consent banners, preference centers, and privacy management</p>
        </div>

        {/* Mock Consent Banner */}
        {showBanner && (
          <div className={`fixed ${bannerPosition === 'top' ? 'top-0' : 'bottom-0'} left-0 right-0 z-50 p-4`}>
            <div className={`max-w-4xl mx-auto rounded-xl shadow-2xl border backdrop-blur-md ${
              bannerTheme === 'glass' 
                ? 'bg-white/80 backdrop-blur-md border-white/30 shadow-white/20' 
                : bannerTheme === 'solid'
                ? 'bg-white/95 backdrop-blur-sm border-gray-200/50'
                : 'bg-gray-900/90 backdrop-blur-md text-white border-gray-700/50 shadow-gray-900/20'
            }`}>
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className={`text-lg font-semibold mb-2 ${
                      bannerTheme === 'minimal' ? 'text-white' : 'text-gray-900'
                    }`}>
                      Privacy & Cookie Consent
                    </h3>
                    <p className={`text-sm ${
                      bannerTheme === 'minimal' ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                      We use cookies and similar technologies to provide, protect, and improve our services. 
                      You can choose to accept all cookies or customize your preferences.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowBanner(false)}
                    className={`text-gray-400 hover:text-gray-600 ${
                      bannerTheme === 'minimal' ? 'hover:text-gray-200' : ''
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={grantAllConsent}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Accept All
                  </button>
                  <button
                    onClick={() => setShowBanner(false)}
                    className={`px-4 py-2 rounded border transition-colors ${
                      bannerTheme === 'minimal'
                        ? 'border-gray-600 text-white hover:bg-gray-800'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Customize
                  </button>
                  <button
                    onClick={() => setShowBanner(false)}
                    className={`px-4 py-2 rounded transition-colors ${
                      bannerTheme === 'minimal'
                        ? 'text-gray-400 hover:text-gray-200'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Reject All
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SDK Status */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/30 p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Grain Analytics SDK Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-3 ${isInitialized ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              <span className="text-sm font-medium">SDK Initialized: {isInitialized ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-3 ${grain ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              <span className="text-sm font-medium">Tenant ID: {grain?.tenantId || 'Not set'}</span>
            </div>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-3 ${grain ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              <span className="text-sm font-medium">Consent Manager: {grain ? 'Active' : 'Inactive'}</span>
            </div>
          </div>
        </div>

        {/* Component Controls */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/30 p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Component Controls</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-3">Show Components</h3>
              <div className="space-y-3">
                <button
                  onClick={() => setShowBanner(!showBanner)}
                  className={`w-full px-4 py-2 rounded transition-colors ${
                    showBanner 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {showBanner ? 'Hide' : 'Show'} Consent Banner
                </button>
                <button
                  onClick={() => setShowPrivacyCenter(!showPrivacyCenter)}
                  className={`w-full px-4 py-2 rounded transition-colors ${
                    showPrivacyCenter 
                      ? 'bg-purple-600 text-white hover:bg-purple-700' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {showPrivacyCenter ? 'Hide' : 'Show'} Privacy Center
                </button>
              </div>
            </div>
            <div>
              <h3 className="font-medium mb-3">Banner Settings</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Theme</label>
                  <select
                    value={bannerTheme}
                    onChange={(e) => setBannerTheme(e.target.value as any)}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="glass">Glass</option>
                    <option value="solid">Solid</option>
                    <option value="minimal">Minimal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                  <select
                    value={bannerPosition}
                    onChange={(e) => setBannerPosition(e.target.value as any)}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="bottom">Bottom</option>
                    <option value="top">Top</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Consent State */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/30 p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Current Consent State</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(consentState).map(([category, value]) => (
              <div key={category} className="flex items-center justify-between p-3 border border-gray-200/30 bg-white/30 rounded-xl">
                <span className="capitalize font-medium">{category}</span>
                <div className={`w-3 h-3 rounded-full ${value ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 flex space-x-3">
            <button
              onClick={grantAllConsent}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              Grant All
            </button>
            <button
              onClick={revokeAllConsent}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Revoke All
            </button>
          </div>
        </div>

        {/* Privacy Preference Center */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/30 p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Privacy Preference Center</h2>
          <div className="space-y-4">
            {[
              {
                category: 'necessary',
                title: 'Necessary Cookies',
                description: 'Essential for the website to function properly. Cannot be disabled.',
                required: true
              },
              {
                category: 'analytics',
                title: 'Analytics Cookies',
                description: 'Help us understand how visitors interact with our website by collecting and reporting information anonymously.',
                required: false
              },
              {
                category: 'functional',
                title: 'Functional Cookies',
                description: 'Enable enhanced functionality and personalization, such as remembering your preferences.',
                required: false
              },
              {
                category: 'marketing',
                title: 'Marketing Cookies',
                description: 'Used to track visitors across websites to display relevant and engaging advertisements.',
                required: false
              }
            ].map((item) => (
              <div key={item.category} className="border border-gray-200/30 bg-white/30 rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 mb-1">
                      {item.title}
                      {item.required && <span className="text-red-500 ml-1">*</span>}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                  </div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={consentState[item.category as keyof typeof consentState]}
                      onChange={(e) => handleConsentChange(item.category, e.target.checked)}
                      disabled={item.required}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      {consentState[item.category as keyof typeof consentState] ? 'Enabled' : 'Disabled'}
                    </span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Privacy Center Modal */}
        {showPrivacyCenter && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border border-white/30 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200/30">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-semibold text-gray-900">Privacy Preferences</h2>
                  <button
                    onClick={() => setShowPrivacyCenter(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-gray-600 mt-2">
                  Manage your privacy preferences and cookie settings.
                </p>
              </div>
              
              <div className="p-6">
                <div className="space-y-6">
                  {[
                    {
                      category: 'necessary',
                      title: 'Necessary Cookies',
                      description: 'Essential for the website to function properly. Cannot be disabled.',
                      required: true
                    },
                    {
                      category: 'analytics',
                      title: 'Analytics Cookies',
                      description: 'Help us understand how visitors interact with our website by collecting and reporting information anonymously.',
                      required: false
                    },
                    {
                      category: 'functional',
                      title: 'Functional Cookies',
                      description: 'Enable enhanced functionality and personalization, such as remembering your preferences.',
                      required: false
                    },
                    {
                      category: 'marketing',
                      title: 'Marketing Cookies',
                      description: 'Used to track visitors across websites to display relevant and engaging advertisements.',
                      required: false
                    }
                  ].map((item) => (
                    <div key={item.category} className="border border-gray-200/30 bg-white/50 rounded-xl p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 mb-1">
                            {item.title}
                            {item.required && <span className="text-red-500 ml-1">*</span>}
                          </h3>
                          <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                        </div>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={consentState[item.category as keyof typeof consentState]}
                            onChange={(e) => handleConsentChange(item.category, e.target.checked)}
                            disabled={item.required}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            {consentState[item.category as keyof typeof consentState] ? 'Enabled' : 'Disabled'}
                          </span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-8 flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={grantAllConsent}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Accept All
                  </button>
                  <button
                    onClick={revokeAllConsent}
                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                  >
                    Reject All
                  </button>
                  <button
                    onClick={() => setShowPrivacyCenter(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
                  >
                    Save Preferences
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Privacy Features */}
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/30 p-6">
            <h2 className="text-xl font-semibold mb-4">Consent Management Features</h2>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center">
                <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Configurable consent modes (opt-in, opt-out, disabled)
              </li>
              <li className="flex items-center">
                <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Event queueing before consent
              </li>
              <li className="flex items-center">
                <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Category-based consent management
              </li>
              <li className="flex items-center">
                <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Consent audit trail
              </li>
              <li className="flex items-center">
                <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                GDPR/CCPA compliance
              </li>
            </ul>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/30 p-6">
            <h2 className="text-xl font-semibold mb-4">Component Themes</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border border-gray-200/30 bg-white/30 rounded-xl">
                <div>
                  <div className="font-medium">Glass Theme</div>
                  <div className="text-sm text-gray-600">Backdrop blur with transparency</div>
                </div>
                <div className="w-8 h-8 bg-white/80 backdrop-blur-xl border border-white/30 rounded-xl shadow-lg"></div>
              </div>
              <div className="flex items-center justify-between p-3 border border-gray-200/30 bg-white/30 rounded-xl">
                <div>
                  <div className="font-medium">Solid Theme</div>
                  <div className="text-sm text-gray-600">Clean white background</div>
                </div>
                <div className="w-8 h-8 bg-white/95 backdrop-blur-md border border-gray-200/50 rounded-xl"></div>
              </div>
              <div className="flex items-center justify-between p-3 border border-gray-200/30 bg-white/30 rounded-xl">
                <div>
                  <div className="font-medium">Minimal Theme</div>
                  <div className="text-sm text-gray-600">Dark theme with minimal design</div>
                </div>
                <div className="w-8 h-8 bg-gray-900/90 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-lg"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
