import React, { useEffect, useState,useContext } from 'react';
import { StyleSheet, TextInput, View, Modal, SafeAreaView, TouchableOpacity, FlatList, Text, Button } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { debounce } from 'lodash';
import { useDispatch, useSelector } from 'react-redux';
import { setOrigin, setDestination } from '../../slices/navSlice';
import MapSelectionModal from './MapSelectionModal';
import DestinationModal from './DestinationModal';
import {  MAPBOX_API_TOKEN } from '@env';
import { GestureHandlerRootView, ScrollView } from 'react-native-gesture-handler';
import SQLite from 'react-native-sqlite-storage';
import { GasConsumptionContext } from '../context/GasConsumptionProvider';
import { useNavigation } from '@react-navigation/native';

 
const SearchBar = ({ modalVisible, toggleModal }) => {
  const [originText, setOriginText] = useState('Select manual location'); // Default text for origin
  const [searchText, setSearchText] = useState(''); // For destination search input
  const [searchResults, setSearchResults] = useState([]);
  const [mapModalVisible, setMapModalVisible] = useState(false); // For the map modal
  const [destinationModalVisible, setDestinationModalVisible] = useState(false); // For destination modal
  const [originSet, setOriginSet] = useState(false); // To track if origin is set
  const [selectedOrigin, setSelectedOrigin] = useState(null); // Store selected origin data
  const [selectedDestination, setSelectedDestination] = useState(null); // Store selected destination data

  const [originSearchText, setOriginSearchText] = useState(''); // For origin search input
  const [destinationSearchText, setDestinationSearchText] = useState(''); // For destination search input
  const [originSearchResults, setOriginSearchResults] = useState([]); // Store search results for origin
  const [destinationSearchResults, setDestinationSearchResults] = useState([]); // Store search results for destination
  const { gasConsumption, setGasConsumption } = useContext(GasConsumptionContext); // Access the context

  const dispatch = useDispatch();
  const navigation = useNavigation(); // Initialize navigation

  useEffect(() => {
    if (modalVisible) {
      loadGasConsumptionFromDB(setGasConsumption); // Fetch gas consumption when modal is visible
    }
  }, [modalVisible]);
  
  useEffect(() => {
    console.log('Gas consumption in SearchBar:', gasConsumption);  // Log the gas consumption
  }, [gasConsumption]);


  // Function to reset the search text and results
  const handlereset = () => {
    toggleModal();
    setOriginSearchText('');
    setOriginSearchResults([]);
    setDestinationSearchText('');
    setDestinationSearchResults([]);
  };
// SearchBar.js
useEffect(() => {
  console.log('SearchBar - gasConsumption:', gasConsumption);
}, [gasConsumption]);
  // Function to fetch places for origin or destination search
  const fetchPlaces = debounce(async (text, isOrigin = false) => {
    if (text.length > 2) {
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(text)}.json?access_token=${MAPBOX_API_TOKEN}&autocomplete=true&country=PH`
        );
        const data = await response.json();
        if (isOrigin) {
          setOriginSearchResults(data.features); // Store search results for origin
        } else {
          setDestinationSearchResults(data.features); // Store search results for destination
        }
      } catch (error) {
        console.error('Error fetching places:', error);
      }
    } else {
      if (isOrigin) {
        setOriginSearchResults([]); // Clear results if input is too short for origin
      } else {
        setDestinationSearchResults([]); // Clear results if input is too short for destination
      }
    }
  }, 300);
  


  const getDBConnection = () => {
    const db = SQLite.openDatabase(
      { name: 'vehicle_data.db', location: 'default' },
      () => console.log('Database opened successfully'),
      (error) => console.error('Failed to open database:', error)
    );
    return db;
  };
  
  const loadGasConsumptionFromDB = async (setGasConsumption) => {
    const db = getDBConnection();
    db.transaction((tx) => {
      tx.executeSql(
        'SELECT gasConsumption FROM VehicleSelection ORDER BY id DESC LIMIT 1;',
        [],
        (tx, results) => {
          if (results.rows.length > 0) {
            const row = results.rows.item(0);
            setGasConsumption(row.gasConsumption); // Set the gas consumption
            console.log('Gas consumption loaded:', row.gasConsumption);
          } else {
            console.log('No gas consumption data found.');
          }
        },
        (tx, error) => {
          console.error('Failed to load gas consumption from database:', error);
        }
      );
    });
  };
  const clearTravelHistoryTable = () => {
    const db = getDBConnection(); // Assuming you have this function already set up
    db.transaction(txn => {
      txn.executeSql(
        'DELETE FROM travel_history', // This will delete all rows in the table
        [],
        () => {
          console.log('Travel history table cleared successfully.');
        },
        error => {
          console.error('Error clearing travel history table:', error);
        }
      );
    });
  };

 // Call this function when the component mounts
/*useEffect(() => {
  clearTravelHistoryTable();
}, []);
*/

 

  const handleOriginSelect = (place) => {
    const { center, place_name } = place;
    const originLocation = { latitude: center[1], longitude: center[0], description: place_name };
    dispatch(setOrigin(originLocation));
    setSelectedOrigin(originLocation);
    setOriginSearchText(place_name);
    setOriginSet(true);
    setOriginSearchResults([]);
  };


  const handleDestinationSelect = (place) => {
    const { center, place_name } = place;
    const destinationLocation = { latitude: center[1], longitude: center[0], description: place_name };
    dispatch(setDestination(destinationLocation));
    setSelectedDestination(destinationLocation);
    setDestinationSearchText(place_name);
    setDestinationSearchResults([]);

  
    // Navigate to DestinationScreen with origin and destination as parameters
    navigation.navigate('DestinationScreen', { origin: selectedOrigin, destination: destinationLocation });
    toggleModal(); // Close the SearchBar modal
  };

   // Handle map selection for origin (from the "Map Selection" modal)
   const handleSelectLocation = async (coordinates) => {
    const [longitude, latitude] = coordinates;

    try {
      const reverseGeocode = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${MAPBOX_API_TOKEN}`
      );
      const data = await reverseGeocode.json();

      if (data.features && data.features.length > 0) {
        const placeName = data.features[0]?.place_name || 'Unknown Location';
        const originLocation = { latitude, longitude, description: placeName };
        setSelectedOrigin(originLocation); // Store the origin locally
        dispatch(setOrigin(originLocation)); // Set origin in Redux
        setOriginSearchText(placeName); // Update the origin text
        setOriginSet(true); // Set originSet to true when origin is selected
        setMapModalVisible(false); // Close the modal after selecting
      } else {
        setOriginSearchText('Unknown Location');
      }
    } catch (error) {
      console.error('Error with reverse geocoding:', error);
      setOriginSearchText('Error retrieving location');
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

 
    <GestureHandlerRootView style={{ flex: 1 }}>
  
    <View style={{ flex: 1 }}>
  {/* Container for TextInputs */}
  <View style={{ flexGrow: 0 }}>
    {/* First TextInput (for Origin) with Icon */}
    <View style={styles.inputContainer}>
      <Ionicons
        name="locate-outline"
        size={24}
        color="red"
        style={styles.icon}
        onPress={() => setMapModalVisible(true)}
      />
      <TextInput
        style={styles.textInputWithIcon}
        placeholder="Search or pin a location"
        placeholderTextColor="gray"
        value={originSearchText} // Display the selected or searched location
        onChangeText={(text) => {
          setOriginSearchText(text);
          fetchPlaces(text, true); // Fetch places for origin
        }}
      />
    </View>

    {/* Second TextInput (for Destination) with Icon */}
    <View style={styles.inputContainer}>
      <Ionicons name="location-outline" size={24} color="black" style={styles.icon} />
      <TextInput
        style={styles.textInputWithIcon}
        placeholder="Search a place for your destination"
        placeholderTextColor="gray"
        value={destinationSearchText}
        onChangeText={(text) => {
          setDestinationSearchText(text);
          fetchPlaces(text, false); // Fetch places for destination
        }}
        editable={originSet} // Disable the input if origin is not set
      />
    </View>
  </View>

  {/* ScrollView for both origin and destination FlatLists */}
  <ScrollView style={{ flexGrow: 1 }}>
    {/* FlatList for origin search results */}
    <FlatList
      data={originSearchResults}
      keyExtractor={(item) => item.id || item.place_name}
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.resultItem} onPress={() => handleOriginSelect(item)}>
          <View style={styles.itemContainer}>
            <Ionicons name="location-outline" size={24} color="black" style={styles.icon} />
            <View style={styles.textContainer}>
              <Text style={styles.title}>{item.place_name}</Text>
              <Text style={styles.subtitle}>{item.text || 'Unknown Region'}</Text>
            </View>
          </View>
        </TouchableOpacity>
      )}
      scrollEnabled={false} // Disable internal FlatList scrolling
    />

    {/* FlatList for destination search results */}
    <FlatList
      data={destinationSearchResults}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.resultItem} onPress={() => handleDestinationSelect(item)}>
          <View style={styles.itemContainer}>
            <Ionicons name="location-outline" size={24} color="black" style={styles.icon} />
            <View style={styles.textContainer}>
              <Text style={styles.title}>{item.place_name}</Text>
              <Text style={styles.subtitle}>{item.text || 'Unknown Region'}</Text>
            </View>
          </View>
        </TouchableOpacity>
      )}
      scrollEnabled={false} // Disable internal FlatList scrolling
    />
  </ScrollView>
</View>

    </GestureHandlerRootView>

 

  {/* Map Selection Modal for selecting Origin */}
  <MapSelectionModal
    modalVisible={mapModalVisible}
    toggleModal={() => setMapModalVisible(false)}
    onSelectLocation={handleSelectLocation}
  />

{destinationModalVisible && (
  <DestinationModal
    visible={destinationModalVisible}
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
  inputContainer: {
    flexDirection: 'row', // Ensure icon and text input are in a row
    alignItems: 'center', // Vertically align the icon and text input
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  icon: {
    marginLeft: 10, // Add some space to the left of the icon
  },
  textInputWithIcon: {
    flex: 1, // Take up the remaining space
    height: 50,
    paddingHorizontal: 10,
    fontSize: 16,
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
