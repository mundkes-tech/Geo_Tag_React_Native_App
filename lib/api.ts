import Constants from "expo-constants";

type AuthPayload = {
  name: string;
  email: string;
  password: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
};

export type AuthResponse = {
  token: string;
  user: User;
};

export type Entry = {
  _id: string;
  imageUrl: string;
  latitude: number;
  longitude: number;
  title: string;
  description: string;
  createdAt: string;
};

function resolveApiUrl() {
  const configuredApiUrl = Constants.expoConfig?.extra?.apiUrl as
    | string
    | undefined;
  const expoHostSource =
    (Constants as any).expoConfig?.hostUri ||
    (Constants as any).expoGoConfig?.debuggerHost;
  const expoHost =
    typeof expoHostSource === "string" && expoHostSource.length > 0
      ? expoHostSource.split(":")[0]
      : null;

  if (configuredApiUrl) {
    if (configuredApiUrl.includes("localhost") && expoHost) {
      return configuredApiUrl.replace("localhost", expoHost);
    }

    return configuredApiUrl;
  }

  if (expoHost) {
    return `http://${expoHost}:5000/api`;
  }

  return "http://localhost:5000/api";
}

const API_URL = resolveApiUrl();

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, options);
  } catch (_error) {
    throw new Error(
      `Cannot reach API at ${API_URL}. If you run Expo on a physical device, use your computer LAN IP in app.json (example: http://192.168.x.x:5000/api). For Android emulator use http://10.0.2.2:5000/api.`,
    );
  }

  const responseText = await response.text();
  let data: Record<string, unknown> = {};

  if (responseText) {
    try {
      data = JSON.parse(responseText) as Record<string, unknown>;
    } catch {
      data = { message: responseText };
    }
  }

  if (!response.ok) {
    throw new Error(
      (data.message as string) || `Request failed (${response.status})`,
    );
  }

  return data as T;
}

export function register(payload: AuthPayload) {
  return request<AuthResponse>("/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export function login(payload: Omit<AuthPayload, "name">) {
  return request<AuthResponse>("/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export function getEntries(token: string) {
  return request<Entry[]>("/entries", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function createEntry(token: string, formData: FormData) {
  return request<Entry>("/entries", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });
}

export function updateEntry(
  token: string,
  entryId: string,
  payload: { title: string; description: string },
) {
  return request<Entry>(`/entries/${entryId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export function deleteEntry(token: string, entryId: string) {
  return request<{ message: string }>(`/entries/${entryId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
