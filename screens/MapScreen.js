import { StyleSheet, View, PermissionsAndroid } from 'react-native';
import React, { useEffect, useRef,useContext,useState } from 'react';
import MapboxGL from '@rnmapbox/maps';
import Geolocation from '@react-native-community/geolocation';
import { useDispatch, useSelector } from 'react-redux';
import { setOrigin, selectOrigin } from '../slices/navSlice';
import { MapStyleContext } from "./context/MapStyleContext"; 
import {  MAPBOX_API_TOKEN } from '@env';

MapboxGL.setAccessToken(MAPBOX_API_TOKEN);

const MapScreen = ({ destination }) => {
  const dispatch = useDispatch();
  const origin = useSelector(selectOrigin);
  const mapRef = useRef(null);
  const { mapStyle } = useContext(MapStyleContext);
  const [mapError, setMapError] = useState(null);


  const handleMapError = (error) => {
    if (error.message.includes('Source mapboxUserLocation is not in style')) {
      console.warn('User location source not found in style, ignoring error.');
      return; // Ignore this specific error
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
      }
    } catch (err) {
      console.warn(err);
    }
  };

  const getLocation = () => {
    Geolocation.getCurrentPosition(
      (position) => {
        const { longitude, latitude } = position.coords;
        dispatch(setOrigin({
          location: { latitude, longitude },
          description: 'Your current location',
        }));
      },
      (error) => {
        //console.error('Error getting location:', error);
      },
      { enableHighAccuracy: true, timeout: 60000, maximumAge: 1000 }
    );
  };

  useEffect(() => {
    requestLocationPermission();
  }, [dispatch]);

  useEffect(() => {
    if (destination && mapRef.current) {
      // Directly set camera to destination without animation
      mapRef.current.setCamera({
        centerCoordinate: [destination.longitude, destination.latitude],
        zoomLevel: 14,
        animationDuration: 0,
      });
    }
  }, [destination]);

  return (
    <View style={styles.container}>
      {mapError && <Text style={{ color: 'red' }}>Error loading map: {mapError}</Text>}
      <MapboxGL.MapView
        ref={mapRef} // Reference the map view
        style={styles.map}
        zoomEnabled={true}
        styleURL={mapStyle}
        onError={handleMapError}
      >
        <MapboxGL.Camera
          zoomLevel={18}
          centerCoordinate={origin.location 
            ? [origin.location.longitude, origin.location.latitude]
            : [120.89943929038361, 14.488862043596518]}  // Fallback to static location
          pitch={60}
          animationMode="none" // Disable animation mode
        />

{mapStyle && mapStyle.includes('mapbox://styles/mapbox') && (
  <MapboxGL.UserLocation
    androidRenderMode="gps"
    visible={true}
    showsUserHeadingIndicator={true}
    onUpdate={(location) => {
      dispatch(setOrigin({
        location: { latitude: location.coords.latitude, longitude: location.coords.longitude },
        description: 'Your current location',
      }));
    }}
  />
)}

      </MapboxGL.MapView>
    </View>
  );
};
export default MapScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
});
