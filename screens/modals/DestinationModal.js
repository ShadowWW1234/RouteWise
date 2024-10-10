import React, { useRef, useState, useEffect, useContext } from 'react';
import { StyleSheet, View, Modal, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MapboxGL from '@rnmapbox/maps';
import { useDispatch } from 'react-redux'; 
import { MapStyleContext } from '../context/MapStyleContext';
import { useNavigation } from "@react-navigation/native";
import {  MAPBOX_API_TOKEN } from '@env';
import Geolocation from '@react-native-community/geolocation';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { GasConsumptionContext } from '../context/GasConsumptionProvider';
import SQLite from 'react-native-sqlite-storage';

const DestinationModal = ({ visible, toggleModal, destination,origin,resetSearch }) => {
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
    const [estimatedFuelConsumption, setEstimatedFuelConsumption] = useState(null);
   
    const { gasConsumption, setGasConsumption } = useContext(GasConsumptionContext);


    const navigation = useNavigation();
 
    const resetState = () => {
        setRoutes([]);
        setSelectedRouteIndex(0);
    };


    
    useEffect(() => {
        // Try to get the user's current location
        Geolocation.getCurrentPosition(
            (position) => {
                setUserLocation({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                });
            },
            (error) => {
                console.error('Error getting location:', error);
                // If location retrieval fails, set to preview mode
                setIsPreviewMode(true);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        );
    }, []);

   

    // Function to fetch gas consumption from SQLite database
    const loadVehicleDataFromDB = () => {
        const db = SQLite.openDatabase(
            { name: 'vehicle_data.db', location: 'default' },
            () => console.log('Database opened successfully'),
            (error) => console.error('Failed to open database:', error)
        );

        db.transaction((tx) => {
            tx.executeSql(
                'SELECT gasConsumption FROM VehicleSelection ORDER BY id DESC LIMIT 1;',
                [],
                (tx, results) => {
                    if (results.rows.length > 0) {
                        const row = results.rows.item(0);
                        setGasConsumption(row.gasConsumption);
                        console.log('Loaded gas consumption from SQLite:', row.gasConsumption);
                    } else {
                        console.log('No gas consumption data found.');
                    }
                },
                (tx, error) => {
                    console.error('Failed to load gas consumption from SQLite:', error);
                }
            );
        });
    };

  // Load gas consumption when the modal becomes visible
  useEffect(() => {
    if (visible) {
        console.log('Loading gas consumption...');
        loadVehicleDataFromDB(); // Load gas consumption from DB when the modal opens
    }
}, [visible]);


    useEffect(() => {
        console.log('Gas Consumption Value after loading:', gasConsumption);
    }, [gasConsumption]);
   
    
  
    // Calculate fuel consumption when routes and gas consumption are available
    useEffect(() => {
        if (routes.length > 0 && gasConsumption) {
            const selectedRoute = routes[selectedRouteIndex];
            const distanceInKm = selectedRoute.distance / 1000;
            const fuelUsed = (distanceInKm / gasConsumption).toFixed(2);
            setEstimatedFuelConsumption(fuelUsed);

            console.log('Calculating fuel consumption:');
            console.log('Distance (km):', distanceInKm);
            console.log('Gas consumption (km/L):', gasConsumption);
            console.log('Fuel used (L):', fuelUsed);
        }
    }, [routes, selectedRouteIndex, gasConsumption]);


    useEffect(() => {
        if (routes.length > 0 && gasConsumption) {
            const selectedRoute = routes[selectedRouteIndex];
          //  console.log('Selected route distance:', selectedRoute.distance); // Debugging log
    
            if (selectedRoute.distance) {
                const distanceInKm = selectedRoute.distance / 1000;
                const fuelUsed = (distanceInKm / gasConsumption).toFixed(2);
                setEstimatedFuelConsumption(fuelUsed);
    
                console.log('Calculating fuel consumption with:');
                console.log('Distance (km):', distanceInKm);
                console.log('Gas consumption (km/L):', gasConsumption);
                console.log('Fuel used (L):', fuelUsed);
            } else {
                console.error('Distance for selected route is not available');
            }
        }
    }, [routes, selectedRouteIndex, gasConsumption]);
    
    useEffect(() => {
        if (userLocation && origin) {
            const distanceToOrigin = calculateDistance(
                userLocation.latitude,
                userLocation.longitude,
                origin.latitude,
                origin.longitude
            );
    
            // Switch to preview mode if the distance is greater than the threshold
            if (distanceToOrigin > previewDistanceThreshold) {
                setIsPreviewMode(true);
            } else {
                setIsPreviewMode(false); // Otherwise, exit preview mode
            }
        }
    }, [userLocation, origin]);
   
    const handleGoOrPreview = () => {
        if (!isRouteFetched) {
            handleGoNow(); // Fetch routes and display them
        } else if (isPreviewMode) {
            // Navigate to preview mode
            navigation.navigate('PreviewMapScreen', {
                origin,
                destination,
                route: routes[selectedRouteIndex], // Pass the selected route
            });
            toggleModal(); // Close the DestinationModal
        } else {
            handleGoNow();  // Proceed to regular navigation if not in preview mode
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
    
        setLoadingRoutes(true);  // Set loading state while fetching
    
        try {
            const response = await fetch(
                `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?alternatives=true&annotations=closure%2Cmaxspeed%2Ccongestion_numeric%2Ccongestion%2Cspeed%2Cdistance%2Cduration&exclude=ferry%2Cunpaved&geometries=geojson&language=en&overview=full&roundabout_exits=true&steps=true&access_token=${MAPBOX_API_TOKEN}`
            );
    
            const data = await response.json();
    
            console.log('Fetched data:', data);  // Log fetched data
    
            if (data.routes && data.routes.length > 0) {
                const mapboxRoutes = data.routes.map(route => ({
                    coordinates: route.geometry.coordinates,
                    congestionNumeric: route.legs[0].annotation.congestion_numeric,
                    steps: route.legs[0].steps,  // Add steps for turn-by-turn navigation
                    duration: route.duration,  // Extract duration (in seconds)
                    distance: route.distance,
                }));
    
                setRoutes(mapboxRoutes);  // Set the fetched routes
                setSelectedRouteIndex(0);  // Set the first route as selected by default
              
            } else {
                console.error('No routes found.');
            }
        } catch (error) {
            console.error('Error fetching routes:', error);
        } finally {
            setLoadingRoutes(false);  // Stop loading
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
        // Define bounds for the camera view
        const coordinates = [
            [origin.longitude, origin.latitude],
            [destination.longitude, destination.latitude],
        ];

        // Calculate bounding box
        const bbox = coordinates.reduce((bbox, coord) => {
            return [
                Math.min(bbox[0], coord[0]), // min longitude
                Math.min(bbox[1], coord[1]), // min latitude
                Math.max(bbox[2], coord[0]), // max longitude
                Math.max(bbox[3], coord[1]), // max latitude
            ];
        }, [Infinity, Infinity, -Infinity, -Infinity]);

        // Adjust the camera to fit the bounding box
        cameraRef.current.fitBounds(
            [bbox[0], bbox[1]], // Southwest coordinates
            [bbox[2], bbox[3]], // Northeast coordinates
            50 // Padding
        );
    } else {
        console.error('Origin, destination, or camera reference is not defined');
    }
};

     
    const startNavigation = () => {
        // Ensure valid index
        if (selectedRouteIndex < 0 || selectedRouteIndex >= routes.length) {
            return;
        }
        
        const selectedRoute = routes[selectedRouteIndex];
        if (!selectedRoute) {
            return;
        }
    
        // Extract the destination name
        const destinationName = destination.description.split(',')[0];
       
          // Pass necessary data for navigation, including estimatedFuelConsumption
    navigation.navigate('NavigationScreen', {
        origin,
        destination,
        route: selectedRoute,
        congestionDistance: selectedRoute.congestionDistance || 0,
        etaTime: selectedRoute.etaTime || 0,
        destinationName,
        estimatedFuelConsumption, // Include this line
    });
    };
    

    

    // Haversine formula to calculate distance between two points
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

 
useEffect(() => {
    if (visible && origin && destination && cameraRef.current) {
        // Set initial camera position
        fitToMarkers();
    }
}, [visible, origin, destination]);

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
            const routeDistance = selectedRoute.coordinates.reduce((acc, coord, index) => {
                if (index + 1 < selectedRoute.coordinates.length) {
                    const [lon1, lat1] = coord; // Correct order
                    const [lon2, lat2] = selectedRoute.coordinates[index + 1];
                    return acc + calculateDistance(lat1, lon1, lat2, lon2);
                }
                return acc;
            }, 0);

            if (!isNaN(routeDistance)) {
                setDistance(routeDistance.toFixed(2));
            } else {
                setDistance("N/A");
            }
        } else {
            setDistance("N/A");
        }
    } else {
        setDistance("N/A");
    }
}, [routes, selectedRouteIndex]);


// Handle fetching routes and calculate fuel consumption
const handleGoNow = async () => {
    if (!loadingRoutes && !isRouteFetched) {
        await fetchRoutes(); // Fetch routes
        setIsRouteFetched(true); // Mark routes as fetched

        if (routes.length > 0 && gasConsumption > 0) {
            calculateFuelConsumption(); // Calculate fuel consumption
        } else {
            console.error('Routes or gas consumption data is missing after fetching.');
        }
    } else if (isRouteFetched) {
        startNavigation(); // Start navigation
        toggleModal(); // Close modal
    }
};


const calculateFuelConsumption = () => {
    if (routes.length > 0 && gasConsumption > 0) {
        const selectedRoute = routes[selectedRouteIndex]; // Use the selected route
        const distanceInKm = selectedRoute.distance / 1000; // Convert distance to kilometers
        const fuelUsed = (distanceInKm / gasConsumption).toFixed(2); // Calculate fuel consumption
        setEstimatedFuelConsumption(fuelUsed); // Set the estimated fuel consumption

        console.log('Fuel consumption calculated:', fuelUsed);
        console.log('Distance in km:', distanceInKm);
        console.log('Gas consumption (km/L):', gasConsumption);
    } else {
        console.error('Routes or gas consumption data is missing or invalid:', {
            gasConsumption,
            routes,
        });
    }
};
useEffect(() => {
    console.log('Routes:', routes);
    console.log('Gas Consumption:', gasConsumption);

    if (routes.length > 0 && gasConsumption > 0) {
        calculateFuelConsumption();
    }
}, [routes, gasConsumption, selectedRouteIndex]);



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
      {/* Title and Distance aligned horizontally */}
      <View style={styles.row}>
    <View style={styles.leftColumn}>
        <Text style={styles.title}>
            {destination.description.split(',')[0]}
        </Text>
    </View>
    <View style={styles.rightColumn}>
        <Text  style={styles.distanceText}>
        <MaterialCommunityIcons name="gas-station" size={15}/>:
         {estimatedFuelConsumption ? `${estimatedFuelConsumption} L` : '...'}
        </Text>
        {distance && !isNaN(distance) ? (
            <Text style={styles.distanceText}>
                {distance} km
            </Text>
        ) : (
            <Text style={styles.distanceText}>
                Distance: N/A
            </Text>
        )}
    </View>
</View>


      {/* Sub-location and Time/ETA aligned horizontally */}
      <View style={styles.row}>
        <View style={styles.leftColumn}>
          <Text style={styles.locationSubText}>
            {destination.description.split(',').slice(1).join(', ')}
          </Text>
        </View>
        <View style={styles.rightColumn}>
          {routes.length > 0 && (
            <Text style={styles.estimatedTimeText}>
              {formatDuration(routes[selectedRouteIndex].duration)}
            </Text>
          )}
        </View>
      </View>

      <TouchableOpacity onPress={handleGoOrPreview} style={styles.viewRoutesButton}>
        <Text style={styles.viewRoutesText}>
          {isRouteFetched ? (isPreviewMode ? 'Preview Route' : 'Go Now') : 'View Routes'}
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
        justifyContent: 'space-between', // Space out the title and distance/time
        paddingHorizontal: 20,
        marginBottom: 10, // Add margin to separate title from content
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
    marginLeft:-5
  },
    distanceTimeContainer: {
        alignItems: 'flex-end',
        marginRight: 10, // Add padding from the right side for breathing room
    },
    distanceText: {
        fontSize: 18,
        color: 'white',
        fontWeight: 'bold',
      },
      estimatedTimeText: {
        fontSize: 18,
        color: '#FFA726', // Highlight the ETA with a warmer color
      },
      titleContainer: {
        flex: 1,
        justifyContent: 'center',
    },row: {
        flexDirection: 'row',
        justifyContent: 'space-between', // Aligns items to be spaced apart
        paddingHorizontal: 20, // Add padding for better alignment
        marginBottom: 5, // Space between rows
      }, leftColumn: {
        flex: 1, // Pushes the left column (Title/Sub-location) to the left
        justifyContent: 'center',
      },
      rightColumn: {
        justifyContent: 'center',
        alignItems: 'flex-end', // Aligns distance and time/ETA to the right
      },
});
