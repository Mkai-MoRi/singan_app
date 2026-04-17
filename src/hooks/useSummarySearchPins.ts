"use client";

import { useCallback, useEffect, useState } from "react";
import {
  loadSummarySearchPins,
  prependSummarySearchPin,
} from "@/lib/summarySearchPinsStorage";
import { TERMINAL_RESET_EVENT } from "@/lib/terminalReset";

export function useSummarySearchPins() {
  const [pins, setPins] = useState<number[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setPins(loadSummarySearchPins());
      setMounted(true);
    });
  }, []);

  useEffect(() => {
    const onReset = () => setPins(loadSummarySearchPins());
    window.addEventListener(TERMINAL_RESET_EVENT, onReset);
    return () => window.removeEventListener(TERMINAL_RESET_EVENT, onReset);
  }, []);

  const addPin = useCallback((id: number) => {
    const next = prependSummarySearchPin(id);
    setPins(next);
  }, []);

  return { pins, addPin, mounted };
}
