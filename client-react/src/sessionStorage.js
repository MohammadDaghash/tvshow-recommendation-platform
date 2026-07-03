const SESSION_STORAGE_KEY = "tvshowUserSession";
const LEGACY_ADMIN_TOKEN_KEY = "adminToken";

export function readStoredSession() {
  try {
    const storedSession = localStorage.getItem(SESSION_STORAGE_KEY);

    if (storedSession) {
      return JSON.parse(storedSession);
    }

    const legacyAdminToken = localStorage.getItem(LEGACY_ADMIN_TOKEN_KEY);

    if (legacyAdminToken) {
      return {
        token: legacyAdminToken,
        user: null,
      };
    }
  } catch (error) {
    console.error(error);
  }

  return null;
}

export function saveStoredSession(session) {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));

  if (session.user?.role === "admin") {
    localStorage.setItem(LEGACY_ADMIN_TOKEN_KEY, session.token);
  } else {
    localStorage.removeItem(LEGACY_ADMIN_TOKEN_KEY);
  }
}

export function clearStoredSession() {
  localStorage.removeItem(SESSION_STORAGE_KEY);
  localStorage.removeItem(LEGACY_ADMIN_TOKEN_KEY);
}
