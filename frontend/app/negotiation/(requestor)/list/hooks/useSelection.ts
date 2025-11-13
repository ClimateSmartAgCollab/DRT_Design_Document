import { useState, useCallback } from "react";

export function useSelection<T extends string>() {
  const [selected, setSelected] = useState<Set<T>>(new Set());

  const toggleSelect = useCallback((id: T) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  return { selected, toggleSelect, clearSelection };
} 