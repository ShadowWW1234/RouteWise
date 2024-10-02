import React, { useState, useCallback } from 'react';
import { View, TextInput, FlatList, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import axios from 'axios';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { MAPBOX_API_TOKEN } from '@env';
import { debounce } from 'lodash';

const StopSearchScreen = ({ route, navigation }) => {
    const { origin, destination, currentRoute } = route.params;
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);

    // Debounced search handler to avoid excessive API requests
    const debouncedHandleSearch = useCallback(
        debounce(async (query) => {
            try {
                const response = await axios.get(
                    `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json`,
                    {
                        params: {
                            access_token: MAPBOX_API_TOKEN,
                            autocomplete: true,
                            country: 'PH',
                        },
                    }
                );
                setSearchResults(response.data.features);
            } catch (error) {
                console.error('Error fetching search results:', error);
            }
        }, 300), // 300ms debounce
        []
    );

    const handleSearch = (query) => {
        setSearchQuery(query);
        if (query.length > 2) {
            debouncedHandleSearch(query); // Only search if query length is greater than 2
        } else {
            setSearchResults([]); // Clear results if query is too short
        }
    };

    const handleSelectStop = (item) => {
        if (item.geometry && item.geometry.coordinates) {
            const [longitude, latitude] = item.geometry.coordinates;
            console.log('Selected Stop:', { longitude, latitude });  // Log stop before navigating
            navigation.navigate('NavigationScreen', {
                origin,
                destination,
                stop: { longitude, latitude }, // Ensure stop is passed correctly
            });
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={24} color="gray" />
                <TextInput
                    value={searchQuery}
                    onChangeText={handleSearch}
                    placeholder="Search for a stop"
                    style={styles.input}
                    placeholderTextColor="gray"
                />
            </View>

            <FlatList
                data={searchResults}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <TouchableOpacity style={styles.resultItem} onPress={() => handleSelectStop(item)}>
                        <Ionicons name="location-outline" size={24} color="#007AFF" />
                        <View style={styles.resultTextContainer}>
                            <Text style={styles.resultTitle}>{item.text}</Text>
                            <Text style={styles.resultSubtitle}>{item.place_name}</Text>
                        </View>
                    </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListEmptyComponent={<Text style={styles.emptyText}>No results found</Text>}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9f9f9',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        margin: 10,
        backgroundColor: '#fff',
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.5,
        elevation: 3,
    },
    input: {
        flex: 1,
        paddingLeft: 10,
        fontSize: 16,
        color: 'black',
    },
    resultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        backgroundColor: '#fff',
        marginHorizontal: 10,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.5,
        elevation: 3,
    },
    resultTextContainer: {
        marginLeft: 10,
        flex: 1,
    },
    resultTitle: {
        fontSize: 16,
        color: 'black',
        fontWeight: 'bold',
    },
    resultSubtitle: {
        fontSize: 14,
        color: 'gray',
    },
    separator: {
        height: 1,
        backgroundColor: '#E0E0E0',
        marginVertical: 5,
        marginHorizontal: 20,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 20,
        fontSize: 16,
        color: 'gray',
    },
});

export default StopSearchScreen;
