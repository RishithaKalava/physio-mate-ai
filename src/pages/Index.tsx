import { useState } from 'react';
import ExerciseSelector from '@/components/ExerciseSelector';
import ExerciseSession from '@/components/ExerciseSession';

const Index = () => {
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);

  return (
    <main>
      {!selectedExercise ? (
        <ExerciseSelector onSelectExercise={setSelectedExercise} />
      ) : (
        <ExerciseSession 
          exercise={selectedExercise} 
          onBack={() => setSelectedExercise(null)} 
        />
      )}
    </main>
  );
};

export default Index;
