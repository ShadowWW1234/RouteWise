import React, { useState, useContext, useEffect } from "react";
import {
  View,
  Text,
  Switch,
  TouchableOpacity, 
  ScrollView,
  Animated,
  Image,
  StyleSheet,
} from "react-native";
import tw from "tailwind-react-native-classnames"; 
import Ionicons from 'react-native-vector-icons/Ionicons';
import AntDesign from 'react-native-vector-icons/AntDesign';
import { MapStyleContext } from "./context/MapStyleContext"; 

const SideBar = ({ onProfileChange,onToggleAlternative,onToggleTrafficJam   }) => { // Add callback prop for profile changes
  // Toggle switches sidebar set to true by default
  const [isAlternativeEnabled, setAlternativeEnabled] = useState(true);
  const [isTrafficJamEnabled, setTrafficJamEnabled] = useState(true);
  const [isInaccessibleEnabled, setInaccessibleEnabled] = useState(true);
  const [isMotorcycleEnabled, setMotorcycleEnabled] = useState(false);
  const [isTricycleEnabled, setTricycleEnabled] = useState(false);
  const [isCarsEnabled, setCarsEnabled] = useState(true); // Cars enabled by default

  // Track the current profile for route calculation
  const [currentProfile, setCurrentProfile] = useState('driving'); // Default profile

  // Animated value for sliding effect
  const sidebarAnim = useState(new Animated.Value(-250))[0]; // Sidebar starts off-screen
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const { mapStyle, setMapStyle } = useContext(MapStyleContext); // Access map style and setter

  // Toggle function for switching between street-map and satellite
  const toggleMapStyle = () => {
    setMapStyle(prevStyle =>
      prevStyle === 'mapbox://styles/mapbox/streets-v11'
        ? 'mapbox://styles/mapbox/satellite-streets-v12'
        : 'mapbox://styles/mapbox/streets-v11'
    );
  };

  // Function to toggle sidebar visibility
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
    // Animate sidebar slide in or out
    Animated.timing(sidebarAnim, {
      toValue: isSidebarOpen ? -250 : 0, // Slide in if closed, slide out if open
      duration: 300,
      useNativeDriver: false, // Ensure native driver is false for layout changes
    }).start();
  };

  // Function to update the route profile based on the active toggle
  const updateProfile = (newProfile) => {
    setCurrentProfile(newProfile); // Update the profile state
    if (onProfileChange) {
      onProfileChange(newProfile); // Call the callback to pass the profile to the parent component
    }
  };

  const handleAlternativeToggle = (newValue) => {
    setAlternativeEnabled(newValue); // Update the state in SideBar
    onToggleAlternative(newValue); // Pass the toggle state to DestinationScreen
  };

 
  // Handle toggles and profile updates based on vehicle type
  useEffect(() => {
    if (isMotorcycleEnabled) {
      updateProfile('driving'); // Set profile for motorcycle
    } else if (isTricycleEnabled) {
      updateProfile('cycling');  // Set profile for tricycle
    } else if (isCarsEnabled) {
      updateProfile('driving-traffic');  // Set profile for cars
    }
  }, [isMotorcycleEnabled, isTricycleEnabled, isCarsEnabled]);

  return (
    <>
      <TouchableOpacity
        style={tw`absolute top-8 left-4 z-20`} // Keep existing positioning
        onPress={toggleSidebar}
      >
        <View style={styles.burgerIconContainer}>
          <Ionicons name="menu" size={32} color="black" />
        </View>
      </TouchableOpacity>

      <Animated.View style={[tw`absolute bg-white shadow-lg p-4 z-40`, { width: 250, left: sidebarAnim, height: '100%' }]}>
        {/* Close Button */}
        <TouchableOpacity
          style={[tw`absolute top-4 right-4`, { marginTop: 30 }]} // Adjust positioning as needed
          onPress={toggleSidebar}
        >
          <AntDesign name="leftcircleo" size={24} color="red" />
        </TouchableOpacity>

        {/* Logo and Title */}
        <View style={[tw`flex-row items-center mb-6`, { marginTop: 20, marginLeft: 10 }]}>
          <Image source={require('./rwlogo.png')} style={tw`w-14 h-12`} />
          <Text style={tw`text-xl font-bold ml-2 text-red-600`}>Route</Text>
          <Text style={tw`text-xl font-bold ml-2 text-black`}>Wise</Text>
        </View>
        {/* Divider */}
        <View style={[tw`border-t border-gray-300 my-4`, { marginTop: -10 }]} />

        {/* Toggle Options */}
        <ScrollView>
        <View style={tw`mb-4`}>
  <View style={tw`flex-row items-center justify-between`}>
    <Image 
      source={require('../assets/alterroute.png')} 
      style={[tw`w-12 h-12`, { marginLeft: -8, marginRight: 8, marginTop: -5 }]} 
    />
    <Text style={tw`text-lg font-semibold flex-1 text-black`}>Alternative</Text>
    <Switch 
      value={isAlternativeEnabled}  // This should be the boolean state, not the function
      trackColor={{ false: '#34c759', true: '#34c759' }}
      thumbColor={isAlternativeEnabled ? '#28a745' : '#f4f3f4'}
      onValueChange={handleAlternativeToggle} // The function that handles state change
    />
  </View>
</View>

 <View style={tw`mb-4`}>
      <View style={tw`flex-row items-center justify-between`}>
        <Image source={require('../assets/traffic.png')} style={[tw`w-12 h-12`, { marginLeft: -8, marginRight: 8, marginTop: -5 }]} />
        <Text style={tw`text-lg font-semibold flex-1 text-black`}>Traffic Jam</Text>
        <Switch 
          value={isTrafficJamEnabled}  // Ensure this state is controlling the visual toggle
          trackColor={{ false: '#F44336', true: '#F44336' }}
          thumbColor={isTrafficJamEnabled ? '#D32F2F' : '#f4f3f4'}
          onValueChange={(value) => {
            setTrafficJamEnabled(value); // Update the local state for visual feedback
            onToggleTrafficJam(value);   // Call the parent handler to execute the logic
          }}
        />
      </View>
    </View>


          <View style={tw`mb-4`}>
            <View style={tw`flex-row items-center justify-between`}>
              <Image source={require('../assets/roadclose.png')} style={[tw`w-12 h-12`, { marginLeft: -8, marginRight: 8, marginTop: -5 }]} />
              <Text style={tw`text-lg font-semibold flex-1 text-black`}>Inaccessible</Text>
              <Switch value={isInaccessibleEnabled}
                trackColor={{ false: '#FFC107', true: '#FFC107' }}
                thumbColor={isInaccessibleEnabled ? '#FFC107' : '#f4f3f4'}
                onValueChange={setInaccessibleEnabled}
              />
            </View>
          </View>

          {/* Divider */}
          <View style={[tw`border-t border-gray-300 my-4`, { marginTop: -10 }]} />

          {/* Vehicle Routing */}
          <Text style={[tw`font-bold mb-4`, { fontSize: 20 }]}>Vehicle Routing</Text>

          <View style={tw`mb-4`}>
            <View style={tw`flex-row items-center justify-between`}>
              <Image source={require('../assets/motor.png')} style={[tw`w-12 h-12`, { marginLeft: -5, marginRight: 8, marginTop: -5 }]} />
              <Text style={tw`text-lg font-semibold flex-1 text-black`}>Motorcycles</Text>
              <Switch value={isMotorcycleEnabled}
                trackColor={{ false: '#2196F3', true: '#2196F3' }}
                thumbColor={isMotorcycleEnabled ? '#1976D2' : '#f4f3f4'}
                onValueChange={() => {
                  setMotorcycleEnabled(true);
                  setTricycleEnabled(false);
                  setCarsEnabled(false);
                }}
              />
            </View>
          </View>

          <View style={tw`mb-4`}>
            <View style={tw`flex-row items-center justify-between`}>
              <Image source={require('../assets/tri.png')} style={[tw`w-12 h-12`, { marginLeft: -5, marginRight: 8, marginTop: -5 }]} />
              <Text style={tw`text-lg font-semibold flex-1 text-black`}>Tricycles</Text>
              <Switch value={isTricycleEnabled}
                trackColor={{ false: '#e87407', true: '#e87407' }}
                thumbColor={isTricycleEnabled ? '#e87407' : '#f4f3f4'}
                onValueChange={() => {
                  setMotorcycleEnabled(false);
                  setTricycleEnabled(true);
                  setCarsEnabled(false);
                }}
              />
            </View>
          </View>

          <View style={tw`mb-4`}>
            <View style={tw`flex-row items-center justify-between`}>
              <Image source={require('../assets/car.png')} style={[tw`w-12 h-12`, { marginLeft: -5, marginRight: 8, marginTop: -5 }]} />
              <Text style={tw`text-lg font-semibold flex-1 text-black`}>Cars</Text>
              <Switch value={isCarsEnabled}
                trackColor={{ false: '#4169E1', true: '#4169E1' }}
                thumbColor={isCarsEnabled ? '#3654A2' : '#f4f3f4'}
                onValueChange={() => {
                  setMotorcycleEnabled(false);
                  setTricycleEnabled(false);
                  setCarsEnabled(true);
                }}
              />
            </View>
          </View>

          {/* Divider */}
          <View style={tw`border-t border-gray-300 my-4`} />

          <View style={tw`mb-4`}>
            <View style={tw`flex-row items-center justify-between`}>
              {/* Map Icon */}
              <Ionicons name="map" size={24} color="blue" />

              {/* Title */}
              <Text style={tw`text-lg font-semibold flex-1 text-black`}>Satellite View</Text>

              {/* Switch */}
              <Switch
                value={mapStyle === 'mapbox://styles/mapbox/satellite-streets-v12'}
                onValueChange={toggleMapStyle}
                trackColor={{ false: '#4169E1', true: '#4169E1' }}
                thumbColor={mapStyle === 'mapbox://styles/mapbox/satellite-streets-v12' ? '#3654A2' : '#f4f3f4'}
              />
            </View>
          </View>

          {/* Divider */}
          <View style={tw`border-t border-gray-300 my-4`} />

          {/* Help and Settings */}
          <TouchableOpacity style={tw`mb-4`}>
            <View style={tw`flex-row items-center justify-between`}>
              <AntDesign name="infocirlceo" size={24} color="black" />
              <Text style={[tw`text-lg flex-1 text-black`, { marginLeft: 10, marginTop: -4 }]}>Help Center</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity>
            <View style={tw`flex-row items-center justify-between`}>
              <AntDesign
                name="setting"
                size={28}
                color="black"
                style={[tw`ml-1`, { marginLeft: -1 }]}
              />
              <Text style={[tw`text-lg flex-1 text-black`, { marginLeft: 10, marginTop: -4 }]}>Settings</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </>
  );
};

export default SideBar;

const styles = StyleSheet.create({
  burgerIconContainer: {
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 50,
    elevation: 2, // Adds shadow for better visibility
  },
});
