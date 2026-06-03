import { supabase } from '../supabase';
import { RawTransaction } from './types';

export async function classifyTransactions(transactions: RawTransaction[]): Promise<(RawTransaction & { category: string | null })[]> {
  // Load all rules
  const { data: rulesData, error } = await supabase.from('categories').select('merchant, category');
  if (error) {
    console.error('Error fetching categories from Supabase:', error);
    return transactions.map(t => ({ ...t, category: null }));
  }
  
  const rules = rulesData || [];
  
  // Sort rules by length descending to match longest specific string first
  rules.sort((a, b) => b.merchant.length - a.merchant.length);

  return transactions.map(t => {
    let matchedCategory: string | null = null;
    
    if (t.merchant) {
      // Find a rule where the transaction's merchant includes the rule's merchant
      for (const rule of rules) {
        if (t.merchant.includes(rule.merchant)) {
          matchedCategory = rule.category;
          break;
        }
      }
    }

    return {
      ...t,
      category: matchedCategory
    };
  });
}
