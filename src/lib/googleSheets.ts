import { google } from 'googleapis';
import { supabase } from './supabase';

export async function getSheetsClient() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

  if (!clientEmail || !privateKey || !spreadsheetId) {
    throw new Error('Google Sheets credentials are not fully set in .env.local');
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  return { sheets, spreadsheetId };
}

/**
 * Syncs the entire transactions table to a sheet named "DB_Transactions"
 * This is meant to be called asynchronously in the background.
 */
export async function syncTransactionsToSheet() {
  try {
    const { sheets, spreadsheetId } = await getSheetsClient();
    
    // Fetch all transactions from Supabase
    const { data: rows, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false });

    if (error) throw error;
    if (!rows) return;

    // Prepare data
    const header = ['ID', 'Date', 'Content', 'Amount', 'Category', 'Type', 'Merchant', 'OrderNo', 'PaymentMethod', 'BusinessNum', 'Note', 'Status', 'CreatedAt', 'UpdatedAt'];
    const values = [header];

    for (const r of rows) {
      values.push([
        r.id, r.date, r.content, r.amount, r.category, r.type, r.merchant, 
        r.orderNo, r.paymentMethod, r.businessNum, r.note, r.status, 
        r.createdAt, r.updatedAt
      ]);
    }

    // Try to update the sheet. If it doesn't exist, this might throw an error.
    // Assuming the user creates a sheet named "DB_Transactions" or we create it.
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'DB_Transactions!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });

    console.log('Successfully synced transactions to Google Sheets');
  } catch (error) {
    console.error('Error syncing transactions to Google Sheets:', error);
  }
}

/**
 * Syncs monthly_stats to "DB_MonthlyStats"
 */
export async function syncMonthlyStatsToSheet() {
  try {
    const { sheets, spreadsheetId } = await getSheetsClient();
    
    const { data: rows, error } = await supabase
      .from('monthly_stats')
      .select('*')
      .order('month', { ascending: true });

    if (error) throw error;
    if (!rows) return;

    const header = ['Month', 'Real Estate', 'Liability Expr', 'UpdatedAt'];
    const values = [header];

    for (const r of rows) {
      values.push([r.month, r.real_estate, r.liability_expr, r.updatedAt]);
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'DB_MonthlyStats!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });

    console.log('Successfully synced monthly stats to Google Sheets');
  } catch (error) {
    console.error('Error syncing monthly stats to Google Sheets:', error);
  }
}

/**
 * Imports data from Google Sheets ("DB_Transactions", "DB_MonthlyStats") back into Supabase.
 * Useful for restoring from backup.
 */
export async function importFromSheetToSupabase() {
  const { sheets, spreadsheetId } = await getSheetsClient();
  
  // 1. Import Transactions
  try {
    const txResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'DB_Transactions!A2:N', // skip header
    });
    const txRows = txResponse.data.values;

    if (txRows && txRows.length > 0) {
      const transactionsToInsert = txRows.map(r => ({
        id: Number(r[0]),
        date: r[1],
        content: r[2],
        amount: Number(r[3]),
        category: r[4],
        type: r[5],
        merchant: r[6],
        orderNo: r[7],
        paymentMethod: r[8],
        businessNum: r[9],
        note: r[10],
        status: r[11],
        createdAt: r[12],
        updatedAt: r[13]
      }));

      // Chunk insertion to avoid payload limits
      const chunkSize = 500;
      for (let i = 0; i < transactionsToInsert.length; i += chunkSize) {
        const chunk = transactionsToInsert.slice(i, i + chunkSize);
        const { error } = await supabase.from('transactions').upsert(chunk);
        if (error) console.error('Error importing transactions chunk:', error);
      }
      console.log(`Imported ${transactionsToInsert.length} transactions from Sheets.`);
    }
  } catch (e) {
    console.log('Could not import transactions. Sheet might not exist or be empty.');
  }

  // 2. Import Monthly Stats
  try {
    const msResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'DB_MonthlyStats!A2:D',
    });
    const msRows = msResponse.data.values;

    if (msRows && msRows.length > 0) {
      const statsToInsert = msRows.map(r => ({
        month: r[0],
        real_estate: Number(r[1]),
        liability_expr: r[2],
        updatedAt: r[3]
      }));

      const { error } = await supabase.from('monthly_stats').upsert(statsToInsert, { onConflict: 'month' });
      if (error) console.error('Error importing monthly stats:', error);
      else console.log(`Imported ${statsToInsert.length} monthly stats from Sheets.`);
    }
  } catch (e) {
    console.log('Could not import monthly stats. Sheet might not exist or be empty.');
  }
}

