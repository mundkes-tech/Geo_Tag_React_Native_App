import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { Fonts } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { updateEntry } from '@/lib/api';

export default function EditEntryScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const params = useLocalSearchParams<{ id?: string; title?: string; description?: string }>();

  const entryId = useMemo(() => (params.id ? String(params.id) : ''), [params.id]);
  const [title, setTitle] = useState(params.title ? String(params.title) : '');
  const [description, setDescription] = useState(
    params.description ? String(params.description) : ''
  );
  const [saving, setSaving] = useState(false);

  const background = useThemeColor({}, 'background');
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'muted');
  const text = useThemeColor({}, 'text');
  const tint = useThemeColor({}, 'tint');

  const styles = createStyles(background, card, border, muted, text, tint);

  const onSave = async () => {
    if (!token || !entryId) {
      Alert.alert('Error', 'Missing entry details');
      return;
    }

    if (!title.trim()) {
      Alert.alert('Validation', 'Title is required');
      return;
    }

    setSaving(true);
    try {
      await updateEntry(token, entryId, {
        title: title.trim(),
        description: description.trim(),
      });
      Alert.alert('Success', 'Entry updated');
      router.back();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update entry');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Edit Entry</Text>
        <TextInput
          placeholder="Title"
          value={title}
          onChangeText={setTitle}
          style={styles.input}
          placeholderTextColor={muted}
          maxLength={80}
        />
        <TextInput
          placeholder="Description"
          value={description}
          onChangeText={setDescription}
          style={[styles.input, styles.multiline]}
          placeholderTextColor={muted}
          multiline
        />
        <TouchableOpacity style={styles.button} onPress={() => void onSave()} disabled={saving}>
          <Text style={styles.buttonText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (
  background: string,
  card: string,
  border: string,
  muted: string,
  text: string,
  tint: string
) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: background,
      padding: 16,
      justifyContent: 'center',
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
      fontSize: 24,
      fontWeight: '700',
      color: text,
      fontFamily: Fonts.rounded,
      marginBottom: 8,
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
    multiline: {
      minHeight: 90,
      textAlignVertical: 'top',
    },
    button: {
      backgroundColor: tint,
      borderRadius: 10,
      padding: 12,
      alignItems: 'center',
      marginTop: 4,
    },
    buttonText: {
      color: background,
      fontWeight: '600',
      fontFamily: Fonts.sans,
    },
  });