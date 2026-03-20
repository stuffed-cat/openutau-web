export function sinEasingInOut(x0: number, x1: number, y0: number, y1: number, x: number): number {
  if (x1 - x0 < 1e-6) return y1;
  return y0 + (y1 - y0) * (1 - Math.cos((x - x0) / (x1 - x0) * Math.PI)) / 2;
}

export function sinEasingIn(x0: number, x1: number, y0: number, y1: number, x: number): number {
  if (x1 - x0 < 1e-6) return y1;
  return y0 + (y1 - y0) * (1 - Math.cos((x - x0) / (x1 - x0) * Math.PI / 2));
}

export function sinEasingOut(x0: number, x1: number, y0: number, y1: number, x: number): number {
  if (x1 - x0 < 1e-6) return y1;
  return y0 + (y1 - y0) * Math.sin((x - x0) / (x1 - x0) * Math.PI / 2);
}

export function linear(x0: number, x1: number, y0: number, y1: number, x: number): number {
  if (x1 - x0 < 1e-6) return y1;
  return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
}

export function interpolateShape(x0: number, x1: number, y0: number, y1: number, x: number, shape: string): number {
  switch (shape) {
    case 'io': return sinEasingInOut(x0, x1, y0, y1, x);
    case 'sp': return sinEasingInOut(x0, x1, y0, y1, x); // Fallback for sp
    case 'i': return sinEasingIn(x0, x1, y0, y1, x);
    case 'o': return sinEasingOut(x0, x1, y0, y1, x);
    case 'l': return linear(x0, x1, y0, y1, x);
    default: return linear(x0, x1, y0, y1, x);
  }
}
