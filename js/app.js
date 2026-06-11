/* ==========================================================================
   ASPAC新潟大会 福山JCコミュニティサイト - メインアプリケーションスクリプト
   ========================================================================== */

// アプリケーションの状態管理
const state = {
  isLoggedIn: false,
  activeTab: 'home', // デフォルトをホームに変更
  photos: [],
  youtubeVideoId: null
};

// --------------------------------------------------------------------------
// 1. 初期化処理
// --------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  // 直接アプリを表示してデータをロード
  showApp();

  // 設定の有効性を確認
  checkConfig();

  // アップロード用のドラッグ＆ドロップ初期化
  initUploadDragAndDrop();
});

// 各設定がダミーのままか確認する関数
function isPhotosDummy() {
  const conf = window.CONFIG;
  return !conf || 
         conf.API_KEY === 'YOUR_GOOGLE_API_KEY' || 
         conf.API_KEY === '' ||
         conf.PHOTO_FOLDER_ID === 'YOUR_PHOTO_FOLDER_ID' ||
         conf.PHOTO_FOLDER_ID === '';
}

function isSurveyDummy() {
  const conf = window.CONFIG;
  return !conf || 
         conf.API_KEY === 'YOUR_GOOGLE_API_KEY' || 
         conf.API_KEY === '' ||
         conf.SURVEY_FOLDER_ID === 'YOUR_SURVEY_FOLDER_ID' ||
         conf.SURVEY_FOLDER_ID === '';
}


// 互換性のために残す古いダミーチェック
function isConfigDummy() {
  return isPhotosDummy();
}

function checkConfig() {
  const photosDummy = isPhotosDummy();
  const surveyDummy = isSurveyDummy();
  
  if (photosDummy) {
    console.warn('ギャラリー用Google ドライブの設定が完了していないため、デモモードで動作します。');
  }
  if (surveyDummy) {
    console.warn('現地調査用Google ドライブの設定が完了していないため、デモモードで動作します。');
  }
  if (!photosDummy && !surveyDummy) {
    console.log('すべてのGoogle ドライブの設定が正常に読み込まれました。実データモードで動作します。');
  }
}

function showApp() {
  const appContainer = document.getElementById('app-container');
  if (appContainer) appContainer.style.display = 'flex';
  
  // アプリ起動時にデータを読み込む
  loadTabData(state.activeTab);
}

// --------------------------------------------------------------------------
// 3. タブ切り替え制御
// --------------------------------------------------------------------------
function switchTab(tabId) {
  if (state.activeTab === tabId) return;

  // タブボタンのアクティブ状態切り替え
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  const activeBtn = document.getElementById(`tab-btn-${tabId}`);
  if (activeBtn) activeBtn.classList.add('active');

  // コンテンツエリアの表示切り替え
  document.querySelectorAll('.content-section').forEach(section => {
    section.classList.remove('active');
  });
  const activeSection = document.getElementById(`content-${tabId}`);
  if (activeSection) activeSection.classList.add('active');

  state.activeTab = tabId;
  
  // 切り替え先タブのデータを読み込み
  loadTabData(tabId);
}

function loadTabData(tabId) {
  if (tabId === 'photos') {
    fetchPhotos();
  } else if (tabId === 'survey') {
    fetchSurveyPhotos();
  } else if (tabId === 'shiori') {
    fetchShiori();
  } else if (tabId === 'youtube') {
    fetchYouTube();
  }
}

// --------------------------------------------------------------------------
// 4. データ取得ロジック (Google ドライブ API & デモフォールバック)
// --------------------------------------------------------------------------

// 📸 4-1. 写真データの読み込み
function fetchPhotos() {
  const grid = document.getElementById('photo-grid');
  const loading = document.getElementById('photo-loading');
  const empty = document.getElementById('photo-empty');

  grid.innerHTML = '';
  loading.style.display = 'flex';
  empty.style.display = 'none';

  if (isPhotosDummy()) {
    // === デモモード用のダミーデータ ===
    setTimeout(() => {
      loading.style.display = 'none';
      const demoPhotos = [
        { id: 'demo1', name: '新潟到着レセプションにて', createdTime: '2026-06-11T18:30:00+09:00', url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80' },
        { id: 'demo2', name: '新潟名物へぎそばとメンバー', createdTime: '2026-06-12T12:15:00+09:00', url: 'https://images.unsplash.com/photo-1583224964978-2257b960c3d3?auto=format&fit=crop&w=800&q=80' },
        { id: 'demo3', name: 'ASPAC新潟大会 会場前集合写真', createdTime: '2026-06-12T15:00:00+09:00', url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80' },
        { id: 'demo4', name: '大懇親会での盛り上がり', createdTime: '2026-06-13T20:00:00+09:00', url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80' },
        { id: 'demo5', name: '朱鷺メッセ展望台からの日本海', createdTime: '2026-06-14T10:30:00+09:00', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80' },
        { id: 'demo6', name: '福山帰還前の解団式', createdTime: '2026-06-14T16:00:00+09:00', url: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=800&q=80' }
      ];
      renderPhotos(demoPhotos);
    }, 1000);
    return;
  }

  // === Google Drive API による実データ取得 ===
  const folderId = window.CONFIG.PHOTO_FOLDER_ID;
  const apiKey = window.CONFIG.API_KEY;
  // 画像のみを対象として最新順で取得するクエリ
  const query = `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&orderBy=createdTime+desc&key=${apiKey}&fields=files(id,name,createdTime)`;

  fetch(url)
    .then(response => {
      if (!response.ok) {
        return response.json().then(err => {
          throw new Error(`Google Drive API エラー (${response.status}): ${err.error ? err.error.message : 'Unknown'}`);
        }).catch(() => {
          throw new Error(`Google Drive API 呼び出し失敗 (ステータス: ${response.status})`);
        });
      }
      return response.json();
    })
    .then(data => {
      loading.style.display = 'none';
      if (!data.files || data.files.length === 0) {
        empty.style.display = 'flex';
        return;
      }
      // Googleドライブ画像URLに加工
      const photos = data.files.map(file => {
        // 外部公開設定された画像であれば、サムネイル・オリジナルを下記URLで取得可能
        return {
          id: file.id,
          name: file.name.replace(/\.[^/.]+$/, ""), // 拡張子を削除
          createdTime: file.createdTime,
          // web用の高画質画像として1000px幅で取得するURL
          url: `https://drive.google.com/thumbnail?id=${file.id}&sz=w1000`
        };
      });
      renderPhotos(photos);
    })
    .catch(error => {
      console.error(error);
      loading.style.display = 'none';
      const fallbackGrid = document.getElementById('photo-grid');
      if (fallbackGrid) {
        fallbackGrid.innerHTML = `<div class="error-message">写真の読み込みに失敗しました。APIキーまたはフォルダの共有設定を確認してください。<br>${error.message}</div>`;
      }
    });
}

// ギャラリー表示のレンダリング
function renderPhotos(photos) {
  const container = document.getElementById('photo-gallery-container');
  const empty = document.getElementById('photo-empty');
  
  // 以前の動的な日付セクションをすべて削除
  document.querySelectorAll('.date-section').forEach(el => el.remove());
  
  // デフォルトの固定グリッドを非表示にする (動的グリッドを使用するため)
  const defaultGrid = document.getElementById('photo-grid');
  if (defaultGrid) defaultGrid.style.display = 'none';

  if (!photos || photos.length === 0) {
    empty.style.display = 'flex';
    return;
  }

  // 日付グループの初期定義 (ASPAC新潟大会日程 6/11〜14)
  const groups = {
    '6/11': { label: '6月11日 (木) — 大会1日目', photos: [] },
    '6/12': { label: '6月12日 (金) — 大会2日目', photos: [] },
    '6/13': { label: '6月13日 (土) — 大会3日目', photos: [] },
    '6/14': { label: '6月14日 (日) — 大会4日目', photos: [] },
    'other': { label: 'その他の日程', photos: [] }
  };

  // 写真を日付ごとに振り分け (日本時間基準)
  photos.forEach(photo => {
    const date = new Date(photo.createdTime);
    // 確実にJSTの月・日を取得する（Intl.DateTimeFormatを使用）
    const formatter = new Intl.DateTimeFormat('ja-JP', {
      timeZone: 'Asia/Tokyo',
      month: 'numeric',
      day: 'numeric'
    });
    const parts = formatter.formatToParts(date);
    let month = '';
    let day = '';
    for (const part of parts) {
      if (part.type === 'month') month = part.value;
      if (part.type === 'day') day = part.value;
    }
    const localDateKey = `${parseInt(month, 10)}/${parseInt(day, 10)}`;

    if (groups[localDateKey]) {
      groups[localDateKey].photos.push(photo);
    } else {
      groups['other'].photos.push(photo);
    }
  });

  // 各日付グループのHTML要素を動的に生成
  let hasAnyPhoto = false;
  
  // 表示順を大会日程順 (6/11 -> 6/14 -> other) にループ
  const displayOrder = ['6/11', '6/12', '6/13', '6/14', 'other'];
  
  displayOrder.forEach(key => {
    const group = groups[key];
    if (group.photos.length === 0) return; // 写真がない日は非表示

    hasAnyPhoto = true;

    // セクションコンテナの作成
    const section = document.createElement('div');
    section.className = 'date-section';

    // タイトル要素の作成
    const title = document.createElement('h3');
    title.className = 'date-section-title';
    title.innerHTML = `<span class="icon">📅</span> ${group.label} <span class="photo-count">(${group.photos.length}枚)</span>`;
    section.appendChild(title);

    // グリッドコンテナの作成
    const grid = document.createElement('div');
    grid.className = 'photo-grid';

    // 写真カードの追加
    group.photos.forEach(photo => {
      const card = document.createElement('div');
      card.className = 'photo-card';
      card.onclick = () => openPhotoModal(photo.url, photo.name);

      // 時間のフォーマット (JSTの時:分)
      const date = new Date(photo.createdTime);
      const timeString = date.toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' });

      card.innerHTML = `
        <div class="photo-img-wrapper">
          <img src="${photo.url}" alt="${photo.name}" loading="lazy">
        </div>
        <div class="photo-info">
          <h4 class="photo-title">${photo.name}</h4>
          <span class="photo-meta">撮影時刻: ${timeString}</span>
        </div>
      `;
      grid.appendChild(card);
    });

    section.appendChild(grid);
    container.appendChild(section);
  });

  if (!hasAnyPhoto) {
    empty.style.display = 'flex';
  } else {
    empty.style.display = 'none';
  }
}

// アップロード先（Googleドライブ）を開く
function openUploadDrive() {
  if (isConfigDummy()) {
    alert('設定ファイル (config.js) に Google ドライブのフォルダIDが設定されていません。現在はデモモードです。');
    return;
  }
  const folderUrl = `https://drive.google.com/drive/folders/${window.CONFIG.PHOTO_FOLDER_ID}`;
  window.open(folderUrl, '_blank');
}


// 📖 4-2. しおりPDFの読み込み
function fetchShiori() {
  const iframe = document.getElementById('shiori-iframe');
  const downloadBtn = document.getElementById('shiori-download-btn');

  if (isConfigDummy() || !window.CONFIG.SHIORI_FILE_ID || window.CONFIG.SHIORI_FILE_ID === 'YOUR_SHIORI_FILE_ID') {
    // デモ用PDF（ここではダミーのWebサイトやプレビューを表示するか、PDF.jsなどのサンプルを表示）
    // サンプルとしてGoogleドライブ公式が提供しているPDFビューアテストURLを代用
    iframe.src = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf-test.pdf';
    downloadBtn.href = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf-test.pdf';
    return;
  }

  // GoogleドライブのPDF埋め込み用プレビューURL
  const previewUrl = `https://drive.google.com/file/d/${window.CONFIG.SHIORI_FILE_ID}/preview`;
  const viewUrl = `https://drive.google.com/file/d/${window.CONFIG.SHIORI_FILE_ID}/view?usp=sharing`;

  iframe.src = previewUrl;
  downloadBtn.href = viewUrl;
}


// 🎥 4-3. YouTube Live URLの読み込みと表示
function fetchYouTube() {
  const iframe = document.getElementById('youtube-iframe');
  const wrapper = document.getElementById('youtube-wrapper');
  const loading = document.getElementById('youtube-loading');
  const empty = document.getElementById('youtube-empty');

  loading.style.display = 'flex';
  wrapper.style.display = 'none';
  empty.style.display = 'none';

  if (isConfigDummy() || !window.CONFIG.YOUTUBE_TXT_FILE_ID || window.CONFIG.YOUTUBE_TXT_FILE_ID === 'YOUR_YOUTUBE_TXT_FILE_ID') {
    // デモ用：新潟大会を想起させる適当なプロモーション動画（例として新潟県の観光PV動画など）を表示
    setTimeout(() => {
      loading.style.display = 'none';
      wrapper.style.display = 'block';
      // デモ用動画ID (例: YouTubeで公開されている新潟の美しい映像などを代用。ここではサンプルID)
      iframe.src = `https://www.youtube.com/embed/5F2v_d943h8?autoplay=0`; 
    }, 800);
    return;
  }

  // Googleドライブからテキストファイルの生データを取得する
  const fileId = window.CONFIG.YOUTUBE_TXT_FILE_ID;
  const apiKey = window.CONFIG.API_KEY;
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`;

  fetch(url)
    .then(response => {
      if (!response.ok) {
        return response.json().then(err => {
          throw new Error(`エラー (${response.status}): ${err.error ? err.error.message : 'Unknown'}`);
        }).catch(() => {
          throw new Error(`取得失敗 (ステータス: ${response.status})`);
        });
      }
      return response.text();
    })
    .then(text => {
      loading.style.display = 'none';
      const videoId = extractYouTubeId(text.trim());
      
      if (videoId) {
        wrapper.style.display = 'block';
        iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=0`;
      } else {
        empty.style.display = 'flex';
        console.warn('テキストファイルに有効なYouTubeのURLが見つかりませんでした。中身:', text);
      }
    })
    .catch(error => {
      console.error(error);
      loading.style.display = 'none';
      empty.style.display = 'flex';
      empty.querySelector('p').innerText = `配信情報の読み込みに失敗しました。\n${error.message}`;
    });
}

// YouTubeのURLや共有リンクから動画IDを取り出すユーティリティ
function extractYouTubeId(url) {
  if (!url) return null;
  // 通常URL, 共有URL, モバイルURL, 埋め込みURLに対応する正規表現
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

// --------------------------------------------------------------------------
// 5. 写真拡大プレビューモーダル
// --------------------------------------------------------------------------
function openPhotoModal(imgUrl, captionText) {
  const modal = document.getElementById('photo-modal');
  const modalImg = document.getElementById('modal-img');
  const caption = document.getElementById('modal-caption');
  
  modal.style.display = 'flex';
  modalImg.src = imgUrl;
  caption.innerText = captionText;
}

function closePhotoModal(event) {
  // 画像自体をクリックしたときは閉じない（背景またはバツボタンクリックで閉じる）
  if (event.target.id === 'modal-img') return;
  
  const modal = document.getElementById('photo-modal');
  modal.style.display = 'none';
}

// --------------------------------------------------------------------------
// 6. 現地調査用写真の取得・表示 (新規追加)
// --------------------------------------------------------------------------
function fetchSurveyPhotos() {
  const grid = document.getElementById('survey-grid');
  const loading = document.getElementById('survey-loading');
  const empty = document.getElementById('survey-empty');

  grid.innerHTML = '';
  loading.style.display = 'flex';
  empty.style.display = 'none';

  if (isSurveyDummy()) {
    // === 現地調査デモモード用のダミーデータ ===
    setTimeout(() => {
      loading.style.display = 'none';
      const demoSurveyPhotos = [
        { id: 'survey-demo1', name: 'ASPACにいがたEXPOの事業風景について', createdTime: '2026-06-11T12:00:00+09:00', url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80' },
        { id: 'survey-demo2', name: '新潟駅・空港・メイン会場周辺の歓迎装飾について', createdTime: '2026-06-11T14:30:00+09:00', url: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=800&q=80' },
        { id: 'survey-demo3', name: '韓国・香港・モンゴルなど各国ナイトの風景', createdTime: '2026-06-12T21:00:00+09:00', url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80' },
        { id: 'survey-demo4', name: 'スピーチコンテスト・ディベート風景について', createdTime: '2026-06-13T10:00:00+09:00', url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80' },
        { id: 'survey-demo5', name: '総会およびフォーラムの様子', createdTime: '2026-06-13T15:30:00+09:00', url: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=800&q=80' },
        { id: 'survey-demo6', name: '閉会式、GALAの事業風景について', createdTime: '2026-06-14T20:00:00+09:00', url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80' }
      ];
      renderSurveyPhotos(demoSurveyPhotos);
    }, 1000);
    return;
  }

  // === Google Drive API による現地調査データ取得 ===
  const folderId = window.CONFIG.SURVEY_FOLDER_ID;
  const apiKey = window.CONFIG.API_KEY;
  const query = `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&orderBy=createdTime+desc&key=${apiKey}&fields=files(id,name,createdTime)`;

  fetch(url)
    .then(response => {
      if (!response.ok) {
        return response.json().then(err => {
          throw new Error(`Google Drive API エラー (${response.status}): ${err.error ? err.error.message : 'Unknown'}`);
        }).catch(() => {
          throw new Error(`Google Drive API 呼び出し失敗 (ステータス: ${response.status})`);
        });
      }
      return response.json();
    })
    .then(data => {
      loading.style.display = 'none';
      if (!data.files || data.files.length === 0) {
        empty.style.display = 'flex';
        return;
      }
      const photos = data.files.map(file => {
        return {
          id: file.id,
          name: file.name.replace(/\.[^/.]+$/, ""),
          createdTime: file.createdTime,
          url: `https://drive.google.com/thumbnail?id=${file.id}&sz=w1000`
        };
      });
      renderSurveyPhotos(photos);
    })
    .catch(error => {
      console.error(error);
      loading.style.display = 'none';
      grid.innerHTML = `<div class="error-message">調査写真の読み込みに失敗しました。APIキーまたはフォルダの共有設定を確認してください。<br>${error.message}</div>`;
    });
}

function renderSurveyPhotos(photos) {
  const grid = document.getElementById('survey-grid');
  const empty = document.getElementById('survey-empty');
  
  grid.innerHTML = '';

  if (!photos || photos.length === 0) {
    empty.style.display = 'flex';
    return;
  }

  empty.style.display = 'none';

  photos.forEach(photo => {
    const card = document.createElement('div');
    card.className = 'photo-card';
    card.onclick = () => openPhotoModal(photo.url, photo.name);

    const date = new Date(photo.createdTime);
    const dateString = date.toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    card.innerHTML = `
      <div class="photo-img-wrapper">
        <img src="${photo.url}" alt="${photo.name}" loading="lazy">
      </div>
      <div class="photo-info">
        <h4 class="photo-title">${photo.name}</h4>
        <span class="photo-meta">登録日: ${dateString}</span>
      </div>
    `;
    grid.appendChild(card);
  });
}

function openSurveyDrive() {
  if (isSurveyDummy()) {
    alert('設定ファイル (config.js) に 現地調査用のGoogleドライブフォルダIDが設定されていません。現在はデモモードです。');
    return;
  }
  const folderUrl = `https://drive.google.com/drive/folders/${window.CONFIG.SURVEY_FOLDER_ID}`;
  window.open(folderUrl, '_blank');
}

// --------------------------------------------------------------------------
// 8. ログイン不要アップロード制御 (GAS連携)
// --------------------------------------------------------------------------
let uploadState = {
  destType: 'photos', // 'photos' または 'survey'
  filesQueue: [],     // 選択されたファイルのキュー [ { file, base64Data, id } ]
  isUploading: false,
  totalFiles: 0,
  uploadedCount: 0,
  successCount: 0,
  errorCount: 0
};

// ドラッグ＆ドロップのイベントリスナー初期化
function initUploadDragAndDrop() {
  const dropZone = document.getElementById('drop-zone');
  if (!dropZone) return;

  // ドラッグ進入・移動時
  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('dragover');
    }, false);
  });

  // ドラッグ退出・終了時
  ['dragleave', 'dragend', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('dragover');
    }, false);
  });

  // ドロップされた時
  dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
      processSelectedFiles(files);
    }
  }, false);
}

// アップロードモーダルを開く
function openUploadModal(type) {
  uploadState.destType = type;
  
  const modal = document.getElementById('upload-modal');
  const destText = document.getElementById('upload-dest-text');
  
  if (type === 'photos') {
    destText.innerText = 'アップロード先: 新潟大会記録ギャラリー';
  } else {
    destText.innerText = 'アップロード先: 現地調査ギャラリー';
  }
  
  // 状態とUIのリセット
  resetUploadState();
  
  if (modal) modal.style.display = 'flex';
}

// アップロードモーダルを閉じる
function closeUploadModalDirect() {
  if (uploadState.isUploading) {
    if (!confirm('アップロードを中止してよろしいですか？')) return;
  }
  const modal = document.getElementById('upload-modal');
  if (modal) modal.style.display = 'none';
  resetUploadState();
}

// 状態のリセット
function resetUploadState() {
  uploadState.filesQueue = [];
  uploadState.isUploading = false;
  uploadState.totalFiles = 0;
  uploadState.uploadedCount = 0;
  uploadState.successCount = 0;
  uploadState.errorCount = 0;
  
  const dropZone = document.getElementById('drop-zone');
  const previewContainer = document.getElementById('upload-preview-container');
  const previewGrid = document.getElementById('upload-preview-grid');
  const submitBtn = document.getElementById('submit-upload-btn');
  const cancelBtn = document.getElementById('cancel-upload-btn');
  const statusContainer = document.getElementById('upload-status-container');
  const statusText = document.getElementById('upload-status-text');
  const fileInput = document.getElementById('file-input');
  
  if (dropZone) dropZone.style.display = 'flex';
  if (previewContainer) previewContainer.style.display = 'none';
  if (previewGrid) previewGrid.innerHTML = '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerText = 'アップロード開始';
  }
  if (cancelBtn) cancelBtn.disabled = false;
  if (statusContainer) statusContainer.style.display = 'none';
  if (statusText) {
    statusText.innerText = 'アップロード中...';
    statusText.className = '';
  }
  if (fileInput) fileInput.value = '';
}

// ファイル選択をトリガー
function triggerFileSelect() {
  const fileInput = document.getElementById('file-input');
  if (fileInput) fileInput.click();
}

// ファイル選択時のハンドリング
function handleFileSelect(e) {
  const files = e.target.files;
  if (files.length > 0) {
    processSelectedFiles(files);
  }
}

// 選択されたファイルの処理とプレビューキューへの追加
function processSelectedFiles(files) {
  const submitBtn = document.getElementById('submit-upload-btn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerText = 'ファイルを読み込み中...';
  }

  let loadedCount = 0;
  const imageFiles = Array.from(files).filter(f => f.type.match('image.*'));
  
  if (imageFiles.length === 0) {
    if (submitBtn && uploadState.filesQueue.length > 0) {
      submitBtn.disabled = false;
      submitBtn.innerText = 'アップロード開始';
    } else if (submitBtn) {
      submitBtn.innerText = 'アップロード開始';
    }
    return;
  }

  imageFiles.forEach(file => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      const base64Data = dataUrl.split(',')[1];
      const fileId = 'upload-file-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      
      uploadState.filesQueue.push({
        id: fileId,
        file: file,
        mimeType: file.type,
        base64Data: base64Data,
        dataUrl: dataUrl
      });

      loadedCount++;
      
      if (loadedCount === imageFiles.length) {
        renderUploadPreviews();
      }
    };
    
    reader.readAsDataURL(file);
  });
}

// プレビューのレンダリング
function renderUploadPreviews() {
  const previewGrid = document.getElementById('upload-preview-grid');
  const previewContainer = document.getElementById('upload-preview-container');
  const dropZone = document.getElementById('drop-zone');
  const countText = document.getElementById('upload-preview-count');
  const submitBtn = document.getElementById('submit-upload-btn');

  if (!previewGrid || !previewContainer) return;

  previewGrid.innerHTML = '';
  
  if (uploadState.filesQueue.length === 0) {
    previewContainer.style.display = 'none';
    if (dropZone) dropZone.style.display = 'flex';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerText = 'アップロード開始';
    }
    return;
  }

  if (dropZone) dropZone.style.display = 'none';
  previewContainer.style.display = 'flex';
  
  if (countText) {
    countText.innerText = `選択された写真 (${uploadState.filesQueue.length}枚)`;
  }

  uploadState.filesQueue.forEach(item => {
    const previewItem = document.createElement('div');
    previewItem.className = 'upload-preview-item';
    previewItem.id = item.id;

    previewItem.innerHTML = `
      <img src="${item.dataUrl}" alt="${item.file.name}">
      <button class="remove-preview-btn" onclick="removePreviewItem('${item.id}')">&times;</button>
    `;
    
    previewGrid.appendChild(previewItem);
  });

  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.innerText = 'アップロード開始';
  }
}

// プレビュー個別の削除処理
function removePreviewItem(id) {
  uploadState.filesQueue = uploadState.filesQueue.filter(item => item.id !== id);
  renderUploadPreviews();
}

// GASへの一括・順次アップロード実行
async function startUpload() {
  const gasUrl = window.CONFIG.GAS_UPLOAD_URL;
  
  if (!gasUrl || gasUrl === 'YOUR_GAS_UPLOAD_URL' || gasUrl === '') {
    alert('Google Apps Script のウェブアプリURLが設定されていません。\nconfig.js の GAS_UPLOAD_URL を設定してください。');
    return;
  }
  
  if (uploadState.filesQueue.length === 0) {
    alert('アップロードするファイルが選択されていません。');
    return;
  }
  
  // フォルダIDの決定
  let folderId = '';
  if (uploadState.destType === 'photos') {
    folderId = window.CONFIG.PHOTO_FOLDER_ID;
  } else if (uploadState.destType === 'survey') {
    folderId = window.CONFIG.SURVEY_FOLDER_ID;
  }
  
  if (!folderId || folderId.startsWith('YOUR_')) {
    alert('保存先のGoogleドライブフォルダIDが正しく設定されていません。');
    return;
  }
  
  // UIの状態をアップロード中に変更
  uploadState.isUploading = true;
  uploadState.totalFiles = uploadState.filesQueue.length;
  uploadState.uploadedCount = 0;
  uploadState.successCount = 0;
  uploadState.errorCount = 0;
  
  const submitBtn = document.getElementById('submit-upload-btn');
  const cancelBtn = document.getElementById('cancel-upload-btn');
  const statusContainer = document.getElementById('upload-status-container');
  const statusText = document.getElementById('upload-status-text');
  
  if (submitBtn) submitBtn.disabled = true;
  if (cancelBtn) cancelBtn.disabled = true;
  if (statusContainer) statusContainer.style.display = 'flex';

  // 削除ボタンを非表示にする（送信中の誤操作防止）
  document.querySelectorAll('.remove-preview-btn').forEach(btn => {
    btn.style.display = 'none';
  });
  
  // キュー内のファイルを1枚ずつ直列（順次）でアップロード
  for (let i = 0; i < uploadState.filesQueue.length; i++) {
    const item = uploadState.filesQueue[i];
    const currentNum = i + 1;
    
    if (statusText) {
      statusText.innerText = `写真をアップロード中: ${currentNum} / ${uploadState.totalFiles} 枚目 (${item.file.name})`;
    }
    
    try {
      await uploadSingleFile(item, folderId, gasUrl);
      uploadState.successCount++;
    } catch (error) {
      console.error(`Failed to upload ${item.file.name}:`, error);
      uploadState.errorCount++;
    }
  }
  
  // 全アップロード完了後の処理
  uploadState.isUploading = false;
  
  if (statusText) {
    if (uploadState.errorCount === 0) {
      statusText.innerText = `すべての写真 (${uploadState.successCount}枚) のアップロードが完了しました！`;
      statusText.className = 'success';
    } else {
      statusText.innerText = `アップロード完了 (成功: ${uploadState.successCount}枚, 失敗: ${uploadState.errorCount}枚)`;
      statusText.className = 'error';
    }
  }
  
  // 2秒後にモーダルを閉じ、ギャラリーを更新
  setTimeout(() => {
    const modal = document.getElementById('upload-modal');
    if (modal) modal.style.display = 'none';
    resetUploadState();
    
    // アップロード先に合わせてギャラリーをリロード
    if (uploadState.destType === 'photos') {
      fetchPhotos();
    } else if (uploadState.destType === 'survey') {
      fetchSurveyPhotos();
    }
  }, 2000);
}

// 1枚のファイルを送信するPromiseラッパー
function uploadSingleFile(item, folderId, gasUrl) {
  return new Promise((resolve, reject) => {
    const payload = {
      file: item.base64Data,
      filename: item.file.name,
      mimeType: item.mimeType,
      folderId: folderId
    };
    
    fetch(gasUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: JSON.stringify(payload)
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTPエラー: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      if (data.status === 'success') {
        resolve(data);
      } else {
        reject(new Error(data.message || 'GASアップロード処理失敗'));
      }
    })
    .catch(err => {
      reject(err);
    });
  });
}


