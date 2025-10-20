'use client';

import Link from 'next/link';

export default function Performance() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
            ← Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Performance Testing</h1>
          <p className="text-gray-600">Test bundle size, loading performance, and memory usage</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h2 className="text-2xl font-semibold mb-4">Coming Soon</h2>
          <p className="text-gray-600 mb-6">
            This section will provide performance testing tools including:
          </p>
          <ul className="text-left max-w-md mx-auto space-y-2 text-gray-600">
            <li>• Bundle size analysis</li>
            <li>• Loading performance metrics</li>
            <li>• Memory usage monitoring</li>
            <li>• Event processing performance</li>
            <li>• Network request optimization</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
