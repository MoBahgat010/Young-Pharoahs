import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {HomeScreen} from './src/screens/HomeScreen';
import ARScreen from './src/screens/ARScreen';
import {ChatScreen} from './src/screens/ChatScreen';

export type RootStackParamList = {
  Home: undefined;
  Chat: {
    pharaohName?: string;
    initialQuery?: string;
    voiceMode?: boolean;
  };
  AR: {
    characterId: string;
    characterName: string;
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
        <Stack.Screen name="AR" component={ARScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
