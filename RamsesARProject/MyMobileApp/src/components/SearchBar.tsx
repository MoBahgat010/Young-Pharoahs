import React, {useState} from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Text,
} from 'react-native';
import {Colors, BorderRadius, Spacing} from '../constants/DesignTokens';

interface SearchBarProps {
  onSubmitText: (text: string) => void;
  onPressMic: () => void;
  onPressScan: () => void;
}

export function SearchBar({onSubmitText, onPressMic, onPressScan}: SearchBarProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = () => {
    const trimmed = query.trim();
    if (trimmed) {
      onSubmitText(trimmed);
      setQuery('');
    }
  };

  return (
    <View style={styles.wrapper}>
      {/* Outer glow effect */}
      <View style={styles.glowOuter} />

      {/* Main bar */}
      <View style={styles.bar}>
        {/* Scan / Camera button */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onPressScan}
          activeOpacity={0.7}>
          <Text style={styles.iconText}>⊚</Text>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Text input */}
        <TextInput
          style={styles.input}
          placeholder="Ask about a ruler..."
          placeholderTextColor={Colors.textWhite50}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSubmit}
          returnKeyType="search"
        />

        {/* Mic button */}
        <TouchableOpacity
          style={styles.micButton}
          onPress={onPressMic}
          activeOpacity={0.8}>
          <Text style={styles.micIcon}>🎤</Text>
        </TouchableOpacity>
      </View>

      {/* Hint text */}
      <View style={styles.hintContainer}>
        <Text style={styles.hintText}>TYPE, SCAN, OR SPEAK</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    // Shadow
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
  iconText: {
    fontSize: 24,
    color: Colors.textWhite70,
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.textWhite10,
    marginHorizontal: 4,
  },
  input: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    color: Colors.textWhite,
    fontSize: 16,
  },
  micButton: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    // Gold shadow
    shadowColor: Colors.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  micIcon: {
    fontSize: 20,
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
});
