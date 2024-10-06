import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const CalloutBubble = ({ label }) => {
  return (
    <View style={styles.container}>
      <View style={styles.bubbleContainer}>
        <Text style={styles.bubbleText}>{label}</Text>
      </View>
      <View style={styles.bubblePointerContainer}>
        <View style={styles.bubblePointer} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  bubbleContainer: {
    backgroundColor: '#2185d0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  bubblePointerContainer: {
    alignItems: 'center',
    marginTop: -2, // Reduced to align pointer better
  },
  bubblePointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 10, // Adjusted pointer size
    borderRightWidth: 10,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#2185d0', // Matches bubble color
  },
  bubbleText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default CalloutBubble;
