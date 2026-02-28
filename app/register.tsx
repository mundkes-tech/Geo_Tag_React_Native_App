import { Link, Redirect, useRouter } from "expo-router";
import React, { useState } from "react";
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

export default function RegisterScreen() {
  const router = useRouter();
  const { token, registerUser, isBootstrapping } = useAuth();
  const background = useThemeColor({}, "background");
  const card = useThemeColor({}, "card");
  const border = useThemeColor({}, "border");
  const muted = useThemeColor({}, "muted");
  const text = useThemeColor({}, "text");
  const tint = useThemeColor({}, "tint");
  const styles = createStyles(background, card, border, text, tint);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isBootstrapping && token) {
    return <Redirect href="/(tabs)" />;
  }

  const submit = async () => {
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert("Missing details", "Please fill all fields");
      return;
    }

    setLoading(true);
    try {
      await registerUser({ name: name.trim(), email: email.trim(), password });
      Alert.alert("Success", "Account created. Please login.");
      setName("");
      setEmail("");
      setPassword("");
      router.replace("/login");
    } catch (error) {
      Alert.alert(
        "Register failed",
        error instanceof Error ? error.message : "Try again",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Create Account</Text>
        <TextInput
          placeholder="Name"
          value={name}
          onChangeText={setName}
          style={styles.input}
          placeholderTextColor={muted}
        />
        <TextInput
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          placeholderTextColor={muted}
        />
        <TextInput
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={styles.input}
          placeholderTextColor={muted}
        />
        <TouchableOpacity
          style={styles.button}
          onPress={() => void submit()}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Creating..." : "Register"}
          </Text>
        </TouchableOpacity>
        <Link href="/login" style={styles.link}>
          Already have an account? Login
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
  });
