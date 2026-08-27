/**
 * Constructs a deployment-aware API URL.
 * Supports running on Localhost, Cloud Run, Standalone Express, Docker, or Apache Tomcat Context Paths (e.g. /oracle-datacore/api/...)
 */
export function getApiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : '/' + endpoint;

  if (typeof window === 'undefined') {
    return cleanEndpoint;
  }

  // 1. Check for custom configured API Base URL (stored in localStorage or environment)
  const envApiUrl = (import.meta as any).env ? (import.meta as any).env.VITE_API_BASE_URL : undefined;
  const customBase = localStorage.getItem('api_base_url') || envApiUrl;
  if (customBase && customBase.trim() !== '') {
    const trimmed = customBase.trim().replace(/\/+$/, '');
    return `${trimmed}${cleanEndpoint}`;
  }

  const pathname = window.location.pathname || '/';

  // 2. Extract Tomcat / Servlet context path (e.g., /oracle-datacore-api, /rac_dba_portal, /app.war)
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length > 0) {
    const firstSegment = segments[0];
    if (!['api', 'assets', 'index.html', 'src', 'main.tsx', 'static', 'node_modules'].includes(firstSegment.toLowerCase())) {
      const contextPath = '/' + firstSegment.replace(/\.war$/i, '');
      return contextPath + cleanEndpoint;
    }
  }

  return cleanEndpoint;
}

/**
 * Auto-detects and returns client workstation telemetry profile
 */
export function getClientWorkstationProfile() {
  if (typeof window === 'undefined') {
    return {
      workstationName: 'CLIENT-WORKSTATION-PC',
      macAddress: '00:50:56:A8:88:99',
      clientIp: '127.0.0.1',
      user: 'admin'
    };
  }

  let workstationName = localStorage.getItem('oracle_workstation_name');
  if (!workstationName || workstationName === 'localhost' || workstationName === '127.0.0.1') {
    workstationName = 'WORKSTATION-DELL-XPS';
    localStorage.setItem('oracle_workstation_name', workstationName);
  }

  let macAddress = localStorage.getItem('oracle_workstation_mac');
  if (!macAddress) {
    macAddress = '28:11:A5:6F:42:3B';
    localStorage.setItem('oracle_workstation_mac', macAddress);
  }

  const clientIp = localStorage.getItem('detected_client_ip') || '';

  let activeUser = 'admin';
  const savedUserObj = localStorage.getItem('oracle_active_user');
  if (savedUserObj) {
    try {
      const u = JSON.parse(savedUserObj);
      if (u && (u.email || u.username)) {
        activeUser = u.email || u.username;
      }
    } catch (e) {}
  } else {
    activeUser = localStorage.getItem('oracle_portal_user') || 'admin';
  }

  return {
    workstationName,
    macAddress,
    clientIp,
    user: activeUser
  };
}

/**
 * Universal deployment-aware API fetch wrapper.
 * Handles Tomcat 404 HTML fallback, direct port 3000 fallback, CORS headers, and content-type parsing.
 */
export async function apiFetch(
  endpoint: string,
  options?: RequestInit
): Promise<Response> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
  const primaryUrl = getApiUrl(cleanEndpoint);

  const profile = getClientWorkstationProfile();

  const defaultHeaders: Record<string, string> = {
    'Accept': 'application/json',
    'x-user-email': profile.user,
    'x-client-hostname': profile.workstationName,
    'x-client-mac': profile.macAddress,
    'x-client-tool': 'Oracle Management Web Portal'
  };

  if (profile.clientIp) {
    defaultHeaders['x-client-ip'] = profile.clientIp;
  }

  let modifiedOptions = { ...options };

  if (options?.body && typeof options.body === 'string') {
    try {
      const parsed = JSON.parse(options.body);
      if (typeof parsed === 'object' && parsed !== null) {
        if (!parsed.user) parsed.user = profile.user;
        if (!parsed.hostPcName) parsed.hostPcName = profile.workstationName;
        if (!parsed.macAddress) parsed.macAddress = profile.macAddress;
        if (!parsed.clientIp && profile.clientIp) parsed.clientIp = profile.clientIp;
        modifiedOptions.body = JSON.stringify(parsed);
      }
    } catch (e) {
      // Body wasn't JSON or failed parse
    }
    defaultHeaders['Content-Type'] = 'application/json';
  }

  const fetchOptions: RequestInit = {
    ...modifiedOptions,
    headers: {
      ...defaultHeaders,
      ...options?.headers,
    },
  };

  try {
    const res = await fetch(primaryUrl, fetchOptions);
    const contentType = res.headers.get('content-type') || '';

    // If request succeeded OR returned a valid JSON response (e.g. 403 Forbidden or 400 Bad Request with details)
    if (res.status !== 404 || contentType.includes('application/json')) {
      return res;
    }

    // Tomcat returned 404 HTML page
    if (typeof window !== 'undefined' && window.location.port !== '3000') {
      const directUrl = `http://${window.location.hostname}:3000${cleanEndpoint}`;
      try {
        const directRes = await fetch(directUrl, fetchOptions);
        if (directRes.status !== 404 || (directRes.headers.get('content-type') || '').includes('application/json')) {
          return directRes;
        }
      } catch (e) {
        // Fallback ignored
      }
    }

    return res;
  } catch (err) {
    if (typeof window !== 'undefined' && window.location.port !== '3000') {
      const directUrl = `http://${window.location.hostname}:3000${cleanEndpoint}`;
      try {
        return await fetch(directUrl, fetchOptions);
      } catch (e) {
        // Ignore
      }
    }
    throw err;
  }
}

/**
 * Safely fetches JSON from an API endpoint.
 * Handles Tomcat 404 HTML fallback, CORS headers, and cross-platform port fallbacks.
 */
export async function safeFetchJson<T>(
  endpoint: string,
  options?: RequestInit,
  fallback?: T
): Promise<T | null> {
  try {
    const res = await apiFetch(endpoint, options);
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      return (await res.json()) as T;
    }
    // If response was JSON even with error status, try to parse
    if (contentType.includes('application/json')) {
      const errorJson = await res.json();
      return (errorJson as T) ?? fallback ?? null;
    }
    return fallback ?? null;
  } catch (err) {
    console.warn(`safeFetchJson failed for ${endpoint}:`, err);
    return fallback ?? null;
  }
}


