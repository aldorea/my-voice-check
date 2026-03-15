import { Audio } from 'expo-av';

let recording = null;

export async function requestPermissions() {
  const { granted } = await Audio.requestPermissionsAsync();
  if (!granted) {
    throw new Error('Se necesitan permisos de micrófono para grabar notas de voz.');
  }
  return granted;
}

export async function startRecording() {
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

export async function stopRecording() {
  if (!recording) return null;

  await recording.stopAndUnloadAsync();
  await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

  const uri = recording.getURI();
  const { durationMillis } = await recording.getStatusAsync().catch(() => ({ durationMillis: 0 }));
  recording = null;

  return { uri, durationMillis };
}

export async function playAudio(uri) {
  const { sound } = await Audio.Sound.createAsync({ uri });
  await sound.playAsync();
  sound.setOnPlaybackStatusUpdate((status) => {
    if (status.didJustFinish) {
      sound.unloadAsync();
    }
  });
  return sound;
}
