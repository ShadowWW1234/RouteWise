import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import React, { useState, useEffect, useContext, useRef, useMemo } from 'react';
import tw from "tailwind-react-native-classnames";  
import Ionicons from 'react-native-vector-icons/Ionicons';
import VehicleTypeSelection from './modals/VehicleTypeSelection';
import SearchBar from '../screens/modals/SearchBar';
import MapScreen from '../screens/MapScreen';
import SideBar from '../screens/SideBar';
import DestinationScreen from './DestinationScreen';
import { FlatList, GestureHandlerRootView } from 'react-native-gesture-handler';
import { GasConsumptionContext } from '../screens/context/GasConsumptionProvider';
import SQLite from 'react-native-sqlite-storage';
import { useNavigation } from '@react-navigation/native'; // Import useNavigation
import BottomSheet from '@gorhom/bottom-sheet';
import { useDispatch } from 'react-redux';
import { setOrigin, setDestination } from '../slices/navSlice';


const SearchScreen = () => {
  const [isSearchModalVisible, setSearchModalVisible] = useState(false);
  const [isDestinationModalVisible, setDestinationModalVisible] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [selectedOrigin, setSelectingOrigin] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [travelHistory, setTravelHistory] = useState([]);
  const navigation = useNavigation(); 
  const bottomSheetRef = useRef(null); // Create a reference for the BottomSheet
  const dispatch = useDispatch();

  // Define snap points
  const snapPoints = useMemo(() => ['12%', '50%'], []);


  const { gasConsumption, updateGasConsumption } = useContext(GasConsumptionContext);
  const [modalVisible, setModalVisible] = useState(false);

  // SQLite database setup
  const db = SQLite.openDatabase(
    { name: 'gasConsumption.db', location: 'default' },
    () => { console.log('Database opened'); },
    error => { console.log('Error opening database:', error); }
  );

  const getDBConnection = () => {
    return SQLite.openDatabase(
      { name: 'vehicle_data.db', location: 'default' },
      () => console.log('Database opened successfully'),
      (error) => console.error('Failed to open database:', error)
    );
  };
 
  
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
  
  const createTravelHistoryTable = () => {
    const dbs = getDBConnection();
    dbs.transaction(txn => {
      txn.executeSql(
        `CREATE TABLE IF NOT EXISTS travel_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          origin TEXT,
          origin_lat REAL,
          origin_lon REAL,
          destination TEXT,
          destination_lat REAL,
          destination_lon REAL
        )`,
        [],
        () => {
          console.log('Travel history table created successfully.');
        },
        error => {
          console.error('Error creating travel_history table:', error);
        }
      );
    });
  };
  
  
  
  useEffect(() => {
    createTravelHistoryTable(); // Ensure table creation when the component mounts
  }, []);
  
   // Function to load travel history from the database
   const loadTravelHistory = () => {
    const dbs = getDBConnection();
    
    dbs.transaction(txn => {
      txn.executeSql(
        'SELECT * FROM travel_history',
        [],
        (tx, results) => {
          const travelHistoryData = [];
          for (let i = 0; i < results.rows.length; i++) {
            const row = results.rows.item(i);
            travelHistoryData.push({
              id: row.id,
              origin: {
                name: row.origin,
                latitude: row.origin_lat,
                longitude: row.origin_lon,
              },
              destination: {
                name: row.destination,
                latitude: row.destination_lat,
                longitude: row.destination_lon,
              },
            });
          }
          setTravelHistory(travelHistoryData); // Update the state with loaded history
          console.log('Loaded travel history:', travelHistoryData);
        },
        error => {
          console.error('Error loading travel history:', error);
        }
      );
    });
  };

  // Load travel history on component mount
  useEffect(() => {
    loadTravelHistory();
  }, []);

const handleRewind = (item) => {
  const origin = item.origin;
  const destination = item.destination;

  // Ensure both origin and destination contain valid coordinates
  if (origin && destination && origin.latitude && origin.longitude && destination.latitude && destination.longitude) {
    navigation.navigate('DestinationScreen', { origin, destination });
  } else {
    console.error('Invalid coordinates for origin or destination');
  }
};


  const handlePlaceSelect = (origin, destination) => {
    setSelectingOrigin(origin);
    setSelectedDestination(destination);
    setSearchModalVisible(false);

    // Navigate to the DestinationScreen with origin and destination params
    navigation.navigate('DestinationScreen', {
      origin,
      destination,
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Loading...</Text>
      </View>
    );
  }

  // Toggle search modal
  const toggleSearchModal = () => {
    setSearchModalVisible(!isSearchModalVisible);
  };
 

  // Toggle vehicle selection modal
  const toggleModal = () => {
    setModalVisible(!modalVisible);
  };
  useEffect(() => {
    console.log('Gas Consumption:', gasConsumption);
    console.log('Selected Origin:', selectedOrigin);
    console.log('Selected Destination:', selectedDestination);
  }, [gasConsumption, selectedOrigin, selectedDestination]);
  
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Loading...</Text>
      </View>
    );
  }
  

  
  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
         <GestureHandlerRootView style={{ flex: 1 }}>
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
     
          <VehicleTypeSelection
            modalVisible={modalVisible}
            toggleModal={toggleModal}
            onSaveGasConsumption={updateGasConsumption} // Use updateGasConsumption
          />
      
      </View>

      {/* SearchBar Modal */}
      <SearchBar
        modalVisible={isSearchModalVisible}
        toggleModal={toggleSearchModal}
        onPlaceSelect={handlePlaceSelect}
        gasConsumption={gasConsumption}
      />

    {/* Bottom sheet for search bar */}
    <BottomSheet
        ref={bottomSheetRef}
        index={0} // Initial index of the bottom sheet
        snapPoints={snapPoints}
        enablePanDownToClose={false} // Allows the sheet to close by panning down
      >
        <View style={styles.searchBarContainer}>
          <Ionicons name="search" size={30} color="black" style={styles.searchIcon} />
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

{/* Travel History List */}
<View style={styles.historyContainer}>
  {/* Recent Text */}
  <Text style={styles.recentText}>Recent</Text>

  {/* Travel History List */}
  {travelHistory.length > 0 ? (
   <FlatList
   data={travelHistory}
   keyExtractor={item => item.id.toString()}
   renderItem={({ item }) => (
     <TouchableOpacity style={styles.historyItem} onPress={() => handleRewind(item)}>
       <View style={styles.historyIconContainer}>
         <Ionicons name="arrow-redo-circle-outline" size={24} color="black" />
       </View>
       <View style={styles.historyTextContainer}>
         <Text style={styles.historyDestination}>{item.destination.name}</Text>
         {/* Display coordinates below the destination */}
         <Text style={styles.historyCoordinates}>
           ({item.destination.latitude}, {item.destination.longitude})
         </Text>
       </View>
     </TouchableOpacity>
   )}
   contentContainerStyle={{ paddingBottom: 20 }} // Add padding at the bottom to allow scrolling past the last item
   style={{ flexGrow: 1 }} // Ensure the FlatList takes up the available space
   showsVerticalScrollIndicator={false} // Optionally hide the scrollbar
 />
 
   
  ) : (
    <Text style={styles.noHistoryText}>No travel history available.</Text>
  )}
</View>


      </BottomSheet>


      </GestureHandlerRootView>
    </SafeAreaView>
  );
};

export default SearchScreen;

const styles = StyleSheet.create({
  searchBarContainer: {
    backgroundColor: '#fff',
    flexDirection: 'row',
   alignSelf:'center',
    borderRadius: 30,
    paddingVertical: 10,
    paddingHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    width: '97%',
    
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
        marginRight: 5,
        marginTop:5
    },
    micIcon: {
        backgroundColor: 'red',
        padding: 10,
        borderRadius: 50,
    },
    overlayContainer: {
        position: 'absolute',
        bottom: 65,
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
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'white',
    }, historyItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 15,
      backgroundColor: '#fff',
      borderRadius: 8,
      marginBottom: 10,
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 5,
      elevation: 2,
    },
    contentContainer: {
      flex: 1,
      padding: 20,
    },  historyContainer: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      backgroundColor: '#f5f5f5',
      height:'100%',
      borderRadius:30,
      marginTop:10
    },
    historyItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 15,
      backgroundColor: '#fff',
      borderRadius: 8,
      marginBottom: 10,
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 5,
      elevation: 2,
    },
    historyIconContainer: {
      marginRight: 15,
    },
    historyTextContainer: {
      flex: 1,
    },
    historyText: {
      fontSize: 16,
      color: '#333', // Ensure a contrasting color for text
    },
    historyOrigin: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#333',
    },
    historyDestination: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#333',
    },
    recentText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#333',
      marginBottom: 10,
    },  
    noHistoryText: {
      fontSize: 16,
      color: '#999',
      textAlign: 'center',
      marginTop: 20,
    },
});
