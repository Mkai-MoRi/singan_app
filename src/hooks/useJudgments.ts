"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Judgment,
  JudgmentRecord,
  loadJudgments,
  saveJudgment as persistJudgment,
} from "@/lib/judgmentsStorage";

export function useJudgments() {
  const [judgments, setJudgments] = useState<JudgmentRecord>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setJudgments(loadJudgments());
    setMounted(true);
  }, []);

  const saveJudgment = useCallback((id: number, value: Judgment) => {
    persistJudgment(id, value);
    setJudgments((prev) => ({ ...prev, [id]: value }));
  }, []);

  return { judgments, saveJudgment, mounted };
}
