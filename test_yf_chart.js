const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();

async function run() {
  try {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    // Test chart()
    const chart = await yahooFinance.chart('^IXIC', { period1: oneYearAgo, interval: '1mo' });
    console.log("chart quotes:", chart.quotes.length);
    console.log("first quote:", chart.quotes[0]);
  } catch (err) {
    console.error(err);
  }
}
run();
