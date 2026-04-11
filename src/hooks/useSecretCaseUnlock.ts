"use client";

import { useState, useEffect, useCallback } from "react";
import {
  loadSecretCaseUnlocked,
  saveSecretCaseUnlocked,
  SECRET_UNLOCK_CHANGED_EVENT,
} from "@/lib/secretCaseStorage";
import { matchesSecretUnlockPhrase } from "@/lib/secretCaseConfig";

export function useSecretCaseUnlock() {
  const [secretUnlocked, setSecretUnlocked] = useState(false);
  const [secretMounted, setSecretMounted] = useState(false);

  const refresh = useCallback(() => {
    setSecretUnlocked(loadSecretCaseUnlocked());
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      refresh();
      setSecretMounted(true);
    });
  }, [refresh]);

  useEffect(() => {
    const onChanged = () => refresh();
    window.addEventListener(SECRET_UNLOCK_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(SECRET_UNLOCK_CHANGED_EVENT, onChanged);
  }, [refresh]);

  const tryUnlockWithPhrase = useCallback((phrase: string) => {
    if (!matchesSecretUnlockPhrase(phrase)) return false;
    saveSecretCaseUnlocked(true);
    setSecretUnlocked(true);
    return true;
  }, []);

  return { secretUnlocked, secretMounted, tryUnlockWithPhrase };
}
