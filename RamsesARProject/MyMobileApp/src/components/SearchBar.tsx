import React, {useState, useRef, useEffect, useCallback} from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Text,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Keyboard,
  StatusBar,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {ScanLine, Mic, X, Send, Search, Sparkles, Camera, ImageIcon, Square, Trash2} from 'lucide-react-native';
import {Colors, BorderRadius, Spacing, FontSizes} from '../constants/DesignTokens';
import {startRecording, stopRecording} from '../services/voiceService';
import {takePhoto, pickFromGallery, type PickedImage} from '../services/imageService';

interface SearchBarProps {
  onSubmitText: (text: string, imageUri?: string) => void;
  onSubmitVoice: (audioFilePath: string) => void;
  onPressScan: () => void;
}

export function SearchBar({onSubmitText, onSubmitVoice, onPressScan}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [pickedImage, setPickedImage] = useState<PickedImage | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  useEffect(() => {
    if (expanded) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
      ]).start(() => {
        inputRef.current?.focus();
      });
    }
  }, [expanded, fadeAnim, slideAnim]);

  // ── Recording timer ───────────────────────────────────────
  useEffect(() => {
    if (isRecording) {
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleClose = () => {
    Keyboard.dismiss();
    setPickedImage(null);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 40,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setExpanded(false);
    });
  };

  const handleSubmit = () => {
    const trimmed = query.trim();
    if (trimmed || pickedImage) {
      onSubmitText(trimmed || 'Describe this image', pickedImage?.uri);
      setQuery('');
      setPickedImage(null);
      handleClose();
    }
  };

  // ── Voice recording ───────────────────────────────────────
  const handleMicPress = useCallback(async () => {
    if (isRecording) {
      // Stop recording
      try {
        setIsProcessing(true);
        const result = await stopRecording();
        setIsRecording(false);
        handleClose();
        onSubmitVoice(result.filePath);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Recording failed';
        Alert.alert('Recording Error', msg);
      } finally {
        setIsProcessing(false);
      }
    } else {
      // Start recording
      try {
        await startRecording();
        setIsRecording(true);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Could not start recording';
        if (msg.includes('permission')) {
          Alert.alert(
            'Microphone Permission Required',
            'Please grant microphone access in your device Settings to use voice input.',
          );
        } else {
          Alert.alert('Microphone Error', msg);
        }
      }
    }
  }, [isRecording, onSubmitVoice]);

  // ── Image picking ─────────────────────────────────────────
  const handleTakePhoto = useCallback(async () => {
    try {
      const image = await takePhoto();
      if (image) {
        setPickedImage(image);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Camera error';
      Alert.alert('Camera Error', msg);
    }
  }, []);

  const handlePickGallery = useCallback(async () => {
    try {
      const image = await pickFromGallery();
      if (image) {
        setPickedImage(image);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gallery error';
      Alert.alert('Gallery Error', msg);
    }
  }, []);

  const handleScanAction = useCallback(() => {
    Alert.alert(
      'Add Image',
      'Choose how to add an image of a pharaoh or artifact',
      [
        {text: 'Take Photo', onPress: handleTakePhoto},
        {text: 'Choose from Gallery', onPress: handlePickGallery},
        {text: 'Cancel', style: 'cancel'},
      ],
    );
  }, [handleTakePhoto, handlePickGallery]);

  return (
    <>
      {/* ── Collapsed trigger bar ───────────────────────────── */}
      <View style={styles.wrapper}>
        <View style={styles.glowOuter} />
        <TouchableOpacity
          style={styles.bar}
          activeOpacity={0.85}
          onPress={() => setExpanded(true)}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={(e) => {
              e.stopPropagation();
              handleScanAction();
            }}
            activeOpacity={0.7}>
            <ScanLine size={24} color={Colors.textWhite70} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <View style={styles.fakePlaceholder}>
            {isRecording ? (
              <View style={styles.recordingIndicator}>
                <Animated.View style={[styles.recordingDot, {transform: [{scale: pulseAnim}]}]} />
                <Text style={styles.recordingText}>Recording {formatTime(recordingTime)}</Text>
              </View>
            ) : (
              <Text style={styles.fakePlaceholderText}>Ask about a ruler...</Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.micButton, isRecording && styles.micButtonRecording]}
            onPress={(e) => {
              e.stopPropagation();
              handleMicPress();
            }}
            activeOpacity={0.8}>
            {isRecording ? (
              <Square size={18} color={Colors.textWhite} />
            ) : (
              <Mic size={22} color={Colors.backgroundDark} />
            )}
          </TouchableOpacity>
        </TouchableOpacity>

        <View style={styles.hintContainer}>
          <Text style={styles.hintText}>TYPE, SCAN, OR SPEAK</Text>
        </View>
      </View>

      {/* ── Full-screen input overlay ───────────────────────── */}
      <Modal
        visible={expanded}
        animationType="none"
        transparent
        statusBarTranslucent
        onRequestClose={handleClose}>
        <Animated.View style={[styles.overlay, {opacity: fadeAnim}]}>
          <StatusBar barStyle="light-content" />
          <SafeAreaView style={styles.overlayContent} edges={['top', 'bottom']}>
            <KeyboardAvoidingView
              style={styles.keyboardView}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={0}>
              {/* ── Top bar ──────────────────────────────────── */}
              <Animated.View
                style={[
                  styles.overlayHeader,
                  {transform: [{translateY: slideAnim}], opacity: fadeAnim},
                ]}>
                <TouchableOpacity
                  onPress={handleClose}
                  style={styles.closeButton}
                  activeOpacity={0.7}>
                  <X size={24} color={Colors.textWhite80} />
                </TouchableOpacity>
                <View style={styles.overlayTitleContainer}>
                  <Sparkles size={16} color={Colors.primary} />
                  <Text style={styles.overlayTitle}>Ask the Archives</Text>
                </View>
                <View style={styles.closeButton} />
              </Animated.View>

              {/* ── Input area ───────────────────────────────── */}
              <Animated.View
                style={[
                  styles.inputArea,
                  {transform: [{translateY: slideAnim}], opacity: fadeAnim},
                ]}>
                {/* ── Picked image preview ───────────────────── */}
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

                <View style={styles.expandedInputRow}>
                  <Search size={20} color={Colors.textWhite40} style={styles.searchIcon} />
                  <TextInput
                    ref={inputRef}
                    style={styles.expandedInput}
                    placeholder="Ask anything about ancient Egypt..."
                    placeholderTextColor={Colors.textWhite40}
                    value={query}
                    onChangeText={setQuery}
                    onSubmitEditing={handleSubmit}
                    returnKeyType="search"
                    multiline
                    maxLength={500}
                    autoFocus
                  />
                </View>

                {/* ── Action row ─────────────────────────────── */}
                <View style={styles.actionRow}>
                  <View style={styles.actionLeft}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={handleTakePhoto}
                      activeOpacity={0.7}>
                      <Camera size={20} color={Colors.textWhite70} />
                      <Text style={styles.actionButtonText}>Camera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={handlePickGallery}
                      activeOpacity={0.7}>
                      <ImageIcon size={20} color={Colors.textWhite70} />
                      <Text style={styles.actionButtonText}>Gallery</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, isRecording && styles.actionButtonActive]}
                      onPress={handleMicPress}
                      activeOpacity={0.7}>
                      {isRecording ? (
                        <>
                          <Square size={16} color={Colors.terracotta} />
                          <Text style={[styles.actionButtonText, {color: Colors.terracotta}]}>
                            {formatTime(recordingTime)}
                          </Text>
                        </>
                      ) : (
                        <>
                          <Mic size={20} color={Colors.textWhite70} />
                          <Text style={styles.actionButtonText}>Voice</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>

                  {isProcessing ? (
                    <View style={styles.sendButton}>
                      <ActivityIndicator size="small" color={Colors.backgroundDark} />
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.sendButton,
                        !(query.trim() || pickedImage) && styles.sendButtonDisabled,
                      ]}
                      onPress={handleSubmit}
                      activeOpacity={0.8}
                      disabled={!(query.trim() || pickedImage)}>
                      <Send size={20} color={(query.trim() || pickedImage) ? Colors.backgroundDark : Colors.textWhite40} />
                    </TouchableOpacity>
                  )}
                </View>
              </Animated.View>

            </KeyboardAvoidingView>
          </SafeAreaView>
        </Animated.View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // ── Collapsed bar ───────────────────────────────────────────
  wrapper: {
    width: '100%',
    position: 'relative',
  },
  glowOuter: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primarySubtle,
    opacity: 0.5,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardDark,
    borderRadius: BorderRadius.full,
    height: 64,
    paddingHorizontal: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.textWhite10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.textWhite10,
    marginHorizontal: 4,
  },
  fakePlaceholder: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
  },
  fakePlaceholderText: {
    color: Colors.textWhite50,
    fontSize: 16,
  },
  micButton: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  hintContainer: {
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  hintText: {
    fontSize: 10,
    color: Colors.textWhite40,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },

  // ── Expanded overlay ────────────────────────────────────────
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 8, 4, 0.97)',
  },
  overlayContent: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  overlayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  overlayTitle: {
    fontSize: FontSizes.base,
    fontWeight: '600',
    color: Colors.primary,
    letterSpacing: 1,
  },

  // ── Input area ──────────────────────────────────────────────
  inputArea: {
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.cardDark,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.textWhite10,
    overflow: 'hidden',
  },
  expandedInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  searchIcon: {
    marginTop: 4,
    marginRight: Spacing.sm,
  },
  expandedInput: {
    flex: 1,
    fontSize: 18,
    color: Colors.textWhite,
    lineHeight: 26,
    maxHeight: 130,
    textAlignVertical: 'top',
    paddingTop: 0,
    paddingBottom: 0,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    paddingTop: Spacing.xs,
  },
  actionLeft: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.textWhite05,
  },
  actionButtonText: {
    fontSize: FontSizes.xs,
    color: Colors.textWhite70,
    fontWeight: '500',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.textWhite10,
    shadowOpacity: 0,
    elevation: 0,
  },

  // ── Recording state ─────────────────────────────────────────
  micButtonRecording: {
    backgroundColor: Colors.terracotta,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.terracotta,
  },
  recordingText: {
    color: Colors.terracotta,
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtonActive: {
    backgroundColor: 'rgba(192, 57, 43, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(192, 57, 43, 0.3)',
  },

  // ── Image preview ───────────────────────────────────────────
  imagePreviewContainer: {
    margin: Spacing.md,
    marginBottom: 0,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: 160,
    borderRadius: BorderRadius.lg,
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },

});
