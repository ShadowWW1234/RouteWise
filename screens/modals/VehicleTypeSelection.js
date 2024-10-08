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
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import GasConsumptionModal from './GasConsumptionModal';


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

const VehicleTypeSelection = ({ modalVisible, toggleModal,onSaveGasConsumption  }) => {
  const [selectedVehicleIndex, setSelectedVehicleIndex] = useState(0);
  const [fastestRouteEnabled, setFastestRouteEnabled] = useState(true); // Default to true
  const scrollRef = useRef(null);
  const animatedValues = useRef(vehicles.map(() => new Animated.Value(0))).current;

  const ITEM_WIDTH = 140;
  const SPACING = (width - ITEM_WIDTH) / 2;

  const [isGasConsumptionModalVisible, setGasConsumptionModalVisible] = useState(false);
  const [gasConsumption, setGasConsumption] = useState(''); // Gas consumption input

   // Load previously saved gas consumption and vehicle selection when the modal opens
   useEffect(() => {
    const loadSavedData = async () => {
      if (modalVisible) {
        try {
          const savedVehicleIndex = await AsyncStorage.getItem('selectedVehicleIndex');
          const savedGasConsumption = await AsyncStorage.getItem('gasConsumption');

          if (savedVehicleIndex !== null) {
            setSelectedVehicleIndex(Number(savedVehicleIndex));
            // Scroll to the previously selected vehicle
            scrollRef.current?.scrollTo({ x: Number(savedVehicleIndex) * ITEM_WIDTH, animated: true });
          }

          if (savedGasConsumption !== null) {
            setGasConsumption(savedGasConsumption); // Load saved gas consumption into state
          }
        } catch (error) {
          console.error('Failed to load saved data from AsyncStorage:', error);
        }
      }
    };

    loadSavedData();
  }, [modalVisible]);
  
  const onScroll = (event) => {
    const xOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(xOffset / ITEM_WIDTH);
    setSelectedVehicleIndex(index);
  };

  // Handle saving the selected vehicle and gas consumption
  const handleSave = async () => {
    try {
      // Save selected vehicle index and gas consumption to AsyncStorage
      await AsyncStorage.setItem('selectedVehicleIndex', selectedVehicleIndex.toString());
      await AsyncStorage.setItem('gasConsumption', gasConsumption);

      // Update gas consumption in the parent component via context
      onSaveGasConsumption(parseFloat(gasConsumption));

      toggleModal(); // Close the modal after saving
    } catch (error) {
      console.error('Failed to save the selected vehicle or gas consumption:', error);
    }
  };

const [preferredGasType, setPreferredGasType] = useState('Diesel'); // Default gas type
const [isGasTypeModalVisible, setGasTypeModalVisible] = useState(false); // State for modal visibility

// Function to open gas type modal
const openGasTypeModal = () => setGasTypeModalVisible(true);
const toggleGasConsumptionModal = () => {
  setGasConsumptionModalVisible(!isGasConsumptionModalVisible);
};

const saveGasConsumption = () => {
  // Logic to save the gas consumption data
  console.log("Gas Consumption Saved: ", gasConsumption);
  toggleGasConsumptionModal(); // Close modal after saving
};

// Function to handle gas type selection
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

const renderOptionItem = ({ item }) => {
  return (
    <TouchableOpacity
      onPress={() => {
        if (item.id === '1') openGasTypeModal(); // For Preferred gas type
        if (item.id === '2') toggleGasConsumptionModal(); // For Gas consumption
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
      {item.toggle && (
        <Switch
          value={fastestRouteEnabled}
          onValueChange={(value) => setFastestRouteEnabled(value)}
        />
      )}
    </TouchableOpacity>
  );
};

  
  

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
            snapToInterval={ITEM_WIDTH}
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
  saveConsumption={(value) => setGasConsumption(value)}  // Correctly update consumption
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
