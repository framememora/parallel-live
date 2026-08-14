import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LiveCameraScreen } from '../screens/LiveCameraScreen/LiveCameraScreen';
import { SessionEndScreen } from '../screens/SessionEndScreen/SessionEndScreen';

export type RootStackParamList = {
  Live: undefined;
  SessionEnd: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Live">
          {({ navigation }) => (
            <LiveCameraScreen onSessionEnd={() => navigation.navigate('SessionEnd')} />
          )}
        </Stack.Screen>
        <Stack.Screen name="SessionEnd">
          {({ navigation }) => <SessionEndScreen onDone={() => navigation.navigate('Live')} />}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
