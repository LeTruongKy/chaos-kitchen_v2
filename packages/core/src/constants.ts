import { IngredientId, RecipeId } from './types';

export const PROTOCOL_VERSION = 2;
export const SIM_HZ = 30;
export const SNAPSHOT_EVERY_N_TICKS = 2;
export const TILE_PX = 64;

export const PLAYER_MAX_SPEED = 2.6;
export const PLAYER_ACCEL = 33.0625;
export const PLAYER_FRICTION = 29.095;
export const ICE_ACCEL = 7;
export const ICE_FRICTION = 2.5;
export const DASH_SPEED = 13;
export const DASH_DURATION = 0.2;
export const DASH_COOLDOWN = 0.9;

export const SPRINT_MULTIPLIER = 1.25;
export const SPRINT_MAX = 2.0;
export const SPRINT_DRAIN_RATE = 1.0;
export const SPRINT_REGEN_RATE = 1.0;
export const SPRINT_REGEN_DELAY = 0.5;
export const SPRINT_RESTART_THRESHOLD = 0.2;
export const PLAYER_COLLIDE = true;
export const THROW_SPEED = 9;
export const THROW_MAX_RANGE = 4.5;
export const THROW_COOLDOWN = 0.3;
export const CATCH_RADIUS = 0.6;
export const POT_COOK_TIME = 15;
export const POT_BURN_TIME = 10;
export const POT_MAX = 3;
export const FIRE_IGNITE_AFTER_BURNT = 4;
export const FIRE_SPREAD_INTERVAL = 3;
export const FIRE_SPREAD_CHANCE = 0.6;
export const EXTINGUISH_TIME = 1.2;
export const EXTINGUISH_RANGE = 2.2;
export const TIP_STREAK_MAX = 4;
export const CONVEYOR_SPEED = 0.6;

export const PLAYER_RADIUS = 0.35;
export const INTERACT_REACH = 0.75;
export const MAX_PLAYERS = 4;
export const CHOP_TIME = 3.0;
export const WASH_TIME = 3.0;
export const COOK_TIME = 8.0;
export const BURN_TIME = 6.0;
export const OVEN_COOK_TIME = 12.0;
export const OVEN_BURN_TIME = 6.0;
export const DIRTY_PLATE_RETURN_DELAY = 5.0;
export const COUNTDOWN_SECONDS = 3;
export const RESULTS_SECONDS = 5;
export const ORDER_FIRST_AT = 2.0;
export const ORDER_INTERVAL_MIN = 20;
export const ORDER_INTERVAL_MAX = 26;
export const ORDER_MAX_ACTIVE = 3;
export const ORDER_PATIENCE = 70;
export const ORDER_PATIENCE_BY_RECIPE: Record<RecipeId, number> = {
  salad: 60,
  cheese_salad: 70,
  burger: 75,
  burger_tomato: 85,
  cheese_burger: 85,
  steak_dinner: 80,
  mushroom_steak: 80,
  tomato_soup: 90,
  onion_soup: 90,
  mushroom_soup: 90,
  pizza: 90
};
export const ORDER_EXPIRE_PENALTY = 10;
export const CUSTOMER_ORDER_WAIT = 30;
export const CUSTOMER_LEAVE_DURATION = 0.6;
export const TIP_MAX = 10;
export const LEVEL_DURATION_DEFAULT = 180;
export const INPUT_QUEUE_MAX = 6;
export const INTERP_DELAY_MS = 100;

export const PLAYER_COLORS = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf1c40f];
export const RECIPE_SCORE: Record<RecipeId, number> = {
  salad: 20,
  cheese_salad: 30,
  burger: 35,
  burger_tomato: 45,
  cheese_burger: 45,
  steak_dinner: 40,
  mushroom_steak: 45,
  tomato_soup: 40,
  onion_soup: 40,
  mushroom_soup: 40,
  pizza: 55
};
export const CHOPPABLE: IngredientId[] = ['lettuce', 'tomato', 'onion', 'mushroom', 'dough', 'cheese'];
export const PLATE_ORDER: IngredientId[] = ['bun', 'meat', 'lettuce', 'tomato', 'mushroom', 'soup_tomato', 'soup_onion', 'soup_mushroom', 'dough', 'cheese', 'pizza'];
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
