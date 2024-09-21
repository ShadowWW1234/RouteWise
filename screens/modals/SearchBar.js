import { StyleSheet, TextInput, View, Modal, SafeAreaView, TouchableOpacity, FlatList, Text } from 'react-native';
import React, { useState } from 'react';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { debounce } from 'lodash'; // Ensure lodash is installed
import { useDispatch } from 'react-redux';
import { setDestination } from '../../slices/navSlice';

const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1Ijoic2hhZG93MjI2IiwiYSI6ImNtMTl6d3NnaDFrcWIyanM4M3pwMTYxeDQifQ.wDv2IuFGRpUASw1jx540Ng';  // Add your Mapbox token here

const SearchBar = ({ modalVisible, toggleModal ,onPlaceSelect  }) => {
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const dispatch = useDispatch();  // <-- Get the dispatch function from useDispatch

  
  const fetchPlaces = debounce(async (text) => {
    if (text.length > 2) {
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(text)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&autocomplete=true&country=PH`
        );
        const data = await response.json();
        setSearchResults(data.features); // Store results
      } catch (error) {
        console.error('Error fetching places:', error);
      }
    } else {
      setSearchResults([]); // Clear results if input is too short
    }
  }, 300);
  const handlePlaceSelect = (place) => {
    const { center, place_name } = place;
    const destinationLocation = {
      latitude: center[1],
      longitude: center[0],
      description: place_name,
    };

    onPlaceSelect(destinationLocation); // Call the prop function to handle selection
  };

   
  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={modalVisible}
      onRequestClose={toggleModal}
    >
      <SafeAreaView style={styles.modalContainer}>
        {/* Close Button */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={toggleModal}
        >
          <Ionicons name="close" size={32} color="black" />
        </TouchableOpacity>

        {/* Search Input */}
        <View style={{ flex: 1 }}>
          <TextInput
            style={styles.textInput}
            placeholder="Where to go?"
            placeholderTextColor={'gray'}
            value={searchText}
            onChangeText={(text) => {
              setSearchText(text);
              fetchPlaces(text); // Fetch places from Mapbox
            }}
          />

          {/* Display search results */}
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.resultItem} onPress={() => handlePlaceSelect(item)}>
                <View style={styles.itemContainer}>
                  <Ionicons name="location-outline" size={24} color="black" style={styles.icon} />
                  <View style={styles.textContainer}>
                    <Text style={styles.title}>{item.place_name}</Text>
                    <Text style={styles.subtitle}>{item.text || 'Unknown Region'}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
};

export default SearchBar;

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5', // Slightly lighter background for contrast
  },
  closeButton: {
    alignSelf: 'flex-end',
  },
  textInput: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    fontSize: 16,
    marginBottom: 20, // Add some space below the input
    color:'black'
  },
  resultItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'black',
  },
  subtitle: {
    fontSize: 14,
    color: 'gray',
  },
  render:{
    color:'black'
  },
});
