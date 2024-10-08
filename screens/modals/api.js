import {  MAPBOX_API_TOKEN } from '@env';

 
export const fetchLocationName = async (coordinates) => {
  const [longitude, latitude] = coordinates;
  const url = `https://api.mapbox.com/search/geocode/v6/reverse?longitude=${longitude}&latitude=${latitude}&access_token=${MAPBOX_API_TOKEN}`;

  try {
    const response = await fetch(url); // Use the built-in fetch
    const data = await response.json();

    // Extract the first result's place name
    return data.features[0] ? data.features[0].place_name : 'Unknown location';
  } catch (error) {
    console.error('Error fetching location name:', error);
    return 'Error fetching location';
  }
};
