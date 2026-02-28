import AsyncStorage from "@react-native-async-storage/async-storage";

import { createEntry } from "@/lib/api";

const OFFLINE_QUEUE_KEY = "geotag-offline-entry-queue";

export type QueuedEntry = {
  id: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  photoUri: string;
  createdAt: string;
};

async function readQueue(): Promise<QueuedEntry[]> {
  const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as QueuedEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeQueue(queue: QueuedEntry[]) {
  await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

export async function getQueuedEntries() {
  return readQueue();
}

export async function queueEntry(entry: Omit<QueuedEntry, "id" | "createdAt">) {
  const queue = await readQueue();

  const queuedEntry: QueuedEntry = {
    ...entry,
    id: `local-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`,
    createdAt: new Date().toISOString(),
  };

  queue.unshift(queuedEntry);
  await writeQueue(queue);

  return queuedEntry;
}

export async function removeQueuedEntry(id: string) {
  const queue = await readQueue();
  const nextQueue = queue.filter((entry) => entry.id !== id);
  await writeQueue(nextQueue);
}

function createFormData(entry: QueuedEntry) {
  const formData = new FormData();
  formData.append("title", entry.title);
  formData.append("description", entry.description);
  formData.append("latitude", String(entry.latitude));
  formData.append("longitude", String(entry.longitude));
  formData.append("image", {
    uri: entry.photoUri,
    name: `entry-${Date.now()}.jpg`,
    type: "image/jpeg",
  } as any);

  return formData;
}

export async function syncQueuedEntries(token: string) {
  const queue = await readQueue();

  if (queue.length === 0) {
    return { syncedCount: 0, remainingCount: 0 };
  }

  const remaining: QueuedEntry[] = [];
  let syncedCount = 0;

  for (const queuedEntry of queue) {
    try {
      await createEntry(token, createFormData(queuedEntry));
      syncedCount += 1;
    } catch {
      remaining.push(queuedEntry);
    }
  }

  await writeQueue(remaining);

  return {
    syncedCount,
    remainingCount: remaining.length,
  };
}
