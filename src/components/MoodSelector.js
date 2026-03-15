import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { MOODS } from '../constants/moods';

export default function MoodSelector({ selected, onSelect }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>¿Cómo te sientes?</Text>
      <View style={styles.row}>
        {MOODS.map((mood) => (
          <TouchableOpacity
            key={mood.value}
            testID={`mood-${mood.value}`}
            accessibilityLabel={mood.label}
            style={[
              styles.moodBtn,
              selected === mood.value && {
                backgroundColor: mood.color + '22',
                borderColor: mood.color,
              },
            ]}
            onPress={() => onSelect(mood.value)}
          >
            <Text style={styles.emoji}>{mood.emoji}</Text>
            <Text
              style={[
                styles.label,
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

const styles = StyleSheet.create({
  container: { marginBottom: 20 },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  moodBtn: {
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 60,
  },
  emoji: { fontSize: 32 },
  label: { fontSize: 11, color: '#666', marginTop: 4 },
});
