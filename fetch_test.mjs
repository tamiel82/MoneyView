import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse .env.local
const envPath = path.resolve(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.replace(/\r/g, '').match(/^([^=]+)=(.*)$/);
  if (match) {
    let key = match[1].trim();
    let value = match[2].trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1).replace(/\\n/g, '\n');
    }
    env[key] = value;
  }
});

async function main() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: env.GOOGLE_PRIVATE_KEY,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    
    console.log("Fetching '포트폴리오' tab...");
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: env.GOOGLE_SHEETS_ID,
      range: '포트폴리오!A1:Z50', 
    });
    
    fs.writeFileSync('sheet_dump.json', JSON.stringify(response.data.values, null, 2));
    console.log("Successfully fetched sheet data and saved to sheet_dump.json");
  } catch (err) {
    console.error('Error fetching sheets:', err.message);
  }
}

main();
