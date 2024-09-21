import React from 'react';
import {
  View,
  Text,
  Switch,
  TouchableOpacity, 
  ScrollView,
  Image,
  StyleSheet,
  Modal,
  Dimensions
} from 'react-native';
 import tw from "tailwind-react-native-classnames";

const VehicleTypeSelection = ({ modalVisible, toggleModal }) => {
  const [selectedVehicle, setSelectedVehicle] = React.useState('Motorcycle');
  const [fastestRoute, setFastestRoute] = React.useState(false);

  const handleVehicleSelect = (vehicle) => {
    setSelectedVehicle(vehicle);
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

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.vehicleList}>
            <TouchableOpacity
              onPress={() => handleVehicleSelect('Motorcycle')}
              style={[
                styles.vehicleOption,
                selectedVehicle === 'Motorcycle' && styles.selectedVehicleOption, // Apply border if selected
              ]}
            >
              <Image source={require('../../assets/motor.png')} style={styles.vehicleImage} />
              <Text style={selectedVehicle === 'Motorcycle' ? styles.selectedVehicleText : styles.vehicleText}>Motorcycle</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleVehicleSelect('Rickshaw')}
              style={[
                styles.vehicleOption,
                selectedVehicle === 'Rickshaw' && styles.selectedVehicleOption, // Apply border if selected
              ]}
            >
              <Image source={require('../../assets/tri.png')} style={styles.vehicleImage} />
              <Text style={selectedVehicle === 'Rickshaw' ? styles.selectedVehicleText : styles.vehicleText}>Rickshaw</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleVehicleSelect('Car')}
              style={[
                styles.vehicleOption,
                selectedVehicle === 'Car' && styles.selectedVehicleOption, // Apply border if selected
              ]}
            >
              <Image source={require('../../assets/car.png')} style={styles.vehicleImage} />
              <Text style={selectedVehicle === 'Car' ? styles.selectedVehicleText : styles.vehicleText}>Car</Text>
            </TouchableOpacity>

            {/* Add more vehicle types here */}
          </ScrollView>
   {/* Divider */}
   <View style={[tw`border-t border-gray-300 `,{marginBottom:-10}]} />

          <View style={styles.switchContainer}>
            
            <Text style={tw`text-white`}>Show fastest route</Text>
            <Switch
              value={fastestRoute}
              onValueChange={() => setFastestRoute(!fastestRoute)}
              thumbColor={fastestRoute ? 'white' : 'white'} // Color of the thumb (the round part)
  trackColor={{ false: 'gray', true: 'green' }} // Colors for the track (background of the switch)
            />
          </View>

          <TouchableOpacity onPress={toggleModal} style={styles.saveButton}>
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
    backgroundColor: '#a5a8a8', // Light gray background
   
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: Dimensions.get('window').height * 0.5, // Half-screen height
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color:'white',
    textAlign: 'center', // Center the title
  },
  vehicleList: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  vehicleOption: {
    alignItems: 'center',
    marginHorizontal: 10,
    padding: 10,
  },
  selectedVehicleOption: {
    borderWidth: 4, // Border width for selected vehicle
    borderColor: 'red', // Border color for selected vehicle
    borderRadius: 10, // Rounded corners
    backgroundColor:'white',
    marginBottom:20
  },
  vehicleImage: {
    width: 120,
    height: 120,
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
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 20,
  },
  saveButton: {
    backgroundColor: 'white',
 
    padding: 15,
    borderRadius: 50,
    alignItems: 'center',
  },
  saveButtonText: {
    fontWeight:'bold',
    color:'black',
    fontSize: 20,
  },
});

export default VehicleTypeSelection;
