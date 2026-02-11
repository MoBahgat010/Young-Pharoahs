import React, {useEffect, useState, useCallback, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {ArrowLeft, Camera, ImageIcon, Mic, Send, Square, Trash2, MapPin, ChevronUp, ChevronDown} from 'lucide-react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../App';
import {Colors, FontSizes, Spacing, BorderRadius} from '../constants/DesignTokens';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
import {sendTextQuery, sendVoiceQuery, describeImages, fetchPharaohMonuments} from '../services/apiService';
import type {Monument} from '../services/apiService';
import {stopAudio, startRecording, stopRecording} from '../services/voiceService';
import {takePhoto, pickFromGallery, type PickedImage} from '../services/imageService';
import {VoiceMessageBubble} from '../components/VoiceMessageBubble';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  imageUri?: string;
  audioBase64?: string;
  voiceFilePath?: string;
  voiceDurationMs?: number;
}

export function ChatScreen({navigation, route}: Props) {
  const {pharaohName, gender, initialQuery, voiceMode, imageUri, audioFilePath} =
    route.params ?? {};

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [monuments, setMonuments] = useState<Monument[]>([]);
  const [monumentsExpanded, setMonumentsExpanded] = useState(false);

  // ── Input bar state ─────────────────────────────────────────
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [pickedImage, setPickedImage] = useState<PickedImage | null>(null);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const currentGender = gender || 'male';

  // ── Recording pulse animation ──────────────────────────────
  useEffect(() => {
    if (isRecording) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {toValue: 1.3, duration: 600, useNativeDriver: true}),
          Animated.timing(pulseAnim, {toValue: 1, duration: 600, useNativeDriver: true}),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording, pulseAnim]);

  // ── Recording timer ────────────────────────────────────────
  useEffect(() => {
    if (isRecording) {
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
    return () => { if (timerRef.current) { clearInterval(timerRef.current); } };
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const scrollToBottom = () => {
    setTimeout(() => scrollRef.current?.scrollToEnd({animated: true}), 100);
  };

  // ── Fetch monuments in parallel ─────────────────────────────
  useEffect(() => {
    if (pharaohName) {
      fetchPharaohMonuments(pharaohName)
        .then(data => {
          console.log('[Chat] Monuments loaded:', data.monuments?.length);
          setMonuments(data.monuments || []);
        })
        .catch(err => {
          console.warn('[Chat] Monuments fetch failed:', err);
        });
    }
  }, [pharaohName]);

  // ── Process the incoming query on mount ─────────────────────
  const processQuery = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Voice input path: send audio file to /voice-query
      if (voiceMode && audioFilePath) {
        console.log('[Chat] Voice query path — audioFilePath:', audioFilePath);
        setMessages([{role: 'user', text: '🎤 Voice message', voiceFilePath: audioFilePath}]);

        const result = await sendVoiceQuery(audioFilePath, {gender: currentGender});
        console.log('[Chat] Voice query response:', {
          transcript: result.transcript,
          answerLength: result.answer?.length,
          hasAudio: !!result.audio_base64,
          audioBase64Length: result.audio_base64?.length,
          tts_provider: result.tts_provider,
          tts_model: result.tts_model,
        });

        setMessages([
          {role: 'user', text: result.transcript || '🎤 Voice message', voiceFilePath: audioFilePath},
          {
            role: 'assistant',
            text: result.answer,
            audioBase64: result.audio_base64,
          },
        ]);
        scrollToBottom();
        return;
      }

      // Image + text path: describe image first, then query
      if (imageUri) {
        const queryText = initialQuery || 'Describe this image';
        setMessages([{role: 'user', text: queryText, imageUri}]);

        const descResult = await describeImages([imageUri]);
        const descriptions = descResult.descriptions;
        console.log('[Chat] Image descriptions:', descriptions);

        const result = await sendTextQuery(queryText, descriptions, currentGender);
        console.log('[Chat] Image+text query response:', {
          answerLength: result.answer?.length,
          hasAudio: !!result.audio_base64,
          audioBase64Length: result.audio_base64?.length,
          tts_provider: result.tts_provider,
          tts_model: result.tts_model,
        });

        setMessages(prev => [
          ...prev,
          {role: 'assistant', text: result.answer, audioBase64: result.audio_base64 ?? undefined},
        ]);
        scrollToBottom();
        return;
      }

      // Text-only path
      const queryText =
        initialQuery || (pharaohName ? `Tell me about ${pharaohName}` : '');
      if (!queryText) {return;}

      console.log('[Chat] Text-only query:', queryText, '| gender:', currentGender);
      setMessages([{role: 'user', text: queryText}]);

      const result = await sendTextQuery(queryText, undefined, currentGender);
      console.log('[Chat] Text query response:', {
        answer: result.answer?.substring(0, 100) + '...',
        hasAudio: !!result.audio_base64,
        audioBase64Length: result.audio_base64?.length,
        tts_provider: result.tts_provider,
        tts_model: result.tts_model,
        search_query: result.search_query,
        top_k: result.top_k,
      });

      setMessages(prev => [
        ...prev,
        {role: 'assistant', text: result.answer, audioBase64: result.audio_base64 ?? undefined},
      ]);
      scrollToBottom();
    } catch (err: unknown) {
      console.error('[Chat] processQuery error:', err);
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [voiceMode, audioFilePath, imageUri, initialQuery, pharaohName, currentGender]);

  useEffect(() => {
    processQuery();
  }, [processQuery]);

  // ── Send a follow-up text message ──────────────────────────
  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text && !pickedImage) { return; }

    Keyboard.dismiss();
    const userText = text || 'Describe this image';
    const userImageUri = pickedImage?.uri;

    setInputText('');
    setPickedImage(null);
    console.log('[Chat] Sending message with image URI:', userImageUri);
    setMessages(prev => [...prev, {role: 'user', text: userText, imageUri: userImageUri}]);
    setIsSending(true);
    scrollToBottom();

    try {
      let descriptions: string[] | undefined;
      if (userImageUri) {
        const descResult = await describeImages([userImageUri]);
        descriptions = descResult.descriptions;
      }

      console.log('[Chat] Follow-up send — text:', userText, '| hasImage:', !!userImageUri);
      const result = await sendTextQuery(userText, descriptions, currentGender);
      console.log('[Chat] Follow-up response:', {
        answerLength: result.answer?.length,
        hasAudio: !!result.audio_base64,
        audioBase64Length: result.audio_base64?.length,
        tts_provider: result.tts_provider,
        tts_model: result.tts_model,
      });
      setMessages(prev => [...prev, {role: 'assistant', text: result.answer, audioBase64: result.audio_base64 ?? undefined}]);
      scrollToBottom();
    } catch (err: unknown) {
      console.error('[Chat] Follow-up send error:', err);
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setMessages(prev => [...prev, {role: 'assistant', text: `Error: ${msg}`}]);
    } finally {
      setIsSending(false);
    }
  }, [inputText, pickedImage, currentGender]);

  // ── Voice recording ────────────────────────────────────────
  const handleMicPress = useCallback(async () => {
    if (isRecording) {
      try {
        setIsSending(true);
        const result = await stopRecording();
        setIsRecording(false);

        setMessages(prev => [...prev, {
          role: 'user',
          text: '🎤 Voice message',
          voiceFilePath: result.filePath,
          voiceDurationMs: result.durationMs,
        }]);
        scrollToBottom();

        const voiceResult = await sendVoiceQuery(result.filePath, {gender: currentGender});
        console.log('[Chat] Voice recording response:', {
          transcript: voiceResult.transcript,
          answerLength: voiceResult.answer?.length,
          hasAudio: !!voiceResult.audio_base64,
          audioBase64Length: voiceResult.audio_base64?.length,
          tts_provider: voiceResult.tts_provider,
          tts_model: voiceResult.tts_model,
        });
        setMessages(prev => {
          const updated = [...prev];
          const lastMsg = updated[updated.length - 1];
          updated[updated.length - 1] = {
            role: 'user',
            text: voiceResult.transcript || '🎤 Voice message',
            voiceFilePath: lastMsg.voiceFilePath,
            voiceDurationMs: lastMsg.voiceDurationMs,
          };
          return [
            ...updated,
            {role: 'assistant', text: voiceResult.answer, audioBase64: voiceResult.audio_base64},
          ];
        });
        scrollToBottom();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Recording failed';
        Alert.alert('Recording Error', msg);
      } finally {
        setIsSending(false);
      }
    } else {
      try {
        await startRecording();
        setIsRecording(true);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Could not start recording';
        Alert.alert('Microphone Error', msg);
      }
    }
  }, [isRecording, currentGender]);

  // ── Image picking ──────────────────────────────────────────
  const handleTakePhoto = useCallback(async () => {
    try {
      const image = await takePhoto();
      if (image) { setPickedImage(image); }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Camera error';
      Alert.alert('Camera Error', msg);
    }
  }, []);

  const handlePickGallery = useCallback(async () => {
    try {
      const image = await pickFromGallery();
      if (image) { setPickedImage(image); }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gallery error';
      Alert.alert('Gallery Error', msg);
    }
  }, []);

  const handleVoiceBubblePlayChange = useCallback((msgIndex: number, playing: boolean) => {
    if (playing) {
      // Stop any other playing message first
      if (playingIndex !== null && playingIndex !== msgIndex) {
        stopAudio();
      }
      setPlayingIndex(msgIndex);
    } else {
      if (playingIndex === msgIndex) {
        setPlayingIndex(null);
      }
    }
  }, [playingIndex]);

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

        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>

          {/* ── Messages ────────────────────────────────────── */}
          <ScrollView
            ref={scrollRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            keyboardShouldPersistTaps="handled">

            {/* Empty state placeholder */}
            {messages.length === 0 && !loading && !error && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>𓂀</Text>
                <Text style={styles.emptyTitle}>Ask the Scribe</Text>
                <Text style={styles.emptySubtitle}>
                  Type a question, send a photo, or use your voice to learn about Ancient Egypt
                </Text>
              </View>
            )}

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
                  resizeMode="cover"
                  onError={(e) => console.warn('[Chat] Image load error:', e.nativeEvent.error, 'URI:', msg.imageUri)}
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
              {(msg.voiceFilePath || msg.audioBase64) && (
                <VoiceMessageBubble
                  voiceFilePath={msg.voiceFilePath}
                  audioBase64={msg.audioBase64}
                  durationHintMs={msg.voiceDurationMs}
                  isGloballyPlaying={playingIndex === idx}
                  onPlayStateChange={(playing) => handleVoiceBubblePlayChange(idx, playing)}
                  role={msg.role}
                />
              )}
            </View>
          ))}

          {(loading || isSending) && (
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

        {/* ── Monuments Section ────────────────────────────── */}
        {monuments.length > 0 && (
          <View style={styles.monumentsSection}>
            <TouchableOpacity
              style={styles.monumentsHeader}
              activeOpacity={0.7}
              onPress={() => setMonumentsExpanded(prev => !prev)}>
              <Text style={styles.monumentsTitle}>🏛 Here I Changed the History</Text>
              {monumentsExpanded ? (
                <ChevronDown size={18} color={Colors.textWhite50} />
              ) : (
                <ChevronUp size={18} color={Colors.textWhite50} />
              )}
            </TouchableOpacity>
            {monumentsExpanded && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.monumentsScroll}>
                {monuments.map((m, i) => (
                  <View key={`monument-${i}`} style={styles.monumentCard}>
                    {m.image_url ? (
                      <Image
                        source={{uri: m.image_url}}
                        style={styles.monumentImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.monumentImage, styles.monumentImagePlaceholder]}>
                        <Text style={styles.monumentPlaceholderIcon}>🏛</Text>
                      </View>
                    )}
                    <View style={styles.monumentInfo}>
                      <Text style={styles.monumentName} numberOfLines={2}>{m.name}</Text>
                      {m.location_name ? (
                        <View style={styles.monumentLocation}>
                          <MapPin size={12} color={Colors.textWhite50} />
                          <Text style={styles.monumentLocationText} numberOfLines={1}>{m.location_name}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* ── Input Bar ───────────────────────────────────── */}
        <View style={styles.inputBar}>
          {/* Image preview */}
          {pickedImage && (
            <View style={styles.imagePreviewContainer}>
              <Image source={{uri: pickedImage.uri}} style={styles.imagePreview} />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => setPickedImage(null)}
                activeOpacity={0.7}>
                <Trash2 size={16} color={Colors.textWhite} />
              </TouchableOpacity>
            </View>
          )}

          {/* Text input row */}
          <View style={styles.inputRow}>
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              placeholder="Ask anything..."
              placeholderTextColor={Colors.textWhite40}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={handleSend}
              returnKeyType="send"
              multiline
              maxLength={500}
            />
          </View>

          {/* Action row */}
          <View style={styles.actionRow}>
            <View style={styles.actionLeft}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleTakePhoto}
                activeOpacity={0.7}>
                <Camera size={20} color={Colors.textWhite70} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handlePickGallery}
                activeOpacity={0.7}>
                <ImageIcon size={20} color={Colors.textWhite70} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, isRecording && styles.actionButtonActive]}
                onPress={handleMicPress}
                activeOpacity={0.7}>
                {isRecording ? (
                  <>
                    <Square size={16} color={Colors.terracotta} />
                    <Text style={[styles.actionButtonLabel, {color: Colors.terracotta}]}>
                      {formatTime(recordingTime)}
                    </Text>
                  </>
                ) : (
                  <Mic size={20} color={Colors.textWhite70} />
                )}
              </TouchableOpacity>
            </View>

            {isSending ? (
              <View style={styles.sendButton}>
                <ActivityIndicator size="small" color={Colors.backgroundDark} />
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  !(inputText.trim() || pickedImage) && styles.sendButtonDisabled,
                ]}
                onPress={handleSend}
                activeOpacity={0.8}
                disabled={!(inputText.trim() || pickedImage)}>
                <Send size={20} color={(inputText.trim() || pickedImage) ? Colors.backgroundDark : Colors.textWhite40} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        </KeyboardAvoidingView>
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
  keyboardView: {
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
    paddingBottom: Spacing.md,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  emptyIcon: {
    fontSize: 48,
    color: Colors.primary,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.textWhite,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textWhite50,
    textAlign: 'center',
    lineHeight: 20,
  },
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

  // ── Input Bar ─────────────────────────────────────────────
  inputBar: {
    backgroundColor: Colors.cardDark,
    borderTopWidth: 1,
    borderTopColor: Colors.textWhite10,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.textWhite,
    lineHeight: 22,
    maxHeight: 100,
    textAlignVertical: 'top',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.xs,
  },
  actionLeft: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.textWhite05,
    justifyContent: 'center',
  },
  actionButtonLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '500',
  },
  actionButtonActive: {
    backgroundColor: 'rgba(192, 57, 43, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(192, 57, 43, 0.3)',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.textWhite10,
  },

  // ── Monuments ─────────────────────────────────────────────
  monumentsSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.textWhite10,
    paddingVertical: Spacing.sm,
  },
  monumentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  monumentsTitle: {
    color: Colors.textWhite80,
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  monumentsScroll: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  monumentCard: {
    width: 140,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.cardDark,
    borderWidth: 1,
    borderColor: Colors.textWhite10,
    overflow: 'hidden',
  },
  monumentImage: {
    width: 140,
    height: 90,
  },
  monumentImagePlaceholder: {
    backgroundColor: Colors.textWhite05,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monumentPlaceholderIcon: {
    fontSize: 28,
  },
  monumentInfo: {
    padding: Spacing.sm,
  },
  monumentName: {
    color: Colors.textWhite90,
    fontSize: FontSizes.xs,
    fontWeight: '600',
    lineHeight: 16,
  },
  monumentLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  monumentLocationText: {
    color: Colors.textWhite50,
    fontSize: FontSizes.tiny,
  },

  // ── Image preview ─────────────────────────────────────────
  imagePreviewContainer: {
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: 120,
    borderRadius: BorderRadius.lg,
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
