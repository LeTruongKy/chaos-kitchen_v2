import { PlayerInput, TileType, simulateMove, SIM_HZ } from '@kitchen/core';

export interface PredictedState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx: number;
  fy: number;
  dashT: number;
  dashCd: number;
}

export class Predictor {
  private baseState: PredictedState; // Authoritative state from last snapshot
  private trueState: PredictedState; // Our actual simulated state after all local inputs
  private displayState: PredictedState; // Interpolated state for rendering
  
  private unackedInputs: PlayerInput[] = [];

  constructor(
    initialState: PredictedState,
    private tiles: TileType[],
    private width: number,
    private height: number
  ) {
    this.baseState = { ...initialState };
    this.trueState = { ...initialState };
    this.displayState = { ...initialState };
  }

  public applyLocalInput(input: PlayerInput) {
    this.unackedInputs.push(input);
    const dt = 1 / SIM_HZ;
    const oldX = this.trueState.x;
    const oldY = this.trueState.y;
    
    this.trueState = simulateMove(
      this.trueState,
      input.mx, input.my, input.dash,
      this.tiles, this.width, this.height,
      dt
    );
    
    this.displayState.x += (this.trueState.x - oldX);
    this.displayState.y += (this.trueState.y - oldY);
    this.displayState.fx = this.trueState.fx;
    this.displayState.fy = this.trueState.fy;
  }

  public onSnapshot(snapshotState: PredictedState, ackSeq: number) {
    this.baseState = { ...snapshotState };
    // Remove inputs that have been acked
    this.unackedInputs = this.unackedInputs.filter(input => input.seq > ackSeq);
    
    // Replay remaining inputs
    let state = { ...this.baseState };
    const dt = 1 / SIM_HZ;
    for (const input of this.unackedInputs) {
      state = simulateMove(
        state,
        input.mx, input.my, input.dash,
        this.tiles, this.width, this.height,
        dt
      );
    }
    
    this.trueState = state;
    
    // Smooth reconciliation (lerp display state)
    const dx = this.displayState.x - this.trueState.x;
    const dy = this.displayState.y - this.trueState.y;
    const distSq = dx * dx + dy * dy;
    
    // > 1.5 tiles away -> snap
    if (distSq > 1.5 * 1.5) {
      this.displayState.x = this.trueState.x;
      this.displayState.y = this.trueState.y;
    } else if (distSq < 0.05 * 0.05) {
      // < 0.05 tiles away -> snap
      this.displayState.x = this.trueState.x;
      this.displayState.y = this.trueState.y;
    }
    // Else leave displayState alone, let updateDisplay lerp it
    
    this.displayState.fx = this.trueState.fx;
    this.displayState.fy = this.trueState.fy;
    this.displayState.vx = this.trueState.vx;
    this.displayState.vy = this.trueState.vy;
  }

  public updateDisplay(deltaMs: number) {
    // We also want to apply any local movement into the displayState immediately?
    // Wait, trueState moves, and displayState lerps towards trueState. 
    // If we only lerp, it will feel delayed.
    // Instead, trueState advances instantly. 
    // If there is an error from a bad prediction, the difference (trueState - displayState) is the error.
    // We should lerp the error to 0.
    // Lerp towards true state (effectively decaying the error)
    // 100ms half-life
    const halfLife = 100;
    const factor = 1 - Math.pow(0.5, deltaMs / halfLife);
    
    this.displayState.x += (this.trueState.x - this.displayState.x) * factor;
    this.displayState.y += (this.trueState.y - this.displayState.y) * factor;

    // Ensure it doesn't overshoot
    if (Math.abs(this.displayState.x - this.trueState.x) < 0.01) {
      this.displayState.x = this.trueState.x;
    }
    if (Math.abs(this.displayState.y - this.trueState.y) < 0.01) {
      this.displayState.y = this.trueState.y;
    }
  }

  public getDisplayState(): PredictedState {
    return this.displayState;
  }
  
  public getTrueState(): PredictedState {
    return this.trueState;
  }
}
