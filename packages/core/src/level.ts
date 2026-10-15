import { LevelDef, TileType, IngredientId, Vec2 } from './types';

export interface StationInit {
  x: number;
  y: number;
  type: TileType;
  crate?: IngredientId;
  stoveTool?: 'pan' | 'pot';
  dir?: 'up'|'down'|'left'|'right';
}

export interface ParsedLevel {
  def: LevelDef;
  width: number;
  height: number;
  tiles: TileType[];
  stations: StationInit[];
  spawns: Vec2[];
}

export function parseLevel(def: LevelDef): ParsedLevel {
  const width = def.ascii[0]?.length ?? 0;
  const height = def.ascii.length;
  const tiles: TileType[] = [];
  const stations: StationInit[] = [];
  const spawns: Vec2[] = [];

  for (let y = 0; y < height; y++) {
    const row = def.ascii[y] as string;
    for (let x = 0; x < width; x++) {
      const char = row[x] as string;
      let type: TileType = 'floor';
      let crate: IngredientId | undefined;
      let stoveTool: 'pan' | 'pot' | undefined;
      let dir: 'up'|'down'|'left'|'right' | undefined;

      switch (char) {
        case '#': type = 'wall'; break;
        case '.': type = 'floor'; break;
        case 'X': type = 'counter'; break;
        case 'C': type = 'cutting'; break;
        case 'S': type = 'stove'; stoveTool = 'pan'; break;
        case 'P': type = 'plate_dispenser'; break;
        case 'W': type = 'sink'; break;
        case 'R': type = 'dish_return'; break;
        case 'D': type = 'trash'; break;
        case 'T': type = 'crate'; crate = 'tomato'; break;
        case 'L': type = 'crate'; crate = 'lettuce'; break;
        case 'B': type = 'crate'; crate = 'bun'; break;
        case 'M': type = 'crate'; crate = 'meat'; break;
        case 'N': type = 'crate'; crate = 'onion'; break;
        case 'H': type = 'crate'; crate = 'mushroom'; break;
        case 's': type = 'stove'; stoveTool = 'pot'; break;
        case 'E': type = 'extinguisher'; break;
        case 'Q': type = 'table'; break;
        case 'U': type = 'oven'; break;
        case 'K': type = 'crate'; crate = 'dough'; break;
        case 'Z': type = 'crate'; crate = 'cheese'; break;
        case '>': type = 'conveyor'; dir = 'right'; break;
        case '<': type = 'conveyor'; dir = 'left'; break;
        case '^': type = 'conveyor'; dir = 'up'; break;
        case 'v': type = 'conveyor'; dir = 'down'; break;
        case '~': type = 'ice'; break;
        case '_': type = 'pit'; break;
        case '1': spawns[0] = { x: x + 0.5, y: y + 0.5 }; type = 'floor'; break;
        case '2': spawns[1] = { x: x + 0.5, y: y + 0.5 }; type = 'floor'; break;
        case '3': spawns[2] = { x: x + 0.5, y: y + 0.5 }; type = 'floor'; break;
        case '4': spawns[3] = { x: x + 0.5, y: y + 0.5 }; type = 'floor'; break;
      }
      
      tiles.push(type);
      if (type !== 'wall' && type !== 'floor' && type !== 'ice' && type !== 'pit') {
        stations.push({ x, y, type, crate, stoveTool, dir });
      }
    }
  }

  return { def, width, height, tiles, stations, spawns };
}

export function validateLevel(def: LevelDef): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (def.duration <= 0) errors.push('duration <= 0');
  
  const s0 = def.stars[0] as number;
  const s1 = def.stars[1] as number;
  const s2 = def.stars[2] as number;
  if (s0 >= s1 || s1 >= s2) errors.push('stars not increasing');
  
  if (def.ascii.length === 0) {
    errors.push('empty map');
    return { errors, warnings };
  }
  const width = def.ascii[0]?.length ?? 0;
  if (!def.ascii.every(r => r.length === width)) errors.push('rows not same length');
  
  const counts: Record<string, number> = {};
  const validCharsSet = new Set('#.XTLBMNHECSsP WD1234~_><^vQRUKZ'.replace(' ', '').split(''));
  
  for (let y = 0; y < def.ascii.length; y++) {
    const row = def.ascii[y] as string;
    for (let x = 0; x < row.length; x++) {
      const char = row[x] as string;
      if (!validCharsSet.has(char)) errors.push(`invalid char ${char}`);
      counts[char] = (counts[char] || 0) + 1;
      
      if (char === '.' || char === '~' || char === '1' || char === '2' || char === '3' || char === '4') {
        if (x === 0 || x === width - 1 || y === 0 || y === def.ascii.length - 1) {
          warnings.push('floor at edge');
        }
      }

      // check E enclosed by walls
      if (char === 'E') {
        let enclosed = true;
        const dirs = [[0,1], [0,-1], [1,0], [-1,0]];
        for (const d of dirs) {
          const nx = x + d[0]!, ny = y + d[1]!;
          if (nx >= 0 && nx < width && ny >= 0 && ny < def.ascii.length) {
            if (def.ascii[ny]![nx] !== '#') enclosed = false;
          }
        }
        if (enclosed) errors.push('E is enclosed by walls');
      }

      // check conveyor ends in wall
      if (char === '>' || char === '<' || char === '^' || char === 'v') {
        let nx = x; let ny = y;
        if (char === '>') nx++;
        if (char === '<') nx--;
        if (char === '^') ny--;
        if (char === 'v') ny++;
        if (nx >= 0 && nx < width && ny >= 0 && ny < def.ascii.length) {
          if (def.ascii[ny]![nx] === '#') errors.push(`conveyor at ${x},${y} ends in wall`);
        }
      }
    }
  }
  
  if (counts['1'] !== 1) errors.push('missing or multiple 1');
  if (counts['2'] && counts['2'] > 1) errors.push('multiple 2');
  if (counts['3'] && counts['3'] > 1) errors.push('multiple 3');
  if (counts['4'] && counts['4'] > 1) errors.push('multiple 4');
  
  const PLAYABLE_IDS = new Set([
    'tutorial',
    'level1',
    'bep_doi',
    'nha_hang_mo',
    'bep_lo_nuong',
    'quan_an_duong_pho',
    'tau_hai_tac',
    'dao_kho_bau',
    'tram_vu_tru',
    'dai_tiec_ngan_ha'
  ]);
  const isPlayable = PLAYABLE_IDS.has(def.id);

  // P, W, D: bắt buộc (lỗi nếu thiếu ở playable levels, cảnh báo ở test levels ngoài PLAYABLE_LEVELS)
  if (isPlayable) {
    if (!counts['P']) errors.push('missing P (plate dispenser)');
    if (!counts['W']) errors.push('missing W (sink)');
    if (!counts['D']) errors.push('missing D (trash)');
  } else {
    if (!counts['P']) warnings.push('missing P');
    if (!counts['W']) warnings.push('missing W');
    if (!counts['D']) warnings.push('missing D');
    if (def.id === 'test' && !counts['S']) warnings.push('missing S');
  }

  // Q: bắt buộc nếu level có recipe
  if (def.recipes.length > 0) {
    if (isPlayable) {
      if (!counts['Q']) errors.push('missing Q (table)');
    } else {
      if (!counts['Q'] && !counts['R']) {
        warnings.push('missing Q (table) or R (order window)');
      }
    }
  }

  const requiredIngredients = new Set<string>();
  let hasPanRecipe = false;
  let hasSoupRecipe = false;
  let hasChopRecipe = false;
  let hasPizzaRecipe = false;

  for (const r of def.recipes) {
    if (r.id === 'salad') {
      requiredIngredients.add('L');
      requiredIngredients.add('T');
      hasChopRecipe = true;
    } else if (r.id === 'cheese_salad') {
      requiredIngredients.add('L');
      requiredIngredients.add('T');
      requiredIngredients.add('Z');
      hasChopRecipe = true;
    } else if (r.id === 'burger') {
      requiredIngredients.add('B');
      requiredIngredients.add('M');
      requiredIngredients.add('L');
      hasPanRecipe = true;
      hasChopRecipe = true;
    } else if (r.id === 'burger_tomato') {
      requiredIngredients.add('B');
      requiredIngredients.add('M');
      requiredIngredients.add('L');
      requiredIngredients.add('T');
      hasPanRecipe = true;
      hasChopRecipe = true;
    } else if (r.id === 'cheese_burger') {
      requiredIngredients.add('B');
      requiredIngredients.add('M');
      requiredIngredients.add('Z');
      hasPanRecipe = true;
      hasChopRecipe = true;
    } else if (r.id === 'steak_dinner') {
      requiredIngredients.add('M');
      requiredIngredients.add('T');
      hasPanRecipe = true;
      hasChopRecipe = true;
    } else if (r.id === 'mushroom_steak') {
      requiredIngredients.add('M');
      requiredIngredients.add('H');
      hasPanRecipe = true;
      hasChopRecipe = true;
    } else if (r.id === 'tomato_soup') {
      requiredIngredients.add('T');
      hasSoupRecipe = true;
      hasChopRecipe = true;
    } else if (r.id === 'onion_soup') {
      requiredIngredients.add('N');
      hasSoupRecipe = true;
      hasChopRecipe = true;
    } else if (r.id === 'mushroom_soup') {
      requiredIngredients.add('H');
      hasSoupRecipe = true;
      hasChopRecipe = true;
    } else if (r.id === 'pizza') {
      requiredIngredients.add('K'); // dough
      requiredIngredients.add('Z'); // cheese
      requiredIngredients.add('T'); // tomato
      hasPizzaRecipe = true;
      hasChopRecipe = true;
    }
  }

  // Kiểm tra trạm theo recipe
  if (hasPanRecipe && !counts['S']) errors.push('missing S (stove/pan) for burger recipes');
  if (hasSoupRecipe && !counts['s']) errors.push('missing s (pot) for soup recipes');
  if (counts['s'] && !hasSoupRecipe) warnings.push(`pot 's' exists but no soup recipe`);

  if (hasChopRecipe && !counts['C']) errors.push('missing C (cutting board) for chopping recipes');

  if (hasPizzaRecipe && !counts['U']) errors.push('missing U (oven) for pizza recipe');
  if (counts['U'] && !hasPizzaRecipe) warnings.push(`oven 'U' exists but no pizza recipe`);

  for (const ing of requiredIngredients) {
    if (!counts[ing]) errors.push(`missing crate ${ing}`);
  }
  
  let firstFloor: {x: number, y: number} | null = null;
  for (let y = 0; y < def.ascii.length; y++) {
    const row = def.ascii[y] as string;
    for (let x = 0; x < width; x++) {
      const char = row[x] as string;
      const isFloor = char === '.' || char === '~' || char === '1' || char === '2' || char === '3' || char === '4';
      if (isFloor && !firstFloor) firstFloor = {x, y};
      
      if (char !== '#' && char !== 'X' && !isFloor && char !== '_') {
        let hasFloor = false;
        const dirs = [[0,1], [0,-1], [1,0], [-1,0]];
        for (const d of dirs) {
          const dx = d[0] as number, dy = d[1] as number;
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < def.ascii.length) {
            const nr = def.ascii[ny] as string;
            const nc = nr[nx] as string;
            if (nc === '.' || nc === '~' || nc === '1' || nc === '2' || nc === '3' || nc === '4') {
              hasFloor = true;
              break;
            }
          }
        }
        if (!hasFloor) warnings.push(`station ${char} at ${x},${y} isolated`);
      }
    }
  }
  
  if (firstFloor) {
    const visited = new Set<string>();
    const queue = [firstFloor];
    visited.add(`${firstFloor.x},${firstFloor.y}`);
    while (queue.length > 0) {
      const {x, y} = queue.shift() as {x: number; y: number};
      const dirs = [[0,1], [0,-1], [1,0], [-1,0]];
      for (const d of dirs) {
        const dx = d[0] as number, dy = d[1] as number;
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < def.ascii.length) {
          const nr = def.ascii[ny] as string;
          const nc = nr[nx] as string;
          if (nc === '.' || nc === '~' || nc === '1' || nc === '2' || nc === '3' || nc === '4') {
            const k = `${nx},${ny}`;
            if (!visited.has(k)) {
              visited.add(k);
              queue.push({x: nx, y: ny});
            }
          }
        }
      }
    }
    
    for (let y = 0; y < def.ascii.length; y++) {
      const row = def.ascii[y] as string;
      for (let x = 0; x < width; x++) {
        const char = row[x] as string;
        const isFloor = char === '.' || char === '~' || char === '1' || char === '2' || char === '3' || char === '4';
        if (isFloor && !visited.has(`${x},${y}`)) {
          if (!counts['_']) {
            warnings.push(`floor at ${x},${y} unreachable`);
          }
        }
      }
    }
  }
  
  return { errors, warnings };
}

const USABILITY_DIRS = [
  [1, 0] as const,
  [-1, 0] as const,
  [0, 1] as const,
  [0, -1] as const,
];

export function validateUsability(level: LevelDef): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const height = level.ascii.length;
  if (height === 0) {
    errors.push('Map rỗng');
    return { valid: false, errors };
  }
  const width = level.ascii[0]?.length || 0;

  const isFloor = (x: number, y: number) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return false;
    const ch = level.ascii[y]![x]!;
    return ch === '.' || ch === '~' || ['1', '2', '3', '4'].includes(ch);
  };

  const getChar = (x: number, y: number) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return '#';
    return level.ascii[y]![x]!;
  };

  const getAdjacentFloors = (x: number, y: number) => {
    const floors: [number, number][] = [];
    for (const [dx, dy] of USABILITY_DIRS) {
      if (isFloor(x + dx, y + dy)) floors.push([x + dx, y + dy]);
    }
    return floors;
  };

  // Find stations
  const stations: { char: string; x: number; y: number }[] = [];
  let xCount = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const ch = level.ascii[y]![x]!;
      if (ch === 'X') xCount++;
      if (!['#', '.', '~', ' ', '1', '2', '3', '4', '>', '<', '^', 'v'].includes(ch)) {
        stations.push({ char: ch, x, y });
      }
    }
  }

  // R6: Total X counters threshold >= 2
  if (xCount < 2) {
    errors.push(`R6: Map thiếu quầy X (tổng số X = ${xCount}, yêu cầu tối thiểu >= 2)`);
  }

  const cStations = stations.filter(s => s.char === 'C');
  const qStations = stations.filter(s => s.char === 'Q');
  const wStations = stations.filter(s => s.char === 'W');
  const pStations = stations.filter(s => s.char === 'P');
  const crateStations = stations.filter(s => ['T', 'L', 'B', 'M', 'K', 'Z', 'N', 'H'].includes(s.char));

  // R1: Every C must have counter X nearby (BFS <= 4)
  for (const c of cStations) {
    const cFloors = getAdjacentFloors(c.x, c.y);
    let minXDist = Infinity;
    for (const [cx, cy] of cFloors) {
      const visited = new Map<string, number>();
      const queue: [number, number, number][] = [[cx, cy, 0]];
      visited.set(`${cx},${cy}`, 0);

      while (queue.length > 0) {
        const [currX, currY, dist] = queue.shift()!;
        if (dist > 4) break;

        // Check if adjacent to an X
        for (const [dx, dy] of USABILITY_DIRS) {
          if (getChar(currX + dx, currY + dy) === 'X') {
            if (dist < minXDist) minXDist = dist;
            break;
          }
        }
        if (minXDist <= 4) break;

        for (const [dx, dy] of USABILITY_DIRS) {
          const nx = currX + dx, ny = currY + dy;
          if (isFloor(nx, ny) && !visited.has(`${nx},${ny}`)) {
            visited.set(`${nx},${ny}`, dist + 1);
            queue.push([nx, ny, dist + 1]);
          }
        }
      }
    }
    if (minXDist > 4) {
      errors.push(`R1: Thớt C tại (${c.x}, ${c.y}) thiếu quầy X kề cạnh (khoảng cách tới X gần nhất = ${minXDist === Infinity ? 'vô cùng' : minXDist} > 4)`);
    }
  }

  // R2: Q cannot be adjacent to any ingredient crate (T, L, B, M, K, Z) (Chebyshev distance <= 1)
  for (const q of qStations) {
    for (const crate of crateStations) {
      if (Math.abs(q.x - crate.x) <= 1 && Math.abs(q.y - crate.y) <= 1) {
        errors.push(`R2: Bàn khách Q tại (${q.x}, ${q.y}) kề cạnh thùng nguyên liệu ${crate.char} tại (${crate.x}, ${crate.y})`);
      }
    }
  }

  // R3: Q cannot be orthogonally adjacent to prep stations (C, S, s, U), and W must have at least one floor tile not orthogonally adjacent to Q
  const prepStations = stations.filter(s => ['C', 'S', 's', 'U'].includes(s.char));
  for (const q of qStations) {
    for (const prep of prepStations) {
      if (Math.abs(q.x - prep.x) + Math.abs(q.y - prep.y) === 1) {
        errors.push(`R3: Bàn khách Q tại (${q.x}, ${q.y}) kề cạnh trực tiếp với trạm chế biến ${prep.char} tại (${prep.x}, ${prep.y})`);
      }
    }
  }
  for (const w of wStations) {
    const wFloors = getAdjacentFloors(w.x, w.y);
    const hasUnblockedFloor = wFloors.some(([wx, wy]) => {
      return !qStations.some(q => Math.abs(q.x - wx) + Math.abs(q.y - wy) === 1);
    });
    if (!hasUnblockedFloor) {
      errors.push(`R3: Bồn rửa W tại (${w.x}, ${w.y}) bị bàn khách Q chắn toàn bộ ô sàn thao tác`);
    }
  }

  // R4: Every Q walks to W in <= 8 steps; and P can reach Q and W
  for (const q of qStations) {
    const qFloors = getAdjacentFloors(q.x, q.y);
    let minWDist = Infinity;
    for (const w of wStations) {
      for (const [qx, qy] of qFloors) {
        const visited = new Map<string, number>();
        const queue: [number, number, number][] = [[qx, qy, 0]];
        visited.set(`${qx},${qy}`, 0);

        while (queue.length > 0) {
          const [currX, currY, dist] = queue.shift()!;
          if (dist >= minWDist) continue;

          for (const [dx, dy] of USABILITY_DIRS) {
            if (currX + dx === w.x && currY + dy === w.y) {
              if (dist < minWDist) minWDist = dist;
              break;
            }
          }

          for (const [dx, dy] of USABILITY_DIRS) {
            const nx = currX + dx, ny = currY + dy;
            if (isFloor(nx, ny) && !visited.has(`${nx},${ny}`)) {
              visited.set(`${nx},${ny}`, dist + 1);
              queue.push([nx, ny, dist + 1]);
            }
          }
        }
      }
    }
    if (minWDist > 8) {
      errors.push(`R4: Bàn khách Q tại (${q.x}, ${q.y}) cách bồn rửa W ${minWDist === Infinity ? 'vô cùng' : minWDist} bước (> 8 bước)`);
    }
  }

  // Check P reaches Q and W
  for (const p of pStations) {
    const pFloors = getAdjacentFloors(p.x, p.y);
    for (const q of qStations) {
      let canReach = false;
      for (const [px, py] of pFloors) {
        const visited = new Set<string>();
        const queue: [number, number][] = [[px, py]];
        visited.add(`${px},${py}`);
        while (queue.length > 0) {
          const [cx, cy] = queue.shift()!;
          for (const [dx, dy] of USABILITY_DIRS) {
            if (cx + dx === q.x && cy + dy === q.y) {
              canReach = true;
              break;
            }
          }
          if (canReach) break;
          for (const [dx, dy] of USABILITY_DIRS) {
            const nx = cx + dx, ny = cy + dy;
            if (isFloor(nx, ny) && !visited.has(`${nx},${ny}`)) {
              visited.add(`${nx},${ny}`);
              queue.push([nx, ny]);
            }
          }
        }
        if (canReach) break;
      }
      if (!canReach) {
        errors.push(`R4: Máy đĩa P tại (${p.x}, ${p.y}) không thể tiếp cận bàn khách Q tại (${q.x}, ${q.y})`);
      }
    }
  }

  // R5: Every functional station has floor to stand
  const functionalStations = stations.filter(s => s.char !== 'X');
  for (const st of functionalStations) {
    const floors = getAdjacentFloors(st.x, st.y);
    if (floors.length === 0) {
      errors.push(`R5: Trạm ${st.char} tại (${st.x}, ${st.y}) không có ô sàn kề cạnh để đứng`);
    }
  }

  return { valid: errors.length === 0, errors };
}

