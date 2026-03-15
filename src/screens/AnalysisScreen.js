import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  analyzeDailyMood,
  analyzeWeeklyMood,
  getAnalyses,
} from '../services/api';

const RISK_COLORS = {
  bajo: '#4CAF50',
  medio: '#FF9800',
  alto: '#F44336',
};

const RISK_ICONS = {
  bajo: '🟢',
  medio: '🟡',
  alto: '🔴',
};

const TYPE_LABELS = {
  single: 'Registro individual',
  daily: 'Análisis del día',
  weekly: 'Análisis semanal',
};

function AnalysisCard({ analysis }) {
  const [expanded, setExpanded] = useState(false);
  const riskColor = RISK_COLORS[analysis.risk_level] || '#999';
  const date = new Date(analysis.created_at).toLocaleDateString('es', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: riskColor }]}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.cardType}>{TYPE_LABELS[analysis.analysis_type] || analysis.analysis_type}</Text>
          <Text style={styles.cardDate}>{date}</Text>
        </View>
        <View style={[styles.riskBadge, { backgroundColor: riskColor + '20' }]}>
          <Text style={styles.riskIcon}>{RISK_ICONS[analysis.risk_level] || '⚪'}</Text>
          <Text style={[styles.riskText, { color: riskColor }]}>
            Riesgo {analysis.risk_level}
          </Text>
        </View>
      </View>

      {analysis.entries_analyzed > 1 && (
        <Text style={styles.entriesCount}>
          📊 {analysis.entries_analyzed} registros analizados
        </Text>
      )}

      <Text style={styles.sectionLabel}>Estado emocional</Text>
      <Text style={styles.sectionText}>{analysis.emotional_state}</Text>

      {expanded && (
        <>
          {analysis.transcription && (
            <>
              <Text style={styles.sectionLabel}>🎙️ Transcripción de voz</Text>
              <View style={styles.transcriptionBox}>
                <Text style={styles.transcriptionText}>"{analysis.transcription}"</Text>
              </View>
            </>
          )}

          <Text style={styles.sectionLabel}>🧠 Análisis profesional</Text>
          <Text style={styles.sectionText}>{analysis.professional_analysis}</Text>

          <Text style={styles.sectionLabel}>💡 Recomendaciones</Text>
          <Text style={styles.sectionText}>{analysis.recommendations}</Text>

          <Text style={styles.sectionLabel}>🔍 Patrones detectados</Text>
          <Text style={styles.sectionText}>{analysis.patterns_detected}</Text>

          <View style={styles.disclaimer}>
            <Text style={styles.disclaimerText}>
              ⚠️ Este análisis es orientativo y no sustituye la consulta con un profesional de salud mental.
            </Text>
          </View>
        </>
      )}

      <Text style={styles.expandHint}>
        {expanded ? 'Toca para contraer ▲' : 'Toca para ver análisis completo ▼'}
      </Text>
    </TouchableOpacity>
  );
}

export default function AnalysisScreen() {
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadAnalyses = useCallback(async () => {
    try {
      const data = await getAnalyses();
      setAnalyses(data.analyses);
    } catch {
      // silently fail on load
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAnalyses();
    }, [loadAnalyses])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAnalyses();
    setRefreshing(false);
  };

  const handleAnalyze = async (type) => {
    setGenerating(type);
    try {
      if (type === 'daily') {
        await analyzeDailyMood();
      } else {
        await analyzeWeeklyMood();
      }
      await loadAnalyses();
      Alert.alert('Análisis listo', 'Tu análisis profesional se ha generado.');
    } catch (err) {
      Alert.alert('Error', err.message || 'No se pudo generar el análisis.');
    } finally {
      setGenerating(null);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.header}>Análisis profesional</Text>
        <Text style={styles.subtitle}>
          IA con perspectiva de psicología clínica
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.dailyBtn]}
            onPress={() => handleAnalyze('daily')}
            disabled={!!generating}
          >
            {generating === 'daily' ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Text style={styles.actionIcon}>📅</Text>
                <Text style={styles.actionText}>Análisis del día</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.weeklyBtn]}
            onPress={() => handleAnalyze('weekly')}
            disabled={!!generating}
          >
            {generating === 'weekly' ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Text style={styles.actionIcon}>📊</Text>
                <Text style={styles.actionText}>Análisis semanal</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {generating && (
          <View style={styles.generatingBox}>
            <ActivityIndicator color="#6C63FF" size="small" />
            <Text style={styles.generatingText}>
              Analizando tus registros con IA...{'\n'}
              Esto puede tomar unos segundos.
            </Text>
          </View>
        )}

        {analyses.length === 0 && !generating ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🧠</Text>
            <Text style={styles.emptyText}>
              Aún no tienes análisis.{'\n'}
              Registra cómo te sientes y genera{'\n'}
              tu primer análisis profesional.
            </Text>
          </View>
        ) : (
          analyses.map((a) => <AnalysisCard key={a.id} analysis={a} />)
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  content: { padding: 20, paddingBottom: 40 },
  header: {
    fontSize: 26,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    elevation: 2,
    gap: 8,
  },
  dailyBtn: { backgroundColor: '#6C63FF' },
  weeklyBtn: { backgroundColor: '#4CAF50' },
  actionIcon: { fontSize: 18 },
  actionText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  generatingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0EFFF',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  generatingText: { color: '#6C63FF', fontSize: 13, flex: 1 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardHeaderLeft: { flex: 1 },
  cardType: { fontSize: 15, fontWeight: '700', color: '#333' },
  cardDate: { fontSize: 12, color: '#999', marginTop: 2 },
  riskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  riskIcon: { fontSize: 12 },
  riskText: { fontSize: 12, fontWeight: '600' },
  entriesCount: {
    fontSize: 13,
    color: '#666',
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6C63FF',
    marginTop: 12,
    marginBottom: 4,
  },
  sectionText: {
    fontSize: 14,
    color: '#444',
    lineHeight: 21,
  },
  transcriptionBox: {
    backgroundColor: '#F8F8F8',
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#6C63FF',
  },
  transcriptionText: {
    fontSize: 13,
    color: '#555',
    fontStyle: 'italic',
    lineHeight: 19,
  },
  disclaimer: {
    backgroundColor: '#FFF8E1',
    padding: 10,
    borderRadius: 8,
    marginTop: 14,
  },
  disclaimerText: {
    fontSize: 11,
    color: '#F57F17',
    lineHeight: 16,
  },
  expandHint: {
    textAlign: 'center',
    color: '#BBB',
    fontSize: 12,
    marginTop: 10,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: {
    fontSize: 15,
    color: '#999',
    textAlign: 'center',
    lineHeight: 22,
  },
});
