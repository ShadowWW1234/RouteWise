import React, { createContext, useState, useEffect } from 'react';
import SQLite from 'react-native-sqlite-storage';

// Create context
export const GasConsumptionContext = createContext();

// Create provider
export const GasConsumptionProvider = ({ children }) => {
  const [gasConsumption, setGasConsumption] = useState(0);
  const [db, setDb] = useState(null);

  // Initialize the SQLite database when the component mounts
  useEffect(() => {
    const initDb = () => {
      const database = SQLite.openDatabase(
        { name: 'gasConsumption.db', location: 'default' },
        () => { console.log('Database opened'); },
        (error) => { console.log('Error opening database:', error); }
      );
      setDb(database);

      // Create the table if it doesn't exist
      database.transaction((txn) => {
        txn.executeSql(
          `CREATE TABLE IF NOT EXISTS gas_data (
            id INTEGER PRIMARY KEY NOT NULL,
            consumption REAL
          );`,
          [],
          () => { console.log('Table created successfully'); },
          (error) => { console.error('Error creating table:', error); }
        );
      });
    };

    initDb();
  }, []);

  // Load gas consumption from SQLite when the component mounts
  useEffect(() => {
    if (db) {
      const loadGasConsumption = () => {
        db.transaction((txn) => {
          txn.executeSql(
            'SELECT consumption FROM gas_data WHERE id = 1',
            [],
            (tx, results) => {
              if (results.rows.length > 0) {
                const consumptionValue = results.rows.item(0).consumption;
                if (consumptionValue !== null && consumptionValue !== undefined) {
                  setGasConsumption(consumptionValue);
                } else {
                  setGasConsumption(0);  // Default value if null or undefined
                }
              } else {
                console.log('No gas consumption found, setting default value.');
                setGasConsumption(0);  // Default if no data found
              }
            },
            (error) => { console.error('Failed to load gas consumption:', error); }
          );
        });
      };

      loadGasConsumption();
    }
  }, [db]);

  // Function to update gas consumption both in state and SQLite
  const updateGasConsumption = (newConsumption) => {
    console.log('Received new gas consumption for update:', newConsumption);

    setGasConsumption(newConsumption);  // Update local state

    // Save the new value to SQLite
    if (db) {
      db.transaction((txn) => {
        txn.executeSql(
          'INSERT OR REPLACE INTO gas_data (id, consumption) VALUES (1, ?)',
          [newConsumption],
          () => {
            console.log('Gas consumption updated successfully in the database:', newConsumption);

            // Immediately verify the saved value
            txn.executeSql('SELECT consumption FROM gas_data WHERE id = 1', [], (tx, results) => {
              if (results.rows.length > 0) {
                const savedConsumption = results.rows.item(0).consumption;
                console.log('Verified saved consumption:', savedConsumption);
              }
            });
          },
          (error) => { console.error('Failed to update gas consumption in the database:', error); }
        );
      });
    }
  };

  return (
    <GasConsumptionContext.Provider value={{ gasConsumption, setGasConsumption : updateGasConsumption }}>
      {children}
    </GasConsumptionContext.Provider>
  );
};
