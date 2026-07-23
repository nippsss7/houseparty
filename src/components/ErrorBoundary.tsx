import { Component, type PropsWithChildren, type ReactNode } from "react";

import { FullScreenState } from "@/components/FullScreenState";

interface State {
  error: Error | null;
}

/**
 * Catches render-time errors anywhere below it. Without this, a single
 * unexpected error (a null field from an unusual API response, a bad prop,
 * etc.) unmounts the whole tree — in a production build that's a blank
 * white/black screen with LogBox's dev-only red screen unavailable to
 * explain why, and no way back short of force-quitting the app.
 */
export class ErrorBoundary extends Component<PropsWithChildren, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error("Render error caught by ErrorBoundary:", error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <FullScreenState
          emoji="😵"
          title="Something went wrong"
          body="An unexpected error occurred. Try again — if it keeps happening, restart the app."
          actionLabel="Try again"
          onAction={() => this.setState({ error: null })}
        />
      );
    }
    return this.props.children;
  }
}
