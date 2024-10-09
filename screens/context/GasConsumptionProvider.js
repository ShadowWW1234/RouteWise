import React, { createContext, useState, useEffect } from 'react';
import SQLite from 'react-native-sqlite-storage';

export const GasConsumptionContext = createContext();

export const GasConsumptionProvider = ({ children }) => {
  const [gasConsumption, setGasConsumption] = useState(null);

  // SQLite database setup
  const db = SQLite.openDatabase(
    { name: 'gasConsumption.db', location: 'default' },
    () => { console.log('Database opened'); },
    error => { console.log('Error opening database:', error); }
  );

  // Ensure the table is created before using it
  useEffect(() => {
    db.transaction(txn => {
      txn.executeSql(
        `CREATE TABLE IF NOT EXISTS gas_data (
          id INTEGER PRIMARY KEY NOT NULL,
          consumption REAL
        );`,
        [],
        () => { console.log('Table created successfully'); },
        error => { console.error('Error creating table:', error); }
      );
    });
  }, []);
  

  // Load gas consumption from SQLite on component mount
  useEffect(() => {
    const loadGasConsumption = () => {
      db.transaction(txn => {
        txn.executeSql(
          'SELECT consumption FROM gas_data WHERE id = 1',
          [],
          (tx, results) => {
            if (results.rows.length > 0) {
              const consumptionValue = results.rows.item(0).consumption;
              if (consumptionValue !== null && consumptionValue !== undefined) {
                setGasConsumption(consumptionValue);
              } else {
                setGasConsumption(null);
              }
            }
          },
          error => { console.error('Failed to load gas consumption:', error); }
        );
      });
    };

    loadGasConsumption();
  }, []);

  const updateGasConsumption = (newConsumption) => {
    console.log('Received new gas consumption for update:', newConsumption);
  
    setGasConsumption(newConsumption);  // Update local state
  
    // Save to SQLite
    db.transaction(txn => {
      txn.executeSql(
        'INSERT OR REPLACE INTO gas_data (id, consumption) VALUES (1, ?)',
        [newConsumption],
        () => {
          console.log('Gas consumption updated successfully in the database:', newConsumption);
  
          // Immediately verify what was saved
          txn.executeSql('SELECT consumption FROM gas_data WHERE id = 1', [], (tx, results) => {
            if (results.rows.length > 0) {
              const savedConsumption = results.rows.item(0).consumption;
              console.log('Verified saved consumption:', savedConsumption);
            }
          });
        },
        error => { console.error('Failed to update gas consumption in the database:', error); }
      );
    });
  };
  
  
  
  
  return (
    <GasConsumptionContext.Provider value={{ gasConsumption, updateGasConsumption }}>
      {children}
    </GasConsumptionContext.Provider>
  );
};
