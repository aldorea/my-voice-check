export const MOODS = [
  { emoji: '😄', label: 'Muy bien', value: 5, color: '#4CAF50' },
  { emoji: '🙂', label: 'Bien', value: 4, color: '#8BC34A' },
  { emoji: '😐', label: 'Normal', value: 3, color: '#FFC107' },
  { emoji: '😔', label: 'Mal', value: 2, color: '#FF9800' },
  { emoji: '😢', label: 'Muy mal', value: 1, color: '#F44336' },
];

export const getMoodByValue = (value) =>
  MOODS.find((m) => m.value === value) || MOODS[2];
