/**
 * Teacherstack Whiteboard — Parts 1 & 2
 * Part 1: Canvas, Timer, Name Picker, Sound Meter, Background, Schedule, TTS, Fullscreen, Tools Panel
 * Part 2: Undo/Redo, Spin Wheel, Group Maker, Text Tool, Shapes, Clock, Stopwatch, Calculator, Flashcards
 */

document.addEventListener('DOMContentLoaded', () => {

    // ===================== STUDENTS =====================
    // Consolidate student list from students.js if available
    const getStudentNames = () => (typeof students !== 'undefined') ? students.map(s => s.name) : ["Vaani", "Jagger", "Krue", "Malina", "Julian", "Reece", "Johnathan", "Alaric", "Everett", "P.J.", "Apollo", "Messiah", "Lily", "Aidan", "Paxton", "Dean", "Raelynn", "Adalynn", "Phoebe", "Everleigh", "Gavin", "Kota"];
    const getStudentData = () => (typeof students !== 'undefined') ? students : getStudentNames().map(s => ({ name: s, initials: s.substring(0,2).toUpperCase(), color: '#6366f1' }));

    // window.WhiteboardApp and window.WhiteboardStorage are loaded from external scripts
    const App = window.WhiteboardApp;
    const Storage = window.WhiteboardStorage;

    // ===================== CANVAS CORE =====================
    const canvas = document.getElementById('wb-canvas');
    const ctx = canvas.getContext('2d');
    const canvasArea = document.getElementById('wb-canvas-area');
    let isDrawing = false;
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

    function startDrawing(e) {
        if (currentTool === 'cursor') return;
        isDrawing = true;
        [lastX, lastY] = [e.offsetX, e.offsetY];
    }
    function draw(e) {
        if (!isDrawing) return;
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
        [lastX, lastY] = [e.offsetX, e.offsetY];
    }
    function stopDrawing() { isDrawing = false; }

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    // Touch support
    canvas.addEventListener('touchstart', e => { e.preventDefault(); const t = e.touches[0]; const r = canvas.getBoundingClientRect(); startDrawing({offsetX: t.clientX-r.left, offsetY: t.clientY-r.top}); });
    canvas.addEventListener('touchmove', e => { e.preventDefault(); const t = e.touches[0]; const r = canvas.getBoundingClientRect(); draw({offsetX: t.clientX-r.left, offsetY: t.clientY-r.top}); });
    canvas.addEventListener('touchend', stopDrawing);

    // ===================== TOOLBAR =====================
    document.querySelectorAll('.draw-tool').forEach(tool => {
        tool.addEventListener('click', () => {
            const t = tool.getAttribute('data-tool');
            if (t) {
                currentTool = t;
                document.querySelectorAll('.draw-tool').forEach(b => b.classList.remove('active'));
                tool.classList.add('active');
                updateCanvasCursor();
            }
        });
    });

    document.getElementById('btn-clear-canvas').addEventListener('click', () => {
        if (confirm('Clear everything on the board?')) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            // Clear text overlays
            if (widgetsLayer) {
                widgetsLayer.querySelectorAll('.text-overlay').forEach(el => el.remove());
            }
            // Reset undo/redo stacks as requested to prevent inconsistent state
            undoStack = [];
            redoStack = [];
            saveCanvasState(); // This will push the empty state as the new baseline
        }
    });

    // ===================== EXPORT =====================
    document.getElementById('btn-export')?.addEventListener('click', () => {
        const link = document.createElement('a');
        link.download = 'whiteboard-' + new Date().toISOString().slice(0, 10) + '.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
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
        'bb-timer': 'modal-timer',
        'bb-namepick': 'modal-namepick',
        'bb-traffic': 'modal-traffic',
        'bb-sound': 'modal-sound',
        'bb-qr': 'modal-qr',
        'bb-random': 'modal-random',
        'bb-media': 'modal-media',
        'bb-tts': 'modal-tts'
    };
    Object.entries(bbMap).forEach(([btnId, modalId]) => {
        const btn = document.getElementById(btnId);
        if (btn) btn.addEventListener('click', () => App.openModal(modalId));
    });

    const bbVideo = document.getElementById('bb-video');
    if (bbVideo) bbVideo.addEventListener('click', () => {
        App.openModal('modal-media');
        const tab = document.querySelector('[data-tab="media-videos"]');
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
    
    // Toggle aria states for bg-img-cat
    document.querySelectorAll('.bg-img-cat').forEach(cat => {
        cat.addEventListener('click', () => {
            document.querySelectorAll('.bg-img-cat').forEach(c => {
                c.classList.remove('active');
                c.setAttribute('aria-selected', 'false');
            });
            cat.classList.add('active');
            cat.setAttribute('aria-selected', 'true');
        });
    });

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

    // ===================== MEDIA SEARCH & YOUTUBE =====================
    const imgSearchInput = document.getElementById('img-search-input');
    const imgSearchBtn = document.getElementById('img-search-btn');
    const imgResults = document.getElementById('img-results');
    const ytSearchInput = document.getElementById('yt-search-input');
    const ytSearchBtn = document.getElementById('yt-search-btn');
    const ytResults = document.getElementById('yt-results');
    const ytFloatWidget = document.getElementById('yt-float-widget');
    const ytPlayerContainer = document.getElementById('yt-player-container');
    let ytPlayer = null;

    // Load YouTube API
    if (!window.YT) {
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }

    function searchImages(query) {
        if (!query) return;
        let apiKey = localStorage.getItem('pixabay-key');
        if (!apiKey) {
            apiKey = prompt('To search for images, you need a free Pixabay API key.\n\n1. Go to pixabay.com/api/docs/ in a new tab\n2. Create a free account (no credit card needed)\n3. Copy your API Key and paste it here:');
            if (!apiKey) return;
            localStorage.setItem('pixabay-key', apiKey.trim());
        }
        imgResults.innerHTML = '<div class="media-hint">Searching...</div>';
        fetch(`https://pixabay.com/api/?key=${encodeURIComponent(apiKey.trim())}&q=${encodeURIComponent(query)}&image_type=photo&per_page=12&safesearch=true`)
            .then(r => { if (!r.ok) throw new Error('bad response'); return r.json(); })
            .then(data => {
                imgResults.innerHTML = '';
                if (!data.hits || data.hits.length === 0) {
                    imgResults.innerHTML = '<div class="media-hint">No results found. Try different words.</div>';
                    return;
                }
                data.hits.forEach(hit => {
                    const img = document.createElement('img');
                    img.src = hit.previewURL;
                    img.className = 'media-item';
                    img.alt = hit.tags;
                    img.title = hit.tags;
                    img.addEventListener('click', () => {
                        const overlay = document.createElement('div');
                        overlay.className = 'image-overlay';
                        overlay.style.left = '100px';
                        overlay.style.top = '100px';
                        overlay.innerHTML = `<img src="${hit.webformatURL}" alt="${hit.tags}"><button class="text-delete">✕</button>`;
                        widgetsLayer.appendChild(overlay);
                        App.makeDraggable(overlay);
                        overlay.querySelector('.text-delete').addEventListener('click', () => overlay.remove());
                        App.closeModal('modal-media');
                    });
                    imgResults.appendChild(img);
                });
            })
            .catch(() => {
                localStorage.removeItem('pixabay-key');
                imgResults.innerHTML = '<div class="media-hint">Search failed. Your API key may be wrong — it has been cleared. Click Search again to re-enter it.</div>';
            });
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
        // Show classroom-relevant educational suggestions as clickable shortcuts
        const suggestions = [
            { id: 'RF4WHkOHivQ', title: 'Counting to 100 - Kindergarten', thumb: 'https://img.youtube.com/vi/RF4WHkOHivQ/mqdefault.jpg' },
            { id: '1v24noaXuFg', title: 'Phonics Song for Kids', thumb: 'https://img.youtube.com/vi/1v24noaXuFg/mqdefault.jpg' },
            { id: 'tuFd8C8AFSQ', title: 'Brain Break - Move & Freeze', thumb: 'https://img.youtube.com/vi/tuFd8C8AFSQ/mqdefault.jpg' },
            { id: 'BELlZKpi1Zs', title: 'Alphabet Song A-Z', thumb: 'https://img.youtube.com/vi/BELlZKpi1Zs/mqdefault.jpg' }
        ];
        ytResults.innerHTML = '<div class="media-hint" style="font-size:0.78rem;margin-bottom:8px;">💡 Tip: Paste any YouTube link in the box above to play it directly. Or click a suggestion below:</div>';
        suggestions.forEach(v => {
            const div = document.createElement('div');
            div.className = 'yt-result-item';
            div.innerHTML = `<img src="${v.thumb}" alt="${v.title}"><span>${v.title}</span>`;
            div.addEventListener('click', () => playVideo(v.id));
            ytResults.appendChild(div);
        });
    }

    function playVideo(id) {
        ytFloatWidget.classList.remove('hidden');
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
        App.closeModal('modal-media');
        App.makeDraggable(ytFloatWidget, ytFloatWidget.querySelector('.yt-fw-header'));
    }

    imgSearchBtn?.addEventListener('click', () => searchImages(imgSearchInput.value));
    imgSearchInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter') searchImages(imgSearchInput.value); });
    
    ytSearchBtn?.addEventListener('click', () => searchYouTube(ytSearchInput.value));
    ytSearchInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter') searchYouTube(ytSearchInput.value); });

    document.getElementById('yt-fw-close')?.addEventListener('click', () => {
        ytFloatWidget.classList.add('hidden');
        if (ytPlayer && ytPlayer.stopVideo) ytPlayer.stopVideo();
    });

    // ===================== TIMER =====================
    let timerSeconds = 300, timerTotal = 300, timerInterval = null, timerRunning = false;

    function updateTimerDisplay() {
        const m = Math.floor(timerSeconds / 60);
        const s = timerSeconds % 60;
        document.getElementById('timer-display').textContent =
            String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
        const pct = timerTotal > 0 ? (timerSeconds / timerTotal) * 100 : 0;
        document.getElementById('timer-progress-fill').style.width = pct + '%';
    }

    function startTimer() {
        if (timerRunning || timerSeconds <= 0) return;
        timerRunning = true;
        timerInterval = setInterval(() => {
            timerSeconds--;
            updateTimerDisplay();
            if (timerSeconds <= 0) {
                clearInterval(timerInterval);
                timerRunning = false;
                timerFinished();
            }
        }, 1000);
    }

    function timerFinished() {
        document.getElementById('timer-display').style.color = 'var(--color-red)';
        // Play a sound using Web Audio
        try {
            const ac = new AudioContext();
            [0, 300, 600].forEach(delay => {
                const osc = ac.createOscillator();
                const gain = ac.createGain();
                osc.connect(gain); gain.connect(ac.destination);
                osc.frequency.value = 880;
                osc.type = 'sine';
                gain.gain.value = 0.3;
                osc.start(ac.currentTime + delay/1000);
                osc.stop(ac.currentTime + delay/1000 + 0.2);
            });
        } catch(e) {}
    }

    document.getElementById('timer-start').addEventListener('click', startTimer);
    document.getElementById('timer-pause').addEventListener('click', () => {
        clearInterval(timerInterval); timerRunning = false;
    });
    document.getElementById('timer-reset').addEventListener('click', () => {
        clearInterval(timerInterval); timerRunning = false;
        timerSeconds = timerTotal;
        document.getElementById('timer-display').style.color = 'var(--text-main)';
        updateTimerDisplay();
    });

    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            clearInterval(timerInterval); timerRunning = false;
            timerSeconds = timerTotal = parseInt(btn.getAttribute('data-sec'));
            document.getElementById('timer-display').style.color = 'var(--text-main)';
            updateTimerDisplay();
        });
    });

    document.getElementById('timer-set-btn').addEventListener('click', () => {
        clearInterval(timerInterval); timerRunning = false;
        const m = parseInt(document.getElementById('timer-min').value) || 0;
        const s = parseInt(document.getElementById('timer-sec-input').value) || 0;
        timerSeconds = timerTotal = m * 60 + s;
        document.getElementById('timer-display').style.color = 'var(--text-main)';
        updateTimerDisplay();
    });

    updateTimerDisplay();

    // ===================== TRAFFIC LIGHT =====================
    function setTrafficLight(color) {
        document.querySelectorAll('.tl-light').forEach(l => l.classList.remove('active'));
        const light = document.getElementById('tl-' + color);
        if (light) light.classList.add('active');
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

    // ===================== QR CODE =====================
    document.getElementById('qr-generate-btn').addEventListener('click', () => {
        const text = document.getElementById('qr-input').value;
        const output = document.getElementById('qr-output');
        output.innerHTML = '';
        if (text) {
            new QRCode(output, { text, width: 180, height: 180 });
        }
    });

    // ===================== NAME PICKER =====================
    let pickedNames = [];
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
        // Shuffle animation
        let count = 0;
        const shuffleInt = setInterval(() => {
            display.textContent = studentNames[Math.floor(Math.random() * studentNames.length)];
            count++;
            if (count > 15) {
                clearInterval(shuffleInt);
                display.textContent = pick;
                display.style.animation = 'popIn 0.4s ease';
            }
        }, 80);

        // Update history
        const hist = document.getElementById('namepick-history');
        hist.innerHTML = pickedNames.map(n =>
            `<span class="namepick-chip">${n}</span>`
        ).join('');
    });

    // ===================== SOUND METER =====================
    /*
       Uses Web Audio API to visualize microphone input levels.
       - AudioContext: Interface for managing and playing all sounds.
       - AnalyserNode: Provides real-time frequency and time-domain analysis.
    */
    let audioCtx, analyser, micStream, soundAnimFrame;
    const soundBars = document.querySelectorAll('#sound-bars .sb');

    document.getElementById('sound-start-btn').addEventListener('click', async () => {
        try {
            micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioCtx = new AudioContext();
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            const src = audioCtx.createMediaStreamSource(micStream);
            src.connect(analyser);

            document.getElementById('sound-start-btn').classList.add('hidden');
            document.getElementById('sound-stop-btn').classList.remove('hidden');

            function animateBars() {
                const data = new Uint8Array(analyser.frequencyBinCount);
                analyser.getByteFrequencyData(data);
                const avg = data.reduce((a,b) => a+b, 0) / data.length;
                const norm = Math.min(avg / 128, 1);

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
            alert('Microphone access denied. Please allow mic access.');
        }
    });

    document.getElementById('sound-stop-btn').addEventListener('click', () => {
        cancelAnimationFrame(soundAnimFrame);
        if (micStream) micStream.getTracks().forEach(t => t.stop());
        if (audioCtx) audioCtx.close();
        soundBars.forEach(b => { b.style.height = '8px'; b.style.background = 'var(--border-color)'; });
        document.getElementById('sound-level-label').textContent = 'Listening...';
        document.getElementById('sound-start-btn').classList.remove('hidden');
        document.getElementById('sound-stop-btn').classList.add('hidden');
    });

    // ===================== BACKGROUND PICKER =====================
    // Lines/Grid/Dotted backgrounds
    document.querySelectorAll('#bg-lines .bg-option').forEach(opt => {
        opt.addEventListener('click', () => {
            const bg = opt.getAttribute('data-bg');
            canvasArea.className = 'wb-canvas-area';
            if (bg === 'lined') canvasArea.classList.add('bg-lined');
            else if (bg === 'grid') canvasArea.classList.add('bg-grid');
            else if (bg === 'dotted') canvasArea.classList.add('bg-dotted');
            App.closeModal('modal-background');
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
                canvasArea.className = 'wb-canvas-area';
                canvasArea.style.background = c;
                App.closeModal('modal-background');
            });
            colorGrid.appendChild(sw);
        });
    }

    const bgApply = document.getElementById('bg-apply-custom');
    if (bgApply) bgApply.addEventListener('click', () => {
        canvasArea.className = 'wb-canvas-area';
        canvasArea.style.background = document.getElementById('bg-custom-color').value;
        App.closeModal('modal-background');
    });

    // Background image grid — themed gradient backgrounds
    const bgImageGrid = document.getElementById('bg-image-grid');
    if (bgImageGrid) {
        const bgThemes = [
            { label: 'Sunny Day',    bg: 'linear-gradient(to bottom, #87CEEB 0%, #fffde7 60%, #a5d6a7 100%)' },
            { label: 'Night Sky',    bg: 'linear-gradient(to bottom, #0d1b2a 0%, #1a237e 50%, #283593 100%)' },
            { label: 'Ocean',        bg: 'linear-gradient(to bottom, #29b6f6 0%, #0277bd 60%, #01579b 100%)' },
            { label: 'Sunset',       bg: 'linear-gradient(to bottom right, #ff7043, #ffa726, #ffee58)' },
            { label: 'Forest',       bg: 'linear-gradient(to bottom, #a5d6a7 0%, #388e3c 100%)' },
            { label: 'Lavender',     bg: 'linear-gradient(135deg, #e8d5ff 0%, #c39bd3 100%)' },
            { label: 'Chalkboard',   bg: 'linear-gradient(135deg, #2d5016 0%, #3a6020 100%)' },
            { label: 'Arctic',       bg: 'linear-gradient(to bottom, #e3f2fd 0%, #bbdefb 100%)' },
            { label: 'Rainbow',      bg: 'linear-gradient(to right, #ef5350, #ff7043, #ffca28, #66bb6a, #42a5f5, #7e57c2)' },
            { label: 'Cozy Library', bg: 'linear-gradient(135deg, #8d6e63 0%, #5d4037 100%)' },
            { label: 'Pastel',       bg: 'linear-gradient(135deg, #fce4ec 0%, #e3f2fd 50%, #f1f8e9 100%)' },
            { label: 'Outer Space',  bg: 'radial-gradient(ellipse at center, #1a237e 0%, #0d1b2a 70%)' },
        ];
        bgThemes.forEach(theme => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'bg-image-thumb';
            btn.title = theme.label;
            btn.innerHTML = `<div class="bg-img-preview" style="background:${theme.bg}"></div><span>${theme.label}</span>`;
            btn.addEventListener('click', () => {
                canvasArea.style.backgroundImage = theme.bg.startsWith('linear') || theme.bg.startsWith('radial') ? 'none' : '';
                canvasArea.className = 'wb-canvas-area';
                canvasArea.style.background = theme.bg;
                App.closeModal('modal-background');
            });
            bgImageGrid.appendChild(btn);
        });
    }

    // Layout backgrounds
    document.querySelectorAll('#bg-layout .bg-option').forEach(opt => {
        opt.addEventListener('click', () => {
            const layout = opt.getAttribute('data-layout');
            canvasArea.className = 'wb-canvas-area';
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
            App.closeModal('modal-background');
        });
    });

    // ===================== SCHEDULE WIDGET =====================
    let schedule = Storage.readJSON('wb-schedule', []);

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
        schedule.forEach((item, i) => {
            const done = nowMin > item.endMin;
            const active = nowMin >= item.startMin && nowMin <= item.endMin;
            let pct = done ? 100 : active ? Math.round(((nowMin - item.startMin)/(item.endMin - item.startMin))*100) : 0;

            const div = document.createElement('div');
            div.className = 'schedule-item';
            div.innerHTML = `
                <div class="si-icon">${item.icon}</div>
                <div class="si-info">
                    <div class="si-title">${item.title}</div>
                    <div class="si-time">${item.startTime} – ${item.endTime}</div>
                    <div class="si-progress"><div class="si-progress-fill" style="width:${pct}%"></div></div>
                </div>
                ${done ? '<div class="si-check">✓</div>' : ''}
                <button onclick="removeScheduleItem(${i})" style="background:none;border:none;color:var(--border-color);cursor:pointer;font-size:0.8rem;" title="Remove">✕</button>
            `;
            container.appendChild(div);
        });
    }

    window.removeScheduleItem = function(i) {
        schedule.splice(i, 1);
        Storage.writeJSON('wb-schedule', schedule);
        renderSchedule();
    };

    document.getElementById('sw-add-btn').addEventListener('click', () => App.openModal('modal-schedule'));

    document.getElementById('sw-save-btn').addEventListener('click', () => {
        const title = document.getElementById('sw-item-title').value.trim();
        const startTime = document.getElementById('sw-item-start').value;
        const endTime = document.getElementById('sw-item-end').value;
        const icon = document.getElementById('sw-item-icon').value;
        if (!title || !startTime || !endTime) return alert('Please fill all fields');

        const [sh,sm] = startTime.split(':').map(Number);
        const [eh,em] = endTime.split(':').map(Number);

        schedule.push({ title, icon, startTime, endTime, startMin: sh*60+sm, endMin: eh*60+em });
        Storage.writeJSON('wb-schedule', schedule);
        renderSchedule();
        App.closeModal('modal-schedule');
        document.getElementById('sw-item-title').value = '';
    });

    renderSchedule();
    setInterval(renderSchedule, 60000); // Update every minute

    // Auto-open modal if arriving from dashboard via hash link
    const hash = window.location.hash;
    if (hash === '#timer') App.openModal('modal-timer');
    else if (hash === '#random') App.openModal('modal-random');

    // ===================== TEXT-TO-SPEECH =====================
    function setupTTS(inputId, voiceId, rateId, speakBtnId, stopBtnId) {
        const synth = window.speechSynthesis;
        let voices = [];
        function loadVoices() {
            voices = synth.getVoices();
            const sel = document.getElementById(voiceId);
            if (!sel) return;
            sel.innerHTML = '';
            voices.forEach((v, i) => {
                const opt = document.createElement('option');
                opt.value = i; opt.textContent = v.name + ' (' + v.lang + ')';
                sel.appendChild(opt);
            });
        }
        synth.onvoiceschanged = loadVoices;
        loadVoices();

        const speakBtn = document.getElementById(speakBtnId);
        const stopBtn = document.getElementById(stopBtnId);
        if (speakBtn) speakBtn.addEventListener('click', () => {
            synth.cancel();
            const text = document.getElementById(inputId).value;
            if (!text) return;
            const utter = new SpeechSynthesisUtterance(text);
            const sel = document.getElementById(voiceId);
            if (sel && voices[sel.value]) utter.voice = voices[sel.value];
            const rate = document.getElementById(rateId);
            if (rate) utter.rate = parseFloat(rate.value);
            synth.speak(utter);
        });
        if (stopBtn) stopBtn.addEventListener('click', () => synth.cancel());
    }

    setupTTS('tts-text-area', 'tts-voice-select', 'tts-rate', 'tts-speak-btn', 'tts-stop-btn');
    setupTTS('tts-input', 'tts-voice-select2', 'tts-rate2', 'tts-speak2', 'tts-stop2');

    // ===================== TOOLS PANEL =====================
    const toolsData = {
        classroom: [
            { icon: '🚦', name: 'Traffic Light', action: () => App.openModal('modal-traffic') },
            { icon: '🎤', name: 'Sound Meter', action: () => App.openModal('modal-sound') },
            { icon: '⏱️', name: 'Timer', action: () => App.openModal('modal-timer') },
            { icon: '🙋', name: 'Name Picker', action: () => App.openModal('modal-namepick') },
            { icon: '📋', name: 'Attendance', action: () => App.openModal('modal-attendance') },
            { icon: '👥', name: 'Group Maker', action: () => { App.openModal('modal-random'); document.querySelector('[data-rtab="group"]').click(); }},
        ],
        randomizers: [
            { icon: '🙋', name: 'Student Picker', action: () => App.openModal('modal-namepick') },
            { icon: '👥', name: 'Group Maker', action: () => { App.openModal('modal-random'); document.querySelector('[data-rtab="group"]').click(); }},
            { icon: '🎡', name: 'Spin Wheel', action: () => { App.openModal('modal-random'); document.querySelector('[data-rtab="wheel"]').click(); }},
        ],
        lessons: [
            { icon: '📝', name: 'QR Code', action: () => App.openModal('modal-qr') },
            { icon: '🔊', name: 'Text-to-Speech', action: () => App.openModal('modal-tts') },
            { icon: '🎬', name: 'Video Player', action: () => { App.openModal('modal-media'); document.querySelector('[data-tab="media-videos"]')?.click(); }},
            { icon: '🖼️', name: 'Image Search', action: () => App.openModal('modal-media') },
        ],
        games: [
            { icon: '🎡', name: 'Spin Wheel', action: () => { App.openModal('modal-random'); document.querySelector('[data-rtab="wheel"]').click(); }},
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
            { icon: '⏳', name: 'Hourglass', action: () => App.openModal('modal-timer') },
        ],
        money: [
            { icon: '🪙', name: 'Coin Mat', action: () => App.openModal('modal-money') },
            { icon: '🛒', name: 'Shopping Cart', action: () => App.openModal('modal-shopping') },
        ],
    };

    function renderToolsGrid(category) {
        const grid = document.getElementById('tp-tools-grid');
        grid.innerHTML = '';
        const tools = toolsData[category] || [];
        tools.forEach(t => {
            const card = document.createElement('div');
            card.className = 'tp-tool-card';
            card.innerHTML = `<span class="tp-tool-icon">${t.icon}</span><span class="tp-tool-name">${t.name}</span>`;
            card.addEventListener('click', t.action);
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
    function saveCanvasState() {
        undoStack.push(canvas.toDataURL());
        if (undoStack.length > 30) undoStack.shift();
        redoStack = [];
    }
    // Save initial blank state
    saveCanvasState();

    canvas.addEventListener('mouseup', () => { if (currentTool === 'pen' || currentTool === 'eraser') saveCanvasState(); });
    canvas.addEventListener('touchend', () => { if (currentTool === 'pen' || currentTool === 'eraser') saveCanvasState(); });

    document.getElementById('btn-undo').addEventListener('click', () => {
        if (undoStack.length <= 1) return;
        redoStack.push(undoStack.pop());
        const img = new Image();
        img.onload = () => { ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0); };
        img.src = undoStack[undoStack.length - 1];
    });
    document.getElementById('btn-redo').addEventListener('click', () => {
        if (redoStack.length === 0) return;
        const state = redoStack.pop();
        undoStack.push(state);
        const img = new Image();
        img.onload = () => { ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0); };
        img.src = state;
    });

    // ===================== PART 2: RANDOM STUDENT (in Randomizer modal) =====================
    document.getElementById('rand-pick-btn').addEventListener('click', () => {
        const display = document.getElementById('rand-student-display');
        display.textContent = '';
        let count = 0;
        const shuffleInt = setInterval(() => {
            display.textContent = getStudentNames()[Math.floor(Math.random() * getStudentNames().length)];
            count++;
            if (count > 15) {
                clearInterval(shuffleInt);
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
        output.innerHTML = groups.map((g, i) => `
            <div class="group-box" style="border-left:4px solid ${colors[i % colors.length]}">
                <div class="group-title" style="color:${colors[i % colors.length]}">Group ${i + 1}</div>
                ${g.map(m => `<div class="group-member">${m}</div>`).join('')}
            </div>
        `).join('');
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
        const spinSpeed = 0.2 + Math.random() * 0.15;
        let speed = spinSpeed;
        const decel = 0.997;
        const result = document.getElementById('spin-result');
        result.textContent = '🎰 Spinning...';

        function animate() {
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

    // ===================== PART 2: TEXT TOOL =====================
    const widgetsLayer = document.getElementById('widgets-layer');

    function createTextOverlay(x, y) {
        const div = document.createElement('div');
        div.className = 'text-overlay';
        div.style.left = x + 'px';
        div.style.top = y + 'px';
        div.style.pointerEvents = 'all';
        div.innerHTML = `<textarea placeholder="Type here..." rows="2"></textarea><button class="text-delete">✕</button>`;

        // Drag support
        let isDrag = false, dragOffX = 0, dragOffY = 0;
        div.addEventListener('mousedown', e => {
            if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') return;
            isDrag = true;
            dragOffX = e.clientX - div.offsetLeft;
            dragOffY = e.clientY - div.offsetTop;
        });
        document.addEventListener('mousemove', e => {
            if (!isDrag) return;
            div.style.left = (e.clientX - dragOffX) + 'px';
            div.style.top = (e.clientY - dragOffY) + 'px';
        });
        document.addEventListener('mouseup', () => isDrag = false);

        div.querySelector('.text-delete').addEventListener('click', () => div.remove());
        widgetsLayer.appendChild(div);
        div.querySelector('textarea').focus();
    }

    // Text tool from bottom bar
    const bbText = document.getElementById('bb-text');
    if (bbText) bbText.addEventListener('click', () => {
        currentTool = 'text';
        document.querySelectorAll('.draw-tool').forEach(b => b.classList.remove('active'));
        document.getElementById('tool-text').classList.add('active');
        updateCanvasCursor();
    });

    canvas.addEventListener('click', (e) => {
        if (currentTool === 'text') {
            createTextOverlay(e.offsetX, e.offsetY);
        }
    });

    // ===================== PART 2: SHAPES TOOL =====================
    let currentShape = 'rect';
    let shapeStartX = 0, shapeStartY = 0, shapeDrawing = false;
    let shapePreviewData = null;

    const shapesSubmenu = document.getElementById('shapes-submenu');
    document.getElementById('tool-shapes').addEventListener('click', (e) => {
        e.stopPropagation();
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
            currentTool = 'shapes';
            document.querySelectorAll('.draw-tool').forEach(b => b.classList.remove('active'));
            document.getElementById('tool-shapes').classList.add('active');
            shapesSubmenu.classList.add('hidden');
            updateCanvasCursor();
        });
    });

    canvas.addEventListener('mousedown', (e) => {
        if (currentTool !== 'shapes') return;
        shapeDrawing = true;
        shapeStartX = e.offsetX;
        shapeStartY = e.offsetY;
        shapePreviewData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    });
    canvas.addEventListener('mousemove', (e) => {
        if (!shapeDrawing || currentTool !== 'shapes') return;
        ctx.putImageData(shapePreviewData, 0, 0);
        const color = document.getElementById('color-picker').value;
        const lw = document.getElementById('brush-size').value;
        ctx.strokeStyle = color;
        ctx.lineWidth = lw;
        ctx.lineCap = 'round';
        ctx.globalCompositeOperation = 'source-over';
        drawShape(ctx, currentShape, shapeStartX, shapeStartY, e.offsetX, e.offsetY);
    });
    canvas.addEventListener('mouseup', (e) => {
        if (!shapeDrawing || currentTool !== 'shapes') return;
        shapeDrawing = false;
        saveCanvasState();
    });

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
    new MutationObserver(() => {
        if (!clockModal.classList.contains('hidden')) {
            drawAnalogClock();
            clockInterval = setInterval(drawAnalogClock, 1000);
        } else {
            clearInterval(clockInterval);
        }
    }).observe(clockModal, { attributes: true, attributeFilter: ['class'] });

    // ===================== PART 2: STOPWATCH =====================
    let swTime = 0, swRunning = false, swInterval = null, swLaps = [];
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
        swRunning = false;
        clearInterval(swInterval);
        swTime = 0;
        swLaps = [];
        updateSWDisplay();
        document.getElementById('sw-laps').innerHTML = '';
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

    // ===================== PART 2: MORE TOOLS TOGGLE =====================
    const bbMore = document.getElementById('bb-more');
    const toolsPanel = document.getElementById('wb-tools-panel');
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

    function initAttendance() {
        if (!attGrid) return;
        attGrid.innerHTML = '';
        const list = getStudentData();
        
        list.forEach(s => {
            const card = document.createElement('div');
            card.className = 'att-card';
            card.dataset.status = 'none';
            card.innerHTML = `
                <div class="att-avatar" style="background: ${s.color || '#6366f1'}; color: ${typeof getContrastColor === 'function' ? getContrastColor(s.color || '#6366f1') : '#fff'}">${s.initials || s.name.substring(0,2)}</div>
                <div class="att-name">${s.name}</div>
                <div class="att-btns">
                    <button class="att-btn p" title="Present">P</button>
                    <button class="att-btn a" title="Absent">A</button>
                    <button class="att-btn l" title="Late">L</button>
                </div>
            `;
            
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
        setTimeout(() => {
            btn.textContent = oldText;
            btn.style.background = '';
        }, 2000);
    });

    initAttendance();

    document.getElementById('att-pick-btn')?.addEventListener('click', () => {
        const presentCards = Array.from(document.querySelectorAll('.att-card')).filter(c => c.dataset.status === 'present');
        if (presentCards.length === 0) {
            alert("There are no present students to pick from.");
            return;
        }
        const randomCard = presentCards[Math.floor(Math.random() * presentCards.length)];
        const studentName = randomCard.querySelector('.att-name').textContent;
        alert(`Random Present Student: ${studentName}`);
    });

    // ===================== PART 3: CHARTS =====================
    let chartType = 'bar';
    const chartCanvas = document.getElementById('chart-canvas');
    const chartRows = document.getElementById('chart-data-rows');

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

    // ===================== PART 3: TEN FRAME =====================
    let tfColor = 'red';
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

    // ===================== PART 3: THERMOMETER =====================
    const thermoLiquid = document.getElementById('thermo-liquid');
    const thermoSlider = document.getElementById('thermo-slider');
    const thermoValDisplay = document.getElementById('thermo-val');
    const thermoUnitDisplay = document.getElementById('thermo-unit');
    let thermoUnit = 'C';

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

    // Helper for Draggable Elements
    // makeDraggable is now provided by WhiteboardApp alias above

    // ===================== PART 3: MONEY TOOL =====================
    const moneyItemsLayer = document.getElementById('money-items-layer');
    const moneyTotalVal = document.getElementById('money-total-val');
    let moneyTotal = 0;

    function addCoinToMat(val, html, isBill) {
        const clone = document.createElement('div');
        clone.className = isBill ? 'mat-bill' : 'mat-coin';
        clone.innerHTML = html;
        clone.dataset.value = val;
        clone.style.position = 'absolute';
        
        const matRect = document.querySelector('.money-mat').getBoundingClientRect();
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
        
        const hint = document.querySelector('.mat-hint');
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

    const moneyMat = document.querySelector('.money-mat');
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
        moneyItemsLayer.innerHTML = '';
        moneyTotal = 0;
        updateMoneyTotal();
        const hint = document.querySelector('.mat-hint');
        if (hint) hint.style.display = 'block';
    });

    // ===================== PART 3: RULER TOOL =====================
    const ruler = document.getElementById('ruler-tool');
    let rulerRotation = 0;


    // Ruler is now exclusively opened via toolsData action


    ruler?.querySelector('.ruler-close').addEventListener('click', () => ruler.classList.add('hidden'));
    
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
            };
            
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

    console.log('✅ Teacherstack Whiteboard Part 3 Tools Initialized');
    console.log('✅ Teacherstack Whiteboard Parts 1 & 2 Initialized');
    // Initialize draggables
    const scheduleWidget = document.getElementById('schedule-widget');
    if (scheduleWidget) {
        App.makeDraggable(scheduleWidget, scheduleWidget.querySelector('.sw-header'));
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
