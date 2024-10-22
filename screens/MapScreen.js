import { StyleSheet, View, PermissionsAndroid, TouchableOpacity, Text } from 'react-native';
import React, { useEffect, useRef, useContext, useState } from 'react';
import MapboxGL from '@rnmapbox/maps';
import Geolocation from '@react-native-community/geolocation';
import { useDispatch, useSelector } from 'react-redux';
import { setOrigin, selectOrigin } from '../slices/navSlice';
import { MapStyleContext } from './context/MapStyleContext';
import { MAPBOX_API_TOKEN } from '@env';
import Ionicons from 'react-native-vector-icons/Ionicons';

MapboxGL.setAccessToken(MAPBOX_API_TOKEN);

const MapScreen = ({ destination }) => {
  const dispatch = useDispatch();
  const origin = useSelector(selectOrigin);
  const mapRef = useRef(null);
  const { mapStyle } = useContext(MapStyleContext);
  const [mapError, setMapError] = useState(null);
  const [currentSpeed, setCurrentSpeed] = useState(0);  
  const [isRecentered, setIsRecentered] = useState(true); 
  const cameraRef = useRef(null);
  const [locationError, setLocationError] = useState(null);  
  

  const handleMapError = (error) => {
    if (error.message.includes('Source mapboxUserLocation is not in style')) {
      console.warn('User location source not found in style, ignoring error.');
      return;  
    }
    console.error('Map load error:', error);
    setMapError(error.message);
  };
 
 
  const requestLocationPermission = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'App needs access to your location.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        getLocation();
      } else {
        console.log('Location permission denied');
        setLocationError('Location permission denied');
      }
    } catch (err) {
      console.warn(err);
    }
  };

 
  const handleLocationError = (error) => {
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
  const getLocation = () => {
    Geolocation.getCurrentPosition(
      (position) => {
        const { longitude, latitude } = position.coords;
        dispatch(
          setOrigin({
            location: { latitude, longitude },
            description: 'Your current location',
          })
        );
        setLocationError(null);  
      },
      (error) => {
     
        handleLocationError(error);  
      },
      { enableHighAccuracy: true, timeout: 60000, maximumAge: 1000 }
    );
  };

useEffect(() => {
    requestLocationPermission();
  }, [dispatch]);

  useEffect(() => {
    if (destination && mapRef.current) {
 
      mapRef.current.setCamera({
        centerCoordinate: [destination.longitude, destination.latitude],
        zoomLevel: 14,
        animationDuration: 0,
      });
    }
  }, [destination]);

 
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

  return (
    <View style={styles.container}>
         {mapError && <Text  style={styles.errorText}>Error loading map: {mapError}</Text>}
      {locationError && <Text style={styles.errorText}>{locationError}</Text>}  
        <MapboxGL.MapView
        ref={mapRef}
        style={styles.map}
        zoomEnabled={true}
        styleURL={mapStyle}
        onError={handleMapError}
        onCameraChanged={() => setIsRecentered(false)}  
        onMapIdle={() => setIsRecentered(false)}  
      >

<MapboxGL.Camera
          ref={cameraRef}
          zoomLevel={18}
          centerCoordinate={
            origin.location
              ? [origin.location.longitude, origin.location.latitude]
              : [120.89943929038361, 14.488862043596518]  
          }
          pitch={60}
          animationMode="flyTo" 
          followUserLocation={false}  
        />

    
{mapStyle && mapStyle.includes('mapbox://styles/mapbox') && (
          <MapboxGL.UserLocation
            androidRenderMode="gps"
            visible={true}
            showsUserHeadingIndicator={true}
            onUpdate={(location) => {
              dispatch(
                setOrigin({
                  location: {
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                  },
                  description: 'Your current location',
                })
              );
              setCurrentSpeed(location.coords.speed || 0); // Update speedometer
            }}
          />
        )}
      </MapboxGL.MapView>


      {/* Recenter Button */}
      {!isRecentered && (
        <TouchableOpacity style={styles.recenterButton} onPress={recenterMap}>
          <Ionicons name="locate-outline" size={24} color="black" />
        </TouchableOpacity>
      )}
      {/* Speedometer */}
      <View style={styles.speedometer}>
        <Text style={styles.speedometerText}>{Math.round(currentSpeed * 3.6) }</Text>
       <Text  > km/h</Text>
      </View>
    </View>
  );
};
export default MapScreen;


const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
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
    backgroundColor: '#00000080',  
    padding: 10,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    bottom:100
  },
  speedometerText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    
  },
  errorText:{
    color:'red',
alignSelf:'center'
  }

});
