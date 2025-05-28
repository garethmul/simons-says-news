import { useState, useEffect } from 'react'

function Home() {
  const [healthData, setHealthData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        setHealthData(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to fetch health data:', err)
        setLoading(false)
      })
  }, [])

  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to Simon's Says News
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Your personalised news application built with React and Node.js
        </p>
        
        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Latest News</h3>
            <p className="text-gray-600">Stay updated with the latest news from around the world</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Personalised</h3>
            <p className="text-gray-600">Get news tailored to your interests and preferences</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Fast & Reliable</h3>
            <p className="text-gray-600">Built with modern technologies for optimal performance</p>
          </div>
        </div>
      </div>

      {/* API Status Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">System Status</h2>
        
        {loading ? (
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-gray-600">Checking system status...</span>
          </div>
        ) : healthData ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">API Status:</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                {healthData.status}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Environment:</span>
              <span className="text-gray-900 font-medium">{healthData.environment}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Server Port:</span>
              <span className="text-gray-900 font-medium">{healthData.port}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Last Updated:</span>
              <span className="text-gray-900 font-medium">
                {new Date(healthData.timestamp).toLocaleString()}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-red-600">
            Failed to connect to API. Please check your server configuration.
          </div>
        )}
      </div>

      {/* Getting Started Section */}
      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Getting Started</h2>
        <div className="space-y-2 text-gray-700">
          <p>🚀 Your development environment is ready!</p>
          <p>📝 Start building your news application by:</p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Adding API routes in <code className="bg-white px-2 py-1 rounded text-sm">src/routes/</code></li>
            <li>Creating new React components in <code className="bg-white px-2 py-1 rounded text-sm">src/components/</code></li>
            <li>Adding new pages in <code className="bg-white px-2 py-1 rounded text-sm">src/pages/</code></li>
            <li>Configuring your database connection in <code className="bg-white px-2 py-1 rounded text-sm">.env</code></li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default Home 