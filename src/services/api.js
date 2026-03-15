import AsyncStorage from '@react-native-async-storage/async-storage';

// Change this to your server IP/URL
const BASE_URL = 'http://localhost:8000/api';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

async function getToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  const token = await getToken();
  const headers = { ...options.headers };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Error de conexión' }));
    throw new Error(error.detail || `Error ${res.status}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

// ==================== AUTH ====================

export async function register(email, name, password) {
  const data = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, name, password }),
  });
  await AsyncStorage.setItem(TOKEN_KEY, data.access_token);
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
  return data;
}

export async function login(email, password) {
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  await AsyncStorage.setItem(TOKEN_KEY, data.access_token);
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
  return data;
}

export async function logout() {
  await AsyncStorage.removeItem(TOKEN_KEY);
  await AsyncStorage.removeItem(USER_KEY);
}

export async function getStoredUser() {
  const user = await AsyncStorage.getItem(USER_KEY);
  const token = await getToken();
  if (user && token) return JSON.parse(user);
  return null;
}

// ==================== MOODS ====================

export async function createMoodEntry(moodValue, text) {
  return request('/moods/', {
    method: 'POST',
    body: JSON.stringify({ mood_value: moodValue, text }),
  });
}

export async function uploadAudio(entryId, audioUri) {
  const formData = new FormData();
  formData.append('file', {
    uri: audioUri,
    name: 'voice_note.m4a',
    type: 'audio/m4a',
  });

  return request(`/moods/${entryId}/audio`, {
    method: 'POST',
    body: formData,
  });
}

export async function getMoodEntries(skip = 0, limit = 50) {
  return request(`/moods/?skip=${skip}&limit=${limit}`);
}

export async function deleteMoodEntry(entryId) {
  return request(`/moods/${entryId}`, { method: 'DELETE' });
}

export function getAudioUrl(entryId) {
  return `${BASE_URL}/moods/${entryId}/audio`;
}
