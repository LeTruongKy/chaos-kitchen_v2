import { describe, it, expect } from 'vitest';
import { createGameState } from '../sim/createState';
import { step } from '../sim/step';
import { ALL_LEVELS } from '../levels';
import * as crypto from 'crypto';

describe('B11 - Golden Hashes', () => {
  it('should generate deterministic states for all levels', () => {
    const hashes: Record<string, string> = {};

    for (const level of ALL_LEVELS) {
      // Create state with a fixed seed
      const players = level.id === 'tutorial' || level.id === 'test_carry' ? ['p1'] : ['p1', 'p2'];
      const state = createGameState(level, players, 424242);
      
      // Run simulation for exactly 300 ticks (10s)
      for (let tick = 0; tick < 300; tick++) {
        // Deterministic pseudo-random input based on tick
        const mx = tick % 3 === 0 ? 1 : (tick % 3 === 1 ? -1 : 0);
        const my = tick % 2 === 0 ? 1 : -1;
        const interact = tick % 5 === 0;
        const act = tick % 7 === 0;
        const throwObj = tick % 11 === 0;
        const dash = tick % 13 === 0;

        step(state, {
          p1: { seq: tick, mx, my, interact, act, dash, throw: throwObj },
          p2: { seq: tick, mx: -mx as 0|1|-1, my: -my as 0|1|-1, interact: false, act: false, dash: false, throw: false }
        });
      }

      // Hash the final state
      const stateString = JSON.stringify(state);
      const hash = crypto.createHash('sha256').update(stateString).digest('hex');
      hashes[level.id] = hash;
    }

    // Hardcoded golden hashes for verification
    expect(hashes).toMatchInlineSnapshot(`
      {
        "b08": "d412ad59c7d936b9b1c8484c4d60a4f8bffd587dc280433e161afea133a0814c",
        "bep_doi": "fd9eaabe1eda5c66ee4f5ba8450b1cfd13f4ff355c100ff4d298a2f3242fd58f",
        "bep_lo_nuong": "8061ba8da3315aa49181f440ce52ff802ded4ebc8de3205bf1cecf3d66be1676",
        "dai_tiec_ngan_ha": "f81d023d74b3b9a080f358586c7411ec2fbb075e5bc19d1b4f18c7008b8150c8",
        "dao_kho_bau": "6e4a50dd1fbeb883126ed41ac26e2b2d42e9e5f1f67c1398f088dc0e4676d1b9",
        "level1": "936e7fe9a33f8cfaa98756fa095c60da2be402e278e4da2b82f977506a9173ac",
        "level2": "f695482701c821fedcff82e341df085209f1e373a2d202c3dafdeb7dd0c306ba",
        "level3": "22ce5cf9630770b19bdbe7a70dd5acab7b64433cef42781ce215213d84e34bdf",
        "nha_hang_mo": "85d3f52d59919349f92b8c91957d7076297e09285949f76723b8556257bc4e75",
        "quan_an_duong_pho": "e5180f060d3ac73268c81cc75ccda2c0361e68074035de77f5ca048a76177d4d",
        "tau_hai_tac": "c507ad55055de347aae8445dd5f7e3da62e5af54a389e0952eeafc044e412792",
        "test_carry": "562035528d9bf9cc552bfff92d0bdb5bcf92a7265f807bce8c833454c85a8024",
        "tram_vu_tru": "4bad968c7368fc171f3a0d924e3d53eb9cafebd4e0ca9c000bbdacf4307ceb4d",
        "tutorial": "45d162e6c55ff26b7311442267f65ac91b716000d1aee95f1ed8c3606e992321",
      }
    `);
  });
});
