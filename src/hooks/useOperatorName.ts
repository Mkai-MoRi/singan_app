"use client";

import { useState, useEffect, useCallback } from "react";
import { loadOperatorName, saveOperatorName, OPERATOR_NAME_MAX_LEN } from "@/lib/operatorStorage";

export function useOperatorName() {
  const [name, setName] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setName(loadOperatorName());
      setMounted(true);
    });
  }, []);

  const commitName = useCallback((value: string) => {
    const next = value.trim().slice(0, OPERATOR_NAME_MAX_LEN);
    setName(next);
    saveOperatorName(next);
  }, []);

  return { name, setName, commitName, mounted };
}
