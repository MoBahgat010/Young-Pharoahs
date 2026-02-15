import React, {useState, useRef, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  PermissionsAndroid,
  Alert,
} from 'react-native';
import UnityView from '@azesmway/react-native-unity';
import {useRoute, useNavigation} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/native';
import type {TabParamList} from '../../App';

type ARTabRoute = RouteProp<TabParamList, 'ARTab'>;

const ARScreen = () => {
  const route = useRoute<ARTabRoute>();
  const navigation = useNavigation();
  const {
    characterId: paramCharacterId,
    audioFilePath,
    autoLaunch,
    returnToChat,
  } = route.params ?? {};

  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);
  const [showUnity, setShowUnity] = useState(false);
  const unityRef = useRef<UnityView>(null);
  const hasAutoLaunched = useRef(false);
  const audioFilePathRef = useRef<string | undefined>(audioFilePath);

  // Keep ref in sync
  useEffect(() => {
    audioFilePathRef.current = audioFilePath;
  }, [audioFilePath]);

  const sendCharacterToUnity = useCallback((characterId: string, audioUrl?: string) => {
    const data = {
      characterId: characterId,
      audioUrl: audioUrl || '',
    };
    console.log('Sending LoadCharacter to Unity:', data);
    unityRef.current?.postMessage(
      'ARManager',
      'LoadCharacter',
      JSON.stringify(data),
    );
  }, []);

  const handleUnityMessage = useCallback((result: {nativeEvent: {message: string}}) => {
    const message = result.nativeEvent.message;
    console.log('Received message from Unity:', message);

    if (message === 'unity_ready') {
      const charId = selectedCharacter || 'cat_pharaoh__king';
      const audioUrl = audioFilePathRef.current
        ? `file://${audioFilePathRef.current}`
        : '';
      sendCharacterToUnity(charId, audioUrl);
    } else if (message === 'character_loaded') {
      console.log('Character loaded successfully');
    } else if (message === 'character_placed') {
      console.log('Character placed on surface');
    } else if (message === 'audio_complete') {
      console.log('Narration finished — returning to RN');
      setShowUnity(false);
      setSelectedCharacter(null);

      // Clear the auto-launch params so re-visiting the tab doesn't re-trigger
      navigation.setParams({
        audioFilePath: undefined,
        autoLaunch: undefined,
        returnToChat: undefined,
      } as any);

      // Navigate back to chat if launched from chat
      if (returnToChat) {
        const parent = navigation.getParent();
        if (parent) {
          parent.goBack();
        }
      }
    }
  }, [selectedCharacter, sendCharacterToUnity, navigation, returnToChat]);

  // Auto-launch when navigated from chat with params
  useEffect(() => {
    if (autoLaunch && !hasAutoLaunched.current) {
      hasAutoLaunched.current = true;
      const charId = paramCharacterId || 'cat_pharaoh__king';
      openUnity(charId);
    }
  }, [autoLaunch, paramCharacterId]);

  // Reset auto-launch flag when params are cleared
  useEffect(() => {
    if (!autoLaunch) {
      hasAutoLaunched.current = false;
    }
  }, [autoLaunch]);

  const openUnity = async (characterId: string) => {
    setSelectedCharacter(characterId);

    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'AR needs access to your camera.',
            buttonPositive: 'OK',
            buttonNegative: 'Cancel',
          },
        );

        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert(
            'Camera Required',
            'Camera permission is required for AR. Please grant it in Settings.',
          );
          return;
        }
      } catch (err) {
        console.warn('Permission error:', err);
        return;
      }
    }

    setShowUnity(true);

    if (unityRef.current) {
      const audioUrl = audioFilePathRef.current
        ? `file://${audioFilePathRef.current}`
        : '';
      sendCharacterToUnity(characterId, audioUrl);
    }
  };

  const closeUnity = () => {
    setShowUnity(false);
    setSelectedCharacter(null);

    // Clear auto-launch params
    navigation.setParams({
      audioFilePath: undefined,
      autoLaunch: undefined,
      returnToChat: undefined,
    } as any);

    if (returnToChat) {
      const parent = navigation.getParent();
      if (parent) {
        parent.goBack();
      }
    }
  };

  if (showUnity) {
    return (
      <View style={styles.unityContainer}>
        <UnityView
          ref={unityRef}
          style={styles.unity}
          onUnityMessage={handleUnityMessage}
          onPlayerUnload={() => {
            console.log('Unity player unloaded');
            setShowUnity(false);
          }}
          onPlayerQuit={() => {
            console.log('Unity player quit');
            setShowUnity(false);
          }}
        />
        <TouchableOpacity style={styles.closeButton} onPress={closeUnity}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AR Experience</Text>
      <Text style={styles.subtitle}>
        View the Pharaoh in Augmented Reality
      </Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.buttonPharaoh]} 
          onPress={() => openUnity('cat_pharaoh__king')}>
          <Text style={styles.buttonText}>Launch AR</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#D4AF37',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#ccc',
    marginBottom: 50,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    paddingHorizontal: 20,
    gap: 20,
  },
  button: {
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonPharaoh: {
    backgroundColor: '#D4AF37',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  unityContainer: {
    flex: 1,
  },
  unity: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default ARScreen;
