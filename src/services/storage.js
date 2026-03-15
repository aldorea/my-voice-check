import AsyncStorage from '@react-native-async-storage/async-storage';

const ENTRIES_KEY = 'mood_entries';

export async function saveEntry(entry) {
  const entries = await getEntries();
  const newEntry = {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    ...entry,
  };
  entries.unshift(newEntry);
  await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
  return newEntry;
}

export async function getEntries() {
  const data = await AsyncStorage.getItem(ENTRIES_KEY);
  return data ? JSON.parse(data) : [];
}

export async function getEntriesByDate(dateStr) {
  const entries = await getEntries();
  return entries.filter((e) => e.timestamp.startsWith(dateStr));
}

export async function deleteEntry(id) {
  const entries = await getEntries();
  const filtered = entries.filter((e) => e.id !== id);
  await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(filtered));
}
