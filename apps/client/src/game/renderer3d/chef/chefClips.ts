export const CHEF_ANIMATION_ALIASES: Record<string, string[]> = {
  idle: ['idle', 'breathing idle', 'idle_a'],
  run: ['run', 'walking', 'running', 'walk'],
  interact: ['interact', 'cheering', 'cheer', 'action'],
  carry_idle: ['carry_idle', 'carrying', 'carry'],
  carry_run: ['carry_run', 'jogging with box', 'jogging_with_box', 'carry', 'holding', 'idle_carry'],
  throw: ['throw', 'toss'],
  dash: ['dash', 'sprint'],
  chop: ['chop', 'great sword attack', 'interact', 'action']
};

export function findClip(clips: any[], state: string): any {
  // First try direct match with state name (e.g. idle, run, carry_idle, carry_run)
  const direct = clips.find((c: any) => c.name.toLowerCase() === state.toLowerCase());
  if (direct) return direct;

  // Then try aliases
  const aliases = CHEF_ANIMATION_ALIASES[state] || [state];
  for (const alias of aliases) {
    const found = clips.find((c: any) => c.name.toLowerCase() === alias.toLowerCase());
    if (found) return found;
  }
  return null;
}
