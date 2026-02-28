import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Fonts } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { deleteEntry, Entry, getEntries } from '@/lib/api';
import { reverseGeocode } from '@/lib/geocoding';
import { getQueuedEntries, removeQueuedEntry, syncQueuedEntries } from '@/lib/offline-entries';

type FeedEntry = Entry & {
  syncStatus: 'synced' | 'pending';
  localId?: string;
  placeName?: string;
};

function EntryCard({
  item,
  text,
  border,
  muted,
  card,
  tint,
  onViewMap,
  onEdit,
  onDelete,
}: {
  item: FeedEntry;
  text: string;
  border: string;
  muted: string;
  card: string;
  tint: string;
  onViewMap: (entry: Entry) => void;
  onEdit: (entry: Entry) => void;
  onDelete: (entry: Entry) => void;
}) {
  return (
    <View style={[styles.card, { borderColor: border, backgroundColor: card }]}>
      <Image source={{ uri: item.imageUrl }} style={[styles.image, { borderColor: border }]} />
      <Text style={[styles.title, { color: text }]}>{item.title}</Text>
      {!!item.description && (
        <Text style={[styles.description, { color: text }]}>{item.description}</Text>
      )}
      <Text style={[styles.meta, { color: muted }]}>
        {item.latitude.toFixed(6)}, {item.longitude.toFixed(6)}
      </Text>
      {!!item.placeName && <Text style={[styles.meta, { color: muted }]}>{item.placeName}</Text>}
      <Text style={[styles.meta, { color: muted }]}>{new Date(item.createdAt).toLocaleString()}</Text>
      <View
        style={[
          styles.badge,
          {
            backgroundColor: item.syncStatus === 'pending' ? '#f59e0b22' : '#16a34a22',
            borderColor: item.syncStatus === 'pending' ? '#f59e0b' : '#16a34a',
          },
        ]}>
        <Text
          style={{
            color: item.syncStatus === 'pending' ? '#b45309' : '#166534',
            fontFamily: Fonts.sans,
            fontWeight: '600',
            fontSize: 12,
          }}>
          {item.syncStatus === 'pending' ? 'Pending sync' : 'Synced'}
        </Text>
      </View>
      <View style={styles.actionsRow}>
        <TouchableOpacity
          onPress={() => onViewMap(item)}
          style={[styles.mapButton, { borderColor: tint, backgroundColor: card }]}
        >
          <Text style={{ color: tint, fontWeight: '600', fontFamily: Fonts.sans }}>Map</Text>
        </TouchableOpacity>
        {item.syncStatus === 'synced' && (
          <TouchableOpacity
            onPress={() => onEdit(item)}
            style={[styles.mapButton, { borderColor: tint, backgroundColor: card }]}
          >
            <Text style={{ color: tint, fontWeight: '600', fontFamily: Fonts.sans }}>Edit</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => onDelete(item)}
          style={[styles.mapButton, { borderColor: '#dc2626', backgroundColor: card }]}
        >
          <Text style={{ color: '#dc2626', fontWeight: '600', fontFamily: Fonts.sans }}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function EntriesScreen() {
  const router = useRouter();
  const { token, user, logoutUser } = useAuth();
  const background = useThemeColor({}, 'background');
  const text = useThemeColor({}, 'text');
  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'muted');
  const card = useThemeColor({}, 'card');
  const tint = useThemeColor({}, 'tint');
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncingNow, setSyncingNow] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);

  const pendingCount = entries.filter((entry) => entry.syncStatus === 'pending').length;

  const lastSyncLabel = lastSyncAt
    ? `Last synced ${lastSyncAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : 'Not synced yet';

  const handleDelete = (entry: FeedEntry) => {
    if (!token) {
      return;
    }

    Alert.alert('Delete entry', `Delete "${entry.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            if (entry.syncStatus === 'pending' && entry.localId) {
              await removeQueuedEntry(entry.localId);
            } else {
              await deleteEntry(token, entry._id);
            }
            await loadEntries(true);
          } catch (error) {
            Alert.alert('Error', error instanceof Error ? error.message : 'Failed to delete entry');
          }
        },
      },
    ]);
  };

  const loadEntries = useCallback(async (isRefresh = false) => {
    if (!token) {
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      await syncQueuedEntries(token);

      const [syncedEntries, queuedEntries] = await Promise.all([getEntries(token), getQueuedEntries()]);

      const pendingEntries: FeedEntry[] = queuedEntries.map((entry) => ({
        _id: entry.id,
        localId: entry.id,
        imageUrl: entry.photoUri,
        latitude: entry.latitude,
        longitude: entry.longitude,
        title: entry.title,
        description: entry.description,
        createdAt: entry.createdAt,
        syncStatus: 'pending',
      }));

      const remoteEntries: FeedEntry[] = syncedEntries.map((entry) => ({
        ...entry,
        syncStatus: 'synced',
      }));

      const mergedEntries = [...pendingEntries, ...remoteEntries].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      const entriesWithPlaces: FeedEntry[] = await Promise.all(
        mergedEntries.map(async (entry) => ({
          ...entry,
          placeName: await reverseGeocode(entry.latitude, entry.longitude),
        }))
      );

      setEntries(entriesWithPlaces);
      setLastSyncAt(new Date());
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to load entries');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void loadEntries();
    }, [loadEntries])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const handleSyncNow = async () => {
    if (!token || syncingNow) {
      return;
    }

    setSyncingNow(true);
    try {
      const result = await syncQueuedEntries(token);
      await loadEntries(true);
      Alert.alert(
        'Sync complete',
        result.syncedCount > 0
          ? `${result.syncedCount} entry${result.syncedCount > 1 ? 'ies' : 'y'} synced${
              result.remainingCount > 0 ? `, ${result.remainingCount} still pending` : ''
            }.`
          : result.remainingCount > 0
            ? `${result.remainingCount} entries are still pending.`
            : 'No pending entries.'
      );
    } catch (error) {
      Alert.alert('Sync failed', error instanceof Error ? error.message : 'Please try again');
    } finally {
      setSyncingNow(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: background }]}> 
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.headerTitle, { color: text }]}>Your Entries</Text>
          <Text style={[styles.headerSub, { color: muted }]}>Hi, {user?.name ?? 'User'}</Text>
          <View style={[styles.pendingBadge, { borderColor: border, backgroundColor: card }]}> 
            <Text style={[styles.pendingBadgeText, { color: muted }]}>
              {pendingCount} pending upload{pendingCount === 1 ? '' : 's'}
            </Text>
          </View>
          <Text style={[styles.lastSyncText, { color: muted }]}>{lastSyncLabel}</Text>
        </View>
        <View style={styles.headerActions}>
          {pendingCount > 0 && (
            <TouchableOpacity
              onPress={() => void handleSyncNow()}
              style={[styles.syncButton, { borderColor: tint, backgroundColor: card }]}
              disabled={syncingNow}>
              <Text style={[styles.syncButtonText, { color: tint }]}>
                {syncingNow ? 'Syncing...' : 'Sync now'}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => void logoutUser()} style={[styles.logoutButton, { backgroundColor: tint }]}>
            <Text style={[styles.logoutText, { color: background }]}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={entries}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <EntryCard
            item={item}
            text={text}
            border={border}
            muted={muted}
            card={card}
            tint={tint}
            onViewMap={(entry) =>
              router.push({
                pathname: '/entry-map',
                params: {
                  latitude: String(entry.latitude),
                  longitude: String(entry.longitude),
                  title: entry.title,
                },
              })
            }
            onEdit={(entry) =>
              router.push({
                pathname: '/edit-entry',
                params: {
                  id: entry._id,
                  title: entry.title,
                  description: entry.description,
                },
              })
            }
            onDelete={handleDelete}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void loadEntries(true)} />
        }
        ListEmptyComponent={
          <Text style={[styles.empty, { color: muted }]}>No entries yet. Capture your first one!</Text>
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 56,
    paddingHorizontal: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: Fonts.rounded,
  },
  headerSub: {
    marginTop: 2,
    fontFamily: Fonts.sans,
  },
  logoutButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  logoutText: {
    fontWeight: '600',
    fontFamily: Fonts.sans,
  },
  headerActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  syncButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  syncButtonText: {
    fontFamily: Fonts.sans,
    fontWeight: '600',
  },
  pendingBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pendingBadgeText: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    fontWeight: '600',
  },
  lastSyncText: {
    marginTop: 6,
    fontFamily: Fonts.sans,
    fontSize: 12,
  },
  listContent: {
    paddingBottom: 24,
    gap: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  image: {
    width: '100%',
    height: 180,
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: Fonts.rounded,
  },
  description: {
    marginTop: 4,
    fontFamily: Fonts.sans,
  },
  meta: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: Fonts.sans,
  },
  mapButton: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  badge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  empty: {
    textAlign: 'center',
    marginTop: 40,
    fontFamily: Fonts.sans,
  },
});