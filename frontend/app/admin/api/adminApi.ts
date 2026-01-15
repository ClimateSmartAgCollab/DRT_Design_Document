import fetchApi from "@/app/api/apiHelper";

export interface AdminStats {
  admin_email: string;
  statistics: {
    total_negotiations: number;
    total_owners: number;
    total_requestors: number;
    total_datasets: number;
    negotiation_states: {
      requestor_open: number;
      owner_open: number;
      accepted: number;
      rejected: number;
      abandoned: number;
      archived: number;
    };
    recent_activity: {
      negotiations_last_30_days: number;
    };
  };
  timestamp: string;
}

export interface AdminHealth {
  timestamp: string;
  status: "healthy" | "unhealthy" | "degraded";
  checks: {
    database?: {
      status: string;
      message: string;
    };
    cache?: {
      status: string;
      message: string;
    };
    email?: {
      status: string;
      message: string;
      host?: string;
    };
    recent_activity?: {
      status: string;
      message: string;
      count?: number;
    };
  };
}

export async function fetchAdminStats(): Promise<AdminStats> {
  const res = await fetchApi("/drt/admin/dashboard/stats/");
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to load admin statistics");
  return data;
}

export async function fetchAdminHealth(): Promise<AdminHealth> {
  const res = await fetchApi("/drt/admin/health/");
  const data = await res.json();
  
  // Always return the health data, even if status is not OK
  if (!res.ok && !data.status) {
    throw new Error(data.error || "Failed to load health check");
  }
  
  return data;
}

export async function checkAdminAuth(): Promise<boolean> {
  try {
    const res = await fetchApi("/drt/admin/whoami/");
    return res.ok;
  } catch {
    return false;
  }
}

export async function adminLogout(): Promise<void> {
  const res = await fetchApi("/drt/admin/logout/", {
    method: "POST",
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Logout failed");
  }
}
