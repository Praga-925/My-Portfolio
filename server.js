const express = require('express');
const path = require('path');
const fs = require('fs/promises');
const crypto = require('crypto');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const validator = require('validator');
require('dotenv').config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');
const CERTS_FILE = path.join(DATA_DIR, 'certificates.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');

const JWT_SECRET = process.env.JWT_SECRET || 'development-only-secret-change-in-production';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'change-me-please';

const contentSecurityPolicy = {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", 'https://cdnjs.cloudflare.com'],
    styleSrc: ["'self'", 'https://fonts.googleapis.com'],
    imgSrc: ["'self'", 'data:'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com'],
    connectSrc: ["'self'"],
    objectSrc: ["'none'"],
    frameAncestors: ["'none'"]
  }
};

app.use(helmet({
  contentSecurityPolicy,
  crossOriginEmbedderPolicy: false
}));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many messages sent. Please try again later.' }
});

const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' }
});

app.use('/assets/certificates', express.static(path.join(ROOT, 'Certifications')));
app.use(express.static(ROOT));

function sanitizeText(input, maxLength = 500) {
  const value = typeof input === 'string' ? input.trim() : '';
  return validator.escape(value).slice(0, maxLength);
}

function sanitizeArray(arr, maxItems = 20, maxLength = 120) {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((item) => sanitizeText(String(item || ''), maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

async function ensureDataFiles() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  const defaults = [
    { file: PROJECTS_FILE, value: '[]\n' },
    { file: CERTS_FILE, value: '[]\n' },
    { file: MESSAGES_FILE, value: '[]\n' }
  ];

  await Promise.all(defaults.map(async ({ file, value }) => {
    try {
      await fs.access(file);
    } catch {
      await fs.writeFile(file, value, 'utf8');
    }
  }));
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

async function writeJson(filePath, payload) {
  const content = JSON.stringify(payload, null, 2) + '\n';
  await fs.writeFile(filePath, content, 'utf8');
}

function getBearerToken(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return '';
  return header.slice(7).trim();
}

function requireAdmin(req, res, next) {
  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    jwt.verify(token, JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function validateProjectInput(body) {
  const status = body.status === 'coming-soon' ? 'coming-soon' : 'featured';

  const item = {
    id: sanitizeText(body.id, 80) || `proj-${crypto.randomUUID()}`,
    tag: sanitizeText(body.tag, 50) || (status === 'coming-soon' ? 'Coming Soon' : 'Featured Project'),
    title: sanitizeText(body.title, 180),
    description: sanitizeText(body.description, 2000),
    stack: sanitizeArray(body.stack, 20, 60),
    features: sanitizeArray(body.features, 20, 180),
    link: sanitizeText(body.link, 400),
    status,
    command: sanitizeText(body.command, 180)
  };

  if (!item.title || !item.description) {
    return { error: 'Project title and description are required.' };
  }

  if (item.link && !validator.isURL(item.link, { protocols: ['http', 'https'], require_protocol: true })) {
    item.link = '';
  }

  return { value: item };
}

function validateCertificateInput(body) {
  const status = body.status === 'in-progress' ? 'in-progress' : 'completed';

  const item = {
    id: sanitizeText(body.id, 80) || `cert-${crypto.randomUUID()}`,
    title: sanitizeText(body.title, 180),
    provider: sanitizeText(body.provider, 180),
    description: sanitizeText(body.description, 2000),
    status,
    image: sanitizeText(body.image, 400),
    pdf: sanitizeText(body.pdf, 400)
  };

  if (!item.title || !item.provider) {
    return { error: 'Certificate title and provider are required.' };
  }

  return { value: item };
}

let transporter;
function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || 'false') === 'true';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass }
  });

  return transporter;
}

app.get('/api/projects', async (req, res) => {
  try {
    const projects = await readJson(PROJECTS_FILE);
    res.json(projects);
  } catch {
    res.status(500).json({ error: 'Unable to read projects data.' });
  }
});

app.get('/api/certificates', async (req, res) => {
  try {
    const certificates = await readJson(CERTS_FILE);
    res.json(certificates);
  } catch {
    res.status(500).json({ error: 'Unable to read certificates data.' });
  }
});

app.post('/api/contact', contactLimiter, async (req, res) => {
  const name = sanitizeText(req.body.name, 80);
  const emailRaw = typeof req.body.email === 'string' ? req.body.email.trim() : '';
  const message = sanitizeText(req.body.message, 2000);
  const email = validator.normalizeEmail(emailRaw) || '';

  if (name.length < 2) {
    return res.status(400).json({ error: 'Name must be at least 2 characters.' });
  }

  if (!email || !validator.isEmail(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  if (message.length < 10) {
    return res.status(400).json({ error: 'Message must be at least 10 characters.' });
  }

  const transport = getTransporter();
  if (!transport) {
    return res.status(503).json({ error: 'Contact service is not configured yet.' });
  }

  try {
    const to = process.env.CONTACT_TO_EMAIL || process.env.SMTP_USER;
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;

    await transport.sendMail({
      from: `Portfolio Contact <${from}>`,
      to,
      replyTo: `${name} <${email}>`,
      subject: `Portfolio Contact: ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
      html: `<p><strong>Name:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><p><strong>Message:</strong><br>${message.replace(/\n/g, '<br>')}</p>`
    });

    const messages = await readJson(MESSAGES_FILE);
    messages.unshift({
      id: crypto.randomUUID(),
      name,
      email,
      message,
      createdAt: new Date().toISOString()
    });
    await writeJson(MESSAGES_FILE, messages.slice(0, 500));

    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ error: 'Failed to deliver message. Please try again later.' });
  }
});

app.post('/api/admin/login', loginLimiter, (req, res) => {
  const username = sanitizeText(req.body.username, 120);
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { sub: username, role: 'admin' },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  return res.json({ token });
});

app.get('/api/admin/me', requireAdmin, (req, res) => {
  res.json({ ok: true });
});

app.post('/api/projects', requireAdmin, async (req, res) => {
  const { error, value } = validateProjectInput(req.body);
  if (error) return res.status(400).json({ error });

  try {
    const list = await readJson(PROJECTS_FILE);
    list.unshift(value);
    await writeJson(PROJECTS_FILE, list);
    res.status(201).json(value);
  } catch {
    res.status(500).json({ error: 'Unable to save project.' });
  }
});

app.put('/api/projects/:id', requireAdmin, async (req, res) => {
  const { error, value } = validateProjectInput({ ...req.body, id: req.params.id });
  if (error) return res.status(400).json({ error });

  try {
    const list = await readJson(PROJECTS_FILE);
    const idx = list.findIndex((item) => item.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: 'Project not found.' });

    list[idx] = value;
    await writeJson(PROJECTS_FILE, list);
    res.json(value);
  } catch {
    res.status(500).json({ error: 'Unable to update project.' });
  }
});

app.delete('/api/projects/:id', requireAdmin, async (req, res) => {
  try {
    const list = await readJson(PROJECTS_FILE);
    const next = list.filter((item) => item.id !== req.params.id);
    if (next.length === list.length) return res.status(404).json({ error: 'Project not found.' });

    await writeJson(PROJECTS_FILE, next);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Unable to delete project.' });
  }
});

app.post('/api/certificates', requireAdmin, async (req, res) => {
  const { error, value } = validateCertificateInput(req.body);
  if (error) return res.status(400).json({ error });

  try {
    const list = await readJson(CERTS_FILE);
    list.unshift(value);
    await writeJson(CERTS_FILE, list);
    res.status(201).json(value);
  } catch {
    res.status(500).json({ error: 'Unable to save certificate.' });
  }
});

app.put('/api/certificates/:id', requireAdmin, async (req, res) => {
  const { error, value } = validateCertificateInput({ ...req.body, id: req.params.id });
  if (error) return res.status(400).json({ error });

  try {
    const list = await readJson(CERTS_FILE);
    const idx = list.findIndex((item) => item.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: 'Certificate not found.' });

    list[idx] = value;
    await writeJson(CERTS_FILE, list);
    res.json(value);
  } catch {
    res.status(500).json({ error: 'Unable to update certificate.' });
  }
});

app.delete('/api/certificates/:id', requireAdmin, async (req, res) => {
  try {
    const list = await readJson(CERTS_FILE);
    const next = list.filter((item) => item.id !== req.params.id);
    if (next.length === list.length) return res.status(404).json({ error: 'Certificate not found.' });

    await writeJson(CERTS_FILE, next);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Unable to delete certificate.' });
  }
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(ROOT, 'admin', 'index.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(ROOT, 'index.html'));
});

ensureDataFiles()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize data files:', err);
    process.exit(1);
  });
