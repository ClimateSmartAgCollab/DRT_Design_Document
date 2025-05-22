// drt_frontend\app\negotiation\owner\list\hooks\useNegotiations.ts
import { useState, useEffect } from "react";
import { fetchNegotiations } from "../services/negotiationApi";
import type { Negotiation } from "../types";

export function useNegotiations() {
  const [data, setData] = useState<Negotiation[]>([]);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    try {
      const list = await fetchNegotiations();
      setData(list);
    } catch (e: any) {
      setError(e.message);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  return { data, error, reload };
}