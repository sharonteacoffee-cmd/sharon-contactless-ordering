import '../config/app.config';
import { dbPool } from '../database/connection';
import { seedDevelopmentData } from './dev.seed';
import { seedReferenceData } from './reference.seed';

async function runAllSeeds(): Promise<void> {
  try {
    console.log(`[seed] Running reference seed (NODE_ENV=${process.env.NODE_ENV ?? 'development'})...`);
    await seedReferenceData();

    if (process.env.NODE_ENV === 'development') {
      console.log('[seed] NODE_ENV=development detected; running dev seed...');
      await seedDevelopmentData();
    } else {
      console.log('[seed] Skipping dev.seed.ts (non-development environment).');
    }

    console.log('[seed] Completed successfully.');
  } finally {
    await dbPool.end();
  }
}

runAllSeeds().catch((err) => {
  console.error('[seed] Failed:', err);
  process.exit(1);
});
