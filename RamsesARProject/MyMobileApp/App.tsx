import React from 'react';
import {StyleSheet} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {Home, Users, Navigation, Box} from 'lucide-react-native';
import {HomeScreen} from './src/screens/HomeScreen';
import {KingsScreen} from './src/screens/KingsScreen';
import {LocationsScreen} from './src/screens/LocationsScreen';
import ARScreen from './src/screens/ARScreen';
import {ChatScreen} from './src/screens/ChatScreen';

export type RootStackParamList = {
  MainTabs: undefined;
  Chat: {
    pharaohName?: string;
    initialQuery?: string;
    voiceMode?: boolean;
    imageUri?: string;
    audioFilePath?: string;
  };
};

export type TabParamList = {
  HomeTab: undefined;
  KingsTab: undefined;
  LocationsTab: undefined;
  ARTab: {
    characterId?: string;
    characterName?: string;
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const TAB_ICONS = {
  HomeTab: Home,
  KingsTab: Users,
  LocationsTab: Navigation,
  ARTab: Box,
} as const;

function TabBarIcon({route, focused}: {route: keyof typeof TAB_ICONS; focused: boolean}) {
  const LucideIcon = TAB_ICONS[route];
  return (
    <LucideIcon
      size={24}
      color={focused ? '#f4c025' : 'rgba(255,255,255,0.4)'}
    />
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: tabStyles.tabBar,
        tabBarActiveTintColor: '#f4c025',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.4)',
        tabBarLabelStyle: tabStyles.tabLabel,
      }}>
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({focused}) => <TabBarIcon route="HomeTab" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="KingsTab"
        component={KingsScreen}
        options={{
          tabBarLabel: 'Kings',
          tabBarIcon: ({focused}) => <TabBarIcon route="KingsTab" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="LocationsTab"
        component={LocationsScreen}
        options={{
          tabBarLabel: 'Locations',
          tabBarIcon: ({focused}) => <TabBarIcon route="LocationsTab" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="ARTab"
        component={ARScreen}
        options={{
          tabBarLabel: 'AR',
          tabBarIcon: ({focused}) => <TabBarIcon route="ARTab" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

const tabStyles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#1a1708',
    borderTopWidth: 1,
    borderTopColor: 'rgba(244, 192, 37, 0.15)',
    height: 65,
    paddingBottom: 8,
    paddingTop: 8,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

});

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}>
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="Chat" component={ChatScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
