import { Text, View, SafeAreaView, Image, TouchableOpacity } from "react-native";
import React from "react";
import tw from "tailwind-react-native-classnames";
import rwlogo from '../assets/rwlogo.png';
import { useNavigation } from "@react-navigation/native";

const HomeScreen = () => {
  const navigation = useNavigation();

  const handlePress = () => {
    navigation.navigate("SearchScreen"); // Navigate to MapScreen
  };

  return (
    <SafeAreaView style={tw`bg-white h-full`}>
      <View style={tw`flex-1 justify-center items-center`}>
        <Text style={[tw`font-bold mb-4`, { fontSize: 60, marginTop: -40 }]}>
          Welcome to
        </Text>
        <Text style={[tw`font-bold text-red-500`, { fontSize: 50 }]}>
          Route Wise
        </Text>

        <Image
          source={rwlogo}
          style={[tw`w-3/4 h-3/4`, { marginTop: -140 }]}
          resizeMode="contain"
        />

        <Text style={[tw`font-bold text-gray-600`, { fontSize: 30, marginTop: -120, textAlign: "center" }]}>
          Detour to smoothest commute
        </Text>

        <TouchableOpacity
          style={[tw`bg-red-500 p-4 w-3/4 rounded-full mt-4`, { marginTop: 30 }]}
          onPress={handlePress} // Call handlePress on press
        >
          <Text style={[tw`text-white text-lg font-bold`, { textAlign: "center" }]}>
            Explore Routes
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default HomeScreen;
