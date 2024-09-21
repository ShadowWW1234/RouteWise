import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  origin: {
    location: null,
    description: '',
  },
  destination: {
    location: null,
    description: '',
  },
  travelTimeInformation: null,  // Store travel time information, if needed
};

export const navSlice = createSlice({
  name: "nav",
  initialState,
  reducers: {
    setOrigin: (state, action) => {
      // Ensure both `location` and `description` are updated properly
      state.origin = {
        location: action.payload.location, 
        description: action.payload.description
      };
    },
    setDestination: (state, action) => {
      // Similar structure for destination
      state.destination = {
        location: action.payload.location, 
        description: action.payload.description
      };
    },
    setTravelTimeInformation: (state, action) => {
      // Update travel time information if available
      state.travelTimeInformation = action.payload;
    },
    clearOrigin: (state) => {
      // Optional: Clear origin data
      state.origin = { location: null, description: '' };
    },
    clearDestination: (state) => {
      // Optional: Clear destination data
      state.destination = { location: null, description: '' };
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

// Selectors to retrieve origin, destination, and travel time info
export const selectOrigin = (state) => state.nav.origin;
export const selectDestination = (state) => state.nav.destination;
export const selectTravelTimeInformation = (state) =>
  state.nav.travelTimeInformation;

export default navSlice.reducer;
