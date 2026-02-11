import React from 'react';
import {View, Text, StyleSheet, StatusBar, TouchableOpacity} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../App';
import {Colors, FontSizes, Spacing} from '../constants/DesignTokens';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

/**
 * Placeholder ChatScreen — will be fully built when the user
 * provides the Chat screen HTML from Google Stitch.
 */
export function ChatScreen({navigation, route}: Props) {
  const {pharaohName, initialQuery, voiceMode} = route.params ?? {};

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <SafeAreaView style={styles.inner} edges={['top', 'bottom']}>
        {/* Temp back button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.center}>
          <Text style={styles.title}>The Scribe</Text>
          <Text style={styles.subtitle}>Chat interface coming soon</Text>
          {pharaohName && (
            <Text style={styles.context}>Pharaoh: {pharaohName}</Text>
          )}
          {initialQuery && (
            <Text style={styles.context}>Query: {initialQuery}</Text>
          )}
          {voiceMode && (
            <Text style={styles.context}>Voice mode activated</Text>
          )}
        </View>
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
    padding: Spacing.xl,
  },
  backButton: {
    paddingVertical: Spacing.sm,
  },
  backText: {
    color: Colors.primary,
    fontSize: FontSizes.base,
    fontWeight: '600',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: Colors.primary,
    fontSize: FontSizes['3xl'],
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    color: Colors.textWhite50,
    fontSize: FontSizes.base,
    marginBottom: Spacing.xl,
  },
  context: {
    color: Colors.textWhite80,
    fontSize: FontSizes.sm,
    marginBottom: Spacing.sm,
  },
});
