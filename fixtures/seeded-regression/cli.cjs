const { parseCsv } = require('../inventory-legacy/csv.cjs');
const { normalize } = require('../inventory-legacy/normalize.cjs');
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const records = normalize(parseCsv(input));
    for (const row of records) row.id = String(Number(row.id));
    process.stdout.write(`${JSON.stringify(records)}\n`);
  } catch (error) {
    process.stderr.write(`${JSON.stringify({ error: error.message })}\n`);
    process.exitCode = 1;
  }
});
