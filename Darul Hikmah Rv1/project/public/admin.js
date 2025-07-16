// Check authentication on page load
async function checkAuth() {
  try {
    const response = await fetch('/api/auth/check');
    const data = await response.json();
    
    if (!data.authenticated) {
      window.location.href = 'login.html';
    }
  } catch (error) {
    console.error('Error checking auth:', error);
    window.location.href = 'login.html';
  }
}

// Initialize admin panel
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
  
  // Setup tab functionality
  setupTabs();
  
  // Setup logout
  document.getElementById('logout-btn').addEventListener('click', logout);
  
  // Setup article management
  setupArticleManagement();
  
  // Setup content management
  setupContentManagement();
  
  // Load initial data
  await loadArticles();
  await loadContent();
});

// Logout function
async function logout() {
  try {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = 'login.html';
  } catch (error) {
    console.error('Error during logout:', error);
  }
}

// Tab functionality
function setupTabs() {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabId = button.dataset.tab;
      
      // Update button states
      tabButtons.forEach(btn => {
        btn.classList.remove('active', 'text-primary', 'border-primary');
        btn.classList.add('text-gray-500', 'border-transparent');
      });
      
      button.classList.add('active', 'text-primary', 'border-primary');
      button.classList.remove('text-gray-500', 'border-transparent');
      
      // Update content visibility
      tabContents.forEach(content => {
        content.classList.add('hidden');
      });
      
      document.getElementById(`${tabId}-tab`).classList.remove('hidden');
    });
  });
}

// Article management
function setupArticleManagement() {
  const addButton = document.getElementById('add-article-btn');
  const modal = document.getElementById('article-modal');
  const cancelButton = document.getElementById('cancel-article-btn');
  const saveButton = document.getElementById('save-article-btn');
  const form = document.getElementById('article-form');
  
  addButton.addEventListener('click', () => {
    openArticleModal();
  });
  
  cancelButton.addEventListener('click', () => {
    closeArticleModal();
  });
  
  saveButton.addEventListener('click', () => {
    saveArticle();
  });
  
  // Preview functionality
  document.getElementById('article-image').addEventListener('change', (e) => {
    previewImage(e.target.files[0], 'article-image-preview');
  });
  
  document.getElementById('article-video').addEventListener('change', (e) => {
    previewVideo(e.target.files[0], 'article-video-preview');
  });
}

// Content management
function setupContentManagement() {
  const forms = document.querySelectorAll('.content-form');
  
  forms.forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveContent(form);
    });
    
    // Setup file previews
    const imageInput = form.querySelector('input[name="image"]');
    const videoInput = form.querySelector('input[name="video"]');
    
    imageInput.addEventListener('change', (e) => {
      const preview = form.querySelector('.image-preview');
      previewImage(e.target.files[0], preview);
    });
    
    videoInput.addEventListener('change', (e) => {
      const preview = form.querySelector('.video-preview');
      previewVideo(e.target.files[0], preview);
    });
  });
}

// Load articles
async function loadArticles() {
  try {
    const response = await fetch('/api/artikel');
    const articles = await response.json();
    
    const container = document.getElementById('articles-list');
    container.innerHTML = '';
    
    if (articles.length === 0) {
      container.innerHTML = '<p class="text-gray-500">Belum ada artikel.</p>';
      return;
    }
    
    articles.forEach(article => {
      const articleElement = document.createElement('div');
      articleElement.className = 'border border-gray-200 rounded-md p-4';
      articleElement.innerHTML = `
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <h4 class="font-medium text-gray-900">${article.title}</h4>
            <p class="text-sm text-gray-500 mt-1">${article.excerpt}</p>
            <p class="text-xs text-gray-400 mt-2">${formatDate(article.createdAt)}</p>
          </div>
          <div class="flex space-x-2 ml-4">
            <button onclick="editArticle(${article.id})" class="text-blue-600 hover:text-blue-800">Edit</button>
            <button onclick="deleteArticle(${article.id})" class="text-red-600 hover:text-red-800">Hapus</button>
          </div>
        </div>
      `;
      container.appendChild(articleElement);
    });
  } catch (error) {
    console.error('Error loading articles:', error);
  }
}

// Load content
async function loadContent() {
  try {
    const response = await fetch('/api/content');
    const content = await response.json();
    
    Object.keys(content).forEach(page => {
      const form = document.getElementById(`${page}-form`);
      if (form) {
        form.querySelector('input[name="title"]').value = content[page].title || '';
        form.querySelector('textarea[name="description"]').value = content[page].description || '';
        
        // Show current images/videos
        if (content[page].image) {
          const imagePreview = form.querySelector('.image-preview');
          imagePreview.innerHTML = `<img src="${content[page].image}" alt="Current image" class="w-32 h-32 object-cover rounded">`;
        }
        
        if (content[page].video) {
          const videoPreview = form.querySelector('.video-preview');
          videoPreview.innerHTML = `<video src="${content[page].video}" controls class="w-64 h-36 rounded"></video>`;
        }
      }
    });
  } catch (error) {
    console.error('Error loading content:', error);
  }
}

// Article modal functions
function openArticleModal(article = null) {
  const modal = document.getElementById('article-modal');
  const title = document.getElementById('modal-title');
  const form = document.getElementById('article-form');
  
  if (article) {
    title.textContent = 'Edit Artikel';
    document.getElementById('article-id').value = article.id;
    document.getElementById('article-title').value = article.title;
    document.getElementById('article-excerpt').value = article.excerpt;
    document.getElementById('article-content').value = article.content;
    
    // Show current images/videos
    if (article.image) {
      document.getElementById('article-image-preview').innerHTML = 
        `<img src="${article.image}" alt="Current image" class="w-32 h-32 object-cover rounded">`;
    }
    
    if (article.video) {
      document.getElementById('article-video-preview').innerHTML = 
        `<video src="${article.video}" controls class="w-64 h-36 rounded"></video>`;
    }
  } else {
    title.textContent = 'Tambah Artikel';
    form.reset();
    document.getElementById('article-image-preview').innerHTML = '';
    document.getElementById('article-video-preview').innerHTML = '';
  }
  
  modal.classList.remove('hidden');
}

function closeArticleModal() {
  const modal = document.getElementById('article-modal');
  modal.classList.add('hidden');
}

// Save article
async function saveArticle() {
  const form = document.getElementById('article-form');
  const formData = new FormData(form);
  const articleId = document.getElementById('article-id').value;
  
  try {
    const url = articleId ? `/api/artikel/${articleId}` : '/api/artikel';
    const method = articleId ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
      method: method,
      body: formData
    });
    
    if (response.ok) {
      showNotification('Artikel berhasil disimpan!');
      closeArticleModal();
      await loadArticles();
    } else {
      const error = await response.json();
      showNotification(error.error || 'Terjadi kesalahan', 'error');
    }
  } catch (error) {
    console.error('Error saving article:', error);
    showNotification('Terjadi kesalahan saat menyimpan artikel', 'error');
  }
}

// Edit article
async function editArticle(id) {
  try {
    const response = await fetch(`/api/artikel/${id}`);
    const article = await response.json();
    openArticleModal(article);
  } catch (error) {
    console.error('Error loading article:', error);
  }
}

// Delete article
async function deleteArticle(id) {
  if (!confirm('Apakah Anda yakin ingin menghapus artikel ini?')) {
    return;
  }
  
  try {
    const response = await fetch(`/api/artikel/${id}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      showNotification('Artikel berhasil dihapus!');
      await loadArticles();
    } else {
      const error = await response.json();
      showNotification(error.error || 'Terjadi kesalahan', 'error');
    }
  } catch (error) {
    console.error('Error deleting article:', error);
    showNotification('Terjadi kesalahan saat menghapus artikel', 'error');
  }
}

// Save content
async function saveContent(form) {
  const formData = new FormData(form);
  const page = form.dataset.page;
  
  try {
    const response = await fetch(`/api/content/${page}`, {
      method: 'PUT',
      body: formData
    });
    
    if (response.ok) {
      showNotification('Konten berhasil disimpan!');
    } else {
      const error = await response.json();
      showNotification(error.error || 'Terjadi kesalahan', 'error');
    }
  } catch (error) {
    console.error('Error saving content:', error);
    showNotification('Terjadi kesalahan saat menyimpan konten', 'error');
  }
}

// Preview functions
function previewImage(file, container) {
  if (typeof container === 'string') {
    container = document.getElementById(container);
  }
  
  if (file && file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = function(e) {
      container.innerHTML = `<img src="${e.target.result}" alt="Preview" class="w-32 h-32 object-cover rounded">`;
    };
    reader.readAsDataURL(file);
  } else {
    container.innerHTML = '';
  }
}

function previewVideo(file, container) {
  if (typeof container === 'string') {
    container = document.getElementById(container);
  }
  
  if (file && file.type.startsWith('video/')) {
    const reader = new FileReader();
    reader.onload = function(e) {
      container.innerHTML = `<video src="${e.target.result}" controls class="w-64 h-36 rounded"></video>`;
    };
    reader.readAsDataURL(file);
  } else {
    container.innerHTML = '';
  }
}

// Notification function
function showNotification(message, type = 'success') {
  const notification = document.getElementById('notification');
  const notificationText = document.getElementById('notification-text');
  
  notificationText.textContent = message;
  
  if (type === 'error') {
    notification.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-md shadow-lg';
  } else {
    notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-md shadow-lg';
  }
  
  notification.classList.remove('hidden');
  
  setTimeout(() => {
    notification.classList.add('hidden');
  }, 3000);
}

// Utility functions
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Make functions available globally
window.editArticle = editArticle;
window.deleteArticle = deleteArticle;