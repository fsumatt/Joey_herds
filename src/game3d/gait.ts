/** Stance/swing foot trajectories informed by Autodesk's quadruped walk tutorials.
 * Phase is advanced from distance traveled so planted feet track ground speed. */
export function footPose(phase: number, running: number, stride: number, lift: number) {
  const p = ((phase % 1) + 1) % 1;
  const stance = .64 - .12 * running;
  if (p < stance) return { forward: stride * (.5 - p / stance), up: 0 };
  const t = (p - stance) / (1 - stance);
  const ease = t * t * (3 - 2 * t);
  return { forward: stride * (ease - .5), up: Math.sin(Math.PI * t) ** 2 * lift };
}
export function kneePosition(forward: number, down: number, upper: number, lower: number, bend: number) {
  const distance = Math.max(.001, Math.min(Math.hypot(forward, down), upper + lower - .001));
  const along = (upper * upper - lower * lower + distance * distance) / (2 * distance);
  const across = Math.sqrt(Math.max(0, upper * upper - along * along));
  const len = Math.max(.001, Math.hypot(forward, down));
  return { forward: forward / len * along + down / len * across * bend, down: down / len * along - forward / len * across * bend };
}
