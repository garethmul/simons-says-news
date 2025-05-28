import { Routes, Route } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Home from './pages/Home'
import About from './pages/About'
import Navigation from './components/Navigation'

function App() {
  const [apiStatus, setApiStatus] = useState('checking')

  useEffect(() => {
    // Check API health on app load
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        console.log('API Health:', data)
        setApiStatus('connected')
      })
      .catch(err => {
        console.error('API connection failed:', err)
        setApiStatus('disconnected')
      })
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        {/* API Status Indicator */}
        <div className="mb-4">
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            apiStatus === 'connected' 
              ? 'bg-green-100 text-green-800' 
              : apiStatus === 'disconnected'
              ? 'bg-red-100 text-red-800'
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            <div className={`w-2 h-2 rounded-full mr-2 ${
              apiStatus === 'connected' 
                ? 'bg-green-400' 
                : apiStatus === 'disconnected'
                ? 'bg-red-400'
                : 'bg-yellow-400'
            }`}></div>
            API {apiStatus === 'checking' ? 'Checking...' : apiStatus === 'connected' ? 'Connected' : 'Disconnected'}
          </div>
        </div>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </main>
    </div>
  )
}

export default App 