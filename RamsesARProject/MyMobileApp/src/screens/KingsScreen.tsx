import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {CompositeScreenProps} from '@react-navigation/native';
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList, TabParamList} from '../../App';
import {Colors, FontSizes, Spacing, BorderRadius} from '../constants/DesignTokens';
import {PHARAOHS} from '../data/pharaohs';
import type {Pharaoh} from '../data/pharaohs';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - Spacing.xl * 2 - Spacing.lg) / 2;

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'KingsTab'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function KingsScreen({navigation}: Props) {
  const handlePharaohPress = (pharaoh: Pharaoh) => {
    navigation.navigate('Chat', {pharaohName: pharaoh.name, gender: pharaoh.gender});
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerIcon}>𓁹</Text>
          <Text style={styles.headerTitle}>Kings & Queens</Text>
          <Text style={styles.headerSubtitle}>
            Explore the rulers of Ancient Egypt
          </Text>
        </View>

        {/* Kings Grid */}
        <ScrollView
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}>
          {PHARAOHS.map(pharaoh => (
            <TouchableOpacity
              key={pharaoh.id}
              style={styles.card}
              activeOpacity={0.8}
              onPress={() => handlePharaohPress(pharaoh)}>
              <Image source={pharaoh.localImage ?? {uri: pharaoh.imageUrl}} style={styles.cardImage} />
              <View style={styles.cardOverlay} />
              <View style={styles.cardContent}>
                <Text style={styles.cardName}>{pharaoh.name}</Text>
              </View>
            </TouchableOpacity>
          ))}
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
  safeArea: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
  },
  headerIcon: {
    fontSize: 36,
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSizes['3xl'],
    fontWeight: '700',
    color: Colors.textWhite,
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  headerSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textWhite50,
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
    paddingBottom: Spacing.xxxl + 80,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.4,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    backgroundColor: Colors.cardDark,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  cardContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.md,
  },
  cardName: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.textWhite,
    marginBottom: 2,
  },

});
