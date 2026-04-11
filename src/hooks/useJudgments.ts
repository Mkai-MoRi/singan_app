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

export function useJudgments() {
  const [judgments, setJudgments] = useState<JudgmentRecord>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // クライアントで localStorage から復元（SSR との差分を避けるためマウント後に読み込む）
    // `?j=` があれば共有セッションとしてストレージごと上書き
    queueMicrotask(() => {
      const params = new URLSearchParams(window.location.search);
      const fromUrl = decodeJudgmentsParam(params.get("j"));
      if (fromUrl !== null) {
        replaceJudgments(fromUrl);
        setJudgments(fromUrl);
      } else {
        setJudgments(loadJudgments());
      }
      setMounted(true);
    });
  }, []);

  const saveJudgment = useCallback((id: number, value: Judgment) => {
    persistJudgment(id, value);
    setJudgments((prev) => ({ ...prev, [id]: value }));
  }, []);

  return { judgments, saveJudgment, mounted };
}
