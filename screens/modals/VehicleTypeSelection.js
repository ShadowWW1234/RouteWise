import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  Modal,
  Dimensions,
  Animated,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

// Declare vehicles array outside the component to ensure it's defined
const vehicles = [
  { type: 'Motorcycle', image: require('../../assets/motor.png') },
  { type: 'Rickshaw', image: require('../../assets/tri.png') },
  { type: 'Car', image: require('../../assets/car.png') },
  // Add more vehicles if needed...
];

const VehicleTypeSelection = ({ modalVisible, toggleModal }) => {
  const [selectedVehicleIndex, setSelectedVehicleIndex] = useState(0); // Default index
  const scrollRef = useRef(null);
  const animatedValues = useRef(vehicles.map(() => new Animated.Value(0))).current; // Store animated values for each vehicle

  const ITEM_WIDTH = 140; // Width of each item in the scroll
  const SPACING = (width - ITEM_WIDTH) / 2; // Space to keep the center item in view

  // Restore the saved vehicle when the modal opens
  useEffect(() => {
    const loadSelectedVehicle = async () => {
      if (modalVisible) {
        try {
          const savedIndex = await AsyncStorage.getItem('selectedVehicleIndex');
          if (savedIndex !== null) {
            setSelectedVehicleIndex(Number(savedIndex));
            scrollRef.current?.scrollTo({ x: Number(savedIndex) * ITEM_WIDTH, animated: true });
          }
        } catch (error) {
          console.error('Failed to load the selected vehicle from AsyncStorage:', error);
        }
      }
    };
    loadSelectedVehicle();
  }, [modalVisible]);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const xOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(xOffset / ITEM_WIDTH);
    setSelectedVehicleIndex(index);
  };

  const handleSave = async () => {
    try {
      // Save the selected vehicle index to AsyncStorage
      await AsyncStorage.setItem('selectedVehicleIndex', selectedVehicleIndex.toString());
      toggleModal(); // Close the modal after saving
    } catch (error) {
      console.error('Failed to save the selected vehicle:', error);
    }
  };

  const renderVehicleOptions = () => {
    return vehicles.map((vehicle, index) => {
      const isSelected = index === selectedVehicleIndex;

      // Animate opacity and scale based on whether the item is selected
      const opacity = animatedValues[index].interpolate({
        inputRange: [0, 1],
        outputRange: [0.5, 1], // Fades from 50% opacity to 100%
      });

      const scale = animatedValues[index].interpolate({
        inputRange: [0, 1],
        outputRange: [0.8, 1], // Scales from 0.8x to 1x
      });

      // Trigger the animation when the item is selected
      Animated.timing(animatedValues[index], {
        toValue: isSelected ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }).start();

      return (
        <Animated.View
          key={vehicle.type}
          style={[
            styles.vehicleOption,
            { opacity, transform: [{ scale }] },
            isSelected && styles.selectedVehicleOption,
          ]}
        >
          <Animated.Image
            source={vehicle.image}
            style={[
              styles.vehicleImage,
              isSelected ? styles.selectedVehicleImage : styles.unselectedVehicleImage,
            ]}
          />
          <Text style={isSelected ? styles.selectedVehicleText : styles.vehicleText}>
            {vehicle.type}
          </Text>
        </Animated.View>
      );
    });
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={toggleModal}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>Vehicle Type</Text>

          <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={ITEM_WIDTH} // Snap to each item width
            decelerationRate="fast"
            snapToAlignment="center"
            contentContainerStyle={{ paddingHorizontal: SPACING }}
            onScroll={onScroll}
            scrollEventThrottle={16} // Ensures smooth scrolling
          >
            {renderVehicleOptions()}
          </ScrollView>

          <View style={styles.divider} />

          <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#a5a8a8',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: Dimensions.get('window').height * 0.5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: 'white',
    textAlign: 'center',
  },
  vehicleOption: {
    alignItems: 'center',
    width: 140, // Match the ITEM_WIDTH
    paddingVertical: 20,
  },
  selectedVehicleOption: {
    borderWidth: 4,
    borderColor: 'red',
    borderRadius: 20,
    backgroundColor: 'white',
    marginBottom: 20,
    height:200
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
    color: 'white',
  },
  selectedVehicleText: {
    fontSize: 16,
    color: 'blue',
    fontWeight: 'bold',
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: 'gray',
    marginBottom: 10,
  },
  saveButton: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 50,
    alignItems: 'center',
  },
  saveButtonText: {
    fontWeight: 'bold',
    color: 'black',
    fontSize: 20,
  },
});

export default VehicleTypeSelection;
