import { Component, ReactNode } from "react";
import { ClerkAvailabilityContext } from "@/context/ClerkAvailabilityContext";

interface Props {
  children: ReactNode;
  fallback: ReactNode;
}

interface State {
  hasError: boolean;
}

function isClerkError(error: unknown): boolean {
  if (!error) return false;
  const msg = error instanceof Error ? error.message : String(error);
  return (
    msg.includes("ChunkLoadError") ||
    msg.includes("Loading chunk") ||
    msg.includes("clerk") ||
    msg.includes("Clerk") ||
    (error instanceof Error && error.name === "ChunkLoadError")
  );
}

export class ClerkErrorBoundary extends Component<Props, State> {
  private timeoutId: any = null;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  private handleError = (event: ErrorEvent | Event) => {
    const target = event.target;
    if (target instanceof HTMLScriptElement && target.src && target.src.includes("clerk")) {
      console.warn("[Lyricle] Clerk script failed to load (resource error) — running in guest mode.", target.src);
      this.setState({ hasError: true });
      return;
    }

    if ("error" in event || "message" in event) {
      const errEvent = event as ErrorEvent;
      const err = errEvent.error || errEvent.message;
      if (isClerkError(err)) {
        console.warn("[Lyricle] Clerk failed to load (global error) — running in guest mode.", err);
        this.setState({ hasError: true });
      }
    }
  };

  private handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    if (isClerkError(event.reason)) {
      console.warn("[Lyricle] Clerk failed to load (unhandled rejection) — running in guest mode.", event.reason);
      this.setState({ hasError: true });
    }
  };

  private handleClerkLoaded = () => {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  };

  componentDidMount() {
    window.addEventListener("error", this.handleError, true);
    window.addEventListener("unhandledrejection", this.handleUnhandledRejection);
    window.addEventListener("lyricle:clerk-loaded", this.handleClerkLoaded);

    this.timeoutId = setTimeout(() => {
      console.warn("[Lyricle] Clerk load timed out — falling back to guest mode.");
      this.setState({ hasError: true });
    }, 4000);
  }

  componentWillUnmount() {
    window.removeEventListener("error", this.handleError, true);
    window.removeEventListener("unhandledrejection", this.handleUnhandledRejection);
    window.removeEventListener("lyricle:clerk-loaded", this.handleClerkLoaded);
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }

  static getDerivedStateFromError(error: unknown): State {
    if (isClerkError(error)) {
      return { hasError: true };
    }
    throw error;
  }

  componentDidCatch(error: unknown, info: unknown) {
    if (isClerkError(error)) {
      console.warn("[Lyricle] Clerk failed to load — running in guest mode.", error, info);
    } else {
      throw error;
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <ClerkAvailabilityContext.Provider value={{ clerkAvailable: false }}>
          {this.props.fallback}
        </ClerkAvailabilityContext.Provider>
      );
    }
    return (
      <ClerkAvailabilityContext.Provider value={{ clerkAvailable: true }}>
        {this.props.children}
      </ClerkAvailabilityContext.Provider>
    );
  }
}
