import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const RouteDetailsScreen = ({ route, navigation }) => {
    const { routes } = route.params; // Get the passed routes

    const handleSelectRoute = (selectedRoute) => {
        // Handle the selection of the route
        console.log('Selected Route:', selectedRoute);
        // You can navigate to another screen or update state as needed
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Available Routes</Text>
            {routes.map((routeData, index) => (
                <TouchableOpacity key={index} onPress={() => handleSelectRoute(routeData)}>
                    <Text style={styles.routeText}>Route {index + 1}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    routeText: {
        fontSize: 18,
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
    },
});

export default RouteDetailsScreen;
