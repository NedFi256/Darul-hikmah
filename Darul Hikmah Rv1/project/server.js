import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('public'));

// Ensure directories exist
await fs.ensureDir('data');
await fs.ensureDir('public/uploads');

// Storage configuration for multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, 10 * 1024 * 1024); // 10MB for images
      } else if (file.mimetype.startsWith('video/')) {
        cb(null, 100 * 1024 * 1024); // 100MB for videos
      } else {
        cb(new Error('Invalid file type'));
      }
    }
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed'));
    }
  }
});

// Admin credentials (in production, use environment variables)
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD_HASH = bcrypt.hashSync('admin123', 10);

// Initialize data files
const initializeData = async () => {
  const artikelFile = 'data/artikel.json';
  const contentFile = 'data/content.json';
  
  if (!await fs.pathExists(artikelFile)) {
    await fs.writeJSON(artikelFile, []);
  }
  
  if (!await fs.pathExists(contentFile)) {
    await fs.writeJSON(contentFile, {
      kajian: {
        title: 'Kajian Kitab Kuning',
        description: 'Program kajian mendalam kitab-kitab klasik Islam',
        image: '',
        video: ''
      },
      pendidikan: {
        title: 'Pendidikan Formal',
        description: 'Program pendidikan formal dari tingkat dasar hingga menengah',
        image: '',
        video: ''
      },
      kegiatan: {
        title: 'Kegiatan Santri',
        description: 'Berbagai kegiatan pengembangan diri untuk santri',
        image: '',
        video: ''
      }
    });
  }
};

await initializeData();

// Authentication middleware
const requireAuth = (req, res, next) => {
  const { adminToken } = req.cookies;
  if (!adminToken || adminToken !== 'authenticated') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// API Routes

// Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (username === ADMIN_USERNAME && bcrypt.compareSync(password, ADMIN_PASSWORD_HASH)) {
    res.cookie('adminToken', 'authenticated', { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Logout
app.post('/api/logout', (req, res) => {
  res.clearCookie('adminToken');
  res.json({ success: true });
});

// Check auth status
app.get('/api/auth/check', (req, res) => {
  const { adminToken } = req.cookies;
  res.json({ authenticated: adminToken === 'authenticated' });
});

// Get all articles
app.get('/api/artikel', async (req, res) => {
  try {
    const articles = await fs.readJSON('data/artikel.json');
    res.json(articles);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load articles' });
  }
});

// Get article by ID
app.get('/api/artikel/:id', async (req, res) => {
  try {
    const articles = await fs.readJSON('data/artikel.json');
    const article = articles.find(a => a.id === parseInt(req.params.id));
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }
    res.json(article);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load article' });
  }
});

// Create article
app.post('/api/artikel', requireAuth, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'video', maxCount: 1 }
]), async (req, res) => {
  try {
    const articles = await fs.readJSON('data/artikel.json');
    const { title, content, excerpt } = req.body;
    
    const newArticle = {
      id: articles.length > 0 ? Math.max(...articles.map(a => a.id)) + 1 : 1,
      title,
      content,
      excerpt,
      image: req.files.image ? `/uploads/${req.files.image[0].filename}` : '',
      video: req.files.video ? `/uploads/${req.files.video[0].filename}` : '',
      createdAt: new Date().toISOString()
    };
    
    articles.push(newArticle);
    await fs.writeJSON('data/artikel.json', articles);
    res.json(newArticle);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create article' });
  }
});

// Update article
app.put('/api/artikel/:id', requireAuth, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'video', maxCount: 1 }
]), async (req, res) => {
  try {
    const articles = await fs.readJSON('data/artikel.json');
    const articleIndex = articles.findIndex(a => a.id === parseInt(req.params.id));
    
    if (articleIndex === -1) {
      return res.status(404).json({ error: 'Article not found' });
    }
    
    const { title, content, excerpt } = req.body;
    const article = articles[articleIndex];
    
    // Update fields
    article.title = title || article.title;
    article.content = content || article.content;
    article.excerpt = excerpt || article.excerpt;
    
    // Update image if provided
    if (req.files.image) {
      if (article.image) {
        await fs.remove(`public${article.image}`);
      }
      article.image = `/uploads/${req.files.image[0].filename}`;
    }
    
    // Update video if provided
    if (req.files.video) {
      if (article.video) {
        await fs.remove(`public${article.video}`);
      }
      article.video = `/uploads/${req.files.video[0].filename}`;
    }
    
    article.updatedAt = new Date().toISOString();
    
    await fs.writeJSON('data/artikel.json', articles);
    res.json(article);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update article' });
  }
});

// Delete article
app.delete('/api/artikel/:id', requireAuth, async (req, res) => {
  try {
    const articles = await fs.readJSON('data/artikel.json');
    const articleIndex = articles.findIndex(a => a.id === parseInt(req.params.id));
    
    if (articleIndex === -1) {
      return res.status(404).json({ error: 'Article not found' });
    }
    
    const article = articles[articleIndex];
    
    // Delete associated files
    if (article.image) {
      await fs.remove(`public${article.image}`);
    }
    if (article.video) {
      await fs.remove(`public${article.video}`);
    }
    
    articles.splice(articleIndex, 1);
    await fs.writeJSON('data/artikel.json', articles);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete article' });
  }
});

// Get content for pages
app.get('/api/content', async (req, res) => {
  try {
    const content = await fs.readJSON('data/content.json');
    res.json(content);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load content' });
  }
});

// Update content for pages
app.put('/api/content/:page', requireAuth, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'video', maxCount: 1 }
]), async (req, res) => {
  try {
    const content = await fs.readJSON('data/content.json');
    const page = req.params.page;
    
    if (!content[page]) {
      return res.status(404).json({ error: 'Page not found' });
    }
    
    const { title, description } = req.body;
    const pageContent = content[page];
    
    // Update fields
    pageContent.title = title || pageContent.title;
    pageContent.description = description || pageContent.description;
    
    // Update image if provided
    if (req.files.image) {
      if (pageContent.image) {
        await fs.remove(`public${pageContent.image}`);
      }
      pageContent.image = `/uploads/${req.files.image[0].filename}`;
    }
    
    // Update video if provided
    if (req.files.video) {
      if (pageContent.video) {
        await fs.remove(`public${pageContent.video}`);
      }
      pageContent.video = `/uploads/${req.files.video[0].filename}`;
    }
    
    await fs.writeJSON('data/content.json', content);
    res.json(pageContent);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update content' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});