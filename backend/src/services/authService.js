const userRepository = require('../repositories/userRepository');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

class AuthService {
  // 회원가입 비즈니스 로직
  async register(username, password) {
    // 1. 아이디 중복 체크
    const existingUser = await userRepository.findByUsername(username);
    if (existingUser) {
      throw new Error('이미 존재하는 아이디입니다.');
    }

    // 2. 비밀번호 단방향 암호화 (Salt Round: 10)
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. DB 저장
    return await userRepository.createUser(username, hashedPassword);
  }

  // 로그인 비즈니스 로직
  async login(username, password) {
    // 1. 유저 존재 여부 확인
    const user = await userRepository.findByUsername(username);
    if (!user) {
      throw new Error('아이디 또는 비밀번호가 일치하지 않습니다.');
    }

    // 2. 암호화된 비밀번호와 입력된 비밀번호 비교 검증
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error('아이디 또는 비밀번호가 일치하지 않습니다.');
    }

    // 3. 검증 성공 시 유저 정보가 담긴 JWT 토큰 발급 (유효기간 1시간)
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    return {
      message: '로그인 성공!',
      token,
      user: { id: user.id, username: user.username, role: user.role }
    };
  }
}

module.exports = new AuthService();