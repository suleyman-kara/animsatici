import assert from 'node:assert/strict';
import axios from 'axios';
import { server } from './src/server.js';

const BASE_URL = 'http://localhost:3001';

async function runApiTests() {
  console.log('\n🚀 --- API Sunucusu Testleri Başlıyor ---\n');

  try {
    // 1. Health check
    const health = await axios.get(`${BASE_URL}/api/health`);
    assert.equal(health.status, 200);
    assert.equal(health.data.status, 'ok');
    console.log('  ✅ [PASS] GET /api/health');

    // 2. List monitors
    const listBefore = await axios.get(`${BASE_URL}/api/monitors`);
    assert.equal(listBefore.status, 200);
    assert.equal(listBefore.data.success, true);
    assert.ok(Array.isArray(listBefore.data.monitors));
    console.log('  ✅ [PASS] GET /api/monitors');

    // 3. Add monitor
    const createRes = await axios.post(`${BASE_URL}/api/monitors`, {
      title: 'İTÜ Test Duyurular',
      url: 'https://example.com',
      userEmail: 'test@example.com',
      userId: 'test_user_ceng'
    });
    assert.equal(createRes.status, 201);
    assert.equal(createRes.data.success, true);
    assert.equal(createRes.data.monitor.userId, 'test_user_ceng');
    const newId = createRes.data.monitor.id;
    assert.ok(newId);
    console.log('  ✅ [PASS] POST /api/monitors (ID: ' + newId + ' with userId)');

    // 3.1 Verify user scoping filter
    const userMonitors = await axios.get(`${BASE_URL}/api/monitors?userId=test_user_ceng`);
    assert.equal(userMonitors.status, 200);
    assert.ok(userMonitors.data.monitors.some(m => m.id === newId));
    console.log('  ✅ [PASS] GET /api/monitors?userId=test_user_ceng (User Scoping)');

    // 4. Delete monitor
    const delRes = await axios.delete(`${BASE_URL}/api/monitors/${newId}`);
    assert.equal(delRes.status, 200);
    assert.equal(delRes.data.success, true);
    console.log('  ✅ [PASS] DELETE /api/monitors/:id');

    // 5. Get Catalog items and categories
    const catalogRes = await axios.get(`${BASE_URL}/api/catalog`);
    assert.equal(catalogRes.status, 200);
    assert.equal(catalogRes.data.success, true);
    assert.ok(catalogRes.data.items.length > 0);
    assert.ok(catalogRes.data.categories.length > 0);
    console.log(`  ✅ [PASS] GET /api/catalog (${catalogRes.data.total} kanal listelendi)`);

    // 6. Filter Catalog by category
    const filteredRes = await axios.get(`${BASE_URL}/api/catalog?category=ceng`);
    assert.equal(filteredRes.status, 200);
    assert.ok(filteredRes.data.items.every(i => i.category === 'ceng'));
    console.log(`  ✅ [PASS] GET /api/catalog?category=ceng (${filteredRes.data.total} CENG kanalı filtrelendi)`);

    // 7. Suggest channel to Candidate Pool (Crowdsourcing)
    const suggestRes = await axios.post(`${BASE_URL}/api/catalog/suggest`, {
      title: 'ODTÜ Robot Topluluğu',
      url: 'https://robot.metu.edu.tr',
      category: 'campus',
      suggestedBy: 'student@metu.edu.tr'
    });
    assert.equal(suggestRes.status, 201);
    assert.equal(suggestRes.data.success, true);
    console.log('  ✅ [PASS] POST /api/catalog/suggest (Aday havuzuna eklendi)');

    console.log('\n🎉 Tüm API testleri başarıyla geçti!\n');
  } catch (err) {
    console.error('❌ API Test Hatası:', err.message);
    process.exitCode = 1;
  } finally {
    server.close(() => {
      process.exit(process.exitCode || 0);
    });
    // Fallback if sockets linger
    setTimeout(() => process.exit(process.exitCode || 0), 500);
  }
}

runApiTests();
