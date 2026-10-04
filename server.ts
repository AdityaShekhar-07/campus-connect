import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { seedDatabase } from './server/seed.js';
import { optionalAuth, requireAuth, requireRole } from './server/auth.js';
import {
  handleLogin,
  handleLogout,
  handleGetMe,
  handleDemoSwitch,
  handleInstantLogin,
} from './server/controllers/auth.js';
import {
  handleGetEvents,
  handleGetEventById,
  handleCreateEvent,
  handleUpdateEvent,
  handlePublishEvent,
  handleCloseEvent,
  handleToggleSaveEvent,
} from './server/controllers/events.js';
import {
  handleRegisterForEvent,
  handleGetMyRegistrations,
  handleCancelRegistration,
} from './server/controllers/registrations.js';
import {
  handleGetOrganizerDashboard,
  handleGetOrganizerEvents,
  handleGetEventParticipants,
  handleExportEventParticipants,
} from './server/controllers/organizer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize seed data
  seedDatabase();

  app.use(express.json());

  // ================= API ROUTES =================

  // Auth routes
  app.post('/api/auth/login', handleLogin);
  app.post('/api/auth/demo-switch', handleDemoSwitch);
  app.post('/api/auth/instant-login', handleInstantLogin);
  app.post('/api/auth/logout', handleLogout);
  app.get('/api/auth/me', requireAuth, handleGetMe);

  // Events routes
  app.get('/api/events', optionalAuth, handleGetEvents);
  app.get('/api/events/:id', optionalAuth, handleGetEventById);
  app.post('/api/events/:id/save', requireAuth, requireRole('STUDENT'), handleToggleSaveEvent);
  app.post('/api/events', requireAuth, requireRole('ORGANIZER'), handleCreateEvent);
  app.put('/api/events/:id', requireAuth, requireRole('ORGANIZER'), handleUpdateEvent);
  app.patch('/api/events/:id/publish', requireAuth, requireRole('ORGANIZER'), handlePublishEvent);
  app.patch('/api/events/:id/close', requireAuth, requireRole('ORGANIZER'), handleCloseEvent);

  // Registration routes
  app.post('/api/events/:id/register', requireAuth, requireRole('STUDENT'), handleRegisterForEvent);
  app.get('/api/registrations/me', requireAuth, requireRole('STUDENT'), handleGetMyRegistrations);
  app.delete('/api/registrations/:id', requireAuth, requireRole('STUDENT'), handleCancelRegistration);

  // Organizer routes
  app.get('/api/organizer/dashboard', requireAuth, requireRole('ORGANIZER'), handleGetOrganizerDashboard);
  app.get('/api/organizer/events', requireAuth, requireRole('ORGANIZER'), handleGetOrganizerEvents);
  app.get('/api/events/:id/participants', requireAuth, requireRole('ORGANIZER'), handleGetEventParticipants);
  app.get('/api/events/:id/participants/export', requireAuth, requireRole('ORGANIZER'), handleExportEventParticipants);

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Global API error handler
  app.use('/api', (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled API Error:', err);
    res.status(500).json({
      success: false,
      message: 'Internal server error.',
      code: 'INTERNAL_ERROR',
    });
  });

  // ================= VITE / FRONTEND SERVING =================
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 CampusConnect server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
