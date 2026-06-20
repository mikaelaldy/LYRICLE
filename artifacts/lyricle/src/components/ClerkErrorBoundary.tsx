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
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
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
