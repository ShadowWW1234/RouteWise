import React, { useState, useRef,useContext } from 'react';
import { Modal, View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { MapStyleContext } from '../context/MapStyleContext';

const MapSelectionModal = ({ modalVisible, toggleModal, onSelectLocation }) => {
  const mapRef = useRef(null); // Reference to the MapView
  const [selectedCoordinates, setSelectedCoordinates] = useState(null); // Default coordinates
  const [userLocation, setUserLocation] = useState(null); // To hold the user's location
  const { mapStyle } = useContext(MapStyleContext); // Access the mapStyle from context

  // Handle the confirmation of the selected location
  const handleConfirm = async () => {
    if (mapRef.current) {
      const centerCoordinates = await mapRef.current.getCenter(); // Get center of the map
      console.log('Center coordinates:', centerCoordinates); // Log the selected coordinates
      setSelectedCoordinates(centerCoordinates); // Update selected coordinates
      onSelectLocation(centerCoordinates); // Pass coordinates back to parent
      toggleModal(); // Close the modal
    }
  };

  // Handle updates to the user's location
  const handleUserLocationUpdate = (location) => {
    const { coords } = location;
    const newCoordinates = [coords.longitude, coords.latitude]; // Set as [longitude, latitude]
    setUserLocation(newCoordinates);
    // Set initial selected coordinates to user location on first update
    if (!selectedCoordinates) {
      setSelectedCoordinates(newCoordinates);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={modalVisible}
      onRequestClose={toggleModal}
    >
      <View style={styles.modalContainer}>
        <MapboxGL.MapView
          ref={mapRef} // Attach ref to MapView
          style={styles.map}
          styleURL={mapStyle}
        >
          <MapboxGL.Camera
            centerCoordinate={
              selectedCoordinates || userLocation // Center on selected or user location
            }
            zoomLevel={14}
            animationMode="none" // Disable animation mode
          />
          <MapboxGL.UserLocation
            onUpdate={handleUserLocationUpdate} // Update user location on change
          />
        </MapboxGL.MapView>

        {/* Fixed annotation in the center */}
        <View style={styles.fixedAnnotation}>
          <Ionicons name="pin" size={40} color="red" />
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.closeButton} onPress={toggleModal}>
            <Ionicons name="close" size={32} color="black" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
            <Text style={styles.confirmText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  map: {
    flex: 1,
  },
  fixedAnnotation: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -20 }, { translateY: -40 }], // Adjust to center the icon
    zIndex: 10, // Ensure it appears above the map
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  closeButton: {
    padding: 10,
  },
  confirmButton: {
    padding: 10,
  },
  confirmText: {
    fontSize: 18,
    color: '#007BFF',
  },
});

export default MapSelectionModal;
