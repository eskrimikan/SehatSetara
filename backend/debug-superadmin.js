const db = require('./db');

(async () => {
  try {
    await db.ready;

    const rows = await db.all(
      "SELECT id, username, password, role, is_approved, requested_role, created_at FROM users WHERE role = 'superadmin' OR username IN ('admin','superadmin') LIMIT 10"
    );

    console.log('Found rows:', rows?.length || 0);
    console.log(JSON.stringify(rows, null, 2));

    if (rows && rows.length) {
      const bcrypt = require('bcryptjs');
      for (const r of rows) {
        const matches = bcrypt.compareSync('akuadmin', r.password);
        console.log(`username=${r.username} id=${r.id} role=${r.role} passwordMatches=${matches}`);
      }
    } else {
      console.log('No superadmin/admin user found in DB');
    }
    process.exit(0);
  } catch (err) {
    console.error('Debug script error:', err && err.message ? err.message : err);
    process.exit(2);
  }
})();
