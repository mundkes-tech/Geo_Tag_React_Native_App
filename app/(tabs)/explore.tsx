import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import React, { useRef, useState } from "react";
import {
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { Fonts } from "@/constants/theme";
import { useAuth } from "@/context/auth-context";
import { useThemeColor } from "@/hooks/use-theme-color";
import { createEntry } from "@/lib/api";
import { queueEntry } from "@/lib/offline-entries";

type Coordinates = {
  latitude: number;
  longitude: number;
};

export default function CaptureScreen() {
  const { token } = useAuth();
  const background = useThemeColor({}, "background");
  const card = useThemeColor({}, "card");
  const border = useThemeColor({}, "border");
  const muted = useThemeColor({}, "muted");
  const text = useThemeColor({}, "text");
  const tint = useThemeColor({}, "tint");
  const styles = createStyles(background, card, border, muted, text, tint);
  const cameraRef = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [uploading, setUploading] = useState(false);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPhotoUri(null);
    setCoordinates(null);
  };

  const captureWithLocation = async () => {
    if (!cameraRef.current) {
      return;
    }

    const locationPermission =
      await Location.requestForegroundPermissionsAsync();
    if (!locationPermission.granted) {
      Alert.alert("Permission needed", "Location permission is required");
      return;
    }

    const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
    if (!photo?.uri) {
      Alert.alert("Error", "Could not capture image");
      return;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    setPhotoUri(photo.uri);
    setCoordinates({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });
  };

  const submitEntry = async () => {
    if (!token) {
      return;
    }

    if (!title.trim() || !photoUri || !coordinates) {
      Alert.alert(
        "Missing data",
        "Capture a photo, location, and add a title first",
      );
      return;
    }

    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("description", description.trim());
    formData.append("latitude", String(coordinates.latitude));
    formData.append("longitude", String(coordinates.longitude));
    formData.append("image", {
      uri: photoUri,
      name: `entry-${Date.now()}.jpg`,
      type: "image/jpeg",
    } as any);

    setUploading(true);

    try {
      await createEntry(token, formData);
      Alert.alert("Success", "Entry uploaded");
      resetForm();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Try again";
      const shouldQueue =
        message.includes("Cannot reach API") ||
        message.includes("Network request failed") ||
        message.includes("Failed to fetch");

      if (shouldQueue) {
        await queueEntry({
          title: title.trim(),
          description: description.trim(),
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          photoUri,
        });
        Alert.alert(
          "Saved offline",
          "No internet. Entry queued and will sync later.",
        );
        resetForm();
      } else {
        Alert.alert("Upload failed", message);
      }
    } finally {
      setUploading(false);
    }
  };

  if (!cameraPermission) {
    return null;
  }

  if (!cameraPermission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permissionText}>Camera access is required</Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => void requestCameraPermission()}
        >
          <Text style={styles.primaryButtonText}>Grant Camera Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Capture Entry</Text>

      {photoUri ? (
        <Image source={{ uri: photoUri }} style={styles.preview} />
      ) : (
        <CameraView style={styles.camera} facing="back" ref={cameraRef} />
      )}

      <View style={styles.row}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => void captureWithLocation()}
        >
          <Text style={styles.primaryButtonText}>Capture + Location</Text>
        </TouchableOpacity>
        {photoUri && (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              setPhotoUri(null);
              setCoordinates(null);
            }}
          >
            <Text style={styles.secondaryButtonText}>Retake</Text>
          </TouchableOpacity>
        )}
      </View>

      <TextInput
        placeholder="Title"
        value={title}
        onChangeText={setTitle}
        placeholderTextColor={muted}
        style={styles.input}
        maxLength={80}
      />
      <TextInput
        placeholder="Description"
        value={description}
        onChangeText={setDescription}
        placeholderTextColor={muted}
        style={[styles.input, styles.multiline]}
        multiline
      />

      <Text style={styles.coords}>
        {coordinates
          ? `Lat: ${coordinates.latitude.toFixed(6)}, Lng: ${coordinates.longitude.toFixed(6)}`
          : "Coordinates will appear after capture"}
      </Text>

      <TouchableOpacity
        disabled={uploading}
        style={[styles.primaryButton, uploading && styles.disabled]}
        onPress={() => void submitEntry()}
      >
        <Text style={styles.primaryButtonText}>
          {uploading ? "Uploading..." : "Upload Entry"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const createStyles = (
  background: string,
  card: string,
  border: string,
  muted: string,
  text: string,
  tint: string,
) =>
  StyleSheet.create({
    container: {
      paddingTop: 56,
      paddingHorizontal: 16,
      paddingBottom: 24,
      backgroundColor: background,
      gap: 12,
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
      backgroundColor: background,
    },
    permissionText: {
      fontSize: 16,
      marginBottom: 16,
      color: text,
      fontFamily: Fonts.sans,
    },
    heading: {
      fontSize: 24,
      fontWeight: "700",
      color: text,
      fontFamily: Fonts.rounded,
    },
    camera: {
      height: 320,
      borderRadius: 12,
      overflow: "hidden",
    },
    preview: {
      height: 320,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: border,
    },
    row: {
      flexDirection: "row",
      gap: 10,
    },
    input: {
      borderWidth: 1,
      borderColor: border,
      borderRadius: 10,
      padding: 12,
      color: text,
      backgroundColor: card,
      fontFamily: Fonts.sans,
    },
    multiline: {
      minHeight: 90,
      textAlignVertical: "top",
    },
    coords: {
      color: muted,
      fontFamily: Fonts.sans,
    },
    primaryButton: {
      backgroundColor: tint,
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    primaryButtonText: {
      color: background,
      fontWeight: "600",
      fontFamily: Fonts.sans,
    },
    secondaryButton: {
      borderWidth: 1,
      borderColor: tint,
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    secondaryButtonText: {
      color: tint,
      fontWeight: "600",
      fontFamily: Fonts.sans,
    },
    disabled: {
      opacity: 0.6,
    },
  });
