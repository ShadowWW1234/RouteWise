import React, { createContext, useState, useContext } from 'react';

// Create the Stops Context
const StopsContext = createContext();

// Provider to wrap your app and provide the stops context
export const StopsProvider = ({ children }) => {
    const [stops, setStops] = useState([]);

    // Function to add a stop
    const addStop = (newStop) => {
        setStops((prevStops) => [...prevStops, newStop]);
    };

    return (
        <StopsContext.Provider value={{ stops, addStop }}>
            {children}
        </StopsContext.Provider>
    );
};

// Custom hook to use the Stops context
export const useStops = () => useContext(StopsContext);
