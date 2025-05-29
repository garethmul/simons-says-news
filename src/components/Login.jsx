import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, Lock, Mail, AlertCircle, UserPlus } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [registerMode, setRegisterMode] = useState(false);
  const { login, resetPassword, register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (resetMode) {
        await resetPassword(email);
        setError('Password reset email sent! Check your inbox.');
        setResetMode(false);
      } else if (registerMode) {
        await register(email, password);
        setError('Account created successfully! You can now sign in.');
        setRegisterMode(false);
      } else {
        await login(email, password);
      }
    } catch (error) {
      console.error('Authentication error:', error);
      if (error.code === 'auth/user-not-found') {
        setError('No account found with this email address.');
      } else if (error.code === 'auth/wrong-password') {
        setError('Incorrect password. Please try again.');
      } else if (error.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (error.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists.');
      } else if (error.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else if (error.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later.');
      } else if (error.message.includes('Unauthorized email')) {
        setError(error.message);
      } else {
        setError('Authentication failed. Please check your credentials.');
      }
    }

    setLoading(false);
  };

  const getTitle = () => {
    if (resetMode) return 'Reset Password';
    if (registerMode) return 'Create Account';
    return 'Sign In';
  };

  const getDescription = () => {
    if (resetMode) return 'Enter your email to receive a password reset link';
    if (registerMode) return 'Create a new account to access Project Eden';
    return 'Sign in to access the AI-powered content automation dashboard';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Project Eden
          </CardTitle>
          <CardDescription className="text-center">
            {getDescription()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant={error.includes('sent') || error.includes('successfully') ? 'default' : 'destructive'}>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {!resetMode && (
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                    disabled={loading}
                    minLength={registerMode ? 6 : 1}
                  />
                </div>
                {registerMode && (
                  <p className="text-xs text-gray-600">Password must be at least 6 characters</p>
                )}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : registerMode ? (
                <UserPlus className="mr-2 h-4 w-4" />
              ) : null}
              {getTitle()}
            </Button>

            <div className="text-center space-y-2">
              {!resetMode && (
                <button
                  type="button"
                  onClick={() => {
                    setRegisterMode(!registerMode);
                    setError('');
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800 block w-full"
                >
                  {registerMode ? 'Already have an account? Sign in' : 'Need an account? Create one'}
                </button>
              )}
              
              {!registerMode && (
                <button
                  type="button"
                  onClick={() => {
                    setResetMode(!resetMode);
                    setError('');
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {resetMode ? 'Back to sign in' : 'Forgot password?'}
                </button>
              )}
            </div>
          </form>

          <div className="mt-6 pt-6 border-t text-center text-sm text-gray-600">
            <p>Eden.co.uk Content Management System</p>
            <p className="mt-1">Access restricted to authorized users only</p>
            {!registerMode && !resetMode && (
              <p className="mt-2 text-xs text-green-600">
                ✅ All authenticated users currently have access
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login; 