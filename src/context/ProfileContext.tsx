import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  activeProfile,
  addProfile,
  createProfile,
  loadProfiles,
  removeProfile,
  setActiveProfile,
  subscribeProfiles,
  type AvatarId,
  type ProfilesStore,
  type UserProfile,
} from "../lib/profiles";

type ProfileContextValue = {
  store: ProfilesStore;
  profile: UserProfile | null;
  ready: boolean;
  pickProfile: (id: string) => void;
  registerProfile: (nombre: string, edad: number, avatar: AvatarId) => void;
  deleteProfile: (id: string) => void;
  needsOnboarding: boolean;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<ProfilesStore>(() => loadProfiles());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setStore(loadProfiles());
    setReady(true);
    return subscribeProfiles(() => setStore(loadProfiles()));
  }, []);

  const profile = useMemo(() => activeProfile(store), [store]);

  const pickProfile = useCallback((id: string) => {
    setStore(setActiveProfile(loadProfiles(), id));
    window.dispatchEvent(new Event("akemi-progress"));
  }, []);

  const registerProfile = useCallback((nombre: string, edad: number, avatar: AvatarId) => {
    const created = createProfile(nombre, edad, avatar);
    setStore(addProfile(loadProfiles(), created));
    window.dispatchEvent(new Event("akemi-progress"));
  }, []);

  const deleteProfile = useCallback((id: string) => {
    setStore(removeProfile(loadProfiles(), id));
    window.dispatchEvent(new Event("akemi-progress"));
  }, []);

  const needsOnboarding = ready && !profile;

  const value: ProfileContextValue = {
    store,
    profile,
    ready,
    pickProfile,
    registerProfile,
    deleteProfile,
    needsOnboarding,
  };

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfileContext(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfileContext debe usarse dentro de ProfileProvider");
  return ctx;
}