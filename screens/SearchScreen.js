import { StyleSheet, Text, View,SafeAreaView,TouchableOpacity } from 'react-native'
import React from 'react'
import MapScreen from './MapScreen.js';
import SideBar from './SideBar.js';
import tw from "tailwind-react-native-classnames"; 
 
const SearchScreen = () => {


  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
         
    <View style={tw`flex-row flex-1`}>
        <SideBar/>
        
        <MapScreen />
    </View>
    
    </SafeAreaView>
  )
}

export default SearchScreen

const styles = StyleSheet.create({
   
})