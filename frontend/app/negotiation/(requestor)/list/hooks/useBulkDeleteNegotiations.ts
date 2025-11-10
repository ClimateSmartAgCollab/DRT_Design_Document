import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteNegotiation } from "../services/negotiationApi";

export function useBulkDeleteNegotiations() {
  const qc = useQueryClient();
  const deleteOne = useMutation({
    mutationFn: (id: string) => deleteNegotiation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["negotiations"] }),
  });

  const deleteSelected = async (ids: string[], onDone?: () => void) => {
    if (!ids.length) return;
    await Promise.all(ids.map((id) => deleteOne.mutateAsync(id)));
    if (onDone) onDone();
  };

  return { deleteSelected };
} 