import React, {useEffect, useState, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  Linking,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {MapPin, Navigation} from 'lucide-react-native';
import {Colors, FontSizes, Spacing, BorderRadius} from '../constants/DesignTokens';
import {searchPharaohsMonuments} from '../services/apiService';
import type {Monument} from '../services/apiService';
import {PHARAOHS} from '../data/pharaohs';
import type {RootStackParamList} from '../../App';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

/** Flattened item: one monument with its king name */
interface FlatMonument {
  king_name: string;
  monument: Monument;
}

export function LocationsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [items, setItems] = useState<FlatMonument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedKing, setSelectedKing] = useState<string>('All');

  // Fetch & flatten on mount
  useEffect(() => {
    setLoading(true);
    searchPharaohsMonuments('')
      .then(data => {
        const kingGroups = data?.results ?? [];
        // Flatten: each king has an array of monuments → one card per monument
        const flat: FlatMonument[] = [];
        for (const group of kingGroups) {
          for (const mon of group.monuments ?? []) {
            flat.push({king_name: group.king_name, monument: mon});
          }
        }
        console.log('[Locations] loaded', flat.length, 'monuments from', kingGroups.length, 'kings');
        setItems(flat);
        setError(null);
      })
      .catch(err => {
        console.warn('[Locations] fetch failed:', err);
        setError('Failed to load locations');
      })
      .finally(() => setLoading(false));
  }, []);

  // Unique king names for filter tabs
  const kingNames = useMemo(() => {
    const names = [...new Set(items.map(i => i.king_name))];
    return ['All', ...names];
  }, [items]);

  // King image lookup from pharaohs data
  const kingImageMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of PHARAOHS) {
      map[p.name] = p.imageUrl;
    }
    return map;
  }, []);

  // Filtered items
  const filtered = useMemo(() => {
    if (selectedKing === 'All') {return items;}
    return items.filter(i => i.king_name === selectedKing);
  }, [items, selectedKing]);

  const openLink = (url: string) => {
    if (url) {Linking.openURL(url).catch(() => {});}
  };

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

        {/* King filter tabs with avatars */}
        {kingNames.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}>
            {kingNames.map(king => {
              const active = king === selectedKing;
              const avatarUri = king !== 'All' ? kingImageMap[king] : undefined;
              return (
                <TouchableOpacity
                  key={king}
                  style={styles.filterTab}
                  activeOpacity={0.7}
                  onPress={() => setSelectedKing(king)}>
                  <View style={[styles.filterCircle, active && styles.filterCircleActive]}>
                    {avatarUri ? (
                      <Image
                        source={{uri: avatarUri}}
                        style={styles.filterAvatar}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={styles.filterAllIcon}>✧</Text>
                    )}
                  </View>
                  <Text
                    style={[styles.filterText, active && styles.filterTextActive]}
                    numberOfLines={1}>
                    {king}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Content */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => {
                setLoading(true);
                searchPharaohsMonuments('')
                  .then(data => {
                    const kingGroups = data?.results ?? [];
                    const flat: FlatMonument[] = [];
                    for (const g of kingGroups) {
                      for (const m of g.monuments ?? []) {
                        flat.push({king_name: g.king_name, monument: m});
                      }
                    }
                    setItems(flat);
                    setError(null);
                  })
                  .catch(() => setError('Failed to load locations'))
                  .finally(() => setLoading(false));
              }}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}>
            {filtered.map((item, idx) => {
              const m = item.monument;
              return (
                <TouchableOpacity
                  key={`${item.king_name}-${m.name}-${idx}`}
                  style={styles.card}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('MonumentDetails', {kingName: item.king_name, monument: m})}>
                  {/* Monument image */}
                  {m.image_url ? (
                    <Image
                      source={{uri: m.image_url}}
                      style={StyleSheet.absoluteFill}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[StyleSheet.absoluteFill, styles.imagePlaceholder]}>
                      <Text style={styles.placeholderIcon}>🏛</Text>
                    </View>
                  )}
                  <View style={styles.cardOverlay} />

                  {/* Card content */}
                  <View style={styles.cardContent}>
                    {/* King badge */}
                    <View style={styles.kingBadge}>
                      <Text style={styles.kingBadgeText}>{item.king_name}</Text>
                    </View>

                    <Text style={styles.cardName} numberOfLines={2}>
                      {m.name}
                    </Text>
                    {m.details ? (
                      <Text style={styles.cardDetails} numberOfLines={2}>
                        {m.details}
                      </Text>
                    ) : null}

                    {/* Location */}
                    {m.location_name ? (
                      <View style={styles.locationRow}>
                        <MapPin size={13} color={Colors.primary} />
                        <Text style={styles.locationText} numberOfLines={1}>
                          {m.certain_location || m.location_name}
                        </Text>
                      </View>
                    ) : null}

                    {/* Action buttons */}
                    <View style={styles.actionRow}>
                      {m.location_url ? (
                        <TouchableOpacity
                          style={styles.actionBtn}
                          activeOpacity={0.7}
                          onPress={() => openLink(m.location_url)}>
                          <MapPin size={14} color={Colors.textWhite} />
                          <Text style={styles.actionText}>Map</Text>
                        </TouchableOpacity>
                      ) : null}
                      {m.uber_link ? (
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.uberBtn]}
                          activeOpacity={0.7}
                          onPress={() => openLink(m.uber_link!)}>
                          <Navigation size={14} color={Colors.textWhite} />
                          <Text style={styles.actionText}>Uber</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}

            {filtered.length === 0 && (
              <View style={styles.center}>
                <Text style={styles.emptyText}>No locations found</Text>
              </View>
            )}
          </ScrollView>
        )}
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

  // ── Filter tabs ───────────────────────────────────────────
  filterRow: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    marginBottom: Spacing.xxl,
    gap: Spacing.lg,
  },
  filterTab: {
    alignItems: 'center',
    width: 64,
  },
  filterCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: Colors.textWhite20,
    backgroundColor: Colors.cardDark,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 6,
  },
  filterCircleActive: {
    borderColor: Colors.primary,
    borderWidth: 2.5,
  },
  filterAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  filterAllIcon: {
    fontSize: 22,
    color: Colors.primary,
  },
  filterText: {
    fontSize: FontSizes.tiny,
    color: Colors.textWhite50,
    fontWeight: '600',
    textAlign: 'center',
  },
  filterTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },

  // ── List & cards ──────────────────────────────────────────
  list: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxxl + 80,
    gap: Spacing.lg,
  },
  card: {
    width: '100%',
    height: 230,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    backgroundColor: Colors.cardDark,
  },
  imagePlaceholder: {
    backgroundColor: Colors.textWhite10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    fontSize: 40,
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.50)',
  },
  cardContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
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
  cardName: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.textWhite,
    marginBottom: 2,
  },
  cardDetails: {
    fontSize: FontSizes.xs,
    color: Colors.textWhite70,
    lineHeight: 18,
    marginBottom: Spacing.xs,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.sm,
  },
  locationText: {
    fontSize: FontSizes.xs,
    color: Colors.textWhite70,
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  uberBtn: {
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  actionText: {
    fontSize: FontSizes.tiny,
    color: Colors.textWhite,
    fontWeight: '600',
  },

  // ── States ────────────────────────────────────────────────
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  errorText: {
    color: Colors.textWhite50,
    fontSize: FontSizes.sm,
    marginBottom: Spacing.md,
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
  },
});
