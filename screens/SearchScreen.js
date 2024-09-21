import { StyleSheet, Text, View,SafeAreaView,TouchableOpacity,TextInput,Modal, Button } from 'react-native'
import React, { useState } from 'react'


import tw from "tailwind-react-native-classnames";  
import Ionicons from 'react-native-vector-icons/Ionicons';
 
// screens
import VehicleTypeSelection from './modals/VehicleTypeSelection.js';
import SearchBar from '../screens/modals/SearchBar.js';
import MapScreen from '../screens/MapScreen.js';
import SideBar from '../screens/SideBar.js';
import DestinationModal from '../screens/modals/DestinationModal'; // Import your DestinationModal

const SearchScreen = () => {
    const [modalVisible, setModalVisible] = useState(false);
    const [isSearchModalVisible, setSearchModalVisible] = useState(false); // State for controlling the modal visibility

    const [isDestinationModalVisible, setDestinationModalVisible] = useState(false);
    const [selectedDestination, setSelectedDestination] = useState(null); // State to hold selected destination
    
    const toggleDestinationModal = () => setDestinationModalVisible(!destinationModalVisible);
     
    const handlePlaceSelect = (destination) => {
        setSelectedDestination(destination); // Store selected destination
        setSearchModalVisible(false); // Close the search modal
        setDestinationModalVisible(true); // Open destination modal
        console.log(destination);
      };
    
    // Toggle the search modal visibility
    const toggleSearchModal = () => {
      setSearchModalVisible(!isSearchModalVisible);
    };

    const toggleModal = () => {
        setModalVisible(!modalVisible);
      };
 
 


  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
         
    <View style={tw`flex-row flex-1`}>
        <SideBar/>
        
        <MapScreen destination={selectedDestination}/>
        
    </View>
    
    <View style={styles.overlayContainer}>
      <TouchableOpacity style={styles.button} onPress={toggleModal}>
        <View style={styles.buttonContent}>
          <Text style={styles.buttonText}>       Vehicle Type</Text>
          <Ionicons name="chevron-forward-outline" size={10} color="black" />
        </View>
      </TouchableOpacity>
      
      {/* Modal component */}
      <VehicleTypeSelection modalVisible={modalVisible} toggleModal={toggleModal} />
    </View>
      {/* Pass the correct props to SearchBar */}
      <SearchBar 
      modalVisible={isSearchModalVisible} 
      toggleModal={toggleSearchModal}  
       onPlaceSelect={handlePlaceSelect} // Pass the place selection handler
    
   />
   
   
    <View style={styles.searchBarContainer}>
        
        <Ionicons name="search" size={24} color="black" style={styles.searchIcon} />
        <TouchableOpacity onPress={toggleSearchModal} style={{ flex: 1 }}>
          <TextInput
            style={[styles.searchBarInput]}
            placeholder="Where to go?"
            editable={false}
            placeholderTextColor="gray"  // You can adjust this color
          />
        </TouchableOpacity>
        <TouchableOpacity>
          <Ionicons name="mic" size={24} color="white" style={styles.micIcon} />
        </TouchableOpacity>
      </View>

           {/* Destination Modal */}
           <DestinationModal
        visible={isDestinationModalVisible}
        toggleModal={() => setDestinationModalVisible(false)}
        destination={selectedDestination} // Pass the selected destination
      
        toggleSearchModal={toggleSearchModal} 
      />
    </SafeAreaView>
  )
}

export default SearchScreen

const styles = StyleSheet.create({
    searchBarContainer: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        backgroundColor: '#fff',
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 30,
        paddingVertical: 10,
        paddingHorizontal: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
       
      },
      searchBarInput: {
        flex: 1,
        backgroundColor: '#f9f9f9',
        borderRadius: 30,
        paddingHorizontal: 10,
        fontSize: 16,
    
        height: 45,
      },
      searchIcon: {
        marginRight: 10,
      },
      micIcon: {
        backgroundColor: 'red',
        padding: 10,
        borderRadius: 50,
      },  modalContainer: {
        flex: 1,
        backgroundColor: 'white',
        marginTop:40,
        padding: 10,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
      },
      closeButton: {
        position: 'absolute',
        top: 20,
        right: 20,
        zIndex: 10,
      },
  
      // 
      autocompleteContainer: {
          flex: 1,
          marginTop: 40,
          borderRadius: 20,
          backgroundColor: 'white',
          position: 'relative', // Ensure the clear button is positioned relative to this container
        
        },
        textInputContainer: {
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: '#ddd',
          borderRadius: 20,
          backgroundColor: '#f9f9f9',
          position: 'relative',
        },
        textInput: {
          flex: 1,
          height: 55,
          borderRadius: 20,
          paddingHorizontal: 15,
          fontSize: 16,
          color: '#333',
        },
        predefinedPlacesDescription: {
          color: '#1faadb',
        },
        description: {
          fontSize: 16,
        },
        clearButton: {
          position: 'absolute',
          right: 13,
          top: '6%',
          transform: [{ translateY: -12 }],
          zIndex: 10,
        },
        overlayContainer: {
            position: 'absolute', // Position this view absolutely within the map container
            bottom: 55, // Adjust as needed
            left: '50%', // Center horizontally
            transform: [{ translateX: -90 }], // Offset the center alignment by half of the width
            width: 180, // Width of the pill-shaped container
            height: 110, // Height of the pill-shaped container
            borderRadius: 55, // Border radius for pill shape
             justifyContent: 'center',
            alignItems: 'center',
          },
          button: {
            backgroundColor: 'white', // Background color of the button
            borderRadius: 55, // Match the border radius of the container
            paddingVertical: 5, // Adjust padding
            paddingHorizontal: 12, // Adjust padding
            justifyContent: 'center',
            alignItems: 'center',
             width: '100%',
             elevation: 3, // Adds shadow for better visibility
          },
          buttonContent: {
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
            },
            buttonText: {
              color: 'black',
              fontSize: 16,
              flex: 1,
            },
      
})