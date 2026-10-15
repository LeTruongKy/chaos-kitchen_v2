import { describe, it, expect, beforeEach } from 'vitest';
import { Predictor } from '../game/Predictor';
import { TileType, PlayerInput, simulateMove } from '@kitchen/core';

describe('Predictor', () => {
  let tiles: TileType[];
  const width = 3;
  const height = 3;
  
  // A 3x3 empty room surrounded by counters
  // (0,0) (1,0) (2,0)
  // (0,1) (1,1) (2,1)
  // (0,2) (1,2) (2,2)
  
  beforeEach(() => {
    tiles = [
      'counter', 'counter', 'counter',
      'counter', 'floor',   'counter',
      'counter', 'counter', 'counter',
    ];
  });

  it('matches server perfectly when there is no error', () => {
    const p = new Predictor({ x: 1.5, y: 1.5, vx: 0, vy: 0, fx: 0, fy: 1, dashT: 0, dashCd: 0 }, tiles, width, height);
    
    const input: PlayerInput = { seq: 1, act: false, interact: false, mx: 1, my: 0, dash: false, throw: false };
    p.applyLocalInput(input);
    
    // Server processed input 1 and returned snapshot
    const serverState = { x: 1.5 + (5.0 / 30), y: 1.5, vx: 5.0, vy: 0, fx: 1, fy: 0, dashT: 0, dashCd: 0 };
    p.onSnapshot(serverState, 1);
    
    const trueState = p.getTrueState();
    expect(trueState.x).toBeCloseTo(serverState.x, 6);
    expect(trueState.y).toBeCloseTo(serverState.y, 6);
    expect(trueState.fx).toBe(1);
    expect(trueState.fy).toBe(0);
  });

  it('reconciles correctly when server rejects movement', () => {
    // Imagine client moves right into a wall but local tiles say it's empty
    // Actually we provide same tiles, so client will also hit wall. 
    // Let's force an error by giving snapshot that differs.
    const p = new Predictor({ x: 1.5, y: 1.5, vx: 2.6, vy: 0, fx: 1, fy: 0, dashT: 0, dashCd: 0 }, tiles, width, height);
    
    const input: PlayerInput = { seq: 1, act: false, interact: false, mx: 1, my: 0, dash: false, throw: false };
    p.applyLocalInput(input); // Client thinks it moved right
    
    // But server says no, you are at 1.5, 1.5 (e.g. pushed by other player)
    p.onSnapshot({ x: 1.5, y: 1.5, vx: 0, vy: 0, fx: 1, fy: 0, dashT: 0, dashCd: 0 }, 1);
    
    // True state should snap to server's state since there are no more pending inputs
    const trueState = p.getTrueState();
    expect(trueState.x).toBeCloseTo(1.5, 6);
    
    // Display state should have error (> 0.05, so displayState shouldn't snap yet, it will lerp)
    const displayState = p.getDisplayState();
    expect(displayState.x).toBeGreaterThan(1.55); 
    
    const beforeLerpX = displayState.x;
    p.updateDisplay(100);
    expect(p.getDisplayState().x).toBeLessThan(beforeLerpX);
    expect(p.getDisplayState().x).toBeGreaterThan(1.5);
  });

  it('matches server after 6 unacked ticks with dash', () => {
    // 5x5 empty room
    const bigTiles = Array(25).fill('floor') as TileType[];
    const p = new Predictor({ x: 2.5, y: 2.5, vx: 0, vy: 0, fx: 0, fy: 1, dashT: 0, dashCd: 0 }, bigTiles, 5, 5);
    
    // Simulate server side with same initial state
    let serverState = { x: 2.5, y: 2.5, vx: 0, vy: 0, fx: 0, fy: 1, dashT: 0, dashCd: 0 };
    
    // Client applies 6 inputs locally (seq 1 to 6)
    // Tick 1: move right
    // Tick 2: move right + dash
    // Tick 3-6: continue right
    for (let seq = 1; seq <= 6; seq++) {
      const isDash = (seq === 2);
      const input: PlayerInput = { seq, act: false, interact: false, mx: 1, my: 0, dash: isDash, throw: false };
      p.applyLocalInput(input);
    }

    // Now server processes only up to seq 1 (Snapshot delayed by 5 ticks)
    // Actually, snapshot represents server state AFTER processing seq 1
    // Server processes seq 1:
    serverState = simulateMove(serverState, 1, 0, false, bigTiles, 5, 5, 1/30);
    
    // Server sends snapshot for ackSeq=1
    p.onSnapshot(serverState, 1);
    
    // Now predictor's trueState should exactly match the result of server processing all 6 ticks
    // Let's compute server true result by processing seq 2..6
    for (let seq = 2; seq <= 6; seq++) {
      const isDash = (seq === 2);
      serverState = simulateMove(serverState, 1, 0, isDash, bigTiles, 5, 5, 1/30);
    }
    
    const trueState = p.getTrueState();
    expect(trueState.x).toBeCloseTo(serverState.x, 6);
    expect(trueState.y).toBeCloseTo(serverState.y, 6);
    expect(trueState.vx).toBeCloseTo(serverState.vx, 6);
    expect(trueState.dashT).toBeCloseTo(serverState.dashT, 6);
  });
});
