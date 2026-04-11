"use client";

import { useState, useEffect, useCallback } from "react";
import {
  loadPracticeCaseUnlocked,
  savePracticeCaseUnlocked,
  PRACTICE_UNLOCK_CHANGED_EVENT,
} from "@/lib/practiceCaseStorage";
import { matchesPracticeUnlockPhrase } from "@/lib/practiceCaseConfig";

export function usePracticeCaseUnlock() {
  const [practiceUnlocked, setPracticeUnlocked] = useState(false);
  const [practiceMounted, setPracticeMounted] = useState(false);

  const refresh = useCallback(() => {
    setPracticeUnlocked(loadPracticeCaseUnlocked());
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      refresh();
      setPracticeMounted(true);
    });
  }, [refresh]);

  useEffect(() => {
    const onChanged = () => refresh();
    window.addEventListener(PRACTICE_UNLOCK_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(PRACTICE_UNLOCK_CHANGED_EVENT, onChanged);
  }, [refresh]);

  const tryUnlockPracticeWithPhrase = useCallback((phrase: string) => {
    if (!matchesPracticeUnlockPhrase(phrase)) return false;
    savePracticeCaseUnlocked(true);
    setPracticeUnlocked(true);
    return true;
  }, []);

  return { practiceUnlocked, practiceMounted, tryUnlockPracticeWithPhrase };
}
