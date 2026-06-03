const fs = require('fs');
const { google } = require('googleapis');

// Parse .env.local manually
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split(/\r?\n/).forEach(line => {
  if (line.trim().startsWith('#')) return;
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    }
    env[match[1]] = val;
  }
});

async function dumpSheet() {
  const clientEmail = env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const spreadsheetId = env.GOOGLE_SHEETS_ID;

  if (!clientEmail || !privateKey || !spreadsheetId) {
    console.error('Missing env vars');
    return;
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '포트폴리오!A1:Z15', 
    });
    
    fs.writeFileSync('portfolio_dump.json', JSON.stringify(response.data.values, null, 2));
    console.log('Dumped to portfolio_dump.json');
  } catch (err) {
    console.error('Error fetching sheet:', err.message);
  }
}

dumpSheet();
