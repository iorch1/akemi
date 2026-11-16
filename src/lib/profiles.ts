/** Perfiles locales (multi-jugador en el mismo dispositivo). */

export type AvatarId =
  | "sol"
  | "gato"
  | "estrella"
  | "corazon"
  | "flor"
  | "cohete"
  | "delfin"
  | "mariposa"
  | "robot"
  | "unicornio"
  | "panda"
  | "helado";

export type UserProfile = {
  id: string;
  nombre: string;
  edad: number;
  avatar: AvatarId;
  createdAt: number;
};

export type ProfilesStore = {
  activeId: string | null;
  profiles: UserProfile[];
};

const STORAGE_KEY = "akemi-profiles-v1";
const LEGACY_PROGRESS = "akemi-progress-v2";
const LEGACY_PROGRESS_V3_PREFIX = "akemi-progress-v3-";
const SCHEMA_MIGRATION_FLAG = "akemi-schema-migrated-v4";

export const AVATAR_CHOICES: { id: AvatarId; emoji: string; label: string }[] = [
  { id: "sol", emoji: "🌞", label: "Sol" },
  { id: "gato", emoji: "🐱", label: "Gatito" },
  { id: "estrella", emoji: "⭐", label: "Estrella" },
  { id: "corazon", emoji: "💖", label: "Corazón" },
  { id: "flor", emoji: "🌸", label: "Flor" },
  { id: "cohete", emoji: "🚀", label: "Cohete" },
  { id: "delfin", emoji: "🐬", label: "Delfín" },
  { id: "mariposa", emoji: "🦋", label: "Mariposa" },
  { id: "robot", emoji: "🤖", label: "Robot" },
  { id: "unicornio", emoji: "🦄", label: "Unicornio" },
  { id: "panda", emoji: "🐼", label: "Panda" },
  { id: "helado", emoji: "🍦", label: "Helado" },
];

export function avatarEmoji(id: AvatarId): string {
  return AVATAR_CHOICES.find((a) => a.id === id)?.emoji ?? "🌞";
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `p-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function emptyStore(): ProfilesStore {
  return { activeId: null, profiles: [] };
}

export function loadProfiles(): ProfilesStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const store = (() => {
      if (!raw) return migrateLegacyProgress();
      const parsed = JSON.parse(raw) as ProfilesStore;
      if (!parsed.profiles?.length) return migrateLegacyProgress();
      return {
        activeId: parsed.activeId ?? parsed.profiles[0]?.id ?? null,
        profiles: parsed.profiles,
      };
    })();
    runProgressSchemaMigration(store);
    return store;
  } catch {
    const store = migrateLegacyProgress();
    runProgressSchemaMigration(store);
    return store;
  }
}

/** Una sola vez: borra progreso v2/v3 para que desbloqueos antiguos no sigan vigentes. */
export function runProgressSchemaMigration(store: ProfilesStore): void {
  if (localStorage.getItem(SCHEMA_MIGRATION_FLAG)) return;
  for (const p of store.profiles) {
    localStorage.removeItem(`${LEGACY_PROGRESS_V3_PREFIX}${p.id}`);
  }
  localStorage.removeItem(LEGACY_PROGRESS);
  const remove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(LEGACY_PROGRESS_V3_PREFIX)) remove.push(k);
  }
  for (const k of remove) localStorage.removeItem(k);
  localStorage.setItem(SCHEMA_MIGRATION_FLAG, "1");
}

function migrateLegacyProgress(): ProfilesStore {
  const hadLegacy = Boolean(localStorage.getItem(LEGACY_PROGRESS));
  localStorage.removeItem(LEGACY_PROGRESS);
  if (!hadLegacy) return emptyStore();
  const profile: UserProfile = {
    id: newId(),
    nombre: "Explorador",
    edad: 6,
    avatar: "sol",
    createdAt: Date.now(),
  };
  const store: ProfilesStore = { activeId: profile.id, profiles: [profile] };
  saveProfiles(store);
  return store;
}

export function saveProfiles(store: ProfilesStore): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  window.dispatchEvent(new Event("akemi-profiles"));
}

export function progressKey(profileId: string): string {
  return `akemi-progress-v4-${profileId}`;
}

export function createProfile(nombre: string, edad: number, avatar: AvatarId): UserProfile {
  const trimmed = nombre.trim().slice(0, 24);
  const safeAge = Math.min(14, Math.max(3, Math.round(edad)));
  return {
    id: newId(),
    nombre: trimmed || "Amigo",
    edad: safeAge,
    avatar,
    createdAt: Date.now(),
  };
}

export function addProfile(store: ProfilesStore, profile: UserProfile): ProfilesStore {
  const next = { ...store, profiles: [...store.profiles, profile], activeId: profile.id };
  saveProfiles(next);
  return next;
}

export function setActiveProfile(store: ProfilesStore, profileId: string): ProfilesStore {
  if (!store.profiles.some((p) => p.id === profileId)) return store;
  const next = { ...store, activeId: profileId };
  saveProfiles(next);
  return next;
}

export function removeProfile(store: ProfilesStore, profileId: string): ProfilesStore {
  const profiles = store.profiles.filter((p) => p.id !== profileId);
  localStorage.removeItem(progressKey(profileId));
  const activeId =
    store.activeId === profileId ? (profiles[0]?.id ?? null) : store.activeId;
  const next = { activeId, profiles };
  saveProfiles(next);
  return next;
}

export function activeProfile(store: ProfilesStore): UserProfile | null {
  if (!store.activeId) return null;
  return store.profiles.find((p) => p.id === store.activeId) ?? null;
}

export function subscribeProfiles(onChange: () => void): () => void {
  const handler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) onChange();
  };
  window.addEventListener("storage", handler);
  const custom = () => onChange();
  window.addEventListener("akemi-profiles", custom);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener("akemi-profiles", custom);
  };
}