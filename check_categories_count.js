const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('categories')
    .insert([{ merchant: 'test_insert_' + Date.now(), category: '기타' }])
    .select();
  
  if (error) {
    console.error('Insert error:', error);
  } else {
    console.log('Inserted successfully:', data);
    // cleanup
    await supabase.from('categories').delete().eq('id', data[0].id);
  }
}

check();
