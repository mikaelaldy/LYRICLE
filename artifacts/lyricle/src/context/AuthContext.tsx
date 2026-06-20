import { createContext, useContext, ReactNode } from "react";
import { useUser } from "@clerk/react";

type ClerkUser = ReturnType<typeof useUser>["user"];

interface AuthContextValue {
  user: ClerkUser;
  isLoaded: boolean;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoaded: true,
});

export function useAuthUser(): AuthContextValue {
  return useContext(AuthContext);
}

export function ClerkAuthBridge({ children }: { children: ReactNode }) {
  const { user, isLoaded } = useUser();
  return (
    <AuthContext.Provider value={{ user, isLoaded }}>
      {children}
    </AuthContext.Provider>
  );
}
