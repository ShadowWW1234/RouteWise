import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const Summary = ({ eta, estimatedFuelConsumption, remainingDistance, remainingDuration }) => {


    return (
    <View style={styles.container}>
      {/* Display ETA */}
      <Text style={styles.summaryTitle}>
        {eta ? formatTime(eta) : 'Calculating ETA...'}
      </Text>

      <Text style={styles.summaryText}>
  <MaterialCommunityIcons name="gas-station" size={24} color="red" />{' '}
  {estimatedFuelConsumption ? `${estimatedFuelConsumption} L` : '...'}{' '}
  <MaterialCommunityIcons name="road" size={20} color="blue" />{' '}
  {remainingDistance ? `${(remainingDistance / 1000).toFixed(2)} km` : '...'}{' '}
  <MaterialCommunityIcons name="bus-clock" size={20} color="blue" />{' '}
  {remainingDuration ? formatDuration(remainingDuration) : '...'}
</Text>
    </View>
  );
};

export default Summary;

const formatTime = (date) => {
    if (!date || isNaN(date.getTime())) return 'N/A'; // Check for invalid Date objects
  
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
  
    return `${hours12}:${minutesStr} ${ampm}`;
  };
  

const formatDuration = (durationInSeconds) => {
  const minutes = Math.floor(durationInSeconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours > 0) {
    return `${hours} hr ${remainingMinutes} min`;
  } else {
    return `${remainingMinutes} min`;
  }
};

/** Styles */
const styles = StyleSheet.create({
  container: {
   marginTop:-15,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginVertical: 8,
    color:'black',
    alignItems:'center'
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color:'black'
  },
  summaryText: {
    fontSize: 16,
    flexDirection: 'row',
    alignItems: 'center',
    color:'black'
  },
});
