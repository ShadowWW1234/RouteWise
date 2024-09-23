import React, { useRef, useState } from 'react';
import { StyleSheet, View, Modal, Text, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MapboxGL from '@rnmapbox/maps';
import { useDispatch } from 'react-redux';
import { setOrigin } from '../../slices/navSlice';

const DestinationModal = ({ visible, toggleModal, destination, toggleSearchModal }) => {
    const dispatch = useDispatch();
    const [origin, setOriginState] = useState(null);
    const [routes, setRoutes] = useState([]);
    const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
    const mapViewRef = useRef(null);
    const cameraRef = useRef(null);
    const [currentRoute, setCurrentRoute] = useState(null);

    const resetState = () => {
        setOriginState(null);
        setRoutes([]);
        setCurrentRoute(null);
    };
    
    const handleCloseModal = () => {
        resetState();
        toggleModal();
    };

    const fetchRoutes = async () => {
        if (origin && destination) {
            try {
                // Fetching routes from Mapbox
                const mapboxResponse = await fetch(
                    `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?alternatives=true&geometries=geojson&steps=true&overview=full&access_token=pk.eyJ1Ijoic2hhZG93MjI2IiwiYSI6ImNtMTl6d3NnaDFrcWIyanM4M3pwMTYxeDQifQ.wDv2IuFGRpUASw1jx540Ng`
                );

                const mapboxData = await mapboxResponse.json();
                const mapboxRoutes = mapboxData.routes.map(route => route.geometry.coordinates);

                // Fetching routes from OpenStreetMap (OSRM example)
                const osrmResponse = await fetch(
                    `http://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?alternatives=true&geometries=geojson&overview=full`
                );
                

                const osrmData = await osrmResponse.json();
                const osrmRoutes = osrmData.routes.map(route => route.geometry.coordinates);

                // Combine routes
                const allRoutes = [...mapboxRoutes, ...osrmRoutes];
                setRoutes(allRoutes);
                setCurrentRoute(allRoutes[0]); // Set the first route as default
            } catch (error) {
                console.error('Error fetching routes:', error);
            }
        }
    };

    const fitToMarkers = () => {
        if (origin && destination && cameraRef.current) {
            const bounds = {
                ne: [Math.max(origin.longitude, destination.longitude), Math.max(origin.latitude, destination.latitude)],
                sw: [Math.min(origin.longitude, destination.longitude), Math.min(origin.latitude, destination.latitude)],
            };
    
            cameraRef.current.fitBounds(
                bounds.ne,   // Northeast corner of the bounding box
                bounds.sw,   // Southwest corner of the bounding box
                100,         // Increased padding for more zoomed-out view
                1000         // Animation duration in milliseconds
            );
        }
    };
    

    const handleGoNow = () => {
        fetchRoutes();
        fitToMarkers();
    };

    const handleSelectRoute = (index) => {
        setSelectedRouteIndex(index);  // Update selected route
        setCurrentRoute(routes[index]); // Update current route
    };
    

    return (
        <Modal
            animationType="slide"
            transparent={false}
            visible={visible}
            onRequestClose={handleCloseModal}
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
                            }}
                        />

                        <MapboxGL.PointAnnotation
                            id="destination"
                            coordinate={[destination.longitude, destination.latitude]}
                        />

                        {routes.map((routeGeometry, index) => (
                            <MapboxGL.ShapeSource
                                key={`route_${index}`}
                                id={`routeSource_${index}`}
                                shape={{
                                    type: 'Feature',
                                    geometry: {
                                        type: 'LineString',
                                        coordinates: routeGeometry,
                                    },
                                }}
                                onPress={() => handleSelectRoute(index)}  // Trigger route selection on press
                            >
                                <MapboxGL.LineLayer
                                    id={`routeLayer_${index}`}
                                    style={{
                                        lineWidth: 5,
                                        lineJoin: 'round',
                                        lineColor: index === selectedRouteIndex ? '#4287f5' : '#808080', // Blue for selected, gray for others
                                        lineOpacity: index === selectedRouteIndex ? 1 : 0.4,             // Full opacity for selected, lower for others
                                    }}
                                />
                            </MapboxGL.ShapeSource>
                        ))}
                    </MapboxGL.MapView>
                )}

                <TouchableOpacity onPress={handleCloseModal} style={styles.closeButton}>
                    <View style={styles.circleButton}>
                        <Ionicons name="close" size={32} color="white" />
                    </View>
                </TouchableOpacity>

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
                                {destination.description.split(',')[0]}
                            </Text>
                            <Text style={styles.locationSubText}>
                                {destination.description.split(',').slice(1).join(', ')}
                            </Text>
                        </>
                    )}

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={handleGoNow}
                    >
                        <Text style={styles.actionButtonText}>View Routes</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

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
        left: 20,
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
        borderRadius: 30,
        alignItems: 'center',
        marginTop: 15,
    },
    actionButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 18,
    },
    circleButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default DestinationModal;
