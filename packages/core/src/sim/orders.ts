import { GameState, GameEvent, PlayerState, StationState, PlateItem, Item } from '../types';
import { ORDER_MAX_ACTIVE, ORDER_PATIENCE, ORDER_INTERVAL_MIN, ORDER_INTERVAL_MAX, ORDER_EXPIRE_PENALTY, TIP_MAX, DIRTY_PLATE_RETURN_DELAY, ORDER_PATIENCE_BY_RECIPE, TIP_STREAK_MAX, CUSTOMER_ORDER_WAIT, CUSTOMER_LEAVE_DURATION } from '../constants';
import { pickWeighted, randomInt } from '../rng';
import { RECIPES, matchRecipe } from '../recipes';

export function tickOrders(state: GameState, dt: number): GameEvent[] {
  const events: GameEvent[] = [];

  // Customer ticking
  for (let i = state.customers.length - 1; i >= 0; i--) {
    const c = state.customers[i]!;

    if (c.state === 'seated_waiting_order') {
      if (c.waitLeft === undefined) {
        c.waitLeft = CUSTOMER_ORDER_WAIT;
      }
      c.waitLeft -= dt;
      if (c.waitLeft <= 1e-5) {
        // Waited > 30s without order taken: leaves with 'no_order_taken'
        c.state = 'leaving';
        c.timer = 0;
        c.angry = true;
        state.expired++;
        state.score = Math.max(0, state.score - ORDER_EXPIRE_PENALTY);
        if (state.streak > 0) {
          events.push({ type: 'streak_lost' });
        }
        state.streak = 0;
        events.push({ type: 'customer_leave', reason: 'no_order_taken', customerId: c.id, x: c.x + 0.5, y: c.y + 0.5 });
      }
    } else if (c.state === 'order_taken') {
      c.patience -= dt;

      // Update patience on active order
      const order = state.orders.find(o => o.customerId === c.id);
      if (order) {
        order.timeLeft = c.patience;
      }

      // Angry check: patience < 20%
      if (c.patience < c.maxPatience * 0.2) {
        c.angry = true;
      } else {
        c.angry = false;
      }

      if (c.patience <= 1e-5) {
        // Order expired: angry, leaves after 0.6s
        c.state = 'leaving';
        c.timer = 0;
        c.angry = true;
        state.expired++;
        state.score = Math.max(0, state.score - ORDER_EXPIRE_PENALTY);
        if (state.streak > 0) {
          events.push({ type: 'streak_lost' });
        }
        state.streak = 0;

        const orderIdx = state.orders.findIndex(o => o.customerId === c.id);
        if (orderIdx >= 0) state.orders.splice(orderIdx, 1);

        events.push({ type: 'order_expired' });
        events.push({ type: 'customer_leave', reason: 'expired', customerId: c.id, x: c.x + 0.5, y: c.y + 0.5 });
      }
    } else if (c.state === 'eating') {
      c.timer += dt;
      if (c.timer >= 5.0) { // 5s to eat
        state.customers.splice(i, 1);
        const table = state.stations.find(s => s.x === c.x && s.y === c.y);
        if (table) {
          table.customerId = undefined;
          table.item = { type: 'plate', dirty: true, contents: [] };
        }
        events.push({ type: 'customer_leave', reason: 'served', customerId: c.id, x: c.x + 0.5, y: c.y + 0.5 });
      }
    } else if (c.state === 'leaving') {
      c.timer += dt;
      if (c.timer >= CUSTOMER_LEAVE_DURATION) { // 0.6s
        state.customers.splice(i, 1);
        const table = state.stations.find(s => s.x === c.x && s.y === c.y);
        if (table) {
          table.customerId = undefined;
        }
      }
    }
  }

  // Spawning Customers (with Ready, Set, Cook! breathing room & dirty-plate table support)
  if (!state.orderScript || state.nextScriptIdx === undefined || state.nextScriptIdx >= state.orderScript.length) {
    state.nextOrderIn -= dt;
    if (state.nextOrderIn <= 1e-5) {
      if (state.customers.length < ORDER_MAX_ACTIVE) {
        const allFreeTables = state.stations.filter(
          s => s.type === 'table' && !s.customerId && (!s.item || s.item.type === 'plate')
        );
        const cleanFreeTables = allFreeTables.filter(
          s => !s.item || (s.item.type === 'plate' && !s.item.dirty)
        );
        const emptyTables = cleanFreeTables.length > 0 ? cleanFreeTables : allFreeTables;
        if (emptyTables.length > 0) {
          const { value: tIdx, state: nextState0 } = randomInt(state.rngState, 0, emptyTables.length - 1);
          const table = emptyTables[tIdx]!;
          state.rngState = nextState0;
          
          const { value: colorIdx, state: nextState01 } = randomInt(state.rngState, 0, 5);
          state.rngState = nextState01;

          const weights = state.recipeWeights.map(w => w.weight);
          const { value: recipeObj, state: nextState1 } = pickWeighted(state.rngState, state.recipeWeights, weights);
          const recipeId = recipeObj.id;

          const { value: nextInterval, state: nextState2 } = randomInt(nextState1, ORDER_INTERVAL_MIN, ORDER_INTERVAL_MAX);
          state.rngState = nextState2;

          const patience = ORDER_PATIENCE_BY_RECIPE[recipeId] || ORDER_PATIENCE;

          const c: import('../types').CustomerState = {
            id: state.nextCustomerId++,
            x: table.x, y: table.y,
            state: 'seated_waiting_order',
            recipe: recipeId,
            patience: patience,
            maxPatience: patience,
            timer: 0,
            colorIndex: colorIdx,
            waitLeft: CUSTOMER_ORDER_WAIT,
            angry: false
          };
          state.customers.push(c);
          table.customerId = c.id;
          
          state.nextOrderIn = nextInterval;
          events.push({ type: 'customer_spawn' });
        } else {
          // Give players breathing room when all tables are occupied
          state.nextOrderIn = 10.0;
        }
      } else {
        // Do not sit at 0 when max active customers is reached; leave a gap after a customer leaves
        state.nextOrderIn = 10.0;
      }
    }
  } else {
    // Script spawning
    const nextScript = state.orderScript[state.nextScriptIdx]!;
    if (state.timeElapsed >= nextScript.at) {
      if (state.customers.length < ORDER_MAX_ACTIVE) {
        const allFreeTables = state.stations.filter(
          s => s.type === 'table' && !s.customerId && (!s.item || s.item.type === 'plate')
        );
        const cleanFreeTables = allFreeTables.filter(
          s => !s.item || (s.item.type === 'plate' && !s.item.dirty)
        );
        const emptyTables = cleanFreeTables.length > 0 ? cleanFreeTables : allFreeTables;
        if (emptyTables.length > 0) {
          const { value: tIdx, state: nextState0 } = randomInt(state.rngState, 0, emptyTables.length - 1);
          const table = emptyTables[tIdx]!;
          state.rngState = nextState0;
          
          const { value: colorIdx, state: nextState01 } = randomInt(state.rngState, 0, 5);
          state.rngState = nextState01;

          const recipeId = nextScript.recipe;
          const patience = ORDER_PATIENCE_BY_RECIPE[recipeId] || ORDER_PATIENCE;

          const c: import('../types').CustomerState = {
            id: state.nextCustomerId++,
            x: table.x, y: table.y,
            state: 'seated_waiting_order',
            recipe: recipeId,
            patience: patience,
            maxPatience: patience,
            timer: 0,
            colorIndex: colorIdx,
            waitLeft: CUSTOMER_ORDER_WAIT,
            angry: false
          };
          state.customers.push(c);
          table.customerId = c.id;
          
          state.nextScriptIdx++;
          events.push({ type: 'customer_spawn' });
        }
      }
    }
  }

  return events;
}


export function serveCustomerOrder(state: GameState, item: Item | null, station: StationState, player: PlayerState, customerId?: number): GameEvent[] {
  const effectiveCustomerId = customerId ?? station.customerId;

  if (!effectiveCustomerId) {
    return [{ type: 'serve_fail', reason: 'no_customer', x: station.x + 0.5, y: station.y + 0.5, playerId: player.id }];
  }

  const c = state.customers.find(cu => cu.id === effectiveCustomerId);
  if (!c) {
    return [{ type: 'serve_fail', reason: 'no_customer', x: station.x + 0.5, y: station.y + 0.5, playerId: player.id }];
  }

  const orderIdx = state.orders.findIndex(o => o.customerId === c.id);
  if (orderIdx === -1 || c.state !== 'order_taken') {
    return [{ type: 'serve_fail', reason: 'no_order', x: station.x + 0.5, y: station.y + 0.5, playerId: player.id }];
  }

  const order = state.orders[orderIdx]!;

  if (!item || item.type !== 'plate' || item.dirty) {
    return [{ type: 'serve_fail', reason: 'wrong_dish', x: station.x + 0.5, y: station.y + 0.5, playerId: player.id }];
  }

  const recipeId = matchRecipe(item as PlateItem);

  if (recipeId && recipeId === order.recipe) {
    state.orders.splice(orderIdx, 1);

    const baseScore = RECIPES[recipeId].score;
    const tip = Math.round(TIP_MAX * (order.timeLeft / order.patience));
    
    state.streak = Math.min(state.streak + 1, TIP_STREAK_MAX);
    if (state.streak > state.maxStreak) {
      state.maxStreak = state.streak;
    }
    
    const eventsToReturn: GameEvent[] = [];
    if (state.streak > 1) {
      eventsToReturn.push({ type: 'streak_up' });
    }
    
    const reward = baseScore + tip * Math.max(1, state.streak);
    state.score += reward;
    state.served++;
    
    state.servedByPlayer[player.id] = (state.servedByPlayer[player.id] || 0) + 1;

    player.held = null;

    // Change customer to eating
    c.state = 'eating';
    c.timer = 0;

    eventsToReturn.push({ 
      type: 'serve_ok', 
      x: station.x + 0.5, 
      y: station.y + 0.5, 
      playerId: player.id,
      recipe: recipeId,
      baseScore,
      tip,
      streak: Math.max(1, state.streak),
      reward
    });
    return eventsToReturn;
  }

  if (recipeId && state.orders.some(o => o.customerId !== c.id && o.recipe === recipeId)) {
    return [{ type: 'serve_fail', reason: 'wrong_table', x: station.x + 0.5, y: station.y + 0.5, playerId: player.id }];
  }

  return [{ type: 'serve_fail', reason: 'wrong_dish', x: station.x + 0.5, y: station.y + 0.5, playerId: player.id }];
}


export function calcStars(score: number, thresholds: [number, number, number]): 0 | 1 | 2 | 3 {
  if (score >= thresholds[2]) return 3;
  if (score >= thresholds[1]) return 2;
  if (score >= thresholds[0]) return 1;
  return 0;
}

export function buildResults(state: GameState): { score: number, stars: 0 | 1 | 2 | 3, served: number, expired: number, maxStreak: number, servedByPlayer: Record<string, number> } {
  return {
    score: state.score,
    stars: calcStars(state.score, state.starThresholds),
    served: state.served,
    expired: state.expired,
    maxStreak: state.maxStreak,
    servedByPlayer: state.servedByPlayer
  };
}
