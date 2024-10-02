import React, { useRef, useState, useEffect, useContext } from 'react';
import { StyleSheet, View, Modal, Text, TouchableOpacity, ActivityIndicator, PermissionsAndroid, Platform } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MapboxGL from '@rnmapbox/maps';
import { useDispatch } from 'react-redux'; 
import { MapStyleContext } from '../context/MapStyleContext';
import { useNavigation } from "@react-navigation/native";
import {  MAPBOX_API_TOKEN } from '@env';
import Geolocation from '@react-native-community/geolocation';


// Function to get the user's current location
const getCurrentLocation = (callback) => {
    if (Platform.OS === 'android') {
        PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION)
        .then(granted => {
            if (granted === PermissionsAndroid.RESULTS.GRANTED) {
                Geolocation.getCurrentPosition(
                    (position) => {
                        callback(position.coords);  // Pass current location
                    },
                    (error) => console.log('Error getting location:', error),
                    { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
                );
            }
        });
    } else {
        Geolocation.getCurrentPosition(
            (position) => {
                callback(position.coords);  // Pass current location
            },
            (error) => console.log('Error getting location:', error),
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        );
    }
};

const DestinationModal = ({ visible, toggleModal, destination,origin,resetSearch}) => {
    const dispatch = useDispatch();
    const [routes, setRoutes] = useState([]);
    const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
    const mapViewRef = useRef(null);
    const cameraRef = useRef(null);
    const [loadingRoutes, setLoadingRoutes] = useState(false);
    const [distance, setDistance] = useState(null);
    const [isRouteFetched, setIsRouteFetched] = useState(false);
    const { mapStyle } = useContext(MapStyleContext);
    const [isPreviewMode, setIsPreviewMode] = useState(false); // New state for preview mode
    const [userLocation, setUserLocation] = useState(null); // State to store user's current location
    const previewDistanceThreshold = 1; // Set a threshold (in km) to switch to preview mode


      const navigation = useNavigation();

    
    
    const resetState = () => {
       
        setRoutes([]);
        setSelectedRouteIndex(0);

    };
    useEffect(() => {
        Geolocation.getCurrentPosition(
            (position) => {
                setUserLocation({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                });
            },
            (error) => console.error(error),
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        );
    }, []);
    
    useEffect(() => {
        if (userLocation && origin) {
            const distanceToOrigin = calculateDistance(
                userLocation.latitude,
                userLocation.longitude,
                origin.latitude,
                origin.longitude
            );
    
            // Switch to preview mode if the distance is greater than the threshold
            setIsPreviewMode(distanceToOrigin > previewDistanceThreshold);
        }
    }, [userLocation, origin]);
   
    const handleGoOrPreview = () => {
        if (!loadingRoutes && !isRouteFetched) {
            // If routes haven't been fetched yet, fetch them
            fetchRoutes();
            fitToMarkers();
            setIsRouteFetched(true); // Set the flag to true once routes are fetched
        } else if (isRouteFetched) {
            // Fetch the user's current location
            getCurrentLocation((location) => {
                
                setUserLocation(location);
    
                // Calculate the distance between user's location and the origin
                const distanceToOrigin = calculateDistance(
                    location.latitude,
                    location.longitude,
                    origin.latitude,
                    origin.longitude
                );
    
                // If user is far from the origin, enter preview mode
                if (distanceToOrigin > previewDistanceThreshold) {
                    setIsPreviewMode(true);
                    navigation.navigate('PreviewMapScreen', {
                        origin,
                        destination,
                        route: routes[selectedRouteIndex],  // Pass the selected route for preview
                    });
                } else {
                    // Start real-time navigation
                    startNavigation();
                    toggleModal();  // Close the modal
                }
            }, (error) => {
                // Add error handling for getCurrentLocation, such as location permissions issues
                console.error('Error getting user location:', error);
            });
        }
    };
    

    

    const handleCloseModal = () => {
        resetState();  // Reset local state in DestinationModal
        if (typeof resetSearch === 'function') {
            resetSearch();  // Call resetSearch passed from parent
        } else {
            console.error('resetSearch is not a function!');  // Error check
        }
        toggleModal();  // Close the modal
    };
   
    const fetchRoutes = async () => {
        if (!origin || !destination) return;
    
        setLoadingRoutes(true);
    
        try {
            const response = await fetch(
                `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?alternatives=true&annotations=closure%2Cmaxspeed%2Ccongestion_numeric%2Ccongestion%2Cspeed%2Cdistance%2Cduration&exclude=ferry%2Cunpaved&geometries=geojson&language=en&overview=full&roundabout_exits=true&steps=true&access_token=${MAPBOX_API_TOKEN}`
            );
    
            if (!response.ok) {
                throw new Error(`Error: ${response.status} ${response.statusText}`);
            }
    
            const data = await response.json();
            const mapboxRoutes = data.routes.map(route => ({
                coordinates: route.geometry.coordinates,
                congestionNumeric: route.legs[0]?.annotation?.congestion_numeric || [], // Default to an empty array if missing
                steps: route.legs[0]?.steps || [],  // Ensure steps exist
                duration: route.duration, // Duration in seconds
            }));
    
            setRoutes(mapboxRoutes);
            if (mapboxRoutes.length > 0) {
                setSelectedRouteIndex(0);
                setIsRouteFetched(true);  // Mark routes as fetched
            }
        } catch (error) {
            console.error('Error fetching routes:', error.message);
        } finally {
            setLoadingRoutes(false);
        }
    };
    

    // Helper function to format duration (seconds) to hours and minutes
const formatDuration = (durationInSeconds) => {
    const hours = Math.floor(durationInSeconds / 3600);
    const minutes = Math.floor((durationInSeconds % 3600) / 60);
    return `${hours > 0 ? `${hours}h ` : ''}${minutes}min`;
};


    const fitToMarkers = () => {
        if (origin && destination && cameraRef.current) {
            if (
                typeof origin.longitude === 'number' && 
                typeof origin.latitude === 'number' && 
                typeof destination.longitude === 'number' && 
                typeof destination.latitude === 'number'
            ) {
                // Define bounds for the camera view
                const bounds = {
                    ne: [
                        Math.max(origin.longitude, destination.longitude), 
                        Math.max(origin.latitude, destination.latitude)
                    ],
                    sw: [
                        Math.min(origin.longitude, destination.longitude), 
                        Math.min(origin.latitude, destination.latitude)
                    ],
                };
    
                // Add padding to the bounds
                const padding = 0.01; // Adjust as needed
                const expandedBounds = {
                    ne: [
                        bounds.ne[0] + padding, // Expand NE corner
                        bounds.ne[1] + padding
                    ],
                    sw: [
                        bounds.sw[0] - padding, // Expand SW corner
                        bounds.sw[1] - padding
                    ],
                };
    
                // Fit the camera to the defined bounds
                cameraRef.current.fitBounds(expandedBounds.ne, expandedBounds.sw, {
                    padding: { top: 50, bottom: 50, left: 50, right: 50 }
                });
    
                // Calculate the center of the bounds
                const centerCoordinate = [
                    (expandedBounds.ne[0] + expandedBounds.sw[0]) / 2,
                    (expandedBounds.ne[1] + expandedBounds.sw[1]) / 2,
                ];
    
                // Calculate the distance between the two points
                const distance = Math.sqrt(
                    Math.pow(destination.longitude - origin.longitude, 2) + 
                    Math.pow(destination.latitude - origin.latitude, 2)
                );
    
                // Adjust the zoom level based on the distance
                // You can tweak the multiplier to control zoom sensitivity
                const zoomLevel = Math.max(12 - distance * 10, 5); // Min zoom level is 5
    
                // Set the camera with a top-down view and calculated zoom level
                cameraRef.current.setCamera({
                    centerCoordinate: centerCoordinate,
                    zoomLevel: zoomLevel, // Dynamically calculated zoom level
                    pitch: 0, // Top-down view
                    animationDuration: 1000,
                    animationMode: 'moveTo',
                });
            } else {
                console.error('Invalid coordinates for origin or destination');
            }
        } else {
            console.error('Origin, destination, or camera reference is not defined');
        }
    };
     
    const startNavigation = () => {
        if (selectedRouteIndex < 0 || selectedRouteIndex >= routes.length) return;
    
        const selectedRoute = routes[selectedRouteIndex];
        if (!selectedRoute) return;
    
        const destinationName = destination.description.split(',')[0];
    
        navigation.navigate('NavigationScreen', {
            origin,
            destination,
            route: selectedRoute,
            congestionDistance: selectedRoute.congestionDistance || 0,
            etaTime: selectedRoute.etaTime || 0,
            destinationName,
        });
    };
    
    

    

    // Haversine formula to calculate distance between two points
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        // Example distance calculation using Haversine formula
        const R = 6371; // Radius of the Earth in km
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c; // Distance in km
        return distance; // Make sure to return a number
    };
    

useEffect(() => {
    if (origin && destination) {
        const dist = calculateDistance(
            origin.latitude,
            origin.longitude,
            destination.latitude,
            destination.longitude
        );
        setDistance(dist.toFixed(2)); // Always set the distance when origin and destination are available
    }
}, [origin, destination]);

useEffect(() => {
    if (origin) {
        if (cameraRef.current) {
            cameraRef.current.setCamera({
                centerCoordinate: [origin.longitude, origin.latitude], // Center on origin
                zoomLevel: 14, // Initial zoom level
                pitch: 60, // Set an initial pitch if necessary
                animationDuration: 1000, // Smooth transition
                animationMode: 'moveTo',
            });
        }
    }
}, [origin]);

useEffect(() => {
    if (routes.length > 0 && selectedRouteIndex >= 0) {
        const selectedRoute = routes[selectedRouteIndex];
        if (selectedRoute && selectedRoute.coordinates.length > 0) {
            // Calculate the distance for the selected route using the coordinates
            const routeDistance = selectedRoute.coordinates.reduce((acc, coord, index) => {
                if (index + 1 < selectedRoute.coordinates.length) {
                    const [lat1, lon1] = coord;
                    const [lat2, lon2] = selectedRoute.coordinates[index + 1];
                    return acc + calculateDistance(lat1, lon1, lat2, lon2);
                }
                return acc;
            }, 0);

            // Set the distance if valid
            if (!isNaN(routeDistance)) {
                setDistance(routeDistance.toFixed(2)); // Update distance state
            } else {
                setDistance("N/A"); // Reset to "N/A" if calculation fails
            }
        } else {
            setDistance("N/A"); // Reset to "N/A" if no coordinates
        }
    } else {
        setDistance("N/A"); // Default to "N/A" if routes are empty
    }
}, [routes, selectedRouteIndex]);

 


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

    useEffect(() => {
        return () => {
            setRoutes([]);
        };
    }, []);

    return (

        
        <Modal
        animationType="slide"
        transparent={false}
        visible={visible}
        onRequestClose={handleCloseModal}
    >
        
    
    {/* Display spinner and "Please wait" while loading */}
    {loadingRoutes && (
        <View style={styles.loadingSpinnerContainer}>
            <View style={styles.loadingSpinner}>
                <ActivityIndicator size="large" color="#ffffff" />
                <Text style={styles.loadingText}>Getting Routes</Text>
            </View>
        </View>
    )}

        <View style={styles.container}>
            {destination && (
                <MapboxGL.MapView 
                    style={styles.map} 
                    ref={mapViewRef}
                    styleURL={mapStyle}
                >
                    <MapboxGL.Camera
                        ref={cameraRef}
                        zoomLevel={14}
                        centerCoordinate={[destination.longitude, destination.latitude]}
                        pitch={60}
                        animationMode="moveTo"
                        animationDuration={1000}
                    />
    
               {/* Add PointAnnotation for the origin */}
    {origin && (
        <MapboxGL.PointAnnotation
            id="origin"
            coordinate={[origin.longitude, origin.latitude]}
        >
            <MapboxGL.Callout title="Origin" />
        </MapboxGL.PointAnnotation>
    )}
    <MapboxGL.PointAnnotation
        id="destination"
        coordinate={[destination.longitude, destination.latitude]}
    />
    
               
    {routes.length > 0 && routes.map((routeData, index) => {
    const isSelected = index === selectedRouteIndex;
    const routeOpacity = isSelected ? 1 : 0.5; // Adjust opacity based on selection

    return (
        <React.Fragment key={`route_${index}`}>
            {/* Base Route - Blue Line */}
            <MapboxGL.ShapeSource
                id={`baseRouteSource_${index}`}
                shape={{
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: routeData.coordinates, 
                    },
                }}
                onPress={() => setSelectedRouteIndex(index)} // Set selected route index on press
            >
                <MapboxGL.LineLayer
                    id={`baseRouteLayer_${index}`}
                    style={{
                        lineWidth: 10,
                        lineColor: 'blue', // All routes stay blue
                        lineOpacity:routeOpacity, // Full opacity for selected, reduced for others
                        lineCap: 'round',
                        lineJoin: 'round',
                    }}
                    existing={false}
                />
            </MapboxGL.ShapeSource>

            {/* Congestion Route Overlay */}
            {routeData.congestionNumeric && routeData.coordinates.map((coord, i) => {
                if (i === routeData.coordinates.length - 1) return null; // Skip last coordinate (no next point)

                const [lon1, lat1] = coord;
                const [lon2, lat2] = routeData.coordinates[i + 1];

                // Determine congestion color based on numeric value
                const congestionValue = routeData.congestionNumeric[i]; // Assuming congestion data matches the number of coordinates
                const congestionColor = getCongestionColor(congestionValue);

                // Optionally filter segments for moderate or worse congestion
                if (!shouldRenderSegment(congestionValue)) return null;

                return (
                    <MapboxGL.ShapeSource
                        key={`congestion_segment_${index}_${i}`}
                        id={`congestionSource_${index}_${i}`}
                        shape={{
                            type: 'Feature',
                            geometry: {
                                type: 'LineString',
                                coordinates: [[lon1, lat1], [lon2, lat2]], // Each segment of the route
                            },
                        }}
                    >
                        <MapboxGL.LineLayer
                            id={`congestionLayer_${index}_${i}`}
                            style={{
                                lineWidth: 8,
                                lineColor: congestionColor,
                                lineOpacity: routeOpacity, // Use same opacity logic for selection
                                lineCap: 'round',
                                lineJoin: 'round',
                            }}
                        />
                    </MapboxGL.ShapeSource>
                );
            })}
        </React.Fragment>
    );
})}


                </MapboxGL.MapView>
            )}
    
            <TouchableOpacity onPress={handleCloseModal} style={styles.closeButton}>
                <Ionicons name="close" size={32} color="white" />
            </TouchableOpacity>
    
           
            {/* Destination Name and View Routes Button */}
            <View style={styles.modalContent}>
    {destination && (
        <>
            <View style={styles.titleRow}>
                {/* Title aligned to the left */}
                <View style={styles.titleContainer}>
                    <Text style={styles.title}>
                        {destination.description.split(',')[0]}
                    </Text>
                </View>

                {/* Distance and Estimated Time aligned to the right */}
                <View style={styles.distanceTimeContainer}>
                    {distance && !isNaN(distance) ? (
                        <Text style={styles.distanceText}>
                            {distance} km
                        </Text>
                    ) : (
                        <Text style={styles.distanceText}>
                            Distance: N/A
                        </Text>
                    )}

                    {routes.length > 0 && (
                        <Text style={styles.estimatedTimeText}>
                            {formatDuration(routes[selectedRouteIndex].duration)}
                        </Text>
                    )}
                </View>
            </View>

            {/* Location aligned with subtext below title */}
            <View style={styles.locationContainer}>
                <Text style={styles.locationSubText}>
                    {destination.description.split(',').slice(1).join(', ')}
                </Text>
            </View>

            <TouchableOpacity onPress={handleGoOrPreview} style={styles.viewRoutesButton}>
    <Text style={styles.viewRoutesText}>
        {isPreviewMode ? 'Preview Route' : (isRouteFetched ? 'Go Now' : 'View Routes')}
    </Text>
</TouchableOpacity>


        </>
    )}
</View>


    
        </View>
    </Modal>
    
    );
};

export default DestinationModal;


const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    map: {
        height: '100%',
        width: '100%',
    },
    closeButton: {
        position: 'absolute',
        top: 20,
        right: 20,
    },
    loadingSpinnerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'black', // Black background with opacity
        zIndex: 20, // Ensure spinner is above the map
    },
    loadingSpinner: {
        position: 'absolute',
        top: '50%',
        left: '45%',
        transform: [{ translateX: -25 }, { translateY: -25 }], // Center the spinner
        zIndex: 20, // Ensure spinner is on top of everything else
    },loadingText: {
        marginTop: 10,
        color: '#ffffff',
        fontSize: 16,
        textAlign: 'center',
    },
    viewRoutesButton: {
        marginTop: 20, // Add some margin for spacing
        paddingVertical: 15,
        paddingHorizontal: 30,
        backgroundColor: 'blue',
        borderRadius: 10,
    },
    viewRoutesText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    circleButton: {
        position: 'absolute',
        top: 20,
        left: 20,
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 25,
        backgroundColor: 'blue',
    },
    backButton: {
        top: 20, // Align with close button
        left: 20,
    },
    modalContent: {
        position: 'absolute',
        bottom: 10,
        left: 20,
        right: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.7)', // Optional: add background for better visibility
        padding: 20,
        borderRadius: 10,
        zIndex: 5, // Keep modal content above the map but below the spinner
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between', // Space between title and distance/time
        alignItems: 'center',
        marginBottom: 10,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white',
    },
    locationContainer: {
        marginTop: 5,
    },
    locationSubText: {
        fontSize: 16,
        color: 'white',
    },
    distanceTimeContainer: {
        alignItems: 'flex-end', // Align distance and time to the right
    },
    distanceText: {
        fontSize: 16,
        color: 'gray',
    },
    estimatedTime: {
        fontSize: 16,
        color: 'gray',
        marginTop: 5, // Slightly space from distance text
    },
});
