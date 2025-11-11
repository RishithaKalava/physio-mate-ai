import React from 'react';
import { Header } from '@/components/Header';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ExerciseSelectorProps {
  onSelectExercise: (exercise: string) => void;
}

const ExerciseSelector = ({ onSelectExercise }: ExerciseSelectorProps) => {
  const exercises = [
    {
      id: 'shoulder_raise',
      name: 'Shoulder Raise',
      description: 'Improve shoulder mobility and strength',
    },
    {
      id: 'squat',
      name: 'Squat',
      description: 'Build lower body strength and stability',
    },
  ];

  const [selectedExercise, setSelectedExercise] = React.useState<string>('');

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card className="p-8 shadow-elegant">
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-2">Select Exercise Type</h2>
                <p className="text-muted-foreground">
                  Choose an exercise to begin your rehabilitation session
                </p>
              </div>

              <div className="space-y-4">
                <Label htmlFor="exercise-select" className="text-lg font-semibold">
                  Exercise Type
                </Label>
                <Select value={selectedExercise} onValueChange={setSelectedExercise}>
                  <SelectTrigger id="exercise-select" className="w-full h-12 text-lg">
                    <SelectValue placeholder="Choose an exercise..." />
                  </SelectTrigger>
                  <SelectContent>
                    {exercises.map((exercise) => (
                      <SelectItem key={exercise.id} value={exercise.id} className="text-lg py-3">
                        <div className="flex flex-col">
                          <span className="font-semibold">{exercise.name}</span>
                          <span className="text-sm text-muted-foreground">
                            {exercise.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={() => selectedExercise && onSelectExercise(selectedExercise)}
                disabled={!selectedExercise}
                className="w-full h-12 text-lg"
              >
                Start Exercise Session
              </Button>

              <Card className="p-6 bg-card/50 backdrop-blur-sm border-primary/20 mt-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl">🎤</span>
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-semibold text-card-foreground">Voice Commands</h4>
                    <p className="text-sm text-muted-foreground">
                      Say <span className="text-primary font-semibold">"start"</span> to begin exercise or{' '}
                      <span className="text-destructive font-semibold">"stop"</span> to end session
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ExerciseSelector;
