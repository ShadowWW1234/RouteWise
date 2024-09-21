import React, { useRef, useState } from 'react';
import { StyleSheet, View, Modal, Text, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MapboxGL from '@rnmapbox/maps';
import { useDispatch } from 'react-redux';
import { setOrigin } from '../../slices/navSlice';
import polyline from '@mapbox/polyline';

const DestinationModal = ({ visible, toggleModal, destination, toggleSearchModal }) => {
    const dispatch = useDispatch();
    const [origin, setOriginState] = useState(null);
    const [lastOrigin, setLastOrigin] = useState(null);
    const [route, setRoute] = useState(null);
    const mapViewRef = useRef(null);
    const cameraRef = useRef(null);

    const logOrigin = (newOrigin) => {
        if (!lastOrigin || 
            Math.abs(newOrigin.latitude - lastOrigin.latitude) > 0.0001 || 
            Math.abs(newOrigin.longitude - lastOrigin.longitude) > 0.0001) {
            console.log('Origin:', newOrigin);
            setLastOrigin(newOrigin);
        }
    };

    const fetchRoute = async () => {
        if (origin && destination) {
            try {
                const response = await fetch(
                    `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?access_token=pk.eyJ1Ijoic2hhZG93MjI2IiwiYSI6ImNtMTl6d3NnaDFrcWIyanM4M3pwMTYxeDQifQ.wDv2IuFGRpUASw1jx540Ng`
                );
                const data = await response.json();
                console.log('Directions API Response:', data);
    
                if (data.routes && data.routes.length > 0) {
                    const geometry = data.routes[0].geometry;
                    const coordinates = polyline.decode(geometry);
                    const routeCoordinates = coordinates.map(coord => [coord[1], coord[0]]);
                    setRoute(routeCoordinates); // Directly set the route without snapping
                } else {
                    console.error('No routes found', data);
                }
            } catch (error) {
                console.error('Error fetching route:', error);
            }
        }
    };
    
    
    const fitToMarkers = () => {
        if (origin && destination) {
            const sw = [Math.min(origin.longitude, destination.longitude), Math.min(origin.latitude, destination.latitude)];
            const ne = [Math.max(origin.longitude, destination.longitude), Math.max(origin.latitude, destination.latitude)];
    
            cameraRef.current.setCamera({
                bounds: {
                    ne: ne,
                    sw: sw,
                },
                padding: {
                    top: 100,
                    bottom: 40,
                    left: 50,
                    right: 40,
                },
                duration: 1000,
            });
        }
    };

    const handleGoNow = () => {
        fetchRoute();
        fitToMarkers(); // Fit the markers to the screen
    };

    return (
        <Modal
            animationType="slide"
            transparent={false}
            visible={visible}
            onRequestClose={toggleModal}
        >
            <View style={styles.container}>
                {destination && (
                    <MapboxGL.MapView style={styles.map} ref={mapViewRef}>
                        <MapboxGL.Camera
                            ref={cameraRef}
                            zoomLevel={18}
                            centerCoordinate={[destination.longitude, destination.latitude]}
                            pitch={60}
                            animationMode="flyTo"
                            animationDuration={6000}
                        />

                        <MapboxGL.UserLocation
                            androidRenderMode="gps"
                            visible={true}
                            showsUserHeadingIndicator={true}
                            onUpdate={(location) => {
                                const originData = {
                                    latitude: location.coords.latitude,
                                    longitude: location.coords.longitude,
                                };
                                dispatch(setOrigin({
                                    location: originData,
                                    description: 'Your current location',
                                }));
                                setOriginState(originData);
                                logOrigin(originData);
                            }}
                        />

                        <MapboxGL.PointAnnotation
                            id="destination"
                            coordinate={[destination.longitude, destination.latitude]}
                        />

                        {/* Route Line */}
                        {route && (
                            <MapboxGL.ShapeSource id="routeSource" shape={{ type: 'Feature', geometry: { type: 'LineString', coordinates: route } }}>
                                <MapboxGL.LineLayer id="routeLayer" style={styles.routeLine} />
                            </MapboxGL.ShapeSource>
                        )}
                    </MapboxGL.MapView>
                )}

                {/* Close Button */}
                <TouchableOpacity onPress={toggleModal} style={styles.closeButton}>
                    <View style={styles.circleButton}>
                        <Ionicons name="close" size={32} color="white" />
                    </View>
                </TouchableOpacity>

                {/* Back Button */}
                <TouchableOpacity
                    onPress={() => {
                        toggleModal();
                        toggleSearchModal();
                    }}
                    style={[styles.circleButton, styles.backButton]}
                >
                    <View style={styles.circleButton}>
                        <Ionicons name="arrow-back" size={32} color="white" />
                    </View>
                </TouchableOpacity>

                <View style={styles.modalContent}>
                    {destination && (
                        <>
                            <Text style={styles.title}>
                                {destination.description.split(',')[0]} {/* City */}
                            </Text>
                            <Text style={styles.locationSubText}>
                                {destination.description.split(',').slice(1).join(', ')} {/* Remaining description */}
                            </Text>
                        </>
                    )}

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={handleGoNow}
                    >
                        <Text style={styles.actionButtonText}>Go Now</Text>
                    </TouchableOpacity>
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
        height: '80%',
        width: '100%',
    },
    closeButton: {
        position: 'absolute',
        top: 20,
        right: 20,
        zIndex: 1,
    },
    backButton: {
        position: 'absolute',
        top: 20,
        left: 20, // Positioning it on the left side
        zIndex: 1,
    },
    modalContent: {
        flex: 1,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginVertical: 10,
        color: 'black',
    },
    locationSubText: {
        fontSize: 18,
        color: 'gray',
    },
    actionButton: {
        backgroundColor: '#2196F3',
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 5,
        alignItems: 'center',
        marginTop: 20,
    },
    actionButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 18,
    },
    circleButton: {
        width: 50,           // Diameter of the circle
        height: 50,
        borderRadius: 25,     // Half of the width/height to make it a circle
        backgroundColor: 'rgba(0, 0, 0, 0.5)',  // Black with 50% opacity
        justifyContent: 'center',  // Center the icon inside the circle
        alignItems: 'center',
    },  
    routeLine: {
        lineWidth: 10,
        lineJoin: 'round',
        lineColor: '#4287f5', // Change to a color that contrasts well with your map
        lineOpacity: 0.8, // Adjust opacity to make it more visible
    }
    
});
