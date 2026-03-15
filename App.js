import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import MoodEntryScreen from './src/screens/MoodEntryScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import AnalysisScreen from './src/screens/AnalysisScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#6C63FF',
          tabBarInactiveTintColor: '#999',
          tabBarStyle: {
            paddingBottom: 8,
            paddingTop: 8,
            height: 60,
            borderTopWidth: 0,
            elevation: 10,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
          },
        }}
      >
        <Tab.Screen
          name="Entry"
          component={MoodEntryScreen}
          options={{
            tabBarLabel: 'Registrar',
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 22 }}>✏️</Text>
            ),
          }}
        />
        <Tab.Screen
          name="History"
          component={HistoryScreen}
          options={{
            tabBarLabel: 'Historial',
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 22 }}>📋</Text>
            ),
          }}
        />
        <Tab.Screen
          name="Analysis"
          component={AnalysisScreen}
          options={{
            tabBarLabel: 'Análisis',
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 22 }}>🧠</Text>
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
