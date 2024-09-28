import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, TextInput, Modal } from 'react-native';
import React, { useState,useContext } from 'react';
import tw from "tailwind-react-native-classnames";  
import Ionicons from 'react-native-vector-icons/Ionicons';
import VehicleTypeSelection from './modals/VehicleTypeSelection';
import SearchBar from '../screens/modals/SearchBar';
import MapScreen from '../screens/MapScreen';
import SideBar from '../screens/SideBar';
import DestinationModal from '../screens/modals/DestinationModal';

const SearchScreen = () => {
    const [modalVisible, setModalVisible] = useState(false);
    const [isSearchModalVisible, setSearchModalVisible] = useState(false);
    const [isDestinationModalVisible, setDestinationModalVisible] = useState(false);
    const [selectedDestination, setSelectedDestination] = useState(null);
    const [selectedOrigin, setSelectingOrigin] = useState(null); // Track whether searching for origin or destination
 

    const toggleDestinationModal = () => setDestinationModalVisible(!isDestinationModalVisible);
     
    const handlePlaceSelect = (origin,destination) => {
        setSelectingOrigin(origin);
        setSelectedDestination(destination);
        
        setSearchModalVisible(false);
        setDestinationModalVisible(true);
        console.log(destination);
    };

    

    const toggleSearchModal = () => {
        setSearchModalVisible(!isSearchModalVisible);
    };

    const toggleModal = () => {
        setModalVisible(!modalVisible);
    };
 

    return (
        <SafeAreaView style={tw`flex-1 bg-white`}>
            <View style={tw`flex-row flex-1`}>
                <SideBar/>
                <MapScreen destination={selectedDestination}/>
            </View>
    
            <View style={styles.overlayContainer}>
                <TouchableOpacity style={styles.button} onPress={toggleModal}>
                    <View style={styles.buttonContent}>
                        <Text style={styles.buttonText}>Vehicle Type</Text>
                        <Ionicons name="chevron-forward-outline" size={10} color="black" />
                    </View>
                </TouchableOpacity>
                <VehicleTypeSelection modalVisible={modalVisible} toggleModal={toggleModal} />
            </View>

            <SearchBar 
                modalVisible={isSearchModalVisible} 
                toggleModal={toggleSearchModal}  
                onPlaceSelect={handlePlaceSelect} 
            />
   
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

            <DestinationModal
                visible={isDestinationModalVisible}
                toggleModal={toggleDestinationModal}
                destination={selectedDestination}
                origin={selectedOrigin}
                toggleSearchModal={toggleSearchModal} 
              
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
        bottom: 55,
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
