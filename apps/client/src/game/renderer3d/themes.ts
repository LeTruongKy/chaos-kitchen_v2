export interface ThemePalette {
  name: 'diner' | 'ship' | 'space';
  background: number;
  fogColor: number;
  floorPrimary: number;
  floorSecondary: number;
  ambient: number;
}

export const THEMES: Record<string, ThemePalette> = {
  diner: {
    name: 'diner',
    background: 0x7ec8e3,
    fogColor: 0x7ec8e3,
    floorPrimary: 0xe0c389,
    floorSecondary: 0xcfa86b,
    ambient: 0xfff5e6
  },
  ship: {
    name: 'ship',
    background: 0x7ec8e3,
    fogColor: 0x7ec8e3,
    floorPrimary: 0xe0c389,
    floorSecondary: 0xcfa86b,
    ambient: 0xfff5e6
  },
  space: {
    name: 'space',
    background: 0x7ec8e3,
    fogColor: 0x7ec8e3,
    floorPrimary: 0xe0c389,
    floorSecondary: 0xcfa86b,
    ambient: 0xfff5e6
  }
};
