"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type PrivacyCtx = {
  master: boolean; // true = hidden
  isHidden: (id: string) => boolean;
  toggleMaster: () => void;
  toggleCard: (id: string) => void;
};

const Ctx = createContext<PrivacyCtx | null>(null);

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  // Always starts private. State is session-only (not persisted) so every
  // fresh load resets to fully hidden — privacy by default.
  const [master, setMaster] = useState(true);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-privacy",
      master ? "hidden" : "visible"
    );
  }, [master]);

  const isHidden = useCallback(
    (id: string) => (id in overrides ? overrides[id] : master),
    [overrides, master]
  );

  // Master = "hide all / show all": flip it and drop every per-card override.
  const toggleMaster = useCallback(() => {
    setMaster((v) => !v);
    setOverrides({});
  }, []);

  const toggleCard = useCallback(
    (id: string) => {
      setOverrides((prev) => {
        const current = id in prev ? prev[id] : master;
        return { ...prev, [id]: !current };
      });
    },
    [master]
  );

  return (
    <Ctx.Provider value={{ master, isHidden, toggleMaster, toggleCard }}>
      {children}
    </Ctx.Provider>
  );
}

export function usePrivacy() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePrivacy must be used within PrivacyProvider");
  return ctx;
}
