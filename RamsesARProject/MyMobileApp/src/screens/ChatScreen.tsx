import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {ArrowLeft, Volume2, VolumeX} from 'lucide-react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../App';
import {Colors, FontSizes, Spacing, BorderRadius} from '../constants/DesignTokens';
import {sendTextQuery, sendVoiceQuery, describeImages} from '../services/apiService';
import {playBase64Audio, stopAudio} from '../services/voiceService';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  imageUri?: string;
  audioBase64?: string;
}

export function ChatScreen({navigation, route}: Props) {
  const {pharaohName, initialQuery, voiceMode, imageUri, audioFilePath} =
    route.params ?? {};

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Process the incoming query on mount ─────────────────────
  const processQuery = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Voice input path: send audio file to /voice-query
      if (voiceMode && audioFilePath) {
        setMessages([{role: 'user', text: '🎤 Voice message'}]);

        const result = await sendVoiceQuery(audioFilePath);

        setMessages([
          {role: 'user', text: result.transcript || '🎤 Voice message'},
          {
            role: 'assistant',
            text: result.answer,
            audioBase64: result.audio_base64,
          },
        ]);
        return;
      }

      // Image + text path: describe image first, then query
      if (imageUri) {
        const queryText = initialQuery || 'Describe this image';
        setMessages([{role: 'user', text: queryText, imageUri}]);

        // First describe the image via /describe-images
        const descResult = await describeImages([imageUri]);
        const descriptions = descResult.descriptions;

        // Then send text query with image descriptions
        const result = await sendTextQuery(queryText, descriptions);

        setMessages(prev => [
          ...prev,
          {role: 'assistant', text: result.answer},
        ]);
        return;
      }

      // Text-only path
      const queryText =
        initialQuery || (pharaohName ? `Tell me about ${pharaohName}` : '');
      if (!queryText) {return;}

      setMessages([{role: 'user', text: queryText}]);

      const result = await sendTextQuery(queryText);

      setMessages(prev => [
        ...prev,
        {role: 'assistant', text: result.answer},
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [voiceMode, audioFilePath, imageUri, initialQuery, pharaohName]);

  useEffect(() => {
    processQuery();
  }, [processQuery]);

  const handlePlayAudio = async (audioBase64: string) => {
    try {
      if (isPlaying) {
        await stopAudio();
        setIsPlaying(false);
      } else {
        setIsPlaying(true);
        await playBase64Audio(audioBase64);
        setIsPlaying(false);
      }
    } catch {
      setIsPlaying(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <SafeAreaView style={styles.inner} edges={['top', 'bottom']}>
        {/* ── Header ──────────────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}>
            <ArrowLeft size={24} color={Colors.primary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>The Scribe</Text>
            {pharaohName && (
              <Text style={styles.headerSubtitle}>{pharaohName}</Text>
            )}
          </View>
          <View style={styles.backButton} />
        </View>

        {/* ── Messages ────────────────────────────────────── */}
        <ScrollView
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}>
          {messages.map((msg, idx) => (
            <View
              key={idx}
              style={[
                styles.messageBubble,
                msg.role === 'user'
                  ? styles.userBubble
                  : styles.assistantBubble,
              ]}>
              {msg.imageUri && (
                <Image
                  source={{uri: msg.imageUri}}
                  style={styles.messageImage}
                />
              )}
              <Text
                style={[
                  styles.messageText,
                  msg.role === 'user'
                    ? styles.userText
                    : styles.assistantText,
                ]}>
                {msg.text}
              </Text>
              {msg.audioBase64 && (
                <TouchableOpacity
                  style={styles.audioButton}
                  onPress={() => handlePlayAudio(msg.audioBase64!)}
                  activeOpacity={0.7}>
                  {isPlaying ? (
                    <VolumeX size={18} color={Colors.primary} />
                  ) : (
                    <Volume2 size={18} color={Colors.primary} />
                  )}
                  <Text style={styles.audioButtonText}>
                    {isPlaying ? 'Stop' : 'Play response'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ))}

          {loading && (
            <View style={[styles.messageBubble, styles.assistantBubble]}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.loadingText}>Consulting the archives...</Text>
            </View>
          )}

          {error && (
            <View style={[styles.messageBubble, styles.errorBubble]}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                onPress={processQuery}
                activeOpacity={0.7}
                style={styles.retryButton}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundDark,
  },
  inner: {
    flex: 1,
  },

  // ── Header ────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.textWhite10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  title: {
    color: Colors.primary,
    fontSize: FontSizes.lg,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: Colors.textWhite50,
    fontSize: FontSizes.xs,
    marginTop: 2,
  },

  // ── Messages ──────────────────────────────────────────────
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  messageBubble: {
    maxWidth: '85%',
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.sm,
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
    width: '100%',
    height: 150,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    resizeMode: 'cover',
  },

  // ── Audio button ──────────────────────────────────────────
  audioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.textWhite05,
  },
  audioButtonText: {
    color: Colors.primary,
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },

  // ── Loading & Error ───────────────────────────────────────
  loadingText: {
    color: Colors.textWhite50,
    fontSize: FontSizes.sm,
    marginTop: Spacing.sm,
  },
  errorBubble: {
    alignSelf: 'center',
    backgroundColor: 'rgba(192, 57, 43, 0.15)',
    borderColor: 'rgba(192, 57, 43, 0.3)',
    borderWidth: 1,
  },
  errorText: {
    color: Colors.terracotta,
    fontSize: FontSizes.sm,
  },
  retryButton: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.terracotta,
    alignSelf: 'center',
  },
  retryText: {
    color: Colors.textWhite,
    fontSize: FontSizes.xs,
    fontWeight: '700',
  },
});
