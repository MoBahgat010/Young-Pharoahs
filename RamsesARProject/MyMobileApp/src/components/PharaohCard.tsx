import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {Colors, FontSizes, BorderRadius, Spacing} from '../constants/DesignTokens';
import type {Pharaoh} from '../data/pharaohs';

const CARD_WIDTH = 128;
const CARD_ASPECT = 4 / 3; // height / width (3:4 aspect in CSS = taller)
const CARD_HEIGHT = CARD_WIDTH * CARD_ASPECT;

interface PharaohCardProps {
  pharaoh: Pharaoh;
  onPress: (pharaoh: Pharaoh) => void;
}

export function PharaohCard({pharaoh, onPress}: PharaohCardProps) {
  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.8}
      onPress={() => onPress(pharaoh)}>
      {/* Background Image */}
      <Image source={{uri: pharaoh.imageUrl}} style={styles.image} />

      {/* Gradient overlay */}
      <View style={styles.gradientOverlay} />

      {/* Label */}
      <View style={styles.labelContainer}>
        <Text style={styles.dynasty}>{pharaoh.dynasty}</Text>
        <Text style={styles.name}>{pharaoh.name}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: BorderRadius.lg + 4, // rounded-xl ~16px
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.textWhite10,
    marginRight: Spacing.lg,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    // Simulating gradient-to-t from-black/80 via-transparent to-transparent
    // React Native doesn't support CSS gradients natively;
    // we use a semi-transparent black overlay weighted to the bottom
    backgroundColor: 'transparent',
    // We'll layer two views in the actual screen if needed,
    // for now a simple dark bottom overlay
    borderBottomWidth: 0,
  },
  labelContainer: {
    position: 'absolute',
    bottom: Spacing.md,
    left: Spacing.md,
    right: Spacing.sm,
  },
  dynasty: {
    fontSize: FontSizes.xs,
    color: Colors.primary,
    fontWeight: '500',
    marginBottom: 2,
  },
  name: {
    fontSize: FontSizes.sm,
    color: Colors.textWhite,
    fontWeight: '700',
  },
});
