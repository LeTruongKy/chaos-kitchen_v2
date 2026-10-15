export interface CarryConfig {
  forward: number;
  height: number;
  side: number;
  scale: number;
  rotationY: number;
}

const DEFAULT_CONFIG: CarryConfig = { forward: 0.48, height: 0.28, side: 0, scale: 1.0, rotationY: 0 };

export const CARRY_CONFIGS: Record<string, CarryConfig> = {
  // Nguyên liệu (đặt ở cao độ ~0.28 tile = 18 units ngang tầm bụng/hai bàn tay của Chibi Chef, không che mặt/mũ)
  ingredient_tomato: { forward: 0.48, height: 0.28, side: 0, scale: 1.0, rotationY: 0 },
  ingredient_lettuce: { forward: 0.48, height: 0.28, side: 0, scale: 1.0, rotationY: 0 },
  ingredient_bun: { forward: 0.48, height: 0.28, side: 0, scale: 1.0, rotationY: 0 },
  ingredient_meat: { forward: 0.48, height: 0.28, side: 0, scale: 1.0, rotationY: 0 },
  ingredient_onion: { forward: 0.48, height: 0.28, side: 0, scale: 1.0, rotationY: 0 },
  ingredient_mushroom: { forward: 0.48, height: 0.28, side: 0, scale: 1.0, rotationY: 0 },
  ingredient_cheese: { forward: 0.48, height: 0.28, side: 0, scale: 1.0, rotationY: 0 },
  ingredient_dough: { forward: 0.48, height: 0.28, side: 0, scale: 1.0, rotationY: 0 },
  ingredient_pizza: { forward: 0.50, height: 0.28, side: 0, scale: 1.0, rotationY: 0 },
  ingredient_salad: { forward: 0.48, height: 0.28, side: 0, scale: 1.0, rotationY: 0 },
  ingredient_burger: { forward: 0.48, height: 0.28, side: 0, scale: 1.0, rotationY: 0 },
  
  // Dụng cụ
  plate: { forward: 0.50, height: 0.28, side: 0, scale: 1.0, rotationY: 0 },
  pan: { forward: 0.50, height: 0.28, side: 0, scale: 1.0, rotationY: Math.PI / 2 },
  pot: { forward: 0.50, height: 0.26, side: 0, scale: 1.0, rotationY: 0 },
  extinguisher: { forward: 0.46, height: 0.26, side: 0.12, scale: 1.0, rotationY: 0 },

  // Default fallback
  default: DEFAULT_CONFIG
};

export function getCarryConfig(itemKey: string): CarryConfig {
  const k = itemKey.toLowerCase();
  if (k.includes('plate')) return CARRY_CONFIGS.plate ?? DEFAULT_CONFIG;
  if (k.includes('pan')) return CARRY_CONFIGS.pan ?? DEFAULT_CONFIG;
  if (k.includes('pot')) return CARRY_CONFIGS.pot ?? DEFAULT_CONFIG;
  if (k.includes('extinguisher')) return CARRY_CONFIGS.extinguisher ?? DEFAULT_CONFIG;
  if (k.includes('tomato')) return CARRY_CONFIGS.ingredient_tomato ?? DEFAULT_CONFIG;
  if (k.includes('lettuce')) return CARRY_CONFIGS.ingredient_lettuce ?? DEFAULT_CONFIG;
  if (k.includes('bun')) return CARRY_CONFIGS.ingredient_bun ?? DEFAULT_CONFIG;
  if (k.includes('meat') || k.includes('steak')) return CARRY_CONFIGS.ingredient_meat ?? DEFAULT_CONFIG;
  if (k.includes('onion')) return CARRY_CONFIGS.ingredient_onion ?? DEFAULT_CONFIG;
  if (k.includes('mushroom')) return CARRY_CONFIGS.ingredient_mushroom ?? DEFAULT_CONFIG;
  if (k.includes('cheese')) return CARRY_CONFIGS.ingredient_cheese ?? DEFAULT_CONFIG;
  if (k.includes('dough') || k.includes('bread')) return CARRY_CONFIGS.ingredient_dough ?? DEFAULT_CONFIG;
  if (k.includes('pizza')) return CARRY_CONFIGS.ingredient_pizza ?? DEFAULT_CONFIG;
  if (k.includes('salad')) return CARRY_CONFIGS.ingredient_salad ?? DEFAULT_CONFIG;
  if (k.includes('burger')) return CARRY_CONFIGS.ingredient_burger ?? DEFAULT_CONFIG;
  
  return CARRY_CONFIGS.default ?? DEFAULT_CONFIG;
}
