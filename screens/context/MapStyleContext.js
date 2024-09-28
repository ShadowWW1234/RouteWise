// MapStyleContext.js
import React, { createContext, useState } from 'react';

// Create the context
export const MapStyleContext = createContext();

// Context provider component
export const MapStyleProvider = ({ children }) => {
  // Default to street-map
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/streets-v11');

  return (
    <MapStyleContext.Provider value={{ mapStyle, setMapStyle }}>
      {children}
    </MapStyleContext.Provider>
  );
};
