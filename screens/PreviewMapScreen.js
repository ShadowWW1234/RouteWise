import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import MapboxGL from '@rnmapbox/maps';  // Correct import for Mapbox
import { MAPBOX_API_TOKEN } from '@env';
import { FlatList } from 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Ionicons from 'react-native-vector-icons/Ionicons';

MapboxGL.setAccessToken(MAPBOX_API_TOKEN);

const PreviewMapScreen = ({ route }) => {
    const { origin, destination, route: selectedRoute } = route.params || {}; // Extract params
    const [currentStepIndex, setCurrentStepIndex] = useState(0); // Track the current turn instruction
    const [isExpanded, setIsExpanded] = useState(true); // Start with the combo box expanded
    const [selectedInstruction, setSelectedInstruction] = useState(null); // Store selected instruction
    const cameraRef = useRef(null);  // Initialize cameraRef using useRef
    console.log('Origin:', origin);
    console.log('Destination:', destination);
    console.log('Selected Route:', selectedRoute);


    if (!origin || !destination || !selectedRoute) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: 'red' }}>Error: Missing required parameters</Text>
            </View>
        );
    }

    // Focus camera on a given location
    const focusOnLocation = (location) => {
        if (cameraRef.current && location) {
            cameraRef.current.setCamera({
                centerCoordinate: [location[0], location[1]],  // Longitude and Latitude of the turn
                zoomLevel: 17,
                animationMode: 'flyTo',
                animationDuration: 1000,
            });
        }
    };

    // Handle item selection without closing the list
    const handleItemPress = (item) => {
        setSelectedInstruction(item);  // Set selected instruction
        focusOnLocation(item.maneuver.location);  // Focus on the selected turn location
    };

    // Determine if the turn is left or right and return corresponding Ionicon name
    const getTurnIcon = (turnType) => {
        if (turnType.includes('left')) {
            return 'return-down-back-outline';  // Left turn icon
        } else if (turnType.includes('right')) {
            return 'return-up-forward-outline';  // Right turn icon
        }
        return 'arrow-up-outline';  // Default icon for straight or unknown
    };

// Focus camera on a given location and tilt with the bearing and maneuver
const focusOnManeuver = (location, bearing) => {
    if (cameraRef.current && location) {
        cameraRef.current.setCamera({
            centerCoordinate: [location[0], location[1]], 
            zoomLevel: 17, 
            bearing: bearing || 0, 
            pitch: 60, 
            animationMode: 'flyTo',
            animationDuration: 1000,
        });
    }
};


// Function to update camera as user progresses through the route
const updateCameraForCurrentStep = (currentStep) => {
    const { location, bearing_after } = currentStep.maneuver;

    if (location && cameraRef.current) {
        cameraRef.current.setCamera({
            centerCoordinate: [location[0], location[1]],
            zoomLevel: 17,  // Adjust zoom level
            bearing: bearing_after || 0,  // Adjust the camera bearing based on the maneuver
            pitch: 60,  // Tilt the camera for passing-through effect
            animationMode: 'flyTo',
            animationDuration: 1000,
        });
    }
};

 
  // Render each instruction with bearing and maneuver
const renderInstruction = ({ item }) => {
    const { location, bearing_after } = item.maneuver;  // Extract maneuver location and bearing

    return (
        <TouchableOpacity
            style={styles.card}
            onPress={() => focusOnManeuver(location, bearing_after)}  // Focus camera with bearing
        >
            <View style={styles.instructionRow}>
                {/* Icon for turn direction */}
                <Ionicons
                    name={getTurnIcon(item.maneuver.instruction)} // Determine if it's left or right
                    size={24}
                    color="#000"
                    style={styles.icon}
                />
                {/* Meters until the turn */}
                <Text style={styles.distanceText}>
                    {Math.round(item.distance)} m {/* Convert distance to meters */}
                </Text>
                {/* Street or road name */}
                <Text style={styles.streetNameText}>
                    {item.name || 'Unknown road'}
                </Text>
            </View>
        </TouchableOpacity>
    );
};
    return (
        <GestureHandlerRootView style={styles.container}>
            <View style={styles.container}>
                <MapboxGL.MapView style={styles.map}>
                    <MapboxGL.Camera
                        ref={cameraRef}  // Attach the cameraRef to the MapboxGL.Camera
                        zoomLevel={14}
                        centerCoordinate={[origin.longitude, origin.latitude]}
                        pitch={60}
                        animationMode="flyTo"
                        animationDuration={1000}
                    />

                    {/* Mapbox annotations for origin and destination */}
                    <MapboxGL.PointAnnotation
                        id="origin"
                        coordinate={[origin.longitude, origin.latitude]}
                    />
                    <MapboxGL.PointAnnotation
                        id="destination"
                        coordinate={[destination.longitude, destination.latitude]}
                    />

                    {/* Render route line */}
                    <MapboxGL.ShapeSource
                        id="previewRouteSource"
                        shape={{
                            type: 'Feature',
                            geometry: {
                                type: 'LineString',
                                coordinates: selectedRoute.coordinates,
                            },
                        }}
                    >
                        <MapboxGL.LineLayer
                            id="previewRouteLayer"
                            style={{
                                lineWidth: 8,
                                lineColor: 'blue',
                                lineOpacity: 0.7,
                            }}
                        />
                    </MapboxGL.ShapeSource>
                </MapboxGL.MapView>

                {/* Combo Box (toggleable between collapsed and expanded state) */}
                <View style={styles.comboBoxContainer}>
                    <TouchableOpacity
                        style={styles.comboBoxHeader}
                        onPress={() => setIsExpanded(!isExpanded)} // Toggle expanded/collapsed state
                    >
                        <Text style={styles.comboBoxHeaderText}>
                            {selectedInstruction
                                ? selectedInstruction.maneuver.instruction // Show selected instruction
                                : "Select a turn instruction"} {/* Default text when no item is selected */}
                        </Text>
                    </TouchableOpacity>

                    {/* Show full list when expanded */}
                    {isExpanded && (
                        <FlatList
                            data={selectedRoute.steps}  // The steps array from selectedRoute
                            renderItem={renderInstruction}  // Render each item
                            keyExtractor={(item, index) => index.toString()}  // Use index as key
                            style={styles.list}  // Add styles for the dropdown list
                        />
                    )}
                </View>
            </View>
        </GestureHandlerRootView>
    );
};

export default PreviewMapScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    map: {
        flex: 1,
    },
    comboBoxContainer: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        backgroundColor: '#fff',
        borderRadius: 8,
        elevation: 3,  // Add shadow for Android
        shadowColor: '#000',  // Shadow for iOS
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.8,
        shadowRadius: 2,
        padding: 10,
    },
    comboBoxHeader: {
        paddingVertical: 10,
        backgroundColor: '#f0f0f0',
        borderRadius: 5,
        alignItems: 'center',
    },
    comboBoxHeaderText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000',
    },
    list: {
        marginTop: 10,
        maxHeight: 200,  // Limit the height of the expanded list
    },
    card: {
        backgroundColor: '#fff',
        padding: 10,
        marginVertical: 5,
        borderRadius: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.6,
        shadowRadius: 1.5,
    },
    instructionRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    icon: {
        marginRight: 10,
    },
    distanceText: {
        fontSize: 14,
        color: '#000',
        marginRight: 10,
    },
    streetNameText: {
        fontSize: 16,
        color: '#000',
        fontWeight: 'bold',
    },
});
