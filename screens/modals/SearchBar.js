import React, { useState } from 'react';
import { StyleSheet, TextInput, View, Modal, SafeAreaView, TouchableOpacity, FlatList, Text, Button } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { debounce } from 'lodash';
import { useDispatch, useSelector } from 'react-redux';
import { setOrigin, setDestination } from '../../slices/navSlice';
import MapSelectionModal from './MapSelectionModal';
import DestinationModal from './DestinationModal';

const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1Ijoic2hhZG93MjI2IiwiYSI6ImNtMTl6d3NnaDFrcWIyanM4M3pwMTYxeDQifQ.wDv2IuFGRpUASw1jx540Ng';  // Add your Mapbox token here

const SearchBar = ({ modalVisible, toggleModal }) => {
  const [originText, setOriginText] = useState('Select manual location'); // Default text for origin
  const [searchText, setSearchText] = useState(''); // For destination search input
  const [searchResults, setSearchResults] = useState([]);
  const [mapModalVisible, setMapModalVisible] = useState(false); // For the map modal
  const [destinationModalVisible, setDestinationModalVisible] = useState(false); // For destination modal
  const [originSet, setOriginSet] = useState(false); // To track if origin is set
  const [selectedOrigin, setSelectedOrigin] = useState(null); // Store selected origin data
  const [selectedDestination, setSelectedDestination] = useState(null); // Store selected destination data

  const dispatch = useDispatch();


   // Function to reset the search text in the SearchBar
  const resetSearch = () => {
    setSearchText(''); // Reset the search input
    setSearchResults([]); // Clear search results
  };

const handlereset=()=>{
  toggleModal();
  setSearchText('');
  setSearchResults([]);
}
  // Function to fetch places for destination search
  const fetchPlaces = debounce(async (text) => {
    if (text.length > 2) {
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(text)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&autocomplete=true&country=PH`
        );
        const data = await response.json();
        setSearchResults(data.features); // Store search results
      } catch (error) {
        console.error('Error fetching places:', error);
      }
    } else {
      setSearchResults([]); // Clear results if input is too short
    }
  }, 300);

  // Handle place selection for destination (second input)
  const handlePlaceSelect = (place) => {
    const { center, place_name } = place;
    const destinationLocation = {
      latitude: center[1],
      longitude: center[0],
      description: place_name,
    };

    dispatch(setDestination(destinationLocation)); // Set destination in Redux
    setSearchText(place_name); // Update the searchText with the place name
    setSelectedDestination(destinationLocation); // Store the destination locally

    // Open the destination modal after selecting a destination
    setDestinationModalVisible(true);
  };
// Handle map selection for origin (first input)
const handleSelectLocation = async (coordinates) => {
  const [longitude, latitude] = coordinates;

  try {
    const reverseGeocode = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${MAPBOX_ACCESS_TOKEN}`
    );
    const data = await reverseGeocode.json();

    if (data.features && data.features.length > 0) {
      const placeName = data.features[0]?.place_name || 'Unknown Location';
      setOriginText(placeName); // Set the place name in the first TextInput
      const originLocation = { latitude, longitude, description: placeName };
      setSelectedOrigin(originLocation); // Store the origin locally

      dispatch(setOrigin(originLocation)); // Set origin in Redux
      setOriginSet(true); // Set originSet to true when origin is selected
      setMapModalVisible(false); // Close the modal after selecting
    } else {
      console.log('No reverse geocoding results found.');
      setOriginText('Unknown Location'); // Fallback text
    }
  } catch (error) {
    console.error('Error with reverse geocoding:', error);
    setOriginText('Error retrieving location'); // Set error text if there's an issue
  }
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
        <TouchableOpacity style={styles.closeButton} onPress={handlereset}>
          <Ionicons name="close" size={32} color="black" />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          {/* First TextInput (for Origin) */}
          <TouchableOpacity onPress={() => setMapModalVisible(true)}>
            <TextInput
              style={styles.textInput}
              placeholder="Select manual location"
              placeholderTextColor={'gray'}
              value={originText}
              editable={false} // Make it non-editable (just a button to open map modal)
            />
          </TouchableOpacity>

          {/* Second TextInput (for Destination) */}
          <TextInput
            style={styles.textInput}
            placeholder="Where to go?"
            placeholderTextColor={'gray'}
            value={searchText}
            onChangeText={(text) => {
              setSearchText(text);
              fetchPlaces(text); // Fetch places from Mapbox for destination
            }}
            editable={originSet} // Disable the input if origin is not set
          />

          {/* Display search results for destination */}
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

        {/* Map Selection Modal for selecting Origin */}
        <MapSelectionModal
          modalVisible={mapModalVisible}
          toggleModal={() => setMapModalVisible(false)}
          onSelectLocation={handleSelectLocation}
        />

        {/* Destination Modal (opens after destination is selected) */}
        {destinationModalVisible && (
          <DestinationModal
            modalVisible={destinationModalVisible}
            toggleModal={() => setDestinationModalVisible(false)}
            origin={selectedOrigin}
            destination={selectedDestination}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
};

export default SearchBar;

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
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
    marginBottom: 10,
    color: 'black',
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
});
