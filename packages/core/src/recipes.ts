import { RecipeId, IngredientId, IngredientState, PlateItem, IngredientItem } from './types';
import { PLATE_ORDER, CHOPPABLE, RECIPE_SCORE } from './constants';

export const RECIPES: Record<RecipeId, { id: RecipeId; name: string; ingredients: {id: IngredientId; state: IngredientState}[]; score: number }> = {
  salad: {
    id: 'salad',
    name: 'Salad',
    ingredients: [
      { id: 'lettuce', state: 'chopped' },
      { id: 'tomato', state: 'chopped' }
    ],
    score: RECIPE_SCORE['salad']
  },
  cheese_salad: {
    id: 'cheese_salad',
    name: 'Cheese Salad',
    ingredients: [
      { id: 'lettuce', state: 'chopped' },
      { id: 'tomato', state: 'chopped' },
      { id: 'cheese', state: 'chopped' }
    ],
    score: RECIPE_SCORE['cheese_salad']
  },
  burger: {
    id: 'burger',
    name: 'Burger',
    ingredients: [
      { id: 'bun', state: 'raw' },
      { id: 'meat', state: 'cooked' },
      { id: 'lettuce', state: 'chopped' }
    ],
    score: RECIPE_SCORE['burger']
  },
  burger_tomato: {
    id: 'burger_tomato',
    name: 'Tomato Burger',
    ingredients: [
      { id: 'bun', state: 'raw' },
      { id: 'meat', state: 'cooked' },
      { id: 'lettuce', state: 'chopped' },
      { id: 'tomato', state: 'chopped' }
    ],
    score: RECIPE_SCORE['burger_tomato']
  },
  cheese_burger: {
    id: 'cheese_burger',
    name: 'Cheese Burger',
    ingredients: [
      { id: 'bun', state: 'raw' },
      { id: 'meat', state: 'cooked' },
      { id: 'cheese', state: 'chopped' }
    ],
    score: RECIPE_SCORE['cheese_burger']
  },
  steak_dinner: {
    id: 'steak_dinner',
    name: 'Steak Dinner',
    ingredients: [
      { id: 'meat', state: 'cooked' },
      { id: 'tomato', state: 'chopped' }
    ],
    score: RECIPE_SCORE['steak_dinner']
  },
  mushroom_steak: {
    id: 'mushroom_steak',
    name: 'Mushroom Steak',
    ingredients: [
      { id: 'meat', state: 'cooked' },
      { id: 'mushroom', state: 'chopped' }
    ],
    score: RECIPE_SCORE['mushroom_steak']
  },
  tomato_soup: {
    id: 'tomato_soup',
    name: 'Tomato Soup',
    ingredients: [{ id: 'soup_tomato', state: 'cooked' }],
    score: RECIPE_SCORE['tomato_soup']
  },
  onion_soup: {
    id: 'onion_soup',
    name: 'Onion Soup',
    ingredients: [{ id: 'soup_onion', state: 'cooked' }],
    score: RECIPE_SCORE['onion_soup']
  },
  mushroom_soup: {
    id: 'mushroom_soup',
    name: 'Mushroom Soup',
    ingredients: [{ id: 'soup_mushroom', state: 'cooked' }],
    score: RECIPE_SCORE['mushroom_soup']
  },
  pizza: {
    id: 'pizza',
    name: 'Pizza',
    ingredients: [{ id: 'pizza', state: 'cooked' }],
    score: RECIPE_SCORE['pizza']
  }
};

export function sortContents(contents: IngredientItem[]): void {
  contents.sort((a, b) => PLATE_ORDER.indexOf(a.id) - PLATE_ORDER.indexOf(b.id));
}

export function isValidOnPlate(ing: IngredientItem): boolean {
  if (ing.id === 'bun' && ing.state === 'raw') return true;
  if (ing.id === 'meat' && ing.state === 'cooked') return true;
  if (ing.id === 'lettuce' && ing.state === 'chopped') return true;
  if (ing.id === 'tomato' && ing.state === 'chopped') return true;
  if (ing.id === 'mushroom' && ing.state === 'chopped') return true;
  if (ing.id === 'cheese' && ing.state === 'chopped') return true;
  if (ing.id === 'soup_tomato' && ing.state === 'cooked') return true;
  if (ing.id === 'soup_onion' && ing.state === 'cooked') return true;
  if (ing.id === 'soup_mushroom' && ing.state === 'cooked') return true;
  if (ing.id === 'pizza' && ing.state === 'cooked') return true;
  return false;
}

export function canAddToPlate(plate: PlateItem, ing: IngredientItem): boolean {
  if (plate.dirty) return false;
  if (!isValidOnPlate(ing)) return false;
  if (plate.contents.some(item => item.id === ing.id)) return false;

  const newContents = [...plate.contents, ing];
  for (const recipe of Object.values(RECIPES)) {
    let isSubset = true;
    for (const item of newContents) {
      if (!recipe.ingredients.some(req => req.id === item.id && req.state === item.state)) {
        isSubset = false;
        break;
      }
    }
    if (isSubset) return true;
  }
  return false;
}

export function addToPlate(plate: PlateItem, ing: IngredientItem): void {
  if (!canAddToPlate(plate, ing)) throw new Error('Cannot add to plate');
  plate.contents.push(ing);
  sortContents(plate.contents);
}

export function matchRecipe(plate: PlateItem): RecipeId | null {
  if (plate.dirty) return null;
  for (const recipe of Object.values(RECIPES)) {
    if (recipe.ingredients.length !== plate.contents.length) continue;
    let match = true;
    for (const req of recipe.ingredients) {
      if (!plate.contents.some(item => item.id === req.id && item.state === req.state)) {
        match = false;
        break;
      }
    }
    if (match) return recipe.id;
  }
  return null;
}

export function canChop(ing: IngredientItem): boolean {
  return CHOPPABLE.includes(ing.id) && ing.state === 'raw';
}

export function makeIngredient(id: IngredientId): IngredientItem {
  return { type: 'ingredient', id, state: 'raw' };
}

export function makePlate(dirty = false): PlateItem {
  return { type: 'plate', dirty, contents: [] };
}
