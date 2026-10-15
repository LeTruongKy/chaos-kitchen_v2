import { GameState, PlayerState, StationState, GameEvent, ToolItem, IngredientItem, PlateItem } from '../types';
import { POT_MAX, POT_COOK_TIME } from '../constants';
import { canAddToPlate, addToPlate } from '../recipes';

export function interactWithTool(
  tool: ToolItem,
  otherItem: IngredientItem | PlateItem,
  isToolOnStation: boolean
): boolean {
  if (otherItem.type === 'ingredient') {
    // Thêm nguyên liệu vào chảo/nồi
    if (tool.tool === 'pan') {
      if (tool.contents.length === 0 && otherItem.id === 'meat' && otherItem.state === 'raw') {
        tool.contents.push(otherItem);
        tool.progress = 0;
        return true;
      }
    } else if (tool.tool === 'pot') {
      if ((otherItem.id === 'tomato' || otherItem.id === 'onion' || otherItem.id === 'mushroom') && otherItem.state === 'chopped') {
        if (tool.contents.length < POT_MAX) {
          if (tool.contents.length === 0 || tool.contents[0]?.id === otherItem.id) {
            tool.contents.push(otherItem);
            return true;
          }
        }
      }
    }
  } else if (otherItem.type === 'plate' && !otherItem.dirty) {
    // Đổ từ tool ra đĩa
    if (tool.tool === 'pan') {
      if (tool.contents.length === 1 && tool.contents[0]?.state === 'cooked') {
        if (canAddToPlate(otherItem, tool.contents[0]!)) {
          addToPlate(otherItem, tool.contents[0]!);
          tool.contents = [];
          tool.progress = 0;
          return true;
        }
      }
    } else if (tool.tool === 'pot') {
      if (tool.contents.length === POT_MAX && tool.progress >= POT_COOK_TIME) {
        // Nồi đã chín, và chưa cháy (nếu cháy state sẽ là burnt)
        if (tool.contents.every(c => c.state !== 'burnt')) {
          const soupId = `soup_${tool.contents[0]!.id}` as any;
          const soupItem: IngredientItem = { type: 'ingredient', id: soupId, state: 'cooked' };
          if (canAddToPlate(otherItem, soupItem)) {
            addToPlate(otherItem, soupItem);
            tool.contents = [];
            tool.progress = 0;
            return true;
          }
        }
      }
    }
  }
  return false;
}
