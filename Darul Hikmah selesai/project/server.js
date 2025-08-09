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
const ADMIN_USERNAME = 'Darul';
const ADMIN_PASSWORD_HASH = bcrypt.hashSync('hikmah25', 10);

// Initialize data files
const initializeData = async () => {
  const artikelFile = 'data/artikel.json';
  const contentFile = 'data/content.json';
  const commentsFile = 'data/comments.json';
  
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
  
  if (!await fs.pathExists(commentsFile)) {
    await fs.writeJSON(commentsFile, []);
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
  
  console.log('Login attempt:', { username, password });
  console.log('Expected username:', ADMIN_USERNAME);
  console.log('Password check:', bcrypt.compareSync(password, ADMIN_PASSWORD_HASH));
  
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

// Get media gallery for specific page
app.get('/api/gallery/:page', async (req, res) => {
  try {
    const galleryFile = `data/gallery-${req.params.page}.json`;
    if (await fs.pathExists(galleryFile)) {
      const gallery = await fs.readJSON(galleryFile);
      res.json(gallery);
    } else {
      res.json([]);
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to load gallery' });
  }
});

// Add media to gallery
app.post('/api/gallery/:page', requireAuth, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'video', maxCount: 1 }
]), async (req, res) => {
  try {
    const galleryFile = `data/gallery-${req.params.page}.json`;
    let gallery = [];
    
    if (await fs.pathExists(galleryFile)) {
      gallery = await fs.readJSON(galleryFile);
    }
    
    const { title, description } = req.body;
    
    // Validate required fields
    if (!title || !description) {
      return res.status(400).json({ error: 'Judul dan deskripsi harus diisi' });
    }
    
    // Check if at least one file is uploaded
    if (!req.files.image && !req.files.video) {
      return res.status(400).json({ error: 'Pilih gambar atau video' });
    }
    
    const newMedia = {
      id: gallery.length > 0 ? Math.max(...gallery.map(g => g.id)) + 1 : 1,
      title,
      description,
      image: req.files.image ? `/uploads/${req.files.image[0].filename}` : '',
      video: req.files.video ? `/uploads/${req.files.video[0].filename}` : '',
      createdAt: new Date().toISOString()
    };
    
    gallery.push(newMedia);
    await fs.writeJSON(galleryFile, gallery);
    res.json(newMedia);
  } catch (error) {
    console.error('Error adding media:', error);
    res.status(500).json({ error: 'Failed to add media' });
  }
});

// Update media in gallery
app.put('/api/gallery/:page/:id', requireAuth, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'video', maxCount: 1 }
]), async (req, res) => {
  try {
    const galleryFile = `data/gallery-${req.params.page}.json`;
    
    if (!await fs.pathExists(galleryFile)) {
      return res.status(404).json({ error: 'Gallery not found' });
    }
    
    const gallery = await fs.readJSON(galleryFile);
    const mediaIndex = gallery.findIndex(g => g.id === parseInt(req.params.id));
    
    if (mediaIndex === -1) {
      return res.status(404).json({ error: 'Media not found' });
    }
    
    const { title, description } = req.body;
    const media = gallery[mediaIndex];
    
    // Validate required fields
    if (!title || !description) {
      return res.status(400).json({ error: 'Judul dan deskripsi harus diisi' });
    }
    
    // Update fields
    media.title = title || media.title;
    media.description = description || media.description;
    
    // Update image if provided
    if (req.files.image) {
      if (media.image) {
        try {
          await fs.remove(`public${media.image}`);
        } catch (err) {
          console.log('Old image file not found, continuing...');
        }
      }
      media.image = `/uploads/${req.files.image[0].filename}`;
    }
    
    // Update video if provided
    if (req.files.video) {
      if (media.video) {
        try {
          await fs.remove(`public${media.video}`);
        } catch (err) {
          console.log('Old video file not found, continuing...');
        }
      }
      media.video = `/uploads/${req.files.video[0].filename}`;
    }
    
    media.updatedAt = new Date().toISOString();
    
    await fs.writeJSON(galleryFile, gallery);
    res.json(media);
  } catch (error) {
    console.error('Error updating media:', error);
    res.status(500).json({ error: 'Failed to update media' });
  }
});

// Delete media from gallery
app.delete('/api/gallery/:page/:id', requireAuth, async (req, res) => {
  try {
    const galleryFile = `data/gallery-${req.params.page}.json`;
    
    if (!await fs.pathExists(galleryFile)) {
      return res.status(404).json({ error: 'Gallery not found' });
    }
    
    const gallery = await fs.readJSON(galleryFile);
    const mediaIndex = gallery.findIndex(g => g.id === parseInt(req.params.id));
    
    if (mediaIndex === -1) {
      return res.status(404).json({ error: 'Media not found' });
    }
    
    const media = gallery[mediaIndex];
    
    // Delete associated files
    if (media.image) {
      try {
        await fs.remove(`public${media.image}`);
      } catch (err) {
        console.log('Image file not found, continuing...');
      }
    }
    if (media.video) {
      try {
        await fs.remove(`public${media.video}`);
      } catch (err) {
        console.log('Video file not found, continuing...');
      }
    }
    
    gallery.splice(mediaIndex, 1);
    await fs.writeJSON(galleryFile, gallery);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting media:', error);
    res.status(500).json({ error: 'Failed to delete media' });
  }
});

// Update content for pages
app.put('/api/content/:page', requireAuth, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'video', maxCount: 1 }
]), async (req, res) => {
  try {
    console.log('Updating content for page:', req.params.page);
    console.log('Request body:', req.body);
    console.log('Files:', req.files);
    
    const content = await fs.readJSON('data/content.json');
    const page = req.params.page;
    
    if (!content[page]) {
      console.log('Page not found:', page);
      return res.status(404).json({ error: 'Page not found' });
    }
    
    const { title, description } = req.body;
    const pageContent = content[page];
    
    // Update fields
    if (title) pageContent.title = title;
    if (description) pageContent.description = description;
    
    // Update image if provided
    if (req.files.image) {
      if (pageContent.image) {
        try {
          await fs.remove(`public${pageContent.image}`);
        } catch (err) {
          console.log('Old image file not found, continuing...');
        }
      }
      pageContent.image = `/uploads/${req.files.image[0].filename}`;
    }
    
    // Update video if provided
    if (req.files.video) {
      if (pageContent.video) {
        try {
          await fs.remove(`public${pageContent.video}`);
        } catch (err) {
          console.log('Old video file not found, continuing...');
        }
      }
      pageContent.video = `/uploads/${req.files.video[0].filename}`;
    }
    
    await fs.writeJSON('data/content.json', content);
    console.log('Content updated successfully:', pageContent);
    res.json(pageContent);
  } catch (error) {
    console.error('Error updating content:', error);
    res.status(500).json({ error: 'Failed to update content' });
  }
});

// Get all comments
app.get('/api/comments', async (req, res) => {
  try {
    const comments = await fs.readJSON('data/comments.json');
    // Sort by newest first
    const sortedComments = comments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(sortedComments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load comments' });
  }
});

// Add new comment
app.post('/api/comments', async (req, res) => {
  try {
    const comments = await fs.readJSON('data/comments.json');
    const { name, email, message } = req.body;
    
    // Validate required fields
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Nama, email, dan pesan harus diisi' });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Format email tidak valid' });
    }
    
    const newComment = {
      id: comments.length > 0 ? Math.max(...comments.map(c => c.id)) + 1 : 1,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      message: message.trim(),
      createdAt: new Date().toISOString(),
      approved: true // Auto approve for now, you can add moderation later
    };
    
    comments.push(newComment);
    await fs.writeJSON('data/comments.json', comments);
    res.json(newComment);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Delete comment (admin only)
app.delete('/api/comments/:id', requireAuth, async (req, res) => {
  try {
    const comments = await fs.readJSON('data/comments.json');
    const commentIndex = comments.findIndex(c => c.id === parseInt(req.params.id));
    
    if (commentIndex === -1) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    comments.splice(commentIndex, 1);
    await fs.writeJSON('data/comments.json', comments);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});