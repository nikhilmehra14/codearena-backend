const { PrismaClient } = require('@prisma/client');
const redis = require('../src/config/redis');
const config = require('../src/config/config');

const prisma = new PrismaClient();

async function clearAndSync() {
  try {
    console.log('\n🗑️  Step 1: Clearing Database...');
    const deleteResult = await prisma.contest.deleteMany({});
    console.log(`✅ Deleted ${deleteResult.count} contests from database`);

    console.log('\n🗑️  Step 2: Clearing Redis Cache...');
    try {
      const client = await redis.getClient();
      if (client) {
        await client.flushAll();
        console.log('✅ Redis cache cleared');
      } else {
        console.log('⚠️  Redis not available');
      }
    } catch (err) {
      console.log('⚠️  Redis cache clearing skipped:', err.message);
    }

    console.log('\n✅ All data cleared successfully!');
    console.log('\n📝 Next Steps:');
    console.log('1. Server is still running - no need to restart');
    console.log('2. Syncing fresh contests now...\n');

    // Trigger sync via HTTP request
    const http = require('http');
    const https = require('https');
    
    const backendURL = new URL(config.urls.backend || 'http://localhost:5000');
    const protocol = backendURL.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: backendURL.hostname,
      port: backendURL.port || (backendURL.protocol === 'https:' ? 443 : 80),
      path: `/${config.apiVersion}/contests/sync`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    };

    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.success) {
            console.log(`✅ Synced ${result.data.synced} contests from Clist.by API!`);
            console.log(`\n📊 Test the results:`);
            console.log(`   GET ${config.urls.backend}/${config.apiVersion}/contests?limit=50\n`);
          } else {
            console.log('⚠️  Sync response:', data);
          }
        } catch (e) {
          console.log('Response:', data);
        }
        cleanup();
      });
    });

    req.on('error', (error) => {
      console.error('❌ Server not running. Please:');
      console.log('1. Start server: npm start');
      console.log(`2. Then run: POST ${config.urls.backend}/${config.apiVersion}/contests/sync\n`);
      cleanup();
    });

    req.end();

  } catch (error) {
    console.error('❌ Error:', error.message);
    cleanup();
  }
}

async function cleanup() {
  await prisma.$disconnect();
  process.exit(0);
}

clearAndSync();
