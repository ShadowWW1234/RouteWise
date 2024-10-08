import React, { useEffect, useState, useRef, useContext, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Button, BackHandler, FlatList, Animated, AppState, ActivityIndicator, Image } from 'react-native';
import MapboxGL, { LineJoin } from '@rnmapbox/maps';
import * as turf from '@turf/turf';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { MapStyleContext } from './context/MapStyleContext';
import axios from 'axios';
import BottomSheet from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RouteInfoCard from './RouteInfoCard';
import { MAPBOX_API_TOKEN } from '@env'; 
import AsyncStorage from '@react-native-async-storage/async-storage';
import CalloutBubble from './component/CalloutBubble';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { GasConsumptionContext } from './context/GasConsumptionProvider';
import { debounce } from 'lodash';

MapboxGL.setAccessToken(MAPBOX_API_TOKEN);

 

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
 

const calculateProgress = (currentPosition, fullRoute) => {
  if (!currentPosition || !fullRoute || fullRoute.length === 0) return 0;

  const userPoint = turf.point(currentPosition);
  const routeLine = turf.lineString(fullRoute);
  const snapped = turf.nearestPointOnLine(routeLine, userPoint, { units: 'meters' });

  // Slice the route from the start to the snapped point
  const slicedRoute = turf.lineSlice(turf.point(fullRoute[0]), snapped, routeLine);

  // Calculate the distance along the route up to the current position
  const distanceAlongRoute = turf.length(slicedRoute, { units: 'meters' });

  // Calculate the total distance of the route
  const totalDistance = turf.length(routeLine, { units: 'meters' });

  return totalDistance === 0 ? 0 : distanceAlongRoute / totalDistance;
};

const NavigationScreen = ({ route, navigation }) => {
  const mapRef = useRef(null);  // Properly initialize mapRef

  const { origin, destination, stops: initialStops = [], route: selectedRoute, destinationName,  estimatedFuelConsumption } = route.params || {};
  const [stops, setStops] = useState(initialStops);
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
  const [congestionLevels, setCongestionLevels] = useState([]);
  const [routeProgress, setRouteProgress] = useState(0);
  const [snappedPosition, setSnappedPosition] = useState([0, 0]); // Default to [0, 0]
  const [isDestinationReached, setIsDestinationReached] = useState(false);
  const { gasConsumption } = useContext(GasConsumptionContext);


   // Threshold to trigger the "Destination Reached" event
   const destinationThreshold = 0.95; // 95% of the route traversed
   const proximityThreshold = 100; // 100 meters from the destination
 
  useEffect(() => {
    if (route.params?.newStop) {
      setStops(prevStops => [...prevStops, route.params.newStop]);
      navigation.setParams({ newStop: undefined });
    }
  }, [route.params?.newStop]);
 

  const calculateSegmentStyle = (coordinate, index, progress, congestionValue) => {
    const opacity = index < progress ? 0.2 : 1; // Less opacity for traversed segments
    const congestionColor = getCongestionColor(congestionValue);
    return {
      lineColor: congestionColor,
      lineOpacity: opacity,
    };
  };

  const removeExistingLayer = async (mapRef, layerId) => {
    try {
      const layers = await mapRef.getLayers();
      if (layers.some(layer => layer.id === layerId)) {
        mapRef.removeLayer(layerId);
      }
    } catch (error) {
      console.error(`Error removing layer ${layerId}:`, error);
    }
  };
  useEffect(() => {
    if (fullRoute.length > 0 && mapRef.current) {
      const layerId = 'routeLayer';
      
      // Remove existing layer before adding new one
      removeExistingLayer(mapRef.current, layerId);
  
      // Now add the new layer
      <MapboxGL.ShapeSource id="routeSource" shape={renderRouteWithCongestion()}>
        <MapboxGL.LineLayer
          id={layerId} // Reuse the same ID
          style={{
            lineWidth: 10,
            lineCap: 'round',
            lineJoin: 'round',
            lineColor: ['get', 'lineColor'],
            lineOpacity: ['get', 'lineOpacity'],
          }}
        />
      </MapboxGL.ShapeSource>;
    }
  }, [fullRoute]);

  const renderRouteWithCongestion = () => {
    if (!fullRoute.length || !congestionLevels.length) return null;
  
    const routeFeatures = fullRoute.map((coord, index) => {
      const congestionValue = congestionLevels[index] || 0;
      const progress = routeProgress * fullRoute.length;
  
      const segmentStyle = calculateSegmentStyle(coord, index, progress, congestionValue);
  
      return {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [fullRoute[index], fullRoute[index + 1]],
        },
        properties: segmentStyle,
      };
    });
  
    return {
      type: 'FeatureCollection',
      features: routeFeatures,
    };
  };

  const getCongestionColor = (congestionValue) => {
    if (congestionValue > 15 && congestionValue <= 25) {
      return 'orange';  // Medium congestion
    } else if (congestionValue > 25) {
      return 'red';  // High congestion
    } else {
      return null; // Filter out blue congestion (no congestion or low congestion)
    }
  };
  

  const shouldRenderSegment = (congestionValue) => {
    return congestionValue >= 2;
  };

  const checkIfOffRoute = (currentPosition, route) => {
    if (!currentPosition || route.length === 0) return false;

    const userPoint = turf.point(currentPosition);
    const routeLine = turf.lineString(route);
    const snapped = turf.nearestPointOnLine(routeLine, userPoint);
    const distanceFromRoute = turf.distance(userPoint, snapped, { units: 'meters' });

    return distanceFromRoute > 30;
  };
  const congestionSegment = [
    { percentage: 0.1, start: 0.2, color: 'orange' }, // 10% of the route starting at 20% of the total route
    { percentage: 0.15, start: 0.45, color: 'red' },  // 15% of the route starting at 45%
  ];
  useEffect(() => {
    // When remaining duration changes, recalculate ETA
    if (remainingDuration > 0) {
      const newEta = calculateETA(remainingDuration);
      setEta(newEta);
    }
  }, [remainingDuration]);
  // Simulating speed or distance change that updates remainingDuration
  const updateRemainingDuration = (newDuration) => {
    setRemainingDuration(newDuration); // In seconds
  };

  
// Congestion Segments Logic
useEffect(() => {
  if (selectedRoute) {
    const processCongestion = debounce(() => {
      const segments = selectedRoute.coordinates.map((coord, i) => {
        if (i === selectedRoute.coordinates.length - 1) return null;

        const congestionValue = selectedRoute.congestionNumeric[i];
        const [lon1, lat1] = coord;
        const [lon2, lat2] = selectedRoute.coordinates[i + 1];

        // Use the getCongestionColor function to get the appropriate color
        const congestionColor = getCongestionColor(congestionValue);

        // Only render if the congestion color is valid (orange or red)
        if (!congestionColor) return null;

        return {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [[lon1, lat1], [lon2, lat2]],
          },
          properties: {
            color: congestionColor,
          },
        };
      }).filter(segment => segment !== null); // Filter out null segments

      setCongestionSegments(segments);
    }, 300); // Debounce by 300ms to prevent rapid state updates

    processCongestion();

    // Clean up debounce on unmount
    return () => processCongestion.cancel();
  }
}, [selectedRoute]);

 
  const recalculateRoute = async (currentPosition) => {
    setIsRecalculating(true); // Show the modal before recalculating

    try {
      const originCoordinates = `${currentPosition[0]},${currentPosition[1]}`;
      const destinationCoordinates = `${destination.longitude},${destination.latitude}`;
      const coordinatesArray = [originCoordinates, ...stops.map(stop => `${stop.longitude},${stop.latitude}`), destinationCoordinates];
      const coordinatesString = coordinatesArray.join(';');
  
      // Select the profile based on the number of stops
      const profile = stops.length > 1 ? 'driving' : 'driving-traffic';
  
      // Fetch the new route from Mapbox Directions API
      const response = await axios.get(
        `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordinatesString}`,
        {
          params: {
            access_token: MAPBOX_API_TOKEN,
            steps: true,
            geometries: 'geojson',
            overview: 'full',
            ...(profile === 'driving-traffic' && { annotations: 'congestion_numeric' }),
          }
        }
      );
  
      const routeData = response.data.routes[0]; // Extract the first route
  
      // Convert distance from meters to kilometers during recalculation
      const distanceInKilometers = (routeData.distance / 1000).toFixed(2); // Convert to kilometers and format to 2 decimal places
  
      setFullRoute(routeData.geometry.coordinates); // Update the route geometry
      setInstructions(routeData.legs.flatMap(leg => leg.steps)); // Update turn-by-turn instructions
  
      setTotalDistance(routeData.distance); // Keep this in meters for internal calculations
      setRemainingDistance(distanceInKilometers); // Set the remaining distance in kilometers
      setRemainingDuration(routeData.duration); // Set the duration
  
      setCurrentStepIndex(0); // Reset step index for turn-by-turn instructions
  
      // Set the first instruction
      if (routeData.legs[0].steps.length > 0) {
        const firstStep = routeData.legs[0].steps[0];
        setCurrentInstruction(`${firstStep.maneuver.instruction} onto ${firstStep.name}`);
      }
  
      // Handle traffic congestion data if using the driving-traffic profile
      if (profile === 'driving-traffic') {
        const congestionNumeric = routeData.legs.flatMap(leg => leg.annotation?.congestion_numeric || []);
  
        const segments = routeData.geometry.coordinates.map((coord, i) => {
          if (i === routeData.geometry.coordinates.length - 1) return null;
  
          const congestionValue = congestionNumeric[i] || null;
          const [lon1, lat1] = coord;
          const [lon2, lat2] = routeData.geometry.coordinates[i + 1];
          const congestionColor = getCongestionColor(congestionValue);
  
          // Only render segments if they have significant congestion
          if (!shouldRenderSegment(congestionValue)) return null;
  
          return {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: [[lon1, lat1], [lon2, lat2]],
            },
            properties: {
              color: congestionColor,
            },
          };
        }).filter(segment => segment !== null);
  
        setCongestionSegments(segments); // Set congestion segments for rendering on the map
      } else {
        setCongestionSegments([]); // Clear congestion data for non-traffic profile
      }
  
      setIsRecalculating(false); // Reset recalculating state
    } catch (error) {
      console.error('Error recalculating directions:', error);
   
    }finally {
        setIsRecalculating(false); // Hide the modal after recalculation
      }
  };
  

  const fetchDirections = async () => {
    if (!origin || !destination) {
      console.error('Warning: Origin or destination is missing!');
      return;
    }
  
    const originCoordinates = `${origin.longitude},${origin.latitude}`;
    const destinationCoordinates = `${destination.longitude},${destination.latitude}`;
    const coordinatesArray = [originCoordinates, ...stops.map(stop => `${stop.longitude},${stop.latitude}`), destinationCoordinates];
    const coordinatesString = coordinatesArray.join(';');
  
    const profile = stops.length > 1 ? 'driving' : 'driving-traffic';
  
    try {
      const response = await axios.get(
        `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordinatesString}`,
        {
          params: {
            access_token: MAPBOX_API_TOKEN,
            steps: true,
            geometries: 'geojson',
            overview: 'full',
            ...(profile === 'driving-traffic' && { annotations: 'congestion_numeric' }),
          }
        }
      );
  
      const routeData = response.data.routes[0];
  
      // Convert distance to kilometers
      const totalDistanceInKm = routeData.distance / 1000;
      const remainingDistanceInKm = routeData.distance / 1000;
  
      setFullRoute(routeData.geometry.coordinates);
      setInstructions(routeData.legs.flatMap(leg => leg.steps));
      const etaTime = calculateETA(routeData.duration);
      setEta(etaTime);
      setCurrentRoadName(routeData.legs[0].summary);
  
      // Set total distance and remaining distance in kilometers
      setTotalDistance(totalDistanceInKm);
      setRemainingDistance(remainingDistanceInKm);
      setTotalDuration(routeData.duration);
      setRemainingDuration(routeData.duration);
  
      saveRouteToStorage(routeData, routeData.legs.flatMap(leg => leg.steps), etaTime, routeData.legs[0].summary);
    } catch (error) {
      console.error('Error fetching directions:', error);
    }
  };
  

  useEffect(() => {
    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        loadRouteFromStorage();
      }
      setAppState(nextAppState);
    });

    return () => {
      appStateSubscription.remove();
    };
  }, [appState]);

  // Function to calculate ETA
  const calculateETA = (durationInSeconds) => {
    const currentTime = new Date();
    const eta = new Date(currentTime.getTime() + durationInSeconds * 1000); // Add remaining seconds to current time
    return eta;
  };

  useEffect(() => {
    if (origin && destination) {
      setFullRoute([]);
      setTraversedRoute([]);
      setNonTraversedRoute([]);
      setCongestionSegments([]);

      fetchDirections();
    }
  }, [origin, destination, stops]);

  const handleAddStop = () => {
    navigation.navigate('StopSearchScreen', {
      origin,
      destination,
      stops,
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

  useEffect(() => {
    if (currentPosition && fullRoute.length > 0) {
      // Calculate the progress along the route
      const progress = calculateProgress(currentPosition, fullRoute);
      setRouteProgress(progress);

      // Check if the user is near the destination
      const userPoint = turf.point(currentPosition);
      const destinationPoint = turf.point([destination.longitude, destination.latitude]);
      const distanceToDestination = turf.distance(userPoint, destinationPoint, { units: 'meters' });

      // Trigger "Destination Reached" based on either progress or proximity
      if (progress >= destinationThreshold || distanceToDestination <= proximityThreshold) {
        setIsDestinationReached(true);
      }
    }
  }, [currentPosition, fullRoute]);


  useEffect(() => {
    if (isDestinationReached) {
      setShowModal(true); // Show modal when destination is reached
    }
  }, [isDestinationReached]);


// Convert duration in seconds to hours and minutes
const formatDuration = (durationInSeconds) => {
  const minutes = Math.floor(durationInSeconds / 60); // Calculate minutes
  const hours = Math.floor(minutes / 60); // Calculate hours
  const remainingMinutes = minutes % 60; // Remaining minutes

  if (hours > 0) {
    return `${hours} hr ${remainingMinutes} min`;  // Show hours and minutes
  } else {
    return `${remainingMinutes} min`;  // Only minutes
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

  const recenterMap = () => {
    setIsFollowing(false);  // Disable following temporarily
    setTimeout(() => {
      setIsFollowing(true); // Re-enable following after a short delay
    }, 100); // Short delay to reset followUserLocation
  };
  
 

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
          onCameraChanged={(event) => {
            if (event.properties.isUserInteraction && isFollowing) {
              setIsFollowing(false);
              setShowRecenter(true); // Show recenter button
            }
          }}
          onPanDrag={() => {
            if (isFollowing) {
              setIsFollowing(false);
              setShowRecenter(true); // Show recenter button
            }
          }}
        >
          <MapboxGL.Camera
            followUserLocation={isFollowing}
            followUserMode="compass"
            followZoomLevel={18}
            followPitch={followPitch}
            maxZoomLevel={18}
            centerCoordinate={snappedPosition || currentPosition} // Dynamically update center if needed
          />
  
          {/* Congestion Route Segments */}
          {congestionSegments.length > 0 && (
            <MapboxGL.ShapeSource
              id="congestionSource"
              shape={{
                type: 'FeatureCollection',
                features: congestionSegments, // Only update if congestionSegments is ready
              }}
            >
              <MapboxGL.LineLayer
                id="congestionLayer"
                style={{
                  lineWidth: 15,
                  lineColor: ['get', 'color'], // Use congestion color from properties
                  lineCap: 'round',
                  lineJoin: 'round',
                  lineOpacity: 1,
                }}
              />
            </MapboxGL.ShapeSource>
          )}
  
          {/* Traversed Route with reduced opacity */}
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
                  lineWidth: 8,
                  lineCap: 'round',
                  lineJoin: 'round',
                  lineOpacity: 0.1, // Reduced opacity for traversed route
                }}
              />
            </MapboxGL.ShapeSource>
          )}
  
          {/* Non-traversed Route with full opacity */}
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
                  lineWidth: 8,
                  lineCap: 'round',
                  lineJoin: 'round',
                  lineOpacity: 1, // Full opacity for non-traversed route
                }}
              />
            </MapboxGL.ShapeSource>
          )}
  
          {/* Full Route */}
          {fullRoute.length > 0 && (
            <MapboxGL.ShapeSource
              id="fullRouteSource" // Updated ID to avoid conflict
              shape={{
                type: 'Feature',
                geometry: { type: 'LineString', coordinates: fullRoute },
              }}
            >
              <MapboxGL.LineLayer
                id="routeLayer"
                style={{
                  lineColor: 'blue',
                  lineWidth: 8,
                  lineCap: 'round',
                  lineJoin: 'round',
                  lineOpacity: 0.2,
                }}
              />
            </MapboxGL.ShapeSource>
          )}
  
          <MapboxGL.UserLocation
            visible={true}
            showsUserHeadingIndicator={true}
            onUpdate={(location) => {
              const { longitude, latitude, speed } = location.coords;
              const actualPosition = [longitude, latitude];
  
              // Convert speed from meters per second to kilometers per hour
              const speedKmPerHour = speed ? (speed * 3.6).toFixed(1) : 0;
              setSpeed(speedKmPerHour);
  
              if (fullRoute.length > 0) {
                const userPoint = turf.point(actualPosition);
                const routeLine = turf.lineString(fullRoute);
  
                // Snap the user's position to the nearest point on the route
                const snapped = turf.nearestPointOnLine(routeLine, userPoint, { units: 'meters' });
  
                if (snapped && snapped.geometry && snapped.geometry.coordinates) {
                  const snappedPosition = snapped.geometry.coordinates;
  
                  // Smooth transition for the location update
                  const smoothTransition = (prevPosition, newPosition, duration) => {
                    let startTime = null;
  
                    const animate = (timestamp) => {
                      if (!startTime) startTime = timestamp;
                      const elapsed = timestamp - startTime;
                      const progress = Math.min(elapsed / duration, 1);
  
                      // Linear interpolation between previous and new positions
                      const lng = prevPosition[0] + (newPosition[0] - prevPosition[0]) * progress;
                      const lat = prevPosition[1] + (newPosition[1] - prevPosition[1]) * progress;
  
                      setSnappedPosition([lng, lat]);
  
                      if (progress < 1) {
                        requestAnimationFrame(animate); // Continue animation if not done
                      }
                    };
  
                    requestAnimationFrame(animate);
                  };
  
                  // Animate smoothly from the previous snapped position to the new snapped position
                  smoothTransition(snappedPosition, actualPosition, 500); // Increased duration for smoother transition
  
                  // Calculate traversed and non-traversed routes
                  const traversedRoute = turf.lineSlice(
                    turf.point(fullRoute[0]),
                    turf.point(snappedPosition),
                    routeLine
                  );
                  const nonTraversedRoute = turf.lineSlice(
                    turf.point(snappedPosition),
                    turf.point(fullRoute[fullRoute.length - 1]),
                    routeLine
                  );
  
                  setTraversedRoute(traversedRoute.geometry.coordinates);
                  setNonTraversedRoute(nonTraversedRoute.geometry.coordinates);
  
                  // Check if the car is off the route
                  const distanceFromRoute = turf.distance(userPoint, snapped, { units: 'meters' });
  
                  // If the car is more than 30 meters off the route, recalculate
                  if (distanceFromRoute > 30 && speed > 0) {
                    recalculateRoute(actualPosition); // Trigger route recalculation
                  } else {
                    setCurrentPosition(snappedPosition); // Update current position if within the route
  
                    // Calculate the remaining distance to the destination
                    const remainingRoute = turf.lineSlice(
                      turf.point(snappedPosition),
                      turf.point(fullRoute[fullRoute.length - 1]),
                      routeLine
                    );
                    const remainingDistanceInMeters = turf.length(remainingRoute, { units: 'meters' });
  
                    // Convert remaining distance to kilometers and update state
                    setRemainingDistance((remainingDistanceInMeters / 1000).toFixed(2)); // in km
  
                    // Update remaining duration based on speed or route duration
                    const averageSpeed = speedKmPerHour || (totalDistance / totalDuration) * 3.6; // km/h
                    const remainingDurationInSeconds = (remainingDistanceInMeters / 1000) / averageSpeed * 3600; // in seconds
                    setRemainingDuration(remainingDurationInSeconds);
                  }
  
                  // Update the distance to the next maneuver
                  if (instructions.length > 0 && currentStepIndex < instructions.length) {
                    const currentStep = instructions[currentStepIndex];
                    const maneuverPoint = currentStep.maneuver.location;
  
                    const distanceToNextManeuver = turf.distance(
                      turf.point(snappedPosition),
                      turf.point(maneuverPoint),
                      { units: 'meters' }
                    );
                    setDistanceToNextManeuver(distanceToNextManeuver);
  
                    // Move to the next step if within 10 meters of the current maneuver
                    if (distanceToNextManeuver < 10) {
                      if (currentStepIndex + 1 < instructions.length) {
                        setCurrentStepIndex(currentStepIndex + 1);
                        setCurrentInstruction(
                          `${instructions[currentStepIndex + 1].maneuver.instruction} onto ${instructions[currentStepIndex + 1].name}`
                        );
                      } else {
                        setShowModal(true); // Show destination modal when the route is complete
                      }
                    }
                  }
                } else {
                  // If snapping fails, use the actual position
                  setCurrentPosition(actualPosition);
                }
              } else {
                // No route available, just track the user's position
                setCurrentPosition(actualPosition);
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
                  iconImage: 'marker-image',
                  iconSize: 0.5,
                  iconAnchor: 'bottom-left',
                  iconAllowOverlap: true,
                }}
              />
            </MapboxGL.ShapeSource>
          )}
        </MapboxGL.MapView>
  
        {/* UI Elements like recenter button, speedometer */}
        <TouchableOpacity style={styles.recenterButton} onPress={recenterMap}>
          <Ionicons name="locate" size={30} color="black" />
        </TouchableOpacity>
  
        <View style={styles.speedometer}>
          <Text style={styles.speedText}>{speed > 0 ? `${Math.round(speed)} km/h` : '0 km/h'}</Text>
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
            <Text style={styles.instructionDistance}>{Math.round(distanceToNextManeuver)} meters</Text>
          </View>
          <Ionicons color="black" name={isDropdownOpen ? 'chevron-up-outline' : 'chevron-down-outline'} size={30} />
        </TouchableOpacity>
  
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
  
        {/* BottomSheet */}
        <BottomSheet
          ref={bottomSheetRef}
          index={0}
          snapPoints={snapPoints}
          enablePanDownToClose={false}
          handleIndicatorStyle={{ backgroundColor: 'gray' }}
        >
          <View style={styles.bottomSheetContent}>
            {/* Shutdown Icon */}
            <TouchableOpacity
              style={styles.shutdownIcon}
              onPress={() => setShowExitModal(true)} // Trigger exit modal
            >
              <Ionicons name="power" size={30} color="red" />
            </TouchableOpacity>
            <Text style={styles.summaryTitle}>{formatTime(eta)}</Text>
            
            <Text style={styles.summaryText}>
            <MaterialCommunityIcons name="gas-station" size={24} color="red"/> {estimatedFuelConsumption} L  
            <MaterialCommunityIcons name="road" size={20} color="blue"/>{remainingDistance ? `${remainingDistance} km` : '...'} <MaterialCommunityIcons name="bus-clock" size={20} color="blue"/>{formatDuration(remainingDuration)}
            </Text>
           
   
            <RouteInfoCard
              destinationName={destinationName}
              viaRoad={currentRoadName}
              congestionSegments={congestionSegment}
              onAddStop={handleAddStop}
              progress={routeProgress} // Pass the progress here
            />
          </View>
        </BottomSheet>
  
        {/* Modals */}
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
  
        <Modal
          transparent={true}
          visible={showModal}
          animationType="slide"
          onRequestClose={() => setShowModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalText}>Destination Reached!</Text>
              <Button
                title="OK"
                onPress={() => {
                  setShowModal(false);
                  navigation.goBack(); // Navigate back or any other logic after reaching destination
                }}
              />
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
    bottom: 85,
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
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    margin: 20,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    elevation: 5,
  },
  modalText: {
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: 'black'
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
  },
  bottomSheetContent: {
    flex: 1,
    alignItems: 'center',
    marginTop: -5,
  },
  summaryTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'black',
  },
  summaryText: {
    fontSize: 20,
    color: 'gray',
  },
  tooltipContainer: {
  backgroundColor: 'rgba(255, 255, 255, 0.8)',
  padding: 8,
  borderRadius: 6,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.3,
  shadowRadius: 3,
  elevation: 5,
  position: 'absolute', // Floating
  zIndex: 9999, // Ensures it appears above other elements
  top: -50, // Adjust the position based on your layout (e.g., to appear above or below)
},

  tooltipText: {
    fontSize: 14,
    color: '#000',
    
  }, shutdownIcon: {
    position: 'absolute',
    top: 10, // Position it within the bottom sheet
    right: 20, // Align it to the right
    zIndex: 1, // Ensure it stays on top
  }, customIcon: {
    width: 60,
    height: 40,
    // Optional styling for the custom icon
  },
});

export default NavigationScreen;
