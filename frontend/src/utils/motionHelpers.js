/**
 * Motion Behavior Helpers
 * Functions to add natural motion effects like anticipation, follow-through, and impact
 */

import { EASING_TYPES } from './animation';

/**
 * Calculate anticipation keyframes
 * Adds a slight movement in the opposite direction before the main motion
 * 
 * @param {Object} startProps - Starting properties {x, y, rotation, scaleX, scaleY, opacity}
 * @param {Object} endProps - Target properties
 * @param {number} anticipationAmount - How much to move opposite (0-1, default 0.15)
 * @returns {Object} - Anticipation keyframe properties
 */
export function calculateAnticipation(startProps, endProps, anticipationAmount = 0.15) {
  const anticipation = {};
  
  // Position anticipation (move slightly opposite)
  if (startProps.x !== undefined && endProps.x !== undefined) {
    const dx = endProps.x - startProps.x;
    anticipation.x = startProps.x - (dx * anticipationAmount);
  }
  
  if (startProps.y !== undefined && endProps.y !== undefined) {
    const dy = endProps.y - startProps.y;
    anticipation.y = startProps.y - (dy * anticipationAmount);
  }
  
  // Rotation anticipation
  if (startProps.rotation !== undefined && endProps.rotation !== undefined) {
    const dr = endProps.rotation - startProps.rotation;
    anticipation.rotation = startProps.rotation - (dr * anticipationAmount);
  }
  
  // Scale anticipation (slight squash before stretch)
  if (startProps.scaleX !== undefined && endProps.scaleX !== undefined) {
    const dsx = endProps.scaleX - startProps.scaleX;
    anticipation.scaleX = startProps.scaleX - (dsx * anticipationAmount * 0.5);
  }
  
  if (startProps.scaleY !== undefined && endProps.scaleY !== undefined) {
    const dsy = endProps.scaleY - startProps.scaleY;
    anticipation.scaleY = startProps.scaleY - (dsy * anticipationAmount * 0.5);
  }
  
  // Keep opacity unchanged during anticipation
  if (startProps.opacity !== undefined) {
    anticipation.opacity = startProps.opacity;
  }
  
  anticipation.easing = EASING_TYPES.EASE_OUT;
  
  return anticipation;
}

/**
 * Calculate follow-through keyframes
 * Object overshoots target then settles back
 * 
 * @param {Object} endProps - Target properties
 * @param {Object} startProps - Starting properties (for calculating overshoot direction)
 * @param {number} overshootAmount - How much to overshoot (0-1, default 0.12)
 * @returns {Object} - { overshoot: props, settle: props }
 */
export function calculateFollowThrough(endProps, startProps, overshootAmount = 0.12) {
  const overshoot = {};
  const settle = { ...endProps };
  
  // Position overshoot
  if (startProps.x !== undefined && endProps.x !== undefined) {
    const dx = endProps.x - startProps.x;
    overshoot.x = endProps.x + (dx * overshootAmount);
  }
  
  if (startProps.y !== undefined && endProps.y !== undefined) {
    const dy = endProps.y - startProps.y;
    overshoot.y = endProps.y + (dy * overshootAmount);
  }
  
  // Rotation overshoot
  if (startProps.rotation !== undefined && endProps.rotation !== undefined) {
    const dr = endProps.rotation - startProps.rotation;
    overshoot.rotation = endProps.rotation + (dr * overshootAmount);
  }
  
  // Scale overshoot (slight stretch)
  if (endProps.scaleX !== undefined) {
    overshoot.scaleX = endProps.scaleX * (1 + overshootAmount * 0.3);
  }
  
  if (endProps.scaleY !== undefined) {
    overshoot.scaleY = endProps.scaleY * (1 + overshootAmount * 0.3);
  }
  
  // Opacity
  if (endProps.opacity !== undefined) {
    overshoot.opacity = endProps.opacity;
  }
  
  overshoot.easing = EASING_TYPES.EASE_OUT;
  settle.easing = EASING_TYPES.EASE_IN_OUT;
  
  return { overshoot, settle };
}

/**
 * Calculate pop effect keyframes
 * Quick scale up then back to normal
 * 
 * @param {Object} baseProps - Base properties
 * @param {number} popAmount - Scale multiplier (default 1.2 = 20% larger)
 * @returns {Object} - { peak: props, settle: props }
 */
export function calculatePopEffect(baseProps, popAmount = 1.2) {
  const peak = {
    ...baseProps,
    scaleX: (baseProps.scaleX || 1) * popAmount,
    scaleY: (baseProps.scaleY || 1) * popAmount,
    easing: EASING_TYPES.EASE_OUT,
  };
  
  const settle = {
    ...baseProps,
    easing: EASING_TYPES.EASE_IN_OUT,
  };
  
  return { peak, settle };
}

/**
 * Calculate squash and stretch keyframes
 * Squash before action, stretch during, settle after
 * 
 * @param {Object} baseProps - Base properties
 * @param {string} direction - 'horizontal' or 'vertical'
 * @param {number} amount - Squash/stretch amount (default 0.2)
 * @returns {Object} - { squash: props, stretch: props, settle: props }
 */
export function calculateSquashStretch(baseProps, direction = 'vertical', amount = 0.2) {
  const isVertical = direction === 'vertical';
  
  const squash = {
    ...baseProps,
    scaleX: isVertical ? (baseProps.scaleX || 1) * (1 + amount) : (baseProps.scaleX || 1) * (1 - amount),
    scaleY: isVertical ? (baseProps.scaleY || 1) * (1 - amount) : (baseProps.scaleY || 1) * (1 + amount),
    easing: EASING_TYPES.EASE_OUT,
  };
  
  const stretch = {
    ...baseProps,
    scaleX: isVertical ? (baseProps.scaleX || 1) * (1 - amount * 0.5) : (baseProps.scaleX || 1) * (1 + amount * 0.5),
    scaleY: isVertical ? (baseProps.scaleY || 1) * (1 + amount * 0.5) : (baseProps.scaleY || 1) * (1 - amount * 0.5),
    easing: EASING_TYPES.EASE_IN,
  };
  
  const settle = {
    ...baseProps,
    easing: EASING_TYPES.EASE_IN_OUT,
  };
  
  return { squash, stretch, settle };
}

/**
 * Calculate fade in keyframes
 * @param {Object} baseProps - Base properties
 * @returns {Object} - { start: props, end: props }
 */
export function calculateFadeIn(baseProps) {
  return {
    start: {
      ...baseProps,
      opacity: 0,
      easing: EASING_TYPES.LINEAR,
    },
    end: {
      ...baseProps,
      opacity: baseProps.opacity || 1,
      easing: EASING_TYPES.EASE_OUT,
    },
  };
}

/**
 * Calculate fade out keyframes
 * @param {Object} baseProps - Base properties
 * @returns {Object} - { start: props, end: props }
 */
export function calculateFadeOut(baseProps) {
  return {
    start: {
      ...baseProps,
      opacity: baseProps.opacity || 1,
      easing: EASING_TYPES.LINEAR,
    },
    end: {
      ...baseProps,
      opacity: 0,
      easing: EASING_TYPES.EASE_IN,
    },
  };
}

/**
 * Calculate bounce landing effect
 * Object lands with decreasing bounces
 * 
 * @param {Object} finalProps - Final resting properties
 * @param {number} bounceHeight - Initial bounce height (pixels)
 * @param {number} bounces - Number of bounces (default 2)
 * @returns {Array} - Array of keyframe properties for each bounce
 */
export function calculateBounceLanding(finalProps, bounceHeight = 20, bounces = 2) {
  const frames = [];
  
  for (let i = 0; i < bounces; i++) {
    const heightFactor = Math.pow(0.4, i); // Each bounce is 40% of previous
    const currentBounce = bounceHeight * heightFactor;
    
    // Up position
    frames.push({
      ...finalProps,
      y: (finalProps.y || 0) - currentBounce,
      scaleY: (finalProps.scaleY || 1) * 1.05,
      easing: EASING_TYPES.EASE_OUT,
    });
    
    // Down position (back to final)
    frames.push({
      ...finalProps,
      scaleY: (finalProps.scaleY || 1) * 0.95,
      easing: EASING_TYPES.EASE_IN,
    });
  }
  
  // Final settle
  frames.push({
    ...finalProps,
    easing: EASING_TYPES.EASE_IN_OUT,
  });
  
  return frames;
}

/**
 * Calculate shake effect keyframes
 * Quick back-and-forth motion for impact
 * 
 * @param {Object} baseProps - Base properties
 * @param {number} intensity - Shake intensity in pixels (default 5)
 * @param {number} shakes - Number of shakes (default 3)
 * @returns {Array} - Array of keyframe properties
 */
export function calculateShake(baseProps, intensity = 5, shakes = 3) {
  const frames = [];
  
  for (let i = 0; i < shakes; i++) {
    const factor = 1 - (i / shakes); // Decreasing intensity
    
    // Right
    frames.push({
      ...baseProps,
      x: (baseProps.x || 0) + (intensity * factor),
      easing: EASING_TYPES.EASE_OUT,
    });
    
    // Left
    frames.push({
      ...baseProps,
      x: (baseProps.x || 0) - (intensity * factor),
      easing: EASING_TYPES.EASE_OUT,
    });
  }
  
  // Return to center
  frames.push({
    ...baseProps,
    easing: EASING_TYPES.EASE_IN_OUT,
  });
  
  return frames;
}

/**
 * Get current layer properties for motion helpers
 * @param {Object} layer - Layer object
 * @returns {Object} - Current properties
 */
export function getLayerProps(layer) {
  return {
    x: layer.x,
    y: layer.y,
    rotation: layer.rotation,
    scaleX: layer.scaleX,
    scaleY: layer.scaleY,
    opacity: layer.opacity,
  };
}

/**
 * Generate keyframes with timing for a motion effect
 * @param {number} startTime - Start time in seconds
 * @param {Array} frames - Array of frame properties
 * @param {number} frameDuration - Duration per frame transition (default 0.1s)
 * @returns {Object} - Keyframes object { time: properties }
 */
export function generateTimedKeyframes(startTime, frames, frameDuration = 0.1) {
  const keyframes = {};
  
  frames.forEach((frame, index) => {
    const time = Math.round((startTime + (index * frameDuration)) * 100) / 100;
    keyframes[time] = frame;
  });
  
  return keyframes;
}

/**
 * Motion helper presets for quick application
 */
export const MOTION_PRESETS = {
  ANTICIPATION: {
    name: 'Anticipation',
    description: 'Slight opposite movement before action',
    timingOffset: -0.08, // seconds before main keyframe
  },
  FOLLOW_THROUGH: {
    name: 'Follow-Through',
    description: 'Overshoot and settle after action',
    overshootDuration: 0.08,
    settleDuration: 0.1,
  },
  POP: {
    name: 'Pop',
    description: 'Quick scale emphasis',
    peakDuration: 0.06,
    settleDuration: 0.1,
  },
  FADE_IN: {
    name: 'Fade In',
    description: 'Gradual opacity increase',
    duration: 0.3,
  },
  FADE_OUT: {
    name: 'Fade Out',
    description: 'Gradual opacity decrease',
    duration: 0.3,
  },
  BOUNCE: {
    name: 'Bounce',
    description: 'Landing with bounces',
    bounceDuration: 0.08,
  },
  SHAKE: {
    name: 'Shake',
    description: 'Impact shake effect',
    shakeDuration: 0.04,
  },
};
