import React from 'react';
import ProjectEden from './components/ProjectEdenRefactored';
import Login from './components/Login';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import './index.css';

// List of authorized email addresses
// Add your authorized users here
const AUTHORIZED_EMAILS = [
  // 'admin@eden.co.uk',
  // 'user@example.com',
  // Add more authorized emails as needed
];

function AuthenticatedApp() {
  const { currentUser, isAuthorized, loading } = useAuth();

  // Show loading spinner while checking auth status
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading Project Eden...</p>
        </div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!currentUser) {
    return <Login />;
  }

  // Show unauthorized message if user is logged in but not authorized
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-6">
            Your email address ({currentUser.email}) is not authorized to access Project Eden.
          </p>
          <p className="text-gray-600 mb-6">
            Please contact the administrator to request access.
          </p>
          <button
            onClick={() => useAuth().logout()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // Show the main app if authenticated and authorized
  return <ProjectEden />;
}

function App() {
  return (
    <AuthProvider authorizedEmails={AUTHORIZED_EMAILS}>
      <div className="App">
        <AuthenticatedApp />
      </div>
    </AuthProvider>
  );
}

export default App; 