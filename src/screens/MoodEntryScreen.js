import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import MoodSelector from '../components/MoodSelector';
import VoiceRecorder from '../components/VoiceRecorder';
import { saveEntry } from '../services/storage';
import { getMoodByValue } from '../constants/moods';

export default function MoodEntryScreen({ navigation }) {
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
      Alert.alert(
        'Agrega una nota',
        'Escribe algo o graba una nota de voz para describir cómo te sientes.'
      );
      return;
    }

    setSaving(true);
    try {
      await saveEntry({
        moodValue,
        text: text.trim(),
        audioUri,
      });
      Alert.alert('Guardado ✓', `Tu registro de "${getMoodByValue(moodValue).label}" se guardó.`);
      setMoodValue(null);
      setText('');
      setAudioUri(null);
    } catch (err) {
      Alert.alert('Error', 'No se pudo guardar. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.header}>¿Cómo te sientes ahora?</Text>
        <Text style={styles.subtitle}>
          {new Date().toLocaleDateString('es', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>

        <MoodSelector selected={moodValue} onSelect={setMoodValue} />

        <Text style={styles.sectionTitle}>Escribe cómo te sientes</Text>
        <TextInput
          style={styles.textInput}
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
          style={[styles.saveBtn, saving && styles.savingBtn]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>
            {saving ? 'Guardando...' : 'Guardar registro'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
    marginBottom: 24,
    textTransform: 'capitalize',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
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
  saveBtn: {
    backgroundColor: '#6C63FF',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  savingBtn: { opacity: 0.7 },
  saveBtnText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
