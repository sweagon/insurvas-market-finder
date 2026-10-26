import { Component, type ReactNode } from "react";
import { ErrorState } from "./states";

/**
 * Route-level crash guard. A broken view should degrade to a recoverable
 * message, not blank the whole SPA.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    // Surface the failure in the console for debugging without crashing.
    console.error(error);
  }

  render() {
    if (this.state.error) {
      const message =
        this.state.error instanceof Error
          ? this.state.error.message
          : "An unexpected error occurred.";
      return (
        <div className="flex h-full items-center justify-center p-6">
          <ErrorState
            title="This view hit a problem"
            message={message}
            onRetry={() => this.setState({ error: null })}
          />
        </div>
      );
    }
    return this.props.children;
  }
}
