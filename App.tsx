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
import { GasConsumptionProvider  } from './screens/context/GasConsumptionProvider';
import DestinationScreen from './screens/DestinationScreen';
import firebase from '@react-native-firebase/app';
import firestore from '@react-native-firebase/firestore';
import {
  FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID
} from '@env';
import {IncidentProvider} from './screens/context/IncidentContext'
// Create Stack Navigator
const Stack = createNativeStackNavigator();

// Define a key for AsyncStorage
const NAVIGATION_STATE_KEY = 'NAVIGATION_STATE';

const App = () => {
  const [isReady, setIsReady] = useState(false);  // Track readiness of the app
  const [initialState, setInitialState] = useState();  // Store the initial state
  const [appState, setAppState] = useState(AppState.currentState);


// Firebase configuration (from your Firebase project settings)
const firebaseConfig = {
  apiKey: "FIREBASE_API_KEY",
  authDomain: "FIREBASE_AUTH_DOMAIN",
  projectId: "FIREBASE_PROJECT_ID",
  storageBucket: "FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "FIREBASE_MESSAGING_SENDER_ID",
  appId: "FIREBASE_APP_ID",
};

 
  useEffect(() => {
    const clearStateOnReopen = async () => {
      await AsyncStorage.removeItem(NAVIGATION_STATE_KEY); // Clear previous navigation state
    };
  
    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        clearStateOnReopen();
      }
    });
  
    return () => {
      appStateSubscription.remove();
    };
  }, []);




// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}


   // Restore navigation state from AsyncStorage
   useEffect(() => {
    const restoreState = async () => {
      try {
        const savedState = await AsyncStorage.getItem(NAVIGATION_STATE_KEY);
        if (savedState) {
          setInitialState(JSON.parse(savedState));
        }
      } catch (error) {
        console.error('Failed to restore navigation state:', error);
        // Optionally, clear the corrupted state:
        await AsyncStorage.removeItem(NAVIGATION_STATE_KEY);
      } finally {
        setIsReady(true);
      }
    };
    

    if (!isReady) {
      restoreState();
    }

    // Handle app state change (foreground/background)
    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        restoreState();
      }
      setAppState(nextAppState);
    });

    return () => {
      appStateSubscription.remove();
    };
  }, [isReady]);

  if (!isReady) {
    return null; // Optionally add a loading spinner here
  }

  return (
    <Provider store={store}>
      <GasConsumptionProvider> 
      <IncidentProvider> 
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
             <Stack.Screen 
          name="DestinationScreen" 
          component={DestinationScreen} 
          options={{ headerShown: false }} // Hide the header for a full-screen look
        />
          </Stack.Navigator>
        </NavigationContainer>
      </MapStyleProvider>
      </IncidentProvider> 
      </GasConsumptionProvider>
    </Provider>
  );
};

export default App;

const styles = StyleSheet.create({});
