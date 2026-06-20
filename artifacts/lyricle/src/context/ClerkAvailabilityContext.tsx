import { createContext, useContext } from "react";

interface ClerkAvailabilityContextValue {
  clerkAvailable: boolean;
}

export const ClerkAvailabilityContext = createContext<ClerkAvailabilityContextValue>({
  clerkAvailable: true,
});

export function useClerkAvailability() {
  return useContext(ClerkAvailabilityContext);
}
