import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { loadProfile, saveProfile as persistProfile } from "./storage";
import type { Profile } from "./types";

interface ProfileContextValue {
  profile: Profile | null;
  isLoading: boolean;
  saveProfile: (profile: Profile) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProfile()
      .then(setProfile)
      .finally(() => setIsLoading(false));
  }, []);

  const saveProfile = useCallback(async (next: Profile) => {
    await persistProfile(next);
    setProfile(next);
  }, []);

  return (
    <ProfileContext.Provider value={{ profile, isLoading, saveProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within a ProfileProvider");
  return ctx;
}
