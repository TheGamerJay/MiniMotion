/**
 * Export utilities for rendering animation frames
 */

import { getInterpolatedProperties } from './animation';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * Load an image from a data URL
 */
function loadImage(dataURL) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataURL;
  });
}

/**
 * Render a single frame to canvas using the animation engine
 */
async function renderFrame(layers, canvasSize, time) {
  const canvas = document.createElement('canvas');
  canvas.width = canvasSize.width;
  canvas.height = canvasSize.height;
  const ctx = canvas.getContext('2d');
  
  // Transparent background
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Render each visible layer
  for (const layer of layers) {
    if (!layer.visible || !layer.imageData) continue;
    
    try {
      const img = await loadImage(layer.imageData);
      
      // Get interpolated values using the animation engine (with easing)
      const { x, y, rotation, scaleX, scaleY, opacity } = getInterpolatedProperties(layer, time);
      
      ctx.save();
      
      // Move to position
      ctx.translate(x, y);
      
      // Apply rotation (in radians)
      ctx.rotate((rotation * Math.PI) / 180);
      
      // Apply scale
      ctx.scale(scaleX, scaleY);
      
      // Apply opacity
      ctx.globalAlpha = opacity;
      
      // Draw image centered with pivot offset
      const offsetX = layer.width / 2 + (layer.pivotX || 0);
      const offsetY = layer.height / 2 + (layer.pivotY || 0);
      ctx.drawImage(img, -offsetX, -offsetY, layer.width, layer.height);
      
      ctx.restore();
    } catch (error) {
      console.error('Error rendering layer:', layer.name, error);
    }
  }
  
  return canvas.toDataURL('image/png');
}

/**
 * Render all animation frames
 */
export async function renderAnimationFrames(layers, canvasSize, duration, fps, onProgress) {
  const frames = [];
  const totalFrames = Math.ceil(duration * fps);
  
  for (let i = 0; i < totalFrames; i++) {
    const time = (i / fps);
    const frameDataURL = await renderFrame(layers, canvasSize, time);
    frames.push(frameDataURL);
    
    if (onProgress) {
      onProgress((i + 1) / totalFrames);
    }
  }
  
  return frames;
}

/**
 * Export animation to GIF or WebM via backend
 */
export async function exportAnimation(frames, fps, canvasSize, format = 'gif') {
  const response = await fetch(`${BACKEND_URL}/api/export`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      frames,
      fps,
      width: canvasSize.width,
      height: canvasSize.height,
      format,
      loop: true,
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Export failed');
  }
  
  return response.blob();
}

/**
 * Download a blob as a file
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
