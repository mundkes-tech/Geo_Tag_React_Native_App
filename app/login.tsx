import { Link, Redirect } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { Fonts } from "@/constants/theme";
import { useAuth } from "@/context/auth-context";
import { useThemeColor } from "@/hooks/use-theme-color";

export default function LoginScreen() {
  const {
    token,
    loginUser,
    saveBiometricCredentials,
    loginWithBiometrics,
    hasBiometricCredentials,
    isBootstrapping,
  } = useAuth();
  const background = useThemeColor({}, "background");
  const card = useThemeColor({}, "card");
  const border = useThemeColor({}, "border");
  const muted = useThemeColor({}, "muted");
  const text = useThemeColor({}, "text");
  const tint = useThemeColor({}, "tint");
  const styles = createStyles(background, card, border, text, tint);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [enableBiometric, setEnableBiometric] = useState(false);
  const [canUseBiometricLogin, setCanUseBiometricLogin] = useState(false);

  useEffect(() => {
    (async () => {
      const available = await hasBiometricCredentials();
      setCanUseBiometricLogin(available);
    })();
  }, [hasBiometricCredentials]);

  if (!isBootstrapping && token) {
    return <Redirect href="/(tabs)" />;
  }

  const submit = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Missing details", "Please enter email and password");
      return;
    }

    setLoading(true);
    try {
      await loginUser({ email: email.trim(), password });
      if (enableBiometric) {
        await saveBiometricCredentials(email.trim(), password);
      }
    } catch (error) {
      Alert.alert(
        "Login failed",
        error instanceof Error ? error.message : "Try again",
      );
    } finally {
      setLoading(false);
    }
  };

  const biometricLogin = async () => {
    setBiometricLoading(true);
    try {
      await loginWithBiometrics();
    } catch (error) {
      Alert.alert(
        "Biometric login failed",
        error instanceof Error ? error.message : "Try again",
      );
    } finally {
      setBiometricLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>GeoTag Login</Text>
        <TextInput
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          placeholderTextColor={muted}
          style={styles.input}
        />
        <TextInput
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          placeholderTextColor={muted}
          style={styles.input}
        />
        <TouchableOpacity
          style={styles.button}
          onPress={() => void submit()}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Logging in..." : "Login"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondaryButton, { borderColor: border }]}
          onPress={() => setEnableBiometric((prev) => !prev)}
        >
          <Text style={[styles.secondaryButtonText, { color: text }]}>
            {enableBiometric ? "✓" : "○"} Enable biometric login on this device
          </Text>
        </TouchableOpacity>
        {canUseBiometricLogin && (
          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: tint }]}
            onPress={() => void biometricLogin()}
            disabled={biometricLoading}
          >
            <Text style={[styles.secondaryButtonText, { color: tint }]}>
              {biometricLoading ? "Authenticating..." : "Login with Biometrics"}
            </Text>
          </TouchableOpacity>
        )}
        <Link href="/register" style={styles.link}>
          Don&apos;t have an account? Register
        </Link>
      </View>
    </View>
  );
}

const createStyles = (
  background: string,
  card: string,
  border: string,
  text: string,
  tint: string,
) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      backgroundColor: background,
      paddingHorizontal: 20,
    },
    card: {
      borderWidth: 1,
      borderColor: border,
      borderRadius: 16,
      backgroundColor: card,
      padding: 16,
      gap: 12,
    },
    title: {
      fontSize: 28,
      fontWeight: "700",
      marginBottom: 12,
      color: text,
      fontFamily: Fonts.rounded,
    },
    input: {
      borderWidth: 1,
      borderColor: border,
      borderRadius: 10,
      padding: 12,
      color: text,
      backgroundColor: background,
      fontFamily: Fonts.sans,
    },
    button: {
      backgroundColor: tint,
      borderRadius: 10,
      padding: 12,
      alignItems: "center",
    },
    buttonText: {
      color: background,
      fontWeight: "600",
      fontFamily: Fonts.sans,
    },
    link: {
      color: tint,
      marginTop: 8,
      fontFamily: Fonts.sans,
    },
    secondaryButton: {
      borderWidth: 1,
      borderRadius: 10,
      padding: 12,
      alignItems: "center",
    },
    secondaryButtonText: {
      fontFamily: Fonts.sans,
      fontWeight: "600",
    },
  });
