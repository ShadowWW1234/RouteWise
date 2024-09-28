import React, { useEffect, useState, useRef, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Button } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import * as turf from '@turf/turf';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { MapStyleContext } from './context/MapStyleContext';
import axios from 'axios';

MapboxGL.setAccessToken('pk.eyJ1Ijoic2hhZG93MjI2IiwiYSI6ImNtMTl6d3NnaDFrcWIyanM4M3pwMTYxeDQifQ.wDv2IuFGRpUASw1jx540Ng'); // Add your Mapbox access token

const NavigationScreen = ({ route }) => {
    const { origin, destination } = route.params || {};
    const [currentPosition, setCurrentPosition] = useState(null);
    const cameraRef = useRef(null);
    const [traversedRoute, setTraversedRoute] = useState([]);
    const [nonTraversedRoute, setNonTraversedRoute] = useState([]);
    const [isPanning, setIsPanning] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const { mapStyle } = useContext(MapStyleContext);
    const [instructions, setInstructions] = useState([]);
    const [currentInstruction, setCurrentInstruction] = useState('');
    const [showRecenter, setShowRecenter] = useState(false);
    const [congestionDetails, setCongestionDetails] = useState('');

    // Fetch directions from Mapbox API
    const fetchDirections = async () => {
        const originCoordinates = `${origin.longitude},${origin.latitude}`;
        const destinationCoordinates = `${destination.longitude},${destination.latitude}`;

        try {
            const response = await axios.get(
                `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${originCoordinates};${destinationCoordinates}`, 
                {
                    params: {
                        access_token: 'pk.eyJ1Ijoic2hhZG93MjI2IiwiYSI6ImNtMTl6d3NnaDFrcWIyanM4M3pwMTYxeDQifQ.wDv2IuFGRpUASw1jx540Ng',
                        steps: true,
                        geometries: 'geojson',
                        overview: 'full',
                        annotations: 'congestion',
                    }
                }
            );

            const routeData = response.data.routes[0];
            setTraversedRoute(routeData.geometry.coordinates);
            setNonTraversedRoute(routeData.geometry.coordinates);
            setInstructions(routeData.legs[0].steps);

            // Set congestion details
            if (routeData.legs[0].annotation) {
                setCongestionDetails(routeData.legs[0].annotation.congestion.join(', '));
            }
        } catch (error) {
            console.error('Error fetching directions:', error);
        }
    };

    useEffect(() => {
        fetchDirections(); // Fetch directions on component mount
    }, [origin, destination]);

    const updateRoute = (position, heading) => {
        if (!position || traversedRoute.length >= nonTraversedRoute.length) return;

        const newTraversedRoute = turf.lineSlice(
            turf.point(nonTraversedRoute[0]),
            turf.point(position),
            turf.lineString(nonTraversedRoute)
        ).geometry.coordinates;

        setTraversedRoute(newTraversedRoute);
        const remainingRoute = nonTraversedRoute.slice(newTraversedRoute.length);
        setNonTraversedRoute(remainingRoute);

        let nextInstruction = '';

        for (let i = 0; i < instructions.length; i++) {
            const step = instructions[i];
            const nextStepCoord = step.maneuver.location;
            const distanceToNextStep = turf.distance(turf.point(position), turf.point(nextStepCoord)) * 1000;

            if (distanceToNextStep > 1) {
                nextInstruction = step.maneuver.instruction;
                setCurrentInstruction(`${nextInstruction} in ${Math.round(distanceToNextStep)} meters`);
                break;
            } else {
                setInstructions(instructions.slice(i + 1));
            }
        }

        if (nextInstruction) {
            const bearing = instructions[0]?.maneuver?.bearing_after || 0;

            cameraRef.current.setCamera({
                centerCoordinate: position,
                zoomLevel: 18,
                pitch: 45,
                bearing: heading, // Update bearing with heading
                animationDuration: 500,
            });
        }

        const destinationPoint = turf.point(nonTraversedRoute[nonTraversedRoute.length - 1]);
        const distanceToDestination = turf.distance(turf.point(position), destinationPoint) * 1000;

        if (distanceToDestination <= 1) {
            setShowModal(true);
        }
    };

    const recenterMap = () => {
        if (cameraRef.current && currentPosition) {
            cameraRef.current.setCamera({
                centerCoordinate: currentPosition,
                zoomLevel: 18,
                pitch: 45,
                animationDuration: 500,
            });
            setIsPanning(false);
            setShowRecenter(false);
        }
    };

    return (
        <View style={styles.container}>
            <MapboxGL.MapView
                style={styles.map}
                styleURL={mapStyle}
                onMapIdle={() => setIsPanning(false)} // Detect when the user stops panning
            >
                <MapboxGL.Camera ref={cameraRef} />

                {/* Render traversed part of the route */}
                {traversedRoute.length > 0 && (
                    <MapboxGL.ShapeSource
                        id="traversedRouteSource"
                        shape={{
                            type: 'Feature',
                            geometry: {
                                type: 'LineString',
                                coordinates: traversedRoute,
                            },
                        }}
                    >
                        <MapboxGL.LineLayer
                            id="traversedRouteLayer"
                            style={{ lineColor: 'blue', lineWidth: 10, lineOpacity: 0.5 }}
                        />
                    </MapboxGL.ShapeSource>
                )}

                {/* User Location */}
                <MapboxGL.UserLocation
                    visible={true}
                    onUpdate={(location) => {
                        const { longitude, latitude, heading } = location.coords;
                        const newPosition = [longitude, latitude];
                        setCurrentPosition(newPosition);
                        updateRoute(newPosition, heading); // Pass heading to updateRoute

                        if (!isPanning && cameraRef.current) {
                            cameraRef.current.setCamera({
                                centerCoordinate: newPosition,
                                zoomLevel: 14,
                                pitch: 45,
                                bearing: heading, // Set initial camera bearing to user's heading
                                animationDuration: 500,
                            });
                        }
                    }}
                />
            </MapboxGL.MapView>

            {/* Turn-by-Turn Instruction Card */}
            <View style={styles.instructionCard}>
                <Text style={styles.cardTitle}>Turn-by-Turn Navigation</Text>
                <Text style={styles.instructionText}>{currentInstruction}</Text>
            </View>

            {/* Recenter Button */}
            {showRecenter && (
                <TouchableOpacity style={styles.recenterButton} onPress={recenterMap}>
                    <Ionicons name="locate" size={30} color="black" />
                </TouchableOpacity>
            )}

            {/* Modal for destination reached */}
            <Modal
                transparent={true}
                visible={showModal}
                animationType="slide"
                onRequestClose={() => setShowModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalText}>Destination Reached!</Text>
                        <Text style={styles.modalCongestionText}>Congestion: {congestionDetails}</Text>
                        <Button title="OK" onPress={() => setShowModal(false)} />
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    map: { flex: 1 },
    instructionCard: {
        position: 'absolute',
        top: 10,
        left: 10,
        right: 10,
        padding: 15,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.8,
        shadowRadius: 2,
    },
    cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
    instructionText: { fontSize: 16 },
    recenterButton: {
        position: 'absolute',
        bottom: 30,
        right: 30,
        backgroundColor: 'white',
        borderRadius: 30,
        padding: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.8,
        shadowRadius: 2,
        elevation: 5, // For Android shadow effect
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        width: 300,
        padding: 20,
        backgroundColor: 'white',
        borderRadius: 10,
        alignItems: 'center',
    },
    modalText: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
    modalCongestionText: { fontSize: 16, marginBottom: 20 },
});

export default NavigationScreen;
