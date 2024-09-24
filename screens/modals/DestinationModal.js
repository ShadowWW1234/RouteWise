import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, View, Modal, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MapboxGL from '@rnmapbox/maps';
import { useDispatch } from 'react-redux';
import { setOrigin } from '../../slices/navSlice'; 
import OptimizedShapeSource from './OptimizedShapeSource';

const DestinationModal = ({ visible, toggleModal, destination, toggleSearchModal }) => {
    const dispatch = useDispatch();
    const [origin, setOriginState] = useState(null);
    const [routes, setRoutes] = useState([]);
    const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
    const mapViewRef = useRef(null);
    const cameraRef = useRef(null);
    const [loadingRoutes, setLoadingRoutes] = useState(false);

    const resetState = () => {
        setOriginState(null);
        setRoutes([]);
        setSelectedRouteIndex(0);
    };

    const handleCloseModal = () => {
        resetState();
        toggleModal();
    };

    const fetchRoutes = async () => {
        if (!origin || !destination) return;

        setLoadingRoutes(true);

        try {
            const response = await fetch(
                `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?alternatives=true&annotations=closure%2Cmaxspeed%2Ccongestion_numeric%2Ccongestion%2Cspeed%2Cdistance%2Cduration&exclude=motorway%2Cferry%2Cunpaved%2Ccash_only_tolls&geometries=geojson&language=en&overview=full&roundabout_exits=true&steps=true&access_token=pk.eyJ1Ijoic2hhZG93MjI2IiwiYSI6ImNtMTl6d3NnaDFrcWIyanM4M3pwMTYxeDQifQ.wDv2IuFGRpUASw1jx540Ng`
            );

            const data = await response.json();
            const mapboxRoutes = data.routes.map(route => ({
                coordinates: route.geometry.coordinates,
                congestionNumeric: route.legs[0].annotation.congestion_numeric,
            }));

            setRoutes(mapboxRoutes);
            if (mapboxRoutes.length > 0) {
                setSelectedRouteIndex(0);
            }
        } catch (error) {
            console.error('Error fetching routes:', error);
        } finally {
            setLoadingRoutes(false);
        }
    };

    const fitToMarkers = () => {
        if (origin && destination && cameraRef.current) {
            const bounds = {
                ne: [Math.max(origin.longitude, destination.longitude), Math.max(origin.latitude, destination.latitude)],
                sw: [Math.min(origin.longitude, destination.longitude), Math.min(origin.latitude, destination.latitude)],
            };
            cameraRef.current.fitBounds(bounds.ne, bounds.sw, 100, 1000);
        }
    };

    const handleGoNow = () => {
        if (!loadingRoutes) {
            fetchRoutes();
            fitToMarkers();
        }
    };

    const getCongestionColor = (congestionValue) => {
        if (congestionValue >= 3) return 'red';    // Heavy traffic
        if (congestionValue === 2) return 'orange'; // Moderate traffic
        if (congestionValue === 1) return 'yellow'; // Light traffic
        return 'blue';                              // Free-flowing traffic
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
            <View style={styles.container}>
                {destination && (
                    <MapboxGL.MapView style={styles.map} ref={mapViewRef}>
                        <MapboxGL.Camera
                            ref={cameraRef}
                            zoomLevel={14}
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

                        {/* Render routes */}
                        {routes.length > 0 && routes.map((routeData, index) => {
                            const isSelected = index === selectedRouteIndex;
                            const routeOpacity = isSelected ? 1 : 0.5; // Adjust opacity based on selection
                            
                            return (
                                <React.Fragment key={`route_${index}`}>
                                    {/* Base Route - Blue Line */}
                                    <OptimizedShapeSource
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
                                                lineWidth: 6,
                                                lineColor: 'blue',
                                                lineOpacity: routeOpacity, // Apply opacity here
                                                lineCap: 'round',
                                                lineJoin: 'round',
                                            }}
                                            existing={false}
                                        />
                                    </OptimizedShapeSource>

                                    {/* Congestion Route Overlay */}
                                    {routeData.coordinates.map((coord, i) => {
                                        if (i + 1 < routeData.coordinates.length) {
                                            const congestionValue = routeData.congestionNumeric[i];
                                            if (!shouldRenderSegment(congestionValue)) return null; // Only render segments based on congestion value

                                            const segmentColor = getCongestionColor(congestionValue);

                                            return (
                                                <OptimizedShapeSource
                                                    key={`congestionSegment_${index}_${i}`}
                                                    id={`congestionRouteSegment_${index}_${i}`}
                                                    shape={{
                                                        type: 'Feature',
                                                        geometry: {
                                                            type: 'LineString',
                                                            coordinates: [coord, routeData.coordinates[i + 1]],
                                                        },
                                                    }}
                                                >
                                                    <MapboxGL.LineLayer
                                                        id={`congestionSegmentLayer_${index}_${i}`}
                                                        style={{
                                                            lineWidth: 6,
                                                            lineColor: segmentColor,
                                                            lineOpacity: routeOpacity, // Apply opacity here
                                                        }}
                                                    />
                                                </OptimizedShapeSource>
                                            );
                                        }
                                        return null;
                                    })}
                                </React.Fragment>
                            );
                        })}

                        {loadingRoutes && (
                            <View style={styles.loadingSpinner}>
                                <ActivityIndicator size="large" color="#0000ff" />
                            </View>
                        )}
                    </MapboxGL.MapView>
                )}

                <TouchableOpacity onPress={handleCloseModal} style={styles.closeButton}>
                    <Ionicons name="close" size={32} color="white" />
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => {
                        toggleModal();
                        toggleSearchModal();
                    }}
                    style={[styles.circleButton, styles.backButton]}
                >
                    <Ionicons name="arrow-back" size={32} color="white" />
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
                        disabled={loadingRoutes}
                    >
                        <Text style={styles.actionButtonText}>View Routes</Text>
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
        marginTop: 20,
    },
    actionButtonText: {
        fontSize: 18,
        color: 'white',
    },
    loadingSpinner: {
        position: 'absolute',
        top: '40%',
        left: '45%',
        zIndex: 10,
    },
});
