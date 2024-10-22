import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  origin: {
    location: null,  // To store coordinates { lat, lng }
    description: '',  // To store the name of the location
  },
  destination: {
    location: null,  // To store coordinates { lat, lng }
    description: '',  // To store the name of the location
  },
  travelTimeInformation: null,  // Store travel time information
};

export const navSlice = createSlice({
  name: "nav",
  initialState,
  reducers: {
    // Updates the origin with both location and description
    setOrigin: (state, action) => {
      state.origin = {
        location: action.payload.location || state.origin.location,  // Retain existing location if not provided
        description: action.payload.description || state.origin.description,  // Retain existing description if not provided
      };
    },
    // Updates the destination with both location and description
    setDestination: (state, action) => {
      state.destination = {
        location: action.payload.location || state.destination.location,  // Retain existing location if not provided
        description: action.payload.description || state.destination.description,  // Retain existing description if not provided
      };
    },
    // Clears the origin data
    clearOrigin: (state) => {
      state.origin = { location: null, description: '' };  // Reset origin data
    },
    // Clears the destination data
    clearDestination: (state) => {
      state.destination = { location: null, description: '' };  // Reset destination data
    },
    // Sets travel time information
    setTravelTimeInformation: (state, action) => {
      state.travelTimeInformation = action.payload;
    },
  },
});

export const {
  setOrigin,
  setDestination,
  setTravelTimeInformation,
  clearOrigin,
  clearDestination,
} = navSlice.actions;

// Selectors
export const selectOrigin = (state) => state.nav.origin;
export const selectDestination = (state) => state.nav.destination;
export const selectTravelTimeInformation = (state) => state.nav.travelTimeInformation;

export default navSlice.reducer;
