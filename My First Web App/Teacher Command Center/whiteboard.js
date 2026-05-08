/**
 * Teacherstack Whiteboard — Parts 1 & 2
 * Part 1: Canvas, Timer, Name Picker, Sound Meter, Background, Schedule, TTS, Fullscreen, Tools Panel
 * Part 2: Undo/Redo, Spin Wheel, Group Maker, Text Tool, Shapes, Clock, Stopwatch, Calculator, Flashcards
 */

document.addEventListener('DOMContentLoaded', () => {

    // ===================== STUDENTS =====================
    // Consolidate student list from students.js if available
    const defaultStudentNames = ["Vaani", "Jagger", "Krue", "Malina", "Julian", "Reece", "Johnathan", "Alaric", "Everett", "P.J.", "Apollo", "Messiah", "Lily", "Aidan", "Paxton", "Dean", "Raelynn", "Adalynn", "Phoebe", "Everleigh", "Gavin", "Kota"];
    const readStudents = () => (typeof students !== 'undefined' && Array.isArray(students)) ? students : [];
    const getStudentNames = () => {
        const names = readStudents()
            .map(student => typeof student?.name === 'string' ? student.name.trim() : '')
            .filter(Boolean);
        return names.length ? names : defaultStudentNames;
    };
    const getStudentData = () => {
        const roster = readStudents()
            .map(student => {
                if (!student || typeof student.name !== 'string') return null;
                const name = student.name.trim();
                if (!name) return null;
                return {
                    ...student,
                    name,
                    initials: student.initials || name.substring(0, 2).toUpperCase(),
                    color: student.color || '#6366f1'
                };
            })
            .filter(Boolean);
        return roster.length ? roster : getStudentNames().map(name => ({ name, initials: name.substring(0, 2).toUpperCase(), color: '#6366f1' }));
    };

    // window.WhiteboardApp and window.WhiteboardStorage are loaded from external scripts
    const App = window.WhiteboardApp;
    const Storage = window.WhiteboardStorage;

    // ===================== CANVAS CORE =====================
    const canvas = document.getElementById('wb-canvas');
    const ctx = canvas.getContext('2d');
    const canvasArea = document.getElementById('wb-canvas-area');
    const widgetsLayer = document.getElementById('widgets-layer');
    let isDrawing = false;
    let strokeDirty = false;
    let currentTool = 'cursor';
    let lastX = 0, lastY = 0;
    
    const cursorPreview = document.getElementById('cursor-preview');
    const colorPicker = document.getElementById('color-picker');
    const brushSize = document.getElementById('brush-size');
    
    function updateCanvasCursor() {
        canvasArea.classList.remove('mode-cursor', 'mode-pen', 'mode-eraser', 'mode-text', 'mode-shapes');
        canvasArea.classList.add(`mode-${currentTool}`);

        if (currentTool === 'pen' || currentTool === 'eraser') {
            cursorPreview.classList.remove('hidden');
            const size = (currentTool === 'eraser') ? 30 : brushSize.value;
            cursorPreview.style.width = size + 'px';
            cursorPreview.style.height = size + 'px';
            cursorPreview.style.borderColor = (currentTool === 'eraser') ? 'rgba(0,0,0,0.4)' : colorPicker.value;
        } else {
            cursorPreview.classList.add('hidden');
        }
    }

    canvasArea.addEventListener('mousemove', (e) => {
        if (currentTool === 'pen' || currentTool === 'eraser') {
            const rect = canvasArea.getBoundingClientRect();
            cursorPreview.style.left = (e.clientX - rect.left) + 'px';
            cursorPreview.style.top = (e.clientY - rect.top) + 'px';
        }
    });

    colorPicker.addEventListener('input', updateCanvasCursor);
    brushSize.addEventListener('input', updateCanvasCursor);

    // Initialize cursor
    updateCanvasCursor();

    function resizeCanvas() {
        const snapshot = document.createElement('canvas');
        snapshot.width = canvas.width;
        snapshot.height = canvas.height;
        snapshot.getContext('2d').drawImage(canvas, 0, 0);

        canvas.width = canvasArea.clientWidth;
        canvas.height = canvasArea.clientHeight;

        ctx.drawImage(snapshot, 0, 0);
    }
    window.addEventListener('resize', resizeCanvas);
    canvas.width = canvasArea.clientWidth;
    canvas.height = canvasArea.clientHeight;

    function isFreehandTool(toolName) {
        return toolName === 'pen' || toolName === 'eraser';
    }

    function startDrawing(e) {
        if (!isFreehandTool(currentTool)) return;
        isDrawing = true;
        strokeDirty = false;
        [lastX, lastY] = [e.offsetX, e.offsetY];
    }
    function draw(e) {
        if (!isDrawing || !isFreehandTool(currentTool)) return;
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(e.offsetX, e.offsetY);
        if (currentTool === 'pen') {
            ctx.strokeStyle = document.getElementById('color-picker').value;
            ctx.lineWidth = document.getElementById('brush-size').value;
            ctx.lineCap = 'round';
            ctx.globalCompositeOperation = 'source-over';
        } else if (currentTool === 'eraser') {
            ctx.lineWidth = 30;
            ctx.globalCompositeOperation = 'destination-out';
        }
        ctx.stroke();
        if (currentTool === 'pen' || currentTool === 'eraser') strokeDirty = true;
        [lastX, lastY] = [e.offsetX, e.offsetY];
    }
    function stopDrawing() {
        const shouldSaveStroke = isDrawing && strokeDirty && isFreehandTool(currentTool);
        isDrawing = false;
        strokeDirty = false;
        if (shouldSaveStroke) saveCanvasState();
    }

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    function getCanvasPointFromClient(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        return {
            offsetX: clientX - rect.left,
            offsetY: clientY - rect.top,
        };
    }

    let textTouchStartPoint = null;

    // Touch support
    canvas.addEventListener('touchstart', e => {
        e.preventDefault();
        const t = e.touches[0];
        if (!t) return;
        const point = getCanvasPointFromClient(t.clientX, t.clientY);
        if (isFreehandTool(currentTool)) {
            startDrawing(point);
            return;
        }
        if (currentTool === 'shapes') {
            beginShapeDrawing(point);
            return;
        }
        if (currentTool === 'text') {
            textTouchStartPoint = point;
        }
    }, { passive: false });
    canvas.addEventListener('touchmove', e => {
        e.preventDefault();
        const t = e.touches[0];
        if (!t) return;
        const point = getCanvasPointFromClient(t.clientX, t.clientY);
        if (isFreehandTool(currentTool)) {
            draw(point);
            return;
        }
        if (currentTool === 'shapes') {
            updateShapePreview(point);
            return;
        }
        if (currentTool === 'text' && textTouchStartPoint) {
            const movedX = Math.abs(point.offsetX - textTouchStartPoint.offsetX);
            const movedY = Math.abs(point.offsetY - textTouchStartPoint.offsetY);
            if (movedX > 8 || movedY > 8) textTouchStartPoint = null;
        }
    }, { passive: false });
    canvas.addEventListener('touchend', e => {
        e.preventDefault();
        if (isFreehandTool(currentTool)) {
            stopDrawing();
            return;
        }
        if (currentTool === 'shapes') {
            finishShapeDrawing();
            return;
        }
        if (currentTool === 'text' && textTouchStartPoint) {
            createTextOverlay(textTouchStartPoint.offsetX, textTouchStartPoint.offsetY);
            textTouchStartPoint = null;
        }
    }, { passive: false });
    canvas.addEventListener('touchcancel', e => {
        e.preventDefault();
        if (isFreehandTool(currentTool)) stopDrawing();
        if (currentTool === 'shapes') finishShapeDrawing();
        textTouchStartPoint = null;
    }, { passive: false });

    // ===================== TOOLBAR =====================
    function setActiveDrawTool(toolName) {
        currentTool = toolName;
        document.querySelectorAll('.draw-tool').forEach(button => {
            button.classList.toggle('active', button.getAttribute('data-tool') === toolName);
        });
        updateCanvasCursor();
    }

    document.querySelectorAll('.draw-tool').forEach(tool => {
        tool.addEventListener('click', () => {
            const t = tool.getAttribute('data-tool');
            if (t) {
                if (t === 'shapes') return;
                document.getElementById('shapes-submenu')?.classList.add('hidden');
                setActiveDrawTool(t);
            }
        });
    });

    document.getElementById('btn-clear-canvas').addEventListener('click', () => {
        if (confirm('Clear everything on the board?')) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            canvasArea.className = 'wb-canvas-area';
            canvasArea.style.background = '';
            updateCanvasCursor();
            clearWidgetsLayer();
            schedule = [];
            Storage.writeJSON('wb-schedule', schedule);
            renderSchedule();
            resetStandaloneTimer();
            setTrafficLight('red');
            resetStandaloneSoundMeterUi();
            resetStandaloneNamePicker();
            resetStandaloneStopwatch();
            resetScheduleWidgetLayout();
            // Reset undo/redo stacks and save blank page state
            undoStack = [];
            redoStack = [];
            saveCanvasState(); // Push the empty state as the new baseline
        }
    });

    // ===================== EXPORT =====================
    let html2CanvasLoader = null;

    function loadHtml2Canvas() {
        if (window.html2canvas) return Promise.resolve(window.html2canvas);
        if (html2CanvasLoader) return html2CanvasLoader;

        html2CanvasLoader = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
            script.onload = () => resolve(window.html2canvas);
            script.onerror = () => {
                html2CanvasLoader = null;
                reject(new Error('Failed to load export renderer'));
            };
            document.head.appendChild(script);
        });

        return html2CanvasLoader;
    }

    async function exportBoardAsImage() {
        const exportBtn = document.getElementById('btn-export');
        if (exportBtn) exportBtn.disabled = true;

        const cursorWasHidden = cursorPreview.classList.contains('hidden');
        cursorPreview.classList.add('hidden');

        try {
            const html2canvas = await loadHtml2Canvas();
            const boardSnapshot = await html2canvas(canvasArea, {
                backgroundColor: null,
                useCORS: true,
                allowTaint: false,
                logging: false,
                scale: Math.max(2, window.devicePixelRatio || 1),
            });

            const link = document.createElement('a');
            link.download = 'whiteboard-' + new Date().toISOString().slice(0, 10) + '.png';
            link.href = boardSnapshot.toDataURL('image/png');
            link.click();
        } catch (error) {
            console.error('Whiteboard export failed', error);
            alert('Export failed. Some remote media may block image export.');
        } finally {
            if (!cursorWasHidden) cursorPreview.classList.remove('hidden');
            if (exportBtn) exportBtn.disabled = false;
        }
    }

    document.getElementById('btn-export')?.addEventListener('click', () => {
        exportBoardAsImage();
    });

    // ===================== FULLSCREEN =====================
    document.getElementById('btn-fullscreen').addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen();
        }
    });

    // Redundant z-index management removed (handled by openModal and makeDraggable)

    // Redundant z-index management and modal-close wiring removed (handled by whiteboard-core.js)


    // Bottom bar → modals
    const bbMap = {
        'bb-background': 'modal-background',
        'bb-tts': 'modal-tts'
    };
    Object.entries(bbMap).forEach(([btnId, modalId]) => {
        const btn = document.getElementById(btnId);
        if (btn) btn.addEventListener('click', () => App.openModal(modalId));
    });

    const bbWidgetMap = {
        'bb-random': 'Spin Wheel',
        'bb-timer': 'Timer',
        'bb-namepick': 'Name Picker',
        'bb-traffic': 'Traffic Light',
        'bb-sound': 'Sound Meter',
        'bb-qr': 'QR Code',
        'bb-text': 'Text Box'
    };
    Object.entries(bbWidgetMap).forEach(([btnId, widgetName]) => {
        const btn = document.getElementById(btnId);
        if (!btn) return;
        btn.addEventListener('click', () => {
            const existing = document.querySelectorAll('.wb-canvas-widget').length;
            spawnCanvasWidget(widgetName, 40 + existing * 24, 40 + existing * 20);
        });
    });

    const bbVideo = document.getElementById('bb-video');
    if (bbVideo) bbVideo.addEventListener('click', () => {
        App.openModal('modal-media');
        const tab = document.querySelector('[data-tab="media-videos"]');
        if (tab) tab.click();
    });

    const bbMedia = document.getElementById('bb-media');
    if (bbMedia) bbMedia.addEventListener('click', () => {
        App.openModal('modal-media');
        const tab = document.querySelector('[data-tab="media-images"]');
        if (tab) tab.click();
    });

    // ===================== TAB SYSTEM =====================
    function setupTabs(tabSelector, contentPrefix) {
        document.querySelectorAll(tabSelector).forEach(tab => {
            tab.addEventListener('click', () => {
                const parent = tab.closest('.modal-box');
                parent.querySelectorAll(tabSelector).forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                parent.querySelectorAll('.bg-tab-content').forEach(c => c.classList.remove('active'));
                const target = document.getElementById(tab.getAttribute('data-tab'));
                if (target) target.classList.add('active');
            });
        });
    }
    setupTabs('.bg-tab', 'bg-');
    
    // Toggle aria states for bg-img-cat — grid rendering handled in bg image section below

    // Toggle aria states for bg-option
    document.querySelectorAll('.bg-option').forEach(opt => {
        opt.addEventListener('click', () => {
            document.querySelectorAll('.bg-option').forEach(o => {
                o.classList.remove('active');
                o.setAttribute('aria-pressed', 'false');
            });
            opt.classList.add('active');
            opt.setAttribute('aria-pressed', 'true');
        });
    });

    // Random tabs
    document.querySelectorAll('.rand-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.rand-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.querySelectorAll('.rand-content').forEach(c => c.classList.remove('active'));
            document.getElementById('rtab-' + tab.getAttribute('data-rtab')).classList.add('active');
        });
    });

    function openRandomizerTab(tabName = 'student') {
        App.openModal('modal-random');
        const targetTab = document.querySelector(`.rand-tab[data-rtab="${tabName}"]`);
        targetTab?.click();
        if (tabName === 'wheel') drawWheel();
    }

    // ===================== MEDIA SEARCH & YOUTUBE =====================
    const imgSearchInput = document.getElementById('img-search-input');
    const imgSearchBtn = document.getElementById('img-search-btn');
    const imgResults = document.getElementById('img-results');
    const imgSourceButtons = Array.from(document.querySelectorAll('#media-images .media-src'));
    const ytSearchInput = document.getElementById('yt-search-input');
    const ytSearchBtn = document.getElementById('yt-search-btn');
    const ytResults = document.getElementById('yt-results');
    const ytFloatWidget = document.getElementById('yt-float-widget');
    const ytPlayerContainer = document.getElementById('yt-player-container');
    let ytPlayer = null;
    let ytCurrentVideoId = '';
    let ytPendingVideoId = '';
    let ytFloatDragBound = false;
    let activeImageSource = 'search';

    // Load YouTube API
    const previousOnYouTubeIframeAPIReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
        if (typeof previousOnYouTubeIframeAPIReady === 'function') previousOnYouTubeIframeAPIReady();
        if (!ytPendingVideoId) return;
        const pendingVideoId = ytPendingVideoId;
        ytPendingVideoId = '';
        playVideo(pendingVideoId);
    };

    function isYouTubeApiReady() {
        return Boolean(window.YT && typeof window.YT.Player === 'function');
    }

    if (!window.YT) {
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }

    function getCanvasModeClass() {
        return canvasArea.className.match(/mode-\S+/)?.[0] || '';
    }

    function resetCanvasAreaClasses() {
        const modeClass = getCanvasModeClass();
        canvasArea.className = 'wb-canvas-area' + (modeClass ? ' ' + modeClass : '');
    }

    function applyCanvasBackground(backgroundValue) {
        resetCanvasAreaClasses();
        canvasArea.style.background = backgroundValue || '';
    }

    function setImageResultsMessage(message) {
        imgResults.innerHTML = `<div class="media-hint">${message}</div>`;
    }

    function setActiveImageSource(source) {
        activeImageSource = source;
        imgSourceButtons.forEach(button => {
            const isActive = button.dataset.src === source;
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });

        if (source === 'gifs') {
            imgSearchInput.placeholder = 'Search GIFs...';
            setImageResultsMessage('Search Giphy for classroom-safe GIFs');
            return;
        }
        if (source === 'creative') {
            imgSearchInput.placeholder = 'Search Creative Commons images...';
            setImageResultsMessage('Search Creative Commons images from Openverse');
            return;
        }

        imgSearchInput.placeholder = 'Search images...';
        setImageResultsMessage('Search for images to use on your whiteboard');
    }

    function resetMediaModalState() {
        if (imgSearchInput) imgSearchInput.value = '';
        setActiveImageSource('search');
        if (ytSearchInput) ytSearchInput.value = '';
        if (ytResults) ytResults.innerHTML = '<div class="media-hint">Search for videos — great for Brain Breaks!</div>';
        const ytUrlInput = document.getElementById('yt-url-input');
        if (ytUrlInput) ytUrlInput.value = '';
        const mediaTabs = document.querySelectorAll('#modal-media .bg-tab');
        const mediaPanels = document.querySelectorAll('#modal-media .bg-tab-content');
        mediaTabs.forEach(tab => {
            const isImages = tab.getAttribute('data-tab') === 'media-images';
            tab.classList.toggle('active', isImages);
        });
        mediaPanels.forEach(panel => {
            panel.classList.toggle('active', panel.id === 'media-images');
        });
    }

    function renderImageResults(items) {
        imgResults.innerHTML = '';
        if (!items.length) {
            setImageResultsMessage('No results found. Try different words.');
            return;
        }
        items.forEach(item => {
            const img = document.createElement('img');
            img.src = item.preview;
            img.className = 'media-item';
            img.alt = item.alt || '';
            img.title = item.title || item.alt || '';
            img.addEventListener('click', () => {
                createImageOverlay(item.full, item.alt || item.title || '', 100, 100);
                App.closeModal('modal-media');
            });
            imgResults.appendChild(img);
        });
    }

    function getStoredApiKey(storageKey, promptMessage) {
        let apiKey = localStorage.getItem(storageKey);
        if (!apiKey) {
            apiKey = prompt(promptMessage);
            if (!apiKey || !apiKey.trim()) return null;
            apiKey = apiKey.trim();
            localStorage.setItem(storageKey, apiKey);
        }
        return apiKey.trim();
    }

    function searchImages(query) {
        if (!query) return;
        const apiKey = getStoredApiKey('pixabay-key', 'To search for images, you need a free Pixabay API key.\n\n1. Go to pixabay.com/api/docs/ in a new tab\n2. Create a free account (no credit card needed)\n3. Copy your API Key and paste it here:');
        if (!apiKey) return;
        setImageResultsMessage('Searching Pixabay...');
        fetch(`https://pixabay.com/api/?key=${encodeURIComponent(apiKey.trim())}&q=${encodeURIComponent(query)}&image_type=photo&per_page=12&safesearch=true`)
            .then(r => { if (!r.ok) throw new Error('bad response'); return r.json(); })
            .then(data => {
                renderImageResults((data.hits || []).map(hit => ({
                    preview: hit.previewURL,
                    full: hit.webformatURL,
                    alt: hit.tags,
                    title: hit.tags,
                })));
            })
            .catch(() => {
                localStorage.removeItem('pixabay-key');
                setImageResultsMessage('Search failed. Your API key may be wrong - it has been cleared. Click Search again to re-enter it.');
            });
    }

    function searchGifs(query) {
        if (!query) return;
        const apiKey = getStoredApiKey('giphy-key', 'To search for GIFs, you need a free Giphy API key.\n\n1. Go to developers.giphy.com in a new tab\n2. Create a free account\n3. Create an app and copy the API key\n4. Paste it here:');
        if (!apiKey) return;
        setImageResultsMessage('Searching Giphy...');
        fetch(`https://api.giphy.com/v1/gifs/search?api_key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(query)}&limit=12&rating=g&lang=en`)
            .then(r => { if (!r.ok) throw new Error('bad response'); return r.json(); })
            .then(data => {
                renderImageResults((data.data || []).map(item => ({
                    preview: item.images?.fixed_height_small_still?.url || item.images?.fixed_height_small?.url || item.images?.preview_gif?.url,
                    full: item.images?.original?.url || item.images?.downsized_large?.url || item.images?.downsized?.url,
                    alt: item.title || 'GIF',
                    title: item.title || 'GIF',
                })).filter(item => item.preview && item.full));
            })
            .catch(() => {
                localStorage.removeItem('giphy-key');
                setImageResultsMessage('GIF search failed. Your Giphy API key may be wrong - it has been cleared. Click Search again to re-enter it.');
            });
    }

    function searchCreativeCommonsImages(query) {
        if (!query) return;
        setImageResultsMessage('Searching Creative Commons...');
        fetch(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=12&license_type=commercial,modification`)
            .then(r => { if (!r.ok) throw new Error('bad response'); return r.json(); })
            .then(data => {
                renderImageResults((data.results || []).map(item => ({
                    preview: item.thumbnail || item.url,
                    full: item.url,
                    alt: item.title || item.creator || 'Creative Commons image',
                    title: item.title || item.creator || 'Creative Commons image',
                })).filter(item => item.preview && item.full));
            })
            .catch(() => {
                setImageResultsMessage('Creative Commons search failed right now. Please try again in a moment.');
            });
    }

    function runImageSearch(query) {
        const trimmedQuery = query.trim();
        if (!trimmedQuery) return;
        if (activeImageSource === 'gifs') {
            searchGifs(trimmedQuery);
            return;
        }
        if (activeImageSource === 'creative') {
            searchCreativeCommonsImages(trimmedQuery);
            return;
        }
        searchImages(trimmedQuery);
    }

    function extractYouTubeId(input) {
        input = input.trim();
        const patterns = [
            /[?&]v=([a-zA-Z0-9_-]{11})/,
            /youtu\.be\/([a-zA-Z0-9_-]{11})/,
            /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
            /^([a-zA-Z0-9_-]{11})$/
        ];
        for (const re of patterns) {
            const m = input.match(re);
            if (m) return m[1];
        }
        return null;
    }

    // Handle paste-a-URL button
    document.getElementById('yt-url-btn')?.addEventListener('click', () => {
        const input = document.getElementById('yt-url-input')?.value || '';
        const id = extractYouTubeId(input);
        if (id) {
            playVideo(id);
        } else {
            alert('That does not look like a valid YouTube URL or video ID. Paste the full link from youtube.com.');
        }
    });
    document.getElementById('yt-url-input')?.addEventListener('keypress', e => {
        if (e.key === 'Enter') {
            const id = extractYouTubeId(e.currentTarget.value);
            if (id) playVideo(id);
        }
    });

    function searchYouTube(query) {
        if (!query) return;
        let apiKey = localStorage.getItem('yt-api-key');
        if (!apiKey) {
            apiKey = promptForYouTubeApiKey();
            if (!apiKey) {
                // Fall back to curated suggestions
                showYtSuggestions(query);
                return;
            }
        }
        ytResults.innerHTML = '<div class="media-hint">Searching YouTube...</div>';
        fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&safeSearch=strict&maxResults=8&key=${encodeURIComponent(apiKey.trim())}`)
            .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
            .then(data => {
                ytResults.innerHTML = '';
                if (!data.items || data.items.length === 0) {
                    ytResults.innerHTML = '<div class="media-hint">No results found. Try different words.</div>';
                    return;
                }
                data.items.forEach(item => {
                    const vid = item.id.videoId;
                    const title = item.snippet.title;
                    const thumb = item.snippet.thumbnails.default.url;
                    const div = document.createElement('div');
                    div.className = 'yt-result-item';
                        const img = document.createElement('img');
                        img.src = thumb;
                        img.alt = title;
                        const label = document.createElement('span');
                        label.textContent = title;
                        div.append(img, label);
                    div.addEventListener('click', () => playVideo(vid));
                    ytResults.appendChild(div);
                });
            })
            .catch(err => {
                localStorage.removeItem('yt-api-key');
                ytResults.innerHTML = '<div class="media-hint">Search failed — your API key may be invalid or quota exceeded. It has been cleared. Click Search again to re-enter it.</div>';
            });
    }

    function promptForYouTubeApiKey() {
        const apiKey = prompt(
            'To search YouTube, you need a free YouTube Data API key.\n\n' +
            '1. Go to console.cloud.google.com (free Google account)\n' +
            '2. Create a project → Enable "YouTube Data API v3"\n' +
            '3. Go to Credentials → Create API Key\n' +
            '4. Paste it here:\n\n' +
            '(Or leave blank to see educational suggestions instead)'
        );
        if (!apiKey || !apiKey.trim()) return null;
        localStorage.setItem('yt-api-key', apiKey.trim());
        return apiKey.trim();
    }

    function showYtSuggestions(query) {
        const suggestions = [
            { id: 'RF4WHkOHivQ', title: 'Counting to 100 — Kindergarten' },
            { id: '1v24noaXuFg', title: 'Phonics Song for Kids' },
            { id: 'tuFd8C8AFSQ', title: 'Brain Break — Move & Freeze' },
            { id: 'BELlZKpi1Zs', title: 'Alphabet Song A-Z' },
            { id: '6Cv8SOfmBMw', title: 'Days of the Week Song' },
            { id: 'pnUMy0exTXQ', title: 'Shapes Song for Kids' },
            { id: 'DR-cfDsHx7A', title: 'Colors Song — Learn Colors' },
            { id: 'W1XRkRWFbkk', title: 'Sight Words — Pre-K & K' },
        ];
        ytResults.innerHTML = '<div class="media-hint" style="font-size:0.78rem;margin-bottom:8px;">No API key set - showing educational suggestions. Add a YouTube API key to search freely.<br><button id="yt-set-api-key-btn" style="margin-top:6px;background:#6366f1;color:#fff;border:none;border-radius:6px;padding:4px 10px;font-size:0.75rem;cursor:pointer;">Set API Key</button></div>';
        document.getElementById('yt-set-api-key-btn')?.addEventListener('click', () => {
            localStorage.removeItem('yt-api-key');
            const apiKey = promptForYouTubeApiKey();
            if (!apiKey) return;
            const nextQuery = (query || ytSearchInput?.value || '').trim();
            if (nextQuery) searchYouTube(nextQuery);
            else ytResults.innerHTML = '<div class="media-hint">API key saved. Enter a YouTube search to see results.</div>';
        });
        suggestions.forEach(v => {
            const div = document.createElement('div');
            div.className = 'yt-result-item';
            const img = document.createElement('img');
            img.src = `https://img.youtube.com/vi/${v.id}/mqdefault.jpg`;
            img.alt = v.title;
            const label = document.createElement('span');
            label.textContent = v.title;
            div.append(img, label);
            div.addEventListener('click', () => playVideo(v.id));
            ytResults.appendChild(div);
        });
    }

    function playVideo(id) {
        ytCurrentVideoId = id;
        ytFloatWidget.classList.remove('hidden');
        App.closeModal('modal-media');
        if (!ytFloatDragBound) {
            App.makeDraggable(ytFloatWidget, ytFloatWidget.querySelector('.yt-fw-header'), () => schedulePagePersist());
            ytFloatDragBound = true;
        }
        if (!isYouTubeApiReady()) {
            ytPendingVideoId = id;
            schedulePagePersist();
            return;
        }
        ytPendingVideoId = '';
        if (ytPlayer) {
            ytPlayer.loadVideoById(id);
        } else {
            ytPlayer = new YT.Player('yt-player-container', {
                height: '225',
                width: '400',
                videoId: id,
                playerVars: { 'autoplay': 1, 'modestbranding': 1 },
                events: {
                    'onReady': (event) => event.target.playVideo(),
                    'onStateChange': (event) => {
                        if (event.data === YT.PlayerState.ENDED) {
                            console.log('Video ended');
                        }
                    }
                }
            });
        }
        schedulePagePersist();
    }

    function closeFloatingYouTubePlayer(options = {}) {
        const { persist = true } = options;
        ytPendingVideoId = '';
        ytCurrentVideoId = '';
        ytFloatWidget.classList.add('hidden');
        if (ytPlayer && ytPlayer.stopVideo) ytPlayer.stopVideo();
        if (persist) schedulePagePersist();
    }

    imgSourceButtons.forEach(button => {
        button.addEventListener('click', () => setActiveImageSource(button.dataset.src || 'search'));
    });

    imgSearchBtn?.addEventListener('click', () => runImageSearch(imgSearchInput.value));
    imgSearchInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter') runImageSearch(e.currentTarget.value); });
    
    ytSearchBtn?.addEventListener('click', () => {
        const q = ytSearchInput.value.trim();
        if (q) searchYouTube(q); else showYtSuggestions('');
    });
    ytSearchInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter') searchYouTube(e.currentTarget.value.trim()); });

    document.getElementById('yt-fw-close')?.addEventListener('click', () => closeFloatingYouTubePlayer());
    setActiveImageSource(activeImageSource);

    // ===================== TIMER =====================
    const TIMER_STORAGE_KEY = 'wb-standalone-timer';
    let timerSeconds = 300, timerTotal = 300, timerInterval = null, timerRunning = false, timerEndsAt = null;

    function persistTimerState() {
        try {
            localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify({
                timerSeconds,
                timerTotal,
                timerRunning,
                timerEndsAt,
            }));
        } catch (e) {}
    }

    function clearTimerTick() {
        if (!timerInterval) return;
        clearInterval(timerInterval);
        timerInterval = null;
    }

    function loadTimerState() {
        try {
            const saved = JSON.parse(localStorage.getItem(TIMER_STORAGE_KEY) || 'null');
            if (!saved) return;
            timerTotal = typeof saved.timerTotal === 'number' ? saved.timerTotal : timerTotal;
            timerRunning = !!saved.timerRunning;
            timerEndsAt = typeof saved.timerEndsAt === 'number' ? saved.timerEndsAt : null;
            if (timerRunning && timerEndsAt) {
                timerSeconds = Math.max(0, Math.ceil((timerEndsAt - Date.now()) / 1000));
                if (timerSeconds === 0) {
                    timerRunning = false;
                    timerEndsAt = null;
                }
            } else {
                timerSeconds = typeof saved.timerSeconds === 'number' ? saved.timerSeconds : timerSeconds;
            }
        } catch (e) {}
    }

    function startTimerTick() {
        if (timerInterval) return;
        timerInterval = setInterval(() => {
            if (!timerRunning || !timerEndsAt) {
                clearTimerTick();
                return;
            }
            const nextSeconds = Math.max(0, Math.ceil((timerEndsAt - Date.now()) / 1000));
            if (nextSeconds !== timerSeconds) {
                timerSeconds = nextSeconds;
                updateTimerDisplay();
                persistTimerState();
            }
            if (nextSeconds <= 0) {
                clearTimerTick();
                timerRunning = false;
                timerEndsAt = null;
                persistTimerState();
                timerFinished();
            }
        }, 250);
    }

    function updateTimerDisplay() {
        const m = Math.floor(timerSeconds / 60);
        const s = timerSeconds % 60;
        document.getElementById('timer-display').textContent =
            String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
        const pct = timerTotal > 0 ? (timerSeconds / timerTotal) * 100 : 0;
        document.getElementById('timer-ring')?.style.setProperty('--timer-progress', `${Math.max(0, Math.min(100, pct))}%`);
        const status = document.getElementById('timer-status');
        if (status) {
            if (timerRunning) status.textContent = `${Math.max(0, Math.round(pct))}% left`;
            else if (timerSeconds === 0) status.textContent = `Time's up`;
            else if (timerSeconds === timerTotal) status.textContent = 'Ready';
            else status.textContent = 'Paused';
        }
        document.getElementById('timer-progress-fill').style.width = pct + '%';
    }

    function startTimer() {
        if (timerRunning || timerSeconds <= 0) return;
        timerRunning = true;
        timerEndsAt = Date.now() + timerSeconds * 1000;
        startTimerTick();
        persistTimerState();
        updateTimerDisplay();
    }

    function resetStandaloneTimer(seconds = 300) {
        clearTimerTick();
        timerRunning = false;
        timerEndsAt = null;
        timerSeconds = timerTotal = seconds;
        document.getElementById('timer-display').style.color = 'var(--text-main)';
        const timerMinInput = document.getElementById('timer-min');
        const timerSecInput = document.getElementById('timer-sec-input');
        if (timerMinInput) timerMinInput.value = String(Math.floor(seconds / 60));
        if (timerSecInput) timerSecInput.value = String(seconds % 60).padStart(2, '0');
        persistTimerState();
        updateTimerDisplay();
    }

    function timerFinished() {
        document.getElementById('timer-display').style.color = 'var(--color-red)';
        updateTimerDisplay();
        // Play a sound using Web Audio
        try {
            const ac = new AudioContext();
            const delays = [0, 300, 600];
            delays.forEach(delay => {
                const osc = ac.createOscillator();
                const gain = ac.createGain();
                osc.connect(gain); gain.connect(ac.destination);
                osc.frequency.value = 880;
                osc.type = 'sine';
                gain.gain.value = 0.3;
                osc.start(ac.currentTime + delay/1000);
                osc.stop(ac.currentTime + delay/1000 + 0.2);
            });
            if (typeof ac.close === 'function') {
                setTimeout(() => ac.close(), Math.max(...delays) + 300);
            }
        } catch(e) {}
    }

    document.getElementById('timer-start').addEventListener('click', startTimer);
    document.getElementById('timer-pause').addEventListener('click', () => {
        if (timerRunning && timerEndsAt) {
            timerSeconds = Math.max(0, Math.ceil((timerEndsAt - Date.now()) / 1000));
        }
        clearTimerTick();
        timerRunning = false;
        timerEndsAt = null;
        persistTimerState();
        updateTimerDisplay();
    });
    document.getElementById('timer-reset').addEventListener('click', () => {
        resetStandaloneTimer(timerTotal);
    });

    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            clearTimerTick();
            timerRunning = false;
            timerEndsAt = null;
            timerSeconds = timerTotal = parseInt(btn.getAttribute('data-sec'));
            document.getElementById('timer-display').style.color = 'var(--text-main)';
            persistTimerState();
            updateTimerDisplay();
        });
    });

    document.getElementById('timer-set-btn').addEventListener('click', () => {
        clearTimerTick();
        timerRunning = false;
        timerEndsAt = null;
        const m = parseInt(document.getElementById('timer-min').value) || 0;
        const s = parseInt(document.getElementById('timer-sec-input').value) || 0;
        timerSeconds = timerTotal = m * 60 + s;
        document.getElementById('timer-display').style.color = 'var(--text-main)';
        persistTimerState();
        updateTimerDisplay();
    });

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && timerRunning) {
            timerSeconds = Math.max(0, Math.ceil((timerEndsAt - Date.now()) / 1000));
            updateTimerDisplay();
            if (!timerInterval) startTimerTick();
        }
    });

    loadTimerState();
    if (timerRunning && timerEndsAt) startTimerTick();
    updateTimerDisplay();

    // ===================== TRAFFIC LIGHT =====================
    const TRAFFIC_LIGHT_STORAGE_KEY = 'wb-standalone-traffic-light';

    function setTrafficLight(color) {
        document.querySelectorAll('.tl-light').forEach(l => l.classList.remove('active'));
        const light = document.getElementById('tl-' + color);
        if (light) light.classList.add('active');
        try { localStorage.setItem(TRAFFIC_LIGHT_STORAGE_KEY, color); } catch (e) {}
    }

    function loadTrafficLightState() {
        const savedColor = localStorage.getItem(TRAFFIC_LIGHT_STORAGE_KEY);
        if (savedColor === 'red' || savedColor === 'yellow' || savedColor === 'green') {
            setTrafficLight(savedColor);
            return;
        }
        setTrafficLight('red');
    }

    document.querySelectorAll('.tl-label-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const color = e.currentTarget.dataset.traffic;
            if (color) setTrafficLight(color);
        });
    });

    document.querySelectorAll('.tl-light').forEach(lightBtn => {
        lightBtn.addEventListener('click', (e) => {
            // infer color from id (e.g. tl-red -> red)
            const color = e.currentTarget.id.replace('tl-', '');
            setTrafficLight(color);
        });
        lightBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const color = e.currentTarget.id.replace('tl-', '');
                setTrafficLight(color);
            }
        });
    });

    loadTrafficLightState();

    // ===================== QR CODE =====================
    function resetQrGenerator() {
        const input = document.getElementById('qr-input');
        if (input) input.value = '';
        const output = document.getElementById('qr-output');
        if (output) output.innerHTML = '';
    }

    document.getElementById('qr-generate-btn').addEventListener('click', () => {
        const text = document.getElementById('qr-input').value;
        const output = document.getElementById('qr-output');
        output.innerHTML = '';
        if (text) {
            new QRCode(output, { text, width: 180, height: 180 });
        }
    });

    const qrModal = document.getElementById('modal-qr');
    if (qrModal) {
        new MutationObserver(() => {
            if (qrModal.classList.contains('hidden')) {
                resetQrGenerator();
            }
        }).observe(qrModal, { attributes: true, attributeFilter: ['class'] });
    }

    // ===================== NAME PICKER =====================
    let pickedNames = [];
    let namepickShuffleInterval = null;

    function resetStandaloneNamePicker() {
        pickedNames = [];
        if (namepickShuffleInterval) {
            clearInterval(namepickShuffleInterval);
            namepickShuffleInterval = null;
        }
        const display = document.getElementById('namepick-display');
        if (display) {
            display.textContent = '?';
            display.style.animation = 'none';
        }
        const history = document.getElementById('namepick-history');
        if (history) history.innerHTML = '';
    }

    document.getElementById('namepick-btn').addEventListener('click', () => {
        const studentNames = getStudentNames();
        const available = studentNames.filter(n => !pickedNames.includes(n));
        if (available.length === 0) { pickedNames = []; }
        const pool = available.length > 0 ? available : studentNames;
        const pick = pool[Math.floor(Math.random() * pool.length)];
        pickedNames.push(pick);

        const display = document.getElementById('namepick-display');
        display.textContent = '';
        display.style.animation = 'none';
        if (namepickShuffleInterval) {
            clearInterval(namepickShuffleInterval);
            namepickShuffleInterval = null;
        }
        // Shuffle animation
        let count = 0;
        namepickShuffleInterval = setInterval(() => {
            display.textContent = studentNames[Math.floor(Math.random() * studentNames.length)];
            count++;
            if (count > 15) {
                clearInterval(namepickShuffleInterval);
                namepickShuffleInterval = null;
                display.textContent = pick;
                display.style.animation = 'popIn 0.4s ease';
            }
        }, 80);

        // Update history
        const hist = document.getElementById('namepick-history');
        hist.innerHTML = '';
        pickedNames.forEach(name => {
            const chip = document.createElement('span');
            chip.className = 'namepick-chip';
            chip.textContent = name;
            hist.appendChild(chip);
        });
    });

    const namePickerModal = document.getElementById('modal-namepick');
    if (namePickerModal) {
        new MutationObserver(() => {
            if (namePickerModal.classList.contains('hidden')) {
                resetStandaloneNamePicker();
            }
        }).observe(namePickerModal, { attributes: true, attributeFilter: ['class'] });
    }

    // ===================== SOUND METER =====================
    /*
       Uses Web Audio API to visualize microphone input levels.
       - AudioContext: Interface for managing and playing all sounds.
       - AnalyserNode: Provides real-time frequency and time-domain analysis.
    */
    let audioCtx, analyser, micStream, soundAnimFrame, soundStarting = false;
    const soundBars = document.querySelectorAll('#sound-bars .sb');
    const soundSensitivity = document.getElementById('sound-sensitivity');

    function stopStandaloneSoundMeter() {
        soundStarting = false;
        cancelAnimationFrame(soundAnimFrame);
        soundAnimFrame = null;
        if (micStream) micStream.getTracks().forEach(t => t.stop());
        micStream = null;
        analyser = null;
        if (audioCtx && typeof audioCtx.close === 'function') audioCtx.close();
        audioCtx = null;
        soundBars.forEach(b => { b.style.height = '8px'; b.style.background = 'var(--border-color)'; });
    }

    function resetStandaloneSoundMeterUi() {
        stopStandaloneSoundMeter();
        document.getElementById('sound-level-label').textContent = 'Listening...';
        document.getElementById('sound-start-btn').classList.remove('hidden');
        document.getElementById('sound-stop-btn').classList.add('hidden');
    }

    document.getElementById('sound-start-btn').addEventListener('click', async () => {
        if (soundStarting || micStream) return;
        soundStarting = true;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stopStandaloneSoundMeter();
            micStream = stream;
            audioCtx = new AudioContext();
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            const src = audioCtx.createMediaStreamSource(micStream);
            src.connect(analyser);
            soundStarting = false;

            document.getElementById('sound-start-btn').classList.add('hidden');
            document.getElementById('sound-stop-btn').classList.remove('hidden');

            function animateBars() {
                const data = new Uint8Array(analyser.frequencyBinCount);
                analyser.getByteFrequencyData(data);
                const avg = data.reduce((a,b) => a+b, 0) / data.length;
                const sensitivityFactor = soundSensitivity ? (parseInt(soundSensitivity.value, 10) || 8) / 8 : 1;
                const norm = Math.min((avg / 128) * sensitivityFactor, 1);

                soundBars.forEach((bar, i) => {
                    const h = 8 + norm * (70 - i * 4) * (0.6 + Math.random() * 0.4);
                    bar.style.height = Math.max(8, h) + 'px';
                    const green = [0,1,2,3], yellow = [4,5,6], red = [7,8,9];
                    if (green.includes(i)) bar.style.background = 'var(--color-green)';
                    else if (yellow.includes(i)) bar.style.background = 'var(--color-orange)';
                    else bar.style.background = 'var(--color-red)';
                });

                const label = document.getElementById('sound-level-label');
                if (norm < 0.1) label.textContent = '🤫 Level 0: Silent';
                else if (norm < 0.25) label.textContent = '🗣 Level 1: Whisper';
                else if (norm < 0.45) label.textContent = '💬 Level 2: Table Talk';
                else if (norm < 0.65) label.textContent = '📢 Level 3: Presenter';
                else label.textContent = '🔊 Level 4: Too Loud!';

                soundAnimFrame = requestAnimationFrame(animateBars);
            }
            animateBars();
        } catch(e) {
            soundStarting = false;
            alert('Microphone access denied. Please allow mic access.');
        }
    });

    document.getElementById('sound-stop-btn').addEventListener('click', resetStandaloneSoundMeterUi);

    const soundModal = document.getElementById('modal-sound');
    if (soundModal) {
        new MutationObserver(() => {
            if (soundModal.classList.contains('hidden')) resetStandaloneSoundMeterUi();
        }).observe(soundModal, { attributes: true, attributeFilter: ['class'] });
    }

    // ===================== BACKGROUND PICKER =====================
    // Lines/Grid/Dotted backgrounds
    document.querySelectorAll('#bg-lines .bg-option').forEach(opt => {
        opt.addEventListener('click', () => {
            const bg = opt.getAttribute('data-bg');
            applyCanvasBackground('');
            if (bg === 'lined') canvasArea.classList.add('bg-lined');
            else if (bg === 'grid') canvasArea.classList.add('bg-grid');
            else if (bg === 'dotted') canvasArea.classList.add('bg-dotted');
            else if (bg === 'isometric') canvasArea.classList.add('bg-isometric');
            else if (bg === 'music') canvasArea.classList.add('bg-music');
            saveCurrentPageState();
        });
    });

    // Color swatches
    const bgColors = [
        App.getVar('--note-purple', '#f3e5f5'), App.getVar('--note-indigo', '#e8eaf6'), App.getVar('--accent-blue', '#e3f2fd'),
        App.getVar('--note-teal', '#e0f2f1'), App.getVar('--note-green', '#f1f8e9'), App.getVar('--note-yellow', '#fffde7'),
        App.getVar('--note-orange', '#fff3e0'), App.getVar('--note-red', '#fbe9e7'), App.getVar('--note-pink', '#fce4ec'),
        App.getVar('--off-white', '#f5f5f5'), App.getVar('--note-grey', '#eceff1'), App.getVar('--grey-300', '#e0e0e0'),
        App.getVar('--clock-bg', '#1a2332'), App.getVar('--dark-slate', '#2d3748'), App.getVar('--mid-slate', '#4a5568'),
        App.getVar('--deep-purple', '#1e1e2e'), App.getVar('--countdown-bg', '#2e7d6b'), App.getVar('--avatar-bg', '#5c6bc0')
    ];
    const colorGrid = document.getElementById('bg-color-grid');
    if (colorGrid) {
        bgColors.forEach(c => {
            const sw = document.createElement('div');
            sw.className = 'color-swatch';
            sw.style.background = c;
            sw.addEventListener('click', () => {
                applyCanvasBackground(c);
                saveCurrentPageState();
                App.closeModal('modal-background');
            });
            colorGrid.appendChild(sw);
        });
    }

    const bgApply = document.getElementById('bg-apply-custom');
    if (bgApply) bgApply.addEventListener('click', () => {
        applyCanvasBackground(document.getElementById('bg-custom-color').value);
        saveCurrentPageState();
        App.closeModal('modal-background');
    });

    // Background image grid — themed backgrounds by category
    const bgImageGrid = document.getElementById('bg-image-grid');
    const bgImageSearchBar = document.getElementById('bg-image-search-bar');
    const bgImageSearchInput = document.getElementById('bg-image-search-input');
    const bgImageSearchBtn = document.getElementById('bg-image-search-btn');
    if (bgImageGrid) {
        const bgThemesByCategory = {
            simple: [
                { label: 'White',        bg: '#ffffff' },
                { label: 'Cream',        bg: '#fffdf5' },
                { label: 'Light Blue',   bg: '#e3f2fd' },
                { label: 'Light Green',  bg: '#f1f8e9' },
                { label: 'Light Yellow', bg: '#fffde7' },
                { label: 'Light Pink',   bg: '#fce4ec' },
                { label: 'Light Purple', bg: '#f3e5f5' },
                { label: 'Light Grey',   bg: '#f5f5f5' },
                { label: 'Pastel',       bg: 'linear-gradient(135deg, #fce4ec 0%, #e3f2fd 50%, #f1f8e9 100%)' },
                { label: 'Soft Peach',   bg: 'linear-gradient(135deg, #ffe0b2, #fff9c4)' },
                { label: 'Mint',         bg: 'linear-gradient(135deg, #e0f7fa, #b2dfdb)' },
                { label: 'Lavender',     bg: 'linear-gradient(135deg, #e8d5ff 0%, #c39bd3 100%)' },
            ],
            photos: [
                { label: 'Sunny Day',    bg: 'linear-gradient(to bottom, #87CEEB 0%, #fffde7 60%, #a5d6a7 100%)' },
                { label: 'Night Sky',    bg: 'linear-gradient(to bottom, #0d1b2a 0%, #1a237e 50%, #283593 100%)' },
                { label: 'Ocean',        bg: 'linear-gradient(to bottom, #29b6f6 0%, #0277bd 60%, #01579b 100%)' },
                { label: 'Sunset',       bg: 'linear-gradient(to bottom right, #ff7043, #ffa726, #ffee58)' },
                { label: 'Forest',       bg: 'linear-gradient(to bottom, #a5d6a7 0%, #388e3c 100%)' },
                { label: 'Arctic',       bg: 'linear-gradient(to bottom, #e3f2fd 0%, #bbdefb 100%)' },
                { label: 'Rainbow',      bg: 'linear-gradient(to right, #ef5350, #ff7043, #ffca28, #66bb6a, #42a5f5, #7e57c2)' },
                { label: 'Outer Space',  bg: 'radial-gradient(ellipse at center, #1a237e 0%, #0d1b2a 70%)' },
                { label: 'Desert',       bg: 'linear-gradient(to bottom, #87CEEB 0%, #ffe082 50%, #d7a86e 100%)' },
                { label: 'Autumn',       bg: 'linear-gradient(to bottom, #ff8f00 0%, #e65100 100%)' },
                { label: 'Underwater',   bg: 'linear-gradient(to bottom, #00acc1 0%, #006064 100%)' },
                { label: 'Volcano',      bg: 'linear-gradient(to bottom, #37474f 0%, #bf360c 80%, #ff6f00 100%)' },
            ],
            textures: [
                { label: 'Chalkboard',   bg: 'linear-gradient(135deg, #2d5016 0%, #3a6020 100%)' },
                { label: 'Cozy Library', bg: 'linear-gradient(135deg, #8d6e63 0%, #5d4037 100%)' },
                { label: 'Dark Wood',    bg: 'linear-gradient(135deg, #4e342e 0%, #3e2723 100%)' },
                { label: 'Charcoal',     bg: 'linear-gradient(135deg, #424242, #212121)' },
                { label: 'Navy',         bg: 'linear-gradient(135deg, #1a237e, #283593)' },
                { label: 'Deep Purple',  bg: 'linear-gradient(135deg, #4a148c, #6a1b9a)' },
                { label: 'Slate',        bg: 'linear-gradient(135deg, #546e7a, #37474f)' },
                { label: 'Rust',         bg: 'linear-gradient(135deg, #bf360c, #8d2800)' },
                { label: 'Gold',         bg: 'linear-gradient(135deg, #f9a825, #f57f17)' },
                { label: 'Teal',         bg: 'linear-gradient(135deg, #00695c, #004d40)' },
                { label: 'Rose',         bg: 'linear-gradient(135deg, #c2185b, #880e4f)' },
                { label: 'Indigo',       bg: 'linear-gradient(135deg, #3949ab, #1a237e)' },
            ],
        };

        let currentBgCat = 'simple';

        function renderBgHint(message) {
            bgImageGrid.innerHTML = `<div class="media-hint">${message}</div>`;
        }

        function applyBackgroundImage(url) {
            applyCanvasBackground(`center / cover no-repeat url("${url}")`);
            saveCurrentPageState();
            App.closeModal('modal-background');
        }

        function renderBgGrid(cat) {
            bgImageGrid.innerHTML = '';
            const normalizedCat = cat === 'thematic' ? 'simple' : cat;
            (bgThemesByCategory[normalizedCat] || bgThemesByCategory.simple).forEach(theme => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'bg-image-thumb';
                btn.title = theme.label;
                btn.innerHTML = `<div class="bg-img-preview" style="background:${theme.bg}"></div><span>${theme.label}</span>`;
                btn.addEventListener('click', () => {
                    applyCanvasBackground(theme.bg);
                    saveCurrentPageState();
                    App.closeModal('modal-background');
                });
                bgImageGrid.appendChild(btn);
            });
        }

        function searchPixabayBackgrounds(query) {
            if (!query) return;
            const apiKey = getStoredApiKey('pixabay-key', 'To search Pixabay backgrounds, you need a free Pixabay API key.\n\n1. Go to pixabay.com/api/docs/ in a new tab\n2. Create a free account (no credit card needed)\n3. Copy your API Key and paste it here:');
            if (!apiKey) return;
            renderBgHint('Searching Pixabay backgrounds...');
            fetch(`https://pixabay.com/api/?key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(query)}&image_type=photo&orientation=horizontal&per_page=12&safesearch=true`)
                .then(r => { if (!r.ok) throw new Error('bad response'); return r.json(); })
                .then(data => {
                    const hits = data.hits || [];
                    if (!hits.length) {
                        renderBgHint('No Pixabay backgrounds found. Try different words.');
                        return;
                    }
                    bgImageGrid.innerHTML = '';
                    hits.forEach(hit => {
                        const btn = document.createElement('button');
                        btn.type = 'button';
                        btn.className = 'bg-image-thumb pixabay-thumb';
                        btn.title = hit.tags || 'Pixabay background';
                        btn.innerHTML = `<div class="bg-img-preview" style="background:center / cover no-repeat url('${hit.webformatURL}')"></div><span>${hit.tags || 'Pixabay'}</span>`;
                        btn.addEventListener('click', () => applyBackgroundImage(hit.largeImageURL || hit.webformatURL));
                        bgImageGrid.appendChild(btn);
                    });
                })
                .catch(() => {
                    localStorage.removeItem('pixabay-key');
                    renderBgHint('Pixabay search failed. Your API key may be wrong - it has been cleared. Search again to re-enter it.');
                });
        }

        function setBackgroundImageCategory(cat) {
            currentBgCat = cat;
            document.querySelectorAll('.bg-img-cat').forEach(button => {
                const isActive = button.dataset.imgcat === cat;
                button.classList.toggle('active', isActive);
                button.setAttribute('aria-selected', isActive ? 'true' : 'false');
            });
            const searchMode = cat === 'pixabay';
            bgImageSearchBar?.classList.toggle('hidden', !searchMode);
            if (searchMode) {
                renderBgHint('Search Pixabay to use a photo as your board background.');
                return;
            }
            renderBgGrid(cat);
        }

        // Wire sub-tab buttons
        document.querySelectorAll('.bg-img-cat').forEach(cat => {
            cat.addEventListener('click', () => {
                setBackgroundImageCategory(cat.dataset.imgcat);
            });
        });

        bgImageSearchBtn?.addEventListener('click', () => searchPixabayBackgrounds(bgImageSearchInput.value.trim()));
        bgImageSearchInput?.addEventListener('keypress', e => {
            if (e.key === 'Enter') searchPixabayBackgrounds(e.currentTarget.value.trim());
        });

        document.querySelector('.bg-img-cat[data-imgcat="thematic"]')?.setAttribute('aria-selected', 'false');
        document.querySelector('.bg-img-cat[data-imgcat="thematic"]')?.classList.remove('active');
        document.querySelector('.bg-img-cat[data-imgcat="simple"]')?.setAttribute('aria-selected', 'true');
        document.querySelector('.bg-img-cat[data-imgcat="simple"]')?.classList.add('active');
        setBackgroundImageCategory(currentBgCat);
    }

    // Layout backgrounds
    document.querySelectorAll('#bg-layout .bg-option').forEach(opt => {
        opt.addEventListener('click', () => {
            const layout = opt.getAttribute('data-layout');
            resetCanvasAreaClasses();
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = App.getVar('--border-color', '#ccc');
            ctx.lineWidth = 2;
            if (layout === 't-chart') {
                ctx.beginPath();
                ctx.moveTo(canvas.width/2, 60);
                ctx.lineTo(canvas.width/2, canvas.height);
                ctx.moveTo(40, 60);
                ctx.lineTo(canvas.width-40, 60);
                ctx.stroke();
            } else if (layout === 'kwl') {
                const w3 = canvas.width / 3;
                ctx.beginPath();
                ctx.moveTo(w3, 60); ctx.lineTo(w3, canvas.height);
                ctx.moveTo(w3*2, 60); ctx.lineTo(w3*2, canvas.height);
                ctx.moveTo(40, 60); ctx.lineTo(canvas.width-40, 60);
                ctx.stroke();
                ctx.font = '20px Inter'; ctx.fillStyle = App.getVar('--text-muted', '#666'); ctx.textAlign = 'center';
                ctx.fillText('K - Know', w3/2, 40);
                ctx.fillText('W - Want to Know', w3*1.5, 40);
                ctx.fillText('L - Learned', w3*2.5, 40);
            } else if (layout === 'venn') {
                ctx.beginPath();
                ctx.arc(canvas.width/2 - 80, canvas.height/2, 140, 0, Math.PI*2);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(canvas.width/2 + 80, canvas.height/2, 140, 0, Math.PI*2);
                ctx.stroke();
            }
            saveCanvasState();
            App.closeModal('modal-background');
        });
    });

    // ===================== SCHEDULE WIDGET =====================
    let schedule = Storage.readJSON('wb-schedule', []);
    let lastScheduleActiveKey = null;
    let scheduleAlertsInitialized = false;
    let scheduleAlertHideTimeout = null;
    const scheduleIconSearchInput = document.getElementById('sw-icon-search');
    const scheduleIconSearchBtn = document.getElementById('sw-icon-search-btn');
    const scheduleIconResults = document.getElementById('sw-icon-results');
    const scheduleIconPresets = document.getElementById('sw-icon-presets');
    const scheduleIconSelection = document.getElementById('sw-icon-selection');
    const scheduleIconInput = document.getElementById('sw-item-icon');
    const scheduleIconLabelInput = document.getElementById('sw-item-icon-label');

    function makeScheduleStickerData(label, accentA, accentB, glyph, glyphColor = '#ffffff') {
        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" role="img" aria-label="${label}">
                <defs>
                    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stop-color="${accentA}"/>
                        <stop offset="100%" stop-color="${accentB}"/>
                    </linearGradient>
                </defs>
                <rect x="10" y="10" width="76" height="76" rx="24" fill="url(#g)"/>
                <circle cx="28" cy="26" r="7" fill="rgba(255,255,255,0.9)"/>
                <text x="48" y="59" text-anchor="middle" font-size="34" font-weight="700" font-family="Trebuchet MS, Arial, sans-serif" fill="${glyphColor}">${glyph}</text>
            </svg>`;
        return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
    }

    const SCHEDULE_ICON_PRESETS = [
        { label: 'Meal', url: makeScheduleStickerData('Meal', '#ffbe88', '#ff8e9f', 'PL') },
        { label: 'Break', url: makeScheduleStickerData('Break', '#8fb7ff', '#79ddc0', 'BR') },
        { label: 'SEL', url: makeScheduleStickerData('SEL', '#ff9bc2', '#c996ff', 'SE') },
        { label: 'Lesson', url: makeScheduleStickerData('Lesson', '#7ea5ff', '#8c88ff', 'AB') },
        { label: 'Art', url: makeScheduleStickerData('Art', '#ffb870', '#ffd86f', 'AR') },
        { label: 'Movement', url: makeScheduleStickerData('Movement', '#79ddc0', '#7ec6ff', 'GO') },
        { label: 'Math', url: makeScheduleStickerData('Math', '#8fcf7a', '#79ddc0', '12') },
        { label: 'Reading', url: makeScheduleStickerData('Reading', '#ff9fa2', '#ffbe88', 'RD') }
    ];

    function formatScheduleTime(value) {
        if (!value || typeof value !== 'string') return '';
        const [rawHours, rawMinutes] = value.split(':').map(Number);
        if (!Number.isFinite(rawHours) || !Number.isFinite(rawMinutes)) return value;
        const period = rawHours >= 12 ? 'PM' : 'AM';
        const hours12 = rawHours % 12 || 12;
        return `${hours12}:${String(rawMinutes).padStart(2, '0')} ${period}`;
    }

    function getScheduleItemKey(item) {
        if (!item) return null;
        return [item.title, item.startTime, item.endTime, item.icon, item.iconUrl, item.iconAlt].join('|');
    }

    function setScheduleIconSelection(iconUrl, iconLabel = '') {
        if (scheduleIconInput) scheduleIconInput.value = iconUrl || '';
        if (scheduleIconLabelInput) scheduleIconLabelInput.value = iconLabel || '';
        if (!scheduleIconSelection) return;

        if (!iconUrl) {
            scheduleIconSelection.className = 'sw-icon-selection is-empty';
            scheduleIconSelection.textContent = 'Choose a sticker icon';
        } else {
            scheduleIconSelection.className = 'sw-icon-selection';
            scheduleIconSelection.innerHTML = `<img class="sw-icon-selection-thumb" src="${iconUrl}" alt="${iconLabel}"><div class="sw-icon-selection-label">${iconLabel || 'Selected sticker'}</div>`;
        }

        [scheduleIconPresets, scheduleIconResults].forEach(container => {
            container?.querySelectorAll('.sw-icon-option').forEach(button => {
                button.classList.toggle('selected', button.dataset.iconUrl === (iconUrl || ''));
            });
        });
    }

    function renderScheduleIconOptions(container, items, emptyMessage = 'No sticker icons yet.') {
        if (!container) return;
        if (!items.length) {
            container.className = 'sw-icon-results is-empty';
            container.textContent = emptyMessage;
            return;
        }

        container.className = container.id === 'sw-icon-results' ? 'sw-icon-results' : 'sw-icon-presets';
        container.innerHTML = '';
        items.forEach(item => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'sw-icon-option';
            button.dataset.iconUrl = item.url;
            button.dataset.iconLabel = item.label || item.title || 'Sticker';
            button.innerHTML = `<img src="${item.url}" alt="${button.dataset.iconLabel}"><span>${button.dataset.iconLabel}</span>`;
            button.addEventListener('click', () => setScheduleIconSelection(item.url, button.dataset.iconLabel));
            container.appendChild(button);
        });
        const currentUrl = scheduleIconInput?.value || '';
        if (currentUrl) {
            container.querySelectorAll('.sw-icon-option').forEach(button => {
                button.classList.toggle('selected', button.dataset.iconUrl === currentUrl);
            });
        }
    }

    function searchScheduleIcons(query) {
        const trimmedQuery = query.trim();
        if (!trimmedQuery || !scheduleIconResults) return;
        renderScheduleIconOptions(scheduleIconResults, [], 'Searching sticker icons...');
        fetch(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(`${trimmedQuery} sticker clipart`)}&page_size=8&license_type=commercial,modification`) 
            .then(r => { if (!r.ok) throw new Error('bad response'); return r.json(); })
            .then(data => {
                const items = (data.results || []).map(item => ({
                    url: item.thumbnail || item.url,
                    label: item.title || trimmedQuery
                })).filter(item => item.url);
                renderScheduleIconOptions(scheduleIconResults, items, 'No sticker-style icons found. Try different words.');
            })
            .catch(() => {
                renderScheduleIconOptions(scheduleIconResults, [], 'Sticker search failed right now. Try again in a moment.');
            });
    }

    function getActiveScheduleItem(nowMin) {
        return schedule.find(item => nowMin >= item.startMin && nowMin <= item.endMin) || null;
    }

    function ensureScheduleAlertNode() {
        const widget = document.getElementById('schedule-widget');
        if (!widget) return null;
        let alertNode = document.getElementById('sw-transition-alert');
        if (alertNode) return alertNode;

        alertNode = document.createElement('div');
        alertNode.id = 'sw-transition-alert';
        alertNode.className = 'sw-transition-alert hidden';
        alertNode.innerHTML = [
            '<div class="sw-transition-alert-icon" aria-hidden="true">',
            '<i class="fa-solid fa-bell"></i>',
            '</div>',
            '<div class="sw-transition-alert-text">',
            '<div class="sw-transition-alert-label">Now Starting</div>',
            '<div class="sw-transition-alert-title"></div>',
            '</div>'
        ].join('');

        const header = widget.querySelector('.sw-header');
        if (header?.nextSibling) widget.insertBefore(alertNode, header.nextSibling);
        else widget.appendChild(alertNode);
        return alertNode;
    }

    function playScheduleTransitionAlert() {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            const ac = new AudioCtx();
            const notes = [784, 988];
            notes.forEach((freq, index) => {
                const osc = ac.createOscillator();
                const gain = ac.createGain();
                osc.connect(gain);
                gain.connect(ac.destination);
                osc.type = 'sine';
                osc.frequency.value = freq;
                const startAt = ac.currentTime + index * 0.18;
                gain.gain.setValueAtTime(0.0001, startAt);
                gain.gain.exponentialRampToValueAtTime(0.12, startAt + 0.03);
                gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.22);
                osc.start(startAt);
                osc.stop(startAt + 0.24);
            });
            if (typeof ac.close === 'function') {
                setTimeout(() => ac.close(), 700);
            }
        } catch (e) {}
    }

    function showScheduleTransitionAlert(item) {
        const alertNode = ensureScheduleAlertNode();
        if (!alertNode || !item) return;
        const titleNode = alertNode.querySelector('.sw-transition-alert-title');
        if (titleNode) {
            titleNode.textContent = item.title;
        }
        alertNode.classList.remove('hidden');
        if (scheduleAlertHideTimeout) clearTimeout(scheduleAlertHideTimeout);
        scheduleAlertHideTimeout = setTimeout(() => {
            alertNode.classList.add('hidden');
        }, 5000);
        playScheduleTransitionAlert();
    }

    function syncScheduleTransitionAlert(nowMin) {
        const activeItem = getActiveScheduleItem(nowMin);
        const activeKey = getScheduleItemKey(activeItem);

        if (!scheduleAlertsInitialized) {
            scheduleAlertsInitialized = true;
            lastScheduleActiveKey = activeKey;
            return;
        }

        if (activeKey && activeKey !== lastScheduleActiveKey) {
            showScheduleTransitionAlert(activeItem);
        }

        lastScheduleActiveKey = activeKey;
    }

    function renderSchedule() {
        const container = document.getElementById('schedule-items');
        container.innerHTML = '';
        if (schedule.length === 0) {
            container.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;text-align:center;padding:12px;">No items yet — click Add Item</p>';
            return;
        }
        const now = new Date();
        const nowMin = now.getHours() * 60 + now.getMinutes();

        schedule.sort((a,b) => a.startMin - b.startMin);
        syncScheduleTransitionAlert(nowMin);
        schedule.forEach((item, i) => {
            const done = nowMin > item.endMin;
            const active = nowMin >= item.startMin && nowMin <= item.endMin;
            const duration = Math.max(1, item.endMin - item.startMin);
            let pct = done ? 100 : active ? Math.round(((nowMin - item.startMin)/duration)*100) : 0;

            const div = document.createElement('div');
            div.className = 'schedule-item';
            if (active) div.classList.add('active');
            const icon = document.createElement('div');
            icon.className = 'si-icon';
            if (item.iconUrl) {
                const iconImg = document.createElement('img');
                iconImg.src = item.iconUrl;
                iconImg.alt = item.iconAlt || item.title || 'Schedule icon';
                icon.appendChild(iconImg);
            } else {
                icon.textContent = item.icon || '📚';
            }
            const info = document.createElement('div');
            info.className = 'si-info';
            const title = document.createElement('div');
            title.className = 'si-title';
            title.textContent = item.title;
            const time = document.createElement('div');
            time.className = 'si-time';
            time.textContent = `${formatScheduleTime(item.startTime)} - ${formatScheduleTime(item.endTime)}`;
            const progress = document.createElement('div');
            progress.className = 'si-progress';
            const fill = document.createElement('div');
            fill.className = 'si-progress-fill';
            fill.style.width = `${pct}%`;
            progress.appendChild(fill);
            info.append(title, time, progress);
            div.append(icon, info);
            if (done) {
                const check = document.createElement('div');
                check.className = 'si-check';
                check.textContent = '✓';
                div.appendChild(check);
            }
            const removeBtn = document.createElement('button');
            removeBtn.style.cssText = 'background:none;border:none;color:var(--border-color);cursor:pointer;font-size:0.8rem;';
            removeBtn.title = 'Remove';
            removeBtn.textContent = '✕';
            removeBtn.addEventListener('click', () => removeScheduleItem(i));
            div.appendChild(removeBtn);
            container.appendChild(div);
        });
    }

    window.removeScheduleItem = function(i) {
        schedule.splice(i, 1);
        Storage.writeJSON('wb-schedule', schedule);
        renderSchedule();
    };

    function clearScheduleInputs() {
        document.getElementById('sw-item-title').value = '';
        document.getElementById('sw-item-start').value = '';
        document.getElementById('sw-item-end').value = '';
        if (scheduleIconSearchInput) scheduleIconSearchInput.value = '';
        renderScheduleIconOptions(scheduleIconResults, [], 'Search for cute sticker icons');
        setScheduleIconSelection(SCHEDULE_ICON_PRESETS[0]?.url || '', SCHEDULE_ICON_PRESETS[0]?.label || 'Meal');
    }

    document.getElementById('sw-add-btn').addEventListener('click', () => App.openModal('modal-schedule'));

    renderScheduleIconOptions(scheduleIconPresets, SCHEDULE_ICON_PRESETS);
    renderScheduleIconOptions(scheduleIconResults, [], 'Search for cute sticker icons');
    setScheduleIconSelection(SCHEDULE_ICON_PRESETS[0]?.url || '', SCHEDULE_ICON_PRESETS[0]?.label || 'Meal');

    scheduleIconSearchBtn?.addEventListener('click', () => searchScheduleIcons(scheduleIconSearchInput?.value || ''));
    scheduleIconSearchInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchScheduleIcons(e.currentTarget.value);
    });

    document.getElementById('sw-save-btn').addEventListener('click', () => {
        const title = document.getElementById('sw-item-title').value.trim();
        const startTime = document.getElementById('sw-item-start').value;
        const endTime = document.getElementById('sw-item-end').value;
        const iconUrl = scheduleIconInput?.value || '';
        const iconAlt = scheduleIconLabelInput?.value || title;
        if (!title || !startTime || !endTime) return alert('Please fill all fields');

        const [sh,sm] = startTime.split(':').map(Number);
        const [eh,em] = endTime.split(':').map(Number);

        schedule.push({ title, icon: '', iconUrl, iconAlt, startTime, endTime, startMin: sh*60+sm, endMin: eh*60+em });
        Storage.writeJSON('wb-schedule', schedule);
        renderSchedule();
        App.closeModal('modal-schedule');
        clearScheduleInputs();
    });

    const scheduleModal = document.getElementById('modal-schedule');
    if (scheduleModal) {
        new MutationObserver(() => {
            if (scheduleModal.classList.contains('hidden')) {
                clearScheduleInputs();
            }
        }).observe(scheduleModal, { attributes: true, attributeFilter: ['class'] });
    }

    renderSchedule();
    setInterval(renderSchedule, 60000); // Update every minute

    // Auto-open modal if arriving from dashboard via hash link
    const hash = window.location.hash;
    if (hash === '#timer') App.openModal('modal-timer');
    else if (hash === '#random') App.openModal('modal-random');

    // ===================== TEXT-TO-SPEECH =====================
    function resetTtsControls(inputId, voiceId, rateId) {
        const input = document.getElementById(inputId);
        if (input) input.value = '';
        const voiceSelect = document.getElementById(voiceId);
        if (voiceSelect && voiceSelect.options.length > 0) voiceSelect.selectedIndex = 0;
        const rate = document.getElementById(rateId);
        if (rate) rate.value = '1';
    }

    function setupTTS(inputId, voiceId, rateId, speakBtnId, stopBtnId) {
        const synth = window.speechSynthesis;
        const supportsTTS = !!(synth && typeof synth.cancel === 'function' && typeof synth.speak === 'function' && typeof window.SpeechSynthesisUtterance === 'function');
        let voices = [];
        const speakBtn = document.getElementById(speakBtnId);
        const stopBtn = document.getElementById(stopBtnId);
        const sel = document.getElementById(voiceId);

        if (!supportsTTS) {
            if (sel) {
                sel.innerHTML = '';
                const opt = document.createElement('option');
                opt.textContent = 'Text-to-speech unavailable in this browser';
                sel.appendChild(opt);
                sel.disabled = true;
            }
            if (speakBtn) speakBtn.disabled = true;
            if (stopBtn) stopBtn.disabled = true;
            return;
        }

        function loadVoices() {
            voices = typeof synth.getVoices === 'function' ? synth.getVoices() : [];
            if (!sel) return;
            sel.innerHTML = '';
            if (voices.length === 0) {
                const opt = document.createElement('option');
                opt.textContent = 'Default browser voice';
                opt.value = '';
                sel.appendChild(opt);
                return;
            }
            voices.forEach((v, i) => {
                const opt = document.createElement('option');
                opt.value = i; opt.textContent = v.name + ' (' + v.lang + ')';
                sel.appendChild(opt);
            });
        }
        if (typeof synth.addEventListener === 'function') {
            synth.addEventListener('voiceschanged', loadVoices);
        } else if ('onvoiceschanged' in synth) {
            const prev = synth.onvoiceschanged;
            synth.onvoiceschanged = function(event) {
                if (typeof prev === 'function') prev.call(this, event);
                loadVoices();
            };
        }
        loadVoices();

        if (speakBtn) speakBtn.addEventListener('click', () => {
            synth.cancel();
            const text = document.getElementById(inputId).value;
            if (!text) return;
            const utter = new SpeechSynthesisUtterance(text);
            if (sel && voices[sel.value]) utter.voice = voices[sel.value];
            const rate = document.getElementById(rateId);
            if (rate) utter.rate = parseFloat(rate.value);
            synth.speak(utter);
        });
        if (stopBtn) stopBtn.addEventListener('click', () => synth.cancel());
    }

    setupTTS('tts-text-area', 'tts-voice-select', 'tts-rate', 'tts-speak-btn', 'tts-stop-btn');
    setupTTS('tts-input', 'tts-voice-select2', 'tts-rate2', 'tts-speak2', 'tts-stop2');

    function resetTextToSpeechUi() {
        const synth = window.speechSynthesis;
        if (synth && typeof synth.cancel === 'function') synth.cancel();
        resetTtsControls('tts-text-area', 'tts-voice-select', 'tts-rate');
        resetTtsControls('tts-input', 'tts-voice-select2', 'tts-rate2');
    }

    const ttsModal = document.getElementById('modal-tts');
    if (ttsModal) {
        new MutationObserver(() => {
            if (ttsModal.classList.contains('hidden')) {
                resetTextToSpeechUi();
            }
        }).observe(ttsModal, { attributes: true, attributeFilter: ['class'] });
    }

    const mediaModal = document.getElementById('modal-media');
    if (mediaModal) {
        new MutationObserver(() => {
            if (mediaModal.classList.contains('hidden')) {
                const synth = window.speechSynthesis;
                if (synth && typeof synth.cancel === 'function') synth.cancel();
                resetTtsControls('tts-text-area', 'tts-voice-select', 'tts-rate');
                resetMediaModalState();
            }
        }).observe(mediaModal, { attributes: true, attributeFilter: ['class'] });
    }

    // ===================== TOOLS PANEL =====================
    const toolsData = {
        classroom: [
            { icon: '🚦', name: 'Traffic Light', action: () => App.openModal('modal-traffic') },
            { icon: '🎤', name: 'Sound Meter', action: () => App.openModal('modal-sound') },
            { icon: '⏱️', name: 'Timer', action: () => App.openModal('modal-timer') },
            { icon: '🙋', name: 'Name Picker', action: () => App.openModal('modal-namepick') },
            { icon: '📋', name: 'Attendance', action: () => App.openModal('modal-attendance') },
            { icon: '👥', name: 'Group Maker', action: () => openRandomizerTab('group') },
        ],
        randomizers: [
            { icon: '🙋', name: 'Student Picker', action: () => App.openModal('modal-namepick') },
            { icon: '👥', name: 'Group Maker', action: () => openRandomizerTab('group') },
            { icon: '🎡', name: 'Spin Wheel', action: () => openRandomizerTab('wheel') },
        ],
        lessons: [
            { icon: '📝', name: 'QR Code', action: () => App.openModal('modal-qr') },
            { icon: '🔊', name: 'Text-to-Speech', action: () => App.openModal('modal-tts') },
            { icon: '🎬', name: 'Video Player', action: () => { App.openModal('modal-media'); document.querySelector('[data-tab="media-videos"]')?.click(); }},
            { icon: '🖼️', name: 'Image Search', action: () => { App.openModal('modal-media'); document.querySelector('[data-tab="media-images"]')?.click(); }},
        ],
        games: [
            { icon: '🎡', name: 'Spin Wheel', action: () => openRandomizerTab('wheel') },
            { icon: '🃏', name: 'Flash Cards', action: () => App.openModal('modal-flashcards') },
        ],
        charts: [
            { icon: '📊', name: 'Bar Chart', action: () => {
                chartType = 'bar';
                document.querySelectorAll('.chart-type-btn').forEach(b => b.classList.toggle('active', b.dataset.type === 'bar'));
                App.openModal('modal-charts');
            }},
            { icon: '📈', name: 'Line Graph', action: () => {
                chartType = 'line';
                document.querySelectorAll('.chart-type-btn').forEach(b => b.classList.toggle('active', b.dataset.type === 'line'));
                App.openModal('modal-charts');
            }},
        ],
        math: [
            { icon: '📏', name: 'Ruler', action: () => {
                const r = document.getElementById('ruler-tool');
                r.classList.toggle('hidden');
                if (!r.classList.contains('hidden')) { r.style.left = '100px'; r.style.top = '100px'; }
            }},
            { icon: '🧮', name: 'Calculator', action: () => App.openModal('modal-calculator') },
            { icon: '🔢', name: 'Ten Frame', action: () => App.openModal('modal-tenframe') },
            { icon: '🌡️', name: 'Thermometer', action: () => App.openModal('modal-thermometer') },
        ],
        clocks: [
            { icon: '🕐', name: 'Analog Clock', action: () => App.openModal('modal-clock') },
            { icon: '⏱️', name: 'Stopwatch', action: () => App.openModal('modal-stopwatch') },
            { icon: '⏳', name: 'Countdown Timer', action: () => App.openModal('modal-timer') },
        ],
        money: [
            { icon: '🪙', name: 'Coin Mat', action: () => App.openModal('modal-money') },
            { icon: '🛒', name: 'Shopping Cart', action: () => App.openModal('modal-shopping') },
        ],
    };

    // ===================== CANVAS WIDGET SYSTEM =====================
    let canvasWidgetZ = 80;

    const CANVAS_WIDGET_DEFS = {
        'Traffic Light': {
            icon: '🚦', headerBg: '#1a1a1a', headerColor: '#fff', width: 140,
            render(body) {
                body.innerHTML = `<div class="cwid-traffic">
                    <div class="cwid-tl red active" data-tl="red"></div>
                    <div class="cwid-tl yellow" data-tl="yellow"></div>
                    <div class="cwid-tl green" data-tl="green"></div>
                </div><div style="font-size:0.72rem;text-align:center;color:#888;margin-top:6px;" id="tl-wlabel">🔴 Stop / Quiet</div>`;
                const labels = { red: '🔴 Stop / Quiet', yellow: '🟡 Whisper', green: '🟢 Talk Freely' };
                body.querySelectorAll('.cwid-tl').forEach(light => {
                    light.addEventListener('click', () => {
                        body.querySelectorAll('.cwid-tl').forEach(l => l.classList.remove('active'));
                        light.classList.add('active');
                        body.querySelector('#tl-wlabel').textContent = labels[light.dataset.tl];
                    });
                });
            }
        },
        'Timer': {
            icon: '⏱️', headerBg: '#1a2332', headerColor: '#fff', width: 200,
            render(body, el) {
                let timerTotal = 300;
                let timerSeconds = 300;
                let timerEndsAt = null;
                let timerRunning = false;
                let timerInterval = null;
                body.innerHTML = `<div class="cwid-timer-ring" data-role="ring">
                        <div class="cwid-timer-ring-inner">
                            <div class="cwid-timer-display" data-role="display">05:00</div>
                            <div class="cwid-timer-status" data-role="status">Ready</div>
                        </div>
                    </div>
                    <div class="cwid-timer-btns">
                        <button class="cwid-preset" data-s="60">1m</button>
                        <button class="cwid-preset" data-s="180">3m</button>
                        <button class="cwid-preset" data-s="300">5m</button>
                        <button class="cwid-preset" data-s="600">10m</button>
                    </div>
                    <div class="cwid-timer-btns" style="margin-top:4px;">
                        <button class="cwid-ctrl" id="cwt-play">▶</button>
                        <button class="cwid-ctrl" id="cwt-pause">⏸</button>
                        <button class="cwid-ctrl" id="cwt-reset">↺</button>
                    </div>`;
                const disp = body.querySelector('[data-role="display"]');
                const status = body.querySelector('[data-role="status"]');
                const ring = body.querySelector('[data-role="ring"]');
                const fmt = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
                const persistWidgetState = () => {
                    el._cwState = {
                        timerTotal,
                        timerSeconds,
                        timerRunning,
                        timerEndsAt,
                    };
                };
                const clearTick = () => {
                    if (!timerInterval) return;
                    clearInterval(timerInterval);
                    timerInterval = null;
                };
                const syncFromClock = () => {
                    if (!timerRunning || !timerEndsAt) return;
                    timerSeconds = Math.max(0, Math.ceil((timerEndsAt - Date.now()) / 1000));
                    if (timerSeconds <= 0) {
                        timerSeconds = 0;
                        timerRunning = false;
                        timerEndsAt = null;
                        clearTick();
                    }
                };
                const renderTimer = () => {
                    syncFromClock();
                    disp.textContent = fmt(timerSeconds);
                    disp.classList.remove('running', 'done');
                    const pct = timerTotal > 0 ? (timerSeconds / timerTotal) * 100 : 0;
                    ring?.style.setProperty('--timer-progress', `${Math.max(0, Math.min(100, pct))}%`);
                    if (timerSeconds <= 0) {
                        disp.classList.add('done');
                        if (status) status.textContent = `Time's up`;
                    } else if (timerRunning) {
                        disp.classList.add('running');
                        if (status) status.textContent = `${Math.max(0, Math.round(pct))}% left`;
                    } else if (timerSeconds === timerTotal) {
                        if (status) status.textContent = 'Ready';
                    } else {
                        if (status) status.textContent = 'Paused';
                    }
                    persistWidgetState();
                };
                const startTick = () => {
                    if (timerInterval) return;
                    timerInterval = setInterval(() => {
                        const before = timerSeconds;
                        renderTimer();
                        if (!timerRunning || !timerEndsAt || timerSeconds <= 0) clearTick();
                        if (before !== timerSeconds) persistWidgetState();
                    }, 250);
                };
                const setDuration = seconds => {
                    clearTick();
                    timerRunning = false;
                    timerEndsAt = null;
                    timerTotal = timerSeconds = seconds;
                    renderTimer();
                    schedulePagePersist();
                };
                body.querySelectorAll('.cwid-preset').forEach(btn => {
                    btn.addEventListener('click', () => {
                        setDuration(parseInt(btn.dataset.s, 10));
                    });
                });
                body.querySelector('#cwt-play').addEventListener('click', () => {
                    if (timerRunning || timerSeconds <= 0) return;
                    timerRunning = true;
                    timerEndsAt = Date.now() + timerSeconds * 1000;
                    startTick();
                    renderTimer();
                    schedulePagePersist();
                });
                body.querySelector('#cwt-pause').addEventListener('click', () => {
                    if (timerRunning && timerEndsAt) {
                        timerSeconds = Math.max(0, Math.ceil((timerEndsAt - Date.now()) / 1000));
                    }
                    clearTick();
                    timerRunning = false;
                    timerEndsAt = null;
                    renderTimer();
                    schedulePagePersist();
                });
                body.querySelector('#cwt-reset').addEventListener('click', () => {
                    clearTick();
                    timerRunning = false;
                    timerEndsAt = null;
                    timerSeconds = timerTotal;
                    renderTimer();
                    schedulePagePersist();
                });
                el._cwApplyState = state => {
                    if (!state || typeof state !== 'object') return;
                    timerTotal = typeof state.timerTotal === 'number' ? state.timerTotal : timerTotal;
                    timerSeconds = typeof state.timerSeconds === 'number' ? state.timerSeconds : timerSeconds;
                    timerRunning = !!state.timerRunning;
                    timerEndsAt = typeof state.timerEndsAt === 'number' ? state.timerEndsAt : null;
                    if (timerRunning && timerEndsAt) {
                        syncFromClock();
                        if (timerRunning && timerSeconds > 0) startTick();
                    }
                    renderTimer();
                };
                el._cwCleanup = () => clearTick();
                renderTimer();
            }
        },
        'Stopwatch': {
            icon: '⏱️', headerBg: '#2e7d6b', headerColor: '#fff', width: 190,
            render(body, el) {
                let ms = 0, iv = null, running = false, startedAt = null;
                body.innerHTML = `<div class="cwid-sw-display" id="cwsw">00:00.00</div>
                    <div class="cwid-timer-btns" style="margin-top:6px;">
                        <button class="cwid-ctrl" id="cwsw-start">▶</button>
                        <button class="cwid-ctrl" id="cwsw-stop">⏸</button>
                        <button class="cwid-ctrl" id="cwsw-reset">↺</button>
                    </div>`;
                const disp = body.querySelector('#cwsw');
                const fmt = () => { const t=ms; const m=Math.floor(t/60000); const s=Math.floor((t%60000)/1000); const cs=Math.floor((t%1000)/10); return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(cs).padStart(2,'0')}`; };
                const persistWidgetState = () => {
                    el._cwState = { ms, running, startedAt };
                };
                const clearTick = () => {
                    if (!iv) return;
                    clearInterval(iv);
                    iv = null;
                };
                const syncFromClock = () => {
                    if (!running || typeof startedAt !== 'number') return;
                    ms = Math.max(0, Date.now() - startedAt);
                };
                const renderStopwatch = () => {
                    syncFromClock();
                    disp.textContent = fmt();
                    persistWidgetState();
                };
                const startTick = () => {
                    if (iv) return;
                    if (typeof startedAt !== 'number') startedAt = Date.now() - ms;
                    iv = setInterval(() => {
                        ms = Date.now() - startedAt;
                        renderStopwatch();
                    }, 50);
                };
                body.querySelector('#cwsw-start').addEventListener('click', () => {
                    if (running) return;
                    running = true;
                    startedAt = Date.now() - ms;
                    startTick();
                    persistWidgetState();
                    schedulePagePersist();
                });
                body.querySelector('#cwsw-stop').addEventListener('click', () => {
                    syncFromClock();
                    clearTick();
                    running = false;
                    startedAt = null;
                    persistWidgetState();
                    renderStopwatch();
                    schedulePagePersist();
                });
                body.querySelector('#cwsw-reset').addEventListener('click', () => {
                    clearTick();
                    running = false;
                    startedAt = null;
                    ms = 0;
                    renderStopwatch();
                    schedulePagePersist();
                });
                el._cwApplyState = state => {
                    if (!state || typeof state !== 'object') return;
                    ms = typeof state.ms === 'number' ? state.ms : 0;
                    running = !!state.running;
                    startedAt = typeof state.startedAt === 'number' ? state.startedAt : (running ? Date.now() - ms : null);
                    renderStopwatch();
                    if (running) startTick();
                };
                renderStopwatch();
                el._cwCleanup = () => clearTick();
            }
        },
        'Clock': {
            icon: '🕐', headerBg: '#1a2332', headerColor: '#fff', width: 180,
            render(body, el) {
                body.innerHTML = `<div class="cwid-clock-time" id="cwclock-t"></div><div class="cwid-clock-date" id="cwclock-d"></div>`;
                const tick = () => {
                    const n = new Date();
                    const t = body.querySelector('#cwclock-t'), d = body.querySelector('#cwclock-d');
                    if(t) t.textContent = n.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:true});
                    if(d) d.textContent = n.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
                };
                tick(); const iv = setInterval(tick, 1000);
                el._cwCleanup = () => clearInterval(iv);
            }
        },
        'Name Picker': {
            icon: '🙋', headerBg: '#6366f1', headerColor: '#fff', width: 200,
            render(body, el) {
                body.innerHTML = `<div class="cwid-name-result" id="cwnp-result">?</div>
                    <button class="primary-action-btn big" id="cwnp-btn" style="font-size:0.82rem;padding:8px 12px;"><i class="fa-solid fa-shuffle"></i> Pick</button>
                    <div style="font-size:0.7rem;color:#999;text-align:center;" id="cwnp-hist"></div>`;
                const names = getStudentNames();
                let used = [];
                let picked = '?';
                const result = body.querySelector('#cwnp-result');
                const history = body.querySelector('#cwnp-hist');
                const renderNamePicker = () => {
                    result.textContent = picked;
                    history.textContent = used.length ? `${used.length} / ${names.length} picked` : '';
                    el._cwState = {
                        used: [...used],
                        picked,
                    };
                };
                body.querySelector('#cwnp-btn').addEventListener('click', () => {
                    if (used.length >= names.length) used = [];
                    const remaining = names.filter(n => !used.includes(n));
                    picked = remaining[Math.floor(Math.random()*remaining.length)];
                    used.push(picked);
                    renderNamePicker();
                    schedulePagePersist();
                });
                el._cwApplyState = state => {
                    if (!state || typeof state !== 'object') return;
                    used = Array.isArray(state.used) ? state.used.filter(name => names.includes(name)) : [];
                    picked = typeof state.picked === 'string' ? state.picked : '?';
                    renderNamePicker();
                };
                renderNamePicker();
            }
        },
        'Spin Wheel': {
            icon: '🎡', headerBg: '#7c3aed', headerColor: '#fff', width: 260,
            render(body, el) {
                let wheelAngle = 0;
                let wheelSpinning = false;
                let wheelSpinToken = 0;
                let animationFrame = null;
                let resultText = '';
                body.innerHTML = `<canvas width="240" height="240" style="display:block;margin:0 auto;max-width:100%;"></canvas>
                    <button class="primary-action-btn big" style="font-size:0.82rem;padding:8px 12px;margin-top:10px;"><i class="fa-solid fa-rotate"></i> Spin!</button>
                    <div style="min-height:28px;margin-top:8px;text-align:center;font-size:0.95rem;font-weight:700;color:var(--accent);" data-role="result"></div>`;
                const canvas = body.querySelector('canvas');
                const wheelCtx = canvas?.getContext('2d');
                const resultEl = body.querySelector('[data-role="result"]');
                const button = body.querySelector('button');
                const wheelColors = [
                    App.getVar('--wheel-1', '#6366f1'), App.getVar('--wheel-2', '#a855f7'), App.getVar('--wheel-3', '#ec4899'),
                    App.getVar('--wheel-4', '#f59e0b'), App.getVar('--wheel-5', '#10b981'), App.getVar('--wheel-6', '#3b82f6'),
                    App.getVar('--wheel-7', '#ef4444'), App.getVar('--wheel-8', '#8b5cf6'), App.getVar('--wheel-9', '#14b8a6'),
                    App.getVar('--wheel-10', '#f97316'), App.getVar('--wheel-11', '#06b6d4'), App.getVar('--wheel-12', '#84cc16')
                ];
                const persistState = () => {
                    el._cwState = { wheelAngle, resultText };
                };
                const drawWheelWidget = () => {
                    if (!wheelCtx) return;
                    const names = getStudentNames();
                    const cx = 120, cy = 120, radius = 104;
                    wheelCtx.clearRect(0, 0, 240, 240);
                    if (!names.length) return;
                    const arc = (2 * Math.PI) / names.length;
                    names.forEach((name, index) => {
                        const start = wheelAngle + index * arc;
                        wheelCtx.beginPath();
                        wheelCtx.moveTo(cx, cy);
                        wheelCtx.arc(cx, cy, radius, start, start + arc);
                        wheelCtx.closePath();
                        wheelCtx.fillStyle = wheelColors[index % wheelColors.length];
                        wheelCtx.fill();
                        wheelCtx.strokeStyle = App.getVar('--white', '#fff');
                        wheelCtx.lineWidth = 2;
                        wheelCtx.stroke();
                        wheelCtx.save();
                        wheelCtx.translate(cx, cy);
                        wheelCtx.rotate(start + arc / 2);
                        wheelCtx.fillStyle = App.getVar('--white', '#fff');
                        wheelCtx.font = '600 10px Inter';
                        wheelCtx.textAlign = 'right';
                        wheelCtx.fillText(name, radius - 10, 4);
                        wheelCtx.restore();
                    });
                    wheelCtx.beginPath();
                    wheelCtx.arc(cx, cy, 16, 0, Math.PI * 2);
                    wheelCtx.fillStyle = App.getVar('--white', '#fff');
                    wheelCtx.fill();
                    wheelCtx.strokeStyle = App.getVar('--grey-300', '#ddd');
                    wheelCtx.stroke();
                    wheelCtx.beginPath();
                    wheelCtx.moveTo(cx, 2);
                    wheelCtx.lineTo(cx - 10, 20);
                    wheelCtx.lineTo(cx + 10, 20);
                    wheelCtx.closePath();
                    wheelCtx.fillStyle = App.getVar('--text-main', '#333');
                    wheelCtx.fill();
                    if (resultEl) resultEl.textContent = resultText;
                    persistState();
                };
                const stopAnimation = () => {
                    if (animationFrame) cancelAnimationFrame(animationFrame);
                    animationFrame = null;
                };
                button?.addEventListener('click', () => {
                    if (wheelSpinning) return;
                    wheelSpinning = true;
                    resultText = 'Spinning...';
                    drawWheelWidget();
                    const currentSpinToken = ++wheelSpinToken;
                    let speed = 0.2 + Math.random() * 0.15;
                    const decel = 0.997;
                    const animate = () => {
                        if (currentSpinToken !== wheelSpinToken) {
                            wheelSpinning = false;
                            stopAnimation();
                            drawWheelWidget();
                            return;
                        }
                        wheelAngle += speed;
                        speed *= decel;
                        drawWheelWidget();
                        if (speed > 0.0025) {
                            animationFrame = requestAnimationFrame(animate);
                            return;
                        }
                        wheelSpinning = false;
                        stopAnimation();
                        const names = getStudentNames();
                        const arc = (2 * Math.PI) / names.length;
                        const pointerAngle = (2 * Math.PI) - (wheelAngle % (2 * Math.PI));
                        const winnerIndex = Math.floor(pointerAngle / arc) % names.length;
                        resultText = `🎉 ${names[winnerIndex]}!`;
                        drawWheelWidget();
                        schedulePagePersist();
                    };
                    animationFrame = requestAnimationFrame(animate);
                });
                el._cwApplyState = state => {
                    wheelAngle = typeof state?.wheelAngle === 'number' ? state.wheelAngle : 0;
                    resultText = typeof state?.resultText === 'string' ? state.resultText : '';
                    drawWheelWidget();
                };
                el._cwCleanup = () => {
                    wheelSpinToken++;
                    wheelSpinning = false;
                    stopAnimation();
                };
                drawWheelWidget();
            }
        },
        'Group Maker': {
            icon: '👥', headerBg: '#2563eb', headerColor: '#fff', width: 280,
            render(body, el) {
                let groupCount = 4;
                let groups = [];
                const colors = [
                    App.getVar('--wheel-1', '#6366f1'), App.getVar('--wheel-2', '#a855f7'), App.getVar('--wheel-3', '#ec4899'),
                    App.getVar('--wheel-4', '#f59e0b'), App.getVar('--wheel-5', '#10b981'), App.getVar('--wheel-6', '#3b82f6'),
                    App.getVar('--wheel-7', '#ef4444'), App.getVar('--wheel-8', '#8b5cf6'), App.getVar('--wheel-9', '#14b8a6'),
                    App.getVar('--wheel-10', '#f97316')
                ];
                body.innerHTML = `<div class="modal-row center" style="gap:8px;flex-wrap:wrap;justify-content:center;">
                        <label for="cw-group-count" style="font-size:0.8rem;font-weight:600;">Groups:</label>
                        <input type="number" id="cw-group-count" value="4" min="2" max="10" class="field-input w-70" style="width:72px;">
                        <button class="primary-action-btn" data-role="make" style="font-size:0.8rem;padding:8px 12px;">Make Groups</button>
                    </div>
                    <div class="groups-output" data-role="output" style="margin-top:10px;"></div>`;
                const countInput = body.querySelector('#cw-group-count');
                const output = body.querySelector('[data-role="output"]');
                const syncState = () => {
                    el._cwState = { groupCount, groups: groups.map(group => [...group]) };
                };
                const renderGroups = () => {
                    if (!output) return;
                    output.innerHTML = '';
                    groups.forEach((group, index) => {
                        const color = colors[index % colors.length];
                        const box = document.createElement('div');
                        box.className = 'group-box';
                        box.style.borderLeft = `4px solid ${color}`;
                        const title = document.createElement('div');
                        title.className = 'group-title';
                        title.style.color = color;
                        title.textContent = `Group ${index + 1}`;
                        box.appendChild(title);
                        group.forEach(member => {
                            const memberEl = document.createElement('div');
                            memberEl.className = 'group-member';
                            memberEl.textContent = member;
                            box.appendChild(memberEl);
                        });
                        output.appendChild(box);
                    });
                    syncState();
                };
                body.querySelector('[data-role="make"]')?.addEventListener('click', () => {
                    groupCount = Math.min(10, Math.max(2, parseInt(countInput?.value || '4', 10) || 4));
                    if (countInput) countInput.value = String(groupCount);
                    const shuffled = [...getStudentNames()].sort(() => Math.random() - 0.5);
                    groups = Array.from({ length: groupCount }, () => []);
                    shuffled.forEach((student, index) => groups[index % groupCount].push(student));
                    renderGroups();
                    schedulePagePersist();
                });
                countInput?.addEventListener('change', () => {
                    groupCount = Math.min(10, Math.max(2, parseInt(countInput.value || '4', 10) || 4));
                    countInput.value = String(groupCount);
                    syncState();
                    schedulePagePersist();
                });
                el._cwApplyState = state => {
                    groupCount = Math.min(10, Math.max(2, parseInt(state?.groupCount, 10) || 4));
                    groups = Array.isArray(state?.groups) ? state.groups.map(group => Array.isArray(group) ? group.filter(member => typeof member === 'string') : []) : [];
                    if (countInput) countInput.value = String(groupCount);
                    renderGroups();
                };
                syncState();
            }
        },
        'Sound Meter': {
            icon: '🎤', headerBg: '#7c3aed', headerColor: '#fff', width: 180,
            render(body, el) {
                body.innerHTML = `<div class="cwid-sound-bars" id="cwsb">${Array(8).fill('<div class="sb" style="height:4px"></div>').join('')}</div>
                    <div class="cwid-sound-label" id="cwsl">Tap Start</div>
                    <div class="cwid-timer-btns"><button class="cwid-ctrl" id="cwsound-start">🎙</button><button class="cwid-ctrl" id="cwsound-stop">⏹</button></div>`;
                let stream = null, analyser = null, raf = null, audioCtx = null, starting = false;
                const bars = body.querySelectorAll('.sb');
                const labels = ['🤫 Silence','🤫 Very Quiet','🗣 Quiet','💬 Low','💬 Medium','📢 Loud','📢 Very Loud','🔊 Too Loud!'];
                const stopMeter = () => {
                    starting = false;
                    cancelAnimationFrame(raf);
                    raf = null;
                    if (stream) stream.getTracks().forEach(t => t.stop());
                    stream = null;
                    analyser = null;
                    if (audioCtx && typeof audioCtx.close === 'function') audioCtx.close();
                    audioCtx = null;
                    bars.forEach(b => { b.style.height = '4px'; b.style.background = ''; });
                };
                const draw = () => {
                    if (!analyser) return;
                    const data = new Uint8Array(analyser.frequencyBinCount);
                    analyser.getByteFrequencyData(data);
                    const avg = data.reduce((a,b)=>a+b,0)/data.length;
                    const level = Math.min(7, Math.floor(avg/8));
                    bars.forEach((b,i) => { b.style.height = (4 + (i<=level ? (i+1)*6 : 4))+'px'; b.style.background = level>=6?'#ef4444':level>=4?'#f59e0b':'#22c55e'; });
                    body.querySelector('#cwsl').textContent = labels[level];
                    raf = requestAnimationFrame(draw);
                };
                body.querySelector('#cwsound-start').addEventListener('click', () => {
                    if (starting || stream) return;
                    starting = true;
                    navigator.mediaDevices.getUserMedia({audio:true}).then(s => {
                        stopMeter();
                        stream = s;
                        audioCtx = new AudioContext();
                        analyser = audioCtx.createAnalyser();
                        audioCtx.createMediaStreamSource(s).connect(analyser);
                        starting = false;
                        draw();
                    }).catch(() => {
                        starting = false;
                        body.querySelector('#cwsl').textContent = 'Mic denied';
                    });
                });
                body.querySelector('#cwsound-stop').addEventListener('click', () => {
                    stopMeter();
                    body.querySelector('#cwsl').textContent='Stopped';
                });
                el._cwCleanup = () => stopMeter();
            }
        },
        'QR Code': {
            icon: '📝', headerBg: '#0f766e', headerColor: '#fff', width: 220,
            render(body, el) {
                body.innerHTML = `<input type="text" id="cwqr-input" placeholder="Enter URL or text..." style="width:100%;box-sizing:border-box;padding:7px 10px;border:1.5px solid #e0e0e0;border-radius:8px;font-family:inherit;font-size:0.82rem;outline:none;">
                    <button class="primary-action-btn" id="cwqr-btn" style="font-size:0.82rem;padding:7px;">Generate</button>
                    <div class="cwid-qr-output" id="cwqr-out"></div>`;
                const input = body.querySelector('#cwqr-input');
                const output = body.querySelector('#cwqr-out');
                const renderQrCode = () => {
                    const val = input.value.trim();
                    if (!val) return;
                    output.innerHTML = '';
                    if (typeof QRCode !== 'undefined') new QRCode(output, {text: val, width: 140, height: 140});
                    else output.textContent = 'QR library not loaded';
                    el._cwState = { text: val };
                };
                body.querySelector('#cwqr-btn').addEventListener('click', renderQrCode);
                input.addEventListener('input', () => {
                    el._cwState = { text: input.value };
                });
                el._cwApplyState = state => {
                    if (!state || typeof state.text !== 'string') return;
                    input.value = state.text;
                    if (state.text.trim()) renderQrCode();
                };
            }
        },
        'Attendance': {
            icon: '📋', headerBg: '#b45309', headerColor: '#fff', width: 260,
            render(body, el) {
                const names = getStudentNames();
                const state = {};
                names.forEach(n => state[n] = 'none');
                const syncState = () => {
                    el._cwState = {
                        attendance: { ...state }
                    };
                };
                const render = () => {
                    body.innerHTML = '';
                    const list = document.createElement('div');
                    list.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;max-height:200px;overflow-y:auto;';
                    names.forEach(name => {
                        const status = state[name];
                        const btn = document.createElement('button');
                        btn.dataset.n = name;
                        btn.style.cssText = 'font-size:0.72rem;padding:3px 8px;border-radius:6px;border:1.5px solid;cursor:pointer;font-family:inherit;';
                        if (status === 'present') {
                            btn.style.background = '#dcfce7';
                            btn.style.borderColor = '#22c55e';
                            btn.style.color = '#15803d';
                        } else if (status === 'absent') {
                            btn.style.background = '#fee2e2';
                            btn.style.borderColor = '#ef4444';
                            btn.style.color = '#b91c1c';
                        } else if (status === 'late') {
                            btn.style.background = '#fef9c3';
                            btn.style.borderColor = '#f59e0b';
                            btn.style.color = '#92400e';
                        } else {
                            btn.style.background = '#fff';
                            btn.style.borderColor = '#d1d5db';
                            btn.style.color = '#6b7280';
                        }
                        btn.textContent = name;
                        btn.addEventListener('click', () => {
                            const cycle = { none: 'present', present: 'absent', absent: 'late', late: 'none' };
                            state[name] = cycle[state[name]];
                            syncState();
                            render();
                        });
                        list.appendChild(btn);
                    });
                    const hint = document.createElement('div');
                    hint.style.cssText = 'font-size:0.72rem;color:#888;margin-top:6px;text-align:center;';
                    hint.textContent = 'Click to cycle: none → present → absent → late';
                    body.append(list, hint);
                };
                el._cwApplyState = savedState => {
                    const attendance = savedState && typeof savedState.attendance === 'object' ? savedState.attendance : null;
                    if (!attendance) return;
                    names.forEach(name => {
                        const saved = attendance[name];
                        state[name] = (saved === 'none' || saved === 'absent' || saved === 'late' || saved === 'present') ? saved : 'none';
                    });
                    syncState();
                    render();
                };
                syncState();
                render();
            }
        },
        'Text Box': {
            icon: '📝', width: 220,
            render(body, el) {
                body.innerHTML = `<textarea placeholder="Type here..." style="width:100%;box-sizing:border-box;height:100px;border:none;outline:none;resize:both;font-family:inherit;font-size:1rem;background:transparent;color:inherit;"></textarea>`;
                const textarea = body.querySelector('textarea');
                const syncState = () => {
                    el._cwState = {
                        text: textarea.value || '',
                        width: textarea.style.width || '',
                        height: textarea.style.height || '',
                    };
                };
                const persistTextBoxState = () => {
                    syncState();
                    schedulePagePersist();
                };
                textarea.addEventListener('input', persistTextBoxState);
                textarea.addEventListener('mouseup', persistTextBoxState);
                textarea.addEventListener('touchend', persistTextBoxState);
                el._cwApplyState = state => {
                    if (!state || typeof state !== 'object') return;
                    textarea.value = typeof state.text === 'string' ? state.text : '';
                    textarea.style.width = typeof state.width === 'string' ? state.width : '';
                    textarea.style.height = typeof state.height === 'string' ? state.height : '';
                    syncState();
                };
                syncState();
            }
        },
        'Calculator': {
            icon: '🧮', headerBg: '#0f172a', headerColor: '#fff', width: 240,
            render(body, el) {
                let expression = '';
                body.innerHTML = `<div class="calc-display" style="margin-bottom:10px;background:var(--wb-sidebar-bg-alt);border-radius:12px;padding:10px 12px;text-align:right;">
                        <div class="calc-expr" data-role="expr"></div>
                        <div class="money-total" data-role="result" style="font-size:1.5rem;word-break:break-all;">0</div>
                    </div>
                    <div class="calc-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;">
                        <button class="calc-btn clear" data-calc="C">C</button>
                        <button class="calc-btn op" data-calc="(">(</button>
                        <button class="calc-btn op" data-calc=")">)</button>
                        <button class="calc-btn op" data-calc="÷">÷</button>
                        <button class="calc-btn num" data-calc="7">7</button>
                        <button class="calc-btn num" data-calc="8">8</button>
                        <button class="calc-btn num" data-calc="9">9</button>
                        <button class="calc-btn op" data-calc="×">×</button>
                        <button class="calc-btn num" data-calc="4">4</button>
                        <button class="calc-btn num" data-calc="5">5</button>
                        <button class="calc-btn num" data-calc="6">6</button>
                        <button class="calc-btn op" data-calc="−">−</button>
                        <button class="calc-btn num" data-calc="1">1</button>
                        <button class="calc-btn num" data-calc="2">2</button>
                        <button class="calc-btn num" data-calc="3">3</button>
                        <button class="calc-btn op" data-calc="+">+</button>
                        <button class="calc-btn num wide" data-calc="0">0</button>
                        <button class="calc-btn num" data-calc=".">.</button>
                        <button class="calc-btn equals" data-calc="=">=</button>
                    </div>`;
                const exprEl = body.querySelector('[data-role="expr"]');
                const resultEl = body.querySelector('[data-role="result"]');
                const renderCalculator = () => {
                    if (exprEl) exprEl.textContent = expression && expression !== 'Error' ? expression : '';
                    if (resultEl) resultEl.textContent = expression || '0';
                    el._cwState = { expression };
                };
                body.querySelectorAll('[data-calc]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const value = btn.getAttribute('data-calc');
                        if (value === 'C') {
                            expression = '';
                            renderCalculator();
                            schedulePagePersist();
                            return;
                        }
                        if (value === '=') {
                            try {
                                const normalized = expression.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
                                const result = Function('"use strict";return (' + normalized + ')')();
                                expression = Number.isFinite(result) ? String(parseFloat(result.toFixed(8))) : 'Error';
                            } catch {
                                expression = 'Error';
                            }
                            renderCalculator();
                            schedulePagePersist();
                            return;
                        }
                        expression = expression === 'Error' ? value : expression + value;
                        renderCalculator();
                        schedulePagePersist();
                    });
                });
                el._cwApplyState = state => {
                    expression = state && typeof state.expression === 'string' ? state.expression : '';
                    renderCalculator();
                };
                renderCalculator();
            }
        },
        'Ten Frame': {
            icon: '🔢', headerBg: '#1f2937', headerColor: '#fff', width: 320,
            render(body, el) {
                let selectedColor = 'red';
                let cells = Array(10).fill('');
                body.innerHTML = `<div class="ten-frame-grid" style="width:100%;height:130px;">
                        ${Array.from({ length: 10 }, (_, idx) => `<div class="tf-cell" data-idx="${idx}"></div>`).join('')}
                    </div>
                    <div class="tf-controls" style="justify-content:center;margin-top:10px;">
                        <button class="tf-color-btn active" data-color="red" style="background:#ef4444;" aria-label="Red"></button>
                        <button class="tf-color-btn" data-color="blue" style="background:#3b82f6;" aria-label="Blue"></button>
                        <button class="tf-color-btn" data-color="yellow" style="background:#f59e0b;" aria-label="Yellow"></button>
                        <button class="primary-action-btn" data-role="clear" style="font-size:0.78rem;padding:7px 10px;">Clear</button>
                    </div>
                    <div class="tf-total" style="text-align:center;margin-top:8px;">Total: <span class="money-total" data-role="count">0</span></div>`;
                const countEl = body.querySelector('[data-role="count"]');
                const renderTenFrame = () => {
                    body.querySelectorAll('.tf-cell').forEach((cell, index) => {
                        const color = cells[index];
                        cell.classList.toggle('active', !!color);
                        cell.innerHTML = color ? `<div class="dot" style="background:${color};transform:scale(1);"></div>` : '';
                    });
                    if (countEl) countEl.textContent = String(cells.filter(Boolean).length);
                    el._cwState = { cells: [...cells], selectedColor };
                };
                body.querySelectorAll('.tf-color-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        body.querySelectorAll('.tf-color-btn').forEach(colorBtn => colorBtn.classList.remove('active'));
                        btn.classList.add('active');
                        selectedColor = btn.dataset.color || 'red';
                        el._cwState = { cells: [...cells], selectedColor };
                        schedulePagePersist();
                    });
                });
                body.querySelectorAll('.tf-cell').forEach(cell => {
                    cell.addEventListener('click', () => {
                        const index = parseInt(cell.dataset.idx || '0', 10);
                        cells[index] = cells[index] ? '' : selectedColor;
                        renderTenFrame();
                        schedulePagePersist();
                    });
                });
                body.querySelector('[data-role="clear"]')?.addEventListener('click', () => {
                    cells = Array(10).fill('');
                    renderTenFrame();
                    schedulePagePersist();
                });
                el._cwApplyState = state => {
                    cells = Array.isArray(state?.cells) ? state.cells.slice(0, 10).map(color => typeof color === 'string' ? color : '') : Array(10).fill('');
                    while (cells.length < 10) cells.push('');
                    selectedColor = typeof state?.selectedColor === 'string' ? state.selectedColor : 'red';
                    body.querySelectorAll('.tf-color-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.color === selectedColor));
                    renderTenFrame();
                };
                renderTenFrame();
            }
        },
        'Thermometer': {
            icon: '🌡️', headerBg: '#991b1b', headerColor: '#fff', width: 240,
            render(body, el) {
                let value = 20;
                let unit = 'C';
                body.innerHTML = `<div class="therm-body" style="padding:0;gap:16px;align-items:flex-end;">
                        <div class="therm-visual" style="width:34px;height:220px;">
                            <div class="therm-scale" style="left:40px;height:200px;">
                                <div class="scale-mark" style="bottom:100%"><span>100</span></div>
                                <div class="scale-mark" style="bottom:80%"><span>80</span></div>
                                <div class="scale-mark" style="bottom:60%"><span>60</span></div>
                                <div class="scale-mark" style="bottom:40%"><span>40</span></div>
                                <div class="scale-mark" style="bottom:20%"><span>20</span></div>
                                <div class="scale-mark" style="bottom:0%"><span>0</span></div>
                            </div>
                            <div class="therm-mercury" data-role="liquid"></div>
                            <div class="therm-bulb"></div>
                        </div>
                        <div class="therm-input-panel">
                            <div class="money-total" style="font-size:1.6rem;text-align:center;"><span data-role="value">20</span><span data-role="unit">°C</span></div>
                            <input type="range" min="0" max="100" value="20" class="brush-slider horizontal-range h-auto w-full" data-role="slider">
                            <div class="modal-row gap-8" style="justify-content:center;">
                                <button class="bg-tab unit-btn active" data-unit="C">Celsius</button>
                                <button class="bg-tab unit-btn" data-unit="F">Fahrenheit</button>
                            </div>
                        </div>
                    </div>`;
                const liquid = body.querySelector('[data-role="liquid"]');
                const valueEl = body.querySelector('[data-role="value"]');
                const unitEl = body.querySelector('[data-role="unit"]');
                const slider = body.querySelector('[data-role="slider"]');
                const renderThermometer = () => {
                    if (liquid) liquid.style.height = `${value}%`;
                    if (valueEl) valueEl.textContent = unit === 'C' ? String(value) : String(Math.round((value * 9 / 5) + 32));
                    if (unitEl) unitEl.textContent = unit === 'C' ? '°C' : '°F';
                    if (slider) slider.value = String(value);
                    body.querySelectorAll('.unit-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.unit === unit));
                    el._cwState = { value, unit };
                };
                slider?.addEventListener('input', () => {
                    value = parseInt(slider.value || '0', 10);
                    renderThermometer();
                    schedulePagePersist();
                });
                body.querySelectorAll('.unit-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        unit = btn.dataset.unit || 'C';
                        renderThermometer();
                        schedulePagePersist();
                    });
                });
                el._cwApplyState = state => {
                    value = typeof state?.value === 'number' ? state.value : 20;
                    unit = state?.unit === 'F' ? 'F' : 'C';
                    renderThermometer();
                };
                renderThermometer();
            }
        },
    };

    // Map toolsData names that should spawn widgets vs open modals
    const WIDGET_TOOL_NAMES = new Set([
        'Traffic Light','Timer','Countdown Timer','Stopwatch','Clock','Analog Clock','Name Picker','Student Picker','Spin Wheel','Group Maker','Sound Meter','QR Code','Attendance','Text Box','Calculator','Ten Frame','Thermometer'
    ]);

    function normalizeCanvasWidgetName(name) {
        if (name === 'Student Picker') return 'Name Picker';
        if (name === 'Analog Clock') return 'Clock';
        if (name === 'Countdown Timer') return 'Timer';
        return name;
    }

    function spawnCanvasWidget(name, x, y, restoreState) {
        const widgetName = normalizeCanvasWidgetName(name);
        const def = CANVAS_WIDGET_DEFS[widgetName];
        if (!def) return;
        const widgetsLayer = document.getElementById('widgets-layer');
        if (!widgetsLayer) return;
        canvasWidgetZ++;
        const el = document.createElement('div');
        el.className = 'wb-canvas-widget';
        el.dataset.widgetName = widgetName;
        el.style.left = (x || 60) + 'px';
        el.style.top = (y || 60) + 'px';
        el.style.zIndex = canvasWidgetZ;
        if (def.width) el.style.width = def.width + 'px';
        const hBg = def.headerBg ? `background:${def.headerBg};` : 'background:var(--accent,#6366f1);';
        const hCol = def.headerColor ? `color:${def.headerColor};` : 'color:#fff;';
        el.innerHTML = `<div class="cwid-header" style="${hBg}${hCol}">
            <div class="cwid-title">${def.icon} ${widgetName}</div>
            <button class="cwid-close" style="${hCol}">✕</button>
        </div><div class="cwid-body"></div>`;
        widgetsLayer.appendChild(el);
        def.render(el.querySelector('.cwid-body'), el);
        if (restoreState && restoreState.width) el.style.width = restoreState.width;
        if (restoreState && restoreState.height) el.style.height = restoreState.height;
        if (restoreState && restoreState.state) restoreCanvasWidgetState(el, restoreState.state);
        el.querySelector('.cwid-close').addEventListener('click', () => {
            if (el._dragCleanup) el._dragCleanup();
            if (typeof el._resizeCleanup === 'function') el._resizeCleanup();
            if (el._cwCleanup) el._cwCleanup();
            el.remove();
            schedulePagePersist();
        });
        App.makeDraggable(el, el.querySelector('.cwid-header'), () => schedulePagePersist());
        if (typeof ResizeObserver !== 'undefined') {
            let resizeFrame = null;
            const resizeObserver = new ResizeObserver(() => {
                if (resizeFrame) cancelAnimationFrame(resizeFrame);
                resizeFrame = requestAnimationFrame(() => {
                    resizeFrame = null;
                    el.style.width = `${Math.round(el.offsetWidth)}px`;
                    el.style.height = `${Math.round(el.offsetHeight)}px`;
                    schedulePagePersist();
                });
            });
            resizeObserver.observe(el);
            el._resizeCleanup = () => {
                if (resizeFrame) cancelAnimationFrame(resizeFrame);
                resizeObserver.disconnect();
            };
        }
        el.addEventListener('input', schedulePagePersist);
        el.addEventListener('change', schedulePagePersist);
        el.addEventListener('click', schedulePagePersist);
        el.addEventListener('mousedown', () => { canvasWidgetZ++; el.style.zIndex = canvasWidgetZ; });
        schedulePagePersist();
        return el;
    }

    // Wire canvas area as drop target
    const canvasDropArea = document.getElementById('wb-canvas-area');
    canvasDropArea.addEventListener('dragover', e => { e.preventDefault(); canvasDropArea.classList.add('drag-over'); });
    canvasDropArea.addEventListener('dragleave', () => canvasDropArea.classList.remove('drag-over'));
    canvasDropArea.addEventListener('drop', e => {
        e.preventDefault();
        canvasDropArea.classList.remove('drag-over');
        const name = e.dataTransfer.getData('text/plain');
        if (!name) return;
        const rect = canvasDropArea.getBoundingClientRect();
        const x = Math.max(0, e.clientX - rect.left - 80);
        const y = Math.max(0, e.clientY - rect.top - 20);
        spawnCanvasWidget(name, x, y);
    });

    function renderToolsGrid(category) {
        const grid = document.getElementById('tp-tools-grid');
        grid.innerHTML = '';
        const tools = toolsData[category] || [];
        tools.forEach(t => {
            const card = document.createElement('div');
            card.className = 'tp-tool-card';
            card.draggable = WIDGET_TOOL_NAMES.has(t.name);
            card.innerHTML = `<span class="tp-tool-icon">${t.icon}</span><span class="tp-tool-name">${t.name}</span>`;
            if (WIDGET_TOOL_NAMES.has(t.name)) {
                card.title = 'Drag onto board or click to add';
                card.addEventListener('dragstart', e => {
                    e.dataTransfer.setData('text/plain', t.name);
                    e.dataTransfer.effectAllowed = 'copy';
                });
                card.addEventListener('click', () => {
                    // Click: spawn at a staggered default position
                    const existing = document.querySelectorAll('.wb-canvas-widget').length;
                    spawnCanvasWidget(t.name, 40 + existing * 24, 40 + existing * 20);
                });
            } else {
                card.addEventListener('click', t.action);
            }
            grid.appendChild(card);
        });
    }

    document.querySelectorAll('.tp-cat').forEach(cat => {
        cat.addEventListener('click', () => {
            document.querySelectorAll('.tp-cat').forEach(c => {
                c.classList.remove('active');
                c.setAttribute('aria-selected', 'false');
            });
            cat.classList.add('active');
            cat.setAttribute('aria-selected', 'true');
            renderToolsGrid(cat.getAttribute('data-cat'));
        });
    });
    renderToolsGrid('classroom');

    // ===================== PART 2: UNDO / REDO =====================
    /*
       Manages canvas state history for undo/redo functionality.
       - Stores snapshots of the canvas as Data URLs.
       - Limits undo stack to the last 30 states to optimize memory.
    */
    let undoStack = [], redoStack = [];
    let persistWidgetsTimer = null;
    let isRestoringPageSnapshot = false;

    function schedulePagePersist() {
        if (isRestoringPageSnapshot) return;
        clearTimeout(persistWidgetsTimer);
        persistWidgetsTimer = setTimeout(() => {
            try { saveCurrentPageState(); } catch (e) {}
        }, 120);
    }

    function createImageOverlay(src, alt, x, y, options = {}) {
        const overlay = document.createElement('div');
        overlay.className = 'image-overlay';
        overlay.style.left = x + 'px';
        overlay.style.top = y + 'px';
        if (options.width) overlay.style.width = options.width;
        const image = document.createElement('img');
        image.crossOrigin = 'anonymous';
        image.src = src;
        image.alt = alt || '';
        image.draggable = false;
        image.addEventListener('dragstart', event => event.preventDefault());
        const removeBtn = document.createElement('button');
        removeBtn.className = 'text-delete';
        removeBtn.textContent = '✕';
        overlay.append(image, removeBtn);
        widgetsLayer.appendChild(overlay);
        App.makeDraggable(overlay, image, () => schedulePagePersist());
        if (typeof ResizeObserver !== 'undefined') {
            let resizeFrame = null;
            const resizeObserver = new ResizeObserver(() => {
                if (resizeFrame) cancelAnimationFrame(resizeFrame);
                resizeFrame = requestAnimationFrame(() => {
                    resizeFrame = null;
                    overlay.style.width = `${Math.round(overlay.offsetWidth)}px`;
                    schedulePagePersist();
                });
            });
            resizeObserver.observe(overlay);
            overlay._resizeCleanup = () => {
                if (resizeFrame) cancelAnimationFrame(resizeFrame);
                resizeObserver.disconnect();
            };
        }
        ['mousedown', 'touchstart'].forEach(eventName => {
            removeBtn.addEventListener(eventName, (event) => {
                event.stopPropagation();
                if (event.cancelable) event.preventDefault();
            }, { passive: false });
        });
        removeBtn.addEventListener('click', () => {
            if (overlay._dragCleanup) overlay._dragCleanup();
            if (typeof overlay._resizeCleanup === 'function') overlay._resizeCleanup();
            overlay.remove();
            schedulePagePersist();
        });
        schedulePagePersist();
        return overlay;
    }

    function clearWidgetsLayer() {
        closeFloatingYouTubePlayer({ persist: false });
        if (!widgetsLayer) return;
        Array.from(widgetsLayer.children).forEach(el => {
            if (typeof el._dragCleanup === 'function') el._dragCleanup();
            if (typeof el._resizeCleanup === 'function') el._resizeCleanup();
            if (typeof el._cleanup === 'function') el._cleanup();
            if (typeof el._cwCleanup === 'function') el._cwCleanup();
        });
        widgetsLayer.replaceChildren();
    }

    function serializeCanvasWidgetState(el) {
        const name = el.dataset.widgetName;
        if (!name) return null;
        const payload = {
            kind: 'canvas-widget',
            name,
            x: parseInt(el.style.left, 10) || 0,
            y: parseInt(el.style.top, 10) || 0,
            width: el.style.width || '',
            height: el.style.height || '',
            state: null,
        };
        if (name === 'Traffic Light') {
            payload.state = {
                active: el.querySelector('.cwid-tl.active')?.dataset.tl || 'red'
            };
        } else if (name === 'Attendance') {
            payload.state = el._cwState ? { ...el._cwState } : null;
        } else if (name === 'Timer') {
            payload.state = el._cwState ? { ...el._cwState } : null;
        } else if (name === 'Name Picker') {
            payload.state = el._cwState ? { ...el._cwState } : null;
        } else if (name === 'Spin Wheel') {
            payload.state = el._cwState ? { ...el._cwState } : null;
        } else if (name === 'Group Maker') {
            payload.state = el._cwState ? { ...el._cwState } : null;
        } else if (name === 'Stopwatch') {
            payload.state = el._cwState ? { ...el._cwState } : null;
        } else if (name === 'Text Box') {
            payload.state = el._cwState ? { ...el._cwState } : {
                text: el.querySelector('textarea')?.value || '',
                width: el.querySelector('textarea')?.style.width || '',
                height: el.querySelector('textarea')?.style.height || '',
            };
        } else if (name === 'QR Code') {
            payload.state = {
                text: el.querySelector('#cwqr-input')?.value || ''
            };
        }
        return payload;
    }

    function restoreCanvasWidgetState(el, state) {
        const name = el.dataset.widgetName;
        if (!state || !name) return;
        if (name === 'Traffic Light' && state.active) {
            const light = el.querySelector(`.cwid-tl[data-tl="${state.active}"]`);
            if (light) light.click();
        } else if (name === 'Attendance' && typeof el._cwApplyState === 'function') {
            el._cwApplyState(state);
        } else if (name === 'Timer' && typeof el._cwApplyState === 'function') {
            el._cwApplyState(state);
        } else if (name === 'Name Picker' && typeof el._cwApplyState === 'function') {
            el._cwApplyState(state);
        } else if (name === 'Spin Wheel' && typeof el._cwApplyState === 'function') {
            el._cwApplyState(state);
        } else if (name === 'Group Maker' && typeof el._cwApplyState === 'function') {
            el._cwApplyState(state);
        } else if (name === 'Stopwatch' && typeof el._cwApplyState === 'function') {
            el._cwApplyState(state);
        } else if (name === 'Text Box' && typeof el._cwApplyState === 'function') {
            el._cwApplyState(state);
        } else if (name === 'QR Code' && typeof state.text === 'string') {
            const input = el.querySelector('#cwqr-input');
            if (input) input.value = state.text;
            if (input && state.text) el.querySelector('#cwqr-btn')?.click();
        }
    }

    function serializeVisibleYouTubeWidget() {
        if (!ytFloatWidget || ytFloatWidget.classList.contains('hidden') || !ytCurrentVideoId) {
            return null;
        }
        return {
            kind: 'youtube-player',
            videoId: ytCurrentVideoId,
            x: parseInt(ytFloatWidget.style.left, 10) || 0,
            y: parseInt(ytFloatWidget.style.top, 10) || 0,
        };
    }

    function serializeWidgetsLayer() {
        if (!widgetsLayer) return [];
        const widgets = Array.from(widgetsLayer.children).map(el => {
            if (el.classList.contains('text-overlay')) {
                const textarea = el.querySelector('textarea');
                return {
                    kind: 'text-overlay',
                    x: parseInt(el.style.left, 10) || 0,
                    y: parseInt(el.style.top, 10) || 0,
                    text: textarea?.value || '',
                    width: textarea?.style.width || '',
                    height: textarea?.style.height || '',
                };
            }
            if (el.classList.contains('image-overlay')) {
                const img = el.querySelector('img');
                return {
                    kind: 'image-overlay',
                    x: parseInt(el.style.left, 10) || 0,
                    y: parseInt(el.style.top, 10) || 0,
                    src: img?.getAttribute('src') || '',
                    alt: img?.getAttribute('alt') || '',
                    width: el.style.width || '',
                };
            }
            if (el.classList.contains('wb-canvas-widget')) {
                return serializeCanvasWidgetState(el);
            }
            return null;
        }).filter(Boolean);
        const youtubeWidget = serializeVisibleYouTubeWidget();
        if (youtubeWidget) widgets.push(youtubeWidget);
        return widgets;
    }

    function restoreWidgetsLayer(savedWidgets) {
        clearWidgetsLayer();
        (savedWidgets || []).forEach(item => {
            if (item.kind === 'text-overlay') {
                const overlay = createTextOverlay(item.x, item.y, {
                    text: item.text,
                    width: item.width,
                    height: item.height,
                    focus: false,
                });
                return overlay;
            }
            if (item.kind === 'image-overlay' && item.src) {
                createImageOverlay(item.src, item.alt, item.x, item.y, {
                    width: item.width,
                });
                return;
            }
            if (item.kind === 'canvas-widget' && item.name) {
                spawnCanvasWidget(item.name, item.x, item.y, item);
                return;
            }
            if (item.kind === 'youtube-player' && item.videoId) {
                if (typeof item.x === 'number') ytFloatWidget.style.left = `${item.x}px`;
                if (typeof item.y === 'number') ytFloatWidget.style.top = `${item.y}px`;
                playVideo(item.videoId);
            }
        });
    }

    // ===================== MULTI-PAGE SYSTEM =====================
    let wb_pages = JSON.parse(localStorage.getItem('wb-pages') || 'null');
    let wb_currentPage = parseInt(localStorage.getItem('wb-current-page') || '0');
    if (!wb_pages || wb_pages.length === 0) {
        wb_pages = [{ canvas: null, bgStyle: '', bgClass: 'wb-canvas-area', widgets: [] }];
        wb_currentPage = 0;
    }
    if (wb_currentPage >= wb_pages.length) wb_currentPage = 0;

    function clonePageSnapshot(snapshot) {
        return JSON.parse(JSON.stringify(snapshot));
    }

    function normalizePageSnapshot(snapshot) {
        if (!snapshot) {
            return { canvas: null, bgStyle: '', bgClass: 'wb-canvas-area', widgets: [] };
        }
        if (typeof snapshot === 'string') {
            return { canvas: snapshot, bgStyle: '', bgClass: 'wb-canvas-area', widgets: [] };
        }
        return {
            canvas: typeof snapshot.canvas === 'string' ? snapshot.canvas : null,
            bgStyle: typeof snapshot.bgStyle === 'string' ? snapshot.bgStyle : '',
            bgClass: typeof snapshot.bgClass === 'string' ? snapshot.bgClass : 'wb-canvas-area',
            widgets: Array.isArray(snapshot.widgets) ? clonePageSnapshot(snapshot.widgets) : [],
        };
    }

    function captureCurrentPageSnapshot(dataUrl) {
        return {
            canvas: dataUrl || canvas.toDataURL('image/png'),
            bgStyle: canvasArea.style.background || '',
            bgClass: canvasArea.className || 'wb-canvas-area',
            widgets: serializeWidgetsLayer(),
        };
    }

    function persistPageSnapshot(snapshot) {
        wb_pages[wb_currentPage] = clonePageSnapshot(snapshot);
        try { localStorage.setItem('wb-pages', JSON.stringify(wb_pages)); } catch(e) {}
        localStorage.setItem('wb-current-page', String(wb_currentPage));
    }

    function restorePageSnapshot(snapshot) {
        const normalized = normalizePageSnapshot(snapshot);
        isRestoringPageSnapshot = true;
        clearTimeout(persistWidgetsTimer);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvasArea.className = normalized.bgClass || 'wb-canvas-area';
        canvasArea.style.background = normalized.bgStyle || '';
        restoreWidgetsLayer(normalized.widgets);
        if (normalized.canvas) {
            const img = new Image();
            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
                isRestoringPageSnapshot = false;
            };
            img.onerror = () => {
                isRestoringPageSnapshot = false;
            };
            img.src = normalized.canvas;
        } else {
            isRestoringPageSnapshot = false;
        }
        updateCanvasCursor();
        return normalized;
    }

    function saveCurrentPageState(dataUrl) {
        if (isRestoringPageSnapshot) return;
        persistPageSnapshot(captureCurrentPageSnapshot(dataUrl));
    }

    function updatePageCounter() {
        const counter = document.getElementById('page-counter');
        if (counter) counter.textContent = `${wb_currentPage + 1} / ${wb_pages.length}`;
        document.getElementById('page-prev')?.classList.toggle('disabled', wb_currentPage === 0);
        document.getElementById('page-next')?.classList.toggle('disabled', wb_currentPage === wb_pages.length - 1);
        const delBtn = document.getElementById('page-delete');
        if (delBtn) delBtn.classList.toggle('disabled', wb_pages.length <= 1);
    }

    function navigateToPage(index) {
        if (index < 0 || index >= wb_pages.length) return;
        saveCurrentPageState();
        wb_currentPage = index;
        localStorage.setItem('wb-current-page', String(wb_currentPage));
        const snapshot = restorePageSnapshot(wb_pages[wb_currentPage]);
        undoStack = [clonePageSnapshot(snapshot)];
        redoStack = [];
        updatePageCounter();
    }

    function saveCanvasState() {
        const snapshot = captureCurrentPageSnapshot();
        undoStack.push(clonePageSnapshot(snapshot));
        if (undoStack.length > 30) undoStack.shift();
        redoStack = [];
        // Persist current page to localStorage
        try { persistPageSnapshot(snapshot); } catch(e) {}
    }

    // Load current page on start
    {
        const snapshot = restorePageSnapshot(wb_pages[wb_currentPage]);
        undoStack = [clonePageSnapshot(snapshot)];
        redoStack = [];
        if (!snapshot.canvas) persistPageSnapshot(snapshot);
        updatePageCounter();
    }

    // Page nav button wiring
    document.getElementById('page-prev')?.addEventListener('click', () => {
        if (wb_currentPage > 0) navigateToPage(wb_currentPage - 1);
    });
    document.getElementById('page-next')?.addEventListener('click', () => {
        if (wb_currentPage < wb_pages.length - 1) navigateToPage(wb_currentPage + 1);
    });
    document.getElementById('page-add')?.addEventListener('click', () => {
        saveCurrentPageState();
        wb_pages.push({ canvas: null, bgStyle: '', bgClass: 'wb-canvas-area', widgets: [] });
        navigateToPage(wb_pages.length - 1);
    });
    document.getElementById('page-delete')?.addEventListener('click', () => {
        if (wb_pages.length <= 1) return;
        wb_pages.splice(wb_currentPage, 1);
        const newIndex = Math.min(wb_currentPage, wb_pages.length - 1);
        wb_currentPage = newIndex;
        localStorage.setItem('wb-current-page', String(wb_currentPage));
        try { localStorage.setItem('wb-pages', JSON.stringify(wb_pages)); } catch(e) {}
        const snapshot = restorePageSnapshot(wb_pages[wb_currentPage]);
        undoStack = [clonePageSnapshot(snapshot)];
        redoStack = [];
        if (!snapshot.canvas) persistPageSnapshot(snapshot);
        updatePageCounter();
    });

    document.getElementById('btn-undo').addEventListener('click', () => {
        if (undoStack.length <= 1) return;
        redoStack.push(undoStack.pop());
        const snapshot = restorePageSnapshot(undoStack[undoStack.length - 1]);
        persistPageSnapshot(snapshot);
    });
    document.getElementById('btn-redo').addEventListener('click', () => {
        if (redoStack.length === 0) return;
        const state = redoStack.pop();
        undoStack.push(state);
        const snapshot = restorePageSnapshot(state);
        persistPageSnapshot(snapshot);
    });

    // ===================== PART 2: RANDOM STUDENT (in Randomizer modal) =====================
    let randStudentShuffleInterval = null;

    function resetRandomizerModal() {
        if (randStudentShuffleInterval) {
            clearInterval(randStudentShuffleInterval);
            randStudentShuffleInterval = null;
        }
        const studentDisplay = document.getElementById('rand-student-display');
        if (studentDisplay) {
            studentDisplay.textContent = '?';
            studentDisplay.style.animation = 'none';
        }
        const groupsOutput = document.getElementById('groups-output');
        if (groupsOutput) groupsOutput.innerHTML = '';
        const spinResult = document.getElementById('spin-result');
        if (spinResult) {
            spinResult.textContent = '';
            spinResult.style.animation = 'none';
        }
        document.querySelectorAll('.rand-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.rtab === 'student');
        });
        document.querySelectorAll('.rand-content').forEach(content => {
            content.classList.toggle('active', content.id === 'rtab-student');
        });
    }

    document.getElementById('rand-pick-btn').addEventListener('click', () => {
        const display = document.getElementById('rand-student-display');
        display.textContent = '';
        display.style.animation = 'none';
        if (randStudentShuffleInterval) {
            clearInterval(randStudentShuffleInterval);
            randStudentShuffleInterval = null;
        }
        let count = 0;
        randStudentShuffleInterval = setInterval(() => {
            display.textContent = getStudentNames()[Math.floor(Math.random() * getStudentNames().length)];
            count++;
            if (count > 15) {
                clearInterval(randStudentShuffleInterval);
                randStudentShuffleInterval = null;
                const pick = getStudentNames()[Math.floor(Math.random() * getStudentNames().length)];
                display.textContent = pick;
                display.style.animation = 'popIn 0.4s ease';
                setTimeout(() => display.style.animation = '', 500);
            }
        }, 80);
    });

    // ===================== PART 2: GROUP MAKER =====================
    /*
       Divides the student list into a specified number of random groups.
       - Uses Fisher-Yates inspired shuffle and modulo assignment.
       - Applies dynamic border colors from the global design palette.
    */
    document.getElementById('make-groups-btn').addEventListener('click', () => {
        const numGroups = parseInt(document.getElementById('group-count').value) || 4;
        const shuffled = [...getStudentNames()].sort(() => Math.random() - 0.5);
        const groups = Array.from({ length: numGroups }, () => []);
        shuffled.forEach((s, i) => groups[i % numGroups].push(s));

        const output = document.getElementById('groups-output');
        const colors = [
            App.getVar('--wheel-1', '#6366f1'), App.getVar('--wheel-2', '#a855f7'), App.getVar('--wheel-3', '#ec4899'),
            App.getVar('--wheel-4', '#f59e0b'), App.getVar('--wheel-5', '#10b981'), App.getVar('--wheel-6', '#3b82f6'),
            App.getVar('--wheel-7', '#ef4444'), App.getVar('--wheel-8', '#8b5cf6'), App.getVar('--wheel-9', '#14b8a6'),
            App.getVar('--wheel-10', '#f97316')
        ];
        output.innerHTML = '';
        groups.forEach((group, i) => {
            const color = colors[i % colors.length];
            const box = document.createElement('div');
            box.className = 'group-box';
            box.style.borderLeft = `4px solid ${color}`;
            const title = document.createElement('div');
            title.className = 'group-title';
            title.style.color = color;
            title.textContent = `Group ${i + 1}`;
            box.appendChild(title);
            group.forEach(member => {
                const memberEl = document.createElement('div');
                memberEl.className = 'group-member';
                memberEl.textContent = member;
                box.appendChild(memberEl);
            });
            output.appendChild(box);
        });
    });

    // ===================== PART 2: SPIN THE WHEEL =====================
    /*
       Canvas-based randomized picker with physical spin animation.
       - Calculates arc segments based on the number of students.
       - Uses requestAnimationFrame for smooth deceleration logic.
    */
    const wheelCanvas = document.getElementById('spin-wheel-canvas');
    const wheelCtx = wheelCanvas.getContext('2d');
    let wheelAngle = 0, wheelSpinning = false;
    let wheelSpinToken = 0;
    const wheelColors = [
        App.getVar('--wheel-1', '#6366f1'), App.getVar('--wheel-2', '#a855f7'), App.getVar('--wheel-3', '#ec4899'),
        App.getVar('--wheel-4', '#f59e0b'), App.getVar('--wheel-5', '#10b981'), App.getVar('--wheel-6', '#3b82f6'),
        App.getVar('--wheel-7', '#ef4444'), App.getVar('--wheel-8', '#8b5cf6'), App.getVar('--wheel-9', '#14b8a6'),
        App.getVar('--wheel-10', '#f97316'), App.getVar('--wheel-11', '#06b6d4'), App.getVar('--wheel-12', '#84cc16')
    ];

    function drawWheel() {
        const cx = 140, cy = 140, r = 130;
        const currentList = getStudentNames();
        const n = currentList.length;
        const arc = (2 * Math.PI) / n;
        wheelCtx.clearRect(0, 0, 280, 280);
        currentList.forEach((s, i) => {
            const startA = wheelAngle + i * arc;
            wheelCtx.beginPath();
            wheelCtx.moveTo(cx, cy);
            wheelCtx.arc(cx, cy, r, startA, startA + arc);
            wheelCtx.closePath();
            wheelCtx.fillStyle = wheelColors[i % wheelColors.length];
            wheelCtx.fill();
            wheelCtx.strokeStyle = App.getVar('--white', '#fff');
            wheelCtx.lineWidth = 2;
            wheelCtx.stroke();
            // Label
            wheelCtx.save();
            wheelCtx.translate(cx, cy);
            wheelCtx.rotate(startA + arc / 2);
            wheelCtx.fillStyle = App.getVar('--white', '#fff');
            wheelCtx.font = '600 10px Inter';
            wheelCtx.textAlign = 'right';
            wheelCtx.fillText(s, r - 10, 4);
            wheelCtx.restore();
        });
        // Center circle
        wheelCtx.beginPath();
        wheelCtx.arc(cx, cy, 16, 0, Math.PI * 2);
        wheelCtx.fillStyle = App.getVar('--white', '#fff');
        wheelCtx.fill();
        wheelCtx.strokeStyle = App.getVar('--grey-300', '#ddd');
        wheelCtx.stroke();
    }
    drawWheel();

    document.getElementById('spin-btn').addEventListener('click', () => {
        if (wheelSpinning) return;
        wheelSpinning = true;
        const currentSpinToken = ++wheelSpinToken;
        const spinSpeed = 0.2 + Math.random() * 0.15;
        let speed = spinSpeed;
        const decel = 0.997;
        const result = document.getElementById('spin-result');
        result.textContent = '🎰 Spinning...';

        function animate() {
            if (currentSpinToken !== wheelSpinToken) {
                wheelSpinning = false;
                drawWheel();
                return;
            }
            wheelAngle += speed;
            speed *= decel;
            drawWheel();
            // Draw pointer
            wheelCtx.beginPath();
            wheelCtx.moveTo(270, 134);
            wheelCtx.lineTo(270, 146);
            wheelCtx.lineTo(256, 140);
            wheelCtx.closePath();
            wheelCtx.fillStyle = App.getVar('--dark-navy', '#1e1e2e');
            wheelCtx.fill();

            if (speed > 0.001) {
                requestAnimationFrame(animate);
            } else {
                wheelSpinning = false;
                const currentList = getStudentNames();
                const n = currentList.length;
                const arc = (2 * Math.PI) / n;
                const pointerAngle = (2 * Math.PI) - (wheelAngle % (2 * Math.PI));
                const idx = Math.floor(pointerAngle / arc) % n;
                result.textContent = '🎉 ' + currentList[idx] + '!';
                result.style.animation = 'popIn 0.4s ease';
                setTimeout(() => result.style.animation = '', 500);
            }
        }
        animate();
    });

    const randomizerModal = document.getElementById('modal-random');
    if (randomizerModal) {
        new MutationObserver(() => {
            if (randomizerModal.classList.contains('hidden')) {
                wheelSpinning = false;
                wheelSpinToken++;
                resetRandomizerModal();
                drawWheel();
            }
        }).observe(randomizerModal, { attributes: true, attributeFilter: ['class'] });
    }

    // ===================== PART 2: TEXT TOOL =====================

    function createTextOverlay(x, y, options = {}) {
        const div = document.createElement('div');
        div.className = 'text-overlay';
        div.style.left = x + 'px';
        div.style.top = y + 'px';
        div.style.pointerEvents = 'all';
        div.innerHTML = `<textarea placeholder="Type here..." rows="2"></textarea><button class="text-delete">✕</button>`;

        const clampTextOverlayPosition = (left, top) => {
            const parent = div.parentElement;
            if (!parent) return { left, top };
            const edgePadding = 8;
            const maxLeft = Math.max(edgePadding, parent.clientWidth - div.offsetWidth - edgePadding);
            const maxTop = Math.max(edgePadding, parent.clientHeight - div.offsetHeight - edgePadding);
            return {
                left: Math.min(Math.max(edgePadding, left), maxLeft),
                top: Math.min(Math.max(edgePadding, top), maxTop),
            };
        };

        // Drag support
        let isDrag = false, dragOffX = 0, dragOffY = 0;
        const onMouseDown = (e) => {
            if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') return;
            isDrag = true;
            dragOffX = e.clientX - div.offsetLeft;
            dragOffY = e.clientY - div.offsetTop;
        };
        const onMouseMove = (e) => {
            if (!isDrag) return;
            const position = clampTextOverlayPosition(e.clientX - dragOffX, e.clientY - dragOffY);
            div.style.left = position.left + 'px';
            div.style.top = position.top + 'px';
        };
        const onMouseUp = () => {
            if (isDrag) schedulePagePersist();
            isDrag = false;
        };

        const onTouchStart = (e) => {
            if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') return;
            const touch = e.touches[0];
            if (!touch) return;
            e.preventDefault();
            isDrag = true;
            dragOffX = touch.clientX - div.offsetLeft;
            dragOffY = touch.clientY - div.offsetTop;
        };
        const onTouchMove = (e) => {
            if (!isDrag) return;
            const touch = e.touches[0];
            if (!touch) return;
            e.preventDefault();
            const position = clampTextOverlayPosition(touch.clientX - dragOffX, touch.clientY - dragOffY);
            div.style.left = position.left + 'px';
            div.style.top = position.top + 'px';
        };
        const onTouchEnd = () => {
            if (isDrag) schedulePagePersist();
            isDrag = false;
        };

        div.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        div.addEventListener('touchstart', onTouchStart, { passive: false });
        document.addEventListener('touchmove', onTouchMove, { passive: false });
        document.addEventListener('touchend', onTouchEnd);
        document.addEventListener('touchcancel', onTouchEnd);

        const cleanup = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('touchend', onTouchEnd);
            document.removeEventListener('touchcancel', onTouchEnd);
        };

        div.querySelector('.text-delete').addEventListener('click', () => {
            cleanup();
            div.remove();
            schedulePagePersist();
        });
        widgetsLayer.appendChild(div);
        const textarea = div.querySelector('textarea');
        if (typeof options.text === 'string') textarea.value = options.text;
        if (options.width) textarea.style.width = options.width;
        if (options.height) textarea.style.height = options.height;
        textarea.addEventListener('input', schedulePagePersist);
        if (typeof ResizeObserver !== 'undefined') {
            let resizeFrame = null;
            const resizeObserver = new ResizeObserver(() => {
                if (resizeFrame) cancelAnimationFrame(resizeFrame);
                resizeFrame = requestAnimationFrame(() => {
                    resizeFrame = null;
                    schedulePagePersist();
                });
            });
            resizeObserver.observe(textarea);
            const previousCleanup = cleanup;
            div._cleanup = () => {
                previousCleanup();
                if (resizeFrame) cancelAnimationFrame(resizeFrame);
                resizeObserver.disconnect();
            };
        }
        if (!div._cleanup) div._cleanup = cleanup;
        if (options.focus !== false) textarea.focus();
        schedulePagePersist();
        return div;
    }

    canvas.addEventListener('click', (e) => {
        if (currentTool === 'text') {
            createTextOverlay(e.offsetX, e.offsetY);
        }
    });

    // ===================== PART 2: SHAPES TOOL =====================
    let currentShape = 'rect';
    let shapeStartX = 0, shapeStartY = 0, shapeDrawing = false;
    let shapePreviewData = null;

    function beginShapeDrawing(point) {
        if (currentTool !== 'shapes') return;
        shapeDrawing = true;
        shapeStartX = point.offsetX;
        shapeStartY = point.offsetY;
        shapePreviewData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }

    function updateShapePreview(point) {
        if (!shapeDrawing || currentTool !== 'shapes') return;
        ctx.putImageData(shapePreviewData, 0, 0);
        const color = document.getElementById('color-picker').value;
        const lw = document.getElementById('brush-size').value;
        ctx.strokeStyle = color;
        ctx.lineWidth = lw;
        ctx.lineCap = 'round';
        ctx.globalCompositeOperation = 'source-over';
        drawShape(ctx, currentShape, shapeStartX, shapeStartY, point.offsetX, point.offsetY);
    }

    const shapesSubmenu = document.getElementById('shapes-submenu');
    document.getElementById('tool-shapes').addEventListener('click', (e) => {
        e.stopPropagation();
        if (!shapesSubmenu.classList.contains('hidden')) {
            shapesSubmenu.classList.add('hidden');
            return;
        }
        shapesSubmenu.classList.toggle('hidden');
        if (!shapesSubmenu.classList.contains('hidden')) {
            const btn = document.getElementById('tool-shapes');
            const rect = btn.getBoundingClientRect();
            // Position submenu relative to the drawing toolbar
            shapesSubmenu.style.top = rect.top + 'px';
            shapesSubmenu.style.left = (rect.right + 12) + 'px';
        }
    });

    // Close shapes submenu if clicked outside
    document.addEventListener('click', (e) => {
        if (!shapesSubmenu.contains(e.target) && e.target.id !== 'tool-shapes' && !e.target.closest('#tool-shapes')) {
            shapesSubmenu.classList.add('hidden');
        }
    });

    document.querySelectorAll('.shape-option').forEach(opt => {
        opt.addEventListener('click', () => {
            document.querySelectorAll('.shape-option').forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            currentShape = opt.getAttribute('data-shape');
            setActiveDrawTool('shapes');
            shapesSubmenu.classList.add('hidden');
        });
    });

    canvas.addEventListener('mousedown', (e) => {
        beginShapeDrawing(e);
    });
    canvas.addEventListener('mousemove', (e) => {
        updateShapePreview(e);
    });

    function finishShapeDrawing() {
        if (!shapeDrawing || currentTool !== 'shapes') return;
        shapeDrawing = false;
        saveCanvasState();
    }

    canvas.addEventListener('mouseup', finishShapeDrawing);
    document.addEventListener('mouseup', finishShapeDrawing);

    function drawShape(c, shape, x1, y1, x2, y2) {
        c.beginPath();
        if (shape === 'rect') {
            c.rect(x1, y1, x2 - x1, y2 - y1);
        } else if (shape === 'circle') {
            const rx = Math.abs(x2 - x1) / 2, ry = Math.abs(y2 - y1) / 2;
            c.ellipse(x1 + (x2 - x1) / 2, y1 + (y2 - y1) / 2, rx, ry, 0, 0, Math.PI * 2);
        } else if (shape === 'line') {
            c.moveTo(x1, y1);
            c.lineTo(x2, y2);
        } else if (shape === 'arrow') {
            c.moveTo(x1, y1);
            c.lineTo(x2, y2);
            const angle = Math.atan2(y2 - y1, x2 - x1);
            c.lineTo(x2 - 15 * Math.cos(angle - Math.PI / 6), y2 - 15 * Math.sin(angle - Math.PI / 6));
            c.moveTo(x2, y2);
            c.lineTo(x2 - 15 * Math.cos(angle + Math.PI / 6), y2 - 15 * Math.sin(angle + Math.PI / 6));
        } else if (shape === 'triangle') {
            const mx = (x1 + x2) / 2;
            c.moveTo(mx, y1);
            c.lineTo(x1, y2);
            c.lineTo(x2, y2);
            c.closePath();
        }
        c.stroke();
    }

    // ===================== PART 2: ANALOG CLOCK =====================
    let clockInterval = null;
    function drawAnalogClock() {
        const c = document.getElementById('analog-clock-canvas');
        if (!c) return;
        const cx = c.getContext('2d');
        const w = 240, h = 240, r = 100, cX = w / 2, cY = h / 2;
        const now = new Date();

        cx.clearRect(0, 0, w, h);

        // Face
        cx.beginPath();
        cx.arc(cX, cY, r + 10, 0, Math.PI * 2);
        cx.fillStyle = App.getVar('--sidebar-bg', '#fff');
        cx.fill();
        cx.strokeStyle = App.getVar('--border-color', '#e0e0e0');
        cx.lineWidth = 3;
        cx.stroke();

        // Numbers
        cx.font = '600 14px Inter';
        cx.fillStyle = App.getVar('--grey-800', '#333');
        cx.textAlign = 'center';
        cx.textBaseline = 'middle';
        for (let i = 1; i <= 12; i++) {
            const a = (i * Math.PI / 6) - Math.PI / 2;
            cx.fillText(i, cX + Math.cos(a) * (r - 16), cY + Math.sin(a) * (r - 16));
        }

        // Tick marks
        for (let i = 0; i < 60; i++) {
            const a = (i * Math.PI / 30) - Math.PI / 2;
            const inner = i % 5 === 0 ? r - 28 : r - 8;
            cx.beginPath();
            cx.moveTo(cX + Math.cos(a) * inner, cY + Math.sin(a) * inner);
            cx.lineTo(cX + Math.cos(a) * (r - 4), cY + Math.sin(a) * (r - 4));
            cx.strokeStyle = i % 5 === 0 ? App.getVar('--text-muted', '#666') : App.getVar('--border-color', '#e0e0e0');
            cx.lineWidth = i % 5 === 0 ? 2 : 1;
            cx.stroke();
        }

        // Hour hand
        const hr = (now.getHours() % 12 + now.getMinutes() / 60) * Math.PI / 6 - Math.PI / 2;
        cx.beginPath();
        cx.moveTo(cX, cY);
        cx.lineTo(cX + Math.cos(hr) * 55, cY + Math.sin(hr) * 55);
        cx.strokeStyle = App.getVar('--text-main', '#333');
        cx.lineWidth = 5;
        cx.lineCap = 'round';
        cx.stroke();

        // Minute hand
        const mn = (now.getMinutes() + now.getSeconds() / 60) * Math.PI / 30 - Math.PI / 2;
        cx.beginPath();
        cx.moveTo(cX, cY);
        cx.lineTo(cX + Math.cos(mn) * 75, cY + Math.sin(mn) * 75);
        cx.strokeStyle = App.getVar('--accent', '#6366f1');
        cx.lineWidth = 3;
        cx.stroke();

        // Second hand
        const sc = now.getSeconds() * Math.PI / 30 - Math.PI / 2;
        cx.beginPath();
        cx.moveTo(cX, cY);
        cx.lineTo(cX + Math.cos(sc) * 80, cY + Math.sin(sc) * 80);
        cx.strokeStyle = App.getVar('--color-red', '#ef4444');
        cx.lineWidth = 1.5;
        cx.stroke();

        // Center dot
        cx.beginPath();
        cx.arc(cX, cY, 5, 0, Math.PI * 2);
        cx.fillStyle = App.getVar('--grey-800', '#333');
        cx.fill();

        // Digital display
        const dd = document.getElementById('clock-digital-display');
        if (dd) dd.textContent = now.toLocaleTimeString();
    }

    // Start clock when modal opens
    const clockModal = document.getElementById('modal-clock');
    if (clockModal) {
        new MutationObserver(() => {
            if (!clockModal.classList.contains('hidden')) {
                drawAnalogClock();
                if (!clockInterval) clockInterval = setInterval(drawAnalogClock, 1000);
            } else if (clockInterval) {
                clearInterval(clockInterval);
                clockInterval = null;
            }
        }).observe(clockModal, { attributes: true, attributeFilter: ['class'] });
    }

    // ===================== PART 2: STOPWATCH =====================
    let swTime = 0, swRunning = false, swInterval = null, swLaps = [];

    function resetStandaloneStopwatch() {
        swRunning = false;
        clearInterval(swInterval);
        swInterval = null;
        swTime = 0;
        swLaps = [];
        updateSWDisplay();
        const lapsEl = document.getElementById('sw-laps');
        if (lapsEl) lapsEl.innerHTML = '';
    }

    function updateSWDisplay() {
        const min = Math.floor(swTime / 6000);
        const sec = Math.floor((swTime % 6000) / 100);
        const cs = swTime % 100;
        document.getElementById('sw-display').textContent =
            String(min).padStart(2, '0') + ':' + String(sec).padStart(2, '0') + '.' + String(cs).padStart(2, '0');
    }
    document.getElementById('sw-start-btn').addEventListener('click', () => {
        if (swRunning) return;
        swRunning = true;
        swInterval = setInterval(() => { swTime++; updateSWDisplay(); }, 10);
    });
    document.getElementById('sw-stop-btn').addEventListener('click', () => {
        swRunning = false;
        clearInterval(swInterval);
    });
    document.getElementById('sw-reset-btn').addEventListener('click', () => {
        resetStandaloneStopwatch();
    });
    document.getElementById('sw-lap-btn').addEventListener('click', () => {
        if (!swRunning) return;
        swLaps.push(swTime);
        const lapsEl = document.getElementById('sw-laps');
        const min = Math.floor(swTime / 6000);
        const sec = Math.floor((swTime % 6000) / 100);
        const cs = swTime % 100;
        const lapDiv = document.createElement('div');
        lapDiv.className = 'stopwatch-lap';
        lapDiv.innerHTML = `<span>Lap ${swLaps.length}</span><span>${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}.${String(cs).padStart(2,'0')}</span>`;
        lapsEl.prepend(lapDiv);
    });

    const stopwatchModal = document.getElementById('modal-stopwatch');
    if (stopwatchModal) {
        new MutationObserver(() => {
            if (stopwatchModal.classList.contains('hidden')) {
                resetStandaloneStopwatch();
            }
        }).observe(stopwatchModal, { attributes: true, attributeFilter: ['class'] });
    }

    // ===================== PART 2: CALCULATOR =====================
    let calcExpr = '';
    document.querySelectorAll('.calc-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const v = btn.getAttribute('data-calc');
            if (v === 'C') {
                calcExpr = '';
                document.getElementById('calc-result').textContent = '0';
                document.getElementById('calc-expr').textContent = '';
            } else if (v === '=') {
                try {
                    const expr = calcExpr.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
                    const result = Function('"use strict";return (' + expr + ')')();
                    document.getElementById('calc-expr').textContent = calcExpr + ' =';
                    document.getElementById('calc-result').textContent = Number.isFinite(result) ? parseFloat(result.toFixed(8)) : 'Error';
                    calcExpr = String(result);
                } catch {
                    document.getElementById('calc-result').textContent = 'Error';
                    calcExpr = '';
                }
            } else {
                calcExpr += v;
                document.getElementById('calc-result').textContent = calcExpr;
            }
        });
    });

    // ===================== PART 2: FLASHCARDS =====================
    let fcCards = Storage.readJSON('wb-flashcards', []);
    let fcIndex = 0;

    function resetFlashcardsModal() {
        fcIndex = 0;
        document.getElementById('fc-q-input').value = '';
        document.getElementById('fc-a-input').value = '';
        renderFlashcard();
    }

    function renderFlashcard() {
        const front = document.getElementById('fc-front');
        const back = document.getElementById('fc-back');
        const counter = document.getElementById('fc-counter');
        const card = document.getElementById('fc-card');
        card.classList.remove('flipped');
        if (fcCards.length === 0) {
            front.textContent = 'No cards yet!';
            back.textContent = 'Add cards below';
            counter.textContent = '0 / 0';
        } else {
            front.textContent = fcCards[fcIndex].q;
            back.textContent = fcCards[fcIndex].a;
            counter.textContent = (fcIndex + 1) + ' / ' + fcCards.length;
        }
    }

    document.getElementById('fc-card-container').addEventListener('click', () => {
        document.getElementById('fc-card').classList.toggle('flipped');
    });
    document.getElementById('fc-prev').addEventListener('click', () => {
        if (fcCards.length === 0) return;
        fcIndex = (fcIndex - 1 + fcCards.length) % fcCards.length;
        renderFlashcard();
    });
    document.getElementById('fc-next').addEventListener('click', () => {
        if (fcCards.length === 0) return;
        fcIndex = (fcIndex + 1) % fcCards.length;
        renderFlashcard();
    });
    document.getElementById('fc-shuffle').addEventListener('click', () => {
        fcCards.sort(() => Math.random() - 0.5);
        fcIndex = 0;
        Storage.writeJSON('wb-flashcards', fcCards);
        renderFlashcard();
    });
    document.getElementById('fc-add-btn').addEventListener('click', () => {
        const q = document.getElementById('fc-q-input').value.trim();
        const a = document.getElementById('fc-a-input').value.trim();
        if (!q || !a) return;
        fcCards.push({ q, a });
        Storage.writeJSON('wb-flashcards', fcCards);
        fcIndex = fcCards.length - 1;
        renderFlashcard();
        document.getElementById('fc-q-input').value = '';
        document.getElementById('fc-a-input').value = '';
    });
    renderFlashcard();

    const flashcardsModal = document.getElementById('modal-flashcards');
    if (flashcardsModal) {
        new MutationObserver(() => {
            if (flashcardsModal.classList.contains('hidden')) {
                resetFlashcardsModal();
            }
        }).observe(flashcardsModal, { attributes: true, attributeFilter: ['class'] });
    }

    // ===================== PART 2: MORE TOOLS TOGGLE =====================
    const bbMore = document.getElementById('bb-more');
    const toolsPanel = document.getElementById('wb-tools-panel');
    const toolsShell = document.querySelector('.wb-main');
    const toolsCollapseBtn = document.getElementById('tp-collapse-btn');
    const toolsExpandRail = document.getElementById('tp-expand-rail');
    const TOOLS_PANEL_COLLAPSED_KEY = 'wb-tools-panel-collapsed';
    const syncToolsPanelState = collapsed => {
        if (!toolsShell) return;
        const desktopCollapsed = collapsed && window.innerWidth > 1024;
        toolsShell.classList.toggle('tools-collapsed', desktopCollapsed);
        if (toolsCollapseBtn) {
            toolsCollapseBtn.setAttribute('aria-expanded', String(!desktopCollapsed));
            toolsCollapseBtn.setAttribute('aria-label', desktopCollapsed ? 'Expand tools panel' : 'Collapse tools panel');
            toolsCollapseBtn.title = desktopCollapsed ? 'Expand tools panel' : 'Collapse tools panel';
        }
        if (toolsExpandRail) {
            toolsExpandRail.setAttribute('aria-expanded', String(!desktopCollapsed));
        }
    };

    let toolsPanelCollapsed = localStorage.getItem(TOOLS_PANEL_COLLAPSED_KEY) === 'true';
    syncToolsPanelState(toolsPanelCollapsed);

    const setToolsPanelCollapsed = collapsed => {
        toolsPanelCollapsed = collapsed;
        localStorage.setItem(TOOLS_PANEL_COLLAPSED_KEY, String(collapsed));
        syncToolsPanelState(collapsed);
    };

    toolsCollapseBtn?.addEventListener('click', () => setToolsPanelCollapsed(!toolsPanelCollapsed));
    toolsExpandRail?.addEventListener('click', () => setToolsPanelCollapsed(false));
    window.addEventListener('resize', () => syncToolsPanelState(toolsPanelCollapsed));

    if (bbMore) bbMore.addEventListener('click', () => {
        toolsPanel.classList.toggle('open');
    });


    // ===================== INIT =====================
    // ===================== PART 3: ATTENDANCE =====================
    /*
       Tracks student attendance (Present, Absent, Late).
       - Syncs with students.js if available.
       - Saves summary history to LocalStorage.
    */
    const attGrid = document.getElementById('att-grid');
    const attPresentCount = document.getElementById('att-present-count');
    const attAbsentCount = document.getElementById('att-absent-count');
    const attLateCount = document.getElementById('att-late-count');
    let attendanceSaveFeedbackTimeout = null;

    function initAttendance() {
        if (!attGrid) return;
        attGrid.innerHTML = '';
        const list = getStudentData();
        
        list.forEach(s => {
            const card = document.createElement('div');
            card.className = 'att-card';
            card.dataset.status = 'none';
            const avatar = document.createElement('div');
            avatar.className = 'att-avatar';
            avatar.style.background = s.color || '#6366f1';
            avatar.style.color = typeof getContrastColor === 'function' ? getContrastColor(s.color || '#6366f1') : '#fff';
            avatar.textContent = s.initials || s.name.substring(0,2);
            const name = document.createElement('div');
            name.className = 'att-name';
            name.textContent = s.name;
            const buttons = document.createElement('div');
            buttons.className = 'att-btns';
            ['p', 'a', 'l'].forEach((suffix, index) => {
                const btn = document.createElement('button');
                btn.className = `att-btn ${suffix}`;
                btn.title = index === 0 ? 'Present' : index === 1 ? 'Absent' : 'Late';
                btn.textContent = index === 0 ? 'P' : index === 1 ? 'A' : 'L';
                buttons.appendChild(btn);
            });
            card.append(avatar, name, buttons);
            
            const btns = card.querySelectorAll('.att-btn');
            btns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const status = btn.classList.contains('p') ? 'present' : (btn.classList.contains('a') ? 'absent' : 'late');
                    if (card.dataset.status === status) {
                        card.dataset.status = 'none';
                        btn.classList.remove('active');
                    } else {
                        btns.forEach(b => b.classList.remove('active'));
                        card.dataset.status = status;
                        btn.classList.add('active');
                    }
                    updateAttendanceSummary();
                });
            });
            attGrid.appendChild(card);
        });
        updateAttendanceSummary();
    }

    function updateAttendanceSummary() {
        let p = 0, a = 0, l = 0;
        document.querySelectorAll('.att-card').forEach(c => {
            if (c.dataset.status === 'present') p++;
            else if (c.dataset.status === 'absent') a++;
            else if (c.dataset.status === 'late') l++;
        });
        attPresentCount.textContent = p;
        attAbsentCount.textContent = a;
        attLateCount.textContent = l;
    }

    function resetAttendanceModal() {
        if (attendanceSaveFeedbackTimeout) {
            clearTimeout(attendanceSaveFeedbackTimeout);
            attendanceSaveFeedbackTimeout = null;
        }
        initAttendance();
        const resultEl = document.getElementById('att-pick-result');
        if (resultEl) resultEl.textContent = '';
        const saveBtn = document.getElementById('att-save-btn');
        if (saveBtn) {
            saveBtn.textContent = 'Save Attendance';
            saveBtn.style.background = '';
        }
    }

    document.getElementById('att-reset-btn')?.addEventListener('click', () => {
        document.querySelectorAll('.att-card').forEach(c => {
            c.dataset.status = 'none';
            c.querySelectorAll('.att-btn').forEach(b => b.classList.remove('active'));
        });
        updateAttendanceSummary();
    });

    document.getElementById('att-save-btn')?.addEventListener('click', () => {
        const p = attPresentCount.textContent;
        const a = attAbsentCount.textContent;
        const l = attLateCount.textContent;
        
        // Save to local storage with timestamp
        const records = Storage.readJSON('wb-attendance-history', []);
        records.push({ date: new Date().toISOString(), present: p, absent: a, late: l });
        Storage.writeJSON('wb-attendance-history', records.slice(-10)); // keep last 10
        
        const btn = document.getElementById('att-save-btn');
        const oldText = btn.textContent;
        btn.textContent = '✅ Saved';
        btn.style.background = '#10b981';
        if (attendanceSaveFeedbackTimeout) clearTimeout(attendanceSaveFeedbackTimeout);
        attendanceSaveFeedbackTimeout = setTimeout(() => {
            btn.textContent = oldText;
            btn.style.background = '';
            attendanceSaveFeedbackTimeout = null;
        }, 2000);
    });

    initAttendance();

    const attendanceModal = document.getElementById('modal-attendance');
    if (attendanceModal) {
        new MutationObserver(() => {
            if (attendanceModal.classList.contains('hidden')) {
                resetAttendanceModal();
            }
        }).observe(attendanceModal, { attributes: true, attributeFilter: ['class'] });
    }

    document.getElementById('att-pick-btn')?.addEventListener('click', () => {
        const presentCards = Array.from(document.querySelectorAll('.att-card')).filter(c => c.dataset.status === 'present');
        const resultEl = document.getElementById('att-pick-result');
        if (presentCards.length === 0) {
            if (resultEl) resultEl.textContent = 'No present students to pick from.';
            return;
        }
        const randomCard = presentCards[Math.floor(Math.random() * presentCards.length)];
        const studentName = randomCard.querySelector('.att-name').textContent;
        if (resultEl) {
            resultEl.innerHTML = '';
            const icon = document.createElement('i');
            icon.className = 'fa-solid fa-star';
            icon.style.color = '#f59e0b';
            icon.style.marginRight = '6px';
            resultEl.append(icon, document.createTextNode(studentName));
        }
        presentCards.forEach(c => c.classList.remove('picked'));
        randomCard.classList.add('picked');
    });

    // ===================== PART 3: CHARTS =====================
    let chartType = 'bar';
    const chartCanvas = document.getElementById('chart-canvas');
    const chartRows = document.getElementById('chart-data-rows');

    function resetChartsModal() {
        chartType = 'bar';
        document.querySelectorAll('.chart-type-btn').forEach(btn => {
            const isBar = btn.dataset.type === 'bar';
            btn.classList.toggle('active', isBar);
        });
        const titleInput = document.getElementById('chart-title-input');
        if (titleInput) titleInput.value = '';
        if (chartRows) {
            chartRows.innerHTML = '';
            const row = document.createElement('div');
            row.className = 'chart-row';
            row.innerHTML = `
            <input type="text" placeholder="Label" class="row-label">
            <input type="number" placeholder="Value" class="row-value">
            <button type="button" class="row-remove">✕</button>
        `;
            row.querySelector('.row-remove').addEventListener('click', () => row.remove());
            chartRows.appendChild(row);
        }
        if (chartCanvas) {
            const ctx = chartCanvas.getContext('2d');
            ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
        }
    }

    document.getElementById('chart-add-row')?.addEventListener('click', () => {
        const row = document.createElement('div');
        row.className = 'chart-row';
        row.innerHTML = `
            <input type="text" placeholder="Label" class="row-label">
            <input type="number" placeholder="Value" class="row-value">
            <button class="row-remove">✕</button>
        `;
        row.querySelector('.row-remove').addEventListener('click', () => row.remove());
        chartRows.appendChild(row);
    });

    document.querySelectorAll('.chart-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.chart-type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            chartType = btn.dataset.type;
        });
    });

    function renderChart() {
        if (!chartCanvas) return;
        const c = chartCanvas.getContext('2d');
        const labels = Array.from(document.querySelectorAll('.row-label')).map(i => i.value || 'Untitled');
        const values = Array.from(document.querySelectorAll('.row-value')).map(i => parseFloat(i.value) || 0);
        const title = document.getElementById('chart-title-input').value || 'My Chart';

        c.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
        
        const padding = 50;
        const w = chartCanvas.width - padding * 2;
        const h = chartCanvas.height - padding * 2;
        const maxVal = Math.max(...values, 10);

        // Draw Title
        c.fillStyle = '#333';
        c.font = 'bold 18px Inter';
        c.textAlign = 'center';
        c.fillText(title, chartCanvas.width/2, 30);

        // Draw Axes
        c.strokeStyle = '#999';
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(padding, padding);
        c.lineTo(padding, chartCanvas.height - padding);
        c.lineTo(chartCanvas.width - padding, chartCanvas.height - padding);
        c.stroke();

        const barW = w / labels.length;

        if (chartType === 'bar') {
            labels.forEach((l, i) => {
                const barH = (values[i] / maxVal) * h;
                c.fillStyle = `hsl(${i * (360/labels.length)}, 70%, 60%)`;
                c.fillRect(padding + i * barW + 10, chartCanvas.height - padding - barH, barW - 20, barH);
                
                c.fillStyle = '#666';
                c.font = '12px Inter';
                c.textAlign = 'center';
                c.fillText(l, padding + i * barW + barW/2, chartCanvas.height - padding + 20);
                c.fillText(values[i], padding + i * barW + barW/2, chartCanvas.height - padding - barH - 5);
            });
        } else {
            c.beginPath();
            c.strokeStyle = '#6366f1';
            labels.forEach((l, i) => {
                const px = padding + i * barW + barW/2;
                const py = chartCanvas.height - padding - (values[i] / maxVal) * h;
                if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
                
                c.fillStyle = '#666';
                c.font = '12px Inter';
                c.textAlign = 'center';
                c.fillText(l, px, chartCanvas.height - padding + 20);
            });
            c.stroke();
            // Dots
            labels.forEach((l, i) => {
                const px = padding + i * barW + barW/2;
                const py = chartCanvas.height - padding - (values[i] / maxVal) * h;
                c.beginPath();
                c.arc(px, py, 4, 0, Math.PI*2);
                c.fillStyle = '#6366f1';
                c.fill();
            });
        }
    }

    document.getElementById('chart-render-btn')?.addEventListener('click', renderChart);

    const chartsModal = document.getElementById('modal-charts');
    if (chartsModal) {
        new MutationObserver(() => {
            if (chartsModal.classList.contains('hidden')) {
                resetChartsModal();
            }
        }).observe(chartsModal, { attributes: true, attributeFilter: ['class'] });
    }

    // ===================== PART 3: TEN FRAME =====================
    let tfColor = 'red';

    function resetTenFrameModal() {
        tfColor = 'red';
        document.querySelectorAll('.tf-cell').forEach(c => c.innerHTML = '');
        document.querySelectorAll('.tf-color-btn').forEach(btn => {
            const isRed = btn.dataset.color === 'red';
            btn.classList.toggle('active', isRed);
            btn.setAttribute('aria-pressed', isRed ? 'true' : 'false');
        });
        updateTfCount();
    }

    document.querySelectorAll('.tf-cell').forEach(cell => {
        cell.addEventListener('click', () => {
            if (cell.innerHTML === '') {
                cell.innerHTML = `<div class="tf-dot ${tfColor}"></div>`;
            } else {
                cell.innerHTML = '';
            }
            updateTfCount();
        });
    });

    document.querySelectorAll('.tf-color-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tf-color-btn').forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-pressed', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-pressed', 'true');
            tfColor = btn.dataset.color;
        });
    });

    function updateTfCount() {
        const count = Array.from(document.querySelectorAll('.tf-cell')).filter(c => c.innerHTML !== '').length;
        document.getElementById('tf-count').textContent = count;
    }

    document.getElementById('tf-clear')?.addEventListener('click', () => {
        document.querySelectorAll('.tf-cell').forEach(c => c.innerHTML = '');
        updateTfCount();
    });

    const tenFrameModal = document.getElementById('modal-tenframe');
    if (tenFrameModal) {
        new MutationObserver(() => {
            if (tenFrameModal.classList.contains('hidden')) {
                resetTenFrameModal();
            }
        }).observe(tenFrameModal, { attributes: true, attributeFilter: ['class'] });
    }

    // ===================== PART 3: THERMOMETER =====================
    const thermoLiquid = document.getElementById('thermo-liquid');
    const thermoSlider = document.getElementById('thermo-slider');
    const thermoValDisplay = document.getElementById('thermo-val');
    const thermoUnitDisplay = document.getElementById('thermo-unit');
    let thermoUnit = 'C';

    function resetThermometerModal() {
        thermoUnit = 'C';
        if (thermoSlider) thermoSlider.value = '20';
        document.querySelectorAll('.unit-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.unit === 'C');
        });
        updateThermo();
    }

    function updateThermo() {
        if (!thermoSlider || !thermoLiquid) return;
        const val = thermoSlider.value;
        thermoLiquid.style.height = val + '%';
        if (thermoUnit === 'C') {
            thermoValDisplay.textContent = val;
            if (thermoUnitDisplay) thermoUnitDisplay.textContent = '°C';
        } else {
            const f = Math.round((val * 9/5) + 32);
            thermoValDisplay.textContent = f;
            if (thermoUnitDisplay) thermoUnitDisplay.textContent = '°F';
        }
    }

    thermoSlider?.addEventListener('input', updateThermo);

    document.querySelectorAll('.unit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.unit-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            thermoUnit = btn.dataset.unit;
            updateThermo();
        });
    });

    const thermometerModal = document.getElementById('modal-thermometer');
    if (thermometerModal) {
        new MutationObserver(() => {
            if (thermometerModal.classList.contains('hidden')) {
                resetThermometerModal();
            }
        }).observe(thermometerModal, { attributes: true, attributeFilter: ['class'] });
    }

    // Helper for Draggable Elements
    // makeDraggable is now provided by WhiteboardApp alias above

    // ===================== PART 3: MONEY TOOL =====================
    const moneyItemsLayer = document.getElementById('money-items-layer');
    const moneyTotalVal = document.getElementById('money-total-val');
    const moneyMat = document.getElementById('money-mat');
    let moneyTotal = 0;

    function resetMoneyToolModal() {
        if (moneyItemsLayer) moneyItemsLayer.innerHTML = '';
        moneyTotal = 0;
        updateMoneyTotal();
        moneyMat?.querySelector('.mat-hint')?.style.setProperty('display', 'block');
    }

    function addCoinToMat(val, html, isBill) {
        const clone = document.createElement('div');
        clone.className = isBill ? 'mat-bill' : 'mat-coin';
        clone.innerHTML = html;
        clone.dataset.value = val;
        clone.style.position = 'absolute';
        
        const matRect = moneyMat.getBoundingClientRect();
        const startX = matRect.width / 2 - 20 + (Math.random() * 40 - 20);
        const startY = matRect.height / 2 - 20 + (Math.random() * 40 - 20);
        
        clone.style.left = startX + 'px';
        clone.style.top = startY + 'px';
        clone.style.transform = `rotate(${Math.random() * 20 - 10}deg)`;
        
        const removeItem = (e) => {
            e.preventDefault();
            moneyTotal -= val;
            clone.remove();
            updateMoneyTotal();
        };

        clone.addEventListener('contextmenu', removeItem);
        clone.addEventListener('dblclick', removeItem);

        moneyItemsLayer.appendChild(clone);
        App.makeDraggable(clone);
        
        moneyTotal += val;
        updateMoneyTotal();
        
        const hint = moneyMat?.querySelector('.mat-hint');
        if (hint) hint.style.display = 'none';
    }

    document.querySelectorAll('.money-item').forEach(item => {
        item.addEventListener('click', () => {
            addCoinToMat(parseFloat(item.dataset.value), item.innerHTML, item.classList.contains('bill'));
        });

        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', JSON.stringify({
                val: item.dataset.value,
                html: item.innerHTML,
                isBill: item.classList.contains('bill')
            }));
        });
    });

    if (moneyMat) {
        moneyMat.addEventListener('dragover', (e) => e.preventDefault());
        moneyMat.addEventListener('drop', (e) => {
            e.preventDefault();
            try {
                const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                addCoinToMat(parseFloat(data.val), data.html, data.isBill);
            } catch (err) {}
        });
    }

    function updateMoneyTotal() {
        moneyTotalVal.textContent = '$' + moneyTotal.toFixed(2);
    }

    document.getElementById('money-clear')?.addEventListener('click', () => {
        resetMoneyToolModal();
    });

    const moneyModal = document.getElementById('modal-money');
    if (moneyModal) {
        new MutationObserver(() => {
            if (moneyModal.classList.contains('hidden')) {
                resetMoneyToolModal();
            }
        }).observe(moneyModal, { attributes: true, attributeFilter: ['class'] });
    }

    // ===================== PART 3: RULER TOOL =====================
    const ruler = document.getElementById('ruler-tool');
    let rulerRotation = 0;
    let cleanupRulerRotate = null;


    // Ruler is now exclusively opened via toolsData action


    ruler?.querySelector('.ruler-close').addEventListener('click', () => {
        if (cleanupRulerRotate) cleanupRulerRotate();
        if (ruler._dragCleanup) ruler._dragCleanup();
        ruler.classList.add('hidden');
    });
    
    const rulerRotate = ruler?.querySelector('.ruler-rotate');
    if (rulerRotate) {
        let isRotating = false; // Flag to distinguish between click and drag

        const startRotate = (e) => {
            e.preventDefault();
            isRotating = false; // Reset on every start
            const rect = ruler.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            const startX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : null);
            const startY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : null);
            if (startX === null) return;

            // Calculate initial mouse angle and store current ruler rotation
            const initialMouseAngle = Math.atan2(startY - centerY, startX - centerX);
            const initialRulerRotation = rulerRotation;

            const moveRotate = (moveEvent) => {
                isRotating = true; // Drag detected
                const clientX = moveEvent.clientX || (moveEvent.touches && moveEvent.touches[0] ? moveEvent.touches[0].clientX : null);
                const clientY = moveEvent.clientY || (moveEvent.touches && moveEvent.touches[0] ? moveEvent.touches[0].clientY : null);
                if (clientX === null) return;

                const currentMouseAngle = Math.atan2(clientY - centerY, clientX - centerX);
                const deltaAngle = (currentMouseAngle - initialMouseAngle) * (180 / Math.PI);
                
                rulerRotation = initialRulerRotation + deltaAngle;
                ruler.style.transform = `rotate(${rulerRotation}deg)`;
            };
            
            const stopRotate = () => {
                document.removeEventListener('mousemove', moveRotate);
                document.removeEventListener('mouseup', stopRotate);
                document.removeEventListener('touchmove', moveRotate);
                document.removeEventListener('touchend', stopRotate);
                cleanupRulerRotate = null;
            };

            cleanupRulerRotate = stopRotate;
            
            document.addEventListener('mousemove', moveRotate);
            document.addEventListener('mouseup', stopRotate);
            document.addEventListener('touchmove', moveRotate, { passive: false });
            document.addEventListener('touchend', stopRotate);
        };

        rulerRotate.addEventListener('mousedown', startRotate);
        rulerRotate.addEventListener('touchstart', startRotate, { passive: false });

        // Click-to-rotate: snap to 15 degree increments
        rulerRotate.addEventListener('click', (e) => {
            if (!isRotating) {
                // Round to nearest 15 and add 15
                rulerRotation = (Math.round(rulerRotation / 15) * 15) + 15;
                ruler.style.transform = `rotate(${rulerRotation}deg)`;
            }
        });
    }

    if (ruler) {
        App.makeDraggable(ruler, ruler.querySelector('.ruler-handle'));
        // Click handle to reset rotation
        ruler.querySelector('.ruler-handle').addEventListener('dblclick', () => {
            rulerRotation = 0;
            ruler.style.transform = 'rotate(0deg)';
        });
    }

    // Generate ruler marks
    const rulerMarks = ruler?.querySelector('.ruler-marks');
    if (rulerMarks) {
        for (let i = 0; i <= 20; i++) {
            const mark = document.createElement('div');
            mark.className = 'ruler-mark';
            mark.style.left = (i * 20) + 'px';
            if (i % 5 === 0) {
                mark.classList.add('major');
                const label = document.createElement('span');
                label.textContent = i;
                mark.appendChild(label);
            }
            rulerMarks.appendChild(mark);
        }
    }

    // ===================== SHOPPING GAME =====================
    /*
       Interactive payment simulator for classroom math.
       - Randomly selects items with associated prices.
       - Validates total paid against target price.
    */
    const shopItems = [
        { name: 'Apple', icon: '🍎', price: 0.25 },
        { name: 'Banana', icon: '🍌', price: 0.15 },
        { name: 'Toy Car', icon: '🏎️', price: 1.50 },
        { name: 'Pencil', icon: '✏️', price: 0.10 },
        { name: 'Ice Cream', icon: '🍦', price: 0.75 },
        { name: 'Bear', icon: '🧸', price: 2.00 },
        { name: 'Book', icon: '📚', price: 1.25 },
        { name: 'Cookie', icon: '🍪', price: 0.05 }
    ];

    let currentShopItem = null;
    let shopPaid = 0;
    let resetShoppingGameModal = null;

    function initShop() {
        const iconEl = document.getElementById('shop-item-icon');
        const nameEl = document.getElementById('shop-item-name');
        const priceEl = document.getElementById('shop-item-price');
        const trayEl = document.getElementById('shop-tray');
        const paidEl = document.getElementById('shop-paid-val');
        const feedbackEl = document.getElementById('shop-feedback');

        function updateShopUI() {
            if (paidEl) paidEl.textContent = '$' + shopPaid.toFixed(2);
        }

        function nextShopItem() {
            currentShopItem = shopItems[Math.floor(Math.random() * shopItems.length)];
            if (iconEl) iconEl.textContent = currentShopItem.icon;
            if (nameEl) nameEl.textContent = currentShopItem.name;
            if (priceEl) priceEl.textContent = '$' + currentShopItem.price.toFixed(2);
            shopPaid = 0;
            if (trayEl) trayEl.innerHTML = '<div class="mat-hint">Drag coins here to pay</div>';
            if (feedbackEl) feedbackEl.textContent = '';
            updateShopUI();
        }

        resetShoppingGameModal = () => {
            nextShopItem();
        };

        nextShopItem();
        
        function addShopCoin(val, text) {
            shopPaid += val;
            updateShopUI();
            
            const item = document.createElement('div');
            item.className = 'shop-tray-item';
            item.textContent = text.split(' ')[0]; // Just the emoji/icon
            
            if (trayEl) {
                const rect = trayEl.getBoundingClientRect();
                const startX = Math.random() * (rect.width - 50) + 10;
                const startY = Math.random() * (rect.height - 50) + 10;
                
                item.style.left = startX + 'px';
                item.style.top = startY + 'px';
                item.style.transform = `rotate(${Math.random() * 20 - 10}deg)`;

                // Double click or right click to remove
                const removeItem = (e) => {
                    e.preventDefault();
                    shopPaid -= val;
                    item.remove();
                    updateShopUI();
                    if (trayEl.querySelectorAll('.shop-tray-item').length === 0) {
                        trayEl.innerHTML = '<div class="mat-hint">Drag coins here to pay</div>';
                    }
                };
                item.addEventListener('contextmenu', removeItem);
                item.addEventListener('dblclick', removeItem);

                trayEl.appendChild(item);
                App.makeDraggable(item);
                trayEl.querySelector('.mat-hint')?.remove();
            }
        }

        document.querySelectorAll('.shop-coin, .shop-bill').forEach(el => {
            el.addEventListener('click', () => {
                addShopCoin(parseFloat(el.dataset.value), el.textContent);
            });

            el.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', JSON.stringify({
                    val: el.dataset.value,
                    text: el.textContent
                }));
            });
        });

        if (trayEl) {
            trayEl.addEventListener('dragover', (e) => e.preventDefault());
            trayEl.addEventListener('drop', (e) => {
                e.preventDefault();
                try {
                    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                    addShopCoin(parseFloat(data.val), data.text);
                } catch (err) {}
            });
        }

        document.getElementById('shop-clear')?.addEventListener('click', () => {
            shopPaid = 0;
            if (trayEl) trayEl.innerHTML = '<div class="mat-hint">Drag coins here to pay</div>';
            updateShopUI();
            if (feedbackEl) feedbackEl.textContent = '';
        });

        document.getElementById('shop-check')?.addEventListener('click', () => {
            if (!feedbackEl || !currentShopItem) return;
            if (Math.abs(shopPaid - currentShopItem.price) < 0.001) {
                feedbackEl.textContent = '🎉 Correct! Exactly right.';
                feedbackEl.style.color = '#10b981';
            } else if (shopPaid > currentShopItem.price) {
                feedbackEl.textContent = '⚖️ Too much! You paid ' + (shopPaid - currentShopItem.price).toFixed(2) + ' too much.';
                feedbackEl.style.color = '#f59e0b';
            } else {
                feedbackEl.textContent = '📉 Not enough. You still need ' + (currentShopItem.price - shopPaid).toFixed(2) + '.';
                feedbackEl.style.color = '#ef4444';
            }
        });

        document.getElementById('shop-next')?.addEventListener('click', nextShopItem);
    }

    initShop();

    const shoppingModal = document.getElementById('modal-shopping');
    if (shoppingModal) {
        new MutationObserver(() => {
            if (shoppingModal.classList.contains('hidden')) {
                resetShoppingGameModal?.();
            }
        }).observe(shoppingModal, { attributes: true, attributeFilter: ['class'] });
    }

    console.log('✅ Teacherstack Whiteboard Part 3 Tools Initialized');
    console.log('✅ Teacherstack Whiteboard Parts 1 & 2 Initialized');
    // Initialize draggables
    const SCHEDULE_WIDGET_POSITION_KEY = 'wb-schedule-widget-position';
    const scheduleWidget = document.getElementById('schedule-widget');
    if (scheduleWidget) {
        function resetScheduleWidgetLayout() {
            scheduleWidget.style.left = '';
            scheduleWidget.style.top = '16px';
            scheduleWidget.style.right = '16px';
            scheduleWidget.style.bottom = '';
            scheduleWidget.style.width = '';
            scheduleWidget.style.height = '';
            try { localStorage.removeItem(SCHEDULE_WIDGET_POSITION_KEY); } catch (e) {}
        }

        const savedScheduleWidgetPosition = Storage.readJSON(SCHEDULE_WIDGET_POSITION_KEY, null);
        const saveScheduleWidgetLayout = () => {
            Storage.writeJSON(SCHEDULE_WIDGET_POSITION_KEY, {
                left: parseInt(scheduleWidget.style.left, 10) || scheduleWidget.offsetLeft || 0,
                top: parseInt(scheduleWidget.style.top, 10) || scheduleWidget.offsetTop || 0,
                width: scheduleWidget.style.width || '',
                height: scheduleWidget.style.height || '',
            });
        };

        if (savedScheduleWidgetPosition && typeof savedScheduleWidgetPosition.left === 'number' && typeof savedScheduleWidgetPosition.top === 'number') {
            scheduleWidget.style.left = `${savedScheduleWidgetPosition.left}px`;
            scheduleWidget.style.top = `${savedScheduleWidgetPosition.top}px`;
            scheduleWidget.style.right = 'auto';
            scheduleWidget.style.bottom = 'auto';
            if (savedScheduleWidgetPosition.width) scheduleWidget.style.width = savedScheduleWidgetPosition.width;
            if (savedScheduleWidgetPosition.height) scheduleWidget.style.height = savedScheduleWidgetPosition.height;
        } else {
            scheduleWidget.style.left = `${scheduleWidget.offsetLeft}px`;
            scheduleWidget.style.top = `${scheduleWidget.offsetTop}px`;
            scheduleWidget.style.right = 'auto';
            scheduleWidget.style.bottom = 'auto';
        }
        App.makeDraggable(scheduleWidget, scheduleWidget.querySelector('.sw-header'), (left, top) => {
            scheduleWidget.style.left = `${left}px`;
            scheduleWidget.style.top = `${top}px`;
            scheduleWidget.style.right = 'auto';
            scheduleWidget.style.bottom = 'auto';
            saveScheduleWidgetLayout();
        });
        if (typeof ResizeObserver !== 'undefined') {
            let resizeFrame = null;
            const resizeObserver = new ResizeObserver(() => {
                if (resizeFrame) cancelAnimationFrame(resizeFrame);
                resizeFrame = requestAnimationFrame(() => {
                    resizeFrame = null;
                    scheduleWidget.style.width = `${Math.round(scheduleWidget.offsetWidth)}px`;
                    scheduleWidget.style.height = `${Math.round(scheduleWidget.offsetHeight)}px`;
                    saveScheduleWidgetLayout();
                });
            });
            resizeObserver.observe(scheduleWidget);
            scheduleWidget._scheduleResizeCleanup = () => {
                if (resizeFrame) cancelAnimationFrame(resizeFrame);
                resizeObserver.disconnect();
            };
        }
    }

    // Make all modals draggable
    document.querySelectorAll('.modal-box').forEach(modal => {
        const header = modal.querySelector('.modal-header');
        App.makeDraggable(modal, header, () => {
            // Clear initial transform once dragging starts
            modal.style.transform = 'none';
        });
    });
});
