import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
  Dimensions,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../App';
import {Colors, FontSizes, Spacing, BorderRadius} from '../constants/DesignTokens';
import {PHARAOHS, HOME_HERO_IMAGE, USER_AVATAR} from '../data/pharaohs';
import {PharaohCard} from '../components/PharaohCard';
import {SearchBar} from '../components/SearchBar';
import type {Pharaoh} from '../data/pharaohs';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

export function HomeScreen({navigation}: Props) {
  const handlePharaohPress = (pharaoh: Pharaoh) => {
    // Navigate to chat screen with selected pharaoh context
    // For now, navigate to AR as that's the existing route
    navigation.navigate('Chat', {pharaohName: pharaoh.name});
  };

  const handleTextSubmit = (text: string) => {
    navigation.navigate('Chat', {initialQuery: text});
  };

  const handleMicPress = () => {
    // TODO: Voice recording -> navigate to chat with voice
    navigation.navigate('Chat', {voiceMode: true});
  };

  const handleScanPress = () => {
    // TODO: Camera/scan integration
  };

  const handleViewAll = () => {
    // TODO: Navigate to full pharaohs list
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Background Image ─────────────────────────────────── */}
      <ImageBackground
        source={{uri: HOME_HERO_IMAGE}}
        style={styles.backgroundImage}
        resizeMode="cover">
        {/* Gradient overlay */}
        <View style={styles.gradientTop} />
        <View style={styles.gradientBottom} />
      </ImageBackground>

      {/* ── Content ──────────────────────────────────────────── */}
      <SafeAreaView style={styles.content} edges={['top', 'bottom']}>
        {/* ─ Header ──────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoIcon}>𓂀</Text>
            <Text style={styles.logoText}>PHARAOHS.AI</Text>
          </View>
          <TouchableOpacity style={styles.avatarButton} activeOpacity={0.7}>
            <Image source={{uri: USER_AVATAR}} style={styles.avatar} />
          </TouchableOpacity>
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

        {/* ─ Test AR Button ──────────────────────────────────── */}
        <TouchableOpacity
          style={styles.testArButton}
          activeOpacity={0.8}
          onPress={() =>
            navigation.navigate('AR', {
              characterId: 'statue_of_ramesses_iii',
              characterName: 'Ramses',
            })
          }>
          <Text style={styles.testArIcon}>𓁹</Text>
          <Text style={styles.testArText}>Test AR Experience</Text>
        </TouchableOpacity>

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
            {PHARAOHS.map(pharaoh => (
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
            onPressMic={handleMicPress}
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
  gradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.4,
    backgroundColor: Colors.overlayDark80,
  },
  gradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.5,
    backgroundColor: Colors.overlayDark95,
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
  avatarButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    backgroundColor: Colors.textWhite10,
    borderWidth: 1,
    borderColor: Colors.textWhite10,
  },
  avatar: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
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

  // ── Test AR Button ────────────────────────────────────────
  testArButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
    elevation: 4,
    shadowColor: Colors.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  testArIcon: {
    fontSize: 20,
    color: Colors.backgroundDark,
  },
  testArText: {
    fontSize: FontSizes.base,
    fontWeight: '700',
    color: Colors.backgroundDark,
    letterSpacing: 1,
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
    paddingBottom: Spacing.xxxl,
  },
});
