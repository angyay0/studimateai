import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { query } from '../config/database';
import { jwtConfig } from '../config';

type UserRow = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  password_hash: string;
  role: 'student' | 'teacher' | 'admin';
  created_at: Date;
  updated_at: Date;
};

type PublicUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  role: string;
};

type SessionRow = {
  id: string;
  user_id: string;
  last_seen_at: Date;
  revoked_at: Date | null;
};

type PasswordResetRow = {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  used_at: Date | null;
};

type TokenPayload = jwt.JwtPayload & {
  sub: string;
  email: string;
  role: string;
  sessionId: string;
};

const maxActiveSessions = 2;
const idleTimeoutMinutes = 45;
const passwordResetMinutes = 15;
const defaultTokenExpiration = '1d';
const rememberedTokenExpiration = '30d';
export const passwordPolicyMessage = 'Password must be at least 8 characters and include one letter and one symbol.';
const passwordPolicyPattern = /^(?=.*[A-Za-z])(?=.*[^A-Za-z0-9]).{8,}$/;

export class AuthError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

function toPublicUser(row: UserRow): PublicUser {
  const name = `${row.first_name} ${row.last_name}`.trim();

  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    name,
    role: row.role,
  };
}

function signToken(user: PublicUser, sessionId: string, rememberMe = false) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      sessionId,
    },
    jwtConfig.secret,
    {
      expiresIn: (rememberMe ? rememberedTokenExpiration : defaultTokenExpiration) as jwt.SignOptions['expiresIn'],
    },
  );
}

async function createSession(userId: string) {
  const result = await query<SessionRow>(
    `INSERT INTO sessions (user_id)
     VALUES ($1)
     RETURNING id, user_id, last_seen_at, revoked_at`,
    [userId],
  );

  await query(
    `UPDATE sessions
     SET revoked_at = NOW()
     WHERE id IN (
       SELECT id
       FROM sessions
       WHERE user_id = $1
         AND revoked_at IS NULL
       ORDER BY last_seen_at DESC
       OFFSET $2
     )`,
    [userId, maxActiveSessions],
  );

  return result.rows[0];
}

export class AuthService {
  static validatePasswordPolicy(password: string) {
    return passwordPolicyPattern.test(password);
  }

  static async register(email: string, password: string, firstName: string, lastName = '') {
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();

    const existingUser = await query<UserRow>(
      'SELECT id FROM users WHERE email = $1 LIMIT 1',
      [normalizedEmail],
    );

    if (existingUser.rowCount && existingUser.rowCount > 0) {
      throw new AuthError('An account with this email already exists.', 409);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await query<UserRow>(
      `INSERT INTO users (email, first_name, last_name, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, first_name, last_name, password_hash, role, created_at, updated_at`,
      [normalizedEmail, trimmedFirstName, trimmedLastName, passwordHash],
    );

    const user = toPublicUser(result.rows[0]);
    const session = await createSession(user.id);
    const token = signToken(user, session.id);

    return { token, user, session: { id: session.id, idleTimeoutMinutes } };
  }

  static async login(email: string, password: string, rememberMe = false) {
    const normalizedEmail = email.trim().toLowerCase();

    const result = await query<UserRow>(
      `SELECT id, email, first_name, last_name, password_hash, role, created_at, updated_at
       FROM users
       WHERE email = $1
       LIMIT 1`,
      [normalizedEmail],
    );

    if (!result.rowCount) {
      throw new AuthError('Invalid email or password.', 401);
    }

    const userRow = result.rows[0];
    const passwordMatches = await bcrypt.compare(password, userRow.password_hash);

    if (!passwordMatches) {
      throw new AuthError('Invalid email or password.', 401);
    }

    const user = toPublicUser(userRow);
    const session = await createSession(user.id);
    const token = signToken(user, session.id, rememberMe);

    return { token, user, session: { id: session.id, idleTimeoutMinutes, rememberMe } };
  }

  static async requestPasswordReset(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const result = await query<UserRow>(
      `SELECT id, email, first_name, last_name, password_hash, role, created_at, updated_at
       FROM users
       WHERE email = $1
       LIMIT 1`,
      [normalizedEmail],
    );

    if (!result.rowCount) {
      return {
        resetToken: null,
        expiresInMinutes: passwordResetMinutes,
      };
    }

    const user = result.rows[0];
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(resetToken, 12);

    await query(
      `UPDATE password_reset_tokens
       SET used_at = NOW()
       WHERE user_id = $1
         AND used_at IS NULL`,
      [user.id],
    );

    await query<PasswordResetRow>(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + ($3 || ' minutes')::INTERVAL)
       RETURNING id, user_id, token_hash, expires_at, used_at`,
      [user.id, tokenHash, passwordResetMinutes],
    );

    return {
      resetToken,
      expiresInMinutes: passwordResetMinutes,
    };
  }

  static async resetPassword(email: string, token: string, newPassword: string) {
    if (!this.validatePasswordPolicy(newPassword)) {
      throw new AuthError(passwordPolicyMessage, 400);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const userResult = await query<UserRow>(
      `SELECT id, email, first_name, last_name, password_hash, role, created_at, updated_at
       FROM users
       WHERE email = $1
       LIMIT 1`,
      [normalizedEmail],
    );

    if (!userResult.rowCount) {
      throw new AuthError('Invalid or expired reset token.', 400);
    }

    const user = userResult.rows[0];
    const tokenResult = await query<PasswordResetRow>(
      `SELECT id, user_id, token_hash, expires_at, used_at
       FROM password_reset_tokens
       WHERE user_id = $1
         AND used_at IS NULL
         AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 5`,
      [user.id],
    );

    for (const resetRow of tokenResult.rows) {
      const matches = await bcrypt.compare(token, resetRow.token_hash);

      if (matches) {
        const passwordHash = await bcrypt.hash(newPassword, 12);

        await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [
          passwordHash,
          user.id,
        ]);
        await query('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1', [
          resetRow.id,
        ]);
        await query(
          'UPDATE sessions SET revoked_at = COALESCE(revoked_at, NOW()) WHERE user_id = $1',
          [user.id],
        );

        return { success: true };
      }
    }

    throw new AuthError('Invalid or expired reset token.', 400);
  }

  static async verifySessionToken(token: string) {
    const payload = jwt.verify(token, jwtConfig.secret) as TokenPayload;

    if (!payload.sub || !payload.sessionId) {
      throw new AuthError('Invalid session.', 401);
    }

    const result = await query<SessionRow>(
      `SELECT id, user_id, last_seen_at, revoked_at
       FROM sessions
       WHERE id = $1
         AND user_id = $2
       LIMIT 1`,
      [payload.sessionId, payload.sub],
    );

    if (!result.rowCount) {
      throw new AuthError('Session not found.', 401);
    }

    const session = result.rows[0];

    if (session.revoked_at) {
      throw new AuthError('Session is no longer active.', 401);
    }

    const idleMs = Date.now() - new Date(session.last_seen_at).getTime();
    const idleLimitMs = idleTimeoutMinutes * 60 * 1000;

    if (idleMs > idleLimitMs) {
      await this.logout(payload.sessionId);
      throw new AuthError('Session expired due to inactivity.', 401);
    }

    await query(
      'UPDATE sessions SET last_seen_at = NOW() WHERE id = $1',
      [payload.sessionId],
    );

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      sessionId: payload.sessionId,
    };
  }

  static async logout(sessionId: string) {
    await query(
      'UPDATE sessions SET revoked_at = COALESCE(revoked_at, NOW()) WHERE id = $1',
      [sessionId],
    );
  }

  static verifyToken(token: string) {
    return jwt.verify(token, jwtConfig.secret);
  }
}
