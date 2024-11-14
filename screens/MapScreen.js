import {
  StyleSheet,
  View,
  PermissionsAndroid,
  TouchableOpacity,
  Text,
  Alert,
  Modal,
  Image,
  Linking 
} from 'react-native';
import React, {useEffect, useRef, useContext, useState} from 'react';
import MapboxGL from '@rnmapbox/maps';
import Geolocation from '@react-native-community/geolocation';
import {useDispatch, useSelector} from 'react-redux';
import {setOrigin, selectOrigin} from '../slices/navSlice';
import {MapStyleContext} from './context/MapStyleContext';
import {MAPBOX_API_TOKEN} from '@env';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {IncidentContext} from './context/IncidentContext';
import {getDistance} from 'geolib';
import NetInfo from '@react-native-community/netinfo';
import ConnectionStatusModal from './modals/ConnectionStatusModal';

MapboxGL.setAccessToken(MAPBOX_API_TOKEN);

const MapScreen = ({destination}) => {
  const dispatch = useDispatch();
  const origin = useSelector(selectOrigin);
  const mapRef = useRef(null);
  const {mapStyle} = useContext(MapStyleContext);
  const [mapError, setMapError] = useState(null);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [isRecentered, setIsRecentered] = useState(true);
  const cameraRef = useRef(null);
  const [locationError, setLocationError] = useState(null);

  const {incidents, addIncident} = useContext(IncidentContext);
  const [incidentLocation, setIncidentLocation] = useState(null);

  const [isModalVisible, setIsModalVisible] = useState(false);

  const [selectedIncidentType, setSelectedIncidentType] = useState(null);
  const [selectedIncident, setSelectedIncident] = useState(null);

  const badWeatherIcon = require('../assets/bad_weather.png');
  const trafficJamIcon = require('../assets/traffic_jam.png');
  const crashIcon = require('../assets/crash.png');
  const hazardIcon = require('../assets/hazard.png');
  const closureIcon = require('../assets/roadclose.png');
  const policeIcon = require('../assets/police.png');
 
 
  const [isConnectionModalVisible, setIsConnectionModalVisible] = useState(false);
  const toggleConnectionModal = () => {
    setIsConnectionModalVisible(!isConnectionModalVisible);
  };
  const handleMapError = error => {
    if (error.message.includes('Source mapboxUserLocation is not in style')) {
      console.warn('User location source not found in style, ignoring error.');
      return;
    }
    console.error('Map load error:', error);
    setMapError(error.message);
  };

  const requestLocationPermission = async () => {
    try {
      // Request location permission from the user
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'App needs access to your location.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
  
      // If permission is granted, check if location services (GPS) are enabled
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        checkLocationServices(); // Check if GPS is enabled and proceed
      } else {
        console.log('Location permission denied');
        setLocationError('Location permission denied');
      }
    } catch (err) {
      console.warn(err);
      setLocationError('Error requesting location permission');
    }
  };
  
  const checkLocationServices = async () => {
    // First, check internet connectivity
    const netInfo = await NetInfo.fetch();
  
    if (!netInfo.isConnected) {
      // Instead of showing an alert, display the connection status modal
      setIsConnectionModalVisible(true);
      return; // Stop execution here if there's no internet
    }
  
    // If connected, proceed to get location
    Geolocation.getCurrentPosition(
      position => {
        console.log('Location services are enabled');
        getLocation(); // Proceed to get the location
      },
      error => {
        if (error.code === 1) {
          // Permission denied
          console.log('Permission denied');
          setLocationError('Permission denied');
        } else if (error.code === 2) {
          // Position unavailable (GPS turned off)
          Alert.alert(
            'Location Services Disabled',
            'Please enable location services to report incidents.',
            [
              {
                text: 'Go to Settings',
                onPress: () => Linking.openSettings(), // Open device settings to enable GPS
              },
              { text: 'Cancel', style: 'cancel' },
            ],
          );
        } else if (error.code === 3) {
          // Timeout
          console.error('Location request timed out');
          Alert.alert(
            'Location Timeout',
            'Unable to retrieve your location within the allotted time. Please try again or check your GPS settings.',
          );
        } else {
          console.error('Error checking location services:', error);
        }
      },
      {
        enableHighAccuracy: true, // Request high-accuracy GPS
        timeout: 20000, // Increase timeout to 20 seconds (20000ms)
        maximumAge: 1000, // Cache the location for 1 second
        distanceFilter: 10, // Update location every 10 meters
      },
    );
  };
  
  const incidentTypes = [
    {id: 'bad_weather', label: 'Bad Weather', icon: badWeatherIcon},
    {id: 'traffic_jam', label: 'Traffic Jam', icon: trafficJamIcon},
    {id: 'crash', label: 'Crash', icon: crashIcon},
    {id: 'hazard', label: 'Hazard', icon: hazardIcon},
    {id: 'closure', label: 'Closure', icon: closureIcon},
    {id: 'police', label: 'Police', icon: policeIcon},
  ];

  const handleSubmitIncident = async () => {
    if (!incidentLocation) {
      Alert.alert('Error', 'Unable to get your location. Please try again.');
      return;
    }

    if (!selectedIncidentType) {
      Alert.alert('Error', 'Please select an incident type.');
      return;
    }

    const newIncident = {
      type: selectedIncidentType,
      coordinates: incidentLocation,
      timestamp: new Date().toISOString(),
    };

    try {
      await addIncident(newIncident);
      Alert.alert('Success', 'Incident reported successfully!');
      setIsModalVisible(false);
      setSelectedIncidentType(null);
    } catch (error) {
      console.error('Error reporting incident: ', error);
      Alert.alert('Error', 'Failed to report incident.');
    }
  };

  useEffect(() => {
    getLocation(); // Fetch the user's location when the component mounts
  }, []);

  useEffect(() => {
    requestLocationPermission();
  }, [dispatch]);

  // useEffect(() => {
  //   if (destination && mapRef.current) {
  //     mapRef.current.setCamera({
  //       centerCoordinate: [destination.longitude, destination.latitude],
  //       zoomLevel: 14,
  //       animationDuration: 0,
  //     });
  //   }
  // }, [destination]);

  const handleLocationError = error => {
    switch (error.code) {
      case 1: // PERMISSION_DENIED
        setLocationError('Permission denied. Please allow access to location.');
        break;
      case 2: // POSITION_UNAVAILABLE
        setLocationError('Position unavailable. Please check your GPS.');
        break;
      default:
        setLocationError('An unknown error occurred while fetching location.');
        break;
    }
  };

  const formatTimestamp = isoString => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const handleIncidentPress = async event => {
    console.log('pressed');
    const features = event.features;
    if (features && features.length > 0) {
      const incidentFeature = features[0];
      const incidentProperties = incidentFeature.properties;
      const incidentId = incidentProperties.id;

      // Find the incident in the incidents array
      const incident = incidents.find(inc => inc.id === incidentId);

      if (incident) {
        await handleIncidentSelection(incident);
      }
    }
  };

  const handleIncidentSelection = async incident => {
    console.log('handleIncidentSelection called with incident:', incident);
    if (origin.location) {
      // Calculate distance
      const distance = getDistance(
        {
          latitude: origin.location.latitude,
          longitude: origin.location.longitude,
        },
        {latitude: incident.coordinates[1], longitude: incident.coordinates[0]},
      );
      const distanceInKm = (distance / 1000).toFixed(1);

      // Fetch location name
      const locationName = await fetchLocationName(
        incident.coordinates[0],
        incident.coordinates[1],
      );

      // Update selected incident with additional info
      const updatedIncident = {
        ...incident,
        distance: distanceInKm,
        locationName: locationName,
      };
      setSelectedIncident(updatedIncident);

      console.log('selectedIncident updated:', updatedIncident);
    } else {
      Alert.alert('Location Error', 'Unable to get your current location.');
    }
  };

  const fetchLocationName = async (longitude, latitude) => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${MAPBOX_API_TOKEN}`,
      );
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        return data.features[0].place_name;
      }
      return 'Unknown location';
    } catch (error) {
      console.error('Error fetching location name:', error);
      return 'Unknown location';
    }
  };

  const getLocation = () => {
    console.log('Fetching current location...');

    Geolocation.getCurrentPosition(
      position => {
        const {longitude, latitude} = position.coords;
        setIncidentLocation([longitude, latitude]); // Set the user's location

        console.log('Incident location set to:', [longitude, latitude]); // Log the coordinates for debugging

        // Update the Redux state with the new location
        dispatch(
          setOrigin({
            location: {latitude, longitude},
            description: 'Your current location',
          }),
        );

        setLocationError(null); // Clear any location errors
      },
      error => {
        console.error('Error fetching location:', error); // Log any errors
        handleLocationError(error); // Handle the error
      },
      {enableHighAccuracy: true, timeout: 60000, maximumAge: 1000}, // Request high accuracy
    );
  };

  const recenterMap = () => {
    if (origin.location && cameraRef.current) {
      cameraRef.current.setCamera({
        centerCoordinate: [origin.location.longitude, origin.location.latitude],
        zoomLevel: 18,
        animationDuration: 500,
      });
      setIsRecentered(true);
    }
  };

  const incidentsGeoJSON = {
    type: 'FeatureCollection',
    features: incidents
      .filter(
        incident =>
          Array.isArray(incident.coordinates) &&
          incident.coordinates.length === 2,
      )
      .map(incident => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: incident.coordinates,
        },
        properties: {
          id: incident.id,
          type: incident.type,
          icon: `${incident.type}-icon`,
        },
      })),
  };

  return (
    <View style={styles.container}>
      {mapError && (
        <Text style={styles.errorText}>Error loading map: {mapError}</Text>
      )}
      {locationError && <Text style={styles.errorText}>{locationError}</Text>}

      {/* Incident Details Panel */}
      {selectedIncident && (
        <View style={styles.incidentDetailsContainer}>
          <View style={styles.incidentDetails}>
            <Image
              source={
                incidentTypes.find(type => type.id === selectedIncident.type)
                  .icon
              }
              style={styles.incidentDetailsIcon}
              resizeMode="contain"
            />
            <View style={styles.incidentDetailsText}>
              <Text style={styles.incidentDetailsDistance}>
                {selectedIncident.distance} km away
              </Text>
              <Text style={styles.incidentDetailsLocation}>
                {selectedIncident.locationName}
              </Text>
              <Text style={styles.incidentDetailsTime}>
                Reported: {formatTimestamp(selectedIncident.timestamp)}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setSelectedIncident(null)}
              style={styles.incidentDetailsClose}>
              <Ionicons name="close" size={24} color="black" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <MapboxGL.MapView
        ref={mapRef}
        style={styles.map}
        zoomEnabled={true}
        styleURL={mapStyle}
        onError={handleMapError}
        onCameraChanged={() => setIsRecentered(false)}
        onMapIdle={() => setIsRecentered(false)}>
       
       <MapboxGL.Camera
  ref={cameraRef}
  zoomLevel={16}
  centerCoordinate={
    destination
      ? [destination.longitude, destination.latitude]
      : origin.location
        ? [origin.location.longitude, origin.location.latitude]
        : [120.89943929038361, 14.488862043596518]
  }
  pitch={0}
  animationMode="flyTo"
  followUserLocation={false}
/>


        {mapStyle && mapStyle.includes('mapbox://styles/mapbox') && (
          <MapboxGL.UserLocation
            androidRenderMode="gps"
            visible={true}
            showsUserHeadingIndicator={true}
            onUpdate={location => {
              dispatch(
                setOrigin({
                  location: {
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                  },
                  description: 'Your current location',
                }),
              );
              setCurrentSpeed(location.coords.speed || 0); // Update speedometer
            }}
          />
        )}

        {/* Load custom icons */}
        <MapboxGL.Images
          images={{
            'bad_weather-icon': require('../assets/bad_weather.png'),
            'traffic_jam-icon': require('../assets/traffic_jam.png'),
            'crash-icon': require('../assets/crash.png'),
            'hazard-icon': require('../assets/hazard.png'),
            'closure-icon': require('../assets/roadclose.png'),
            'police-icon': require('../assets/police.png'),
          }}
        />

        {/* Display incidents using ShapeSource and SymbolLayer */}
        <MapboxGL.ShapeSource
          id="incidentsSource"
          shape={incidentsGeoJSON}
          onPress={handleIncidentPress}>
          <MapboxGL.SymbolLayer
            id="incidentsSymbols"
            minZoomLevel={14}
            maxZoomLevel={22}
            style={{
              iconImage: ['get', 'icon'],
              iconSize: 0.1, // Reduced icon size
              iconAllowOverlap: true,
              iconIgnorePlacement: true,
              iconAnchor: 'bottom',
              iconPitchAlignment: 'map',
              iconRotationAlignment: 'map',
            }}
          />
        </MapboxGL.ShapeSource>
      </MapboxGL.MapView>

      {/* Recenter Button */}
      {!isRecentered && (
        <TouchableOpacity style={styles.recenterButton} onPress={recenterMap}>
          <Ionicons name="locate-outline" size={24} color="black" />
        </TouchableOpacity>
      )}
      {/* Speedometer */}
      <View style={styles.speedometer}>
        <Text style={styles.speedometerText}>
          {Math.round(currentSpeed * 3.6)}
        </Text>
        <Text style={styles.speedometerUnit}> km/h</Text>
      </View>

   
      {/* Incident Reporting Button */}
      <TouchableOpacity
        style={styles.incidentButton}
        onPress={() => setIsModalVisible(true)}>
        <Ionicons
          name="warning-outline" // Choose an icon that represents reporting an incident
          size={24}
          color="white"
          style={styles.incidentButtonIcon}
        />
        <Text style={styles.incidentButtonText}>Report</Text>
      </TouchableOpacity>
      <ConnectionStatusModal 
        modalVisible={isConnectionModalVisible} 
        toggleModal={toggleConnectionModal} 
      />
 
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => {
          setIsModalVisible(false);
          setSelectedIncidentType(null);
        }}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Incident Type</Text>
            <View style={styles.incidentGrid}>
              {incidentTypes.map(incident => (
                <TouchableOpacity
                  key={incident.id}
                  style={[
                    styles.incidentItem,
                    selectedIncidentType === incident.id &&
                      styles.selectedIncidentItem,
                  ]}
                  onPress={() => setSelectedIncidentType(incident.id)}>
                  <Image
                    source={incident.icon}
                    style={styles.incidentIcon}
                    resizeMode="contain"
                  />
                  {selectedIncidentType === incident.id && (
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color="green"
                      style={styles.checkmarkIcon}
                    />
                  )}
                  <Text style={styles.incidentLabel}>{incident.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmitIncident}>
              <Text style={styles.submitButtonText}>Report Incident</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setIsModalVisible(false);
                setSelectedIncidentType(null);
              }}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default MapScreen;

const styles = StyleSheet.create({
  container: {flex: 1},
  map: {flex: 1},
  recenterButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 50,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedometer: {
    position: 'absolute',
    left: 10,
    bottom: 100,
    backgroundColor: '#00000080',
    padding: 10,
    borderRadius: 50,
    alignItems: 'center',
    flexDirection: 'row',
  },
  speedometerText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  speedometerUnit: {
    color: 'white',
    fontSize: 16,
    marginLeft: 5,
  },
  errorText: {
    color: 'red',
    alignSelf: 'center',
  },
  incidentButton: {
    position: 'absolute',
    bottom: 170,
    right: 10,
    backgroundColor: '#ff6347',
    borderRadius: 35,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  incidentButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  incidentIcon: {
    width: 20,
    height: 20,
    marginBottom: 4,
  },
  incidentItem: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 16,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    position: 'relative', // Needed for absolute positioning
  },

  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 8,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  incidentOption: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    marginBottom: 8,
  },
  selectedIncidentOption: {
    backgroundColor: '#ff6347',
  },
  incidentOptionText: {
    fontSize: 16,
    color: 'black',
  },
  submitButton: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#ff6347',
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#cccccc',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'black',
    fontSize: 16,
    fontWeight: 'bold',
  },
  incidentLabel: {
    color: 'black',
    fontSize: 13,
    fontWeight: 'bold',
  },
  checkmarkIcon: {
    position: 'absolute',
    top: 5,
    right: 5,
  },
  selectedIncidentItem: {
    borderColor: 'green',
    borderWidth: 2, // Optional: Highlight the selected item
  },
  incidentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  incidentDetailsContainer: {
    position: 'absolute',
    top: 0,
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    height: 100,
    zIndex: 999,
  },

  incidentDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  incidentDetailsIcon: {
    width: 40,
    height: 40,
    marginRight: 10,
  },

  incidentDetailsText: {
    flex: 1,
  },

  incidentDetailsDistance: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'black',
  },

  incidentDetailsLocation: {
    fontSize: 14,
    color: '#555',
  },

  incidentDetailsClose: {
    padding: 5,
  },
  incidentDetailsTime: {
    fontSize: 10,
    color: '#777',
  },
});
