import React, { useRef, useState, useEffect, useContext } from 'react';
import { StyleSheet, View, Text, TouchableOpacity,PermissionsAndroid , ActivityIndicator, FlatList } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MapboxGL from '@rnmapbox/maps';
import BottomSheet from '@gorhom/bottom-sheet';
import { useNavigation, useRoute } from '@react-navigation/native';
import Geolocation from '@react-native-community/geolocation';
import { GasConsumptionContext } from './context/GasConsumptionProvider';
import { MapStyleContext } from './context/MapStyleContext';
import { MAPBOX_API_TOKEN } from '@env';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import SideBar from './SideBar';

MapboxGL.setAccessToken(MAPBOX_API_TOKEN);

const DestinationScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { origin:initialOrigin, destination } = route.params || {};

  const { gasConsumption } = useContext(GasConsumptionContext);
  const { mapStyle } = useContext(MapStyleContext);

  const [routes, setRoutes] = useState([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [distance, setDistance] = useState(null);
  const [estimatedFuelConsumption, setEstimatedFuelConsumption] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isRoutesSheetVisible, setIsRoutesSheetVisible] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isOriginAway, setIsOriginAway] = useState(false);
  const [origin, setOrigin] = useState(initialOrigin); // Use state for origin
  const [currentProfile, setCurrentProfile] = useState('driving-traffic'); // Default profile
  const [isAlternativeEnabled, setIsAlternativeEnabled] = useState(true); // Manage alternative routes toggle

  const mapViewRef = useRef(null);
  const cameraRef = useRef(null);
  const bottomSheetRef = useRef(null);

  const snapPoints = ['35%', '28%'];

  useEffect(() => {
    if (mapLoaded && destination) {
      zoomToDestination();
    }
  }, [mapLoaded, destination]);
// Function to calculate distance using Haversine formula
function deg2rad(deg) {
  return deg * (Math.PI / 180);
}


function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  var R = 6371; // Earth radius in km
  var dLat = deg2rad(lat2 - lat1);
  var dLon = deg2rad(lon2 - lon1);
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c; // Distance in km
  return d;
}
// Request location permissions
useEffect(() => {
  const requestAndroidLocationPermissions = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message:
            'This app needs access to your location to show your position on the map.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('You can use the location');
      } else {
        console.log('Location permission denied');
      }
    } catch (err) {
      console.warn(err);
    }
  };

  requestAndroidLocationPermissions();
}, []);

  // Check if the user's current location is far from the set origin
  const checkDistanceFromOrigin = () => {
    if (currentLocation && initialOrigin) {
      const distance = getDistanceFromLatLonInKm(
        currentLocation.latitude,
        currentLocation.longitude,
        initialOrigin.latitude,
        initialOrigin.longitude
      );
      console.log('Distance between current location and origin:', distance, 'km');

      const threshold = 0.05; // 0.05 km = 50 meters
      setIsOriginAway(distance > threshold);

      if (distance > threshold) {
        console.log('User is more than 50 meters away from origin, setting origin to current location');
        setOrigin(currentLocation); // Set the origin to user's current location if far
      }
    }
  };

  useEffect(() => {
    const watchId = Geolocation.watchPosition(
      (position) => {
        setCurrentLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        console.log('Updated Current Location:', {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        console.error('Error watching location:', error);
        setCurrentLocation(initialOrigin); // Fallback to initial origin if there's an error
      },
      { enableHighAccuracy: true, distanceFilter: 10, interval: 5000, fastestInterval: 2000 }
    );
  
    return () => {
      if (watchId !== null) {
        Geolocation.clearWatch(watchId); // Clear the location watch when the component is unmounted
      }
    };
  }, [initialOrigin]);
  
  // Profile change handler from the SideBar
  const handleProfileChange = (newProfile) => {
    console.log('Profile changed to:', newProfile);
    setCurrentProfile(newProfile); // Update the state with the new profile
    fetchRoutes(); // Re-fetch routes based on the new profile
  console.log(newProfile);
  };
 
  
  const handleToggleAlternative = (isEnabled) => {
    console.log('Alternative routes:', isEnabled ? 'Enabled' : 'Disabled');
    setIsAlternativeEnabled(isEnabled); // Update the state when the toggle changes

  };   
  
  useEffect(() => {
    fetchRoutes(); // Fetch the updated routes
  handleViewRoutes();
  }, [isAlternativeEnabled]);  // Re-fetch when `isAlternativeEnabled` changes
  
  // Update origin based on user location if far from the set origin
  useEffect(() => {
    if (currentLocation && initialOrigin) {
      checkDistanceFromOrigin();
    }
  }, [currentLocation, initialOrigin]);

 const fetchRoutes = async () => {
  if (!initialOrigin || !destination) return;  // Use initialOrigin, not currentLocation

  setLoadingRoutes(true);  // Set loading state while fetching

  try {
    const alternativesParam = isAlternativeEnabled ? 'true' : 'false'; // Conditionally set alternatives

    const response = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/${currentProfile}/${initialOrigin.longitude},${initialOrigin.latitude};${destination.longitude},${destination.latitude}?alternatives=${alternativesParam}&annotations=closure%2Cmaxspeed%2Ccongestion_numeric%2Ccongestion%2Cspeed%2Cdistance%2Cduration&exclude=ferry%2Cunpaved&geometries=geojson&language=en&overview=full&roundabout_exits=true&steps=true&access_token=${MAPBOX_API_TOKEN}`  );

    const data = await response.json();

 
    if (data.routes && data.routes.length > 0) {
      const routeData = data.routes.map((route, index) => {
        const distance = route.distance;
        const duration = route.duration;
        const legs = route.legs;

        const steps = [];

        // Collect all coordinates for the base route
        const allCoordinates = [];

        legs.forEach((leg) => {
          if (!leg.annotation || !leg.annotation.congestion_numeric || !leg.steps) {
            console.warn('Missing annotation or steps in leg:', leg);
            return;  // Skip this leg
          }

          const congestionNumericLevels = leg.annotation.congestion_numeric;

          leg.steps.forEach((step) => {
            if (!step.geometry || !step.geometry.coordinates) {
              console.warn('Missing geometry in step:', step);
              return;  // Skip this step
            }

            const stepCoordinates = step.geometry.coordinates;
            allCoordinates.push(...stepCoordinates);

            // Iterate over the segments in this step
            for (let i = 0; i < stepCoordinates.length - 1; i++) {
              const segmentCoordinates = [stepCoordinates[i], stepCoordinates[i + 1]];
              const congestionNumericLevel = congestionNumericLevels.shift();  // Remove the first element

              const color = getCongestionColor(congestionNumericLevel);

              if (color) {
                steps.push({
                  type: 'Feature',
                  geometry: {
                    type: 'LineString',
                    coordinates: segmentCoordinates,
                  },
                  properties: {
                    color: color,
                  },
                });
              }
            }
          });
        });

        // Create the base route feature as a single LineString
        const baseRouteFeature = {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: allCoordinates,
          },
          properties: {
            color: 'base',  // Base route identifier
          },
        };

        // Combine the base route and congestion features
        const featureCollection = {
          type: 'FeatureCollection',
          features: [baseRouteFeature, ...steps],
        };

        return {
          featureCollection,
          distance,
          duration,
          coordinates: allCoordinates,  // Store the base route coordinates for preview
          steps: legs[0].steps,  // Add steps for turn-by-turn navigation
          index,  // Now index is defined
        };
      });

      // Determine the best route (e.g., the one with the shortest duration)
      const bestRouteIndex = routeData.reduce((bestIndex, route, index, array) => {
        return route.duration < array[bestIndex].duration ? index : bestIndex;
      }, 0);

      setRoutes(routeData);  // Set the fetched routes
      setSelectedRouteIndex(bestRouteIndex);  // Set the best route as selected
      calculateFuelConsumption(routeData[bestRouteIndex]);
      calculateDistance(routeData[bestRouteIndex]);

     
    } else {
      console.error('No routes found.');
    }
  } catch (error) {
    console.error('Error fetching routes:', error);
  } finally {
    setLoadingRoutes(false);  // Stop loading
  }
};


  const calculateFuelConsumption = (route) => {
    if (route && gasConsumption) {
      const distanceInKm = route.distance / 1000;
      const fuelUsed = (distanceInKm / gasConsumption).toFixed(2);
      setEstimatedFuelConsumption(fuelUsed);
    }
  };

  const calculateDistance = (route) => {
    const distanceInKm = route.distance / 1000;
    setDistance(distanceInKm.toFixed(2));
  };

  const zoomToDestination = () => {
    if (destination && cameraRef.current) {
      cameraRef.current.setCamera({
        centerCoordinate: [destination.longitude, destination.latitude],
        zoomLevel: 17,
        pitch: 60,
        bearing: 0,
        animationMode: 'flyTo',
        animationDuration: 2000,
      });
    }
  };

  const adjustCameraForRoutes = () => {
    if (cameraRef.current) {
      cameraRef.current.setCamera({
        pitch: 0,
        animationDuration: 500,
      });
      const selectedRoute = routes[selectedRouteIndex];
      if (selectedRoute) {
        fitCameraToRoute(selectedRoute);
      }
    }
  };

  const fitCameraToRoute = (route) => {
    if (
      route &&
      cameraRef.current &&
      route.featureCollection &&
      route.featureCollection.features.length > 0
    ) {
      let coordinates = route.featureCollection.features.flatMap(
        (feature) => feature.geometry.coordinates
      );

      // Include origin and destination coordinates
      coordinates.push([origin.longitude, origin.latitude]);
      coordinates.push([destination.longitude, destination.latitude]);

      if (coordinates.length === 0) {
        console.warn('No coordinates available to fit camera');
        return;
      }

      let minX = coordinates[0][0];
      let minY = coordinates[0][1];
      let maxX = coordinates[0][0];
      let maxY = coordinates[0][1];
      coordinates.forEach(([lon, lat]) => {
        minX = Math.min(minX, lon);
        minY = Math.min(minY, lat);
        maxX = Math.max(maxX, lon);
        maxY = Math.max(maxY, lat);
      });
      cameraRef.current.fitBounds(
        [minX, minY],
        [maxX, maxY],
        50, // padding
        1000 // animation duration in ms
      );
      cameraRef.current.setCamera({
        pitch: 0,
        animationDuration: 1000,
      });
    }
  };

  const handleGoOrPreview = () => {
    console.log('Selected Origin:', initialOrigin); // The origin selected from the search bar
    console.log('Current Location:', currentLocation); // The user's current location (or fallback to origin)
    console.log('Destination:', destination);
    
    if (!initialOrigin || !destination || !routes[selectedRouteIndex]) {
      console.error('Missing origin, destination, or selected route');
      return;
    }
  
    // Use initialOrigin if currentLocation is null
    const originForNavigation = currentLocation || initialOrigin;
  
    // Check if the current location is within 50 meters of the selected origin
    const distanceToOrigin = getDistanceFromLatLonInKm(
      originForNavigation.latitude,
      originForNavigation.longitude,
      initialOrigin.latitude,
      initialOrigin.longitude
    ) * 1000; // Convert distance to meters
  
    console.log(`Distance to origin: ${distanceToOrigin} meters`);
  
    // If within 50 meters of the selected origin, start navigation
    if (distanceToOrigin <= 50) {
      console.log('Navigating to NavigationScreen...');
      navigation.navigate('NavigationScreen', {
        origin: originForNavigation, // Use the current location or fallback origin
        destination: destination, // Pass the destination
        route: routes[selectedRouteIndex], // Pass the selected route
      });
    } else {
      // If far from the selected origin, go to the Preview screen
      console.log('Navigating to PreviewMapScreen...');
      navigation.navigate('PreviewMapScreen', {
        origin: initialOrigin, // Use the selected origin from the search bar
        destination: destination, // Pass the destination location
        route: routes[selectedRouteIndex], // Pass the selected route with coordinates and steps
      });
    }
  };
  
  // Handle "View Routes" button click
  const handleViewRoutes = async () => {
    setIsRoutesSheetVisible(true);
    await fetchRoutes(); // Fetch routes when button is clicked
    if (routes && routes.length > 0) {
      adjustCameraForRoutes(); // Adjust camera after routes are fetched
    } else {
      console.warn('No routes were fetched.');
    }
  };

  const renderRoutes = () => {
    if (routes.length === 0) {
      return null;
    }
  
    // Define a function to get the route color based on the vehicle profile
    const getRouteColor = () => {
      switch (currentProfile) {
        case 'driving-traffic':
          return 'blue'; // Car routes  
        case 'cycling':
          return '#e87407'; // Rickshaw routes  
        case 'driving':
          return '#2196F3'; // Motorcycle routes  
        default:
          return 'gray'; // Default route color if no profile matches
      }
    };
  
    return routes.map((route, index) => (
      <MapboxGL.ShapeSource
        key={`route-source-${index}`}
        id={`route-source-${index}`}
        shape={route.featureCollection}
      >
         {/* Base route line */}
      <MapboxGL.LineLayer
        id={`base-route-line-${index}`}
        style={{
          lineWidth: 6,
          lineColor: index === selectedRouteIndex ? getRouteColor() : 'green', // Selected profile color or green for unselected
          lineOpacity: 1, // Full opacity for all routes, change only color
          lineCap: 'round',
          lineJoin: 'round',
        }}
        filter={['==', ['get', 'color'], 'base']} // Filter to render only the base route
      />

      {/* Congestion overlays */}
      <MapboxGL.LineLayer
        id={`congestion-route-line-${index}`}
        style={{
          lineWidth: 6,
          lineColor: ['get', 'color'], // Use the color from the route's congestion data
          lineOpacity: 1, // Full opacity for all routes
          lineCap: 'round',
          lineJoin: 'round',
        }}
        filter={['all', ['!=', ['get', 'color'], 'base'], ['has', 'color']]} // Filter to render congestion overlays
      />
      </MapboxGL.ShapeSource>
    ));
  };
  

  const getCongestionColor = (congestionValue) => {
    if (congestionValue === null || congestionValue === undefined) {
      return null; // No congestion data
    } else if (congestionValue > 25) {
      return 'red'; // Very high congestion
    } else if (congestionValue > 15) {
      return 'orange'; // High congestion
    } else {
      return null; // Low or moderate congestion, no overlay
    }
  };

  const handleBack = () => navigation.goBack();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <MapboxGL.MapView
          ref={mapViewRef}
          style={styles.map}
          styleURL={mapStyle}
          onDidFinishLoadingMap={() => setMapLoaded(true)}
        >
      
          <MapboxGL.Camera ref={cameraRef} />
          <MapboxGL.PointAnnotation
  id="origin"
  coordinate={[initialOrigin.longitude, initialOrigin.latitude]} // Use initialOrigin, not currentLocation
/>

          <MapboxGL.PointAnnotation
            id="destination"
            coordinate={[destination.longitude, destination.latitude]}
          />
          {renderRoutes()}
        </MapboxGL.MapView>

     
        {loadingRoutes && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Loading Routes...</Text>
          </View>
        )}
 
        <BottomSheet ref={bottomSheetRef} index={0} snapPoints={snapPoints}>
          <View style={styles.sheetContent}>
            <Text style={styles.sheetTitle}>
              {destination.description.split(',')[0]}
            </Text>
            <Text style={styles.sheetSubText}>
              Estimated Fuel:{' '}
              {estimatedFuelConsumption ? `${estimatedFuelConsumption} L` : 'Calculating...'}
            </Text>
            <Text style={styles.sheetSubText}>
              Distance: {distance ? `${distance} km` : 'Calculating...'}
            </Text>

            <TouchableOpacity
              style={styles.zoomButton}
              onPress={handleViewRoutes}
            >
              <Text style={styles.zoomButtonText}>View Routes</Text>
            </TouchableOpacity>
          </View>
        </BottomSheet>
        <SideBar onProfileChange={handleProfileChange} onToggleAlternative={handleToggleAlternative} /> 
        {/* Routes Bottom Sheet */}
        {isRoutesSheetVisible && (
         <BottomSheet ref={bottomSheetRef} index={0} snapPoints={['38%', '50%', '75%']}>
  <View style={styles.routesSheetContent}>
    <FlatList
      data={routes}
      keyExtractor={(item) => item.index.toString()}
      renderItem={({ item, index }) => {
        const distanceInKm = (item.distance / 1000).toFixed(2); // Convert distance to km with 2 decimal places
        const fuelConsumption = (distanceInKm / gasConsumption).toFixed(2); // Calculate gas consumption

        return (
          <TouchableOpacity
            style={[
              styles.routeItemCard,
              index === selectedRouteIndex && styles.selectedRouteItemCard,
            ]}
            onPress={() => {
              setSelectedRouteIndex(index);
              calculateFuelConsumption(item);
              calculateDistance(item);
              fitCameraToRoute(item); // Adjust camera to selected route
            }}
          >
            <View style={styles.routeInfoContainer}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.routeTime}>
                  {Math.round(item.duration / 60)} min
                </Text>
                {index === 0 && (
                  <View style={styles.bestLabel}>
                    <Text style={styles.bestLabelText}>Best</Text>
                  </View>
                )}
              </View>
              <Text style={styles.routeDescription}>
                {distanceInKm} km • {item.summary || 'Route details'}
              </Text>
              <Text style={styles.routeTraffic}>
                Gas Consumption: {fuelConsumption} L • Typical traffic
              </Text>
            </View>
          </TouchableOpacity>
        );
      }}
      contentContainerStyle={{ paddingBottom: 100 }} // Prevent overlap with footer buttons
    />

  
  </View>
</BottomSheet>



)}

{isRoutesSheetVisible && ( 
 <View style={styles.fixedFooter}>
      <TouchableOpacity style={styles.leaveLaterButton} onPress={handleBack}>
        <Text style={styles.leaveLaterButtonText}>Go Back</Text>
      </TouchableOpacity>
      <TouchableOpacity
  style={styles.goNowButton}
  onPress={handleGoOrPreview}  // Call handleGoOrPreview when the button is pressed
>
  <Text style={styles.goNowButtonText}>
    {isOriginAway ? 'Preview' : 'Go now'}  
  </Text>
</TouchableOpacity>

    </View>
    )}
      </View>
    </GestureHandlerRootView>
  );
};

export default DestinationScreen;
 
const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  map: { 
    flex: 1 
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
    padding: 10,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: { 
    color: 'white', 
    marginTop: 10 
  },
  sheetContent: { 
    padding: 20 
  },
  sheetTitle: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: 'black' 
  },
  sheetSubText: { 
    fontSize: 16, 
    marginVertical: 10, 
    color: 'black' 
  },
  zoomButton: {
    marginTop: 10,
    backgroundColor: 'blue',
    paddingVertical: 10,
    borderRadius: 8,
  },
  zoomButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 18,
  },
  routesSheetContent: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 20,
  },
  routeItemCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginVertical: 5,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedRouteItemCard: {
    borderColor: 'blue',
    borderWidth: 2,
  },
  routeInfoContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  routeTime: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  bestLabel: {
    backgroundColor: 'purple',
    borderRadius: 5,
    marginLeft: 8,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  bestLabelText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  routeDescription: {
    fontSize: 16,
    color: '#555',
    marginVertical: 5,
  },
  routeTraffic: {
    fontSize: 14,
    color: 'gray',
  },
  fixedFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 10,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    zIndex: 10, // Ensure it stays above other components
  },
  leaveLaterButton: {
    backgroundColor: '#e0e0e0',
    flex: 1,
    marginRight: 5,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  leaveLaterButtonText: {
    fontSize: 18,
    color: '#333',
  },
  goNowButton: {
    backgroundColor: 'blue',
    flex: 1,
    marginLeft: 5,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  goNowButtonText: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
  },
});
