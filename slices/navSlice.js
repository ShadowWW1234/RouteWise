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
  travelTimeInformation: null,
};

export const navSlice = createSlice({
  name: "nav",
  initialState,
  reducers: {
    setOrigin: (state, action) => {
      state.origin = action.payload; // Matches the structure: { location: ..., description: ... }
    },
    setDestination: (state, action) => {
      state.destination = action.payload; // Matches the structure
    },
    setTravelTimeInformation: (state, action) => {
      state.travelTimeInformation = action.payload;
    },
  },
});

export const { setOrigin, setDestination, setTravelTimeInformation } =
  navSlice.actions;

// Selectors
export const selectOrigin = (state) => state.nav.origin;
export const selectDestination = (state) => state.nav.destination;
export const selectTravelTimeInformation = (state) =>
  state.nav.travelTimeInformation;

export default navSlice.reducer;
