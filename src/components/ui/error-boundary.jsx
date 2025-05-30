import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Button } from './button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Error Boundary Component
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Log error to console and potentially to error reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // You could send this to an error reporting service like Sentry
    // reportError(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      const { fallback: CustomFallback, showDetails = false } = this.props;
      
      // If a custom fallback is provided, use it
      if (CustomFallback) {
        return <CustomFallback error={this.state.error} retry={this.handleRetry} />;
      }

      // Default error UI
      return (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <CardTitle className="text-red-900">Something went wrong</CardTitle>
            </div>
            <CardDescription className="text-red-700">
              An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleRetry}
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                Refresh Page
              </Button>
            </div>
            
            {showDetails && this.state.error && (
              <details className="mt-4">
                <summary className="text-sm font-medium text-red-800 cursor-pointer">
                  Error Details
                </summary>
                <div className="mt-2 p-3 bg-red-100 rounded border border-red-200">
                  <pre className="text-xs text-red-900 whitespace-pre-wrap">
                    {this.state.error.toString()}
                    {this.state.errorInfo.componentStack}
                  </pre>
                </div>
              </details>
            )}
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

/**
 * Simple error fallback component
 */
export const SimpleErrorFallback = ({ error, retry }) => (
  <div className="text-center py-8">
    <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
    <h3 className="text-lg font-medium text-gray-900 mb-2">Oops! Something went wrong</h3>
    <p className="text-gray-600 mb-4">We encountered an unexpected error.</p>
    <Button onClick={retry} variant="outline">
      <RefreshCw className="w-4 h-4 mr-2" />
      Try Again
    </Button>
  </div>
);

/**
 * HOC to wrap components with error boundary
 */
export const withErrorBoundary = (Component, errorFallback) => {
  return function WrappedComponent(props) {
    return (
      <ErrorBoundary fallback={errorFallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
};

export default ErrorBoundary; 