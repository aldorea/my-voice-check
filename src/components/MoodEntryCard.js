import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { getMoodByValue } from '../constants/moods';
import { playAudio } from '../services/audio';
import { deleteEntry } from '../services/storage';
import { analyzeEntry } from '../services/api';

export default function MoodEntryCard({ entry, onDeleted, onAnalyzed }) {
  const [analyzing, setAnalyzing] = useState(false);
  const mood = getMoodByValue(entry.moodValue);
  const time = new Date(entry.timestamp).toLocaleTimeString('es', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleDelete = () => {
    Alert.alert('Eliminar registro', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await deleteEntry(entry.id);
          onDeleted();
        },
      },
    ]);
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const result = await analyzeEntry(entry.id);
      if (onAnalyzed) onAnalyzed(result);
      Alert.alert(
        '🧠 Análisis listo',
        `${result.emotional_state}\n\nVe a la pestaña "Análisis" para ver el detalle completo.`
      );
    } catch (err) {
      Alert.alert('Error', err.message || 'No se pudo analizar. Verifica tu conexión al servidor.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <View testID={`entry-card-${entry.id}`} style={[styles.card, { borderLeftColor: mood.color }]}>
      <View style={styles.header}>
        <Text style={styles.emoji}>{mood.emoji}</Text>
        <View style={styles.headerText}>
          <Text style={styles.moodLabel}>{mood.label}</Text>
          <Text style={styles.time}>{time}</Text>
        </View>
        <TouchableOpacity testID="delete-entry-btn" onPress={handleDelete} style={styles.deleteBtn}>
          <Text style={styles.deleteText}>✕</Text>
        </TouchableOpacity>
      </View>

      {entry.text ? <Text style={styles.text}>{entry.text}</Text> : null}

      {entry.audioUri ? (
        <TouchableOpacity
          style={styles.audioBtn}
          onPress={() => playAudio(entry.audioUri)}
        >
          <Text style={styles.audioIcon}>🔊</Text>
          <Text style={styles.audioText}>Reproducir nota de voz</Text>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity
        style={[styles.analyzeBtn, analyzing && styles.analyzingBtn]}
        onPress={handleAnalyze}
        disabled={analyzing}
      >
        {analyzing ? (
          <ActivityIndicator color="#6C63FF" size="small" />
        ) : (
          <>
            <Text style={styles.analyzeIcon}>🧠</Text>
            <Text style={styles.analyzeText}>Analizar con IA</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  emoji: { fontSize: 28, marginRight: 10 },
  headerText: { flex: 1 },
  moodLabel: { fontSize: 16, fontWeight: '600', color: '#333' },
  time: { fontSize: 12, color: '#999' },
  deleteBtn: { padding: 6 },
  deleteText: { fontSize: 16, color: '#CCC' },
  text: { fontSize: 14, color: '#555', lineHeight: 20, marginBottom: 6 },
  audioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0EFFF',
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  audioIcon: { fontSize: 18, marginRight: 8 },
  audioText: { color: '#6C63FF', fontWeight: '600', fontSize: 13 },
  analyzeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F7FF',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E0DEFF',
    gap: 6,
  },
  analyzingBtn: { opacity: 0.7 },
  analyzeIcon: { fontSize: 16 },
  analyzeText: { color: '#6C63FF', fontWeight: '600', fontSize: 13 },
});
