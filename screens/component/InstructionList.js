import React, { useMemo, useCallback } from 'react';
import { View, Text, FlatList } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const getManeuverIcon = (instruction) => {
  const lowerCaseInstruction = instruction.toLowerCase();
  if (lowerCaseInstruction.includes('right')) {
    return 'arrow-forward-outline';
  } else if (lowerCaseInstruction.includes('left')) {
    return 'arrow-back-outline';
  } else if (lowerCaseInstruction.includes('straight')) {
    return 'arrow-up-outline';
  }
  return 'navigate-outline'; // Default icon
};

const InstructionsList = ({ remainingInstructions, currentStepIndex }) => {
  // Memoize the instructions to avoid re-renders
  const memoizedInstructions = useMemo(() => remainingInstructions, [remainingInstructions]);

  // Create a render function for the instructions using useCallback
  const renderInstructions = useCallback(({ item }) => {
    return (
      <View style={styles.turnCard}>
        <Ionicons
          name={getManeuverIcon(item.maneuver.instruction)}
          size={30}
          color="black"
        />
        <View style={styles.turnCardText}>
          <Text style={styles.turnCardDistance}>
            {`${Math.round(item.distance)} m`}
          </Text>
          <Text style={styles.turnCardRoad}>
            {item.name || 'Unknown Road'}
          </Text>
        </View>
      </View>
    );
  }, []);

  return (
    <FlatList
      data={memoizedInstructions}
      keyExtractor={(item, index) => `instruction_${currentStepIndex + index}`}
      renderItem={renderInstructions}
      contentContainerStyle={{ paddingBottom: 10 }}
      ListEmptyComponent={() => (
        <View style={styles.emptyList}>
          <Text style={styles.emptyText}>No remaining instructions</Text>
        </View>
      )}
    />
  );
};

export default InstructionsList;

const styles = {
  turnCard: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  turnCardText: {
    marginLeft: 10,
  },
  turnCardDistance: {
    color: 'black',
    fontSize: 16,
  },
  turnCardRoad: {
    color: 'gray',
    fontSize: 14,
  },
  emptyList: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    color: 'gray',
    fontSize: 16,
  },
};
