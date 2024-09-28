import React, {  useState,useContext } from "react";
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
import Ionicons from 'react-native-vector-icons/Ionicons'
import AntDesign from 'react-native-vector-icons/AntDesign'
import { MapStyleContext } from "./context/MapStyleContext"; 

const SideBar = () => {
    //toggle switches sidebar set to true all
  const [isAlternativeEnabled, setAlternativeEnabled] = useState(true);
  const [isTrafficJamEnabled, setTrafficJamEnabled] = useState(true);
  const [isInaccessibleEnabled, setInaccessibleEnabled] = useState(true);
  const [isMotorcycleEnabled, setMotorcycleEnabled] = useState(true);
  const [isTricycleEnabled, setTricycleEnabled] = useState(true);
  const [isCarsEnabled, setCarsEnabled] = useState(true);

  
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
            <Text style={tw`text-xl font-bold ml-2   text-black`}>Wise</Text>
          </View>
          {/* Divider */}
          <View style={[tw`border-t border-gray-300 my-4`, { marginTop: -10 }]} />

          {/* Toggle Options */}
          <ScrollView>
            <View style={tw`mb-4`}>
              <View style={tw`flex-row items-center justify-between`}>
              <Image source={require('../assets/alterroute.png')} style={[tw`w-12 h-12`, { marginLeft: -8, marginRight: 8, marginTop: -5 }]} />
              
                <Text style={tw`text-lg font-semibold flex-1  text-black`}>Alternative</Text>
                <Switch value={isAlternativeEnabled}
                  trackColor={{ false: '#34c759', true: '#34c759' }} // Green for on state
                  thumbColor={isAlternativeEnabled ? '#28a745' : '#f4f3f4'} // Dark green for on, light gray for off
                  onValueChange={setAlternativeEnabled} />
              </View>
            </View>

            <View style={tw`mb-4`}>
              <View style={tw`flex-row items-center justify-between`}>
              <Image source={require('../assets/traffic.png')} style={[tw`w-12 h-12`, { marginLeft: -8, marginRight: 8, marginTop: -5 }]} />
              
                <Text style={tw`text-lg font-semibold flex-1  text-black`}>Traffic Jam</Text>
                <Switch value={isTrafficJamEnabled}
                  trackColor={{ false: '#F44336', true: '#F44336' }} // Red for on state
                  thumbColor={isTrafficJamEnabled ? '#D32F2F' : '#f4f3f4'} // Dark red for on, light gray for off
                  onValueChange={setTrafficJamEnabled} />
              </View>
            </View>

            <View style={tw`mb-4`}>
              <View style={tw`flex-row items-center justify-between`}>
              <Image source={require('../assets/roadclose.png')} style={[tw`w-12 h-12`, { marginLeft: -8, marginRight: 8, marginTop: -5 }]} />
              
                <Text style={tw`text-lg font-semibold flex-1  text-black`}>Inaccessible</Text>
                <Switch value={isInaccessibleEnabled}
                  trackColor={{ false: '#FFC107', true: '#FFC107' }} // Yellow for on state
                  thumbColor={isInaccessibleEnabled ? '#FFC107' : '#f4f3f4'} // Dark yellow for on, light gray for off
                  onValueChange={setInaccessibleEnabled} />
              </View>
            </View>
            {/* Divider */}
            <View style={[tw`border-t border-gray-300 my-4`, { marginTop: -10 }]} />

            {/* Vehicle Routing */}
            <Text style={[tw`font-bold mb-4`, { fontSize: 20 }]}>Vehicle Routing</Text>

            <View style={tw`mb-4`}>
              <View style={tw`flex-row items-center justify-between`}>
                <Image source={require('../assets/motor.png')} style={[tw`w-12 h-12`, { marginLeft: -5, marginRight: 8, marginTop: -5 }]} />
                <Text style={tw`text-lg font-semibold flex-1  text-black`}>Motorcycles</Text>
                <Switch value={isMotorcycleEnabled}
                  trackColor={{ false: '#2196F3', true: '#2196F3' }} // Blue for on state
                  thumbColor={isMotorcycleEnabled ? '#1976D2' : '#f4f3f4'} // Dark blue for on, light gray for off
                  onValueChange={setMotorcycleEnabled} />
              </View>
            </View>

            <View style={tw`mb-4`}>
              <View style={tw`flex-row items-center justify-between`}>
                <Image source={require('../assets/tri.png')} style={[tw`w-12 h-12`, { marginLeft: -5, marginRight: 8, marginTop: -5 }]} />
                <Text style={tw`text-lg font-semibold flex-1  text-black`}>Tricycles</Text>
                <Switch value={isTricycleEnabled}
                  trackColor={{ false: '#e87407', true: '#e87407' }} // Orange for on state
                  thumbColor={isTricycleEnabled ? '#e87407' : '#f4f3f4'} // Dark orange for on, light gray for off
                  onValueChange={setTricycleEnabled} />
              </View>
            </View>

            <View style={tw`mb-4`}>
              <View style={tw`flex-row items-center justify-between`}>
                <Image source={require('../assets/car.png')} style={[tw`w-12 h-12`, { marginLeft: -5, marginRight: 8, marginTop: -5 }]} />
                <Text style={tw`text-lg font-semibold flex-1  text-black`}>Cars</Text>
                <Switch value={isCarsEnabled} onValueChange={setCarsEnabled}
                  trackColor={{ false: '#4169E1', true: '#4169E1' }} // Royal Blue for on state
                  thumbColor={isCarsEnabled ? '#3654A2' : '#f4f3f4'} // Dark royal blue for on, light gray for off
                />
              </View>
            </View>

            {/* Divider */}
            <View style={tw`border-t border-gray-300 my-4`} />


            <View style={tw`mb-4`}>
      <View style={tw`flex-row items-center justify-between`}>
        {/* Map Icon */}
         <Ionicons name="map" size={24} color="blue"/>

        {/* Title */}
        <Text style={tw`text-lg font-semibold flex-1 text-black`}>Satellite View</Text>

        {/* Switch */}
        <Switch
          value={mapStyle === 'mapbox://styles/mapbox/satellite-streets-v12'}
          onValueChange={toggleMapStyle}
          trackColor={{ false: '#4169E1', true: '#4169E1' }} // Royal Blue for on state
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
                <Text style={[tw`text-lg flex-1  text-black`, { marginLeft: 10, marginTop: -4 }]}>Help Center</Text>
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
                <Text style={[tw`text-lg flex-1  text-black`, { marginLeft: 10, marginTop: -4 }]}>Settings</Text>
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
