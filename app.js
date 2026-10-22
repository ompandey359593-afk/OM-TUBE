const DB_NAME = 'om-tube-db';
const STORE = 'videos';
let db;
let currentVideoId = null;
let currentObjectUrl = null;
let currentYoutubeId = null;
let youtubeSearchTimer = null;
let lastYoutubeQuery = '';
let toastTimer;

const $ = (id) => document.getElementById(id);
const views = {home: $('homeView'), shorts: $('shortsView'), player: $('playerView'), upload: $('uploadView')};

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, {keyPath: 'id', autoIncrement: true});
    request.onsuccess = () => { db = request.result; resolve(db); };
    request.onerror = () => reject(request.error);
  });
}
function allVideos() {
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result.sort((a,b) => b.created - a.created));
    req.onerror = () => reject(req.error);
  });
}
function addVideo(video) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).add(video);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function getVideo(id) {
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(Number(id));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function removeVideo(id) {
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readwrite').objectStore(STORE).delete(Number(id));
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
function showToast(message) {
  const t = $('toast'); t.textContent = message; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}
function navigate(view) {
  Object.entries(views).forEach(([key, el]) => el.classList.toggle('active', key === view));
  document.querySelectorAll('.nav-item[data-view]').forEach(el => el.classList.toggle('active', el.dataset.view === view && view !== 'player' && view !== 'upload'));
  window.scrollTo({top: 0, behavior: 'smooth'});
  if (view === 'home' || view === 'shorts') render();
}
function formatBytes(bytes) {
  if (!bytes) return 'Video';
  const units = ['B','KB','MB','GB']; let i=0, n=bytes;
  while(n>=1024 && i<units.length-1){n/=1024;i++;}
  return `${n.toFixed(i ? 1 : 0)} ${units[i]}`;
}
function safeText(value) {
  return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function cardHTML(v) {
  return `<article class="video-card" data-play="${v.id}" tabindex="0" role="button" aria-label="Play ${safeText(v.name)}">
    <div class="thumb"><div class="thumb-fallback">▶</div><span class="duration">${safeText(formatBytes(v.size))}</span></div>
    <h3>${safeText(v.name)}</h3><p>Added to your library · ${safeText(new Date(v.created).toLocaleDateString())}</p>
  </article>`;
}
async function render() {
  if (!db) return;
  const videos = await allVideos();
  const rawQuery = $('search').value.trim();
  const query = rawQuery.toLowerCase();
  const filtered = videos.filter(v => v.name.toLowerCase().includes(query));
  $('videoCount').textContent = `${videos.length} video${videos.length===1?'':'s'}`;
  $('videoGrid').innerHTML = filtered.map(cardHTML).join('');
  $('emptyState').style.display = videos.length ? 'none' : 'block';
  $('videoGrid').style.display = filtered.length ? 'grid' : 'none';
  if (videos.length && !filtered.length) {
    $('videoGrid').innerHTML = '<p class="muted">No videos match that search. Try another title.</p>';
    $('videoGrid').style.display = 'block';
  }
  $('shortsFeed').innerHTML = filtered.map(v => `<article class="short-card" data-play="${v.id}" tabindex="0" role="button" aria-label="Play ${safeText(v.name)}"><div class="short-overlay"><strong>${safeText(v.name)}</strong><span>OM Tube · Your library</span></div><div class="thumb-fallback">▶</div></article>`).join('');
  $('shortsEmpty').style.display = videos.length ? 'none' : 'block';
  $('shortsFeed').style.display = filtered.length ? 'grid' : 'none';
  if (rawQuery !== lastYoutubeQuery) {
    lastYoutubeQuery = rawQuery;
    clearTimeout(youtubeSearchTimer);
    if (rawQuery.length >= 2 && getApiKey()) {
      $('youtubeStatus').textContent = 'Searching YouTube…';
      youtubeSearchTimer = setTimeout(() => searchYouTube(rawQuery), 450);
    } else {
      $('youtubeGrid').innerHTML = '';
      $('youtubeStatus').textContent = '';
      $('youtubeHint').style.display = getApiKey() ? 'none' : 'block';
    }
  }
}
async function playVideo(id) {
  const v = await getVideo(id);
  if (!v) return showToast('This video is no longer in your library.');
  currentVideoId = v.id;
  currentYoutubeId = null;
  $('youtubePlayerShell').replaceChildren();
  $('youtubePlayerShell').hidden = true;
  $('localPlayerShell').hidden = false;
  $('deleteVideo').hidden = false;
  if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
  currentObjectUrl = URL.createObjectURL(v.blob);
  $('mainPlayer').src = currentObjectUrl;
  $('playerTitle').textContent = v.name;
  $('playerMeta').textContent = `${formatBytes(v.size)} · Added ${new Date(v.created).toLocaleDateString()}`;
  navigate('player');
  $('mainPlayer').play().catch(() => {});
}
function getApiKey() { return localStorage.getItem('om-tube-youtube-api-key') || ''; }
function openSettings() {
  $('apiKeyInput').value = getApiKey();
  $('apiKeyShow').checked = false;
  $('apiKeyInput').type = 'password';
  $('settingsDialog').showModal();
}
async function searchYouTube(query) {
  const key = getApiKey();
  if (!key || query.trim().length < 2) return;
  $('youtubeStatus').textContent = 'Searching YouTube…';
  $('youtubeHint').style.display = 'none';
  try {
    const params = new URLSearchParams({
      part: 'snippet', type: 'video', q: query, maxResults: '12',
      regionCode: 'IN', videoEmbeddable: 'true', key
    });
    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`);
    const data = await response.json();
    if (!response.ok) {
      const message = data?.error?.message || 'YouTube API request failed.';
      throw new Error(message);
    }
    if ($('search').value.trim() !== query) return;
    const items = (data.items || []).filter(item => item.id && item.id.videoId && item.snippet);
    $('youtubeGrid').innerHTML = items.map(item => {
      const id = item.id.videoId;
      const title = item.snippet.title || 'Untitled video';
      const channel = item.snippet.channelTitle || 'YouTube creator';
      const thumb = item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '';
      return `<article class="video-card youtube-card" data-youtube="${safeText(id)}" tabindex="0" role="button" aria-label="Play ${safeText(title)}">
        <div class="thumb">${thumb ? `<img class="youtube-thumb" src="${safeText(thumb)}" alt="" loading="lazy">` : '<div class="thumb-fallback">▶</div>'}<span class="youtube-badge">YOUTUBE</span></div>
        <h3>${safeText(title)}</h3><p>${safeText(channel)}</p>
      </article>`;
    }).join('');
    $('youtubeStatus').textContent = items.length ? `${items.length} YouTube results · playback uses YouTube's official player` : 'No embeddable videos found for this search.';
  } catch (error) {
    $('youtubeGrid').innerHTML = '';
    $('youtubeStatus').textContent = `YouTube search failed: ${error.message}. Check the API key, API enablement, quota, and key restrictions.`;
  }
}
function playYoutube(videoId, title) {
  currentYoutubeId = videoId;
  currentVideoId = null;
  if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
  currentObjectUrl = null;
  $('mainPlayer').pause();
  $('mainPlayer').removeAttribute('src');
  $('mainPlayer').load();
  $('localPlayerShell').hidden = true;
  $('youtubePlayerShell').hidden = false;
  const frame = document.createElement('iframe');
  const embedParams = new URLSearchParams({ autoplay: '1', playsinline: '1', origin: location.origin });
  frame.src = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?${embedParams.toString()}`;
  frame.title = title || 'YouTube video';
  frame.setAttribute('loading', 'eager');
  frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  // YouTube Error 153 can occur when the embed request lacks a usable referrer.
  // Use the official YouTube embed endpoint and send only the app origin.
  frame.referrerPolicy = 'origin';
  frame.allowFullscreen = true;
  $('youtubePlayerShell').replaceChildren(frame);
  $('playerTitle').textContent = title || 'YouTube video';
  $('playerMeta').textContent = 'YouTube video · Official embedded player';
  $('deleteVideo').hidden = true;
  navigate('player');
}
function openUpload() { $('uploadStatus').textContent = ''; navigate('upload'); }
async function handleFiles(files) {
  const list = Array.from(files || []).filter(f => f.type.startsWith('video/'));
  if (!list.length) { showToast('Choose a video file to upload.'); return; }
  $('uploadStatus').textContent = 'Adding videos to this device…';
  let added = 0;
  for (const file of list) {
    try {
      await addVideo({name: file.name.replace(/\.[^.]+$/, '') || file.name, fileName:file.name, type:file.type, size:file.size, created:Date.now(), blob:file});
      added++;
    } catch (err) {
      console.error(err);
      $('uploadStatus').textContent = 'Storage limit reached or this browser could not save the file.';
      showToast('Could not save this file. Try a smaller video or free up storage.');
      break;
    }
  }
  $('fileInput').value = '';
  if (added) {
    $('uploadStatus').textContent = `${added} video${added===1?'':'s'} added to your device.`;
    showToast(`${added} video${added===1?'':'s'} added to OM Tube.`);
    navigate('home');
  }
  await render();
}
document.addEventListener('click', e => {
  const nav = e.target.closest('[data-view]');
  if (nav) { navigate(nav.dataset.view); return; }
  const card = e.target.closest('[data-play]');
  if (card) playVideo(card.dataset.play);
});
document.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-play]')) { e.preventDefault(); playVideo(e.target.dataset.play); }
});
$('uploadTop').addEventListener('click', openUpload);
$('heroUpload').addEventListener('click', openUpload);
$('emptyUpload').addEventListener('click', openUpload);
$('shortsUpload').addEventListener('click', openUpload);
$('uploadNav').addEventListener('click', openUpload);
$('fileInput').addEventListener('change', e => handleFiles(e.target.files));
$('search').addEventListener('input', render);
$('backFromPlayer').addEventListener('click', () => { $('youtubePlayerShell').replaceChildren(); $('youtubePlayerShell').hidden = true; $('localPlayerShell').hidden = false; currentYoutubeId = null; navigate('home'); });
$('backFromUpload').addEventListener('click', () => navigate('home'));
$('deleteVideo').addEventListener('click', async () => {
  if (!currentVideoId) return;
  if (!confirm('Delete this video from this device? This does not delete the original file.')) return;
  await removeVideo(currentVideoId);
  $('mainPlayer').pause(); $('mainPlayer').removeAttribute('src'); $('mainPlayer').load();
  if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
  currentObjectUrl = null; currentVideoId = null;
  showToast('Video removed from OM Tube.');
  navigate('home');
});
$('libraryNav').addEventListener('click', () => { $('search').focus(); navigate('home'); });
$('apiSettings').addEventListener('click', openSettings);
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('om-tube-theme', theme);
  const button = $('themeToggle');
  if (button) { button.textContent = theme === 'light' ? '☾' : '☼'; button.setAttribute('aria-label', theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'); }
  const meta = document.querySelector('meta[name=theme-color]');
  if (meta) meta.content = theme === 'light' ? '#f7f7f8' : '#101114';
}
applyTheme(localStorage.getItem('om-tube-theme') || 'dark');
$('themeToggle').addEventListener('click', () => applyTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light'));
$('closeSettings').addEventListener('click', () => $('settingsDialog').close());
$('settingsForm').addEventListener('submit', e => {
  e.preventDefault();
  const key = $('apiKeyInput').value.trim();
  if (key) localStorage.setItem('om-tube-youtube-api-key', key);
  else localStorage.removeItem('om-tube-youtube-api-key');
  $('settingsDialog').close();
  $('youtubeHint').style.display = key ? 'none' : 'block';
  showToast(key ? 'YouTube API key saved on this device.' : 'YouTube API key cleared.');
  lastYoutubeQuery = '';
  render();
  if ($('search').value.trim().length >= 2 && key) searchYouTube($('search').value.trim());
});
$('clearApiKey').addEventListener('click', () => {
  localStorage.removeItem('om-tube-youtube-api-key');
  $('apiKeyInput').value = '';
  $('youtubeGrid').innerHTML = '';
  $('youtubeStatus').textContent = '';
  $('youtubeHint').style.display = 'block';
  showToast('YouTube API key cleared from this browser.');
});
$('apiKeyShow').addEventListener('change', () => $('apiKeyInput').type = $('apiKeyShow').checked ? 'text' : 'password');
document.addEventListener('click', e => {
  const yt = e.target.closest('[data-youtube]');
  if (yt) playYoutube(yt.dataset.youtube, yt.querySelector('h3')?.textContent || 'YouTube video');
});
document.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-youtube]')) { e.preventDefault(); playYoutube(e.target.dataset.youtube, e.target.querySelector('h3')?.textContent || 'YouTube video'); }
});
(async function init() {
  try {
    await openDB();
    await render();
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js').catch(()=>{});
  } catch (err) {
    console.error(err);
    showToast('Your browser does not support local video storage.');
  }
})();
