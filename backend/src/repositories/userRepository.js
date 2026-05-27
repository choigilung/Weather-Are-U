const db = require('./db');

class UserRepository {
  // 아이디로 기존 유저 찾기 (로그인 및 중복 가입 체크용)
  async findByUsername(username) {
    const queryText = 'SELECT * FROM users WHERE username = $1';
    const res = await db.query(queryText, [username]);
    return res.rows[0];
  }

  // 신규 회원 데이터베이스에 저장하기
  async createUser(username, hashedPassword) {
    const queryText = `
      INSERT INTO users (username, password, role)
      VALUES ($1, $2, 'user')
      RETURNING id, username, role, created_at;
    `;
    const res = await db.query(queryText, [username, hashedPassword]);
    return res.rows[0];
  }
}

module.exports = new UserRepository();