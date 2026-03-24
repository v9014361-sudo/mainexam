const mongoose = require('mongoose');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
console.log('Testing connection to:', uri.replace(/:([^@]+)@/, ':****@'));

mongoose.connect(uri)
  .then(() => {
    console.log('✅ SUCCESS: Connected to MongoDB!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ FAILURE:', err.message);
    if (err.message.includes('ECONNREFUSED')) {
      console.log('\n--- DIAGNOSIS ---');
      console.log('Your network is blocking the "mongodb+srv" lookup.');
      console.log('FIX: In Atlas, change your driver version to "2.2.12 or earlier"');
      console.log('and use the "Standard connection string" (it begins with mongodb://)');
    }
    process.exit(1);
  });
