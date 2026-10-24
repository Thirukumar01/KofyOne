const routes = [
  { path: '/login', expectedStatus: 200 },
  { path: '/forgot-password', expectedStatus: 200 },
  { path: '/reset-password', expectedStatus: 200 },
  { path: '/access-denied', expectedStatus: 200 },
  { path: '/account-deleted', expectedStatus: 200 },
  { path: '/dashboard', expectedStatus: 307, expectLocation: '/login?next=%2Fdashboard' },
  { path: '/profile', expectedStatus: 307, expectLocation: '/login?next=%2Fprofile' },
  { path: '/settings/security', expectedStatus: 307, expectLocation: '/login?next=%2Fsettings%2Fsecurity' },
  { path: '/admin', expectedStatus: 307, expectLocation: '/login?next=%2Fadmin' },
];

async function run() {
  console.log('Testing route protections and public pages on http://localhost:3000...\n');
  let allPassed = true;

  for (const r of routes) {
    try {
      const res = await fetch(`http://localhost:3000${r.path}`, { redirect: 'manual' });
      const location = res.headers.get('location') || '';
      const pass = res.status === r.expectedStatus;

      console.log(
        `${pass ? '✔ PASS' : '✖ FAIL'}: ${r.path} -> Status ${res.status}${
          location ? ` (Location: ${location})` : ''
        }`
      );

      if (!pass) allPassed = false;
    } catch (err) {
      console.error(`Error querying ${r.path}:`, err.message);
      allPassed = false;
    }
  }

  // Also test unauthenticated POST to /api/account/delete
  try {
    const deleteRes = await fetch('http://localhost:3000/api/account/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmation: 'DELETE' }),
    });
    const pass = deleteRes.status === 401;
    console.log(
      `${pass ? '✔ PASS' : '✖ FAIL'}: POST /api/account/delete (unauthenticated) -> Status ${deleteRes.status} (Expected 401)`
    );
    if (!pass) allPassed = false;
  } catch (err) {
    console.error('Error testing account deletion endpoint:', err.message);
  }

  process.exit(allPassed ? 0 : 1);
}

run();
