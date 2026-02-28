import { useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import WebView from "react-native-webview/lib/WebView";

import { Fonts } from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export default function EntryMapScreen() {
  const params = useLocalSearchParams<{
    latitude?: string;
    longitude?: string;
    title?: string;
  }>();
  const background = useThemeColor({}, "background");
  const card = useThemeColor({}, "card");
  const border = useThemeColor({}, "border");
  const muted = useThemeColor({}, "muted");
  const text = useThemeColor({}, "text");

  const latitude = Number(params.latitude);
  const longitude = Number(params.longitude);
  const title = (params.title || "Entry location").toString();
  const hasValidCoords =
    Number.isFinite(latitude) && Number.isFinite(longitude);

  const mapHtml = useMemo(() => {
    if (!hasValidCoords) {
      return "";
    }

    const safeTitle = escapeHtml(title);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map('map').setView([${latitude}, ${longitude}], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    L.marker([${latitude}, ${longitude}]).addTo(map).bindPopup('${safeTitle}').openPopup();
  </script>
</body>
</html>`;
  }, [hasValidCoords, latitude, longitude, title]);

  if (!hasValidCoords) {
    return (
      <View style={[styles.center, { backgroundColor: background }]}>
        <Text style={{ color: text, fontSize: 16, fontFamily: Fonts.sans }}>
          Invalid coordinates for this entry.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: background }]}>
      <View
        style={[styles.infoBox, { borderColor: border, backgroundColor: card }]}
      >
        <Text
          style={{
            color: text,
            fontSize: 16,
            fontWeight: "600",
            fontFamily: Fonts.rounded,
          }}
        >
          {title}
        </Text>
        <Text style={{ color: muted, marginTop: 4, fontFamily: Fonts.sans }}>
          {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </Text>
      </View>
      <WebView
        source={{ html: mapHtml }}
        style={styles.map}
        originWhitelist={["*"]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  infoBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  map: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
});
