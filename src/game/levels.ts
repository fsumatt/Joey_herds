export type Point = { x: number; y: number };
export type ObstacleConfig = Point & { radius: number };
export type CorralConfig = { x: number; y: number; width: number; height: number };
export type LevelConfig = {
  id: number; name: string; seconds: number; joeyStart: Point; corral: CorralConfig; sheep: Point[]; obstacles: ObstacleConfig[];
};

const sheepLine = (count: number, start: Point, gap = 46) => Array.from({ length: count }, (_, i) => ({ x: start.x + (i % 5) * gap, y: start.y + Math.floor(i / 5) * gap }));

export const levels: LevelConfig[] = [
  { id: 1, name: 'Sunny Start', seconds: 75, joeyStart: { x: 210, y: 360 }, corral: { x: 940, y: 250, width: 220, height: 180 }, sheep: sheepLine(5, { x: 480, y: 310 }), obstacles: [{ x: 620, y: 450, radius: 40 }] },
  { id: 2, name: 'Rocky Meadow', seconds: 85, joeyStart: { x: 180, y: 540 }, corral: { x: 910, y: 90, width: 240, height: 190 }, sheep: sheepLine(7, { x: 430, y: 420 }), obstacles: [{ x: 650, y: 280, radius: 42 }, { x: 720, y: 520, radius: 36 }] },
  { id: 3, name: 'Clover Bend', seconds: 95, joeyStart: { x: 180, y: 180 }, corral: { x: 900, y: 410, width: 245, height: 190 }, sheep: sheepLine(10, { x: 390, y: 250 }), obstacles: [{ x: 600, y: 190, radius: 38 }, { x: 650, y: 390, radius: 48 }, { x: 790, y: 300, radius: 35 }] },
  { id: 4, name: 'Fence Maze', seconds: 105, joeyStart: { x: 155, y: 580 }, corral: { x: 955, y: 260, width: 220, height: 205 }, sheep: sheepLine(13, { x: 330, y: 180 }), obstacles: [{ x: 520, y: 320, radius: 48 }, { x: 690, y: 210, radius: 38 }, { x: 760, y: 485, radius: 46 }, { x: 890, y: 170, radius: 34 }] },
  { id: 5, name: 'Joey’s Big Day', seconds: 120, joeyStart: { x: 155, y: 120 }, corral: { x: 925, y: 455, width: 250, height: 190 }, sheep: sheepLine(16, { x: 350, y: 285 }), obstacles: [{ x: 470, y: 165, radius: 40 }, { x: 610, y: 360, radius: 54 }, { x: 780, y: 210, radius: 42 }, { x: 830, y: 520, radius: 42 }, { x: 1020, y: 290, radius: 36 }] },
];

export const getLevel = (id: number) => levels.find((level) => level.id === id) ?? levels[0];
