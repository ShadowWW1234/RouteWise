import React, { useEffect, useState, useRef, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Button, BackHandler, FlatList, Animated } from 'react-native';
import MapboxGL, { LineJoin } from '@rnmapbox/maps';
import * as turf from '@turf/turf';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { MapStyleContext } from './context/MapStyleContext';
import axios from 'axios';

MapboxGL.setAccessToken('pk.eyJ1Ijoic2hhZG93MjI2IiwiYSI6ImNtMTl6d3NnaDFrcWIyanM4M3pwMTYxeDQifQ.wDv2IuFGRpUASw1jx540Ng');

// Helper function to map instructions to Ionicons
const getManeuverIcon = (instruction) => {
    if (instruction.toLowerCase().includes('right')) {
        return "arrow-forward-outline";
    } else if (instruction.toLowerCase().includes('left')) {
        return "arrow-back-outline";
    } else if (instruction.toLowerCase().includes('straight')) {
        return "arrow-up-outline";
    }
    return "navigate-outline"; // Default icon
};

const NavigationScreen = ({ route, navigation }) => {
    const { origin, destination } = route.params || {};
    const [currentPosition, setCurrentPosition] = useState(null);
    const cameraRef = useRef(null);
    const [traversedRoute, setTraversedRoute] = useState([]);
    const [nonTraversedRoute, setNonTraversedRoute] = useState([]);
    const [isFollowing, setIsFollowing] = useState(true); // Track if the camera is following the user
    const [showModal, setShowModal] = useState(false);
    const [showExitModal, setShowExitModal] = useState(false); // Exit navigation modal
    const { mapStyle } = useContext(MapStyleContext);
    const [instructions, setInstructions] = useState([]);
    const [currentInstruction, setCurrentInstruction] = useState('');
    const [showRecenter, setShowRecenter] = useState(false); // Show recenter button when not following
    const [speed, setSpeed] = useState(0); // Speed state
    const [isDropdownOpen, setIsDropdownOpen] = useState(false); // Dropdown open/close state
    const dropdownHeight = useRef(new Animated.Value(0)).current; // Animation value for dropdown
    const [prevHeading, setPrevHeading] = useState(null);
    const [followPitch, setFollowPitch] = useState(70); // Initial pitch
    const [currentStepIndex, setCurrentStepIndex] = useState(0); // Index of the current step
    const [distanceToNextManeuver, setDistanceToNextManeuver] = useState(0); // Distance to the next maneuver
    
    // Fetch driving directions from Mapbox API
     // Fetch driving directions from Mapbox API (same as before)
     const fetchDirections = async () => {
        const originCoordinates = `${origin.longitude},${origin.latitude}`;
        const destinationCoordinates = `${destination.longitude},${destination.latitude}`;

        try {
            const response = await axios.get(
                `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${originCoordinates};${destinationCoordinates}`,
                {
                    params: {
                        access_token: 'pk.eyJ1Ijoic2hhZG93MjI2IiwiYSI6ImNtMTl6d3NnaDFrcWIyanM4M3pwMTYxeDQifQ.wDv2IuFGRpUASw1jx540Ng',
                        steps: true,
                        geometries: 'geojson',
                        overview: 'full',
                        annotations: 'congestion',
                    }
                }
            );

            const routeData = response.data.routes[0];
            setTraversedRoute(routeData.geometry.coordinates);
            setNonTraversedRoute(routeData.geometry.coordinates);
            setInstructions(routeData.legs[0].steps); // Contains detailed steps

            // Set the first instruction to be displayed
            // Set the first instruction to be displayed
if (routeData.legs[0].steps.length > 0) {
    const firstStep = routeData.legs[0].steps[0];
    setCurrentInstruction(`${firstStep.maneuver.instruction} onto ${firstStep.name}`);
}

        } catch (error) {
            console.error('Error fetching directions:', error);
        }
    };

    
    useEffect(() => {
        fetchDirections();

        const backAction = () => {
            setShowExitModal(true);
            return true;
        };


    
        const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

        return () => backHandler.remove();
    }, [origin, destination]);


  
    const toggleDropdown = () => {
        const targetHeight = isDropdownOpen ? 0 : 200;
        Animated.timing(dropdownHeight, {
            toValue: targetHeight,
            duration: 300,
            useNativeDriver: false,
        }).start();
        setIsDropdownOpen(!isDropdownOpen);
    };

 // Recenter map and resume following
 const recenterMap = () => {
    setIsFollowing(true);
    setShowRecenter(false);
};
    // Detect user panning
    const handleRegionIsChanging = (event) => {
        if (event.properties && event.properties.isUserInteraction) {
            if (isFollowing) {
                setIsFollowing(false);
                setShowRecenter(true);
            }
        }
    };
    const handlePanDrag = (event) => {
        if (isFollowing) {
            setIsFollowing(false);
            setShowRecenter(true);
        }
    };
    

    // Handle exit navigation and reset all values
    const handleExitNavigation = () => {
        setInstructions([]);
        setTraversedRoute([]);
        setNonTraversedRoute([]);
        setCurrentInstruction('');
        setSpeed(0);

        navigation.navigate('SearchScreen');
    };

    return (
        <View style={styles.container}>
     <MapboxGL.MapView 
                style={styles.map} 
                styleURL={mapStyle}
                onCameraChanged ={handleRegionIsChanging}
            >
               <MapboxGL.Camera
                    followUserLocation={isFollowing}
                    followUserMode="compass"
                    followZoomLevel={18}
                    followPitch={followPitch}
                    onPanDrag={handlePanDrag}
                />
{traversedRoute.length > 0 && (
                    <MapboxGL.ShapeSource
                        id="traversedRouteSource"
                        shape={{
                            type: 'Feature',
                            geometry: { type: 'LineString', coordinates: traversedRoute },
                        }}
                    >
                        <MapboxGL.LineLayer
                            id="traversedRouteLayer"
                            style={{ lineColor: 'blue', lineWidth: 10, lineOpacity: 0.5, lineCap: 'round', lineJoin: 'round' }}
                        />
                    </MapboxGL.ShapeSource>
                )}
             <MapboxGL.UserLocation
    visible={true}
    showsUserHeadingIndicator={true}
    onUpdate={(location) => {
        const { longitude, latitude, heading, speed } = location.coords;
        const newPosition = [longitude, latitude];

        setCurrentPosition(newPosition);
        setSpeed(speed || 0);

        // Adjust pitch when turning (existing code)
        // ...

        // Proceed only if we have steps
        if (instructions.length > 0 && currentStepIndex < instructions.length) {
            const currentStep = instructions[currentStepIndex];
            const maneuverPoint = currentStep.maneuver.location; // [longitude, latitude]

            // Calculate distance to the next maneuver point
            const from = turf.point(newPosition);
            const to = turf.point(maneuverPoint);
            const options = { units: 'meters' };

            const distance = turf.distance(from, to, options);
            setDistanceToNextManeuver(distance);

            // Update the current instruction with the remaining distance
            setCurrentInstruction(
                `${currentStep.maneuver.instruction} onto ${currentStep.name} in ${Math.round(distance)} meters`
            );

            // Check if we should advance to the next step
            if (distance < 10) {
                if (currentStepIndex + 1 < instructions.length) {
                    setCurrentStepIndex(currentStepIndex + 1);
                } else {
                    // Reached the final step
                    if (!showModal) {
                        setShowModal(true);
                    }
                }
            }
            
        }
    }}
    locationPuck={{
        type: 'circle',
        circleColor: 'blue',
        circleRadius: 10,
        opacity: 0.8,
    }}
/>


            </MapboxGL.MapView>

            {/* Current instruction card */}
      {/* Current instruction card */}
<TouchableOpacity onPress={toggleDropdown} style={styles.instructionCard}>
    <Ionicons name={getManeuverIcon(currentInstruction)} size={30} color="black" style={styles.instructionIcon} />
    <View style={{ flex: 1 }}>
        <Text style={styles.instructionText}>{currentInstruction}</Text>
        <Text style={styles.instructionDistance}>{Math.round(distanceToNextManeuver)} meters</Text>
    </View>
    <Ionicons color="black" name={isDropdownOpen ? 'chevron-up-outline' : 'chevron-down-outline'} size={30} />
</TouchableOpacity>


            {/* Animated dropdown for turn-by-turn instructions */}
            <Animated.View style={[styles.turnList, { height: dropdownHeight }]}>
    {isDropdownOpen && (
        <FlatList
            data={remainingInstructions}
            keyExtractor={(item, index) => `instruction_${currentStepIndex + index}`}
            renderItem={({ item }) => (
                <View style={styles.turnCard}>
                    <Ionicons name={getManeuverIcon(item.maneuver.instruction)} size={30} color="black" />
                    <View style={styles.turnCardText}>
                        <Text style={styles.turnCardDistance}>{Math.round(item.distance)} m</Text>
                        <Text style={styles.turnCardRoad}>{item.name || 'Unknown Road'}</Text>
                    </View>
                </View>
            )}
            contentContainerStyle={{ paddingBottom: 10 }}
        />
    )}
</Animated.View>


            {showRecenter && (
                <TouchableOpacity style={styles.recenterButton} onPress={recenterMap}>
                    <Ionicons name="locate" size={30} color="black" />
                </TouchableOpacity>
            )}

            {/* Speedometer at the bottom left */}
            <View style={styles.speedometer}>
                <Text style={styles.speedText}>{speed > 0 ? `${Math.round(speed * 3.6)} km/h` : '0 km/h'}</Text>
            </View>

            {/* Modal for exit confirmation */}
            <Modal
                transparent={true}
                visible={showExitModal}
                animationType="slide"
                onRequestClose={() => setShowExitModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalText}>Do you want to exit navigation?</Text>
                        <View style={styles.modalButtons}>
                            <Button title="Yes" onPress={handleExitNavigation} />
                            <Button title="No" onPress={() => setShowExitModal(false)} />
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Modal for destination reached */}
            <Modal
                transparent={true}
                visible={showModal}
                animationType="slide"
                onRequestClose={() => setShowModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalText}>Destination Reached!</Text>
                        <Button title="OK" onPress={() => {
                            setShowModal(false);
                            navigation.goBack(); 
                        }} />
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    map: { flex: 1 },
    instructionCard: {
        position: 'absolute',
        top: 10,
        left: 10,
        right: 10,
        padding: 15,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 10,
        elevation: 5,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 2,
    },
    instructionIcon: {
        marginRight: 10,
    },
    instructionText: {
        fontSize: 16,
        color: 'black',
        fontWeight: 'bold',
        flex: 1,
    },
    recenterButton: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        backgroundColor: 'white',
        borderRadius: 25,
        padding: 10,
        elevation: 5,
    },
    turnList: {
        position: 'absolute',
        top: 70, // Positioned below the instruction card
        left: 10,
        right: 10,
        backgroundColor: 'white',
        padding: 0, // Remove padding when the list is closed
        overflow: 'hidden',
        borderRadius: 10,
        zIndex: 5,
    },
    turnCard: {
        flexDirection: 'row',
        paddingVertical: 10, // Adjust padding for the turn card
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
    },
    turnCardText: {
        marginLeft: 10,
    },
    turnCardDistance: {
        color: 'black',
        fontSize: 16,
    },
    turnCardRoad: {
        color: 'gray',
        fontSize: 14,
    },
    instructionDistance: {
        fontSize: 14,
        color: 'gray',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
        elevation: 5,
    },
    modalText: {
        fontSize: 18,
        fontWeight: 'bold',
        color:'black'
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 20,
    },
    speedometer: {
        position: 'absolute',
        bottom: 20,
        left: 10,
        backgroundColor: 'white',
        borderRadius: 5,
        padding: 10,
        elevation: 5,
    },
    speedText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'black',
    },
});

export default NavigationScreen;
