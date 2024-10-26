import React, { useState, useEffect } from 'react';
import { Modal, View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import NetInfo from '@react-native-community/netinfo'; // Import NetInfo for network checking
import Ionicons from 'react-native-vector-icons/Ionicons';

// Icons for different statuses
const wifiIcon = require('../../assets/wifi.png');
const mobileDataIcon = require('../../assets/mobile_data.png');
const noInternetIcon = require('../../assets/no_internet.png');

const ConnectionStatusModal = ({ modalVisible, toggleModal }) => {
  const [connectionType, setConnectionType] = useState(null); // To store network connection type

  useEffect(() => {
    // Subscribe to network state updates
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected && state.type === 'wifi') {
        setConnectionType('WiFi');
      } else if (state.isConnected && state.type === 'cellular') {
        setConnectionType('Mobile Data');
      } else {
        setConnectionType('No Internet');
      }
    });

    // Cleanup the event listener when component unmounts
    return () => {
      unsubscribe();
    };
  }, []);

  const getStatusIcon = () => {
    switch (connectionType) {
      case 'WiFi':
        return wifiIcon;
      case 'Mobile Data':
        return mobileDataIcon;
      default:
        return noInternetIcon;
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={toggleModal}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Image source={getStatusIcon()} style={styles.icon} resizeMode="contain" />
          <Text style={styles.statusText}>
            {connectionType === 'WiFi'
              ? 'Connected via WiFi'
              : connectionType === 'Mobile Data'
              ? 'Connected via Mobile Data'
              : 'No Internet Connection'}
          </Text>
          <TouchableOpacity style={styles.closeButton} onPress={toggleModal}>
            <Ionicons name="close" size={32} color="black" />
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
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: 300,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 8,
    alignItems: 'center',
  },
  icon: {
    width: 80,
    height: 80,
    marginBottom: 20,
  },
  statusText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'black',
    marginBottom: 20,
  },
  closeButton: {
    padding: 10,
  },
});

export default ConnectionStatusModal;
