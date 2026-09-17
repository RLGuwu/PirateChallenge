import type { Vector2 } from './types';

/**
 * Rotation convention used throughout the simulation: rotation = 0 means the
 * ship faces "up" (screen -Y), and increasing rotation turns clockwise.
 * The ship artwork points "down" by default, so renderers must add Math.PI
 * to `rotation` before assigning it to a sprite.
 */
export function forwardVector(rotation: number): Vector2 {
  return { x: Math.sin(rotation), y: -Math.cos(rotation) };
}

export function rightVector(rotation: number): Vector2 {
  return { x: Math.cos(rotation), y: Math.sin(rotation) };
}

export function leftVector(rotation: number): Vector2 {
  return { x: -Math.cos(rotation), y: -Math.sin(rotation) };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function distance(a: Vector2, b: Vector2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function circlesOverlap(a: Vector2, radiusA: number, b: Vector2, radiusB: number): boolean {
  return distance(a, b) < radiusA + radiusB;
}

function normalizeAngle(angle: number): number {
  let result = angle % (Math.PI * 2);
  if (result > Math.PI) result -= Math.PI * 2;
  if (result < -Math.PI) result += Math.PI * 2;
  return result;
}

export function angleTo(from: Vector2, to: Vector2): number {
  return Math.atan2(to.x - from.x, -(to.y - from.y));
}

/** Rotates `current` towards `target` by at most `maxDelta` radians, taking the shortest path. */
export function turnTowards(current: number, target: number, maxDelta: number): number {
  const diff = normalizeAngle(target - current);
  if (Math.abs(diff) <= maxDelta) return normalizeAngle(target);
  return normalizeAngle(current + Math.sign(diff) * maxDelta);
}
