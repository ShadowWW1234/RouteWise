import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const GasConsumptionContext = createContext();

export const GasConsumptionProvider = ({ children }) => {
  const [gasConsumption, setGasConsumption] = useState(null);

  // Load gasConsumption from AsyncStorage when the app starts
  useEffect(() => {
    const loadGasConsumption = async () => {
      try {
        const savedGasConsumption = await AsyncStorage.getItem('gasConsumption');
        if (savedGasConsumption !== null) {
          setGasConsumption(parseFloat(savedGasConsumption));
        }
      } catch (error) {
        console.error('Failed to load gas consumption:', error);
      }
    };

    loadGasConsumption();
  }, []);

  // Function to update gasConsumption and save it to AsyncStorage
  const updateGasConsumption = async (consumption) => {
    try {
      await AsyncStorage.setItem('gasConsumption', consumption.toString());
      setGasConsumption(parseFloat(consumption));
    } catch (error) {
      console.error('Error saving gas consumption:', error);
    }
  };

  return (
    <GasConsumptionContext.Provider value={{ gasConsumption, setGasConsumption, updateGasConsumption }}>
      {children}
    </GasConsumptionContext.Provider>
  );
};
