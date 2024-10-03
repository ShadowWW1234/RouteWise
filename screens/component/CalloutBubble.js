import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const CalloutBubble = ({ label }) => {
  return (
    <View style={styles.bubbleContainer}>
      <Text style={styles.bubbleText}>{label}</Text>
      <View style={styles.bubblePointer} />
    </View>
  );
};
const styles = StyleSheet.create({
    bubbleContainer: {
      backgroundColor: '#2185d0', // Background color similar to the image
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 5,
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 80, // Adjust for text size
      minHeight: 35,
    },
    bubbleText: {
      color: 'white', // White text color as in the design
      fontWeight: 'bold',
      fontSize: 14,
    },
    bubblePointer: {
      position: 'absolute',
      bottom: -8,
      width: 0,
      height: 0,
      borderLeftWidth: 8,
      borderRightWidth: 8,
      borderTopWidth: 8,
      borderLeftColor: 'transparent',
      borderRightColor: 'transparent',
      borderTopColor: '#2185d0', // Same as bubble background
    },
  });
  

export default CalloutBubble;
