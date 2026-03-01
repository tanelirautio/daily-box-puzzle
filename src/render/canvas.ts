import type { GameState } from '../core/parse.js';
import { fromKey, toKey, type Tile } from '../core/parse.js';

export type SpriteMotion = {
  from: Tile;
  to: Tile;
};

export type RenderMotion = {
  progress: number;
  player: SpriteMotion;
  crates: SpriteMotion[];
};

type RenderLevel = (level: GameState, motion?: RenderMotion) => void;

function lerp(from: number, to: number, progress: number): number {
  return from + (to - from) * progress;
}

function toPixels(tile: Tile, tileSize: number, motion?: SpriteMotion, progress = 1) {
  const source = motion ? motion.from : tile;
  const target = motion ? motion.to : tile;

  return {
    x: lerp(source.x, target.x, progress) * tileSize,
    y: lerp(source.y, target.y, progress) * tileSize,
  };
}

function drawGoal(
  context: CanvasRenderingContext2D,
  tile: Tile,
  tileSize: number,
) {
  const px = tile.x * tileSize;
  const py = tile.y * tileSize;

  context.fillStyle = '#3c7d57';
  context.fillRect(px + 12, py + 12, tileSize - 24, tileSize - 24);
  context.strokeStyle = '#a9e4b9';
  context.lineWidth = 3;
  context.strokeRect(px + 16, py + 16, tileSize - 32, tileSize - 32);
}

function drawWall(
  context: CanvasRenderingContext2D,
  tile: Tile,
  tileSize: number,
) {
  const px = tile.x * tileSize;
  const py = tile.y * tileSize;

  context.fillStyle = '#51606b';
  context.fillRect(px, py, tileSize, tileSize);
  context.fillStyle = '#647481';
  context.fillRect(px + 4, py + 4, tileSize - 8, tileSize - 8);
  context.fillStyle = '#394752';
  context.fillRect(px + 8, py + 8, tileSize - 16, tileSize - 16);
}

function drawCrate(
  context: CanvasRenderingContext2D,
  tileSize: number,
  tile: Tile,
  motion?: SpriteMotion,
  progress = 1,
) {
  const { x, y } = toPixels(tile, tileSize, motion, progress);

  context.fillStyle = '#9d6024';
  context.fillRect(x + 6, y + 6, tileSize - 12, tileSize - 12);
  context.strokeStyle = '#f0c27a';
  context.lineWidth = 2;
  context.strokeRect(x + 10, y + 10, tileSize - 20, tileSize - 20);
  context.beginPath();
  context.moveTo(x + 16, y + 16);
  context.lineTo(x + tileSize - 16, y + tileSize - 16);
  context.moveTo(x + tileSize - 16, y + 16);
  context.lineTo(x + 16, y + tileSize - 16);
  context.stroke();
}

function drawPlayer(
  context: CanvasRenderingContext2D,
  tileSize: number,
  tile: Tile,
  motion?: SpriteMotion,
  progress = 1,
) {
  const { x, y } = toPixels(tile, tileSize, motion, progress);

  context.fillStyle = '#f7edd7';
  context.beginPath();
  context.arc(x + tileSize / 2, y + tileSize / 2, tileSize * 0.28, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = '#1a1d21';
  context.beginPath();
  context.arc(x + 24, y + 24, 3, 0, Math.PI * 2);
  context.arc(x + 40, y + 24, 3, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = '#1a1d21';
  context.lineWidth = 2;
  context.beginPath();
  context.arc(
    x + tileSize / 2,
    y + tileSize / 2 + 8,
    8,
    0.15 * Math.PI,
    0.85 * Math.PI,
  );
  context.stroke();
}

export function createRenderer(
  canvas: HTMLCanvasElement,
  tileSize: number,
): RenderLevel {
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('2D canvas context is not available.');
  }

  return (level, motion) => {
    canvas.width = level.width * tileSize;
    canvas.height = level.height * tileSize;

    context.clearRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = '#162028';
    context.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < level.height; y += 1) {
      for (let x = 0; x < level.width; x += 1) {
        const px = x * tileSize;
        const py = y * tileSize;

        context.fillStyle = (x + y) % 2 === 0 ? '#1c2730' : '#1a242d';
        context.fillRect(px, py, tileSize, tileSize);

        context.strokeStyle = 'rgba(255, 245, 220, 0.06)';
        context.strokeRect(px + 0.5, py + 0.5, tileSize - 1, tileSize - 1);
      }
    }

    for (const key of level.goals) {
      drawGoal(context, fromKey(key), tileSize);
    }

    for (const key of level.walls) {
      drawWall(context, fromKey(key), tileSize);
    }

    const animatedCrates = motion?.crates ?? [];
    const animatedDestinations = new Set(
      animatedCrates.map((crateMotion) => toKey(crateMotion.to)),
    );

    for (const key of level.crates) {
      if (animatedDestinations.has(key)) {
        continue;
      }

      drawCrate(context, tileSize, fromKey(key));
    }

    for (const crateMotion of animatedCrates) {
      drawCrate(context, tileSize, crateMotion.to, crateMotion, motion?.progress ?? 1);
    }

    drawPlayer(
      context,
      tileSize,
      level.player,
      motion?.player,
      motion?.progress ?? 1,
    );
  };
}
