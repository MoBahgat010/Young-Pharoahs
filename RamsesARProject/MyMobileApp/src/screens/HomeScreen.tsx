import {
  View,
  Text,
  FlatList,
  StyleSheet,
  StatusBar,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {CHARACTERS} from '../data/characters';
import {CharacterCard} from '../components/CharacterCard';
import type {RootStackParamList} from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({navigation}: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0D0D1A" />
      <View style={styles.header}>
        <Text style={styles.title}>Ancient Pharaohs</Text>
        <Text style={styles.subtitle}>Tap a character to experience AR</Text>
      </View>
      <FlatList
        data={CHARACTERS}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({item}) => (
          <CharacterCard
            character={item}
            onPress={() =>
              navigation.navigate('AR', {
                characterId: item.id,
                characterName: item.name,
              })
            }
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D1A',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#8888AA',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
});
