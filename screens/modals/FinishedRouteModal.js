import React from 'react';
import {Modal, View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const FinishedRouteModal = ({isVisible, onClose, routeDetails}) => {
  if (!routeDetails) {
    return null; // Return null if routeDetails is not available
  }

  const {destination, fuelUsed, eta, duration, distance, savedTime} = routeDetails;

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Travel Summary</Text>

          <View style={styles.detailItem}>
            <Ionicons name="location-outline" size={24} color="#4CAF50" />
            <Text style={styles.detailText}>
              <Text style={styles.label}>Destination: </Text>
              {destination.name}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Ionicons name="car-outline" size={24} color="#FFA000" />
            <Text style={styles.detailText}>
              <Text style={styles.label}>Distance: </Text>
              {(distance / 1000).toFixed(2)} km
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Ionicons name="time-outline" size={24} color="#03A9F4" />
            <Text style={styles.detailText}>
              <Text style={styles.label}>Duration:</Text>{' '}
              {formatDuration(duration)}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Ionicons name="calendar-outline" size={24} color="#FF5722" />
            <Text style={styles.detailText}>
              <Text style={styles.label}>ETA: </Text>
              {formatDate(eta)}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Ionicons name="water-outline" size={24} color="#8BC34A" />
            <Text style={styles.detailText}>
              <Text style={styles.label}>Fuel Used: </Text>
              {fuelUsed.toFixed(2)} L
            </Text>
          </View>

          {/* Display Saved Time */}
          {savedTime > 0 && (
            <View style={styles.detailItem}>
              <Ionicons name="timer-outline" size={24} color="#4CAF50" />
              <Text style={styles.detailText}>
                <Text style={styles.label}>Saved Time: </Text>
                {formatDuration(savedTime)}
              </Text>
            </View>
          )}

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const formatDate = date => {
  const options = {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true, // Use 12-hour format
  };
  return new Intl.DateTimeFormat('en-US', options).format(new Date(date));
};


const formatDuration = durationInSeconds => {
  const hours = Math.floor(durationInSeconds / 3600);
  const minutes = Math.floor((durationInSeconds % 3600) / 60);
  const seconds = Math.floor(durationInSeconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 20,
    width: '85%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#2196F3',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    width: '100%', // Ensure each row takes full width for consistent alignment
  },
  detailText: {
    fontSize: 16,
    color: 'black',
    marginLeft: 10,
    flexShrink: 1, // To handle long text wrapping
  },
  label: {
    fontWeight: 'bold',
    color: '#424242',
  },
  closeButton: {
    marginTop: 20,
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 50,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default FinishedRouteModal;
