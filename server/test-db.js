const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ FAILURE: MONGODB_URI is not defined in .env file');
  process.exit(1);
}

console.log('Testing connection to:', uri.replace(/:([^@]+)@/, ':****@'));

mongoose.connect(uri)
  .then(() => {
    console.log('✅ SUCCESS: Connected to MongoDB!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ FAILURE:', err.message);
    if (err.message.includes('ECONNREFUSED' || err.message.includes('queryTxt ETIMEOUT'))) {
      console.log('\n--- DIAGNOSIS ---');
      console.log('Your network is blocking the "mongodb+srv" lookup or connection.');
      console.log('FIX: In Atlas, change your driver version to "2.2.12 or earlier"');
      console.log('and use the "Standard connection string" (it begins with mongodb://)');
    }
    process.exit(1);
  });
