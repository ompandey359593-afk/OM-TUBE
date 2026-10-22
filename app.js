const $ = (id) => document.getElementById(id);

const state = {
  apiKey: localStorage.getItem("omTubeApiKey") || "",
  theme: localStorage.getItem("omTubeTheme") || "dark",
  videos: [],
  currentVideo: null,
  previousPage: "homePage"
};

const pages = ["homePage", "shortsPage", "watchPage", "uploadPage"];

function showToast(message) {
  const toast = $("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
}

function setStatus(message) {
  const status = $("statusMessage");
  if (status) status.textContent = message;
}

function goToPage(pageId) {
  if (!pages.includes(pageId)) return;

  pages.forEach((id) => {
    const page = $(id);
    if (page) page.hidden = id !== pageId;
  });

  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle(
      "active",
      button.dataset.page === pageId ||
      (pageId === "homePage" && button.dataset.library === "true")
    );
  });

  if (pageId !== "watchPage") {
    state.previousPage = pageId;
  }

  window.scrollTo({ top: 0, behavior: "smooth" });

  if (pageId === "homePage") renderLibrary();
  if (pageId === "shortsPage") renderShorts();
}

function applyTheme(theme) {
  state.theme = theme === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = state.theme;
  localStorage.setItem("omTubeTheme", state.theme);

  const button = $("themeButton");
  if (button) {
    button.textContent = state.theme === "dark" ? "☀️" : "🌙";
    button.setAttribute(
      "aria-label",
      state.theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
    );
  }
}

function openSettings() {
  const dialog = $("settingsDialog");
  if (!dialog) return;

  $("apiKeyInput").value = state.apiKey;
  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
  }
}

function closeSettings() {
  const dialog = $("settingsDialog");
  if (!dialog) return;

  if (typeof dialog.close === "function") {
    dialog.close();
  } else {
    dialog.removeAttribute("open");
  }
}

function escapeText(value) {
  return String(value ?? "");
}

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function makeThumbnail(url, title) {
  const image = document.createElement("img");
  image.src = url || "";
  image.alt = title || "Video thumbnail";
  image.loading = "lazy";

  image.addEventListener("error", () => {
    image.style.display = "none";
  }, { once: true });

  return image;
}

function createVideoCard(video, options = {}) {
  const card = makeElement("article", "video-card");
  const openButton = makeElement("button", "video-card-button");
  openButton.type = "button";
  openButton.setAttribute("aria-label", `Play ${video.title}`);

  const thumbnailWrap = makeElement("div", "thumbnail-wrap");
  thumbnailWrap.appendChild(makeThumbnail(video.thumbnail, video.title));

  if (video.isLocal) {
    const localTag = makeElement("span", "video-badge", "LOCAL");
    thumbnailWrap.appendChild(localTag);
  }

  openButton.appendChild(thumbnailWrap);

  const details = makeElement("div", "video-info");
  details.appendChild(makeElement("h3", "video-title", video.title));
  details.appendChild(
    makeElement(
      "p",
      "video-channel",
      video.channel || (video.isLocal ? "Your device" : "YouTube")
    )
  );

  openButton.appendChild(details);
  openButton.addEventListener("click", () => playVideo(video));
  card.appendChild(openButton);

  if (options.showDelete && video.isLocal) {
    const removeButton = makeElement("button", "delete-local-button", "Remove");
    removeButton.type = "button";
    removeButton.addEventListener("click", () => removeLocalVideo(video.id));
    card.appendChild(removeButton);
  }

  return card;
}

function renderLibrary() {
  const grid = $("libraryGrid");
  const empty = $("emptyLibrary");
  if (!grid || !empty) return;

  grid.replaceChildren();

  if (state.videos.length === 0) {
    empty.hidden = false;
    return;
  }

  empty.hidden = true;

  state.videos.forEach((video) => {
    grid.appendChild(createVideoCard(video, { showDelete: true }));
  });
}

function renderShorts() {
  const grid = $("shortsGrid");
  const empty = $("emptyShorts");
  if (!grid || !empty) return;

  grid.replaceChildren();

  const videos = state.videos.filter((video) => video.isLocal);

  if (videos.length === 0) {
    empty.hidden = false;
    return;
  }

  empty.hidden = true;

  videos.forEach((video) => {
    const card = makeElement("article", "short-card");
    const button = makeElement("button", "short-card-button");
    button.type = "button";
    button.appendChild(makeThumbnail(video.thumbnail, video.title));
    button.appendChild(makeElement("span", "short-title", video.title));
    button.addEventListener("click", () => playVideo(video));
    card.appendChild(button);
    grid.appendChild(card);
  });
}

function showPlayer(video) {
  const container = $("playerContainer");
  if (!container) return;

  container.replaceChildren();

  if (video.isLocal) {
    const player = document.createElement("video");
    player.controls = true;
    player.autoplay = true;
    player.playsInline = true;
    player.preload = "metadata";
    player.src = video.url;
    player.style.width = "100%";
    player.style.maxHeight = "70vh";
    container.appendChild(player);
  } else {
    const iframe = document.createElement("iframe");
    iframe.src =
      `https://www.youtube.com/embed/${encodeURIComponent(video.id)}?autoplay=1`;
    iframe.title = video.title;
    iframe.allow =
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    iframe.style.width = "100%";
    iframe.style.aspectRatio = "16 / 9";
    iframe.style.border = "0";
    container.appendChild(iframe);
  }

  $("watchTitle").textContent = video.title;
  $("watchDetails").textContent = video.isLocal
    ? "Local video • Stored only for this app session"
    : `${video.channel || "YouTube"} • Playing through the official YouTube player`;

  const deleteButton = $("deleteVideoButton");
  if (deleteButton) deleteButton.hidden = !video.isLocal;
}

function playVideo(video) {
  state.currentVideo = video;
  showPlayer(video);

  pages.forEach((id) => {
    if ($(id)) $(id).hidden = id !== "watchPage";
  });

  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.remove("active");
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function removeLocalVideo(id) {
  const index = state.videos.findIndex(
    (video) => video.id === id && video.isLocal
  );

  if (index === -1) return;

  const [video] = state.videos.splice(index, 1);
  URL.revokeObjectURL(video.url);

  if (state.currentVideo?.id === id) {
    state.currentVideo = null;
    $("playerContainer").replaceChildren();
    goToPage("homePage");
  }

  renderLibrary();
  renderShorts();
  showToast("Video removed from OM Tube");
}

function makeYouTubeVideo(item) {
  const snippet = item.snippet || {};
  const thumbnails = snippet.thumbnails || {};
  const thumbnail =
    thumbnails.medium?.url ||
    thumbnails.high?.url ||
    thumbnails.default?.url ||
    "";

  return {
    id: item.id?.videoId || "",
    title: escapeText(snippet.title || "Untitled video"),
    channel: escapeText(snippet.channelTitle || "YouTube creator"),
    thumbnail,
    isLocal: false
  };
}

async function searchYouTube(query) {
  const cleanQuery = query.trim();

  if (!state.apiKey) {
    setStatus("Add your YouTube Data API key in Settings to search YouTube.");
    showToast("YouTube search needs an API key");
    return;
  }

  if (!cleanQuery) {
    setStatus("Type something in the search bar to find videos.");
    return;
  }

  setStatus("Searching YouTube…");

  const grid = $("resultsGrid");
  if (grid) grid.replaceChildren();

  try {
    const params = new URLSearchParams({
      part: "snippet",
      type: "video",
      maxResults: "12",
      q: cleanQuery,
      key: state.apiKey
    });

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${params.toString()}`
    );

    const data = await response.json();

    if (!response.ok) {
      const reason = data.error?.errors?.[0]?.reason;
      if (reason === "quotaExceeded") {
        throw new Error("YouTube API quota reached. Try again later.");
      }
      throw new Error(
        data.error?.message || "YouTube search failed. Check your API key."
      );
    }

    const results = (data.items || [])
      .map(makeYouTubeVideo)
      .filter((video) => video.id);

    if (!grid) return;

    grid.replaceChildren();

    if (results.length === 0) {
      setStatus("No videos found. Try a different search.");
      return;
    }

    results.forEach((video) => grid.appendChild(createVideoCard(video)));
    setStatus(`${results.length} videos found for “${cleanQuery}”.`);
  } catch (error) {
    setStatus(error.message || "Something went wrong while searching.");
  }
}

function addLocalVideos(files) {
  const selected = Array.from(files || []).filter((file) =>
    file.type.startsWith("video/")
  );

  if (selected.length === 0) {
    $("uploadMessage").textContent = "Choose a supported video file first.";
    return;
  }

  selected.forEach((file) => {
    const url = URL.createObjectURL(file);
    const video = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: file.name.replace(/\.[^/.]+$/, "") || "Local video",
      channel: "Your device",
      thumbnail: "",
      url,
      isLocal: true
    };

    state.videos.unshift(video);
  });

  $("uploadMessage").textContent =
    `${selected.length} video${selected.length === 1 ? "" : "s"} added for this session.`;
  $("videoFiles").value = "";

  renderLibrary();
  renderShorts();
  showToast("Videos added to your library");
}

function initialise() {
  applyTheme(state.theme);

  $("homeButton")?.addEventListener("click", () => goToPage("homePage"));

  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      const pageId = button.dataset.page;
      goToPage(pageId);

      if (button.dataset.library === "true") {
        setTimeout(() => {
          document.getElementById("libraryGrid")?.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
        }, 100);
      }
    });
  });

  $("searchForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    goToPage("homePage");
    searchYouTube($("searchInput").value);
  });

  document.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".chip").forEach((item) => {
        item.classList.toggle("selected", item === chip);
      });

      const query = chip.dataset.query || chip.textContent.trim();
      $("searchInput").value = query;
      goToPage("homePage");
      searchYouTube(query || "popular videos");
    });
  });

  $("themeButton")?.addEventListener("click", () => {
    applyTheme(state.theme === "dark" ? "light" : "dark");
  });

  $("settingsButton")?.addEventListener("click", openSettings);
  $("closeSettings")?.addEventListener("click", closeSettings);

  $("settingsDialog")?.addEventListener("click", (event) => {
    if (event.target === $("settingsDialog")) closeSettings();
  });

  $("settingsForm")?.addEventListener("submit", (event) => {
    event.preventDefault();

    state.apiKey = $("apiKeyInput").value.trim();

    if (state.apiKey) {
      localStorage.setItem("omTubeApiKey", state.apiKey);
      showToast("API key saved on this device");
    } else {
      localStorage.removeItem("omTubeApiKey");
      showToast("API key cleared");
    }

    closeSettings();
  });

  $("showApiKey")?.addEventListener("change", (event) => {
    $("apiKeyInput").type = event.target.checked ? "text" : "password";
  });

  $("clearApiKey")?.addEventListener("click", () => {
    state.apiKey = "";
    localStorage.removeItem("omTubeApiKey");
    $("apiKeyInput").value = "";
    showToast("API key cleared");
  });

  $("addVideoButton")?.addEventListener("click", () => {
    goToPage("uploadPage");
  });

  $("videoFiles")?.addEventListener("change", (event) => {
    addLocalVideos(event.target.files);
  });

  $("backButton")?.addEventListener("click", () => {
    $("playerContainer")?.replaceChildren();
    state.currentVideo = null;
    goToPage(state.previousPage || "homePage");
  });

  $("deleteVideoButton")?.addEventListener("click", () => {
    if (state.currentVideo?.isLocal) {
      removeLocalVideo(state.currentVideo.id);
    }
  });

  renderLibrary();
  renderShorts();
  setStatus("Search for videos, or add local videos from your device.");
}

document.addEventListener("DOMContentLoaded", initialise);
    
