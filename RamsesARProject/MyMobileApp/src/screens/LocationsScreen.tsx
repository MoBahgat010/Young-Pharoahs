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
import {Colors, FontSizes, Spacing, BorderRadius} from '../constants/DesignTokens';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

interface Location {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  region: string;
}

const LOCATIONS: Location[] = [
  {
    id: 'valley-of-kings',
    name: 'Valley of the Kings',
    description: 'Royal burial ground for pharaohs of the New Kingdom',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Valley_of_the_Kings_panorama.jpg/1280px-Valley_of_the_Kings_panorama.jpg',
    region: 'Luxor',
  },
  {
    id: 'karnak-temple',
    name: 'Karnak Temple',
    description: 'Largest ancient religious site in the world',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Karnak_temple.jpg/1280px-Karnak_temple.jpg',
    region: 'Luxor',
  },
  {
    id: 'abu-simbel',
    name: 'Abu Simbel',
    description: 'Massive rock temples built by Ramses II',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Abu_Simbel%2C_Ramesses_Temple%2C_front%2C_Egypt%2C_Oct_2004.jpg/1280px-Abu_Simbel%2C_Ramesses_Temple%2C_front%2C_Egypt%2C_Oct_2004.jpg',
    region: 'Aswan',
  },
  {
    id: 'pyramids-giza',
    name: 'Pyramids of Giza',
    description: 'The last surviving wonder of the ancient world',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Kheops-Pyramid.jpg/1280px-Kheops-Pyramid.jpg',
    region: 'Cairo',
  },
  {
    id: 'hatshepsut-temple',
    name: 'Temple of Hatshepsut',
    description: 'Mortuary temple of the female pharaoh Hatshepsut',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/SFEC_AEH_-ThebesNecworkers-2010-RamsssII-031.jpg/1280px-SFEC_AEH_-ThebesNecworkers-2010-RamsssII-031.jpg',
    region: 'Luxor',
  },
  {
    id: 'sphinx',
    name: 'Great Sphinx',
    description: 'Limestone statue with a lion body and human head',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Great_Sphinx_of_Giza_-_20080716a.jpg/1280px-Great_Sphinx_of_Giza_-_20080716a.jpg',
    region: 'Cairo',
  },
];

export function LocationsScreen() {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerIcon}>𓊖</Text>
          <Text style={styles.headerTitle}>Locations</Text>
          <Text style={styles.headerSubtitle}>
            Discover the sacred sites of Egypt
          </Text>
        </View>

        {/* Locations List */}
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}>
          {LOCATIONS.map(location => (
            <TouchableOpacity
              key={location.id}
              style={styles.card}
              activeOpacity={0.85}>
              <Image source={{uri: location.imageUrl}} style={styles.cardImage} />
              <View style={styles.cardOverlay} />
              <View style={styles.cardContent}>
                <View style={styles.regionBadge}>
                  <Text style={styles.regionText}>{location.region}</Text>
                </View>
                <Text style={styles.cardName}>{location.name}</Text>
                <Text style={styles.cardDescription}>{location.description}</Text>
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
  list: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxxl + 80,
    gap: Spacing.lg,
  },
  card: {
    width: '100%',
    height: 200,
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
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  cardContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
  },
  regionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primarySubtle,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xs,
  },
  regionText: {
    fontSize: FontSizes.tiny,
    color: Colors.primary,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  cardName: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.textWhite,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: FontSizes.xs,
    color: Colors.textWhite70,
    lineHeight: 18,
  },
});
