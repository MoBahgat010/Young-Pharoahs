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
import {Volume2} from 'lucide-react-native';
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
}

export function MessageBubble({
  message,
  index,
  isGloballyPlaying,
  onPlayStateChange,
  onPlayTTS,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const hasAudio = !!(message.voiceFilePath || message.audioBase64);
  const isAssistantText = message.role === 'assistant' && !hasAudio;

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

      {/* TTS play button for text-only assistant messages */}
      {isAssistantText && (
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
              <Text style={styles.ttsButtonText}>Play</Text>
            </>
          )}
        </TouchableOpacity>
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
    marginTop: Spacing.sm,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.textWhite05,
    alignSelf: 'flex-start',
  },
  ttsButtonText: {
    color: Colors.primary,
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },
});
