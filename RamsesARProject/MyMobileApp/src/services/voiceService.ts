/**
 * Voice Service
 * =============
 * Handles audio recording and playback using react-native-audio-recorder-player.
 */

import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import {Platform, PermissionsAndroid} from 'react-native';
import RNFS from 'react-native-fs';

const audioRecorderPlayer = new AudioRecorderPlayer();

async function requestPermissions(): Promise<boolean> {
  if (Platform.OS === 'android') {
    try {
      const alreadyGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      );
      if (alreadyGranted) {
        return true;
      }

      const permissions: Array<
        (typeof PermissionsAndroid.PERMISSIONS)[keyof typeof PermissionsAndroid.PERMISSIONS]
      > = [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO];

      if (Platform.Version < 33) {
        permissions.push(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        );
      }

      const grants = await PermissionsAndroid.requestMultiple(permissions);

      const micGranted =
        grants[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] ===
        PermissionsAndroid.RESULTS.GRANTED;

      if (!micGranted) {
        console.warn(
          'Microphone permission denied:',
          grants[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO],
        );
      }

      return micGranted;
    } catch (err) {
      console.error('Permission request error:', err);
      return false;
    }
  }
  return true;
}

export interface RecordingResult {
  filePath: string;
  durationMs: number;
}

let recordingStartTime = 0;
let currentRecordingPath: string | null = null;

const RECORDING_FILENAME = 'pharaohs_recording.mp4';

/**
 * Start recording audio.
 * Returns the file path where the recording will be stored.
 */
export async function startRecording(): Promise<string> {
  const hasPermission = await requestPermissions();
  if (!hasPermission) {
    throw new Error('Microphone permission denied');
  }

  // Stop any previous recording gracefully
  try {
    await audioRecorderPlayer.stopRecorder();
  } catch (_) {
    // No active recorder – fine
  }
  audioRecorderPlayer.removeRecordBackListener();

  const filePath = Platform.select({
    android: `${RNFS.CachesDirectoryPath}/${RECORDING_FILENAME}`,
    ios: `${RNFS.CachesDirectoryPath}/${RECORDING_FILENAME}`,
  }) as string;

  recordingStartTime = Date.now();
  const uri = await audioRecorderPlayer.startRecorder(filePath);
  currentRecordingPath = uri;

  audioRecorderPlayer.addRecordBackListener(() => {
    // Keep listener alive so recording continues
  });

  return uri;
}

/**
 * Stop recording and return the file path + duration.
 */
export async function stopRecording(): Promise<RecordingResult> {
  const uri = await audioRecorderPlayer.stopRecorder();
  audioRecorderPlayer.removeRecordBackListener();

  const durationMs = Date.now() - recordingStartTime;
  const filePath = currentRecordingPath || uri;
  currentRecordingPath = null;

  return {filePath, durationMs};
}

/**
 * Play an audio file from a local path.
 */
export async function playAudio(filePath: string): Promise<void> {
  try {
    await audioRecorderPlayer.stopPlayer();
  } catch (_) {
    // No active player – fine
  }
  audioRecorderPlayer.removePlayBackListener();

  await audioRecorderPlayer.startPlayer(filePath);
  return new Promise<void>((resolve) => {
    audioRecorderPlayer.addPlayBackListener((e) => {
      if (e.currentPosition >= e.duration) {
        audioRecorderPlayer.stopPlayer();
        audioRecorderPlayer.removePlayBackListener();
        resolve();
      }
    });
  });
}

/**
 * Play audio from base64 data by writing to a temp file first.
 */
export async function playBase64Audio(base64Data: string): Promise<void> {
  const tempPath = `${RNFS.CachesDirectoryPath}/pharaohs_response.mp3`;
  await RNFS.writeFile(tempPath, base64Data, 'base64');
  return playAudio(tempPath);
}

/**
 * Stop audio playback.
 */
export async function stopAudio(): Promise<void> {
  try {
    await audioRecorderPlayer.stopPlayer();
  } catch (_) {
    // Nothing playing
  }
  audioRecorderPlayer.removePlayBackListener();
}
