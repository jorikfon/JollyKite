import initSqlJs from 'sql.js';
import fs from 'fs';

const SQL = await initSqlJs();
const buffer = fs.readFileSync('./data/wind_data.db');
const db = new SQL.Database(buffer);

console.log('\n🔍 Testing trend calculation queries:\n');

// Test current (last 6 records)
const currentResult = db.exec(`
  SELECT AVG(wind_speed_knots) as avg_speed, COUNT(*) as count
  FROM (
    SELECT wind_speed_knots
    FROM wind_data
    ORDER BY timestamp DESC
    LIMIT 6
  )
`);

console.log('Current result (last 6 records):');
console.log('  Length:', currentResult.length);
if (currentResult.length > 0) {
  console.log('  Values length:', currentResult[0].values.length);
  console.log('  Data:', currentResult[0].values);
}

// Test previous (records 7-12)
const previousResult = db.exec(`
  SELECT AVG(wind_speed_knots) as avg_speed, COUNT(*) as count
  FROM (
    SELECT wind_speed_knots
    FROM wind_data
    ORDER BY timestamp DESC
    LIMIT 6 OFFSET 6
  )
`);

console.log('\nPrevious result (records 7-12):');
console.log('  Length:', previousResult.length);
if (previousResult.length > 0) {
  console.log('  Values length:', previousResult[0].values.length);
  console.log('  Data:', previousResult[0].values);
}

db.close();
