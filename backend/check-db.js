import initSqlJs from 'sql.js';
import fs from 'fs';

const SQL = await initSqlJs();
const buffer = fs.readFileSync('./data/wind_data.db');
const db = new SQL.Database(buffer);

const countResult = db.exec('SELECT COUNT(*) as count FROM wind_data');
const recordCount = countResult[0]?.values[0]?.[0] || 0;

const recentResult = db.exec('SELECT timestamp, wind_speed_knots FROM wind_data ORDER BY timestamp DESC LIMIT 12');

console.log(`\n📊 Database Statistics:`);
console.log(`   Total records: ${recordCount}`);
console.log(`\n📝 Recent 12 records:`);
if (recentResult.length > 0 && recentResult[0].values.length > 0) {
  recentResult[0].values.forEach((row, index) => {
    console.log(`   ${index + 1}. ${row[0]} - ${row[1]} knots`);
  });
} else {
  console.log('   No records found');
}

db.close();
