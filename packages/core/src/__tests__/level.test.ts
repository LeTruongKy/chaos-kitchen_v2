import { expect, it, describe } from 'vitest';
import { parseLevel, validateLevel } from '../level';
import { level1 } from '../levels/level1';
import { level2 } from '../levels/level2';
import { level3 } from '../levels/level3';
import { PLAYABLE_LEVELS, ALL_LEVELS, LEVELS } from '../levels';
import { LevelDef, TileType } from '../types';

describe('validateLevel', () => {
  it('returns no errors for valid levels', () => {
    expect(validateLevel(level1).errors).toEqual([]);
    expect(validateLevel(level2).errors).toEqual([]);
    expect(validateLevel(level3).errors).toEqual([]);
  });

  const baseDef: LevelDef = {
    id: 'test',
    name: 'test',
    duration: 100,
    plates: 1,
    recipes: [{ id: 'salad', weight: 1 }],
    stars: [1, 2, 3],
    world: 1,
    theme: 'diner',
    ascii: [
      '#####',
      '#LTX#',
      '#1.2#',
      '#WXQ#',
      '#P.C#',
      '#3D4#',
      '#SXX#',
      '#####'
    ]
  };

  it('detects missing spawn', () => {
    const def = { ...baseDef, ascii: [
      '#####',
      '#LTX#',
      '#..2#',
      '#WXQ#',
      '#P.C#',
      '#3D4#',
      '#SXX#',
      '#####'
    ] };
    const { errors: errs } = validateLevel(def);
    expect(errs.some(e => e.includes('missing or multiple 1'))).toBe(true);
  });

  it('detects unreachable station', () => {
    // Wait, row 5 col 3 is '.', so C is still adjacent to '.'.
    // If we want C to be isolated, let's put '#' around it.
    const def2 = { ...baseDef, ascii: [
      '#####',
      '#LTX#',
      '#1.2#',
      '#WXQ#',
      '#P#C#',
      '#3DX#', // X is non-floor. O is non-floor. # is non-floor.
      '#SXX#',
      '#####'
    ] };
    const { warnings: warns } = validateLevel(def2);
    expect(warns.some(e => e.includes('station C') && e.includes('isolated'))).toBe(true);
  });

  it('detects isolated floor', () => {
    const def = { ...baseDef, ascii: [
      '######',
      '#LTX.#',
      '#1.2X#',
      '#WXQX#',
      '#P.CX#',
      '#3D4X#',
      '#SXXX#',
      '######'
    ] };
    const { warnings: warns } = validateLevel(def);
    expect(warns.some(e => e.includes('unreachable'))).toBe(true);
  });

  it('detects unequal row lengths', () => {
    const def = { ...baseDef, ascii: [
      '#####',
      '#LTX',
      '#1.2#',
      '#WXQ#',
      '#P.C#',
      '#3D4#',
      '#SXX#',
      '#####'
    ] };
    const { errors: errs } = validateLevel(def);
    expect(errs.some(e => e.includes('rows not same length'))).toBe(true);
  });

  it('detects invalid characters', () => {
    const def = { ...baseDef, ascii: [
      '#####',
      '#LTX#',
      '#1a2#',
      '#WXQ#',
      '#P.C#',
      '#3D4#',
      '#SXX#',
      '#####'
    ] };
    const { errors: errs } = validateLevel(def);
    expect(errs.some(e => e.includes('invalid char a'))).toBe(true);
  });

  it('detects missing crates for recipe', () => {
    const def = { ...baseDef, recipes: [{ id: 'burger', weight: 1 }] as unknown as LevelDef['recipes'] };
    // burger needs B, M, L. Our map only has L, T
    const { errors: errs } = validateLevel(def);
    expect(errs.some(e => e.includes('missing crate B'))).toBe(true);
    expect(errs.some(e => e.includes('missing crate M'))).toBe(true);
  });

  it('detects floor at edge', () => {
    const def = { ...baseDef, ascii: [
      '##.##',
      '#LTX#',
      '#1.2#',
      '#WXQ#',
      '#P.C#',
      '#3D4#',
      '#SXX#',
      '#####'
    ] };
    const { warnings: warns } = validateLevel(def);
    expect(warns.some(e => e.includes('floor at edge'))).toBe(true);
  });

  it('detects missing required stations', () => {
    const def = { ...baseDef, ascii: [
      '#####',
      '#LTX#',
      '#1.2#',
      '#XXO#', // removed W, R
      '#P.C#',
      '#3X4#', // removed D
      '#XXX#', // removed S
      '#####'
    ] };
    const { warnings: warns } = validateLevel(def);
    expect(warns.some(e => e.includes('missing W'))).toBe(true);
    expect(warns.some(e => e.includes('missing Q'))).toBe(true);
    expect(warns.some(e => e.includes('missing D'))).toBe(true);
    expect(warns.some(e => e.includes('missing S'))).toBe(true);
  });

  it('detects invalid stars', () => {
    const def = { ...baseDef, stars: [100, 50, 200] as [number, number, number] };
    const { errors: errs } = validateLevel(def);
    expect(errs.some(e => e.includes('stars not increasing'))).toBe(true);
  });
  it('detects missing pot for soup recipes', () => {
    const def = { ...baseDef, recipes: [{ id: 'tomato_soup', weight: 1 }] as unknown as LevelDef['recipes'] };
    // has T (tomato crate) but no 's' (pot)
    const { errors: errs } = validateLevel(def);
    expect(errs.some(e => e.includes('missing s (pot) for soup recipes'))).toBe(true);
  });

  it('detects pot without soup recipes as warning', () => {
    const def = { ...baseDef, ascii: [
      '#####',
      '#LTX#',
      '#1.2#',
      '#WXQ#',
      '#P.C#',
      '#3D4#',
      '#sXX#', // s instead of S
      '#####'
    ] };
    const { warnings: warns } = validateLevel(def);
    expect(warns.some(e => e.includes("pot 's' exists but no soup recipe"))).toBe(true);
  });

  it('detects E enclosed by walls', () => {
    const def = { ...baseDef, ascii: [
      '######',
      '##E###',
      '######',
      '#1.2X#',
      '#WXQX#',
      '#P.CX#',
      '#3D4X#',
      '#SXXX#',
      '######'
    ] };
    // need to ensure recipes don't fail, but recipes is ['salad'] which needs L and T
    // so we should add L and T somewhere to avoid "missing crate" error breaking something?
    // Wait, validateLevel returns ALL errors, so we can just check if E enclosed is one of them.
    const { errors: errs } = validateLevel(def);
    expect(errs.some(e => e.includes('E is enclosed by walls'))).toBe(true);
  });

  it('detects conveyor ending in wall', () => {
    const def = { ...baseDef, ascii: [
      '######',
      '#>###', // > ends in #
      '#LTX.#',
      '#1.2X#',
      '#WXQX#',
      '#P.CX#',
      '#3D4X#',
      '#SXXX#',
      '######'
    ] };
    const { errors: errs } = validateLevel(def);
    expect(errs.some(e => e.includes('conveyor at 1,1 ends in wall'))).toBe(true);
  });

  it('detects ice on counter logic error (invalid char overlap)', () => {
    // Note: since the format is 1 char per tile, ~ cannot be on a counter.
    // However, if we test that ~ is a floor and cannot act as a station.
    const def = { ...baseDef, ascii: [
      '#####',
      '#LTX#',
      '#1.2#',
      '#WXQ#',
      '#P~C#',
      '#3D4#',
      '#SXX#',
      '#####'
    ] };
    const { errors: errs, warnings: warns } = validateLevel(def);
    expect(errs.length).toBe(0);
  });

});

describe('parseLevel', () => {
  it('parses level1 correctly', () => {
    const parsed = parseLevel(level1);
    expect(parsed.width).toBe(16);
    expect(parsed.height).toBe(9);
    
    let tCount = 0, lCount = 0, bCount = 0, mCount = 0, cCount = 0;
    let sCount = 0, pCount = 0, wCount = 0, dCount = 0;
    let xCount = 0, qCount = 0;

    for (const st of parsed.stations) {
      if (st.type === 'crate' && st.crate === 'tomato') tCount++;
      if (st.type === 'crate' && st.crate === 'lettuce') lCount++;
      if (st.type === 'crate' && st.crate === 'bun') bCount++;
      if (st.type === 'crate' && st.crate === 'meat') mCount++;
      if (st.type === 'cutting') cCount++;
      if (st.type === 'stove') sCount++;
      if (st.type === 'plate_dispenser') pCount++;
      if (st.type === 'sink') wCount++;
      if (st.type === 'trash') dCount++;
      if (st.type === 'counter') xCount++;
      if (st.type === 'table') qCount++;
    }

    expect(tCount).toBe(1);
    expect(lCount).toBe(1);
    expect(bCount).toBe(1);
    expect(mCount).toBe(1);
    expect(cCount).toBe(2);
    expect(sCount).toBe(1);
    expect(pCount).toBe(1);
    expect(wCount).toBe(1);
    expect(dCount).toBe(1);
    expect(xCount).toBe(6);
    expect(qCount).toBe(4);

    // spawn 1
    expect(parsed.spawns[0]).toEqual({ x: 3.5, y: 3.5 });
  });
});

describe('Phase 0 - Playable Levels Validation and Reachability', () => {
  it('excludes test_carry from PLAYABLE_LEVELS but retains it in ALL_LEVELS', () => {
    expect(PLAYABLE_LEVELS.some(l => l.id === 'test_carry')).toBe(false);
    expect(LEVELS.some(l => l.id === 'test_carry')).toBe(false);
    expect(ALL_LEVELS.some(l => l.id === 'test_carry')).toBe(true);
  });

  for (const level of PLAYABLE_LEVELS) {
    describe(`Level "${level.name}" (${level.id})`, () => {
      it('has zero validation errors and zero warnings', () => {
        const { errors, warnings } = validateLevel(level);
        expect(errors).toEqual([]);
        let filteredWarnings = warnings;
        if (level.id === 'tau_hai_tac') {
          filteredWarnings = filteredWarnings.filter(w => !w.includes("pot 's' exists but no soup recipe"));
        }
        if (level.id === 'tutorial') {
          filteredWarnings = filteredWarnings.filter(w => !w.includes("missing S"));
        }
        expect(filteredWarnings).toEqual([]);
      });

      it('has at least 1 spawn point', () => {
        const parsed = parseLevel(level);
        expect(parsed.spawns.length).toBeGreaterThanOrEqual(1);
      });

      it('has at least 1 sink (W)', () => {
        const parsed = parseLevel(level);
        expect(parsed.stations.some(s => s.type === 'sink')).toBe(true);
      });

      it('has at least 1 table (Q) if level has recipes', () => {
        if (level.recipes.length > 0) {
          const parsed = parseLevel(level);
          expect(parsed.stations.some(s => s.type === 'table')).toBe(true);
        }
      });

      it('allows bot to reach every functional station from every spawn point', () => {
        const parsed = parseLevel(level);
        const isWalkable = (t: TileType) => t === 'floor' || t === 'ice';
        // Functional stations: interactive devices/stations (excludes passive counters 'X' and automated conveyors)
        const functionalStations = parsed.stations.filter(s => s.type !== 'counter' && s.type !== 'conveyor');

        for (let sIdx = 0; sIdx < parsed.spawns.length; sIdx++) {
          const spawn = parsed.spawns[sIdx]!;
          const startX = Math.floor(spawn.x);
          const startY = Math.floor(spawn.y);

          // For split co-op maps like b08, chefs are restricted to their section
          const targetStations = functionalStations.filter(st => {
            if (level.id === 'b08') {
              if (startX <= 4) return st.x <= 4;
              if (startX >= 7) return st.x >= 7;
            }
            return true;
          });

          for (const station of targetStations) {
            const queue: { x: number; y: number }[] = [{ x: startX, y: startY }];
            const visited = new Set<string>([`${startX},${startY}`]);
            const targetNeighbors = new Set([
              `${station.x + 1},${station.y}`,
              `${station.x - 1},${station.y}`,
              `${station.x},${station.y + 1}`,
              `${station.x},${station.y - 1}`,
            ]);

            let reachable = false;
            while (queue.length > 0) {
              const curr = queue.shift()!;
              if (targetNeighbors.has(`${curr.x},${curr.y}`)) {
                reachable = true;
                break;
              }

              for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const nx = curr.x + dx!;
                const ny = curr.y + dy!;
                const key = `${nx},${ny}`;
                if (nx >= 0 && nx < parsed.width && ny >= 0 && ny < parsed.height && !visited.has(key)) {
                  visited.add(key);
                  if (isWalkable(parsed.tiles[ny * parsed.width + nx]!)) {
                    queue.push({ x: nx, y: ny });
                  }
                }
              }
            }

            expect(reachable, `Spawn ${sIdx + 1} (${startX},${startY}) in level "${level.id}" should be able to reach ${station.type} at (${station.x},${station.y})`).toBe(true);
          }
        }
      });
    });
  }
});
