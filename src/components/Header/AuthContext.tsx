"use client";

import { createContext, useContext } from "react";

export type HeaderUser = {
  id: string;
  avatarUrl: string | null;
};

const HeaderUserContext = createContext<HeaderUser | null>(null);

export const HeaderAuthProvider = ({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser: HeaderUser | null;
}) => (
  <HeaderUserContext.Provider value={initialUser}>
    {children}
  </HeaderUserContext.Provider>
);

export const useInitialHeaderUser = () => useContext(HeaderUserContext);
