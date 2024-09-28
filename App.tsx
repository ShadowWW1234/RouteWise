import { StyleSheet } from 'react-native';
import SearchScreen from './screens/SearchScreen';
import HomeScreen from './screens/HomeScreen';
import RouteDetailsScreen from './screens/RouteDetailsScreen';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { store } from './store'; // Import your Redux store
import { Provider } from 'react-redux';
import { MapStyleProvider } from './screens/context/MapStyleContext';
import NavigationScreen from './screens/NavigationScreen'
const Stack = createNativeStackNavigator();

const App = () => {
  return (

    <Provider store={store}>
    <MapStyleProvider>
    <NavigationContainer>
      <Stack.Navigator initialRouteName="HomeScreen">
        <Stack.Screen name="HomeScreen" component={HomeScreen}
         options={{
          headerShown:false,
        }} />
        <Stack.Screen name="SearchScreen" component={SearchScreen} 
         options={{
          headerShown:false,
        }}/>

      <Stack.Screen name="RouteDetails" component={RouteDetailsScreen} 
          options={{ headerShown: false }} />


      <Stack.Screen name="NavigationScreen" component={NavigationScreen} 
          options={{ headerShown: false }} />
       </Stack.Navigator>
            
          </NavigationContainer>
          </MapStyleProvider>
          </Provider>
        );
      }

export default App;

const styles = StyleSheet.create({});
