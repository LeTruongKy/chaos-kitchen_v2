const NAME_KEY = 'ck_name';

export function readPlayerName(): string {
  try { return localStorage.getItem(NAME_KEY) ?? ''; } catch (error) { void error; return ''; }
}

export function savePlayerName(name: string): void {
  try { localStorage.setItem(NAME_KEY, name); } catch (error) { void error; }
}
