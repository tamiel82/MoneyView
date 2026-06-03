import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// I need the old portfolioService code here to dump its result
// I will just read scratch/old_portfolioService.ts and change export to execute
// Wait, I can just dynamically import it if I copy it to a proper TS file.
