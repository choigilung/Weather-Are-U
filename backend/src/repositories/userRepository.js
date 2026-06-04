const db = require('./db');

class UserRepository {
  async findByUsername(username) {
    const queryText = 'SELECT * FROM users WHERE username = $1';
    const res = await db.query(queryText, [username]);
    return res.rows[0];
  }

  async createUser(username, hashedPassword) {
    const queryText = `
      INSERT INTO users (username, password, role)
      VALUES ($1, $2, 'user')
      RETURNING id, username, role, created_at;
    `;
    const res = await db.query(queryText, [username, hashedPassword]);
    return res.rows[0];
  }

  async findOrCreateGuestUserId() {
    const queryText = `
      INSERT INTO users (username, password, role)
      VALUES ('guest', 'public-dashboard', 'guest')
      ON CONFLICT (username) DO UPDATE SET username = EXCLUDED.username
      RETURNING id;
    `;
    const res = await db.query(queryText);
    return res.rows[0].id;
  }
}

module.exports = new UserRepository();
