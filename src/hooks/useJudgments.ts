"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Judgment,
  JudgmentRecord,
  loadJudgments,
  saveJudgment as persistJudgment,
  replaceJudgments,
} from "@/lib/judgmentsStorage";
import { decodeJudgmentsParam } from "@/lib/judgmentsUrlCodec";
import { saveSecretCaseUnlocked } from "@/lib/secretCaseStorage";
import { TERMINAL_RESET_EVENT } from "@/lib/terminalReset";

export function useJudgments() {
  const [judgments, setJudgments] = useState<JudgmentRecord>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // クライアントで localStorage から復元（SSR との差分を避けるためマウント後に読み込む）
    // `?j=` があれば共有セッションとしてストレージごと上書き
    queueMicrotask(() => {
      const params = new URLSearchParams(window.location.search);
      const jRaw = params.get("j");
      const fromUrl = decodeJudgmentsParam(jRaw);
      if (fromUrl !== null) {
        if (jRaw !== null && jRaw.length === 21) {
          saveSecretCaseUnlocked(true);
        }
        replaceJudgments(fromUrl);
        setJudgments(fromUrl);
      } else {
        setJudgments(loadJudgments());
      }
      setMounted(true);
    });
  }, []);

  useEffect(() => {
    const onReset = () => setJudgments(loadJudgments());
    window.addEventListener(TERMINAL_RESET_EVENT, onReset);
    return () => window.removeEventListener(TERMINAL_RESET_EVENT, onReset);
  }, []);

  const saveJudgment = useCallback((id: number, value: Judgment) => {
    persistJudgment(id, value);
    setJudgments((prev) => ({ ...prev, [id]: value }));
  }, []);

  return { judgments, saveJudgment, mounted };
}
