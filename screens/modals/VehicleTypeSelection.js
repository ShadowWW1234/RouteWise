import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Modal,
  Dimensions,
  Animated,
  TouchableOpacity,
  FlatList,
  Switch,
  StyleSheet,
  Image,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import GasConsumptionModal from './GasConsumptionModal';
import SQLite from 'react-native-sqlite-storage';

SQLite.DEBUG(true);
SQLite.enablePromise(false); // Set to false to handle sync mode

// Open the SQLite database using synchronous mode
const getDBConnection = () => {
  const db = SQLite.openDatabase(
    { name: 'vehicle_data.db', location: 'default' },
    () => {
      console.log('Database opened successfully');
    },
    (error) => {
      console.error('Failed to open database:', error);
    }
  );
  return db;
};

const initializeDatabase = () => {
  const db = getDBConnection();
  db.transaction(
    (tx) => {
      // Drop the table and recreate to ensure it uses the latest schema
      tx.executeSql('DROP TABLE IF EXISTS VehicleSelection;', [], () => {
        console.log('Dropped existing table');
      });

      // Create the table again
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS VehicleSelection (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          vehicleType TEXT,
          gasConsumption REAL,  
          gasType TEXT
        );`,
        [],
        () => {
          console.log('Table created successfully');
        },
        (error) => {
          console.error('Error creating table:', error);
        }
      );
    },
    (error) => {
      console.error('Transaction error:', error);
    },
    () => {
      console.log('Transaction successful');
    }
  );
};

const { width } = Dimensions.get('window');


// Vehicle array
const vehicles = [
  { type: 'Motorcycle', image: require('../../assets/motor.png') },
  { type: 'Rickshaw', image: require('../../assets/tri.png') },
  { type: 'Car', image: require('../../assets/car.png') },
];
const gasTypes = ['Diesel', 'Gas']; // Example gas types

// Option data for flat list
const options = [
  { id: '1', label: 'Preferred gas type', icon: 'gas-station' },
  { id: '2', label: 'Gas consumption', icon: 'gauge' },
  { id: '3', label: 'Fastest Route', icon: 'road-variant', toggle: true },
];

const VehicleTypeSelection = ({ modalVisible, toggleModal, onSaveGasConsumption }) => {
  const [selectedVehicleIndex, setSelectedVehicleIndex] = useState(0);
  const [fastestRouteEnabled, setFastestRouteEnabled] = useState(true); // Default to true
  const scrollRef = useRef(null);
  const animatedValues = useRef(vehicles.map(() => new Animated.Value(0))).current;

  const ITEM_WIDTH = 140;
  const SPACING = (width - ITEM_WIDTH) / 2;

  const [isGasConsumptionModalVisible, setGasConsumptionModalVisible] = useState(false);
  const [gasConsumption, setGasConsumption] = useState(''); // Gas consumption input
  const [preferredGasType, setPreferredGasType] = useState('Diesel'); // Default gas type
  const [isGasTypeModalVisible, setGasTypeModalVisible] = useState(false); // State for modal visibility

  useEffect(() => {
    initializeDatabase();
  }, []);


  const loadSavedData = () => {
  if (modalVisible) {
    try {
      const db = getDBConnection();
      db.transaction((tx) => {
        tx.executeSql('SELECT * FROM VehicleSelection ORDER BY id DESC LIMIT 1;', [], (tx, results) => {
          console.log('Fetching saved data from database...');

          if (results.rows.length > 0) {
            const row = results.rows.item(0);
            console.log('Saved data found:', row);

            // Declare vehicleIndex in this scope
            const vehicleIndex = vehicles.findIndex(v => v.type === row.vehicleType);


            if (vehicleIndex !== -1) {
              setSelectedVehicleIndex(vehicleIndex);
              console.log('Scrolling to vehicle index:', vehicleIndex); // Log the index
              
              // Programmatically scroll to the selected vehicle
              if (scrollRef.current) {
                scrollRef.current.scrollTo({
                  x: vehicleIndex * ITEM_WIDTH,
                  animated: true,
                });
              }
            } else {
              console.error('Vehicle type not found in the array:', row.vehicleType);
            }

            setGasConsumption(row.gasConsumption);  // Gas consumption value from the database
            setPreferredGasType(row.gasType);  // Gas type value from the database

            console.log('Vehicle type:', row.vehicleType);
            console.log('Gas consumption:', row.gasConsumption);
            console.log('Gas type:', row.gasType);

            setTimeout(() => {
              if (scrollRef.current) {
                scrollRef.current.scrollTo({
                  x: vehicleIndex * ITEM_WIDTH,
                  animated: true,
                });
              }
            }, 100); // Adjust timeout duration as necessary
            
          } else {
            console.log('No saved data found in the database.');
          }
        });
      });
    } catch (error) {
      console.error('Failed to load saved data from SQLite:', error);
    }
  }
};

  
  
  useEffect(() => {
    if (modalVisible) {
      loadSavedData(); // Load data when the modal becomes visible
    }
  }, [modalVisible]);
  
  const onScroll = (event) => {
    const xOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(xOffset / ITEM_WIDTH);
    setSelectedVehicleIndex(index);
  };

  const handleSave = () => {
    // Log the gasConsumption before saving
    console.log('Gas consumption before saving vehicle:', gasConsumption);
    
    // Ensure gasConsumption is valid (use default value if not provided)
    const validGasConsumption = !isNaN(parseFloat(gasConsumption)) && gasConsumption !== '' ? parseFloat(gasConsumption) : 0;
    
    console.log('Saving vehicle data with gas consumption:', {
      vehicleType: vehicles[selectedVehicleIndex].type,
      gasConsumption: validGasConsumption,
      gasType: preferredGasType,
    });
    
    try {
      const db = getDBConnection();
      db.transaction((tx) => {
        tx.executeSql(
          'INSERT INTO VehicleSelection (vehicleType, gasConsumption, gasType) VALUES (?, ?, ?);',
          [vehicles[selectedVehicleIndex].type, validGasConsumption, preferredGasType],
          (tx, results) => {
            console.log('Data successfully saved to database:', {
              vehicleType: vehicles[selectedVehicleIndex].type,
              gasConsumption: validGasConsumption,
              gasType: preferredGasType,
            });
          },
          (tx, error) => {
            console.error('Failed to save vehicle data:', error);
          }
        );
      });
      toggleModal(); // Close the modal
    } catch (error) {
      console.error('Failed to save vehicle data to SQLite:', error);
    }
  };
  
  
  // Function to open gas type modal
  const openGasTypeModal = () => setGasTypeModalVisible(true);
  const toggleGasConsumptionModal = () => {
    setGasConsumptionModalVisible(!isGasConsumptionModalVisible);
  };

  const saveGasConsumption = (value) => {
    const parsedValue = parseFloat(value);
    if (!isNaN(parsedValue)) {
      setGasConsumption(parsedValue.toString()); // Update the gas consumption in VehicleSelection
      console.log('Gas consumption set to:', parsedValue);
    } else {
      setGasConsumption('0');  // If invalid, set to 0
    }
    toggleGasConsumptionModal(); // Close the modal after saving
  };
  

  const selectGasType = (type) => {
    setPreferredGasType(type);
    setGasTypeModalVisible(false);
  };

  const renderVehicleOptions = () => {
    return vehicles.map((vehicle, index) => {
      const isSelected = index === selectedVehicleIndex;

      const opacity = animatedValues[index].interpolate({
        inputRange: [0, 1],
        outputRange: [0.5, 1],
      });

      const scale = animatedValues[index].interpolate({
        inputRange: [0, 1],
        outputRange: [0.8, 1],
      });

      Animated.timing(animatedValues[index], {
        toValue: isSelected ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }).start();

      return (
        <Animated.View
          key={vehicle.type}
          style={[styles.vehicleOption, { opacity, transform: [{ scale }] }, isSelected && styles.selectedVehicleOption]}
        >
          <Animated.Image
            source={vehicle.image}
            style={[styles.vehicleImage, isSelected ? styles.selectedVehicleImage : styles.unselectedVehicleImage]}
          />
          <Text style={isSelected ? styles.selectedVehicleText : styles.vehicleText}>{vehicle.type}</Text>
        </Animated.View>
      );
    });
  };

  const renderOptionItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => {
        if (item.id === '1') openGasTypeModal();
        if (item.id === '2') toggleGasConsumptionModal();
      }}
      style={styles.optionItem}
    >
      <View style={styles.iconCircle}>
        <MaterialCommunityIcons name={item.icon} size={24} color="white" />
      </View>
      <View style={styles.optionContent}>
        <Text style={styles.optionLabel}>{item.label}</Text>
        {item.id === '1' && <Text style={styles.optionValue}>{preferredGasType}</Text>}
        {item.id === '2' && <Text style={styles.optionValue}>{gasConsumption} km/L</Text>}
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={toggleModal}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.title}>Vehicle Selection</Text>

            <ScrollView
  ref={scrollRef}
  horizontal
  showsHorizontalScrollIndicator={false}
  snapToInterval={ITEM_WIDTH}  // Ensure this is the correct width for snapping
  decelerationRate="fast"
  snapToAlignment="center"
  contentContainerStyle={{ paddingHorizontal: SPACING }}
  onScroll={onScroll}  
  scrollEventThrottle={16}
>
  {renderVehicleOptions()}
</ScrollView>


            <View style={styles.divider} />

            <FlatList
              data={options}
              renderItem={renderOptionItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.flatListContainer}
            />

            <View style={styles.divider} />

            <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
              <Text style={styles.saveButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <GasConsumptionModal
  isVisible={isGasConsumptionModalVisible}
  toggleModal={toggleGasConsumptionModal}
  saveConsumption={saveGasConsumption}  // Pass this function to the modal
/>

      <Modal visible={isGasTypeModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.gasTypeModalContent}>
            <Text style={styles.modalTitle}>Select Gas Type</Text>
            <View style={styles.gasTypeGrid}>
              {gasTypes.map((type) => (
                <TouchableOpacity key={type} onPress={() => selectGasType(type)} style={styles.gasTypeBox}>
                  <Image source={require('../../assets/nozzle.png')} style={styles.gasTypeImage} />
                  <Text style={styles.gasTypeText}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};
const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: Dimensions.get('window').height * 0.68,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: 'black',
    textAlign: 'center',
  },
  vehicleOption: {
    alignItems: 'center',
    width: 140,
    paddingVertical: 5,
  },
  selectedVehicleOption: {
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    padding: 10,
    marginBottom: 20,
  },
  vehicleImage: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
  },
  selectedVehicleImage: {
    width: 120,
    height: 120,
  },
  unselectedVehicleImage: {
    width: 80,
    height: 80,
  },
  vehicleText: {
    fontSize: 16,
    color: 'black',
  },
  selectedVehicleText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    marginBottom: 10,
  },
  flatListContainer: {
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#f9f9f9',
    marginVertical: 5,
    borderRadius: 10,
  },
  iconCircle: {
    backgroundColor: '#007AFF',
    borderRadius: 30,
    padding: 10,
    marginRight: 15,
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    color: 'black',
    fontWeight: 'bold',
  },
  optionValue: {
    fontSize: 14,
    color: 'gray',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 50,
    alignItems: 'center',
  },
  saveButtonText: {
    fontWeight: 'bold',
    color: 'white',
    fontSize: 20,
  },gasTypeOption: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  gasTypeText: {
    fontSize: 18,
    color: 'black',
  }, gasTypeModalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 20,
    width: '90%',
    alignSelf: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  gasTypeGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 20, // Add space between the boxes
  },
  gasTypeBox: {
    width: '45%', // Two items per row
    alignItems: 'center',
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    borderWidth: 2, // Adding border
    borderColor: '#007AFF', // Border color
  },
  gasTypeImage: {
    width: 50,
    height: 50,
    marginBottom: 10,
  },
  gasTypeText: {
    fontSize: 20,
    color: 'black',
    fontWeight:'bold'
  },
});

export default VehicleTypeSelection;
