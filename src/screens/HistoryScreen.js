import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getEntries } from '../services/storage';
import MoodEntryCard from '../components/MoodEntryCard';

export default function HistoryScreen() {
  const [entries, setEntries] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadEntries = useCallback(async () => {
    const data = await getEntries();
    setEntries(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadEntries();
    }, [loadEntries])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEntries();
    setRefreshing(false);
  };

  const groupByDate = (items) => {
    const groups = {};
    items.forEach((item) => {
      const date = new Date(item.timestamp).toLocaleDateString('es', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(item);
    });
    return Object.entries(groups).map(([date, data]) => ({ date, data }));
  };

  const grouped = groupByDate(entries);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Tu historial</Text>

      {entries.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>📝</Text>
          <Text style={styles.emptyText}>
            Aún no tienes registros.{'\n'}¡Empieza a registrar cómo te sientes!
          </Text>
        </View>
      ) : (
        <FlatList
          data={grouped}
          keyExtractor={(item) => item.date}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          renderItem={({ item: group }) => (
            <View style={styles.group}>
              <Text style={styles.dateHeader}>{group.date}</Text>
              {group.data.map((entry) => (
                <MoodEntryCard
                  key={entry.id}
                  entry={entry}
                  onDeleted={loadEntries}
                />
              ))}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: {
    fontSize: 26,
    fontWeight: '700',
    color: '#333',
    padding: 20,
    paddingBottom: 10,
  },
  group: { paddingHorizontal: 20, marginBottom: 10 },
  dateHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    marginBottom: 10,
    textTransform: 'capitalize',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#999', textAlign: 'center', lineHeight: 24 },
});
