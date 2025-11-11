
import React, { Component, ErrorInfo, ReactNode } from 'react';

export interface ErrorBoundaryFallbackProps {
  error: Error | null;
  reset: () => void;
}

type ErrorBoundaryFallback = ReactNode | ((props: ErrorBoundaryFallbackProps) => ReactNode);

interface Props {
  children: ReactNode;
  fallback?: ErrorBoundaryFallback;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
  resetKeys?: unknown[];
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const arraysAreEqual = (a?: unknown[], b?: unknown[]): boolean => {
  if (a === b) {
    return true;
  }

  if (!a || !b || a.length !== b.length) {
    return false;
  }

  for (let index = 0; index < a.length; index += 1) {
    if (!Object.is(a[index], b[index])) {
      return false;
    }
  }

  return true;
};

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  public componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && !arraysAreEqual(this.props.resetKeys, prevProps.resetKeys)) {
      this.resetBoundary();
    }
  }

  private resetBoundary = () => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      const { fallback } = this.props;

      if (typeof fallback === 'function') {
        return fallback({ error: this.state.error, reset: this.resetBoundary });
      }

      if (fallback) {
        return fallback;
      }

      return (
        <div className="p-4 bg-red-800 text-white">
          <h1>Something went wrong.</h1>
          {this.state.error ? <pre>{this.state.error.toString()}</pre> : null}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
