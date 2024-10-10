import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { GasConsumptionContext } from '../context/GasConsumptionProvider';

const GasConsumptionModal = ({ isVisible, toggleModal, saveConsumption }) => {
  const [consumption, setConsumption] = useState('');  // For TextInput field
  const { gasConsumption } = useContext(GasConsumptionContext);  // Get gas consumption from context

  // Set initial value of the input field when modal opens
  useEffect(() => {
    if (isVisible) {
      setConsumption(gasConsumption ? gasConsumption.toString() : '');  // Set initial value when the modal becomes visible
    }
  }, [isVisible, gasConsumption]);

  const handleSave = () => {
    const parsedConsumption = parseFloat(consumption.trim());  // Trim any extra spaces

    console.log('Parsed consumption before save:', parsedConsumption);

    if (!isNaN(parsedConsumption) && parsedConsumption > 0) {
      saveConsumption(parsedConsumption);  // Call the save function passed from VehicleTypeSelection
      console.log('Updating gas consumption:', parsedConsumption);
      toggleModal();  // Close the modal after saving
    } else {
      Alert.alert('Invalid Input', 'Please enter a valid number greater than 0');  // Show an error alert
      console.error('Invalid consumption value:', consumption);
    }
  };

  return (
    <Modal visible={isVisible} animationType="slide" transparent={true}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Enter Fuel Consumption (km/L)</Text>

          <TextInput
            style={styles.inputField}
            placeholder="Enter km/L"
            keyboardType="numeric"
            value={consumption}
            onChangeText={(value) => setConsumption(value)}  // Handle input value
          />

          <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={toggleModal} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 20,
    width: '80%',
    alignSelf: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 20,
    color: 'black',
  },
  inputField: {
    width: '100%',
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 20,
    color: 'black',
    textAlign: 'center',
    textAlignVertical: 'center',  // For Android
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
  },
  cancelButton: {
    marginTop: 10,
  },
  cancelButtonText: {
    color: 'red',
    fontSize: 16,
  },
});

export default GasConsumptionModal;
