import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Mic, MicOff, Trophy, Zap, Target, AudioLines, Play, Square, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import { voiceHandler, type VoiceStatus } from '@/utils/voiceCommands';
import { drawPose, type Landmark } from '@/utils/poseDetection';
import { analyzeExercise, EXERCISES, type ExerciseFeedback } from '@/utils/exerciseAnalysis';

interface ExerciseSessionProps {
  exercise: string;
  onBack: () => void;
}

declare global {
  interface Window {
    Pose: any;
    Camera: any;
  }
}

const ExerciseSession = ({ exercise, onBack }: ExerciseSessionProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [isListening, setIsListening] = useState(true);
  const [reps, setReps] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [feedback, setFeedback] = useState<ExerciseFeedback>({
    status: 'incorrect',
    message: 'Select exercise and say "start"',
  });
  const [duration, setDuration] = useState(0);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('idle');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [interimText, setInterimText] = useState('');
  const [heardLog, setHeardLog] = useState<
    { id: number; text: string; action: 'start' | 'stop' | 'ignored'; time: string }[]
  >([]);
  
  const poseRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);
  const lastRepStateRef = useRef<'up' | 'down'>('up');
  const holdStartRef = useRef<number>(0);
  const lastFeedbackRef = useRef<string>('');
  const isActiveRef = useRef(false);
  const busyRef = useRef(false);

  const exerciseConfig = EXERCISES[exercise];

  // Release camera/pose on unmount
  useEffect(() => {
    return () => {
      isActiveRef.current = false;
      try {
        cameraRef.current?.stop();
      } catch {
        // ignore
      }
      cameraRef.current = null;
      poseRef.current = null;
    };
  }, []);

  useEffect(() => {
    // Start voice listening
    if (isListening) {
      voiceHandler.startListening({
        onCommand: handleVoiceCommand,
        onTranscript: (text, isFinal) => setInterimText(isFinal ? '' : text),
        onStatus: (status, detail) => {
          setVoiceStatus(status);
          setVoiceError(status === 'error' ? detail ?? 'unknown error' : null);
        },
      });
    } else {
      voiceHandler.stopListening();
      setInterimText('');
    }

    return () => {
      voiceHandler.stopListening();
    };
  }, [isListening]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isActive) {
      interval = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  const handleVoiceCommand = (command: string) => {
    console.log('Processing command:', command);

    const text = command.toLowerCase();
    const wantsStop = /\b(stop|pause|end|finish|halt)\b/.test(text);
    const wantsStart = /\b(start|begin|go|resume)\b/.test(text);

    const action: 'start' | 'stop' | 'ignored' = wantsStop
      ? 'stop'
      : wantsStart
      ? 'start'
      : 'ignored';

    setInterimText('');
    setHeardLog((prev) =>
      [
        {
          id: Date.now() + Math.random(),
          text: command,
          action,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        },
        ...prev,
      ].slice(0, 8)
    );

    // "stop" wins if both appear
    if (wantsStop) {
      if (isActiveRef.current) stopExercise();
      return;
    }
    if (wantsStart) {
      if (!isActiveRef.current) startExercise();
    }
  };

  const startExercise = async () => {
    try {
      if (isActiveRef.current || busyRef.current) return;
      busyRef.current = true;
      isActiveRef.current = true;

      voiceHandler.speak(`Starting ${exerciseConfig.name}. Get ready!`);
      
      // Initialize MediaPipe Pose
      if (!window.Pose) {
        toast.error('MediaPipe Pose not loaded. Please refresh the page.');
        isActiveRef.current = false;
        busyRef.current = false;
        return;
      }

      // Reuse a single Pose instance — re-creating after close() crashes the wasm module
      if (!poseRef.current) {
        const pose = new window.Pose({
          locateFile: (file: string) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
        });

        pose.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          enableSegmentation: false,
          smoothSegmentation: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        pose.onResults(onPoseResults);
        poseRef.current = pose;
      }

      // Start camera
      if (videoRef.current && window.Camera && !cameraRef.current) {
        const camera = new window.Camera(videoRef.current, {
          onFrame: async () => {
            if (videoRef.current && poseRef.current && isActiveRef.current) {
              try {
                await poseRef.current.send({ image: videoRef.current });
              } catch {
                // ignore transient frame errors
              }
            }
          },
          width: 640,
          height: 480,
        });
        
        await camera.start();
        cameraRef.current = camera;
      } else if (cameraRef.current) {
        await cameraRef.current.start();
      }

      setIsActive(true);
      startTimeRef.current = Date.now();
      toast.success('Exercise started! Follow the instructions.');
    } catch (error) {
      console.error('Error starting exercise:', error);
      isActiveRef.current = false;
      toast.error('Failed to start exercise. Please check camera permissions.');
    } finally {
      busyRef.current = false;
    }
  };

  const stopExercise = async () => {
    if (!isActiveRef.current) return;
    isActiveRef.current = false;

    voiceHandler.speak('Exercise stopped. Great work!');
    
    // Stop camera
    if (cameraRef.current) {
      try {
        cameraRef.current.stop();
      } catch {
        // ignore
      }
    }
    // Keep the Pose instance alive; closing it breaks a later restart.

    setIsActive(false);
    
    toast.success(`Session complete! ${reps} reps, ${score} points, ${streak} streak`);
  };

  const onPoseResults = (results: any) => {
    if (!isActiveRef.current) return;
    if (!results.poseLandmarks || !canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw pose
    drawPose(ctx, results.poseLandmarks, canvas.width, canvas.height);

    // Analyze exercise
    const exerciseFeedback = analyzeExercise(exercise, results.poseLandmarks);
    setFeedback(exerciseFeedback);

    // Handle rep counting
    handleRepCounting(exerciseFeedback);

    // Voice feedback (throttled)
    if (
      exerciseFeedback.message !== lastFeedbackRef.current &&
      Date.now() - holdStartRef.current > 2000
    ) {
      voiceHandler.speak(exerciseFeedback.message);
      lastFeedbackRef.current = exerciseFeedback.message;
      holdStartRef.current = Date.now();
    }
  };

  const handleRepCounting = (exerciseFeedback: ExerciseFeedback) => {
    const now = Date.now();
    
    if (exerciseFeedback.status === 'correct') {
      if (holdStartRef.current === 0) {
        holdStartRef.current = now;
      } else if (now - holdStartRef.current >= exerciseConfig.holdTime * 1000) {
        // Rep completed
        if (lastRepStateRef.current === 'up') {
          lastRepStateRef.current = 'down';
          const newReps = reps + 1;
          const points = exerciseFeedback.status === 'correct' ? 10 : 5;
          const newScore = score + points;
          const newStreak = streak + 1;
          
          setReps(newReps);
          setScore(newScore);
          setStreak(newStreak);
          
          toast.success(`Rep ${newReps} completed! +${points} points`, {
            duration: 1500,
          });
          
          holdStartRef.current = 0;
        }
      }
    } else {
      if (lastRepStateRef.current === 'down') {
        lastRepStateRef.current = 'up';
      }
      holdStartRef.current = 0;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getFeedbackColor = () => {
    switch (feedback.status) {
      case 'correct': return 'bg-gradient-success';
      case 'warning': return 'bg-gradient-warning';
      case 'incorrect': return 'bg-destructive';
      default: return 'bg-muted';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={onBack}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          
          <Badge className="text-lg px-4 py-2 bg-gradient-primary text-white">
            {exerciseConfig.name}
          </Badge>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsListening(!isListening)}
            className={isListening ? 'border-primary' : ''}
          >
            {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Video Section */}
          <Card className="lg:col-span-2 p-6 space-y-4">
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                autoPlay
                playsInline
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full scale-x-[-1]"
              />
              
              {/* Feedback Banner */}
              <div className={`absolute top-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full ${getFeedbackColor()} text-white font-semibold shadow-lg`}>
                {feedback.message}
              </div>

              {/* Angle Display */}
              {feedback.angle && (
                <div className="absolute bottom-4 right-4 bg-black/70 text-white px-4 py-2 rounded-lg">
                  <div className="text-sm">Angle</div>
                  <div className="text-2xl font-bold">{feedback.angle}°</div>
                  <div className="text-xs text-muted-foreground">{feedback.targetRange}</div>
                </div>
              )}
            </div>

            {/* Manual controls — always available, override voice commands */}
            <div className="space-y-2">
              <div className="flex gap-3">
                <Button
                  onClick={() => handleManualControl('start')}
                  disabled={isActive}
                  className="flex-1 bg-gradient-success hover:opacity-90 text-white font-semibold py-6 text-lg gap-2"
                >
                  <Play className="w-5 h-5" />
                  Start Exercise
                </Button>
                <Button
                  onClick={() => handleManualControl('stop')}
                  disabled={!isActive}
                  variant="destructive"
                  className="flex-1 py-6 text-lg font-semibold gap-2"
                >
                  <Square className="w-5 h-5" />
                  Stop Exercise
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Manual controls always work — use them if voice recognition is unreliable.
              </p>
            </div>
          </Card>

          {/* Stats Panel */}
          <div className="space-y-4">
            <Card className="p-6 space-y-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" />
                Session Stats
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg">
                  <span className="text-muted-foreground">Reps</span>
                  <span className="text-2xl font-bold text-primary">{reps}</span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Score
                  </span>
                  <span className="text-2xl font-bold text-success">{score}</span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Streak
                  </span>
                  <span className="text-2xl font-bold text-warning">{streak}</span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="text-2xl font-bold">{formatTime(duration)}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <AudioLines className="w-5 h-5 text-primary" />
                  Voice Monitor
                </h3>
                <Badge
                  variant="outline"
                  className={
                    voiceStatus === 'listening'
                      ? 'border-success text-success'
                      : voiceStatus === 'error' || voiceStatus === 'unsupported'
                      ? 'border-destructive text-destructive'
                      : 'text-muted-foreground'
                  }
                >
                  {voiceStatus === 'listening'
                    ? 'Listening'
                    : voiceStatus === 'error'
                    ? 'Error'
                    : voiceStatus === 'unsupported'
                    ? 'Unsupported'
                    : 'Idle'}
                </Badge>
              </div>

              <div className="min-h-[3.5rem] p-3 rounded-lg bg-secondary/50 text-sm">
                {voiceStatus === 'unsupported' ? (
                  <span className="text-destructive">
                    Speech recognition isn't supported in this browser. Use the buttons instead.
                  </span>
                ) : interimText ? (
                  <span className="italic text-foreground">"{interimText}"</span>
                ) : (
                  <span className="text-muted-foreground">
                    {isListening ? 'Say "start" or "stop"…' : 'Microphone is off'}
                  </span>
                )}
              </div>

              {voiceError && (
                <p className="text-xs text-destructive">Mic error: {voiceError}</p>
              )}

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Recent</p>
                {heardLog.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nothing heard yet.</p>
                ) : (
                  <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {heardLog.map((entry) => (
                      <li
                        key={entry.id}
                        className="flex items-start gap-2 text-sm p-2 rounded-md bg-secondary/40"
                      >
                        <span
                          className={
                            entry.action === 'start'
                              ? 'text-success mt-0.5'
                              : entry.action === 'stop'
                              ? 'text-destructive mt-0.5'
                              : 'text-muted-foreground mt-0.5'
                          }
                        >
                          {entry.action === 'start' ? (
                            <Play className="w-4 h-4" />
                          ) : entry.action === 'stop' ? (
                            <Square className="w-4 h-4" />
                          ) : (
                            <HelpCircle className="w-4 h-4" />
                          )}
                        </span>
                        <span className="flex-1 break-words">{entry.text}</span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {entry.time}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>

            <Card className="p-6 space-y-3 bg-primary/5 border-primary/20">
              <h4 className="font-semibold flex items-center gap-2">
                <span className="text-xl">💡</span>
                Tips
              </h4>
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li>• Keep your full body visible</li>
                <li>• Ensure good lighting</li>
                <li>• Stand 1-2 meters from camera</li>
                <li>• Hold correct form to count reps</li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExerciseSession;
