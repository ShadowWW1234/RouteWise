import { StyleSheet, View, PermissionsAndroid, Modal, Text, TouchableOpacity } from 'react-native';
import React, { useEffect, useRef, useState } from 'react';
import MapboxGL from '@rnmapbox/maps';
import Geolocation from '@react-native-community/geolocation';
import { useDispatch, useSelector } from 'react-redux';
import { setOrigin, selectOrigin,setDestination  } from '../slices/navSlice';
 
MapboxGL.setAccessToken('pk.eyJ1Ijoic2hhZG93MjI2IiwiYSI6ImNtMTl6d3NnaDFrcWIyanM4M3pwMTYxeDQifQ.wDv2IuFGRpUASw1jx540Ng');

const MapScreen = ({ destination }) => {
  const dispatch = useDispatch();
  const origin = useSelector(selectOrigin);
 
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
        getLocation(); // Fetch location if permission granted
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
        console.error('Error getting location:', error);
      },
      { enableHighAccuracy: true, timeout: 60000, maximumAge: 1000 }
    );
  };

  useEffect(() => {
    requestLocationPermission();
  }, [dispatch]);

  const mapRef = useRef(null);

    useEffect(() => {
        if (destination && mapRef.current) {
            // Zoom to the selected destination when it changes
            mapRef.current.setCamera({
                centerCoordinate: [destination.longitude, destination.latitude],
                zoomLevel: 14, // Adjust zoom level as needed
                animationDuration: 1000, // Optional: animation duration in ms
            });
        }
    }, [destination]);
   
  return (
    <View style={styles.container}>
      <MapboxGL.MapView
        style={styles.map}
        zoomEnabled={true}
        styleURL="mapbox://styles/mapbox/streets-v12"
        rotateEnabled={true}
      >
        <MapboxGL.Camera
  zoomLevel={18}
  centerCoordinate={
    origin.location 
      ? [origin.location.longitude, origin.location.latitude]
      : [120.89943929038361, 14.488862043596518]  // Fallback to static location
  }
  pitch={60}
  animationMode={'flyTo'}
  animationDuration={2000}
/>

        
        <MapboxGL.UserLocation
           androidRenderMode="gps"
           visible={true}
           showsUserHeadingIndicator={true} // Show heading indicator
           onUpdate={(location) => {
                dispatch(setOrigin({
                location: { latitude: location.coords.latitude, longitude: location.coords.longitude },
                description: 'Your current location',
                }));
            }}
        />
        
     
      </MapboxGL.MapView>

  
    </View>
  );
};

export default MapScreen;

const styles = StyleSheet.create({
    container: { flex: 1 },
    map: { flex: 1 },
    
 
});
