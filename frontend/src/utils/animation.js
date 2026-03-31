/**
 * Animation Engine - Easing Functions & Interpolation
 * Provides smooth, natural motion for keyframe animations
 */

// Easing type constants
export const EASING_TYPES = {
  LINEAR: 'linear',
  EASE_IN: 'ease-in',
  EASE_OUT: 'ease-out',
  EASE_IN_OUT: 'ease-in-out',
  EASE_IN_QUAD: 'ease-in-quad',
  EASE_OUT_QUAD: 'ease-out-quad',
  EASE_IN_OUT_QUAD: 'ease-in-out-quad',
  EASE_IN_CUBIC: 'ease-in-cubic',
  EASE_OUT_CUBIC: 'ease-out-cubic',
  EASE_IN_OUT_CUBIC: 'ease-in-out-cubic',
  EASE_IN_BACK: 'ease-in-back',
  EASE_OUT_BACK: 'ease-out-back',
  EASE_OUT_ELASTIC: 'ease-out-elastic',
  EASE_OUT_BOUNCE: 'ease-out-bounce',
};

// Human-readable names for UI
export const EASING_LABELS = {
  [EASING_TYPES.LINEAR]: 'Linear',
  [EASING_TYPES.EASE_IN]: 'Ease In',
  [EASING_TYPES.EASE_OUT]: 'Ease Out',
  [EASING_TYPES.EASE_IN_OUT]: 'Ease In-Out',
  [EASING_TYPES.EASE_IN_QUAD]: 'Ease In (Quad)',
  [EASING_TYPES.EASE_OUT_QUAD]: 'Ease Out (Quad)',
  [EASING_TYPES.EASE_IN_OUT_QUAD]: 'Ease In-Out (Quad)',
  [EASING_TYPES.EASE_IN_CUBIC]: 'Ease In (Cubic)',
  [EASING_TYPES.EASE_OUT_CUBIC]: 'Ease Out (Cubic)',
  [EASING_TYPES.EASE_IN_OUT_CUBIC]: 'Ease In-Out (Cubic)',
  [EASING_TYPES.EASE_IN_BACK]: 'Ease In (Back)',
  [EASING_TYPES.EASE_OUT_BACK]: 'Ease Out (Back)',
  [EASING_TYPES.EASE_OUT_ELASTIC]: 'Elastic',
  [EASING_TYPES.EASE_OUT_BOUNCE]: 'Bounce',
};

// Primary easing options for dropdown
export const PRIMARY_EASINGS = [
  EASING_TYPES.LINEAR,
  EASING_TYPES.EASE_IN,
  EASING_TYPES.EASE_OUT,
  EASING_TYPES.EASE_IN_OUT,
];

// All easing options including advanced
export const ALL_EASINGS = Object.values(EASING_TYPES);

/**
 * Easing Functions
 * All functions take t (0-1) and return eased t (0-1)
 */
const easingFunctions = {
  // Linear - constant speed
  [EASING_TYPES.LINEAR]: (t) => t,

  // Sine-based (smooth, natural feel)
  [EASING_TYPES.EASE_IN]: (t) => 1 - Math.cos((t * Math.PI) / 2),
  [EASING_TYPES.EASE_OUT]: (t) => Math.sin((t * Math.PI) / 2),
  [EASING_TYPES.EASE_IN_OUT]: (t) => -(Math.cos(Math.PI * t) - 1) / 2,

  // Quadratic (slightly more pronounced)
  [EASING_TYPES.EASE_IN_QUAD]: (t) => t * t,
  [EASING_TYPES.EASE_OUT_QUAD]: (t) => 1 - (1 - t) * (1 - t),
  [EASING_TYPES.EASE_IN_OUT_QUAD]: (t) => 
    t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,

  // Cubic (even more pronounced)
  [EASING_TYPES.EASE_IN_CUBIC]: (t) => t * t * t,
  [EASING_TYPES.EASE_OUT_CUBIC]: (t) => 1 - Math.pow(1 - t, 3),
  [EASING_TYPES.EASE_IN_OUT_CUBIC]: (t) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,

  // Back (overshoots then settles)
  [EASING_TYPES.EASE_IN_BACK]: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  },
  [EASING_TYPES.EASE_OUT_BACK]: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },

  // Elastic (springy overshoot)
  [EASING_TYPES.EASE_OUT_ELASTIC]: (t) => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0
      ? 0
      : t === 1
      ? 1
      : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },

  // Bounce (bouncing ball effect)
  [EASING_TYPES.EASE_OUT_BOUNCE]: (t) => {
    const n1 = 7.5625;
    const d1 = 2.75;

    if (t < 1 / d1) {
      return n1 * t * t;
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
  },
};

/**
 * Apply easing function to a progress value
 * @param {number} t - Progress between 0 and 1
 * @param {string} easingType - Type of easing to apply
 * @returns {number} - Eased progress value
 */
export function applyEasing(t, easingType = EASING_TYPES.LINEAR) {
  // Clamp t to valid range
  t = Math.max(0, Math.min(1, t));
  
  const easingFn = easingFunctions[easingType] || easingFunctions[EASING_TYPES.LINEAR];
  return easingFn(t);
}

/**
 * Interpolate a single value between two points with easing
 * @param {number} startValue - Value at start
 * @param {number} endValue - Value at end
 * @param {number} t - Progress (0-1)
 * @param {string} easing - Easing type
 * @returns {number} - Interpolated value
 */
export function interpolateWithEasing(startValue, endValue, t, easing = EASING_TYPES.LINEAR) {
  const easedT = applyEasing(t, easing);
  return startValue + (endValue - startValue) * easedT;
}

/**
 * Get interpolated value for a property at a specific time
 * Supports per-keyframe easing
 * 
 * @param {Object} keyframes - Keyframes object { time: { property, easing } }
 * @param {string} property - Property name to interpolate
 * @param {number} time - Current time
 * @param {number} defaultValue - Default value if no keyframes
 * @returns {number} - Interpolated value
 */
export function interpolateProperty(keyframes, property, time, defaultValue) {
  const times = Object.keys(keyframes)
    .map(Number)
    .sort((a, b) => a - b);
  
  // No keyframes - return default
  if (times.length === 0) return defaultValue;
  
  // Before first keyframe - return first keyframe value
  if (time <= times[0]) {
    return keyframes[times[0]]?.[property] ?? defaultValue;
  }
  
  // At or after last keyframe - return last keyframe value
  if (time >= times[times.length - 1]) {
    return keyframes[times[times.length - 1]]?.[property] ?? defaultValue;
  }
  
  // Find surrounding keyframes
  let prevTime = times[0];
  let nextTime = times[times.length - 1];
  
  for (let i = 0; i < times.length - 1; i++) {
    if (time >= times[i] && time <= times[i + 1]) {
      prevTime = times[i];
      nextTime = times[i + 1];
      break;
    }
  }
  
  const prevKeyframe = keyframes[prevTime];
  const nextKeyframe = keyframes[nextTime];
  
  const prevValue = prevKeyframe?.[property];
  const nextValue = nextKeyframe?.[property];
  
  // Handle missing values
  if (prevValue === undefined && nextValue === undefined) return defaultValue;
  if (prevValue === undefined) return nextValue;
  if (nextValue === undefined) return prevValue;
  
  // Calculate progress between keyframes
  const t = (time - prevTime) / (nextTime - prevTime);
  
  // Get easing type from the NEXT keyframe (easing describes how we ARRIVE at a keyframe)
  // This is the standard animation convention
  const easing = nextKeyframe?.easing || EASING_TYPES.LINEAR;
  
  return interpolateWithEasing(prevValue, nextValue, t, easing);
}

/**
 * Get all interpolated properties for a layer at a specific time
 * 
 * @param {Object} layer - Layer object with keyframes
 * @param {number} time - Current time
 * @returns {Object} - Object with interpolated x, y, rotation, scaleX, scaleY, opacity
 */
export function getInterpolatedProperties(layer, time) {
  const keyframes = layer.keyframes || {};
  const hasKeyframes = Object.keys(keyframes).length > 0;
  
  if (!hasKeyframes) {
    return {
      x: layer.x,
      y: layer.y,
      rotation: layer.rotation,
      scaleX: layer.scaleX,
      scaleY: layer.scaleY,
      opacity: layer.opacity,
    };
  }
  
  return {
    x: interpolateProperty(keyframes, 'x', time, layer.x),
    y: interpolateProperty(keyframes, 'y', time, layer.y),
    rotation: interpolateProperty(keyframes, 'rotation', time, layer.rotation),
    scaleX: interpolateProperty(keyframes, 'scaleX', time, layer.scaleX),
    scaleY: interpolateProperty(keyframes, 'scaleY', time, layer.scaleY),
    opacity: interpolateProperty(keyframes, 'opacity', time, layer.opacity),
  };
}

/**
 * Get keyframe times for a specific layer
 * @param {Object} layer - Layer object
 * @returns {number[]} - Sorted array of keyframe times
 */
export function getKeyframeTimes(layer) {
  return Object.keys(layer.keyframes || {})
    .map(Number)
    .sort((a, b) => a - b);
}

/**
 * Find the nearest keyframe to a given time
 * @param {Object} layer - Layer object
 * @param {number} time - Target time
 * @param {number} tolerance - Maximum time difference to consider "near"
 * @returns {number|null} - Nearest keyframe time or null
 */
export function findNearestKeyframe(layer, time, tolerance = 0.1) {
  const times = getKeyframeTimes(layer);
  if (times.length === 0) return null;
  
  let nearest = null;
  let minDiff = Infinity;
  
  for (const t of times) {
    const diff = Math.abs(t - time);
    if (diff < minDiff && diff <= tolerance) {
      minDiff = diff;
      nearest = t;
    }
  }
  
  return nearest;
}

/**
 * Check if a keyframe exists at a specific time
 * @param {Object} layer - Layer object
 * @param {number} time - Time to check
 * @returns {boolean}
 */
export function hasKeyframeAt(layer, time) {
  return layer.keyframes && layer.keyframes[time] !== undefined;
}

/**
 * Get default easing for new keyframes
 * @returns {string}
 */
export function getDefaultEasing() {
  return EASING_TYPES.EASE_OUT;
}
