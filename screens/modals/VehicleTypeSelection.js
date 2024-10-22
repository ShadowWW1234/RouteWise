import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Image,
  Dimensions,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import GasConsumptionModal from './GasConsumptionModal';
import SQLite from 'react-native-sqlite-storage';

SQLite.DEBUG(false);
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

const gasTypes = ['Diesel', 'Gas']; // Example gas types

// Option data for flat list
const options = [
  { id: '1', label: 'Preferred gas type', icon: 'gas-station' },
  { id: '2', label: 'Gas consumption', icon: 'gauge' },
];

const VehicleTypeSelection = ({ modalVisible, toggleModal, onSaveGasConsumption }) => {
  const [isGasConsumptionModalVisible, setGasConsumptionModalVisible] = useState(false);
  const [gasConsumption, setGasConsumption] = useState(''); // Gas consumption input
  const [preferredGasType, setPreferredGasType] = useState('Diesel'); // Default gas type
  const [isGasTypeModalVisible, setGasTypeModalVisible] = useState(false); // State for modal visibility

  useEffect(() => {
    initializeDatabase();
  }, []);

  const handleSave = () => {
    // Ensure gasConsumption is valid (use default value if not provided)
    const validGasConsumption = !isNaN(parseFloat(gasConsumption)) && gasConsumption !== '' ? parseFloat(gasConsumption) : 0;

    try {
      const db = getDBConnection();
      db.transaction((tx) => {
        tx.executeSql(
          'INSERT INTO VehicleSelection (gasConsumption, gasType) VALUES (?, ?);',
          [validGasConsumption, preferredGasType],
          (tx, results) => {
            console.log('Data successfully saved to database:', {
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
      console.error('Failed to save data to SQLite:', error);
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
            <Text style={styles.title}>Gas Consumption</Text>

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
    height:320
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: 'black',
    textAlign: 'center',
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
  },
  gasTypeModalContent: {
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
    fontWeight: 'bold',
  },
});

export default VehicleTypeSelection;
