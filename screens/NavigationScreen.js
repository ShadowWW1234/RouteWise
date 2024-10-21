import React, { useEffect, useState, useRef, useContext, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Button,
  BackHandler,
  FlatList,
  Animated,
  AppState,
  Share,
} from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import * as turf from '@turf/turf';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { MapStyleContext } from './context/MapStyleContext';
import axios from 'axios';
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView, ScrollView, Switch } from 'react-native-gesture-handler';
import RouteInfoCard from './RouteInfoCard';
import { MAPBOX_API_TOKEN } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GasConsumptionContext } from './context/GasConsumptionProvider';
import { debounce,throttle  } from 'lodash';
import Summary from './Summary';
import tw from 'tailwind-react-native-classnames';
import SideBar from './SideBar';
import InstructionsList from './component/InstructionList';

MapboxGL.setAccessToken(MAPBOX_API_TOKEN);

// Helper function to map instructions to Ionicons
const getManeuverIcon = (instruction) => {
  const lowerCaseInstruction = instruction.toLowerCase();
  if (lowerCaseInstruction.includes('right')) {
    return 'arrow-forward-outline';
  } else if (lowerCaseInstruction.includes('left')) {
    return 'arrow-back-outline';
  } else if (lowerCaseInstruction.includes('straight')) {
    return 'arrow-up-outline';
  }
  return 'navigate-outline'; // Default icon
};

// Save route data to AsyncStorage
const saveRouteToStorage = async (routeData, instructions, eta, currentRoadName) => {
  try {
    const routeDataString = JSON.stringify(routeData || {});
    const instructionsString = JSON.stringify(instructions || []);
    await AsyncStorage.multiSet([
      ['@routeData', routeDataString],
      ['@instructions', instructionsString],
      ['@eta', eta ? eta.toString() : ''],
      ['@currentRoadName', currentRoadName || ''],
    ]);
    console.log('Route data saved successfully');
  } catch (error) {
    console.error('Error saving route data to storage:', error);
  }
};

// Load route data from AsyncStorage
const loadRouteFromStorage = async (setFullRoute, setInstructions, setEta, setCurrentRoadName) => {
  try {
    const values = await AsyncStorage.multiGet([
      '@routeData',
      '@instructions',
      '@eta',
      '@currentRoadName',
    ]);

    const routeData = values[0][1] ? JSON.parse(values[0][1]) : null;
    const instructions = values[1][1] ? JSON.parse(values[1][1]) : [];
    const eta = values[2][1] ? new Date(values[2][1]) : null;
    const roadName = values[3][1] || '';

    if (routeData && routeData.geometry && Array.isArray(routeData.geometry.coordinates)) {
      setFullRoute(routeData.geometry.coordinates);
    }
    if (instructions && Array.isArray(instructions)) {
      setInstructions(instructions);
    }
    setEta(eta);
    setCurrentRoadName(roadName);
  } catch (error) {
    console.error('Error loading route data from storage:', error);
  }
};

const NavigationScreen = ({ route, navigation  }) => {
  const mapRef = useRef(null); // Properly initialize mapRef

  const {
    origin,
    destination,
    stops: initialStops = [],
    route: selectedRoute,
    destinationName,
    estimatedFuelConsumption,
  } = route.params || {};
  const [stops, setStops] = useState(initialStops);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [traversedRoute, setTraversedRoute] = useState([]);
  const [nonTraversedRoute, setNonTraversedRoute] = useState([]);
  const [isFollowing, setIsFollowing] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const { mapStyle,setMapStyle  } = useContext(MapStyleContext);
  const [instructions, setInstructions] = useState([]);
  const [currentInstruction, setCurrentInstruction] = useState('');
  const [showRecenter, setShowRecenter] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownHeight = useRef(new Animated.Value(0)).current;
  const [followPitch, setFollowPitch] = useState(10);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [distanceToNextManeuver, setDistanceToNextManeuver] = useState(0);
  const remainingInstructions = instructions.slice(currentStepIndex);

  const [fullRoute, setFullRoute] = useState([]); // Store the full route coordinates
  const [isRecalculating, setIsRecalculating] = useState(false); // Prevent multiple recalculations
  const [lastRecalculationTime, setLastRecalculationTime] = useState(0); // Debounce recalculations
  const snapPoints = useMemo(() => ['15%', '60%'], []);
  const bottomSheetRef = useRef(null);

  const [totalDistance, setTotalDistance] = useState(0); // in meters
  const [totalDuration, setTotalDuration] = useState(0); // in seconds
  const [remainingDistance, setRemainingDistance] = useState(0); // in meters
  const [remainingDuration, setRemainingDuration] = useState(0); // in seconds
  const [eta, setEta] = useState(null); // Estimated Time of Arrival
  const [currentRoadName, setCurrentRoadName] = useState('');
  const [congestionSegments, setCongestionSegments] = useState([]);
  const [appState, setAppState] = useState(AppState.currentState);
  const [routeProgress, setRouteProgress] = useState(0);
  const [isDestinationReached, setIsDestinationReached] = useState(false);
  const { gasConsumption, setGasConsumption } = useContext(GasConsumptionContext);
  const [snappedPosition, setSnappedPosition] = useState([0, 0]); // Proper initialization
  const [fuelUsed, setFuelUsed] = useState(0); // Initialize fuel used state
  const [isFinishRouteSheetVisible, setIsFinishRouteSheetVisible] = useState(false); // This controls the visibility of the "Finish Route" bottom sheet

  const previousPosition = useRef(null); // Use ref to persist across renders
  
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
  const [avoidTolls, setAvoidTolls] = useState(false);
  const [avoidUnpaved, setAvoidUnpaved] = useState(true);
  const [avoidFerries, setAvoidFerries] = useState(true);

  const [isLoadingTolls, setIsLoadingTolls] = useState(false);
  const [isLoadingUnpaved, setIsLoadingUnpaved] = useState(false);
  const [isLoadingFerries, setIsLoadingFerries] = useState(false);
  const [isLoadingMapStyle, setIsLoadingMapStyle] = useState(false);
  
  const proximityThreshold = 70;  

  const toggleMapStyle = () => {
    setIsLoadingMapStyle(true);
    setTimeout(() => {
      setMapStyle(prevStyle =>
        prevStyle === 'mapbox://styles/mapbox/streets-v11'
          ? 'mapbox://styles/mapbox/satellite-streets-v12'
          : 'mapbox://styles/mapbox/streets-v11'
      );
      setIsLoadingMapStyle(false);
    }, 1000);
  };
  
  // Effect to handle new stops added from StopSearchScreen
  useEffect(() => {
    if (route.params?.newStop) {
      setStops((prevStops) => [...prevStops, route.params.newStop]);
      navigation.setParams({ newStop: undefined });
    }
  }, [route.params?.newStop]);

  const getCongestionColor = (congestionValue) => {
    if (congestionValue > 25) {
      return '#FF0000';  // Red for high congestion
    } else if (congestionValue > 15) {
      return '#FFA500';  // Orange for medium congestion
    } else if (congestionValue > 0) {
      return null;  // Blue for low congestion
    }
    return null;  // No congestion
  };
  
  const handleRoutePress = () => {
    console.log('Route button pressed');
    // Implement the logic for showing route details or options
  };
  
  const handleShareDrivePress = () => {
    console.log('Share Drive button pressed');
    // Implement the logic for sharing the drive, e.g., through a share sheet
  };
  
  const handleOverviewPress = () => {
    console.log('Overview button pressed');
    // Implement the logic for showing an overview of the route
  };
  
  // Function to check if the user is off-route
  const checkIfOffRoute = (currentPosition, route) => {
    if (!currentPosition || !Array.isArray(route) || route.length === 0) return false;

    const userPoint = turf.point(currentPosition);
    const routeLine = turf.lineString(route);

    const snapped = turf.nearestPointOnLine(routeLine, userPoint, { units: 'meters' });
    const distanceFromRoute = turf.distance(userPoint, snapped, { units: 'meters' });

  
    return distanceFromRoute > 30; // Returns true if off-route
  };
 
  // Effect to update ETA whenever remainingDuration changes
  useEffect(() => {
    if (remainingDuration > 0) {
      const newEta = calculateETA(remainingDuration);
     
      setEta(newEta);
    } else {
  //    console.warn('Remaining duration is 0 or invalid.');
    }
  }, [remainingDuration]);

  useEffect(() => {
    if (!selectedRoute || !selectedRoute.geometry || !selectedRoute.annotations || !Array.isArray(selectedRoute.annotations.congestion_numeric)) {
    //  console.warn('Congestion data or route geometry is missing');
      setCongestionSegments([]); // Clear any existing congestion segments if no data
      return;
    }
  
    const congestionLevels = selectedRoute.annotations.congestion_numeric;
    const coordinates = selectedRoute.geometry.coordinates;
  
    // Ensure the length of congestion data matches the segments between coordinates
    if (congestionLevels.length !== coordinates.length - 1) {
      return;
    }
  
    const segments = coordinates.map((coord, i) => {
      if (i === coordinates.length - 1) return null; // Skip the last coordinate
  
      const congestionValue = congestionLevels[i];
      const [lon1, lat1] = coord;
      const [lon2, lat2] = coordinates[i + 1];
  
      const congestionColor = getCongestionColor(congestionValue);
      if (!congestionColor) return null; // Skip if no valid congestion color
  
      return {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [[lon1, lat1], [lon2, lat2]],
        },
        properties: { color: congestionColor },  // Add color to the properties
      };
    }).filter(segment => segment !== null);  // Filter out any null segments
  
    setCongestionSegments(segments);
  }, [selectedRoute]);
  
  
  const handleShare = async () => {
    try {
        const result = await Share.share({
            message: `I have completed my route! Here are the details:\n\n
            Distance: ${(remainingDistance / 1000).toFixed(2)} km\n
            Arrival Time: ${eta?.toLocaleTimeString()}\n
            Gas Consumed: ${fuelUsed.toFixed(2)} L`,
        });

        if (result.action === Share.sharedAction) {
            if (result.activityType) {
                console.log(`Shared via ${result.activityType}`);
            } else {
                console.log('Shared');
            }
        } else if (result.action === Share.dismissedAction) {
            console.log('Share dismissed');
        }
    } catch (error) {
        console.error('Error sharing:', error.message);
    }
};

const handleFinishRoute = () => {
    setIsFinishRouteSheetVisible(false); // Hide the sheet after finishing
    navigation.reset({
        index: 0,
        routes: [{ name: 'SearchScreen' }],
    });
};


const recalculateRoute = async (currentPosition) => {
  if (!currentPosition || !destination) {
    console.error('Invalid input: Current position or destination is missing.');
    return;
  }

  if (isRecalculating) {
    console.warn('Already recalculating, please wait.');
    return;
  }

  setIsRecalculating(true);
  try {
    // Start from currentPosition and recalculate the route including stops
    const originCoordinates = `${currentPosition[0]},${currentPosition[1]}`;
    const destinationCoordinates = `${destination.longitude},${destination.latitude}`;

    // Create the coordinates array including stops
    const coordinatesArray = [
      originCoordinates,
      ...stops.map(stop => `${stop.longitude},${stop.latitude}`),
      destinationCoordinates,
    ];

    // Prepare the avoid parameters based on settings
    const avoidOptions = [];
    if (avoidTolls) avoidOptions.push('toll');
    if (avoidUnpaved) avoidOptions.push('unpaved');
    if (avoidFerries) avoidOptions.push('ferry');

    const avoidString = avoidOptions.join(',');

    const response = await axios.get(
      `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${coordinatesArray.join(';')}`,
      {
        params: {
          access_token: MAPBOX_API_TOKEN,
          steps: true,
          geometries: 'geojson',
          overview: 'full',
          annotations: 'congestion_numeric',
          ...(avoidString ? { exclude: avoidString } : {}), // Add 'exclude' parameter only if avoid options are selected
        },
      }
    );

    const routeData = response.data.routes[0];
    if (!routeData) throw new Error('No route data received.');

    // Update the route with the new recalculated route data
    setFullRoute(routeData.geometry.coordinates);
    setInstructions(routeData.legs.flatMap(leg => leg.steps)); // Set step-by-step instructions

    // Calculate ETA based on the recalculated duration
    const etaTime = calculateETA(routeData.duration);
    setEta(etaTime);
    setCurrentRoadName(routeData.legs[0].summary);

    // Update distance and duration
    setTotalDistance(routeData.distance);
    setRemainingDistance(routeData.distance);
    setTotalDuration(routeData.duration);
    setRemainingDuration(routeData.duration);

    // Save the recalculated route data to AsyncStorage
    saveRouteToStorage(routeData, routeData.legs.flatMap(leg => leg.steps), etaTime, routeData.legs[0].summary);

    // Process the congestion data for the recalculated route
    if (
      routeData.annotations &&
      Array.isArray(routeData.annotations.congestion_numeric)
    ) {
      const congestionData = routeData.annotations.congestion_numeric;

      const segments = routeData.geometry.coordinates.map((coord, i) => {
        if (i === routeData.geometry.coordinates.length - 1) return null;

        const congestionValue = congestionData[i];
        const [lon1, lat1] = coord;
        const [lon2, lat2] = routeData.geometry.coordinates[i + 1];

        const congestionColor = getCongestionColor(congestionValue);
        if (!congestionColor) return null;

        return {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [lon1, lat1],
              [lon2, lat2],
            ],
          },
          properties: { color: congestionColor },
        };
      }).filter(segment => segment !== null);

      setCongestionSegments(segments); // Set the congestion segments
    } else {
      console.warn('No congestion data available in recalculated route annotations.');
      setCongestionSegments([]); // Clear any existing congestion segments
    }

  } catch (error) {
    console.error('Error recalculating route:', error);
  } finally {
    setIsRecalculating(false);
  }
};


const fetchDirections = async () => {
  if (!route?.params?.origin || !route?.params?.destination) {
    console.error('Missing origin or destination.');
    return;
  }

  const { origin, destination } = route.params;

  try {
    // Construct the coordinates array (including stops if available)
    const originCoordinates = `${origin.longitude},${origin.latitude}`;
    const destinationCoordinates = `${destination.longitude},${destination.latitude}`;
    
    // Create an array of stop coordinates
    const stopCoordinates = stops.map((stop) => `${stop.longitude},${stop.latitude}`);

    // Combine origin, stop(s), and destination into a single array for the request
    const coordinatesArray = [originCoordinates, ...stopCoordinates, destinationCoordinates];

    // Construct the avoid parameters dynamically based on user settings
    let excludeParams = [];
    if (avoidTolls) excludeParams.push('toll');
    if (avoidUnpaved) excludeParams.push('unpaved');
    if (avoidFerries) excludeParams.push('ferry');
    const excludeString = excludeParams.length > 0 ? excludeParams.join(',') : null;

    // Make the Mapbox Directions API request with waypoints (including stops)
    const response = await axios.get(
      `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${coordinatesArray.join(';')}`,
      {
        params: {
          access_token: MAPBOX_API_TOKEN,
          steps: true,
          geometries: 'geojson',
          overview: 'full',
          annotations: 'congestion_numeric',
          exclude: excludeString, // Add exclude parameter if any settings are true
        },
      }
    );

    const routeData = response.data.routes[0]; // Fetch the first route
    setFullRoute(routeData.geometry.coordinates); // Set full route coordinates
    setInstructions(routeData.legs.flatMap((leg) => leg.steps)); // Set instructions for the route

    // Set the first instruction
    if (routeData.legs.length > 0 && routeData.legs[0].steps.length > 0) {
      setCurrentInstruction(routeData.legs[0].steps[0].maneuver.instruction);
    }

    // Handle congestion data (if available)
    if (routeData.legs && routeData.legs[0].annotation && routeData.legs[0].annotation.congestion_numeric) {
      const congestionLevels = routeData.legs[0].annotation.congestion_numeric;

      // Map the congestion levels to the route coordinates
      const segments = routeData.geometry.coordinates.map((coord, i) => {
        if (i === routeData.geometry.coordinates.length - 1) return null;

        const congestionValue = congestionLevels[i];
        const [lon1, lat1] = coord;
        const [lon2, lat2] = routeData.geometry.coordinates[i + 1];

        const congestionColor = getCongestionColor(congestionValue);
        if (!congestionColor) return null;

        return {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [lon1, lat1],
              [lon2, lat2],
            ],
          },
          properties: { color: congestionColor },
        };
      }).filter((segment) => segment !== null);

      setCongestionSegments(segments); // Set the congestion segments
    } else {
      setCongestionSegments([]); // Clear congestion segments if none are available
    }

    // Set the full route initially as non-traversed
    setNonTraversedRoute(routeData.geometry.coordinates);
  } catch (error) {
    console.error('Error fetching directions:', error);
  }
};

  
 
  useEffect(() => {
    if (selectedRoute?.annotations?.congestion_numeric) {
      const congestionLevels = selectedRoute.annotations.congestion_numeric;
     
      const segments = selectedRoute.geometry.coordinates.map((coord, i) => {
        if (i === selectedRoute.geometry.coordinates.length - 1) return null;
  
        const congestionValue = congestionLevels[i];
        const [lon1, lat1] = coord;
        const [lon2, lat2] = selectedRoute.geometry.coordinates[i + 1];
  
        const congestionColor = getCongestionColor(congestionValue);
        return {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [[lon1, lat1], [lon2, lat2]],
          },
          properties: { color: congestionColor },
        };
      }).filter(segment => segment !== null);
  
      setCongestionSegments(segments);


      
    } else {
    //  console.warn('No congestion data available.');
      setCongestionSegments([]); // Clear if no data
    }
  }, [selectedRoute]);
 
  // Function to animate the transition between positions
  const animateTransition = (prevPosition, newPosition, duration) => {
    if (
      !prevPosition ||
      !newPosition ||
      prevPosition.length < 2 ||
      newPosition.length < 2
    ) {
      console.error('Invalid positions for animation:', { prevPosition, newPosition });
      return;
    }

    let startTime = null;
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const lng = prevPosition[0] + (newPosition[0] - prevPosition[0]) * progress;
      const lat = prevPosition[1] + (newPosition[1] - prevPosition[1]) * progress;

      setSnappedPosition([lng, lat]);

      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  };

  // Effect to handle app state changes (e.g., app coming to foreground)
  useEffect(() => {
    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        loadRouteFromStorage(setFullRoute, setInstructions, setEta, setCurrentRoadName);
      }
      setAppState(nextAppState);
    });

    return () => {
      appStateSubscription.remove();
    };
  }, [appState]);

  // Function to calculate ETA based on remaining duration
  const calculateETA = (durationInSeconds) => {
    const currentTime = new Date();
    return new Date(currentTime.getTime() + durationInSeconds * 1000); // Return a valid Date object
  };

  // Effect to fetch directions when origin, destination, or stops change
  useEffect(() => {
    if (origin && destination) {
      setFullRoute([]);
      setTraversedRoute([]);
      setNonTraversedRoute([]);
      setCongestionSegments([]);

      fetchDirections();
    }
  }, [origin, destination, stops]);

  // Function to handle adding a new stop
  const handleAddStop = () => {
    navigation.navigate('StopSearchScreen', {
      origin,
      destination,
      stops,
    });
  };

  // Effect to handle back button press
  useEffect(() => {
    fetchDirections();
    const backAction = () => {
      setShowExitModal(true);
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [origin, destination, stops]);

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
  
    const interval = setInterval(handleRecalculation, 5000);
    return () => clearInterval(interval);
  }, [currentPosition, fullRoute, isRecalculating, lastRecalculationTime]);
  
 
  // Function to match location to road using Mapbox Map Matching API
 const matchLocationToRoad = async (longitude, latitude) => {
  try {
   // console.log(`Attempting to match location: [${longitude}, ${latitude}]`);

    // Ensure we have a previous position; if not, initialize it
    if (!previousPosition.current) {
      previousPosition.current = [longitude, latitude];
      return [longitude, latitude]; // Fallback to GPS if no previous position
    }

    // Construct the coordinates string with both previous and current positions
    const coordinatesString = `${previousPosition.current[0]},${previousPosition.current[1]};${longitude},${latitude}`;

    const response = await axios.get(
      `https://api.mapbox.com/matching/v5/mapbox/driving/${coordinatesString}`,
      {
        params: {
          access_token: MAPBOX_API_TOKEN,
          geometries: 'geojson',
          overview: 'full',
          radiuses: '10;10',
        },
      }
    );

    // Extract the snapped coordinate (the second point in the response)
    const matchedPoint = response.data.matchings[0]?.geometry?.coordinates[1];

    if (matchedPoint) {
   //   console.log(`Using Snapped Position: ${matchedPoint}`);
      previousPosition.current = [longitude, latitude]; // Update previous position
      return matchedPoint;
    } else {
    //  console.warn('No matching road found. Using GPS coordinates.');
      previousPosition.current = [longitude, latitude]; // Update previous position
      return [longitude, latitude]; // Fallback to GPS
    }
  } catch (error) {
    console.error('Error matching location to road:', error.response?.data || error.message);
    previousPosition.current = [longitude, latitude]; // Update on error
    return [longitude, latitude]; // Fallback to GPS coordinates
  }
};

const handleAvoidTollsToggle = async (value) => {
  setIsLoadingTolls(true);  // Start loading indicator

  try {
    setAvoidTolls(value);  // Set the new value for avoiding tolls
    await recalculateRoute(currentPosition);  // Recalculate route after setting the toggle
  } catch (error) {
    console.error("Error recalculating route:", error);  // Handle any errors in recalculating
  } finally {
    setIsLoadingTolls(false);  // Stop loading indicator after recalculation is done
  }
};

const handleAvoidUnpavedToggle = (value) => {
  setIsLoadingUnpaved(true);
  setTimeout(() => {
    setAvoidUnpaved(value);
    setIsLoadingUnpaved(false);
  }, 1000);
};


const handleAvoidFerriesToggle = (value) => {
  setIsLoadingFerries(true);
  setTimeout(() => {
    setAvoidFerries(value);
    setIsLoadingFerries(false);
  }, 1000);
};

 


  // Effect to calculate fuel consumption based on remaining distance
  useEffect(() => {
  //  console.log('Effect triggered with:', { currentPosition, fullRoute, gasConsumption });
  
    if (currentPosition && fullRoute.length > 0 && gasConsumption > 0) {
      try {
        const remainingRoute = turf.lineSlice(
          turf.point(currentPosition),
          turf.point(fullRoute[fullRoute.length - 1]),
          turf.lineString(fullRoute)
        );

        const remainingDistanceInMeters = turf.length(remainingRoute, { units: 'meters' });
        if (isFinite(remainingDistanceInMeters)) {
          const fuelUsedForTrip = (remainingDistanceInMeters / 1000) / gasConsumption; // Convert to km and divide by consumption rate
      //    console.log(`Fuel used for the trip: ${fuelUsedForTrip.toFixed(2)} L`);
          setFuelUsed(parseFloat(fuelUsedForTrip.toFixed(2)));
        } else {
         // console.warn('Invalid remaining distance calculated.');
        }
      } catch (error) {
        console.error('Error calculating route metrics:', error);
      }
    }  
  }, [currentPosition, fullRoute, gasConsumption]);
 
// Effect to show/hide the bottom sheet for destination reached
useEffect(() => {
  if (isDestinationReached) {
    setIsFinishRouteSheetVisible(true); // Show the "Finish Route" bottom sheet when reached
   // console.log("Opening destination reached bottom sheet.");
  } else {
    setIsFinishRouteSheetVisible(false); // Hide the sheet if destination is not reached
  //  console.log("Closing destination reached bottom sheet.");
  }
}, [isDestinationReached]);

// Check if destination is reached based on remaining distance
useEffect(() => {
  if (remainingDistance > 0) {
  //  console.log(`Checking remaining distance: ${remainingDistance} meters`);

    if (remainingDistance < proximityThreshold) {
      // Mark destination as reached only when very close (use a tight threshold)
      setIsDestinationReached(true);
    //  console.log(`Destination reached, within ${remainingDistance} meters`);
    } else {
      // Ensure destination is not marked as reached if the distance is still significant
      setIsDestinationReached(false);
     // console.log('Still en route, destination not yet reached.');
    }
  }
}, [remainingDistance, proximityThreshold]);


  const debouncedMatchLocationToRoad = useCallback(debounce(async (longitude, latitude) => {
    try {
      return await matchLocationToRoad(longitude, latitude);
    } catch (error) {
    //  console.error('Error in debounced matchLocationToRoad:', error);
      return null;
    }
  }, 3000), []); // 3-second debounce


  const handleLocationUpdate = useCallback(async (location) => {
    const { longitude, latitude, speed } = location.coords;
    const gpsPosition = [longitude, latitude];
  
   // console.log(`Received GPS Location: ${gpsPosition}`);
  
    // Convert speed from m/s to km/h
    const speedKmPerHour = speed ? parseFloat((speed * 3.6).toFixed(1)) : 0;
    setSpeed(speedKmPerHour);
  
    if (fullRoute.length > 0) {
      const distanceMoved = turf.distance(turf.point(currentPosition), turf.point(gpsPosition));
  
      // Only snap to the road if the user has moved a significant distance
      if (distanceMoved > 10) {
        const snappedPos = await debouncedMatchLocationToRoad(longitude, latitude);
        const positionToUse = snappedPos || gpsPosition;
  
        // Animate the transition for smooth movement
        if (currentPosition) {
          animateTransition(currentPosition, positionToUse, 500);
        }
  
        // Update the current position
        setCurrentPosition(positionToUse);
        setSnappedPosition(positionToUse);
  
        // Calculate traversed and non-traversed parts of the route
        const routeLine = turf.lineString(fullRoute);
        const traversed = turf.lineSlice(turf.point(fullRoute[0]), turf.point(positionToUse), routeLine);
        const nonTraversed = turf.lineSlice(turf.point(positionToUse), turf.point(fullRoute[fullRoute.length - 1]), routeLine);
  
        setTraversedRoute(traversed.geometry.coordinates);
        setNonTraversedRoute(nonTraversed.geometry.coordinates);
  
        // Check if the user is off the route by more than 30 meters
        const distanceFromRoute = turf.distance(
          turf.point(gpsPosition),
          turf.nearestPointOnLine(routeLine, turf.point(gpsPosition)),
          { units: 'meters' }
        );
  
   //     console.log(`Distance from Route: ${distanceFromRoute.toFixed(2)} meters`);
  
        if (distanceFromRoute > 30 && speed > 0) {
          console.log('Off-route detected. Recalculating route...');
          recalculateRoute(positionToUse); // Recalculate if off-route
        }
      }
    } else {
      // No route available, just use the GPS position
      setCurrentPosition(gpsPosition);
    }
  }, [currentPosition, fullRoute, recalculateRoute]);
  
 // Effect to update remaining distance, duration, and ETA based on speed
useEffect(() => {
  if (currentPosition && fullRoute.length > 0) {
    const routeLine = turf.lineString(fullRoute);

    // Calculate the remaining distance
    const nonTraversedRoute = turf.lineSlice(
      turf.point(currentPosition),
      turf.point(fullRoute[fullRoute.length - 1]), // Destination
      routeLine
    );

    const remainingDistanceInMeters = turf.length(nonTraversedRoute, { units: 'meters' });
    
    if (!isNaN(remainingDistanceInMeters)) {
      setRemainingDistance(remainingDistanceInMeters); // Update remaining distance
    //  console.log(`Remaining distance: ${remainingDistanceInMeters} meters`);
    } else {
   //   console.error('Invalid remaining distance calculated.');
    }

    // Calculate total distance (from start to end of the route)
    const totalDistanceInMeters = turf.length(routeLine, { units: 'meters' });
  //  console.log(`Total route distance: ${totalDistanceInMeters} meters`);

    // Calculate traversed distance
    const traversedDistanceInMeters = totalDistanceInMeters - remainingDistanceInMeters;
    setRouteProgress(traversedDistanceInMeters / totalDistanceInMeters); // Update route progress
 //   console.log(`Traversed distance: ${traversedDistanceInMeters} meters`);

    // Calculate remaining duration based on user's actual speed
    if (speed > 5) { // Use a threshold to avoid unrealistic durations
      const remainingDurationInSeconds = (remainingDistanceInMeters / 1000) / speed * 3600; // Convert to seconds
      setRemainingDuration(remainingDurationInSeconds);
   //   console.log(`Remaining duration: ${remainingDurationInSeconds} seconds`);
    } else {
      // Fallback to route's estimated duration if speed is too low
      const remainingDurations = instructions.slice(currentStepIndex).reduce(
        (sum, step) => sum + step.duration,
        0
      );
      setRemainingDuration(remainingDurations);
   //   console.log(`Fallback remaining duration: ${remainingDurations} seconds`);
    }

    // Update ETA based on the new remaining duration
    if (remainingDuration > 0) {
      const newEta = calculateETA(remainingDuration);
      setEta(newEta);
    //  console.log(`Estimated Time of Arrival: ${newEta}`);
    }

    // Check if destination is reached based on remaining distance
    if (remainingDistanceInMeters < proximityThreshold) {
      setIsDestinationReached(true);
    //  console.log(`Destination reached, within ${remainingDistanceInMeters} meters`);
    } else {
      setIsDestinationReached(false);
   //   console.log('Still en route, destination not yet reached.');
    }
  }
}, [currentPosition, speed, instructions, currentStepIndex, remainingDuration, proximityThreshold, fullRoute]);

  
  const toggleDropdown = () => {
    const newHeight = isDropdownOpen ? 0 : 200; // Adjust 200 to your desired height
    // Directly set height without animation
    Animated.timing(dropdownHeight, {
      toValue: newHeight,
      duration: 0, // Instant toggle
      useNativeDriver: false, // Since height is being animated, useNativeDriver should be false
    }).start();
    setIsDropdownOpen(!isDropdownOpen); // Toggle the dropdown state
  };

// Recenter map
const recenterMap = () => {
  setIsFollowing(false); // Disable following temporarily
  setTimeout(() => {
    setIsFollowing(true); // Re-enable following after a short delay
  }, 100); // Short delay to reset followUserLocation
};
  // Function to handle exiting navigation
  const handleExitNavigation = () => {

// Show the "Finish Route" bottom sheet when the user tries to quit
setIsFinishRouteSheetVisible(true); 


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
          ref={mapRef}
          style={styles.map}
          styleURL={mapStyle}
          onCameraChanged={(event) => {
            if (event.properties.isUserInteraction && isFollowing) {
              setIsFollowing(false);
              setShowRecenter(true); // Show recenter button if user interacts
            }
          }}
          onPanDrag={() => {
            if (isFollowing) {
              setIsFollowing(false);
              setShowRecenter(true); // Show recenter button if user drags the map
            }
          }}
        >

        
          <MapboxGL.Camera
            followUserLocation={isFollowing}
            followUserMode="compass"
            followZoomLevel={18}
            followPitch={followPitch}
            maxZoomLevel={18}
            centerCoordinate={snappedPosition[0] !== 0 ? snappedPosition : currentPosition}
          />

   {/* Non-Traversed Route (full opacity) */}
   {nonTraversedRoute.length > 0 && (
    <MapboxGL.ShapeSource
      id="nonTraversedRouteSource"
      shape={{
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: nonTraversedRoute },
      }}
    >
      <MapboxGL.LineLayer
        id="nonTraversedRouteLayer"
        style={{
          lineColor: 'blue',
          lineWidth: 6,
          lineOpacity: 1, // Full opacity for non-traversed route
        }}
        existing // Specify that this layer may already exist
      />
    </MapboxGL.ShapeSource>
  )}

  {/* Traversed Route (reduced opacity) */}
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
        style={{
          lineColor: 'blue',
          lineWidth: 6,
          lineOpacity: 0.4, // Reduced opacity for traversed route
        }}
        existing // Specify that this layer may already exist
      />
    </MapboxGL.ShapeSource>
  )}

  {/* Congestion Segments */}
  {congestionSegments.length > 0 && (
    <MapboxGL.ShapeSource
      id="congestionSource"
      shape={{
        type: 'FeatureCollection',
        features: congestionSegments,
      }}
    >
      <MapboxGL.LineLayer
        id="congestionLayer"
        style={{
          lineWidth: 10,
          lineColor: ['get', 'color'],
          lineCap: 'round',
          lineJoin: 'round',
          lineOpacity: 1,
        }}
        existing // Specify that this layer may already exist
      />
    </MapboxGL.ShapeSource>
  )}

  {/* Full Route */}
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
        style={{
          lineColor: 'blue',
          lineWidth: 5,
          lineCap: 'round',
          lineJoin: 'round',
          lineOpacity: 0.2,
        }}
        existing // Specify that this layer may already exist
      />
    </MapboxGL.ShapeSource>
  )}

        
<MapboxGL.UserLocation
  visible={true}
  showsUserHeadingIndicator={true}
  onUpdate={async (location) => {
    try {
      const { longitude, latitude, speed } = location.coords;
      const gpsPosition = [longitude, latitude];

    //  console.log(`Received GPS Location: ${gpsPosition}`);

      // Convert speed from m/s to km/h
      const speedKmPerHour = speed ? parseFloat((speed * 3.6).toFixed(1)) : 0;
      setSpeed(speedKmPerHour);

      // Check if there is a route available
      if (fullRoute.length > 0) {
        // Use the debounced function to snap the GPS position to the nearest road
        const snappedPos = await debouncedMatchLocationToRoad(longitude, latitude);
        const positionToUse = snappedPos || gpsPosition;

        // Update the current position and snapped position
        setCurrentPosition(positionToUse);
        setSnappedPosition(positionToUse); // Ensure snapped position is updated

        // Animate the transition for smooth movement
        if (currentPosition) {
          animateTransition(currentPosition, positionToUse, 500);
        }

        // Calculate traversed and non-traversed parts of the route
        const routeLine = turf.lineString(fullRoute);
        const traversed = turf.lineSlice(turf.point(fullRoute[0]), turf.point(positionToUse), routeLine);
        const nonTraversed = turf.lineSlice(turf.point(positionToUse), turf.point(fullRoute[fullRoute.length - 1]), routeLine);

        setTraversedRoute(traversed.geometry.coordinates);
        setNonTraversedRoute(nonTraversed.geometry.coordinates);

        // Check if the user is off the route by more than 30 meters
        const distanceFromRoute = turf.distance(
          turf.point(gpsPosition),
          turf.nearestPointOnLine(routeLine, turf.point(gpsPosition)),
          { units: 'meters' }
        );

      //  console.log(`Distance from Route: ${distanceFromRoute.toFixed(2)} meters`);

        if (distanceFromRoute > 30 && speed > 0) {
          console.log('Off-route detected. Recalculating route...');
          recalculateRoute(positionToUse); // Recalculate if off-route
        }

        // Update the distance to the next maneuver
        if (instructions.length > 0 && currentStepIndex < instructions.length) {
          const currentStep = instructions[currentStepIndex];
          const maneuverPoint = currentStep.maneuver.location;

          const distanceToNext = turf.distance(
            turf.point(positionToUse),
            turf.point(maneuverPoint),
            { units: 'meters' }
          );

          setDistanceToNextManeuver(distanceToNext);

          if (distanceToNext < 10 && currentStepIndex + 1 < instructions.length) {
            setCurrentStepIndex(currentStepIndex + 1);
            const nextStep = instructions[currentStepIndex + 1];
            setCurrentInstruction(
              `${nextStep.maneuver.instruction} onto ${nextStep.name}`
            );
          }
        }
      } else {
        // No route available, just use the GPS position
        setCurrentPosition(gpsPosition);
      }
    } catch (error) {
      console.error('Error in onUpdate handler:', error);
    }
  }}
  locationPuck={{
    type: 'circle',
    circleColor: 'blue',
    circleRadius: 10,
    opacity: 0.8,
  }}
/>

          {/* Destination and Stop Points */}
          {destination && (
            <MapboxGL.PointAnnotation
              id="destination"
              coordinate={[destination.longitude, destination.latitude]}
            >
              <MapboxGL.Callout title="Destination" />
            </MapboxGL.PointAnnotation>
          )}

          {stops.map((stop, index) => (
            <MapboxGL.PointAnnotation
              key={`stop-${index}`}
              id={`stop-${index}`}
              coordinate={[stop.longitude, stop.latitude]}
            >
              <MapboxGL.Callout title={`Stop ${index + 1}`} />
            </MapboxGL.PointAnnotation>
          ))}

          {/* Maneuver Arrows */}
          {instructions.length > 0 && (
            <MapboxGL.ShapeSource
              id="maneuver-points"
              shape={{
                type: 'FeatureCollection',
                features: instructions.map((step) => ({
                  type: 'Feature',
                  geometry: {
                    type: 'Point',
                    coordinates: step.maneuver.location,
                  },
                  properties: {
                    instruction: step.maneuver.instruction,
                    icon: getManeuverIcon(step.maneuver.instruction),
                  },
                })),
              }}
            >
              <MapboxGL.SymbolLayer
                id="turn-marker"
                style={{
                  iconImage: 'marker-image', // Ensure you have a marker image in your assets
                  iconSize: 0.5,
                  iconAnchor: 'bottom-left',
                  iconAllowOverlap: true,
                }}
              />
            </MapboxGL.ShapeSource>
          )}
        </MapboxGL.MapView>

        {/* Recenter Button - Always Visible */}
        <TouchableOpacity style={styles.recenterButton} onPress={recenterMap}>
          <Ionicons name="locate" size={30} color="black" />
        </TouchableOpacity>

        {/* Speedometer */}
        <View style={styles.speedometer}>
          <Text style={styles.speedText}>
            {speed > 0 ? `${Math.round(speed)} km/h` : '0 km/h'}
          </Text>
        </View>

        {/* Turn-by-Turn FlatList */}
        <TouchableOpacity onPress={toggleDropdown} style={styles.instructionCard}>
          <Ionicons
            name={getManeuverIcon(currentInstruction)}
            size={30}
            color="black"
            style={styles.instructionIcon}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.instructionText}>{currentInstruction}</Text>
            <Text style={styles.instructionDistance}>
              {Math.round(distanceToNextManeuver)} meters
            </Text>
          </View>
          <Ionicons
            color="black"
            name={isDropdownOpen ? 'chevron-up-outline' : 'chevron-down-outline'}
            size={30}
          />
        </TouchableOpacity>
        <Animated.View style={[styles.turnList, { height: dropdownHeight }]}>
        <InstructionsList
        remainingInstructions={remainingInstructions}
        currentStepIndex={currentStepIndex}
      />
        </Animated.View>

        <BottomSheet
  ref={bottomSheetRef}
  index={0}
  snapPoints={snapPoints}
  enablePanDownToClose={false}
  handleIndicatorStyle={{ backgroundColor: 'gray' }}
>
  <View style={styles.bottomSheetContent}>
  
    {/* Row for Settings Icon, Summary, and Power Icon */}
    <View style={styles.topBar}>
      {/* Settings Icon (Left-Aligned) */}
      <TouchableOpacity
        style={styles.settingsIcon}
        onPress={() => setIsSettingsModalVisible(true)}
      >
        <Ionicons name="settings-outline" size={30} color="gray" />
      </TouchableOpacity>

      {/* Summary Component (Centered) */}
      <View style={styles.summaryContainer}>
        <Summary
          eta={eta}
          estimatedFuelConsumption={fuelUsed}
          remainingDistance={remainingDistance}
          remainingDuration={remainingDuration}
        />
      </View>

      {/* Shutdown Icon (Right-Aligned) */}
      <TouchableOpacity
        style={styles.shutdownIcon}
        onPress={() => setIsFinishRouteSheetVisible(true)}  
      >
        <Ionicons name="power" size={30} color="red" />
      </TouchableOpacity>
    </View>

    {/* RouteInfoCard Component */}
    <RouteInfoCard
      destinationName={destinationName}
      viaRoad={currentRoadName}
      congestionSegments={congestionSegments}
      onAddStop={handleAddStop}
      progress={routeProgress}
    />

    {/* Footer Container with 3 buttons */}
    <View style={styles.footer}>
      <TouchableOpacity style={styles.routeButton} onPress={handleRoutePress}>
        <Text style={styles.buttonText}>Route</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.shareDriveButton} onPress={handleShareDrivePress}>
        <Text style={styles.buttonText}>Share Drive</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.overviewButton} onPress={handleOverviewPress}>
        <Text style={styles.buttonText}>Overview</Text>
      </TouchableOpacity>
    </View>
  </View>
</BottomSheet>

{/* Finish Route BottomSheet */}
<BottomSheet
    ref={bottomSheetRef}
    index={isFinishRouteSheetVisible ? 1 : -1} // Show if user is near destination
    snapPoints={snapPoints}
    enablePanDownToClose={false}
    handleIndicatorStyle={{ backgroundColor: 'gray' }}
>
    <View style={styles.finishRouteContainer}>
        <Text style={styles.modalTitle}>You have reached your destination!</Text>

        {/* Summary of the trip */}
        <View style={styles.summaryContainer}>
            <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Distance:</Text>
                <Text style={styles.summaryValue}>{(remainingDistance / 1000).toFixed(2)} km</Text>
            </View>
            <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Arrival Time:</Text>
                <Text style={styles.summaryValue}>{eta?.toLocaleTimeString()}</Text>
            </View>
            <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Gas Consumed:</Text>
                <Text style={styles.summaryValue}>{fuelUsed.toFixed(2)} L</Text>
            </View>
        </View>

        {/* Share and Finish Buttons */}
        <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
                <Ionicons name="share-outline" size={24} color="white" />
                <Text style={styles.buttonText}>Share</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.finishButton} onPress={handleFinishRoute}>
                <Ionicons name="checkmark-outline" size={24} color="white" />
                <Text style={styles.buttonText}>Finish Route</Text>
            </TouchableOpacity>
        </View>



         {/* Settings Modal */}
         <Modal
  animationType="slide"
  transparent={true}
  visible={isSettingsModalVisible}
  onRequestClose={() => setIsSettingsModalVisible(false)}
>
  <View style={styles.modalContainer}>
    <View style={styles.modalContent}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.modalTitle}>Settings</Text>

        {/* Avoid Tolls Toggle */}
        <TouchableOpacity style={styles.optionButton}>
          <View style={styles.optionTextContainer}>
            <Ionicons name="car-outline" size={24} color="#2196F3" style={styles.optionIcon} />
            <Text style={styles.optionText}>Avoid Tolls</Text>
          </View>
          <Switch
            value={avoidTolls}
            onValueChange={handleAvoidTollsToggle}
            trackColor={{ false: '#ECECEC', true: '#81b0ff' }}
            thumbColor={avoidTolls ? '#2196F3' : '#f4f3f4'}
            style={styles.switch} // Apply the switch style here
          />
        </TouchableOpacity>

        {/* Avoid Unpaved Roads Toggle */}
        <TouchableOpacity style={styles.optionButton}>
          <View style={styles.optionTextContainer}>
            <Ionicons name="trail-sign-outline" size={24} color="#FF9800" style={styles.optionIcon} />
            <Text style={styles.optionText}>Avoid Unpaved Roads</Text>
          </View>
          <Switch
            value={avoidUnpaved}
            onValueChange={handleAvoidUnpavedToggle}
            trackColor={{ false: '#ECECEC', true: '#81b0ff' }}
            thumbColor={avoidUnpaved ? '#FF9800' : '#f4f3f4'}
            style={styles.switch}
          />
        </TouchableOpacity>

        {/* Avoid Ferries Toggle */}
        <TouchableOpacity style={styles.optionButton}>
          <View style={styles.optionTextContainer}>
            <Ionicons name="boat-outline" size={24} color="#4CAF50" style={styles.optionIcon} />
            <Text style={styles.optionText}>Avoid Ferries</Text>
          </View>
          <Switch
            value={avoidFerries}
            onValueChange={handleAvoidFerriesToggle}
            trackColor={{ false: '#ECECEC', true: '#81b0ff' }}
            thumbColor={avoidFerries ? '#4CAF50' : '#f4f3f4'}
            style={styles.switch}
          />
        </TouchableOpacity>

        {/* Map Style Toggle */}
        <TouchableOpacity style={styles.optionButton}>
          <View style={styles.optionTextContainer}>
            <Ionicons name="map-outline" size={24} color="#8E24AA" style={styles.optionIcon} />
            <Text style={styles.optionText}>Satellite View</Text>
          </View>
          <Switch
            value={mapStyle === 'mapbox://styles/mapbox/satellite-streets-v12'}
            onValueChange={toggleMapStyle}
            trackColor={{ false: '#ECECEC', true: '#81b0ff' }}
            thumbColor={mapStyle === 'mapbox://styles/mapbox/satellite-streets-v12' ? '#8E24AA' : '#f4f3f4'}
            style={styles.switch}
          />
        </TouchableOpacity>

        {/* Close Button */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => setIsSettingsModalVisible(false)}
        >
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  </View>
</Modal>



    </View>
</BottomSheet>

        {/* Exit Navigation Modal */}
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
    bottom: 120,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 25,
    padding: 10,
    elevation: 5,
  },
  turnList: {
    position: 'absolute',
    top: 70,
    left: 10,
    right: 10,
    backgroundColor: 'white',
    padding: 0,
    overflow: 'hidden',
    borderRadius: 10,
    zIndex: 5,
  },
  turnCard: {
    flexDirection: 'row',
    paddingVertical: 10,
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
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
      width: '90%',
      backgroundColor: 'white',
      borderRadius: 20,
      padding: 20,
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowOffset: { width: 0, height: 3 },
      shadowRadius: 5,
      elevation: 10,
    },
    scrollContent: {
      paddingVertical: 20,
    },
    modalTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      textAlign: 'center',
      color: '#2196F3',
      marginBottom: 20,
    },
    optionButton: {
      flexDirection: 'row', // Keep items in a row
      justifyContent: 'space-between', // Space between text and switch
      alignItems: 'center',
      backgroundColor: '#F5F5F5',
      paddingVertical: 12,
      paddingHorizontal: 10,
      borderRadius: 15,
      marginBottom: 15,
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 2,
      elevation: 5,
    },
    optionTextContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1, // Allow it to take available space
    },
    optionText: {
      fontSize: 18,
      fontWeight: '500',
      color: '#333',
      marginLeft: 10,
    },
    optionIcon: {
      marginRight: 10,
    },
    switch: {
      marginLeft: 'auto', // Ensure it stays on the right
    },
    closeButton: {
      backgroundColor: '#2196F3',
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 25,
      alignItems: 'center',
      marginTop: 20,
    },
    closeButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: 'bold',
    },  
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  speedometer: {
    position: 'absolute',
    bottom: 120,
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
  bottomSheetContent: {
    flexGrow: 1, // Allow content to grow without stretching, instead of flex: 1
    justifyContent: 'space-between', // Space between top content and footer
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20, // Ensure padding at the bottom
  },
  shutdownIcon: {
    position: 'absolute',
    top: 10,
    right: 20,
    zIndex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingVertical: 15, // Add more padding for better touch targets
    width: '100%', // Ensure footer buttons take full width
    borderTopWidth: 1,
    borderTopColor: '#ccc', // Optional: Add a border to separate footer from content
  },
  routeButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 5,
  },
  shareDriveButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  overviewButton: {
    flex: 1,
    backgroundColor: '#FF9800',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 5,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  }, finishRouteContainer: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
},
modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: 'black',
},
summaryContainer: {
    width: '100%',
    marginVertical: 10,
    paddingHorizontal: 20,
},
summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
},
summaryLabel: {
    fontSize: 16,
    color: 'black',
    fontWeight: 'bold',
},
summaryValue: {
    fontSize: 16,
    color: 'gray',
},
buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
},
shareButton: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
},
finishButton: {
    flexDirection: 'row',
    backgroundColor: '#FF5722',
    padding: 15,
    borderRadius: 10,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
},
buttonText: {
    marginLeft: 10,
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
}, topBar: {
  flexDirection: 'row', // Align items in a row
  justifyContent: 'space-between', // Space items across the row
  alignItems: 'center', // Vertically center all items
  width: '100%', // Ensure it takes full width
  marginBottom: 15, // Add some spacing below
},
settingsIcon: {
  flex: 1, // Take up equal space on the left
  alignItems: 'flex-start', // Align icon to the left
},
summaryContainer: {
  flex: 4, // Make the summary take more space
  justifyContent: 'center', // Center the summary horizontally
  alignItems: 'center', // Center summary text vertically
 
},
shutdownIcon: {
  flex: 1, // Take up equal space on the right
  alignItems: 'flex-end', // Align icon to the right
},  modalContainer: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: 'rgba(0,0,0,0.5)', // semi-transparent background
},
modalContent: {
  width: '80%',
  backgroundColor: 'white',
  borderRadius: 10,
  padding: 20,
  elevation: 5,
},
scrollContent: {
  flexGrow: 1,
  justifyContent: 'center',
},
modalTitle: {
  fontSize: 24,
  fontWeight: 'bold',
  marginBottom: 20,
  textAlign: 'center',
  color: 'black',
},
optionContainer: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 15,
},
optionText: {
  fontSize: 18,
  color: 'black',
},
closeButton: {
  backgroundColor: '#2196F3',
  padding: 10,
  borderRadius: 5,
  alignItems: 'center',
  marginTop: 20,
},
closeButtonText: {
  color: 'white',
  fontSize: 16,
  fontWeight: 'bold',
},
});


export default NavigationScreen;
