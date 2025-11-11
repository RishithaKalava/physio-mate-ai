import { Landmark, calculateAngle, POSE_LANDMARKS } from './poseDetection';

export interface ExerciseConfig {
  name: string;
  angles: {
    [key: string]: {
      min: number;
      max: number;
      tolerance: number;
    };
  };
  holdTime: number;
}

export interface ExerciseFeedback {
  status: 'correct' | 'warning' | 'incorrect';
  message: string;
  angle?: number;
  targetRange?: string;
}

export const EXERCISES: Record<string, ExerciseConfig> = {
  shoulder_raise: {
    name: 'Shoulder Raise',
    angles: {
      left_shoulder: { min: 70, max: 110, tolerance: 15 },
      right_shoulder: { min: 70, max: 110, tolerance: 15 },
    },
    holdTime: 0.5,
  },
  squat: {
    name: 'Squat',
    angles: {
      left_knee: { min: 70, max: 110, tolerance: 15 },
      right_knee: { min: 70, max: 110, tolerance: 15 },
      left_hip: { min: 70, max: 110, tolerance: 15 },
      right_hip: { min: 70, max: 110, tolerance: 15 },
    },
    holdTime: 0.5,
  },
};

export function analyzeShoulderRaise(landmarks: Landmark[]): ExerciseFeedback {
  const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
  const leftElbow = landmarks[POSE_LANDMARKS.LEFT_ELBOW];
  const leftWrist = landmarks[POSE_LANDMARKS.LEFT_WRIST];
  const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP];

  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
  const rightElbow = landmarks[POSE_LANDMARKS.RIGHT_ELBOW];
  const rightWrist = landmarks[POSE_LANDMARKS.RIGHT_WRIST];
  const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];

  // Calculate shoulder angles
  const leftShoulderAngle = calculateAngle(leftHip, leftShoulder, leftElbow);
  const rightShoulderAngle = calculateAngle(rightHip, rightShoulder, rightElbow);

  const avgAngle = (leftShoulderAngle + rightShoulderAngle) / 2;
  const config = EXERCISES.shoulder_raise.angles.left_shoulder;

  // Check if arms are raised
  if (avgAngle < config.min - config.tolerance) {
    return {
      status: 'incorrect',
      message: 'Raise your arms higher',
      angle: Math.round(avgAngle),
      targetRange: `${config.min}-${config.max}°`,
    };
  } else if (avgAngle > config.max + config.tolerance) {
    return {
      status: 'warning',
      message: 'Arms too high, lower slightly',
      angle: Math.round(avgAngle),
      targetRange: `${config.min}-${config.max}°`,
    };
  } else if (avgAngle >= config.min && avgAngle <= config.max) {
    return {
      status: 'correct',
      message: 'Perfect form! Hold it',
      angle: Math.round(avgAngle),
      targetRange: `${config.min}-${config.max}°`,
    };
  } else {
    return {
      status: 'warning',
      message: 'Almost there, adjust slightly',
      angle: Math.round(avgAngle),
      targetRange: `${config.min}-${config.max}°`,
    };
  }
}

export function analyzeSquat(landmarks: Landmark[]): ExerciseFeedback {
  const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
  const leftKnee = landmarks[POSE_LANDMARKS.LEFT_KNEE];
  const leftAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
  const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];

  const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];
  const rightKnee = landmarks[POSE_LANDMARKS.RIGHT_KNEE];
  const rightAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];
  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];

  // Calculate knee and hip angles
  const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
  const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
  const leftHipAngle = calculateAngle(leftShoulder, leftHip, leftKnee);
  const rightHipAngle = calculateAngle(rightShoulder, rightHip, rightKnee);

  const avgKneeAngle = (leftKneeAngle + rightKneeAngle) / 2;
  const avgHipAngle = (leftHipAngle + rightHipAngle) / 2;

  const kneeConfig = EXERCISES.squat.angles.left_knee;
  const hipConfig = EXERCISES.squat.angles.left_hip;

  // Check squat depth
  if (avgKneeAngle > 140) {
    return {
      status: 'incorrect',
      message: 'Squat deeper, bend your knees more',
      angle: Math.round(avgKneeAngle),
      targetRange: `${kneeConfig.min}-${kneeConfig.max}°`,
    };
  } else if (avgKneeAngle < 60) {
    return {
      status: 'warning',
      message: 'Too deep, come up slightly',
      angle: Math.round(avgKneeAngle),
      targetRange: `${kneeConfig.min}-${kneeConfig.max}°`,
    };
  } else if (avgKneeAngle >= kneeConfig.min && avgKneeAngle <= kneeConfig.max) {
    // Check hip angle for proper form
    if (avgHipAngle >= hipConfig.min && avgHipAngle <= hipConfig.max) {
      return {
        status: 'correct',
        message: 'Excellent squat form!',
        angle: Math.round(avgKneeAngle),
        targetRange: `${kneeConfig.min}-${kneeConfig.max}°`,
      };
    } else {
      return {
        status: 'warning',
        message: 'Good depth, keep back straight',
        angle: Math.round(avgKneeAngle),
        targetRange: `${kneeConfig.min}-${kneeConfig.max}°`,
      };
    }
  } else {
    return {
      status: 'warning',
      message: 'Almost perfect, adjust slightly',
      angle: Math.round(avgKneeAngle),
      targetRange: `${kneeConfig.min}-${kneeConfig.max}°`,
    };
  }
}

export function analyzeExercise(
  exerciseType: string,
  landmarks: Landmark[]
): ExerciseFeedback {
  if (exerciseType === 'shoulder_raise') {
    return analyzeShoulderRaise(landmarks);
  } else if (exerciseType === 'squat') {
    return analyzeSquat(landmarks);
  }
  
  return {
    status: 'incorrect',
    message: 'Unknown exercise',
  };
}
