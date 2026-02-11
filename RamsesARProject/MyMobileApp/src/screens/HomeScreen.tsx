import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
  Dimensions,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {CompositeScreenProps} from '@react-navigation/native';
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList, TabParamList} from '../../App';
import {Colors, FontSizes, Spacing, BorderRadius} from '../constants/DesignTokens';
import {PHARAOHS, HOME_HERO_IMAGE} from '../data/pharaohs';
import {PharaohCard} from '../components/PharaohCard';
import {SearchBar} from '../components/SearchBar';
import type {Pharaoh} from '../data/pharaohs';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'HomeTab'>,
  NativeStackScreenProps<RootStackParamList>
>;

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

export function HomeScreen({navigation}: Props) {
  const handlePharaohPress = (pharaoh: Pharaoh) => {
    // Navigate to chat screen with selected pharaoh context
    // For now, navigate to AR as that's the existing route
    navigation.navigate('Chat', {pharaohName: pharaoh.name, gender: pharaoh.gender});
  };

  const handleTextSubmit = (text: string, imageUri?: string) => {
    navigation.navigate('Chat', {initialQuery: text, imageUri});
  };

  const handleVoiceSubmit = (audioFilePath: string) => {
    navigation.navigate('Chat', {voiceMode: true, audioFilePath});
  };

  const handleScanPress = () => {
    // TODO: Camera/scan integration
  };

  const handleViewAll = () => {
    navigation.navigate('MainTabs', {screen: 'KingsTab'});
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Background Image ─────────────────────────────────── */}
      <ImageBackground
        source={{uri: HOME_HERO_IMAGE}}
        style={styles.backgroundImage}
        resizeMode="cover">
      </ImageBackground>

      {/* ── Content ──────────────────────────────────────────── */}
      <SafeAreaView style={styles.content} edges={['top', 'bottom']}>
        {/* ─ Header ──────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoIcon}>𓂀</Text>
            <Text style={styles.logoText}>PHARAOHS.AI</Text>
          </View>
        </View>

        {/* ─ Spacer (pushes content to bottom) ───────────────── */}
        <View style={styles.spacer} />

        {/* ─ Royal Archives Title ─────────────────────────────── */}
        <View style={styles.titleSection}>
          <Text style={styles.royalLabel}>ROYAL ARCHIVES</Text>
          <Text style={styles.mainTitle}>
            Meet the{' '}
            <Text style={styles.mainTitleHighlight}>Greatest Rulers</Text>
          </Text>
        </View>

        {/* ─ Pharaoh Carousel ─────────────────────────────────── */}
        <View style={styles.carouselSection}>
          <View style={styles.carouselHeader}>
            <Text style={styles.carouselTitle}>Select a Pharaoh</Text>
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={handleViewAll}
              activeOpacity={0.7}>
              <Text style={styles.viewAllText}>VIEW ALL</Text>
              <Text style={styles.viewAllArrow}>→</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carouselScroll}
            snapToInterval={128 + Spacing.lg}
            decelerationRate="fast">
            {PHARAOHS.slice(0, 4).map(pharaoh => (
              <PharaohCard
                key={pharaoh.id}
                pharaoh={pharaoh}
                onPress={handlePharaohPress}
              />
            ))}
          </ScrollView>
        </View>

        {/* ─ Search Bar ──────────────────────────────────────── */}
        <View style={styles.searchBarContainer}>
          <SearchBar
            onSubmitText={handleTextSubmit}
            onSubmitVoice={handleVoiceSubmit}
            onPressScan={handleScanPress}
          />
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

  // ── Background ────────────────────────────────────────────
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    transform: [{scale: 1.05}],
  },

  // ── Content Layout ────────────────────────────────────────
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl + 4,
    justifyContent: 'space-between',
  },

  // ── Header ────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  logoIcon: {
    fontSize: 28,
    color: Colors.primary,
  },
  logoText: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    letterSpacing: 3,
    color: Colors.textWhite90,
  },

  // ── Spacer ────────────────────────────────────────────────
  spacer: {
    flex: 1,
  },

  // ── Title Section ─────────────────────────────────────────
  titleSection: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },
  royalLabel: {
    fontSize: FontSizes.xs,
    color: Colors.primaryDim,
    letterSpacing: 6,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
  },
  mainTitle: {
    fontSize: FontSizes['3xl'],
    fontWeight: '300',
    color: Colors.textWhite,
    textAlign: 'center',
    lineHeight: 38,
  },
  mainTitleHighlight: {
    fontWeight: '700',
    color: Colors.primary,
  },

  // ── Carousel ──────────────────────────────────────────────
  carouselSection: {
    marginBottom: Spacing.xl + 4,
  },
  carouselHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
    paddingHorizontal: 2,
  },
  carouselTitle: {
    fontSize: FontSizes.sm,
    color: Colors.textWhite80,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: FontSizes.xs,
    color: Colors.primary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  viewAllArrow: {
    fontSize: FontSizes.base,
    color: Colors.primary,
  },
  carouselScroll: {
    paddingBottom: Spacing.sm,
  },

  // ── Search Bar ────────────────────────────────────────────
  searchBarContainer: {
    paddingBottom: Spacing.md,
  },
});
