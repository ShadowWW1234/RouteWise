import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, TextInput, Modal } from 'react-native';
import React, { useState, useEffect,useContext } from 'react';
import tw from "tailwind-react-native-classnames";  
import Ionicons from 'react-native-vector-icons/Ionicons';
import VehicleTypeSelection from './modals/VehicleTypeSelection';
import SearchBar from '../screens/modals/SearchBar';
import MapScreen from '../screens/MapScreen';
import SideBar from '../screens/SideBar';
import DestinationModal from '../screens/modals/DestinationModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { GasConsumptionContext } from '../screens/context/GasConsumptionProvider';


const SearchScreen = () => {
 
    const [isSearchModalVisible, setSearchModalVisible] = useState(false);
    const [isDestinationModalVisible, setDestinationModalVisible] = useState(false);
    const [selectedDestination, setSelectedDestination] = useState(null);
    const [selectedOrigin, setSelectingOrigin] = useState(null);
  
    const { gasConsumption ,setGasConsumption } = useContext(GasConsumptionContext);
    const [modalVisible, setModalVisible] = useState(!gasConsumption); // Show modal if gasConsumption is not set
  
    
    // Function to toggle the DestinationModal
    const toggleDestinationModal = () => setDestinationModalVisible(!isDestinationModalVisible);
    
     // Define resetSearch function
     const resetSearch = () => {
        setSearchModalVisible(false); // Close the search modal
        console.log("resetSearch function is called"); // Debugging log
    };
    
    useEffect(() => {
        const loadGasConsumption = async () => {
          try {
            const savedGasConsumption = await AsyncStorage.getItem('gasConsumption');
            if (savedGasConsumption) {
              const parsedGasConsumption = parseFloat(savedGasConsumption);
              if (!isNaN(parsedGasConsumption)) {
                setGasConsumption(parsedGasConsumption);
                console.log('ParentScreen - gasConsumption loaded:', parsedGasConsumption);
              }
            }
          } catch (error) {
            console.error('Failed to load gas consumption:', error);
          }
        };
    
        loadGasConsumption();
      }, []);
    // Save the modal state when it's updated
    useEffect(() => {
        const saveModalState = async () => {
            try {
                await AsyncStorage.setItem('MODAL_STATE', JSON.stringify(isDestinationModalVisible));
            } catch (e) {
                console.error('Failed to save modal state.', e);
            }
        };
        saveModalState();
    }, [isDestinationModalVisible]);

    // Load the modal state when the component mounts
    useEffect(() => {
        const loadModalState = async () => {
            try {
                const savedState = await AsyncStorage.getItem('MODAL_STATE');
                if (savedState !== null) {
                    setDestinationModalVisible(JSON.parse(savedState));
                }
            } catch (e) {
                console.error('Failed to load modal state.', e);
            }
        };
        loadModalState();
    }, []);
    useEffect(() => {
        console.log('ParentScreen - gasConsumption:', gasConsumption);
      }, [gasConsumption]);
      
      // Add a useEffect to log when selectedDestination changes
      useEffect(() => {
        console.log('ParentScreen - selectedDestination:', selectedDestination);
        console.log('ParentScreen - gasConsumption after selecting destination:', gasConsumption);
      }, [selectedDestination]);
      
    // Handle place selection from the SearchBar
    const handlePlaceSelect = (origin, destination) => {
        setSelectingOrigin(origin);
        setSelectedDestination(destination);
        setSearchModalVisible(false);
        setDestinationModalVisible(true);
        console.log(destination);
    };

    // Function to toggle the search modal
    const toggleSearchModal = () => {
        setSearchModalVisible(!isSearchModalVisible);
    };

    // Function to toggle the vehicle selection modal
    const toggleModal = () => {
        setModalVisible(!modalVisible);
    };

    return (
        <SafeAreaView style={tw`flex-1 bg-white`}>
            <View style={tw`flex-row flex-1`}>
                <SideBar />
                <MapScreen destination={selectedDestination} />
            </View>

            {/* Vehicle Type Selection Button */}
            <View style={styles.overlayContainer}>
                <TouchableOpacity style={styles.button} onPress={toggleModal}>
                    <View style={styles.buttonContent}>
                        <Text style={styles.buttonText}>Vehicle Type</Text>
                        <Ionicons name="chevron-forward-outline" size={10} color="black" />
                    </View>
                </TouchableOpacity>
                <GestureHandlerRootView style={{ flex: 1 }}>
                <VehicleTypeSelection modalVisible={modalVisible} toggleModal={toggleModal} onSaveGasConsumption={setGasConsumption}/>
                </GestureHandlerRootView>

            </View>

            {/* SearchBar Modal */}
            <SearchBar 
                modalVisible={isSearchModalVisible} 
                toggleModal={toggleSearchModal}  
                onPlaceSelect={handlePlaceSelect} 
                gasConsumption={gasConsumption}
            />

            {/* Search Bar Input */}
            <View style={styles.searchBarContainer}>
                <Ionicons name="search" size={24} color="black" style={styles.searchIcon} />
                <TouchableOpacity onPress={toggleSearchModal} style={{ flex: 1 }}>
                    <TextInput
                        style={[styles.searchBarInput]}
                        placeholder="Where to go?"
                        editable={false}
                        placeholderTextColor="gray"
                    />
                </TouchableOpacity>
                <TouchableOpacity>
                    <Ionicons name="mic" size={24} color="white" style={styles.micIcon} />
                </TouchableOpacity>
            </View>

            {/* DestinationModal */}
            <DestinationModal 
                visible={isDestinationModalVisible}
                toggleModal={toggleDestinationModal}
                destination={selectedDestination}
                origin={selectedOrigin}
                resetSearch={resetSearch}  // Pass resetSearch
                gasConsumption={gasConsumption}
            />
        </SafeAreaView>
    );
};

export default SearchScreen;

const styles = StyleSheet.create({
    searchBarContainer: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        backgroundColor: '#fff',
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 30,
        paddingVertical: 10,
        paddingHorizontal: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    searchBarInput: {
        flex: 1,
        backgroundColor: '#f9f9f9',
        borderRadius: 30,
        paddingHorizontal: 10,
        fontSize: 16,
        height: 45,
    },
    searchIcon: {
        marginRight: 10,
    },
    micIcon: {
        backgroundColor: 'red',
        padding: 10,
        borderRadius: 50,
    },
    overlayContainer: {
        position: 'absolute',
        bottom: 15,
        left: '50%',
        transform: [{ translateX: -90 }],
        width: 180,
        height: 110,
        borderRadius: 55,
        justifyContent: 'center',
        alignItems: 'center',
    },
    button: {
        backgroundColor: 'white',
        borderRadius: 55,
        paddingVertical: 5,
        paddingHorizontal: 12,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        elevation: 3,
    },
    buttonContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
    },
    buttonText: {
        color: 'black',
        fontSize: 16,
        flex: 1,
    },
});
