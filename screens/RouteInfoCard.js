import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Animated, Easing } from 'react-native';

const RouteInfoCard = ({ destinationName, viaRoad, onAddStop, progress, congestionSegments = [] }) => {
    const [lineWidth, setLineWidth] = useState(0);
    const animatedValue = useRef(new Animated.Value(0)).current;

    // Clamp progress between 0 and 1
    const clampedProgress = Math.min(Math.max(progress, 0), 1);

    useEffect(() => {
      Animated.timing(animatedValue, {
          toValue: clampedProgress,
          duration: 500, // Adjust for smoothness
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
      }).start();
    }, [clampedProgress]);

    // Interpolate progress for the car icon position
    const translateX = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0, lineWidth - 40], // Adjust for car icon size (40 is icon width)
    });

    return (
        <View style={styles.cardInfoContainer}>
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
                
                {/* Background Line (unfilled) */}
                <View style={styles.routeLine} />
      {/* Car Icon (positioned above the line) */}
      {lineWidth > 0 && (
                    <Animated.View style={[styles.carIcon, { transform: [{ translateX }] }]}>
                        <Image source={require('../assets/car.png')} style={styles.image} />
                    </Animated.View>
                )}
                {/* Filled Line (traversed route in blue) */}
                {lineWidth > 0 && (
                    <Animated.View
                        style={[
                            styles.traversedLine,
                            {
                                width: animatedValue.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, lineWidth],
                                }),
                            },
                        ]}
                    />
                )}

                {/* Congestion Segments */}
                {congestionSegments.map((segment, index) => (
                    <View
                        key={index}
                        style={[
                            styles.congestionSegment,
                            {
                                width: `${segment.percentage * 100}%`, // Segment width based on percentage
                                left: `${segment.start * 100}%`, // Start position of congestion
                                backgroundColor: segment.color,
                            },
                        ]}
                    />
                ))}

          

                {/* Destination Icon */}
                <View style={styles.destinationIcon}>
                    <Text>🏁</Text>
                </View>
            </View>

            {/* Display Progress Percentage */}
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
        backgroundColor: '#ffffff',
        padding: 20,
        width: '90%',
        borderRadius: 10,
        position: 'absolute',
        top: 90,
        alignSelf: 'center',
        alignItems: 'center',
        shadowColor: '#000',
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
        height: 15,
    },
    timelineContainer: {
        width: '100%',
        height: 20, // Progress bar height
        justifyContent: 'center',
        position: 'relative',
        backgroundColor: '#e0e0e0', // Light gray background for the entire progress bar
        borderRadius: 10,
        overflow: 'hidden', // Ensure elements stay within the progress bar
    },
    routeLine: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 8,
        backgroundColor: '#d3d3d3', // Light gray for the untraversed route
        borderRadius: 10,
    },
    traversedLine: {
        position: 'absolute',
        left: 0,
        height: 18,
        backgroundColor: '#007AFF', // Blue for traversed route
        borderRadius: 10,
    },
    congestionSegment: {
        position: 'absolute',
        top: 0,
        height: '100%', // Full height of the progress bar
        borderRadius: 10,
    },
    carIcon: {
        position: 'absolute',
        top: -12, // Adjust to place the car icon above the line
        left:-15,
        zIndex:9999
    },
    destinationIcon: {
        position: 'absolute',
        right: 0,
        top: -15, // Adjust to align with the car icon
    },
    progressText: {
        fontSize: 14,
        color: 'gray',
        marginTop: 10,
    },
    addStopButton: {
        marginTop: 15,
    },
    addStopText: {
        fontSize: 16,
        color: '#007AFF',
    },
    image: {
        width: 40, // Car icon width
        height: 40, // Car icon height
        resizeMode: 'contain',
    },
});

export default RouteInfoCard;
