import React, { useRef, useState, useEffect, useContext } from 'react';
import { StyleSheet, View, Modal, Text, TouchableOpacity, ActivityIndicator } from 'react-native';

const RouteTooltip = ({ routeDuration, isSelected }) => {
    // Helper function to format duration (seconds) to hours and minutes


    return (
      <View style={[styles.tooltipContainer, isSelected && styles.selectedTooltip]}>
        <Text style={styles.tooltipText}>Best route in the shortest time</Text>
        <Text style={styles.durationText}>{formatDuration(routeDuration)}</Text>
      </View>
    );
  };
export default RouteTooltip;  

const styles = StyleSheet.create({
    tooltipContainer: {
      position: 'absolute',
      backgroundColor: 'rgba(0, 0, 0, 0.7)', // Semi-transparent background
      padding: 10,
      borderRadius: 10,
      marginTop: -30, // Adjust based on the position
      marginLeft: 20, // Adjust based on the position
    },
    selectedTooltip: {
      borderColor: 'green', // Highlight for selected route
      borderWidth: 2,
    },
    tooltipText: {
      color: '#fff',
      fontSize: 14,
    },
    durationText: {
      color: '#fff',
      fontSize: 12,
      marginTop: 5,
    }
  });
  