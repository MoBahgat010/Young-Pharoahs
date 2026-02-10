import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  NativeModules,
  Platform,
  PermissionsAndroid,
  Alert,
  DeviceEventEmitter,
} from 'react-native';

const ARScreen = () => {
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);
  const [isUnityReady, setIsUnityReady] = useState(false);

  useEffect(() => {
    // Listen for messages from Unity
    const subscription = DeviceEventEmitter.addListener('onUnityMessage', (message) => {
      console.log('Received message from Unity:', message);
      
      if (message === 'unity_ready') {
        setIsUnityReady(true);
        // If we have a selected character, send it to Unity now
        if (selectedCharacter) {
          sendCharacterToUnity(selectedCharacter);
        }
      } else if (message === 'character_loaded') {
        console.log('Character loaded successfully');
      }
    });

    return () => {
      subscription.remove();
    };
  }, [selectedCharacter]); // Re-run if selectedCharacter changes (or just use ref/state access inside listener)

  const sendCharacterToUnity = (characterId: string) => {
    const {ReactNativeUnity} = NativeModules;
    if (ReactNativeUnity && ReactNativeUnity.postMessage) {
      const data = {
        characterId: characterId,
        audioUrl: '', // Add audio URL if needed later
      };
      
      console.log('Sending LoadCharacter to Unity:', data);
      ReactNativeUnity.postMessage(
        'ARManager',
        'LoadCharacter',
        JSON.stringify(data),
      );
    }
  };

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

      // Launch Unity
      const {ReactNativeUnity} = NativeModules;
      if (ReactNativeUnity && ReactNativeUnity.openUnity) {
        setIsUnityReady(false); // Reset ready state
        ReactNativeUnity.openUnity();
        
        // Note: The actual message sending happens when 'unity_ready' is received
        // OR if unity is already running/resident (depending on library behavior)
      } else {
        console.error('ReactNativeUnity native module not found');
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select a Character</Text>
      <Text style={styles.subtitle}>
        Choose a character to view in AR
      </Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.buttonMale]} 
          onPress={() => openUnity('HumanM')}>
          <Text style={styles.buttonText}>Ramses (Male)</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.buttonFemale]} 
          onPress={() => openUnity('HumanF')}>
          <Text style={styles.buttonText}>Nefertari (Female)</Text>
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
    color: '#D4AF37', // Gold color for Pharaonic theme
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
  buttonMale: {
    backgroundColor: '#0056b3', // Royal Blue
  },
  buttonFemale: {
    backgroundColor: '#c71585', // Medium Violet Red
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default ARScreen;
