declare module "recharts" {
  export const ResponsiveContainer: any;
  export const LineChart: any;
  export const Line: any;
  export const XAxis: any;
  export const YAxis: any;
  export const Tooltip: any;
  export const PieChart: any;
  export const Pie: any;
  export const Cell: any;
  export const BarChart: any;
  export const Bar: any;
}

declare module "lenis" {
  export default class Lenis {
    constructor(options?: any);
    raf(time: number): void;
    destroy(): void;
  }
}

declare module "qrcode" {
  export function toString(text: string, options?: any): Promise<string>;
}

declare module "three" {
  export interface Group {
    rotation: {
      y: number;
    };
  }
}

declare module "@react-three/fiber" {
  export const Canvas: any;
  export function useFrame(callback: (state: any, delta: number) => void): void;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}
