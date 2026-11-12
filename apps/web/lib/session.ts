import { cookies } from "next/headers";

export type SessionUser = {
  id: string;
  full_name: string;
  roles: string[];
};

export async function readSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get("ub_access")?.value;
  if (!token) {
    return null;
  }
  try {
    const response = await fetch(`${process.env.API_INTERNAL_URL ?? "http://api:8000"}/api/v1/me`, {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as SessionUser;
  } catch {
    return null;
  }
}

export async function apiAuth<T>(path: string): Promise<T | null> {
  const token = (await cookies()).get("ub_access")?.value;
  if (!token) {
    return null;
  }
  try {
    const response = await fetch(`${process.env.API_INTERNAL_URL ?? "http://api:8000"}${path}`, {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

/** Default cabinet role when the user has several and has not picked one. */
const ROLE_PRIORITY = [
  "admin",
  "education_lead",
  "district_official",
  "employment_officer",
  "agency_officer",
  "migration_observer",
  "mahalla_assistant",
  "employer_foreign",
  "cert_officer",
  "mentor",
  "curator",
  "employer_local",
  "producer",
  "worker",
  "student",
];

export async function activeRole(roles: string[]): Promise<string> {
  const chosen = (await cookies()).get("ub_role")?.value;
  if (chosen && roles.includes(chosen)) {
    return chosen;
  }
  return ROLE_PRIORITY.find((role) => roles.includes(role)) ?? roles[0] ?? "student";
}
