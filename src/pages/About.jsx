function About() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">About Simon's Says News</h1>
        
        <div className="prose prose-lg max-w-none">
          <p className="text-gray-600 mb-6">
            Simon's Says News is a modern, full-stack news application built with cutting-edge web technologies. 
            It provides a personalised news experience with a focus on performance, user experience, and scalability.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">Technology Stack</h2>
          
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Frontend */}
            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-blue-900 mb-3">Frontend</h3>
              <ul className="space-y-2 text-blue-800">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-blue-600 rounded-full mr-3"></span>
                  React 18 with Hooks
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-blue-600 rounded-full mr-3"></span>
                  React Router for navigation
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-blue-600 rounded-full mr-3"></span>
                  Vite for fast development
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-blue-600 rounded-full mr-3"></span>
                  Tailwind CSS for styling
                </li>
              </ul>
            </div>

            {/* Backend */}
            <div className="bg-green-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-green-900 mb-3">Backend</h3>
              <ul className="space-y-2 text-green-800">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-600 rounded-full mr-3"></span>
                  Node.js with Express
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-600 rounded-full mr-3"></span>
                  ES6 Modules
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-600 rounded-full mr-3"></span>
                  Session management
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-600 rounded-full mr-3"></span>
                  CORS configuration
                </li>
              </ul>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">Development Features</h2>
          
          <div className="bg-gray-50 p-6 rounded-lg mb-6">
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start">
                <span className="text-green-500 mr-3 mt-1">✓</span>
                <div>
                  <strong>Hot Module Replacement:</strong> Instant updates during development without losing state
                </div>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-3 mt-1">✓</span>
                <div>
                  <strong>Automatic Port Management:</strong> Unique ports to avoid conflicts with other projects
                </div>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-3 mt-1">✓</span>
                <div>
                  <strong>Unified Development Script:</strong> Start both frontend and backend with a single command
                </div>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-3 mt-1">✓</span>
                <div>
                  <strong>Production Ready:</strong> Optimised build process for Heroku deployment
                </div>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-3 mt-1">✓</span>
                <div>
                  <strong>Modern UI:</strong> Beautiful, responsive design with Tailwind CSS
                </div>
              </li>
            </ul>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">Project Structure</h2>
          
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm mb-6">
            <pre>{`simons-says-news/
├── src/
│   ├── components/     # React components
│   ├── pages/         # React pages
│   ├── routes/        # Express API routes
│   ├── config/        # Configuration files
│   ├── utils/         # Utility functions
│   ├── services/      # Business logic
│   └── hooks/         # Custom React hooks
├── public/            # Static files
├── scripts/           # Development utilities
├── server.js          # Express server
├── start-dev.js       # Development startup
└── vite.config.js     # Vite configuration`}</pre>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">Getting Started</h2>
          
          <div className="bg-blue-50 p-6 rounded-lg">
            <p className="text-blue-800 mb-4">
              To start developing with this application:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-blue-800">
              <li>Install dependencies: <code className="bg-blue-100 px-2 py-1 rounded">npm install</code></li>
              <li>Configure your environment variables in <code className="bg-blue-100 px-2 py-1 rounded">.env</code></li>
              <li>Start development servers: <code className="bg-blue-100 px-2 py-1 rounded">npm run dev</code></li>
              <li>Open your browser to the frontend URL shown in the terminal</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}

export default About 