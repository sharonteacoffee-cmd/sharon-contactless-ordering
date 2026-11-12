import { Component, type ErrorInfo, type ReactNode } from 'react';
import { SystemErrorView } from './SystemErrorView';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  public state: ErrorBoundaryState = {
    hasError: false,
  };

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[Dashboard ErrorBoundary]', error, errorInfo);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false });
    window.location.assign('/kds');
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <SystemErrorView
          code="500"
          title="Unexpected Operations Portal Error"
          subtitle="Something went wrong while rendering this screen. Reset to return to the Live KDS."
          actionLabel="Reload KDS"
          onAction={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}
