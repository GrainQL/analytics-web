'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { GrainProvider } from '../../../src/react';

export default function Home() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <GrainProvider config={{ 
      tenantId: 'mytestapp',
      authStrategy: 'NONE'
    }}>
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Grain Analytics SDK
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Component Showcase & Testing Environment
          </p>
          <div className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            Development Mode
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Analytics Testing */}
          <Link 
            href="/analytics-testing" 
            className="group bg-white/80 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 border border-white/30 hover:border-blue-300/50"
          >
            <div className="text-blue-600 mb-4">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
              Analytics Testing
            </h3>
            <p className="text-gray-600 mb-4">
              Test event tracking, heartbeat monitoring, and page view detection in real-time.
            </p>
            <div className="text-blue-600 font-medium group-hover:text-blue-700">
              Start Testing →
            </div>
          </Link>

          {/* React Components */}
          <Link 
            href="/react-components" 
            className="group bg-white/80 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 border border-white/30 hover:border-green-300/50"
          >
            <div className="text-green-600 mb-4">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3 group-hover:text-green-600 transition-colors">
              React Components
            </h3>
            <p className="text-gray-600 mb-4">
              Preview and test React hooks, providers, and privacy components.
            </p>
            <div className="text-green-600 font-medium group-hover:text-green-700">
              View Components →
            </div>
          </Link>

          {/* Privacy Components */}
          <Link 
            href="/privacy-components" 
            className="group bg-white/80 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 border border-white/30 hover:border-purple-300/50"
          >
            <div className="text-purple-600 mb-4">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3 group-hover:text-purple-600 transition-colors">
              Privacy Components
            </h3>
            <p className="text-gray-600 mb-4">
              Test consent banners, preference centers, and privacy management.
            </p>
            <div className="text-purple-600 font-medium group-hover:text-purple-700">
              Test Privacy →
        </div>
          </Link>

          {/* Configuration Testing */}
          <Link 
            href="/config-testing" 
            className="group bg-white/80 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 border border-white/30 hover:border-orange-300/50"
          >
            <div className="text-orange-600 mb-4">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3 group-hover:text-orange-600 transition-colors">
              Configuration Testing
            </h3>
            <p className="text-gray-600 mb-4">
              Test remote configuration, caching, and real-time updates.
            </p>
            <div className="text-orange-600 font-medium group-hover:text-orange-700">
              Test Config →
            </div>
          </Link>

          {/* Event Inspector */}
          <Link 
            href="/event-inspector" 
            className="group bg-white/80 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 border border-white/30 hover:border-red-300/50"
          >
            <div className="text-red-600 mb-4">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3 group-hover:text-red-600 transition-colors">
              Event Inspector
            </h3>
            <p className="text-gray-600 mb-4">
              Monitor and inspect all analytics events in real-time.
            </p>
            <div className="text-red-600 font-medium group-hover:text-red-700">
              Inspect Events →
            </div>
          </Link>

          {/* Performance Testing */}
          <Link 
            href="/performance" 
            className="group bg-white/80 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 border border-white/30 hover:border-teal-300/50"
          >
            <div className="text-teal-600 mb-4">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3 group-hover:text-teal-600 transition-colors">
              Performance Testing
            </h3>
            <p className="text-gray-600 mb-4">
              Test bundle size, loading performance, and memory usage.
            </p>
            <div className="text-teal-600 font-medium group-hover:text-teal-700">
              Test Performance →
            </div>
          </Link>
        </div>

        {isClient && (
          <div className="mt-16 text-center">
            <div className="inline-flex items-center px-6 py-3 bg-white/80 rounded-xl shadow-lg border border-white/30">
              <div className="text-sm text-gray-600">
                <span className="font-medium">SDK Version:</span> 2.1.2
                <span className="mx-2">•</span>
                <span className="font-medium">Environment:</span> Development
                <span className="mx-2">•</span>
                <span className="font-medium">Client:</span> {typeof window !== 'undefined' ? 'Browser' : 'Server'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </GrainProvider>
  );
}