import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import React, {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";

import * as api from "@/lib/api";

const TOKEN_KEY = "geotag-token";
const USER_KEY = "geotag-user";
const BIOMETRIC_EMAIL_KEY = "geotag-bio-email";
const BIOMETRIC_PASSWORD_KEY = "geotag-bio-password";

type AuthContextType = {
  token: string | null;
  user: api.User | null;
  isBootstrapping: boolean;
  registerUser: (payload: {
    name: string;
    email: string;
    password: string;
  }) => Promise<void>;
  loginUser: (payload: { email: string; password: string }) => Promise<void>;
  saveBiometricCredentials: (email: string, password: string) => Promise<void>;
  loginWithBiometrics: () => Promise<void>;
  hasBiometricCredentials: () => Promise<boolean>;
  logoutUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<api.User | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(USER_KEY),
        ]);

        if (storedToken) {
          setToken(storedToken);
        }

        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } finally {
        setIsBootstrapping(false);
      }
    })();
  }, []);

  const saveAuth = async (auth: api.AuthResponse) => {
    setToken(auth.token);
    setUser(auth.user);
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, auth.token),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(auth.user)),
    ]);
  };

  const registerUser = async (payload: {
    name: string;
    email: string;
    password: string;
  }) => {
    await api.register(payload);
  };

  const loginUser = async (payload: { email: string; password: string }) => {
    const auth = await api.login(payload);
    await saveAuth(auth);
  };

  const saveBiometricCredentials = async (email: string, password: string) => {
    await Promise.all([
      SecureStore.setItemAsync(BIOMETRIC_EMAIL_KEY, email),
      SecureStore.setItemAsync(BIOMETRIC_PASSWORD_KEY, password, {
        requireAuthentication: true,
        authenticationPrompt: "Authenticate to save biometric login",
      }),
    ]);
  };

  const hasBiometricCredentials = async () => {
    const email = await SecureStore.getItemAsync(BIOMETRIC_EMAIL_KEY);
    return Boolean(email);
  };

  const loginWithBiometrics = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (!hasHardware || !isEnrolled) {
      throw new Error(
        "Biometric authentication is not available on this device",
      );
    }

    const authentication = await LocalAuthentication.authenticateAsync({
      promptMessage: "Authenticate to login",
      fallbackLabel: "Use passcode",
      cancelLabel: "Cancel",
    });

    if (!authentication.success) {
      throw new Error("Biometric authentication was cancelled or failed");
    }

    const [email, password] = await Promise.all([
      SecureStore.getItemAsync(BIOMETRIC_EMAIL_KEY),
      SecureStore.getItemAsync(BIOMETRIC_PASSWORD_KEY, {
        requireAuthentication: true,
        authenticationPrompt: "Authenticate to access saved credentials",
      }),
    ]);

    if (!email || !password) {
      throw new Error(
        "No biometric credentials found. Login once and enable biometrics.",
      );
    }

    await loginUser({ email, password });
  };

  const logoutUser = async () => {
    setToken(null);
    setUser(null);
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
    ]);
  };

  const value = useMemo(
    () => ({
      token,
      user,
      isBootstrapping,
      registerUser,
      loginUser,
      saveBiometricCredentials,
      loginWithBiometrics,
      hasBiometricCredentials,
      logoutUser,
    }),
    [token, user, isBootstrapping],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
