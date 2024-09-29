import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const RouteInfoCard = ({ destinationName, viaRoad, onAddStop }) => {


    
  return (
    <View style={styles.cardInfoContainer}>
      {/* Destination Name */}
      <Text style={styles.destinationText}>{destinationName}</Text>

      {/* Via Road */}
      <Text style={styles.viaText}>via {viaRoad}</Text>

      {/* Spacer */}
      <View style={styles.spacer} />

      {/* Timeline Visualization */}
      <View style={styles.timelineContainer}>
        <Ionicons name="navigate-circle" size={24} color="blue" />
        <View style={styles.line} />
        <Ionicons name="flag" size={24} color="red" />
      </View>

      {/* Add Stop Button */}
      <TouchableOpacity onPress={onAddStop}>
        <Text style={styles.addStopText}>Add Stop</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  cardInfoContainer: {
    backgroundColor: '#f0f0f0',
    padding: 20,
    width: '90%',
    borderRadius: 10,
    position: 'absolute',
    top: 90,
    alignSelf: 'center',
    alignItems: 'center',
    
  },
  destinationText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'black',
  },
  viaText: {
    fontSize: 16,
    color: 'gray',
    marginTop: 5,
  },
  spacer: {
    height: 20,
  },
  timelineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  line: {
    flex: 1,
    height: 2,
    backgroundColor: 'gray',
    marginHorizontal: 5,
  },
  addStopText: {
    fontSize: 16,
    color: '#007AFF',
    marginTop: 10,
  },
});

export default RouteInfoCard;
