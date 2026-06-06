const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixTxSeq() {
  const { data: maxIdData } = await supabase.from('transactions').select('id').order('id', { ascending: false }).limit(1);
  const maxId = maxIdData[0]?.id || 0;
  console.log("Max ID is:", maxId);

  console.log('Hammering sequence with concurrent inserts...');
  const CONCURRENCY = 200;
  let currentSeq = 0;
  
  // We'll track the sequence roughly by catching the error message
  while (true) {
    const promises = [];
    for (let i = 0; i < CONCURRENCY; i++) {
      promises.push(supabase.from('transactions').insert([{ 
        date: '2026-06-07', content: 'temp_tx', amount: 1, type: 'EXPENSE' 
      }]));
    }
    
    const results = await Promise.all(promises);
    
    // Check if any succeeded
    const success = results.find(r => !r.error);
    if (success) {
      console.log('Sequence caught up! Insert succeeded.');
      break;
    }
    
    // Log progress from the first error of the batch
    const err = results[0].error;
    if (err && err.details) {
      const match = err.details.match(/id\)=\((\d+)\)/);
      if (match) {
        currentSeq = parseInt(match[1]);
        console.log(`Current Sequence is around: ${currentSeq} / ${maxId}`);
        if (currentSeq > maxId) {
           break;
        }
      }
    }
  }

  // cleanup
  await supabase.from('transactions').delete().eq('content', 'temp_tx');
  console.log('Done fixing sequence.');
}

fixTxSeq();
