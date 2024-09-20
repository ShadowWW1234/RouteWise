import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import MapboxGL from '@rnmapbox/maps';

MapboxGL.setAccessToken('pk.eyJ1Ijoic2hhZG93MjI2IiwiYSI6ImNtMTl6d3NnaDFrcWIyanM4M3pwMTYxeDQifQ.wDv2IuFGRpUASw1jx540Ng');

const MapScreen = () => {
  return (
    <View style={styles.container}>
    <MapboxGL.MapView
      style={styles.map}
      zoomEnabled={true}
      styleURL='mapbox://styles/mapbox/streets-v12'
      rotateEnabled={true}
    >
      <MapboxGL.Camera 
        zoomLevel={15}
        centerCoordinate={[120.90245067681445, 14.486578075433032]} // Note: order is [longitude, latitude]
        pitch={60}
        animationMode={'flyTo'}
        animationDuration={6000}
      />
      <MapboxGL.PointAnnotation 
        id='marker'
        coordinate={[120.90245067681445, 14.486578075433032]} // Note: order is [longitude, latitude]
      >
        <View style={styles.marker} />
      </MapboxGL.PointAnnotation> 
    </MapboxGL.MapView>
  </View>
  )
}

export default MapScreen

const styles = StyleSheet.create({container: {
    flex:1,
   },
   map: {
     flex: 1,
   },
   marker: {
     height: 30,
     width: 30,
     backgroundColor: '#f00',
     borderRadius: 15,
     borderWidth: 2,
     borderColor: '#fff',
   },})