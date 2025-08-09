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
  
  // Initialize Rich Text Editor
  initializeRichTextEditor();
  
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
  
  // Setup media management
  setupMediaManagement();
  await loadAllGalleries();
  
  // Setup comments management
  setupCommentsManagement();
});

// Initialize Rich Text Editor
let quillEditor;

function initializeRichTextEditor() {
  quillEditor = new Quill('#article-content-editor', {
    theme: 'snow',
    modules: {
      toolbar: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'align': [] }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        ['blockquote', 'code-block'],
        ['link'],
        ['clean']
      ]
    },
    placeholder: 'Tulis konten artikel di sini...'
  });
  
  // Update hidden input when content changes
  quillEditor.on('text-change', function() {
    const content = quillEditor.root.innerHTML;
    document.getElementById('article-content').value = content;
  });
}

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
async function setupTabs() {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', async () => {
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
      
      // Load comments when comments tab is selected
      if (tabId === 'comments') {
        await loadAdminComments();
      }
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
    
    if (imageInput) {
      imageInput.addEventListener('change', (e) => {
        const preview = form.querySelector('.image-preview');
        previewImage(e.target.files[0], preview);
      });
    }
    
    if (videoInput) {
      videoInput.addEventListener('change', (e) => {
        const preview = form.querySelector('.video-preview');
        previewVideo(e.target.files[0], preview);
      });
    }
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
    
    // Set content in rich text editor
    if (quillEditor) {
      quillEditor.root.innerHTML = article.content || '';
      document.getElementById('article-content').value = article.content || '';
    }
    
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
    
    // Clear rich text editor
    if (quillEditor) {
      quillEditor.setContents([]);
      document.getElementById('article-content').value = '';
    }
    
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
  
  // Update hidden input with editor content before submitting
  if (quillEditor) {
    const content = quillEditor.root.innerHTML;
    document.getElementById('article-content').value = content;
  }
  
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
  
  console.log('Saving content for page:', page);
  
  try {
    const response = await fetch(`/api/content/${page}`, {
      method: 'PUT',
      body: formData
    });
    
    const result = await response.json();
    console.log('Save content response:', result);
    
    if (response.ok) {
      showNotification('Konten berhasil disimpan!');
      // Reload content to show updated data
      await loadContent();
    } else {
      showNotification(result.error || 'Terjadi kesalahan', 'error');
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

// Setup media management
function setupMediaManagement() {
  // Setup add media buttons
  document.getElementById('add-kajian-media-btn').addEventListener('click', () => {
    openMediaModal('kajian');
  });
  
  document.getElementById('add-pendidikan-media-btn').addEventListener('click', () => {
    openMediaModal('pendidikan');
  });
  
  document.getElementById('add-kegiatan-media-btn').addEventListener('click', () => {
    openMediaModal('kegiatan');
  });
  
  // Setup modal buttons
  document.getElementById('cancel-media-btn').addEventListener('click', () => {
    closeMediaModal();
  });
  
  document.getElementById('save-media-btn').addEventListener('click', () => {
    saveMedia();
  });
  
  // Setup file previews
  document.getElementById('media-image').addEventListener('change', (e) => {
    previewImage(e.target.files[0], 'media-image-preview');
  });
  
  document.getElementById('media-video').addEventListener('change', (e) => {
    previewVideo(e.target.files[0], 'media-video-preview');
  });
}

// Load all galleries
async function loadAllGalleries() {
  await loadGallery('kajian');
  await loadGallery('pendidikan');
  await loadGallery('kegiatan');
}

// Load gallery for specific page
async function loadGallery(page) {
  try {
    const response = await fetch(`/api/gallery/${page}`);
    const gallery = await response.json();
    
    const container = document.getElementById(`${page}-gallery-list`);
    container.innerHTML = '';
    
    if (gallery.length === 0) {
      container.innerHTML = '<p class="text-gray-500 col-span-full text-center">Belum ada media.</p>';
      return;
    }
    
    gallery.forEach(media => {
      const mediaElement = document.createElement('div');
      mediaElement.className = 'bg-white rounded-lg shadow-md overflow-hidden relative';
      
      let mediaContent = '';
      if (media.image) {
        mediaContent = `<img src="${media.image}" alt="${media.title}" class="w-full h-32 object-cover">`;
      } else if (media.video) {
        mediaContent = `<video src="${media.video}" class="w-full h-32 object-cover" controls></video>`;
      } else {
        mediaContent = `<div class="w-full h-32 bg-gray-200 flex items-center justify-center">
          <span class="text-gray-500">No Media</span>
        </div>`;
      }
      
      mediaElement.innerHTML = `
        ${mediaContent}
        <div class="p-3">
          <h4 class="font-semibold text-sm mb-1">${media.title}</h4>
          <p class="text-gray-600 text-xs mb-2">${media.description}</p>
          <div class="flex space-x-2">
            <button onclick="editMedia('${page}', ${media.id})" class="text-blue-600 hover:text-blue-800 text-xs">Edit</button>
            <button onclick="deleteMedia('${page}', ${media.id})" class="text-red-600 hover:text-red-800 text-xs">Hapus</button>
          </div>
        </div>
      `;
      container.appendChild(mediaElement);
    });
  } catch (error) {
    console.error(`Error loading ${page} gallery:`, error);
    const container = document.getElementById(`${page}-gallery-list`);
    container.innerHTML = '<p class="text-red-500 col-span-full text-center">Error loading gallery</p>';
  }
}

// Media modal functions
function openMediaModal(page, media = null) {
  const modal = document.getElementById('media-modal');
  const title = document.getElementById('media-modal-title');
  const form = document.getElementById('media-form');
  
  document.getElementById('media-page').value = page;
  
  if (media) {
    title.textContent = 'Edit Media';
    document.getElementById('media-id').value = media.id;
    document.getElementById('media-title').value = media.title;
    document.getElementById('media-description').value = media.description;
    
    // Show current images/videos
    if (media.image) {
      document.getElementById('media-image-preview').innerHTML = 
        `<img src="${media.image}" alt="Current image" class="w-32 h-32 object-cover rounded">`;
    }
    
    if (media.video) {
      document.getElementById('media-video-preview').innerHTML = 
        `<video src="${media.video}" controls class="w-64 h-36 rounded"></video>`;
    }
  } else {
    title.textContent = `Tambah Media ${page.charAt(0).toUpperCase() + page.slice(1)}`;
    form.reset();
    document.getElementById('media-image-preview').innerHTML = '';
    document.getElementById('media-video-preview').innerHTML = '';
  }
  
  modal.classList.remove('hidden');
}

function closeMediaModal() {
  const modal = document.getElementById('media-modal');
  modal.classList.add('hidden');
}

// Save media
async function saveMedia() {
  const form = document.getElementById('media-form');
  const formData = new FormData(form);
  const mediaId = document.getElementById('media-id').value;
  const page = document.getElementById('media-page').value;
  
  // Validate required fields
  const title = document.getElementById('media-title').value.trim();
  const description = document.getElementById('media-description').value.trim();
  
  if (!title) {
    showNotification('Judul harus diisi', 'error');
    return;
  }
  
  if (!description) {
    showNotification('Deskripsi harus diisi', 'error');
    return;
  }
  
  // Check if at least one media file is provided for new media
  if (!mediaId) {
    const imageFile = document.getElementById('media-image').files[0];
    const videoFile = document.getElementById('media-video').files[0];
    
    if (!imageFile && !videoFile) {
      showNotification('Pilih gambar atau video', 'error');
      return;
    }
  }
  
  try {
    const url = mediaId ? `/api/gallery/${page}/${mediaId}` : `/api/gallery/${page}`;
    const method = mediaId ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
      method: method,
      body: formData
    });
    
    const result = await response.json();
    
    if (response.ok) {
      showNotification('Media berhasil disimpan!');
      closeMediaModal();
      await loadGallery(page);
    } else {
      showNotification(result.error || 'Terjadi kesalahan', 'error');
    }
  } catch (error) {
    console.error('Error saving media:', error);
    showNotification('Terjadi kesalahan saat menyimpan media', 'error');
  }
}

// Edit media
async function editMedia(page, id) {
  try {
    const response = await fetch(`/api/gallery/${page}`);
    const gallery = await response.json();
    const media = gallery.find(m => m.id === parseInt(id));
    if (media) {
      openMediaModal(page, media);
    }
  } catch (error) {
    console.error('Error loading media:', error);
  }
}

// Delete media
async function deleteMedia(page, id) {
  if (!confirm('Apakah Anda yakin ingin menghapus media ini?')) {
    return;
  }
  
  try {
    const response = await fetch(`/api/gallery/${page}/${id}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      showNotification('Media berhasil dihapus!');
      await loadGallery(page);
    } else {
      const error = await response.json();
      showNotification(error.error || 'Terjadi kesalahan', 'error');
    }
  } catch (error) {
    console.error('Error deleting media:', error);
    showNotification('Terjadi kesalahan saat menghapus media', 'error');
  }
}

// Make media functions available globally
window.editMedia = editMedia;
window.deleteMedia = deleteMedia;

// Comments management
function setupCommentsManagement() {
  // Comments will be loaded when tab is clicked
}

// Load comments for admin
async function loadAdminComments() {
  try {
    const response = await fetch('/api/comments');
    const comments = await response.json();
    
    const container = document.getElementById('admin-comments-list');
    const noComments = document.getElementById('admin-no-comments');
    
    if (comments.length === 0) {
      container.classList.add('hidden');
      noComments.classList.remove('hidden');
      return;
    }
    
    noComments.classList.add('hidden');
    container.classList.remove('hidden');
    container.innerHTML = '';
    
    comments.forEach(comment => {
      const commentElement = document.createElement('div');
      commentElement.className = 'border border-gray-200 rounded-md p-4';
      commentElement.innerHTML = `
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <div class="flex items-center space-x-2 mb-2">
              <div class="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-semibold">
                ${comment.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h4 class="font-medium text-gray-900">${comment.name}</h4>
                <p class="text-sm text-gray-500">${comment.email}</p>
              </div>
            </div>
            <p class="text-gray-700 mb-2">${comment.message}</p>
            <p class="text-xs text-gray-400">${formatDate(comment.createdAt)}</p>
          </div>
          <div class="ml-4">
            <button onclick="deleteComment(${comment.id})" class="text-red-600 hover:text-red-800 text-sm">
              Hapus
            </button>
          </div>
        </div>
      `;
      container.appendChild(commentElement);
    });
  } catch (error) {
    console.error('Error loading admin comments:', error);
  }
}

// Delete comment
async function deleteComment(id) {
  if (!confirm('Apakah Anda yakin ingin menghapus pesan ini?')) {
    return;
  }
  
  try {
    const response = await fetch(`/api/comments/${id}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      showNotification('Pesan berhasil dihapus!');
      await loadAdminComments();
    } else {
      const error = await response.json();
      showNotification(error.error || 'Terjadi kesalahan', 'error');
    }
  } catch (error) {
    console.error('Error deleting comment:', error);
    showNotification('Terjadi kesalahan saat menghapus pesan', 'error');
  }
}

// Make comment functions available globally
window.deleteComment = deleteComment;