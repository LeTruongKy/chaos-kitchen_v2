import { LEVELS } from '../src/levels/index.js';
import { validateLevel } from '../src/level.js';

let hasErrors = false;

for (const level of LEVELS) {
  const { errors, warnings } = validateLevel(level);
  
  if (errors.length > 0 || warnings.length > 0) {
    console.log(`Level "${level.name}" (${level.id}):`);
    for (const w of warnings) {
      console.log(`  [WARN] ${w}`);
    }
    for (const e of errors) {
      console.log(`  [ERROR] ${e}`);
    }
    if (errors.length > 0) {
      hasErrors = true;
    }
  }
}

if (!hasErrors) {
  console.log('All levels validated successfully.');
} else {
  console.error('Validation failed due to errors.');
  process.exit(1);
}
