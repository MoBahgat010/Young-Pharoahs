import React, {useState, useCallback, useRef, useEffect} from 'react';
import {View, TouchableOpacity, Text, StyleSheet, Animated} from 'react-native';
import {Play, Pause, Mic} from 'lucide-react-native';
import {Colors, Spacing, FontSizes, BorderRadius} from '../constants/DesignTokens';
import {
  playAudioWithProgress,
  stopAudio,
  seekAudio,
  writeBase64ToFile,
  type PlaybackProgress,
} from '../services/voiceService';

interface VoiceMessageBubbleProps {
  /** Local file path to the recorded audio */
  voiceFilePath?: string;
  /** Base64 audio data (for assistant responses) */
  audioBase64?: string;
  /** Duration hint from recording (ms) */
  durationHintMs?: number;
  /** Which message is currently playing globally */
  isGloballyPlaying: boolean;
  /** Callback when play state changes */
  onPlayStateChange: (playing: boolean) => void;
  /** 'user' or 'assistant' for styling */
  role: 'user' | 'assistant';
}

function formatDuration(ms: number): string {
  if (!ms || ms <= 0) {return '0:00';}
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function VoiceMessageBubble({
  voiceFilePath,
  audioBase64,
  durationHintMs = 0,
  isGloballyPlaying,
  onPlayStateChange,
  role,
}: VoiceMessageBubbleProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1
  const [currentMs, setCurrentMs] = useState(0);
  const [totalMs, setTotalMs] = useState(durationHintMs);
  const [resolvedPath, setResolvedPath] = useState<string | null>(voiceFilePath ?? null);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const playPromiseRef = useRef<Promise<void> | null>(null);

  // Resolve base64 to file path on mount
  useEffect(() => {
    if (!voiceFilePath && audioBase64) {
      const id = Date.now();
      writeBase64ToFile(audioBase64, `voice_msg_${id}.mp3`).then(path => {
        setResolvedPath(path);
      });
    }
  }, [voiceFilePath, audioBase64]);

  // Stop if another message starts playing
  useEffect(() => {
    if (!isGloballyPlaying && isPlaying) {
      stopAudio();
      setIsPlaying(false);
      // Don't reset progress — let user see where they stopped
    }
  }, [isGloballyPlaying, isPlaying]);

  const handleProgress = useCallback((p: PlaybackProgress) => {
    if (p.durationMs > 0) {
      const pct = p.currentPositionMs / p.durationMs;
      setProgress(pct);
      setCurrentMs(p.currentPositionMs);
      setTotalMs(p.durationMs);
      progressAnim.setValue(pct);
    }
  }, [progressAnim]);

  const handlePlayPause = useCallback(async () => {
    if (!resolvedPath) {return;}

    if (isPlaying) {
      await stopAudio();
      setIsPlaying(false);
      onPlayStateChange(false);
    } else {
      onPlayStateChange(true);
      setIsPlaying(true);

      try {
        playPromiseRef.current = playAudioWithProgress(resolvedPath, handleProgress);
        await playPromiseRef.current;
      } catch {
        // Playback error or interrupted
      } finally {
        setIsPlaying(false);
        onPlayStateChange(false);
        setProgress(0);
        setCurrentMs(0);
        progressAnim.setValue(0);
      }
    }
  }, [resolvedPath, isPlaying, onPlayStateChange, handleProgress, progressAnim]);

  const handleSeek = useCallback(async (evt: {nativeEvent: {locationX: number}}, barWidth: number) => {
    if (!resolvedPath || totalMs <= 0) {return;}
    const pct = Math.max(0, Math.min(1, evt.nativeEvent.locationX / barWidth));
    const seekMs = pct * totalMs;
    setProgress(pct);
    setCurrentMs(seekMs);
    progressAnim.setValue(pct);
    if (isPlaying) {
      await seekAudio(seekMs);
    }
  }, [resolvedPath, totalMs, isPlaying, progressAnim]);

  const isUser = role === 'user';
  const barWidth = 180;

  const waveformBars = [0.3, 0.5, 0.8, 0.4, 0.9, 0.6, 0.7, 0.3, 0.8, 0.5, 0.6, 0.9, 0.4, 0.7, 0.5, 0.3, 0.8, 0.6, 0.4, 0.7];

  return (
    <View style={[styles.container, isUser ? styles.containerUser : styles.containerAssistant]}>
      {/* Play/Pause button */}
      <TouchableOpacity
        style={[styles.playButton, isUser ? styles.playButtonUser : styles.playButtonAssistant]}
        onPress={handlePlayPause}
        activeOpacity={0.7}>
        {isPlaying ? (
          <Pause size={18} color={isUser ? Colors.backgroundDark : Colors.primary} />
        ) : (
          <Play size={18} color={isUser ? Colors.backgroundDark : Colors.primary} style={{marginLeft: 2}} />
        )}
      </TouchableOpacity>

      {/* Waveform & progress */}
      <View style={styles.waveformContainer}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={(evt) => handleSeek(evt, barWidth)}
          style={[styles.waveform, {width: barWidth}]}>
          {waveformBars.map((height, i) => {
            const barPct = i / waveformBars.length;
            const isActive = barPct <= progress;
            return (
              <View
                key={i}
                style={[
                  styles.waveformBar,
                  {
                    height: height * 24,
                    backgroundColor: isActive
                      ? (isUser ? Colors.backgroundDark : Colors.primary)
                      : (isUser ? 'rgba(34,30,16,0.3)' : Colors.textWhite10),
                  },
                ]}
              />
            );
          })}
        </TouchableOpacity>

        {/* Duration */}
        <Text style={[styles.duration, isUser ? styles.durationUser : styles.durationAssistant]}>
          {isPlaying ? formatDuration(currentMs) : formatDuration(totalMs)}
        </Text>
      </View>

      {/* Mic icon */}
      <View style={[styles.micIcon, isUser ? styles.micIconUser : styles.micIconAssistant]}>
        <Mic size={14} color={isUser ? Colors.backgroundDark : Colors.primary} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  containerUser: {},
  containerAssistant: {},
  playButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonUser: {
    backgroundColor: 'rgba(34,30,16,0.15)',
  },
  playButtonAssistant: {
    backgroundColor: Colors.textWhite05,
  },
  waveformContainer: {
    flex: 1,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 28,
  },
  waveformBar: {
    width: 3,
    borderRadius: 2,
    minHeight: 4,
  },
  duration: {
    fontSize: FontSizes.tiny,
    marginTop: 2,
    fontWeight: '500',
  },
  durationUser: {
    color: 'rgba(34,30,16,0.6)',
  },
  durationAssistant: {
    color: Colors.textWhite50,
  },
  micIcon: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micIconUser: {
    backgroundColor: 'rgba(34,30,16,0.1)',
  },
  micIconAssistant: {
    backgroundColor: Colors.textWhite05,
  },
});
