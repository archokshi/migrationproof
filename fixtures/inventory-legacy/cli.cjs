const { parseCsv } = require('./csv.cjs');
const { normalize } = require('./normalize.cjs');
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  try {
    process.stdout.write(`${JSON.stringify(normalize(parseCsv(input)))}\n`);
  } catch (error) {
    process.stderr.write(`${JSON.stringify({ error: error.message })}\n`);
    process.exitCode = 1;
  }
});
