import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Linking,
  Dimensions,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {ArrowLeft, MapPin, Navigation, Star, Utensils, Building2} from 'lucide-react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../App';
import {Colors, FontSizes, Spacing, BorderRadius} from '../constants/DesignTokens';
import {fetchMonumentNearby} from '../services/apiService';
import type {MonumentNearbyResponse} from '../services/apiService';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'MonumentDetails'>;

export function MonumentDetailsScreen({navigation, route}: Props) {
  const {kingName, monument} = route.params;
  const [nearby, setNearby] = useState<MonumentNearbyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'restaurants' | 'hotels'>('restaurants');

  useEffect(() => {
    setLoading(true);
    fetchMonumentNearby(kingName, monument.name)
      .then(data => {
        setNearby(data);
        setError(null);
      })
      .catch(err => {
        console.warn('[MonumentDetails] nearby fetch failed:', err);
        setError('Failed to load nearby places');
      })
      .finally(() => setLoading(false));
  }, [kingName, monument.name]);

  const openLink = (url: string) => {
    if (url) {
      Linking.openURL(url).catch(() => {});
    }
  };

  const renderStars = (rating: number | null) => {
    if (rating === null) {return null;}
    return (
      <View style={styles.ratingRow}>
        <Star size={12} color={Colors.primary} fill={Colors.primary} />
        <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
      </View>
    );
  };

  const places = activeTab === 'restaurants' ? nearby?.restaurants : nearby?.hotels;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Hero image */}
      <View style={styles.hero}>
        {monument.image_url ? (
          <Image
            source={{uri: monument.image_url}}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.heroPlaceholder]}>
            <Text style={styles.heroPlaceholderIcon}>🏛</Text>
          </View>
        )}
        <View style={styles.heroOverlay} />

        {/* Back button */}
        <SafeAreaView style={styles.heroNav} edges={['top']}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}>
            <ArrowLeft size={22} color={Colors.textWhite} />
          </TouchableOpacity>
        </SafeAreaView>

        {/* Hero content */}
        <View style={styles.heroContent}>
          <View style={styles.kingBadge}>
            <Text style={styles.kingBadgeText}>{kingName}</Text>
          </View>
          <Text style={styles.heroTitle}>{monument.name}</Text>
          {monument.location_name ? (
            <View style={styles.heroLocationRow}>
              <MapPin size={14} color={Colors.primary} />
              <Text style={styles.heroLocationText}>
                {monument.certain_location || monument.location_name}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        showsVerticalScrollIndicator={false}>

        {/* Details */}
        {monument.details ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.detailsText}>{monument.details}</Text>
          </View>
        ) : null}

        {/* Action buttons */}
        <View style={styles.actionRow}>
          {monument.location_url ? (
            <TouchableOpacity
              style={styles.actionBtn}
              activeOpacity={0.7}
              onPress={() => openLink(monument.location_url)}>
              <MapPin size={18} color={Colors.textWhite} />
              <Text style={styles.actionText}>Open in Maps</Text>
            </TouchableOpacity>
          ) : null}
          {(nearby?.uber_link || monument.uber_link) ? (
            <TouchableOpacity
              style={[styles.actionBtn, styles.uberBtn]}
              activeOpacity={0.7}
              onPress={() => openLink(nearby?.uber_link || monument.uber_link!)}>
              <Navigation size={18} color={Colors.textWhite} />
              <Text style={styles.actionText}>Uber</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Location image */}
        {monument.location_image_url ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location View</Text>
            <Image
              source={{uri: monument.location_image_url}}
              style={styles.locationImage}
              resizeMode="cover"
            />
          </View>
        ) : null}

        {/* Nearby Places */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nearby Places</Text>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Finding nearby places...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => {
                  setLoading(true);
                  fetchMonumentNearby(kingName, monument.name)
                    .then(data => { setNearby(data); setError(null); })
                    .catch(() => setError('Failed to load nearby places'))
                    .finally(() => setLoading(false));
                }}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Tabs */}
              <View style={styles.tabRow}>
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'restaurants' && styles.tabActive]}
                  onPress={() => setActiveTab('restaurants')}
                  activeOpacity={0.7}>
                  <Utensils size={16} color={activeTab === 'restaurants' ? Colors.primary : Colors.textWhite50} />
                  <Text style={[styles.tabText, activeTab === 'restaurants' && styles.tabTextActive]}>
                    Restaurants ({nearby?.restaurants?.length ?? 0})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'hotels' && styles.tabActive]}
                  onPress={() => setActiveTab('hotels')}
                  activeOpacity={0.7}>
                  <Building2 size={16} color={activeTab === 'hotels' ? Colors.primary : Colors.textWhite50} />
                  <Text style={[styles.tabText, activeTab === 'hotels' && styles.tabTextActive]}>
                    Hotels ({nearby?.hotels?.length ?? 0})
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Place cards */}
              {places && places.length > 0 ? (
                places.map((place, idx) => (
                  <TouchableOpacity
                    key={place.place_id || idx}
                    style={styles.placeCard}
                    activeOpacity={0.7}
                    onPress={() => {
                      const url = `https://www.google.com/maps/search/?api=1&query=${place.location.lat},${place.location.lng}&query_place_id=${place.place_id}`;
                      openLink(url);
                    }}>
                    <View style={styles.placeHeader}>
                      <Text style={styles.placeName} numberOfLines={2}>{place.name}</Text>
                      {renderStars(place.rating)}
                    </View>
                    <Text style={styles.placeAddress} numberOfLines={2}>{place.address}</Text>
                    <View style={styles.placeFooter}>
                      {place.total_ratings ? (
                        <Text style={styles.placeRatingCount}>
                          {place.total_ratings} reviews
                        </Text>
                      ) : null}
                      {place.open_now !== null && (
                        <View style={[styles.openBadge, place.open_now ? styles.openBadgeOpen : styles.openBadgeClosed]}>
                          <Text style={[styles.openText, place.open_now ? styles.openTextOpen : styles.openTextClosed]}>
                            {place.open_now ? 'Open' : 'Closed'}
                          </Text>
                        </View>
                      )}
                      <View style={styles.placeMapLink}>
                        <MapPin size={12} color={Colors.primary} />
                        <Text style={styles.placeMapText}>View on map</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.emptyText}>No places found</Text>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const HERO_HEIGHT = 300;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundDark,
  },

  // ── Hero ──────────────────────────────────────────────────
  hero: {
    height: HERO_HEIGHT,
    width: '100%',
  },
  heroPlaceholder: {
    backgroundColor: Colors.cardDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPlaceholderIcon: {
    fontSize: 60,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  heroNav: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.lg,
    marginTop: Spacing.sm,
  },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.xl,
  },
  kingBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primarySubtle,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xs,
  },
  kingBadgeText: {
    fontSize: FontSizes.tiny,
    color: Colors.primary,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: FontSizes['2xl'],
    fontWeight: '700',
    color: Colors.textWhite,
    marginBottom: Spacing.xs,
  },
  heroLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroLocationText: {
    fontSize: FontSizes.sm,
    color: Colors.textWhite70,
  },

  // ── Content ───────────────────────────────────────────────
  content: {
    flex: 1,
  },
  contentInner: {
    padding: Spacing.xl,
    paddingBottom: Spacing.xxxl + 40,
  },
  section: {
    marginBottom: Spacing.xxl,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.textWhite,
    marginBottom: Spacing.md,
  },
  detailsText: {
    fontSize: FontSizes.sm,
    color: Colors.textWhite70,
    lineHeight: 22,
  },

  // ── Actions ───────────────────────────────────────────────
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  uberBtn: {
    backgroundColor: '#000',
  },
  actionText: {
    fontSize: FontSizes.sm,
    color: Colors.textWhite,
    fontWeight: '600',
  },

  // ── Location image ────────────────────────────────────────
  locationImage: {
    width: '100%',
    height: 180,
    borderRadius: BorderRadius.xl,
  },

  // ── Nearby tabs ───────────────────────────────────────────
  tabRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.textWhite10,
    backgroundColor: 'transparent',
  },
  tabActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySubtle,
  },
  tabText: {
    fontSize: FontSizes.xs,
    color: Colors.textWhite50,
    fontWeight: '600',
  },
  tabTextActive: {
    color: Colors.primary,
  },

  // ── Place cards ───────────────────────────────────────────
  placeCard: {
    backgroundColor: Colors.cardDark,
    borderWidth: 1,
    borderColor: Colors.textWhite10,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  placeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  placeName: {
    fontSize: FontSizes.base,
    fontWeight: '600',
    color: Colors.textWhite,
    flex: 1,
    marginRight: Spacing.sm,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: FontSizes.xs,
    color: Colors.primary,
    fontWeight: '700',
  },
  placeAddress: {
    fontSize: FontSizes.xs,
    color: Colors.textWhite50,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  placeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  placeRatingCount: {
    fontSize: FontSizes.tiny,
    color: Colors.textWhite40,
  },
  openBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  openBadgeOpen: {
    backgroundColor: 'rgba(46, 204, 113, 0.15)',
  },
  openBadgeClosed: {
    backgroundColor: 'rgba(192, 57, 43, 0.15)',
  },
  openText: {
    fontSize: FontSizes.tiny,
    fontWeight: '600',
  },
  openTextOpen: {
    color: Colors.emerald,
  },
  openTextClosed: {
    color: Colors.terracotta,
  },
  placeMapLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginLeft: 'auto',
  },
  placeMapText: {
    fontSize: FontSizes.tiny,
    color: Colors.primary,
    fontWeight: '600',
  },

  // ── States ────────────────────────────────────────────────
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: FontSizes.sm,
    color: Colors.textWhite50,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.md,
  },
  errorText: {
    fontSize: FontSizes.sm,
    color: Colors.textWhite50,
  },
  retryBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  retryText: {
    color: Colors.textWhite,
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  emptyText: {
    color: Colors.textWhite50,
    fontSize: FontSizes.sm,
    textAlign: 'center',
    paddingVertical: Spacing.xxl,
  },
});
