import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, Dumbbell } from "lucide-react";

interface ExerciseSelectorProps {
  onSelectExercise: (exercise: string) => void;
}

const ExerciseSelector = ({ onSelectExercise }: ExerciseSelectorProps) => {
  const exercises = [
    {
      id: 'shoulder_raise',
      name: 'Shoulder Raise',
      description: 'Lift arms to shoulder height for upper body strength',
      icon: Activity,
      color: 'from-primary to-accent',
    },
    {
      id: 'squat',
      name: 'Squat',
      description: 'Lower body exercise for legs and core stability',
      icon: Dumbbell,
      color: 'from-success to-emerald-400',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background flex items-center justify-center p-6">
      <div className="max-w-4xl w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="text-center space-y-3">
          <h1 className="text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            PhysioMate
          </h1>
          <p className="text-xl text-muted-foreground">
            AI-Powered Physiotherapy Assistant
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {exercises.map((exercise, index) => {
            const Icon = exercise.icon;
            return (
              <Card
                key={exercise.id}
                className="group cursor-pointer overflow-hidden border-2 hover:border-primary transition-all duration-300 hover:shadow-glow animate-in fade-in slide-in-from-bottom-4"
                style={{ animationDelay: `${index * 100}ms` }}
                onClick={() => onSelectExercise(exercise.id)}
              >
                <div className="p-8 space-y-4">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${exercise.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-soft`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-card-foreground group-hover:text-primary transition-colors">
                      {exercise.name}
                    </h3>
                    <p className="text-muted-foreground">
                      {exercise.description}
                    </p>
                  </div>

                  <Button 
                    className="w-full bg-gradient-primary hover:opacity-90 text-white font-semibold shadow-soft group-hover:shadow-glow transition-all duration-300"
                  >
                    Start Exercise
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        <Card className="p-6 bg-card/50 backdrop-blur-sm border-primary/20">
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
    </div>
  );
};

export default ExerciseSelector;
