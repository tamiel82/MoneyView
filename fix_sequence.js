const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fix() {
  console.log('Incrementing sequence...');
  for (let i = 0; i < 200; i++) {
    const { error } = await supabase.from('categories').insert([{ merchant: 'temp_merchant', category: 'temp' }]);
    if (!error) {
      console.log('Sequence caught up! Insert succeeded.');
      break;
    }
  }
  // cleanup
  await supabase.from('categories').delete().eq('merchant', 'temp_merchant');
  console.log('Done fixing sequence.');
}

fix();
