import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from 'react-native';
import {Volume2, Box} from 'lucide-react-native';
import {Colors, FontSizes, Spacing, BorderRadius} from '../constants/DesignTokens';
import {VoiceMessageBubble} from './VoiceMessageBubble';
import type {ChatMessage} from '../types/conversation';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

interface MessageBubbleProps {
  message: ChatMessage;
  index: number;
  isGloballyPlaying: boolean;
  onPlayStateChange: (index: number, playing: boolean) => void;
  onPlayTTS: (messageId: string) => void;
  onPlayInAR?: (messageId: string) => void;
}

export function MessageBubble({
  message,
  index,
  isGloballyPlaying,
  onPlayStateChange,
  onPlayTTS,
  onPlayInAR,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const hasAudio = !!(message.voiceFilePath || message.audioBase64);

  return (
    <View
      style={[
        styles.messageBubble,
        isUser ? styles.userBubble : styles.assistantBubble,
      ]}>
      {/* Attached image */}
      {message.imageUri && (
        <Image
          source={{uri: message.imageUri}}
          style={styles.messageImage}
          resizeMode="cover"
        />
      )}

      {/* AI-generated image */}
      {message.generatedImageBase64 && (
        <Image
          source={{uri: `data:image/png;base64,${message.generatedImageBase64}`}}
          style={styles.generatedImage}
          resizeMode="contain"
        />
      )}

      {/* Message text */}
      <Text
        style={[
          styles.messageText,
          isUser ? styles.userText : styles.assistantText,
        ]}>
        {message.text}
      </Text>

      {/* Voice/audio bubble */}
      {hasAudio && (
        <VoiceMessageBubble
          voiceFilePath={message.voiceFilePath}
          audioBase64={message.audioBase64}
          durationHintMs={message.voiceDurationMs}
          isGloballyPlaying={isGloballyPlaying}
          onPlayStateChange={(playing) => onPlayStateChange(index, playing)}
          role={message.role}
        />
      )}

      {/* Action buttons for assistant messages */}
      {isAssistant && (
        <View style={styles.actionRow}>
          {/* Voice / TTS button — hidden once audio is loaded */}
          {!hasAudio && (
            <TouchableOpacity
              style={styles.ttsButton}
              onPress={() => onPlayTTS(message.id)}
              activeOpacity={0.7}
              disabled={message.isLoadingTTS}>
              {message.isLoadingTTS ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <>
                  <Volume2 size={14} color={Colors.primary} />
                  <Text style={styles.ttsButtonText}>Voice</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* AR button — always visible */}
          {onPlayInAR && (
            <TouchableOpacity
              style={styles.arButton}
              onPress={() => onPlayInAR(message.id)}
              activeOpacity={0.7}
              disabled={message.isLoadingAR}>
              {message.isLoadingAR ? (
                <ActivityIndicator size="small" color="#D4AF37" />
              ) : (
                <>
                  <Box size={14} color="#D4AF37" />
                  <Text style={styles.arButtonText}>AR</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  messageBubble: {
    maxWidth: '85%',
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primary,
    borderBottomRightRadius: BorderRadius.sm,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.cardDark,
    borderBottomLeftRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.textWhite10,
  },
  messageText: {
    fontSize: FontSizes.base,
    lineHeight: 24,
  },
  userText: {
    color: Colors.backgroundDark,
    fontWeight: '500',
  },
  assistantText: {
    color: Colors.textWhite90,
  },
  messageImage: {
    width: SCREEN_WIDTH * 0.85 - Spacing.lg * 2,
    height: 180,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
  },
  generatedImage: {
    width: SCREEN_WIDTH * 0.85 - Spacing.lg * 2,
    height: 220,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.textWhite05,
  },
  ttsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.textWhite05,
  },
  ttsButtonText: {
    color: Colors.primary,
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  arButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
  },
  arButtonText: {
    color: '#D4AF37',
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },
});
