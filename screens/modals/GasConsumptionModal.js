import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

const GasConsumptionModal = ({ isVisible, toggleModal, saveConsumption }) => {
    const [consumption, setConsumption] = useState('');
  
    const handleSave = () => {
      if (consumption !== '') {
        saveConsumption(consumption); // Save consumption value to parent
        toggleModal(); // Close modal after saving
      } else {
        alert('Please enter your fuel consumption');
      }
    };
  
    return (
      <Modal visible={isVisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter Fuel Consumption (km/L)</Text>
  
            <TextInput
              style={styles.inputField}
              placeholder="Enter L/km"
              keyboardType="numeric"
              value={consumption}  
              onChangeText={setConsumption}  // Correctly update consumption
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
    color:'black'
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
    textAlign: 'center', // Centers text horizontally
    textAlignVertical: 'center', // Centers text vertically (only works on Android)
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
