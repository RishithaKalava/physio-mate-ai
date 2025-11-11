/**
 * Pose Detection Utilities using MediaPipe Pose
 */

export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export interface PoseResults {
  poseLandmarks: Landmark[];
}

export const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
};

export function calculateAngle(p1: Landmark, p2: Landmark, p3: Landmark): number {
  // Vector from p2 to p1
  const v1 = {
    x: p1.x - p2.x,
    y: p1.y - p2.y,
    z: p1.z - p2.z,
  };

  // Vector from p2 to p3
  const v2 = {
    x: p3.x - p2.x,
    y: p3.y - p2.y,
    z: p3.z - p2.z,
  };

  // Dot product
  const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;

  // Magnitudes
  const mag1 = Math.sqrt(v1.x ** 2 + v1.y ** 2 + v1.z ** 2);
  const mag2 = Math.sqrt(v2.x ** 2 + v2.y ** 2 + v2.z ** 2);

  // Avoid division by zero
  if (mag1 === 0 || mag2 === 0) return 0;

  // Calculate angle
  const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  const angleRad = Math.acos(cosAngle);
  const angleDeg = (angleRad * 180) / Math.PI;

  return angleDeg;
}

export function drawPose(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
  width: number,
  height: number
): void {
  // Draw connections
  const connections = [
    // Torso
    [11, 12], [11, 23], [12, 24], [23, 24],
    // Left arm
    [11, 13], [13, 15],
    // Right arm
    [12, 14], [14, 16],
    // Left leg
    [23, 25], [25, 27],
    // Right leg
    [24, 26], [26, 28],
  ];

  ctx.strokeStyle = 'rgba(0, 255, 255, 0.6)';
  ctx.lineWidth = 3;

  connections.forEach(([start, end]) => {
    const startLandmark = landmarks[start];
    const endLandmark = landmarks[end];
    
    if (startLandmark.visibility > 0.5 && endLandmark.visibility > 0.5) {
      ctx.beginPath();
      ctx.moveTo(startLandmark.x * width, startLandmark.y * height);
      ctx.lineTo(endLandmark.x * width, endLandmark.y * height);
      ctx.stroke();
    }
  });

  // Draw landmarks
  landmarks.forEach((landmark, index) => {
    if (landmark.visibility > 0.5) {
      const x = landmark.x * width;
      const y = landmark.y * height;

      // Different colors for different body parts
      if (index >= 23) {
        ctx.fillStyle = 'rgba(255, 100, 100, 0.8)'; // Legs - red
      } else if (index >= 11) {
        ctx.fillStyle = 'rgba(100, 255, 100, 0.8)'; // Arms - green
      } else {
        ctx.fillStyle = 'rgba(255, 255, 100, 0.8)'; // Head - yellow
      }

      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fill();
    }
  });
}
