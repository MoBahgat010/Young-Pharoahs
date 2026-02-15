// Type declarations for @azesmway/react-native-unity
declare module '@azesmway/react-native-unity' {
  import { Component } from 'react';
  import { ViewStyle } from 'react-native';

  interface UnityViewProps {
    style?: ViewStyle;
    onUnityMessage?: (message: string) => void;
  }

  export default class UnityView extends Component<UnityViewProps> {
    postMessage(gameObject: string, methodName: string, message: string): void;
  }
}
