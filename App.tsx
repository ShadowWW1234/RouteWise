import React, { useEffect, useState } from 'react';
import { StyleSheet, AppState } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { store } from './store'; // Import your Redux store
import { MapStyleProvider } from './screens/context/MapStyleContext';
import HomeScreen from './screens/HomeScreen';
import SearchScreen from './screens/SearchScreen';
import RouteDetailsScreen from './screens/RouteDetailsScreen';
import NavigationScreen from './screens/NavigationScreen';
import StopSearchScreen from './screens/modals/StopSearchScreen';
import PreviewMapScreen from './screens/PreviewMapScreen'
// Create Stack Navigator
const Stack = createNativeStackNavigator();

// Define a key for AsyncStorage
const NAVIGATION_STATE_KEY = 'NAVIGATION_STATE';

const App = () => {
  const [isReady, setIsReady] = useState(false);  // Track readiness of the app
  const [initialState, setInitialState] = useState();  // Store the initial state
  const [appState, setAppState] = useState(AppState.currentState);

  // Handle saving and restoring state
  useEffect(() => {
    const restoreState = async () => {
      try {
        const savedState = await AsyncStorage.getItem(NAVIGATION_STATE_KEY);
        if (savedState) {
          setInitialState(JSON.parse(savedState));
        }
      } finally {
        setIsReady(true);
      }
    };

    if (!isReady) {
      restoreState();
    }

    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        // App has come back to the foreground, restore the navigation state
        restoreState();
      }
      setAppState(nextAppState);
    });

    return () => {
      appStateSubscription.remove();  // Clean up the app state listener
    };
  }, [isReady]);

  if (!isReady) {
    return null; // Render a loading spinner if needed
  }

  return (
    <Provider store={store}>
      <MapStyleProvider>
        <NavigationContainer
          initialState={initialState}  // Pass initial state from AsyncStorage
          onStateChange={(state) =>
            AsyncStorage.setItem(NAVIGATION_STATE_KEY, JSON.stringify(state))  // Save state changes to AsyncStorage
          }
        >
          <Stack.Navigator initialRouteName="HomeScreen">
            <Stack.Screen
              name="HomeScreen"
              component={HomeScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="SearchScreen"
              component={SearchScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="RouteDetails"
              component={RouteDetailsScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="NavigationScreen"
              component={NavigationScreen}
              options={{ headerShown: false }}
            />
             <Stack.Screen
              name="StopSearchScreen"
              component={StopSearchScreen}
              options={{ headerShown: true,title:'Add stop',  headerTitleAlign: 'center' }}
            />
             <Stack.Screen
              name="PreviewMapScreen"
              component={PreviewMapScreen}
              options={{ headerShown: true,title:'Preview',  headerTitleAlign: 'center' }}
            />
            
          </Stack.Navigator>
        </NavigationContainer>
      </MapStyleProvider>
    </Provider>
  );
};

export default App;

const styles = StyleSheet.create({});
