import { GameState, GameEvent } from '../types';
import { COOK_TIME, BURN_TIME, OVEN_COOK_TIME, OVEN_BURN_TIME, CHOP_TIME, WASH_TIME, POT_COOK_TIME, POT_BURN_TIME, FIRE_IGNITE_AFTER_BURNT, FIRE_SPREAD_INTERVAL, FIRE_SPREAD_CHANCE, CONVEYOR_SPEED } from '../constants';
import { nextRandom } from '../rng';
import { canChop, canAddToPlate } from '../recipes';
import { serveCustomerOrder } from './orders';


export function tickStations(state: GameState, dt: number): GameEvent[] {
  const events: GameEvent[] = [];

  for (const station of state.stations) {
    if (station.type === 'stove') {
      if (station.item && station.item.type === 'tool') {
        const tool = station.item;
          if (tool.tool === 'pan' && tool.contents.length === 1 && tool.contents[0]!.id === 'meat') {
            const meat = tool.contents[0]!;
            if (meat.state === 'raw') {
              tool.progress += dt;
              if (tool.progress >= COOK_TIME - 1e-5) {
                meat.state = 'cooked';
                events.push({ type: 'cook_done', x: station.x + 0.5, y: station.y + 0.5 });
              }
            } else if (meat.state === 'cooked') {
              tool.progress += dt;
              if (tool.progress >= COOK_TIME + BURN_TIME - 1e-5) {
                meat.state = 'burnt';
                events.push({ type: 'burnt', x: station.x + 0.5, y: station.y + 0.5 });
              }
            }
          } else if (tool.tool === 'pot' && tool.contents.length === 3) {
            if (tool.contents.every(c => c.state !== 'burnt')) {
              tool.progress += dt;
              if (tool.progress >= POT_COOK_TIME - 1e-5 && tool.progress < POT_COOK_TIME + POT_BURN_TIME - 1e-5) {
                // Chín
                if (tool.progress - dt < POT_COOK_TIME - 1e-5) {
                  events.push({ type: 'pot_done', x: station.x + 0.5, y: station.y + 0.5 });
                }
              } else if (tool.progress >= POT_COOK_TIME + POT_BURN_TIME - 1e-5) {
                tool.contents.forEach(c => c.state = 'burnt');
                events.push({ type: 'soup_burnt', x: station.x + 0.5, y: station.y + 0.5 });
              }
            }
          }
          
          let isBurnt = false;
          if (tool.tool === 'pan' && tool.contents.length === 1 && tool.contents[0]!.state === 'burnt') isBurnt = true;
          if (tool.tool === 'pot' && tool.contents.length === 3 && tool.contents[0]!.state === 'burnt') isBurnt = true;
          
          if (isBurnt && !station.onFire) {
            station.burntTimer += dt;
            if (station.burntTimer >= FIRE_IGNITE_AFTER_BURNT - 1e-5) {
              station.onFire = true;
              station.fireTimer = 0;
              station.progress = 0;
              if (station.item && station.item.type === 'tool') {
                station.item.contents = [];
                station.item.progress = 0;
              }
              events.push({ type: 'ignite', x: station.x + 0.5, y: station.y + 0.5 });
            }
          } else if (!isBurnt) {
            station.burntTimer = 0;
          }
      } else {
        station.burntTimer = 0;
      }
    }

    if (station.type === 'oven') {
      if (station.item && station.item.type === 'ingredient' && station.item.id === 'pizza') {
        const pizza = station.item;
        if (pizza.state === 'raw') {
          station.progress += dt;
          if (station.progress >= OVEN_COOK_TIME - 1e-5) {
            pizza.state = 'cooked';
            events.push({ type: 'cook_done', x: station.x + 0.5, y: station.y + 0.5 });
            events.push({ type: 'oven_done', x: station.x + 0.5, y: station.y + 0.5 });
          }
        } else if (pizza.state === 'cooked') {
          station.progress += dt;
          if (station.progress >= OVEN_COOK_TIME + OVEN_BURN_TIME - 1e-5) {
            pizza.state = 'burnt';
            events.push({ type: 'burnt', x: station.x + 0.5, y: station.y + 0.5 });
            events.push({ type: 'pizza_burnt', x: station.x + 0.5, y: station.y + 0.5 });
          }
        }

        const isBurnt = pizza.state === 'burnt';
        if (isBurnt && !station.onFire) {
          station.burntTimer += dt;
          if (station.burntTimer >= FIRE_IGNITE_AFTER_BURNT - 1e-5) {
            station.onFire = true;
            station.fireTimer = 0;
            station.progress = 0;
            station.item = null;
            events.push({ type: 'ignite', x: station.x + 0.5, y: station.y + 0.5 });
          }
        } else if (!isBurnt) {
          station.burntTimer = 0;
        }
      } else {
        station.burntTimer = 0;
      }
    }

    if (station.type === 'cutting') {
      // Chopping is now purely driven by player action in action.ts
    }

    if (station.type === 'dish_return') {
      for (let i = station.pendingReturns.length - 1; i >= 0; i--) {
        station.pendingReturns[i] = station.pendingReturns[i]! - dt;
        if (station.pendingReturns[i]! <= 1e-5) {
          station.pendingReturns.splice(i, 1);
          const sink = state.stations.find(s => s.type === 'sink');
          if (sink) {
            sink.dirtyCount++;
          } else {
            station.dirtyCount++;
          }
        }
      }
    }

    if (station.type === 'sink') {
      // Washing is now purely driven by player action in action.ts
    }

    if (station.type === 'conveyor' && station.item && !station.onFire) {
      station.progress += dt * CONVEYOR_SPEED;
      if (station.progress >= 1 - 1e-5) {
        const dx = station.dir === 'left' ? -1 : station.dir === 'right' ? 1 : 0;
        const dy = station.dir === 'up' ? -1 : station.dir === 'down' ? 1 : 0;
        const nextX = station.x + dx;
        const nextY = station.y + dy;
        const nextStation = state.stations.find(s => s.x === nextX && s.y === nextY);
        
        let pushed = false;
        if (nextStation && !nextStation.onFire) {
          if ((nextStation.type === 'counter' || nextStation.type === 'conveyor') && !nextStation.item) {
            nextStation.item = station.item;
            if (nextStation.type === 'conveyor') nextStation.progress = 0;
            pushed = true;
          } else if (nextStation.type === 'counter' && nextStation.item && nextStation.item.type === 'plate' && station.item.type === 'ingredient') {
            if (canAddToPlate(nextStation.item, station.item)) {
              nextStation.item.contents.push(station.item);
              pushed = true;
            }
          } else if (nextStation.type === 'cutting' && !nextStation.item && station.item.type === 'ingredient' && station.item.state === 'raw' && canChop(station.item)) {
            nextStation.item = station.item;
            nextStation.progress = 0;
            pushed = true;
          } else if (nextStation.type === 'trash') {
            pushed = true;
            events.push({ type: 'trash', x: nextStation.x + 0.5, y: nextStation.y + 0.5 });
          } else if (nextStation.type === 'table') {
            if (station.item.type === 'plate' && nextStation.customerId) {
              const c = state.customers.find(cu => cu.id === nextStation.customerId);
              if (c && c.state === 'order_taken') {
                const mockPlayer = { id: 'conveyor', held: station.item } as any;
                const evs = serveCustomerOrder(state, station.item, nextStation, mockPlayer, c.id);
                events.push(...evs);
                if (mockPlayer.held === null) {
                  pushed = true;
                }
              }
            }
          }
        }
        
        if (pushed) {
          station.item = null;
          station.progress = 0;
        } else {
          station.progress = 1;
        }
      }
    }

    if (station.onFire) {
      station.fireTimer += dt;
      if (station.fireTimer >= FIRE_SPREAD_INTERVAL - 1e-5) {
        station.fireTimer = 0;
        const neighbors = [
          state.stations.find(s => s.x === station.x && s.y === station.y - 1),
          state.stations.find(s => s.x === station.x && s.y === station.y + 1),
          state.stations.find(s => s.x === station.x - 1 && s.y === station.y),
          state.stations.find(s => s.x === station.x + 1 && s.y === station.y)
        ];
        for (const n of neighbors) {
          if (n && (n.type === 'counter' || n.type === 'cutting' || n.type === 'stove') && !n.onFire) {
            const { state: nextState, value: rand } = nextRandom(state.rngState);
            state.rngState = nextState;
            if (rand < FIRE_SPREAD_CHANCE) {
              n.onFire = true;
              n.fireTimer = 0;
              n.burntTimer = 0;
              n.progress = 0;
              if (n.item && n.item.type === 'ingredient') n.item = null;
              else if (n.item && n.item.type === 'tool') {
                n.item.contents = [];
                n.item.progress = 0;
              }
              events.push({ type: 'ignite', x: n.x + 0.5, y: n.y + 0.5 });
            }
          }
        }
      }

      if (station.progress > 0) {
        station.progress = Math.max(0, station.progress - dt);
      }
    }
  }

  return events;
}
