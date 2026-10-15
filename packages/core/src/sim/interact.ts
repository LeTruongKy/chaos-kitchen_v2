import { GameState, PlayerState, StationState, GameEvent } from '../types';
import { INTERACT_REACH, DIRTY_PLATE_RETURN_DELAY } from '../constants';
import { getStationAt } from './createState';
import { canAddToPlate, addToPlate, makePlate, makeIngredient, canChop } from '../recipes';
import { serveCustomerOrder } from './orders';
import { interactWithTool } from './tools';

export function getTargetTile(player: PlayerState): { tx: number, ty: number } {
  const targetX = player.x + player.fx * INTERACT_REACH;
  const targetY = player.y + player.fy * INTERACT_REACH;
  return { tx: Math.floor(targetX), ty: Math.floor(targetY) };
}

export function interact(state: GameState, playerId: string): GameEvent[] {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return [];

  const { tx, ty } = getTargetTile(player);

  if (tx < 0 || tx >= state.width || ty < 0 || ty >= state.height) return [];
  const station = getStationAt(state, tx, ty);
  if (!station) return [];
  if (station.onFire) return [];

  return interactStation(state, station, player);
}


function genEvent(type: 'pickup' | 'drop' | 'trash', station: StationState, playerId: string): GameEvent {
  return { type, x: station.x + 0.5, y: station.y + 0.5, playerId };
}

function interactStation(state: GameState, station: StationState, player: PlayerState): GameEvent[] {
  switch (station.type) {
    case 'counter': return interactCounter(station, player);
    case 'conveyor': return interactConveyor(station, player);
    case 'crate': return interactCrate(station, player);
    case 'cutting': return interactCutting(station, player);
    case 'stove': return interactStove(station, player);
    case 'plate_dispenser': return interactPlateDispenser(station, player);
    case 'sink': return interactSink(station, player);
    case 'trash': return interactTrash(station, player);
    case 'extinguisher': return interactExtinguisherStand(station, player);
    case 'floor': return interactFloor(station, player);
    case 'table': return interactTable(state, station, player);
    case 'dish_return': return interactDishReturn(station, player);
    case 'oven': return interactOven(station, player);
    default: return [];
  }
}

function interactTable(state: GameState, station: StationState, player: PlayerState): GameEvent[] {
  const H = player.held;
  const S = station.item;

  // Player holding a plate attempts to serve at table Q
  if (H && H.type === 'plate') {
    const events = serveCustomerOrder(state, H, station, player, station.customerId);
    // If serving succeeded and there was a leftover dirty plate on the table, clear it
    if (player.held === null && S && S.type === 'plate' && S.dirty) {
      station.item = null;
    }
    return events;
  }

  const events: GameEvent[] = [];

  // If hands are empty and there is a dirty plate on the table (even if a new customer is seated), pick it up
  if (!H && S && S.type === 'plate' && S.dirty) {
    player.held = S;
    station.item = null;
    events.push({ type: 'pickup', x: station.x + 0.5, y: station.y + 0.5, playerId: player.id });
  }

  if (station.customerId) {
    const c = state.customers.find(cu => cu.id === station.customerId);
    if (!c) {
      station.customerId = undefined;
    } else if (c.state === 'seated_waiting_order') {
      // Take order if hands were empty when interacting (allows picking up dirty plate + taking order simultaneously)
      if (!H) {
        c.state = 'order_taken';
        c.waitLeft = undefined;
        c.angry = false;
        state.orders.push({
          id: state.nextOrderId++,
          recipe: c.recipe!,
          timeLeft: c.patience,
          patience: c.maxPatience,
          customerId: c.id
        });
        events.push({ type: 'customer_order', x: station.x + 0.5, y: station.y + 0.5, playerId: player.id });
      }
    }
  }

  return events;
}

function interactConveyor(station: StationState, player: PlayerState): GameEvent[] {
  const events = interactCounter(station, player);
  if (events.length > 0 && events[0]?.type === 'drop') {
    station.progress = 0;
  }
  return events;
}

function interactExtinguisherStand(station: StationState, player: PlayerState): GameEvent[] {
  const H = player.held;
  const S = station.item;

  if (!H && S) {
    player.held = S;
    station.item = null;
    return [genEvent('pickup', station, player.id)];
  }

  if (H && H.type === 'tool' && H.tool === 'extinguisher' && !S) {
    station.item = H;
    player.held = null;
    return [genEvent('drop', station, player.id)];
  }

  return [];
}

function interactCounter(station: StationState, player: PlayerState): GameEvent[] {
  const H = player.held;
  const S = station.item;

  if (!H && S) {
    player.held = S;
    station.item = null;
    return [genEvent('pickup', station, player.id)];
  }

  if (H && !S) {
    station.item = H;
    player.held = null;
    return [genEvent('drop', station, player.id)];
  }

  if (H && S) {
    if (S.type === 'tool' && H.type !== 'tool') {
      if (interactWithTool(S, H, true)) {
        if (H.type === 'ingredient') {
          player.held = null;
          return [genEvent('drop', station, player.id)];
        } else {
          // It was a plate, and food was scooped into it. Hand still holds the plate.
          return [genEvent('pickup', station, player.id)]; // or drop, it doesn't matter much for events, maybe pickup since we picked up food.
        }
      }
    }
    if (H.type === 'tool' && S.type !== 'tool') {
      if (interactWithTool(H, S, false)) {
        // H modified in place, S might be absorbed if it was ingredient
        if (S.type === 'ingredient') {
          station.item = null;
          return [genEvent('pickup', station, player.id)];
        }
        return [genEvent('drop', station, player.id)];
      }
    }

    if (S.type === 'plate' && !S.dirty && H.type === 'ingredient') {
      if (canAddToPlate(S, H)) {
        addToPlate(S, H);
        player.held = null;
        return [genEvent('drop', station, player.id)];
      }
    }
    if (H.type === 'plate' && !H.dirty && S.type === 'ingredient') {
      if (canAddToPlate(H, S)) {
        addToPlate(H, S);
        station.item = null;
        return [genEvent('pickup', station, player.id)];
      }
    }

    // Pizza assembly on counter: dough (chopped) + tomato (chopped) + cheese (chopped)
    if (S.type === 'ingredient' && H.type === 'ingredient') {
      if (S.id === 'dough' && S.state === 'chopped' && (H.id === 'tomato' || H.id === 'cheese') && H.state === 'chopped') {
        S.contents = S.contents || [];
        if (!S.contents.some(c => c.id === H.id)) {
          S.contents.push(H);
          player.held = null;
          if (S.contents.some(c => c.id === 'tomato') && S.contents.some(c => c.id === 'cheese')) {
            station.item = { type: 'ingredient', id: 'pizza', state: 'raw' };
          }
          return [genEvent('drop', station, player.id)];
        }
      }
      if (H.id === 'dough' && H.state === 'chopped' && (S.id === 'tomato' || S.id === 'cheese') && S.state === 'chopped') {
        H.contents = H.contents || [];
        if (!H.contents.some(c => c.id === S.id)) {
          H.contents.push(S);
          station.item = null;
          if (H.contents.some(c => c.id === 'tomato') && H.contents.some(c => c.id === 'cheese')) {
            player.held = { type: 'ingredient', id: 'pizza', state: 'raw' };
          }
          return [genEvent('pickup', station, player.id)];
        }
      }
    }
  }

  return [];
}

function interactCrate(station: StationState, player: PlayerState): GameEvent[] {
  if (!player.held && station.crate) {
    player.held = makeIngredient(station.crate);
    return [genEvent('pickup', station, player.id)];
  } else if (player.held && player.held.type === 'ingredient' && player.held.id === station.crate && player.held.state === 'raw') {
    player.held = null; // Return to crate
    return [genEvent('drop', station, player.id)];
  }
  return [];
}

function interactCutting(station: StationState, player: PlayerState): GameEvent[] {
  const H = player.held;
  const S = station.item;

  if (!H && S) {
    // Không cho phép lấy đồ trên thớt đang cắt khi đang cắt dở (state là raw và progress > 0)
    if (player.autoAction === 'chop' || (S.type === 'ingredient' && S.state === 'raw' && station.progress > 0)) {
      return [];
    }
    player.held = S;
    station.item = null;
    station.progress = 0;
    return [genEvent('pickup', station, player.id)];
  }
  
  if (H && !S) {
    if (H.type === 'ingredient' && H.state === 'raw' && canChop(H)) {
      station.item = H;
      player.held = null;
      station.progress = 0;
      player.autoAction = 'chop';
      return [genEvent('drop', station, player.id)];
    }
  }

  // Cho cầm đĩa và lấy đồ ăn trên thớt sang đĩa
  if (H && S && H.type === 'plate' && !H.dirty && S.type === 'ingredient' && S.state === 'chopped') {
    if (canAddToPlate(H, S)) {
      addToPlate(H, S);
      station.item = null;
      station.progress = 0;
      return [genEvent('pickup', station, player.id)]; // Plated!
    }
  }

  // Cho phép ghép bánh Pizza ngay trên mặt thớt nếu bột/nhân đã cắt xong
  if (H && S && S.type === 'ingredient' && H.type === 'ingredient') {
    if (S.id === 'dough' && S.state === 'chopped' && (H.id === 'tomato' || H.id === 'cheese') && H.state === 'chopped') {
      S.contents = S.contents || [];
      if (!S.contents.some(c => c.id === H.id)) {
        S.contents.push(H);
        player.held = null;
        if (S.contents.some(c => c.id === 'tomato') && S.contents.some(c => c.id === 'cheese')) {
          station.item = { type: 'ingredient', id: 'pizza', state: 'raw' };
        }
        return [genEvent('drop', station, player.id)];
      }
    }
    if (H.id === 'dough' && H.state === 'chopped' && (S.id === 'tomato' || S.id === 'cheese') && S.state === 'chopped') {
      H.contents = H.contents || [];
      if (!H.contents.some(c => c.id === S.id)) {
        H.contents.push(S);
        station.item = null;
        station.progress = 0;
        if (H.contents.some(c => c.id === 'tomato') && H.contents.some(c => c.id === 'cheese')) {
          player.held = { type: 'ingredient', id: 'pizza', state: 'raw' };
        }
        return [genEvent('pickup', station, player.id)];
      }
    }
  }

  return [];
}

function interactStove(station: StationState, player: PlayerState): GameEvent[] {
  const H = player.held;
  const S = station.item;

  if (!H && S) {
    player.held = S;
    station.item = null;
    return [genEvent('pickup', station, player.id)];
  }
  
  if (H && !S) {
    if (H.type === 'tool') {
      station.item = H;
      player.held = null;
      return [genEvent('drop', station, player.id)];
    }
  }

  if (H && S && S.type === 'tool' && H.type !== 'tool') {
    // Plating from pan
    if (H.type === 'plate' && !H.dirty && S.tool === 'pan' && S.contents.length > 0) {
      const food = S.contents[0];
      if (food && food.state === 'cooked' && canAddToPlate(H, food)) {
        addToPlate(H, food);
        S.contents = [];
        S.progress = 0;
        return [genEvent('pickup', station, player.id)];
      }
    }
    
    if (interactWithTool(S, H, true)) {
      if (H.type === 'ingredient') {
        player.held = null;
        return [genEvent('drop', station, player.id)];
      } else {
        return [genEvent('pickup', station, player.id)];
      }
    }
  }

  return [];
}

function interactPlateDispenser(station: StationState, player: PlayerState): GameEvent[] {
  if (!player.held) {
    if (station.cleanCount > 0) {
      player.held = makePlate(false);
      station.cleanCount--;
      return [genEvent('pickup', station, player.id)];
    }
  } else {
    if (player.held.type === 'plate' && !player.held.dirty && player.held.contents.length === 0) {
      station.cleanCount++;
      player.held = null; // Return to dispenser
      return [genEvent('drop', station, player.id)];
    }
    // Smart plate dispenser: if holding a ready-to-plate ingredient, take a clean plate and place the ingredient on it!
    if (player.held.type === 'ingredient' && station.cleanCount > 0) {
      const newPlate = makePlate(false);
      if (canAddToPlate(newPlate, player.held)) {
        addToPlate(newPlate, player.held);
        station.cleanCount--;
        player.held = newPlate;
        return [genEvent('pickup', station, player.id)];
      }
    }
  }
  return [];
}


function interactSink(station: StationState, player: PlayerState): GameEvent[] {
  if (!player.held) {
    if (station.cleanCount > 0) {
      player.held = makePlate(false);
      station.cleanCount--;
      return [genEvent('pickup', station, player.id)];
    }
  } else {
    if (player.held.type === 'plate' && player.held.dirty) {
      station.dirtyCount++;
      player.held = null;
      player.autoAction = 'wash';
      return [genEvent('drop', station, player.id)];
    }
    if (player.held.type === 'ingredient' && station.cleanCount > 0) {
      const newPlate = makePlate(false);
      if (canAddToPlate(newPlate, player.held)) {
        addToPlate(newPlate, player.held);
        station.cleanCount--;
        player.held = newPlate;
        return [genEvent('pickup', station, player.id)];
      }
    }
  }
  return [];
}

function interactTrash(station: StationState, player: PlayerState): GameEvent[] {
  if (player.held) {
    if (player.held.type === 'ingredient') {
      player.held = null;
      return [genEvent('trash', station, player.id)];
    } else if (player.held.type === 'plate' && !player.held.dirty) {
      if (player.held.contents.length > 0) {
        player.held.contents = [];
        return [genEvent('trash', station, player.id)];
      }
    } else if (player.held.type === 'tool') {
      if (player.held.contents.length > 0) {
        player.held.contents = [];
        player.held.progress = 0;
        return [genEvent('trash', station, player.id)];
      }
    }
  }
  return [];
}

function interactFloor(station: StationState, player: PlayerState): GameEvent[] {
  if (!player.held && station.item) {
    player.held = station.item;
    station.item = null;
    return [genEvent('pickup', station, player.id)];
  }
  return [];
}

function interactDishReturn(station: StationState, player: PlayerState): GameEvent[] {
  if (player.held && player.held.type === 'plate' && player.held.dirty) {
    station.pendingReturns.push(DIRTY_PLATE_RETURN_DELAY);
    player.held = null;
    return [genEvent('drop', station, player.id)];
  }
  return [];
}

function interactOven(station: StationState, player: PlayerState): GameEvent[] {
  const H = player.held;
  const S = station.item;

  // Empty oven: accepts raw pizza
  if (!S) {
    if (H && H.type === 'ingredient' && H.id === 'pizza' && H.state === 'raw') {
      station.item = H;
      player.held = null;
      station.progress = 0;
      station.burntTimer = 0;
      return [genEvent('drop', station, player.id)];
    }
    return [];
  }

  // Oven has pizza
  if (S && S.type === 'ingredient' && S.id === 'pizza') {
    // Player holding clean empty plate takes cooked pizza
    if (H && H.type === 'plate' && !H.dirty && H.contents.length === 0 && S.state === 'cooked') {
      H.contents.push(S);
      station.item = null;
      station.progress = 0;
      station.burntTimer = 0;
      return [genEvent('pickup', station, player.id)];
    }
    // Player with empty hands can pick up item from oven (raw, cooked, or burnt)
    if (!H) {
      player.held = S;
      station.item = null;
      station.progress = 0;
      station.burntTimer = 0;
      return [genEvent('pickup', station, player.id)];
    }
  }

  return [];
}
