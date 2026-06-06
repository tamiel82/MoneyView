const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMaxDate() {
  const { data, error } = await supabase
      .from('transactions')
      .select('date')
      .like('date', '20%')
      .order('date', { ascending: false })
      .limit(5);
  
  console.log("Top 5 descending valid dates:", data);
}

checkMaxDate();
