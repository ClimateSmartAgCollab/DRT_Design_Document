import { useQuery } from "@tanstack/react-query";
import fetchApi from "@/app/api/apiHelper";

interface User {
  email: string;
  type: 'owner' | 'requestor';
}

async function fetchCurrentUser(): Promise<User | null> {
  try {
    // Try owner first
    const ownerResponse = await fetchApi('/drt/api/auth/whoami/');
    
    if (ownerResponse.ok) {
      const data = await ownerResponse.json();
      return { email: data.email, type: 'owner' as const };
    }

    // Try requestor if owner failed
    const requestorResponse = await fetchApi('/drt/api/auth/req-whoami/');
    
    if (requestorResponse.ok) {
      const data = await requestorResponse.json();
      return { email: data.email, type: 'requestor' as const };
    }

    return null;
  } catch (error) {
    console.error('Error fetching current user:', error);
    return null;
  }
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });
}

export function useOwnerUser() {
  return useQuery({
    queryKey: ['ownerUser'],
    queryFn: async () => {
      const response = await fetchApi('/drt/api/auth/whoami/');
      if (response.ok) {
        const data = await response.json();
        return data.email ? { email: data.email } : null;
      }
      return null;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });
}

export function useRequestorUser() {
  return useQuery({
    queryKey: ['requestorUser'],
    queryFn: async () => {
      const response = await fetchApi('/drt/api/auth/req-whoami/');
      if (response.ok) {
        const data = await response.json();
        return data.email ? { email: data.email } : null;
      }
      return null;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });
} 