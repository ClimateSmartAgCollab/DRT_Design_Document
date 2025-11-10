import { useState, useCallback } from "react";

export function useSelection<T extends string>() {
  const [selected, setSelected] = useState<Set<T>>(new Set());

  const toggleSelect = useCallback((id: T) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  return { selected, toggleSelect, clearSelection };
} 