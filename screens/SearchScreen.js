import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, TextInput } from 'react-native';
import React, { useState, useEffect, useContext } from 'react';
import tw from "tailwind-react-native-classnames";  
import Ionicons from 'react-native-vector-icons/Ionicons';
import VehicleTypeSelection from './modals/VehicleTypeSelection';
import SearchBar from '../screens/modals/SearchBar';
import MapScreen from '../screens/MapScreen';
import SideBar from '../screens/SideBar';
import DestinationModal from '../screens/modals/DestinationModal';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { GasConsumptionContext } from '../screens/context/GasConsumptionProvider';
import SQLite from 'react-native-sqlite-storage';

const SearchScreen = () => {
  const [isSearchModalVisible, setSearchModalVisible] = useState(false);
  const [isDestinationModalVisible, setDestinationModalVisible] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [selectedOrigin, setSelectingOrigin] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const { gasConsumption, updateGasConsumption } = useContext(GasConsumptionContext);
  const [modalVisible, setModalVisible] = useState(false);

  // SQLite database setup
  const db = SQLite.openDatabase(
    { name: 'gasConsumption.db', location: 'default' },
    () => { console.log('Database opened'); },
    error => { console.log('Error opening database:', error); }
  );

  useEffect(() => {
    const createTableAndLoadData = () => {
      db.transaction(txn => {
        // Create the table if it doesn't exist
        txn.executeSql(
          `CREATE TABLE IF NOT EXISTS gas_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            consumption REAL
          )`,
          [],
          () => {
            console.log('Table created or already exists.');
            
            // Check if there is any data
            txn.executeSql(
              'SELECT consumption FROM gas_data WHERE id = 1',
              [],
              (tx, results) => {
                if (results.rows.length > 0) {
                  const consumptionValue = results.rows.item(0).consumption;
                  updateGasConsumption(consumptionValue); // Use updateGasConsumption to set the value
                  setModalVisible(false); // Hide modal after loading the value
                } else {
                  // If no data exists, insert a default value or keep modal open
                  txn.executeSql(
                    'INSERT INTO gas_data (id, consumption) VALUES (1, 0)',
                    [],
                    () => {
                      console.log('Initial data inserted.');
                      setModalVisible(true); // Show modal to let the user set consumption
                    },
                    error => {
                      console.error('Failed to insert initial data:', error);
                    }
                  );
                }
                setIsLoading(false); // Stop loading after the data check
              },
              error => {
                console.error('Failed to load gas consumption:', error);
                setIsLoading(false); // Stop loading even on error
              }
            );
          },
          error => {
            console.error('Failed to create table:', error);
            setIsLoading(false); // Stop loading on table creation failure
          }
        );
      });
    };

    createTableAndLoadData();
  }, []);

  // Handle place selection from the SearchBar
  const handlePlaceSelect = (origin, destination) => {
    setSelectingOrigin(origin);
    setSelectedDestination(destination);
    setSearchModalVisible(false);
    setDestinationModalVisible(true);
    console.log('Destination selected:', destination);
  };

  // Toggle search modal
  const toggleSearchModal = () => {
    setSearchModalVisible(!isSearchModalVisible);
  };

  // Toggle destination modal
  const toggleDestinationModal = () => {
    setDestinationModalVisible(!isDestinationModalVisible);
  };

  // Toggle vehicle selection modal
  const toggleModal = () => {
    setModalVisible(!modalVisible);
  };

  // Loading screen while fetching data
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <View style={tw`flex-row flex-1`}>
        <SideBar />
        <MapScreen destination={selectedDestination} />
      </View>

      {/* Vehicle Type Selection Button */}
      <View style={styles.overlayContainer}>
        <TouchableOpacity style={styles.button} onPress={toggleModal}>
          <View style={styles.buttonContent}>
            <Text style={styles.buttonText}>Vehicle Type</Text>
            <Ionicons name="chevron-forward-outline" size={10} color="black" />
          </View>
        </TouchableOpacity>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <VehicleTypeSelection
            modalVisible={modalVisible}
            toggleModal={toggleModal}
            onSaveGasConsumption={updateGasConsumption} // Use updateGasConsumption
          />
        </GestureHandlerRootView>
      </View>

      {/* SearchBar Modal */}
      <SearchBar
        modalVisible={isSearchModalVisible}
        toggleModal={toggleSearchModal}
        onPlaceSelect={handlePlaceSelect}
        gasConsumption={gasConsumption}
      />

      {/* Search Bar Input */}
      <View style={styles.searchBarContainer}>
        <Ionicons name="search" size={24} color="black" style={styles.searchIcon} />
        <TouchableOpacity onPress={toggleSearchModal} style={{ flex: 1 }}>
          <TextInput
            style={styles.searchBarInput}
            placeholder="Where to go?"
            editable={false}
            placeholderTextColor="gray"
          />
        </TouchableOpacity>
        <TouchableOpacity>
          <Ionicons name="mic" size={24} color="white" style={styles.micIcon} />
        </TouchableOpacity>
      </View>

      {/* DestinationModal */}
      <DestinationModal
        visible={isDestinationModalVisible}
        toggleModal={toggleDestinationModal}
        destination={selectedDestination}
        origin={selectedOrigin}
        resetSearch={() => setSearchModalVisible(false)} // Reset search when modal closes
        gasConsumption={gasConsumption}
      />
    </SafeAreaView>
  );
};

export default SearchScreen;

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
    },
    overlayContainer: {
        position: 'absolute',
        bottom: 15,
        left: '50%',
        transform: [{ translateX: -90 }],
        width: 180,
        height: 110,
        borderRadius: 55,
        justifyContent: 'center',
        alignItems: 'center',
    },
    button: {
        backgroundColor: 'white',
        borderRadius: 55,
        paddingVertical: 5,
        paddingHorizontal: 12,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        elevation: 3,
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
});
