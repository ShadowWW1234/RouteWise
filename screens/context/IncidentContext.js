import React, { createContext, useState, useEffect } from 'react';
import firestore from '@react-native-firebase/firestore';

export const IncidentContext = createContext();

export const IncidentProvider = ({ children }) => {
  const [incidents, setIncidents] = useState([]);

  useEffect(() => {
    const unsubscribe = firestore()
      .collection('incidents')
      .onSnapshot(
        querySnapshot => {
          if (querySnapshot) {
            const incidentsData = querySnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
            }));
            setIncidents(incidentsData);
          } else {
            console.warn('QuerySnapshot is null');
          }
        },
        error => {
          console.error('Error fetching incidents: ', error);
        }
      );

    return () => unsubscribe();
  }, []);

  const addIncident = async incident => {
    try {
      await firestore().collection('incidents').add(incident);
    } catch (error) {
      console.error('Error adding incident: ', error);
    }
  };

  return (
    <IncidentContext.Provider value={{ incidents, addIncident }}>
      {children}
    </IncidentContext.Provider>
  );
};
