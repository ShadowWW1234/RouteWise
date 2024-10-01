import React, { useEffect, useState, useRef, useContext, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Button, BackHandler, FlatList, Animated,AppState  } from 'react-native';
import MapboxGL, { LineJoin } from '@rnmapbox/maps';
import * as turf from '@turf/turf';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { MapStyleContext } from './context/MapStyleContext';
import axios from 'axios';
import BottomSheet from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RouteInfoCard from './RouteInfoCard';
import { MAPBOX_API_TOKEN } from '@env';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
const saveRouteToStorage = async (routeData, instructions, eta, currentRoadName) => {
    try {
        const routeDataString = JSON.stringify(routeData);
        const instructionsString = JSON.stringify(instructions);
        await AsyncStorage.multiSet([
            ['@routeData', routeDataString],
            ['@instructions', instructionsString],
            ['@eta', eta ? eta.toString() : ''],
            ['@currentRoadName', currentRoadName]
        ]);
    } catch (error) {
        console.error('Error saving route data to storage:', error);
    }
};


const loadRouteFromStorage = async () => {
    try {
        const values = await AsyncStorage.multiGet([
            '@routeData',
            '@instructions',
            '@eta',
            '@currentRoadName'
        ]);
        const routeDataString = values[0][1];
        const instructionsString = values[1][1];
        const etaString = values[2][1];
        const roadNameString = values[3][1];

        if (routeDataString) {
            const routeData = JSON.parse(routeDataString);
            setFullRoute(routeData.geometry.coordinates); // Restore route
        }

        if (instructionsString) {
            const restoredInstructions = JSON.parse(instructionsString);
            setInstructions(restoredInstructions); // Restore instructions
        }

        if (etaString) {
            setEta(new Date(etaString)); // Restore ETA
        }

        if (roadNameString) {
            setCurrentRoadName(roadNameString); // Restore the current road name
        }
    } catch (error) {
        console.error('Error loading route data from storage:', error);
    }
};

const NavigationScreen = ({ route, navigation }) => {
 
    const { origin, destination, stop = null, route: selectedRoute, destinationName } = route.params || {};
    const [currentPosition, setCurrentPosition] = useState(null);
    const [traversedRoute, setTraversedRoute] = useState([]);
    const [nonTraversedRoute, setNonTraversedRoute] = useState([]);
    const [isFollowing, setIsFollowing] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showExitModal, setShowExitModal] = useState(false);
    const { mapStyle } = useContext(MapStyleContext);
    const [instructions, setInstructions] = useState([]);
    const [currentInstruction, setCurrentInstruction] = useState('');
    const [showRecenter, setShowRecenter] = useState(false);
    const [speed, setSpeed] = useState(0);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownHeight = useRef(new Animated.Value(0)).current;
    const [followPitch, setFollowPitch] = useState(70);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [distanceToNextManeuver, setDistanceToNextManeuver] = useState(0);
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
    const [congestionSegments, setCongestionSegments] = useState([]);
    const [appState, setAppState] = useState(AppState.currentState);
    
    
    useEffect(() => {
        console.log('Stop data:', stop); // Check if stop data is received
      }, [stop]);
    // Congestion color mapping function
    const getCongestionColor = (congestionValue) => {
        if (congestionValue === null) {
            return 'blue'; // Default color for null congestion
        } else if (congestionValue === 0) {
            return 'blue'; // No congestion
        } else if (congestionValue <= 15) {
            return 'blue'; // Moderate congestion
        } else if (congestionValue <= 25) {
            return 'orange'; // High congestion
        } else {
            return 'red'; // Very high congestion
        }
    };
    const shouldRenderSegment = (congestionValue) => {
        return congestionValue >= 2; // Only render moderate to heavy traffic
    };
    // Check if user is off-route
    const checkIfOffRoute = (currentPosition, route) => {
        if (!currentPosition || route.length === 0) return false;

        const userPoint = turf.point(currentPosition);
        const routeLine = turf.lineString(route);
        const snapped = turf.nearestPointOnLine(routeLine, userPoint);
        const distanceFromRoute = turf.distance(userPoint, snapped, { units: 'meters' });

        return distanceFromRoute > 30; // User is off-route if more than 30 meters away
    };

    
    useEffect(() => {
        if (selectedRoute) {
            // Map the congestion data into segments with colors
            const segments = selectedRoute.coordinates.map((coord, i) => {
                if (i === selectedRoute.coordinates.length - 1) return null;
    
                const congestionValue = selectedRoute.congestionNumeric[i]; // Get the congestion value
                const [lon1, lat1] = coord;
                const [lon2, lat2] = selectedRoute.coordinates[i + 1];
                const congestionColor = getCongestionColor(congestionValue); // Get the color based on congestion value
    
                if (!shouldRenderSegment(congestionValue)) return null;
    
                return {
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: [[lon1, lat1], [lon2, lat2]]
                    },
                    properties: {
                        color: congestionColor
                    }
                };
            }).filter(segment => segment !== null);
    
            setCongestionSegments(segments);
        }
    }, [selectedRoute]);


    const splitCoordinates = (coordinates, maxPerRequest) => {
        const chunks = [];
        for (let i = 0; i < coordinates.length; i += maxPerRequest - 1) {
            const chunk = coordinates.slice(i, i + maxPerRequest);
            if (chunk.length > 1) {
                chunks.push(chunk);
            }
        }
        return chunks;
    };
    

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
            setInstructions(routeData.legs[0].steps);
    
            setTotalDistance(routeData.distance);
            setTotalDuration(routeData.duration);
            setRemainingDistance(routeData.distance);
            setRemainingDuration(routeData.duration);
    
            setCurrentStepIndex(0);
    
            if (routeData.legs[0].steps.length > 0) {
                const firstStep = routeData.legs[0].steps[0];
                setCurrentInstruction(`${firstStep.maneuver.instruction} onto ${firstStep.name}`);
            }
    
            setIsRecalculating(false);
        } catch (error) {
            console.error('Error recalculating directions:', error);
            setIsRecalculating(false);
        }
    };
    
    const fetchDirections = async () => {
        if (!origin || !destination) {
            console.error('Warning: Origin or destination is missing!');
            return;
        }
    
        const originCoordinates = `${origin.longitude},${origin.latitude}`;
        const stopCoordinates = stop ? `${stop.longitude},${stop.latitude};` : '';
        const destinationCoordinates = `${destination.longitude},${destination.latitude}`;
    
        try {
            const response = await axios.get(
                `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${originCoordinates};${stopCoordinates}${destinationCoordinates}`,
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
            setFullRoute(routeData.geometry.coordinates); // Update the route with the stop
            setInstructions(routeData.legs[0].steps); // Set detailed steps
            const etaTime = calculateETA(routeData.duration); // Calculate ETA using new function
            setEta(etaTime);
            setCurrentRoadName(routeData.legs[0].summary); // Update road name
    
            // Save the data
            saveRouteToStorage(routeData, routeData.legs[0].steps, etaTime, routeData.legs[0].summary);
        } catch (error) {
            console.error('Error fetching directions:', error);
        }
    };
    
    
    
    useEffect(() => {
        const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
            if (appState.match(/inactive|background/) && nextAppState === 'active') {
                // Recalculate the route with the stop when app comes to the foreground
                loadRouteFromStorage(); // Restore saved route data
            }
            setAppState(nextAppState);
        });
    
        return () => {
            appStateSubscription.remove();
        };
    }, [appState]);

    const calculateETA = (durationInSeconds) => {
        const currentTime = new Date();
        const eta = new Date(currentTime.getTime() + durationInSeconds * 1000);
        return eta;
    };
    
    

    useEffect(() => {
        const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
            if (appState.match(/inactive|background/) && nextAppState === 'active') {
                // Recalculate the route with the stop when app comes to the foreground
                fetchDirections(route.params?.stop);
            }
            setAppState(nextAppState);
        });
    
        return () => {
            appStateSubscription.remove();
        };
    }, [appState, route.params?.stop]);
    
    useEffect(() => {
        if (origin && destination) {
            // Clear any existing route fragments
            setFullRoute([]);
            setTraversedRoute([]);
            setNonTraversedRoute([]);
    
            // Fetch the new route
            fetchDirections(stop);
        }
    }, [origin, destination, stop]);  // Ensure the stop triggers a new fetch
    

    useEffect(() => {
        console.log('Fetching directions with stop:', stop);
        fetchDirections(stop); // Include stop in the recalculation
    }, [origin, destination, stop]);
    

    const handleAddStop = () => {
        navigation.navigate('StopSearchScreen', {
            origin,
            destination,
            currentRoute: fullRoute,  // Pass the current route to the StopSearchScreen
        });
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

    useEffect(() => {
        const handleRecalculation = () => {
            if (fullRoute.length > 0 && currentPosition) {
                const isOffRoute = checkIfOffRoute(currentPosition, fullRoute);
                const currentTime = Date.now();

                if (isOffRoute && !isRecalculating && currentTime - lastRecalculationTime > 10000) {
                    setIsRecalculating(true);
                    setLastRecalculationTime(currentTime);
                    recalculateRoute(currentPosition);
                }
            }
        };

        const interval = setInterval(handleRecalculation, 5000); // Check every 5 seconds
        return () => clearInterval(interval);
    }, [currentPosition, fullRoute]);

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
    <MapboxGL.ShapeSource id="routeSource" shape={{ type: 'Feature', geometry: { type: 'LineString', coordinates: fullRoute } }}>
        <MapboxGL.LineLayer id="routeLayer" style={{ lineColor: 'blue', lineWidth: 8, lineCap: 'round', lineJoin: 'round' }} />
    </MapboxGL.ShapeSource>
)}



  {/* Congestion Route Segments */}
  {congestionSegments.length > 0 && (
    <MapboxGL.ShapeSource
        id="congestionSource"
        shape={{
            type: 'FeatureCollection',
            features: congestionSegments
        }}
    >
        <MapboxGL.LineLayer
            id="congestionLayer"
            style={{
                lineWidth: 8, // Thinner or the same width as the base route
                lineColor: ['get', 'color'], // Using the congestion color from the properties
                lineCap: 'round',
                lineJoin: 'round',
                lineOpacity: 1,  // Make it fully visible
            }}
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
               ` ${currentStep.maneuver.instruction} onto ${currentStep.name}`
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


   
{/* Destination Annotation */}
{destination && (
        <MapboxGL.PointAnnotation
            id="destination"
            coordinate={[destination.longitude, destination.latitude]}
        >
            <MapboxGL.Callout title="Destination" />
        </MapboxGL.PointAnnotation>
    )}
   
   {stop && stop.longitude && stop.latitude && (
  <MapboxGL.PointAnnotation
      id="stop"
      coordinate={[stop.longitude, stop.latitude]}
  >
      
      <MapboxGL.Callout title="Stop" />
  </MapboxGL.PointAnnotation>
)}


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
  onAddStop={handleAddStop}
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
      },  customMarker: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 40,
        height: 40,
    },
      
});

export default NavigationScreen;
