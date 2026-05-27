const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  // 브라우저가 보낸 헤더(Authorization: Bearer 토큰값)에서 토큰만 쏙 분리합니다.
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  // 만약 토큰 자물쇠 키가 아예 없다면 401(접근 권한 없음) 에러 탈락
  if (!token) {
    return res.status(401).json({ error: '인증 토큰이 누락되었습니다. 다시 로그인해 주세요.' });
  }

  // 가져온 토큰 키가 유효한지 검증 복사
  jwt.verify(token, process.env.JWT_SECRET || 'DEFAULT_SECRET_KEY', (err, user) => {
    if (err) {
      return res.status(403).json({ error: '유효하지 않거나 만료된 토큰입니다.' });
    }
    // 검증 성공 시 유저 정보를 안전하게 넘겨줌
    req.user = user;
    next(); 
  });
}

module.exports = authenticateToken;