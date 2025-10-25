"use client";
import React, { createContext, useContext, useState, useEffect, FC, ReactNode } from "react";

interface AuthContextProps {
  isSignedIn: boolean;
  setIsSignedIn: (value: boolean) => void;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [isSignedIn, setIsSignedIn] = useState(false);

  // Restore sign-in state from localStorage on mount
  useEffect(() => {
    const storedSignIn = localStorage.getItem("solana-signed-in");
    if (storedSignIn === "true") {
      setIsSignedIn(true);
    }
  }, []);

  // Persist sign-in state to localStorage
  const handleSetIsSignedIn = (value: boolean) => {
    setIsSignedIn(value);
    localStorage.setItem("solana-signed-in", value.toString());
  };

  return (
    <AuthContext.Provider value={{ isSignedIn, setIsSignedIn: handleSetIsSignedIn }}>
      {children}
    </AuthContext.Provider>
  );
};