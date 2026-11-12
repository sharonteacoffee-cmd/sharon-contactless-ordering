import { Component, type ErrorInfo, type ReactNode } from 'react';
import { SystemErrorView } from '@/components/common/SystemErrorView';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
  };

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(_error: Error, _errorInfo: ErrorInfo): void {
    // Intentionally suppressed from UI to prevent leaking stack details
  }

  private handleReset = (): void => {
    this.setState({ hasError: false });
    window.location.assign('/');
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <SystemErrorView
          code="500"
          title="Something went wrong while brewing this page"
          description="We hit an unexpected hiccup. Tap below to return to Sharon outlets and try again."
          actionLabel="Back to Outlets"
          onAction={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}
