const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();

async function run() {
  try {
    const q = await yahooFinance.quote('^IXIC');
    console.log(q.symbol, q.regularMarketPrice);
    const chart = await yahooFinance.historical('^IXIC', { period1: '2023-01-01', interval: '1mo' });
    console.log("chart points:", chart.length);
  } catch (err) {
    console.error(err);
  }
}
run();
