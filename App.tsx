import { StyleSheet } from 'react-native';
import SearchScreen from './screens/SearchScreen';
import HomeScreen from './screens/HomeScreen';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { store } from './store'; // Import your Redux store
import { Provider } from 'react-redux';
const Stack = createNativeStackNavigator();

const App = () => {
  return (

    <Provider store={store}>
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
      </Stack.Navigator>
    </NavigationContainer>
    </Provider>
  );
}

export default App;

const styles = StyleSheet.create({});
