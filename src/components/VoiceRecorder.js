import React, { useState, useRef } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';
import { startRecording, stopRecording, playAudio } from '../services/audio';

export default function VoiceRecorder({ audioUri, onRecorded, onClear }) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef(null);

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const handleRecord = async () => {
    if (isRecording) {
      clearInterval(timerRef.current);
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
      const result = await stopRecording();
      setIsRecording(false);
      if (result) onRecorded(result);
    } else {
      setDuration(0);
      await startRecording();
      setIsRecording(true);
      startPulse();
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    }
  };

  const formatTime = (s) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nota de voz</Text>

      {audioUri ? (
        <View style={styles.recorded}>
          <TouchableOpacity style={styles.playBtn} onPress={() => playAudio(audioUri)}>
            <Text style={styles.playIcon}>▶️</Text>
            <Text style={styles.playText}>Reproducir</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClear}>
            <Text style={styles.clearText}>Eliminar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.recordArea}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              style={[styles.recordBtn, isRecording && styles.recordingBtn]}
              onPress={handleRecord}
            >
              <Text style={styles.recordIcon}>{isRecording ? '⏹' : '🎤'}</Text>
            </TouchableOpacity>
          </Animated.View>
          <Text style={styles.hint}>
            {isRecording
              ? `Grabando... ${formatTime(duration)}`
              : 'Toca para grabar'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 20 },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  recordArea: { alignItems: 'center' },
  recordBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  recordingBtn: { backgroundColor: '#F44336' },
  recordIcon: { fontSize: 28 },
  hint: { marginTop: 8, color: '#888', fontSize: 14 },
  recorded: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F5F5',
    padding: 14,
    borderRadius: 12,
  },
  playBtn: { flexDirection: 'row', alignItems: 'center' },
  playIcon: { fontSize: 20, marginRight: 8 },
  playText: { fontSize: 15, color: '#6C63FF', fontWeight: '600' },
  clearText: { color: '#F44336', fontSize: 14 },
});
