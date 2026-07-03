import React from 'react';
import { View, ActivityIndicator, Pressable, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthProvider, useAuth } from './src/auth';
import { CORES } from './src/config';
import LoginScreen from './src/screens/LoginScreen';
import CotacoesScreen from './src/screens/CotacoesScreen';
import NovaOCScreen from './src/screens/NovaOCScreen';
import MinhasOCsScreen from './src/screens/MinhasOCsScreen';

const Tab = createBottomTabNavigator();

const tema = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: CORES.bg, card: CORES.card2, border: CORES.borda, primary: CORES.amber, text: CORES.texto },
};

function Tabs() {
  const { logout } = useAuth();
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: { backgroundColor: CORES.card2, borderTopColor: CORES.borda },
        tabBarActiveTintColor: CORES.amber,
        tabBarInactiveTintColor: CORES.fraco,
        headerStyle: { backgroundColor: CORES.card2 },
        headerTintColor: '#fff',
        headerRight: () => (
          <Pressable onPress={logout} style={{ paddingHorizontal: 14 }}><Text style={{ color: CORES.sub }}>Sair</Text></Pressable>
        ),
      }}
    >
      <Tab.Screen name="Cotações" component={CotacoesScreen} />
      <Tab.Screen name="Nova OC" component={NovaOCScreen} />
      <Tab.Screen name="Minhas OCs" component={MinhasOCsScreen} />
    </Tab.Navigator>
  );
}

function Raiz() {
  const { carregando, usuario } = useAuth();
  if (carregando) {
    return <View style={{ flex: 1, backgroundColor: CORES.bg, justifyContent: 'center' }}><ActivityIndicator color={CORES.amber} /></View>;
  }
  return usuario ? <Tabs /> : <LoginScreen />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer theme={tema}>
          <StatusBar style="light" />
          <Raiz />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
