export type Grid = { cells: number; filled: number };

// The canvas is opaque and its sky varies only by row and time, so a row's darkest channel values
// are sky, and a pixel is lit when any channel rises more than `threshold` above them.
export const sampleLitGrid = ({ fraction, columns, rows, threshold }: { fraction: number; columns: number; rows: number; threshold: number }) =>
  new Promise<Grid>((resolve) => {
    requestAnimationFrame(() => {
      const canvas = document.querySelector('body > canvas') as HTMLCanvasElement;
      const copy = document.createElement('canvas');
      copy.width = canvas.width;
      copy.height = canvas.height;
      const ctx = copy.getContext('2d')!;
      ctx.drawImage(canvas, 0, 0);
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const hit = new Uint8Array(columns * rows);
      for (let y = 0; y < canvas.height; y += 1) {
        const row = Math.floor((y / canvas.height) * rows) * columns;
        const base = y * canvas.width * 4;
        const min = [255, 255, 255];
        for (let x = 0; x < canvas.width; x += 1) for (let k = 0; k < 3; k += 1) min[k] = Math.min(min[k]!, data[base + x * 4 + k]!);
        for (let x = 0; x < canvas.width; x += 1) {
          const i = base + x * 4;
          if (Math.max(data[i]! - min[0]!, data[i + 1]! - min[1]!, data[i + 2]! - min[2]!) > threshold) hit[row + Math.floor((x / canvas.width) * columns)] = 1;
        }
      }
      let cells = 0;
      let filled = 0;
      for (let r = 0; r < rows; r += 1) {
        if ((r + 0.5) / rows <= fraction) continue;
        for (let c = 0; c < columns; c += 1) { cells += 1; filled += hit[r * columns + c]!; }
      }
      resolve({ cells, filled });
    });
  });

export const countLitPixels = ({ fromFraction, threshold }: { fromFraction: number; threshold: number }) =>
  new Promise<number>((resolve) => {
    requestAnimationFrame(() => {
      const canvas = document.querySelector('body > canvas') as HTMLCanvasElement;
      const copy = document.createElement('canvas');
      copy.width = canvas.width;
      copy.height = canvas.height;
      const ctx = copy.getContext('2d')!;
      ctx.drawImage(canvas, 0, 0);
      const top = Math.floor(canvas.height * fromFraction);
      const { data } = ctx.getImageData(0, top, canvas.width, canvas.height - top);
      let count = 0;
      for (let y = 0; y < canvas.height - top; y += 1) {
        const base = y * canvas.width * 4;
        const min = [255, 255, 255];
        for (let x = 0; x < canvas.width; x += 1) for (let k = 0; k < 3; k += 1) min[k] = Math.min(min[k]!, data[base + x * 4 + k]!);
        for (let x = 0; x < canvas.width; x += 1) {
          const i = base + x * 4;
          if (Math.max(data[i]! - min[0]!, data[i + 1]! - min[1]!, data[i + 2]! - min[2]!) > threshold) count += 1;
        }
      }
      resolve(count);
    });
  });
