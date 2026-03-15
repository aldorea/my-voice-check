// ============================================================
// Mi Estado de Ánimo - App completa en un solo archivo
// Copia y pega este archivo en https://snack.expo.dev como App.js
// ============================================================

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Animated,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';

// ==================== CONSTANTES ====================

const MOODS = [
  { emoji: '😄', label: 'Muy bien', value: 5, color: '#4CAF50' },
  { emoji: '🙂', label: 'Bien', value: 4, color: '#8BC34A' },
  { emoji: '😐', label: 'Normal', value: 3, color: '#FFC107' },
  { emoji: '😔', label: 'Mal', value: 2, color: '#FF9800' },
  { emoji: '😢', label: 'Muy mal', value: 1, color: '#F44336' },
];

const getMoodByValue = (value) => MOODS.find((m) => m.value === value) || MOODS[2];

// ==================== STORAGE ====================

const ENTRIES_KEY = 'mood_entries';

async function saveEntry(entry) {
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

async function getEntries() {
  const data = await AsyncStorage.getItem(ENTRIES_KEY);
  return data ? JSON.parse(data) : [];
}

async function deleteEntry(id) {
  const entries = await getEntries();
  const filtered = entries.filter((e) => e.id !== id);
  await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(filtered));
}

// ==================== AUDIO ====================

let recording = null;

async function requestPermissions() {
  const { granted } = await Audio.requestPermissionsAsync();
  if (!granted) {
    throw new Error('Se necesitan permisos de micrófono.');
  }
  return granted;
}

async function startRecordingAudio() {
  await requestPermissions();
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });
  const { recording: newRecording } = await Audio.Recording.createAsync(
    Audio.RecordingOptionsPresets.HIGH_QUALITY
  );
  recording = newRecording;
  return recording;
}

async function stopRecordingAudio() {
  if (!recording) return null;
  await recording.stopAndUnloadAsync();
  await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
  const uri = recording.getURI();
  recording = null;
  return { uri };
}

async function playAudio(uri) {
  const { sound } = await Audio.Sound.createAsync({ uri });
  await sound.playAsync();
  sound.setOnPlaybackStatusUpdate((status) => {
    if (status.didJustFinish) sound.unloadAsync();
  });
  return sound;
}

// ==================== COMPONENTES ====================

function MoodSelector({ selected, onSelect }) {
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={s.sectionTitle}>¿Cómo te sientes?</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
        {MOODS.map((mood) => (
          <TouchableOpacity
            key={mood.value}
            style={[
              s.moodBtn,
              selected === mood.value && {
                backgroundColor: mood.color + '22',
                borderColor: mood.color,
              },
            ]}
            onPress={() => onSelect(mood.value)}
          >
            <Text style={{ fontSize: 32 }}>{mood.emoji}</Text>
            <Text
              style={[
                { fontSize: 11, color: '#666', marginTop: 4 },
                selected === mood.value && { color: mood.color, fontWeight: '700' },
              ]}
            >
              {mood.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function VoiceRecorder({ audioUri, onRecorded, onClear }) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef(null);

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  };

  const handleRecord = async () => {
    if (isRecording) {
      clearInterval(timerRef.current);
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
      const result = await stopRecordingAudio();
      setIsRecording(false);
      if (result) onRecorded(result);
    } else {
      setDuration(0);
      await startRecordingAudio();
      setIsRecording(true);
      startPulse();
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    }
  };

  const formatTime = (sec) =>
    `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;

  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={s.sectionTitle}>Nota de voz</Text>
      {audioUri ? (
        <View style={s.recorded}>
          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => playAudio(audioUri)}>
            <Text style={{ fontSize: 20, marginRight: 8 }}>▶️</Text>
            <Text style={{ fontSize: 15, color: '#6C63FF', fontWeight: '600' }}>Reproducir</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClear}>
            <Text style={{ color: '#F44336', fontSize: 14 }}>Eliminar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ alignItems: 'center' }}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              style={[s.recordBtn, isRecording && { backgroundColor: '#F44336' }]}
              onPress={handleRecord}
            >
              <Text style={{ fontSize: 28 }}>{isRecording ? '⏹' : '🎤'}</Text>
            </TouchableOpacity>
          </Animated.View>
          <Text style={{ marginTop: 8, color: '#888', fontSize: 14 }}>
            {isRecording ? `Grabando... ${formatTime(duration)}` : 'Toca para grabar'}
          </Text>
        </View>
      )}
    </View>
  );
}

function MoodEntryCard({ entry, onDeleted }) {
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

  return (
    <View style={[s.card, { borderLeftColor: mood.color }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ fontSize: 28, marginRight: 10 }}>{mood.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#333' }}>{mood.label}</Text>
          <Text style={{ fontSize: 12, color: '#999' }}>{time}</Text>
        </View>
        <TouchableOpacity onPress={handleDelete} style={{ padding: 6 }}>
          <Text style={{ fontSize: 16, color: '#CCC' }}>✕</Text>
        </TouchableOpacity>
      </View>
      {entry.text ? (
        <Text style={{ fontSize: 14, color: '#555', lineHeight: 20, marginBottom: 6 }}>
          {entry.text}
        </Text>
      ) : null}
      {entry.audioUri ? (
        <TouchableOpacity style={s.audioBtn} onPress={() => playAudio(entry.audioUri)}>
          <Text style={{ fontSize: 18, marginRight: 8 }}>🔊</Text>
          <Text style={{ color: '#6C63FF', fontWeight: '600', fontSize: 13 }}>
            Reproducir nota de voz
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// ==================== PANTALLAS ====================

function MoodEntryScreen() {
  const [moodValue, setMoodValue] = useState(null);
  const [text, setText] = useState('');
  const [audioUri, setAudioUri] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!moodValue) {
      Alert.alert('Selecciona tu estado de ánimo', 'Elige cómo te sientes antes de guardar.');
      return;
    }
    if (!text.trim() && !audioUri) {
      Alert.alert('Agrega una nota', 'Escribe algo o graba una nota de voz.');
      return;
    }
    setSaving(true);
    try {
      await saveEntry({ moodValue, text: text.trim(), audioUri });
      Alert.alert('Guardado ✓', `Tu registro de "${getMoodByValue(moodValue).label}" se guardó.`);
      setMoodValue(null);
      setText('');
      setAudioUri(null);
    } catch {
      Alert.alert('Error', 'No se pudo guardar. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={{ flex: 1, backgroundColor: '#FAFAFA' }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text style={s.header}>¿Cómo te sientes ahora?</Text>
        <Text style={s.subtitle}>
          {new Date().toLocaleDateString('es', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>

        <MoodSelector selected={moodValue} onSelect={setMoodValue} />

        <Text style={s.sectionTitle}>Escribe cómo te sientes</Text>
        <TextInput
          style={s.textInput}
          placeholder="Hoy me siento así porque..."
          placeholderTextColor="#aaa"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          value={text}
          onChangeText={setText}
        />

        <VoiceRecorder
          audioUri={audioUri}
          onRecorded={({ uri }) => setAudioUri(uri)}
          onClear={() => setAudioUri(null)}
        />

        <TouchableOpacity
          style={[s.saveBtn, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={s.saveBtnText}>{saving ? 'Guardando...' : 'Guardar registro'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function HistoryScreen() {
  const [entries, setEntries] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadEntries = useCallback(async () => {
    const data = await getEntries();
    setEntries(data);
  }, []);

  useFocusEffect(useCallback(() => { loadEntries(); }, [loadEntries]));

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

  return (
    <View style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
      <Text style={s.header}>Tu historial</Text>
      {entries.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 80 }}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>📝</Text>
          <Text style={{ fontSize: 16, color: '#999', textAlign: 'center', lineHeight: 24 }}>
            Aún no tienes registros.{'\n'}¡Empieza a registrar cómo te sientes!
          </Text>
        </View>
      ) : (
        <FlatList
          data={groupByDate(entries)}
          keyExtractor={(item) => item.date}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item: group }) => (
            <View style={{ paddingHorizontal: 20, marginBottom: 10 }}>
              <Text style={s.dateHeader}>{group.date}</Text>
              {group.data.map((entry) => (
                <MoodEntryCard key={entry.id} entry={entry} onDeleted={loadEntries} />
              ))}
            </View>
          )}
        />
      )}
    </View>
  );
}

// ==================== APP PRINCIPAL ====================

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#6C63FF',
          tabBarInactiveTintColor: '#999',
          tabBarStyle: {
            paddingBottom: 8,
            paddingTop: 8,
            height: 60,
            borderTopWidth: 0,
            elevation: 10,
          },
          tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        }}
      >
        <Tab.Screen
          name="Entry"
          component={MoodEntryScreen}
          options={{
            tabBarLabel: 'Registrar',
            tabBarIcon: () => <Text style={{ fontSize: 22 }}>✏️</Text>,
          }}
        />
        <Tab.Screen
          name="History"
          component={HistoryScreen}
          options={{
            tabBarLabel: 'Historial',
            tabBarIcon: () => <Text style={{ fontSize: 22 }}>📋</Text>,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

// ==================== ESTILOS ====================

const s = StyleSheet.create({
  header: { fontSize: 26, fontWeight: '700', color: '#333', marginBottom: 4, padding: 20, paddingBottom: 10 },
  subtitle: { fontSize: 14, color: '#888', marginBottom: 24, textTransform: 'capitalize' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 12, textAlign: 'center' },
  moodBtn: {
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 60,
  },
  textInput: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 20,
    color: '#333',
  },
  recordBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  recorded: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F5F5',
    padding: 14,
    borderRadius: 12,
  },
  saveBtn: {
    backgroundColor: '#6C63FF',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    elevation: 3,
  },
  saveBtnText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
    elevation: 2,
  },
  audioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0EFFF',
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  dateHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    marginBottom: 10,
    textTransform: 'capitalize',
  },
});
