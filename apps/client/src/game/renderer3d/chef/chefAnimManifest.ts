export const CHEF_ANIM_MANIFEST: Record<string, { file: string, loop: boolean, note: string }> = {
  idle: { file: 'idle.fbx', loop: true, note: 'Breathing Idle' },
  walk: { file: 'Running.fbx', loop: true, note: 'Running' },
  standard_walk: { file: 'standard_walk.fbx', loop: true, note: 'Standard Walk' },
  carry_idle: { file: 'carry_idle.fbx', loop: true, note: 'Carrying' },
  carry_run: { file: 'carry_run.fbx', loop: true, note: 'Jogging With Box' },
  sprint: { file: 'sprint.fbx', loop: true, note: 'Sprint' },
  throw: { file: 'throw.fbx', loop: false, note: 'Throw' },
  terrified: { file: 'terrified.fbx', loop: true, note: 'Terrified' },
  cheering: { file: 'cheering.fbx', loop: false, note: 'Cheering' },
  wiping_sweat: { file: 'wiping_sweat.fbx', loop: true, note: 'Wiping Sweat' },
  sitting: { file: 'sitting.fbx', loop: true, note: 'Sitting' },
  sitting_angry: { file: 'sitting_angry.fbx', loop: true, note: 'Sitting Angry' }
};
