import { Request, Response } from 'express';
import { db } from '../db.js';
import { comparePassword, generateToken, AuthenticatedRequest } from '../auth.js';

export function handleLogin(req: Request, res: Response) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required.',
      code: 'MISSING_CREDENTIALS',
    });
  }

  const user = db.prepare(`
    SELECT id, name, email, password_hash as passwordHash, role
    FROM users
    WHERE email = ? COLLATE NOCASE
  `).get(email) as { id: string; name: string; email: string; passwordHash: string; role: 'STUDENT' | 'ORGANIZER' } | undefined;

  if (!user || !comparePassword(password, user.passwordHash)) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password.',
      code: 'INVALID_CREDENTIALS',
    });
  }

  const authUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const token = generateToken(authUser);

  return res.json({
    success: true,
    message: 'Signed in successfully.',
    token,
    user: authUser,
  });
}

export function handleDemoSwitch(req: Request, res: Response) {
  const { role } = req.body;
  const targetEmail = role === 'ORGANIZER' ? 'organizer@campusconnect.demo' : 'student@campusconnect.demo';

  const user = db.prepare(`
    SELECT id, name, email, role
    FROM users
    WHERE email = ? COLLATE NOCASE
  `).get(targetEmail) as { id: string; name: string; email: string; role: 'STUDENT' | 'ORGANIZER' } | undefined;

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'Demo account not found.',
      code: 'USER_NOT_FOUND',
    });
  }

  const token = generateToken(user);

  return res.json({
    success: true,
    token,
    user,
  });
}

/**
 * Instant Zero-Config Login: Enter immediately with just a display name and role.
 * Zero tokens, zero external API keys, zero verification hassle needed from user!
 */
export function handleInstantLogin(req: Request, res: Response) {
  const { name = 'Campus Student', role = 'STUDENT' } = req.body;
  const sanitizedRole = role === 'ORGANIZER' ? 'ORGANIZER' : 'STUDENT';
  const cleanName = typeof name === 'string' && name.trim() ? name.trim() : (sanitizedRole === 'ORGANIZER' ? 'Campus Organizer' : 'Campus Student');
  
  // Check if a user with this name already exists or create an instant persistent profile
  const slug = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const email = `${slug}_${sanitizedRole.toLowerCase()}@campusconnect.local`;
  
  let user = db.prepare(`
    SELECT id, name, email, role FROM users WHERE email = ? COLLATE NOCASE
  `).get(email) as { id: string; name: string; email: string; role: 'STUDENT' | 'ORGANIZER' } | undefined;

  if (!user) {
    const id = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const defaultHash = '$2a$10$w8YpL2yN9lYQhH0pY.Q1uO9jY3X0kZ2V0/o1p1j2k3l4m5n6o7p8q'; // dummy hash for guest

    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, cleanName, email, defaultHash, sanitizedRole, now, now);

    user = { id, name: cleanName, email, role: sanitizedRole };
  }

  const token = generateToken(user);

  return res.json({
    success: true,
    message: `Welcome, ${cleanName}! Instant access granted.`,
    token,
    user,
  });
}

export function handleLogout(_req: Request, res: Response) {
  return res.json({
    success: true,
    message: 'Signed out successfully.',
  });
}

export function handleGetMe(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated.',
      code: 'UNAUTHENTICATED',
    });
  }

  const user = db.prepare(`
    SELECT id, name, email, role, created_at as createdAt
    FROM users
    WHERE id = ?
  `).get(req.user.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User profile not found.',
      code: 'USER_NOT_FOUND',
    });
  }

  return res.json({
    success: true,
    user,
  });
}
