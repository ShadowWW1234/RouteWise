import React, { useEffect, useState, useRef, useContext, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Button, BackHandler, FlatList, Animated } from 'react-native';
import MapboxGL, { LineJoin } from '@rnmapbox/maps';
import * as turf from '@turf/turf';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { MapStyleContext } from './context/MapStyleContext';
import axios from 'axios';
import BottomSheet from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RouteInfoCard from './RouteInfoCard';
import {  MAPBOX_API_TOKEN } from '@env';

MapboxGL.setAccessToken(MAPBOX_API_TOKEN);

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
    const { origin, destination,destinationName  } = route.params || {};
    const [currentPosition, setCurrentPosition] = useState(null);
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
    const [followPitch, setFollowPitch] = useState(70); // Initial pitch
    const [currentStepIndex, setCurrentStepIndex] = useState(0); // Index of the current step
    const [distanceToNextManeuver, setDistanceToNextManeuver] = useState(0); // Distance to the next maneuver
    const remainingInstructions = instructions.slice(currentStepIndex);

const [fullRoute, setFullRoute] = useState([]); // Store the full route coordinates
const [isRecalculating, setIsRecalculating] = useState(false); // Prevent multiple recalculations
const [lastRecalculationTime, setLastRecalculationTime] = useState(0); // Debounce recalculations
const [prevHeading, setPrevHeading] = useState(null);
 
const snapPoints = useMemo(() => ['10%', '50%', '90%'], []);
const bottomSheetRef = useRef(null);

const [totalDistance, setTotalDistance] = useState(0); // in meters
const [totalDuration, setTotalDuration] = useState(0); // in seconds
const [remainingDistance, setRemainingDistance] = useState(0); // in meters
const [remainingDuration, setRemainingDuration] = useState(0); // in seconds
const [eta, setEta] = useState(null); // Estimated Time of Arrival
const [currentRoadName, setCurrentRoadName] = useState('');


const recalculateRoute = async (currentPosition) => {
    try {
        const originCoordinates = `${currentPosition[0]},${currentPosition[1]}`;
        const destinationCoordinates = `${destination.longitude},${destination.latitude}`;

        const response = await axios.get(
            `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${originCoordinates};${destinationCoordinates}`,
            {
                params: {
                    access_token: MAPBOX_API_TOKEN,
                    steps: true,
                    geometries: 'geojson',
                    overview: 'full',
                    annotations: 'congestion',
                }
            }
        );

        const routeData = response.data.routes[0];
        setFullRoute(routeData.geometry.coordinates);
        setInstructions(routeData.legs[0].steps); // Contains detailed steps
        
        // Set total distance and duration
        setTotalDistance(routeData.distance); // in meters
        setTotalDuration(routeData.duration); // in seconds
       // Initially, remaining distance and duration are equal to total
       setRemainingDistance(routeData.distance);
       setRemainingDuration(routeData.duration);
   

        // Reset current step index
        setCurrentStepIndex(0);

        // Set the first instruction
        if (routeData.legs[0].steps.length > 0) {
            const firstStep = routeData.legs[0].steps[0];
            setCurrentInstruction(`${firstStep.maneuver.instruction} onto ${firstStep.name}`);
        }

        // Reset isRecalculating after successful recalculation
        setIsRecalculating(false);
    } catch (error) {
        console.error('Error recalculating directions:', error);
        // Reset isRecalculating even if there is an error to allow future recalculations
        setIsRecalculating(false);
    }
};


     // Fetch driving directions from Mapbox API (same as before)
     const fetchDirections = async () => {
        const originCoordinates = `${origin.longitude},${origin.latitude}`;
        const destinationCoordinates = `${destination.longitude},${destination.latitude}`;

        try {
            const response = await axios.get(
                `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${originCoordinates};${destinationCoordinates}`,
                {
                    params: {
                        access_token: MAPBOX_API_TOKEN,
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
            setFullRoute(routeData.geometry.coordinates); // Set the full route
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


    const formatDuration = (durationInSeconds) => {
        const hours = Math.floor(durationInSeconds / 3600);
        const minutes = Math.ceil((durationInSeconds % 3600) / 60);
    
        if (hours > 0) {
            return `${hours} hr ${minutes} min`;
        } else {
            return `${minutes} min`;
        }
    };
    
    const formatTime = (date) => {
        if (!date) return '';
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const hours12 = hours % 12 || 12;
        const minutesStr = minutes < 10 ? '0' + minutes : minutes;
        return `${hours12}:${minutesStr} ${ampm}`;
    };
    

  
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
        }
        if (!showRecenter) {
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
               <GestureHandlerRootView style={{ flex: 1 }}>
 
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
   
   
   {fullRoute.length > 0 && (
                    <MapboxGL.ShapeSource
                        id="routeSource"
                        shape={{
                            type: 'Feature',
                            geometry: { type: 'LineString', coordinates: fullRoute },
                        }}
                    >
                        <MapboxGL.LineLayer
                            id="routeLayer"
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
    // Adjust pitch when turning
    if (prevHeading !== null && heading !== null) {
        let headingChange = Math.abs(heading - prevHeading);
        if (headingChange > 180) {
            headingChange = 360 - headingChange; // Adjust for wrap-around
        }
        if (headingChange > 15) {
            // User is turning
            setFollowPitch(75); // Increase tilt when turning
        } else {
            // User is not turning
            setFollowPitch(70); // Normal tilt
        }
    }
  // Proceed only if we have steps
  if (instructions.length > 0 && currentStepIndex < instructions.length) {
    const currentStep = instructions[currentStepIndex];
  // Update the current road name
  setCurrentRoadName(currentStep.name || 'Unknown Road');
}

// Check if user is off-route
if (fullRoute.length > 0) {
    // Existing code for off-route detection...
}

// Show recenter button when speed is zero and not already following
if ((speed === 0 || speed === null) && !isFollowing && !showRecenter) {
    setShowRecenter(true);
}

// Hide recenter button when following
if (isFollowing && showRecenter) {
    setShowRecenter(false);
}

    setPrevHeading(heading);
 
        if (instructions.length > 0 && currentStepIndex < instructions.length){
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
                `${currentStep.maneuver.instruction} onto ${currentStep.name}`
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


              // Check if user is off-route
              if (fullRoute.length > 0) {
                const userPoint = turf.point(newPosition);
                const routeLine = turf.lineString(fullRoute);
    
                const snapped = turf.nearestPointOnLine(routeLine, userPoint);
                const distanceFromRoute = turf.distance(userPoint, snapped, { units: 'meters' });
    
                const currentTime = Date.now();
    
                if (distanceFromRoute > 30 && !isRecalculating && (currentTime - lastRecalculationTime > 10000)) {
                    // User is off-route
                    setIsRecalculating(true);
                    setLastRecalculationTime(currentTime);
                    recalculateRoute(newPosition);
                }
            }

// Calculate remaining distance and duration
const remainingSteps = instructions.slice(currentStepIndex);
const distanceLeft = remainingSteps.reduce((sum, step) => sum + step.distance, 0);
const durationLeft = remainingSteps.reduce((sum, step) => sum + step.duration, 0);
setRemainingDistance(distanceLeft);
setRemainingDuration(durationLeft);

// Calculate ETA
const currentTime = new Date();
const etaTime = new Date(currentTime.getTime() + durationLeft * 1000);
setEta(etaTime);

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

         
  <BottomSheet
    ref={bottomSheetRef}
    index={0} // Initial snap point index
    snapPoints={snapPoints}
    enablePanDownToClose={false} // Prevent closing the sheet by dragging down
    handleIndicatorStyle={{ backgroundColor: 'gray' }}
  >
    {/* Content of the bottom sheet */}
    <View style={styles.bottomSheetContent}>
    <Text style={styles.summaryTitle}>{ formatTime(eta) }</Text>
         
    <Text style={styles.summaryText}>
      { (remainingDistance / 1000).toFixed(1) } km  |  { formatDuration(remainingDuration) }
    </Text>


    <RouteInfoCard
  destinationName={destinationName}
  viaRoad={currentRoadName} // Replace with the actual road name variable
  onAddStop={() => {
    // Handle the add stop action
    console.log('Add Stop pressed');
  }}
/>
  </View>

  </BottomSheet>
</GestureHandlerRootView>

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
        bottom: 50,
        right: 20,
        backgroundColor: 'black',
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
        bottom: 90,
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
    }, bottomSheetContent: {
        flex: 1,
        alignItems: 'center',
        marginTop:-5,

      },
      bottomSheetText: {
        fontSize: 18,
        color: 'black',
      },summaryContainer: {
        padding: 20,
        alignItems: 'center',
      },
      summaryTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'black',
   
      },
      summaryText: {
        fontSize: 20,
        color: 'gray',
      },cardinfocontainer:{
        backgroundColor:'gray',
        height:200,
        width:'90%',
        borderRadius:10,
        top: 20,
        alignItems:'center'
      }
      
});

export default NavigationScreen;
