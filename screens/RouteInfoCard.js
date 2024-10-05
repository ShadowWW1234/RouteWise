// RouteInfoCard.js
import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image,TouchableOpacity, Animated, Easing } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const RouteInfoCard = ({ destinationName, viaRoad, onAddStop, progress }) => {
    const [lineWidth, setLineWidth] = useState(0);
    const animatedValue = useRef(new Animated.Value(0)).current;

    // Clamp progress between 0 and 1
    const clampedProgress = Math.min(Math.max(progress, 0), 1);

    useEffect(() => {
      Animated.timing(animatedValue, {
          toValue: clampedProgress,
          duration: 500, // Adjust for smoothness
          easing: Easing.out(Easing.ease), // Corrected easing function
          useNativeDriver: false, // Width cannot be animated with native driver
      }).start();
  }, [clampedProgress, animatedValue]);

  Animated.timing(animatedValue, {
    toValue: clampedProgress,
    duration: 500, // Adjust for smoothness
    easing: Easing.out(Easing.ease), // Correct usage
    useNativeDriver: false, // Width cannot be animated with native driver
}).start();

    // Interpolate progress for the '>' icon position
    const translateX = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0, lineWidth - 24], // 24 is the icon width
    });

    return (
        <View style={styles.cardInfoContainer} accessible={true} accessibilityLabel={`Route progress: ${Math.round(clampedProgress * 100)} percent completed`}>
            {/* Destination Name */}
            <Text style={styles.destinationText}>{destinationName}</Text>

            {/* Via Road */}
            <Text style={styles.viaText}>via {viaRoad}</Text>

            {/* Spacer */}
            <View style={styles.spacer} />

            {/* Progress Visualization */}
            <View
                style={styles.timelineContainer}
                onLayout={(event) => {
                    const { width } = event.nativeEvent.layout;
                    setLineWidth(width);
                }}
            >
                {/* Remaining Route Line */}
                <View style={styles.routeLine} />

                {/* Traversed Route Line */}
                {lineWidth > 0 && (
                    <Animated.View
                        style={[
                            styles.traversedLine,
                            {
                                width: lineWidth * clampedProgress,
                            },
                        ]}
                    />
                )}

                {/* Moving '>' Icon */}
                {lineWidth > 0 && (
                    <Animated.View style={[styles.marker, { transform: [{ translateX }] }]}>
                        <Image
        source={require('../assets/car.png')} // Path to the image
        style={styles.image}
      />
                    </Animated.View>
                )}

                {/* Destination '' Icon */}
                <View style={styles.destinationIcon}>
                     <Text>🏁</Text>
                </View>
            </View>

            {/* Optional: Display Progress Percentage */}
            <Text style={styles.progressText}>{Math.round(clampedProgress * 100)}% Completed</Text>

            {/* Add Stop Button */}
            <TouchableOpacity onPress={onAddStop} style={styles.addStopButton}>
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
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,

        elevation: 5,
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
        width: '100%',
        height: 40, // Adjust height based on icon size
        justifyContent: 'center',
        position: 'relative',
    },
    routeLine: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: 2,
      borderStyle: 'dashed',
      borderWidth: 1,
      borderColor: '#d3d3d3', // Light gray dashed line
      borderRadius: 1,
  },
  
    traversedLine: {
        position: 'absolute',
        left: 0,
        height: 2,
        backgroundColor: '#007AFF', // Blue for traversed route
    },
    marker: {
        position: 'absolute',
        top: -10, // Adjust to align with the line
        // left is controlled by translateX
    },
    destinationIcon: {
        position: 'absolute',
        right: 0,
        top: -10, // Adjust to align with the line
    },
    progressText: {
        fontSize: 14,
        color: 'gray',
        marginTop: 8,
    },
    addStopButton: {
        marginTop: 15,
    },
    addStopText: {
        fontSize: 16,
        color: '#007AFF',
    }, image: {
        width: 30,  // Set the width of the image
        height: 30, // Set the height of the image
        resizeMode: 'contain', // Ensure the image scales properly
      },
});

export default RouteInfoCard;
