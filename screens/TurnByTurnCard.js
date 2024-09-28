import React, { useEffect, useState, useRef, useCallback, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Button } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import * as turf from '@turf/turf';
import Ionicons from 'react-native-vector-icons/Ionicons';
import _ from 'lodash';
import { MapStyleContext } from './context/MapStyleContext';
 


MapboxGL.setAccessToken('pk.eyJ1Ijoic2hhZG93MjI2IiwiYSI6ImNtMTl6d3NnaDFrcWIyanM4M3pwMTYxeDQifQ.wDv2IuFGRpUASw1jx540Ng');

const NavigationScreen = ({ route, navigation }) => {
    const { origin, destination } = route.params || {};
    const [currentPosition, setCurrentPosition] = useState(null);
    const cameraRef = useRef(null);
    const [traversedRoute, setTraversedRoute] = useState([]);
    const [nonTraversedRoute, setNonTraversedRoute] = useState([]);
    const [isPanning, setIsPanning] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);
    const { mapStyle } = useContext(MapStyleContext);
    const [heading, setHeading] = useState(0);
    const [instructions, setInstructions] = useState([]); // State for turn-by-turn instructions
    const [currentInstruction, setCurrentInstruction] = useState(null); // Current instruction

    const THRESHOLD_DISTANCE = 1;
    const fixedZoomLevel = 18;

    const throttleCameraUpdate = useCallback(
        _.throttle((position, heading) => {
            if (!isPanning && cameraRef.current && !isCompleted) {
                cameraRef.current.setCamera({
                    centerCoordinate: position,
                    zoomLevel: fixedZoomLevel,
                    pitch: 70,
                    bearing: heading,
                    animationDuration: 1000,
                    animationMode: 'moveTo',
                });
            }
        }, 200),
        [isPanning, isCompleted]
    );

    const fetchDirections = async () => {
        try {
            const response = await fetch(
                `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?alternatives=true&annotations=congestion,congestion_numeric,distance,speed,duration,maxspeed&geometries=geojson&language=en&overview=full&steps=true&access_token=pk.eyJ1Ijoic2hhZG93MjI2IiwiYSI6ImNtMTl6d3NnaDFrcWIyanM4M3pwMTYxeDQifQ.wDv2IuFGRpUASw1jx540Ng`
            );

            const data = await response.json();
            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                const coordinates = route.geometry.coordinates;
                setNonTraversedRoute(coordinates);
                setInstructions(route.legs[0].steps); // Set the steps directly from API response
                setTraversedRoute([]);
                // Set initial position based on the starting point of the route
                setCurrentPosition(coordinates[0]);
                setCurrentInstruction(route.legs[0].steps[0]); // Set initial instruction
            }
        } catch (error) {
            console.error("Error fetching directions:", error);
        }
    };

    useEffect(() => {
        fetchDirections();
    }, [origin, destination]);

    const updateRoute = (position) => {
        if (!position || traversedRoute.length >= nonTraversedRoute.length || isCompleted) return;

        const newTraversedRoute = turf.lineSlice(
            turf.point(nonTraversedRoute[0]),
            turf.point(position),
            turf.lineString(nonTraversedRoute)
        ).geometry.coordinates;

        if (newTraversedRoute.length >= nonTraversedRoute.length && !isCompleted) {
            setIsCompleted(true);
            setCurrentPosition(nonTraversedRoute[nonTraversedRoute.length - 1]);
            setTimeout(() => setShowModal(true), 500);
            return;
        }

        const nextIndex = traversedRoute.length < nonTraversedRoute.length ? traversedRoute.length : traversedRoute.length - 1;
        const newHeading = turf.bearing(turf.point(nonTraversedRoute[nextIndex]), turf.point(position));
        setHeading(newHeading);

        // Update current instruction
        if (nextIndex < instructions.length) {
            const currentInstruction = instructions[nextIndex];
            const distanceToNextInstruction = turf.distance(turf.point(position), turf.point(nonTraversedRoute[nextIndex + 1])) * 1000;
            if (distanceToNextInstruction <= THRESHOLD_DISTANCE) {
                setCurrentInstruction(currentInstruction);
            }
        }

        throttleCameraUpdate(position, newHeading);
    };

    useEffect(() => {
        if (cameraRef.current && nonTraversedRoute.length > 0) {
            const initialPosition = nonTraversedRoute[0];
            const initialBearing = turf.bearing(turf.point(nonTraversedRoute[0]), turf.point(nonTraversedRoute[1]));
            cameraRef.current.setCamera({
                centerCoordinate: initialPosition,
                zoomLevel: fixedZoomLevel,
                pitch: 60,
                bearing: initialBearing,
                animationDuration: 300,
            });
        }
    }, [nonTraversedRoute]);

    return (
        <View style={styles.container}>
            {/* Turn-by-Turn Card */}
            <TurnByTurnCard instruction={currentInstruction} />

            <MapboxGL.MapView style={styles.map} styleURL={mapStyle} animationDuration={0}>
                <MapboxGL.Camera ref={cameraRef} />

                {traversedRoute.length > 0 && (
                    <MapboxGL.ShapeSource
                        id="traversedRouteSource"
                        shape={{
                            type: 'Feature',
                            geometry: { type: 'LineString', coordinates: traversedRoute },
                        }}
                    >
                        <MapboxGL.LineLayer id="traversedRouteLayer" style={{ lineColor: 'gray', lineWidth: 10, lineOpacity: 0.5 }} />
                    </MapboxGL.ShapeSource>
                )}

                {nonTraversedRoute.length > 0 && (
                    <MapboxGL.ShapeSource
                        id="nonTraversedRouteSource"
                        shape={{
                            type: 'Feature',
                            geometry: { type: 'LineString', coordinates: nonTraversedRoute },
                        }}
                    >
                        <MapboxGL.LineLayer id="nonTraversedRouteLayer" style={{ lineColor: 'blue', lineWidth: 4 }} />
                    </MapboxGL.ShapeSource>
                )}

                {currentPosition && (
                    <MapboxGL.PointAnnotation
                        id="userLocationMarker"
                        coordinate={currentPosition}
                        anchor={{ x: 0.5, y: 0.5 }}
                    >
                        <View style={styles.marker} />
                    </MapboxGL.PointAnnotation>
                )}
            </MapboxGL.MapView>

            {/* Your Modal code for completion */}
            <Modal visible={showModal}>
                <View>
                    <Text>Navigation Completed!</Text>
                    <Button title="Close" onPress={() => navigation.goBack()} />
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    map: {
        flex: 1,
    },
    marker: {
        width: 20,
        height: 20,
        backgroundColor: 'red',
        borderRadius: 10,
    },
});

export default NavigationScreen;
