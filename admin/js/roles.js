import { AUTH_CONFIG } from './config.js';
import { getSupabaseClient } from './auth.js';

function getCachedRole(userId) {
  try {
    const raw = localStorage.getItem(AUTH_CONFIG.roleCacheKey);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || parsed.userId !== userId || !parsed.role || !parsed.cachedAt) {
      return null;
    }

    const maxAgeMs = 5 * 60 * 1000;
    if (Date.now() - parsed.cachedAt > maxAgeMs) {
      return null;
    }

    return parsed.role;
  } catch {
    return null;
  }
}

function setCachedRole(userId, role) {
  try {
    localStorage.setItem(
      AUTH_CONFIG.roleCacheKey,
      JSON.stringify({ userId, role, cachedAt: Date.now() })
    );
  } catch {
    // intentionally ignored to avoid breaking auth flow when storage is unavailable
  }
}

export function clearRoleCache() {
  try {
    localStorage.removeItem(AUTH_CONFIG.roleCacheKey);
  } catch {
    // intentionally ignored
  }
}

export async function fetchUserRole({ userId, force = false }) {
  if (!userId) {
    throw new Error('Cannot fetch role without a valid user id.');
  }

  if (!force) {
    const cachedRole = getCachedRole(userId);
    if (cachedRole) {
      return cachedRole;
    }
  }

  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();

  if (error) {
    throw error;
  }

  const role = data?.role || null;
  if (!role) {
    throw new Error('No role is assigned to this account. Contact a superadmin.');
  }

  setCachedRole(userId, role);
  return role;
}
