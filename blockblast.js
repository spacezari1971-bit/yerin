/**
 * 뚱의 홈페이지 - 훈남 블록블라스트 (Block Blast!) 엔진
 * 잘생긴 남자 사진 블록 적용, 8x8 그리드 블록 퍼즐, 드래그 & 터치 지원, 라인 클리어, 콤보 시스템, Web Audio 합성 사운드
 */

class BlockBlastGame {
  constructor(options = {}) {
    this.boardEl = document.getElementById(options.boardId || 'bbBoard');
    this.dockEl = document.getElementById(options.dockId || 'bbDock');
    this.particlesCanvas = document.getElementById(options.canvasId || 'bbParticleCanvas');
    
    // UI Elements
    this.scoreEl = document.getElementById(options.scoreId || 'bbScore');
    this.highScoreEl = document.getElementById(options.highScoreId || 'bbHighScore');
    this.comboBadgeEl = document.getElementById(options.comboBadgeId || 'bbComboBadge');
    this.comboCountEl = document.getElementById(options.comboCountId || 'bbComboCount');
    this.statLinesEl = document.getElementById(options.statLinesId || 'bbStatLines');
    this.statMaxComboEl = document.getElementById(options.statMaxComboId || 'bbStatMaxCombo');
    this.statBlocksEl = document.getElementById(options.statBlocksId || 'bbStatBlocks');
    this.statTierEl = document.getElementById(options.statTierId || 'bbStatTier');
    
    // Modal Elements
    this.modalEl = document.getElementById(options.modalId || 'bbGameOverModal');
    this.modalScoreEl = document.getElementById(options.modalScoreId || 'bbModalScore');
    this.modalHighScoreEl = document.getElementById(options.modalHighScoreId || 'bbModalHighScore');
    this.modalNewRecordBadge = document.getElementById(options.modalNewRecordId || 'bbModalNewRecord');
    this.modalLinesEl = document.getElementById(options.modalLinesId || 'bbModalLines');
    this.modalMaxComboEl = document.getElementById(options.modalMaxComboId || 'bbModalMaxCombo');
    this.modalRestartBtn = document.getElementById(options.modalRestartId || 'bbModalRestartBtn');
    
    if (!this.boardEl || !this.dockEl) {
      console.warn('BlockBlastGame: board or dock element missing.');
      return;
    }

    // Grid config
    this.gridSize = 8;
    this.board = Array(this.gridSize).fill(null).map(() => Array(this.gridSize).fill(0));
    
    // Game States
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.totalLines = 0;
    this.totalPlaced = 0;
    this.gameOver = false;
    this.soundEnabled = true;
    
    // Handsome Men Avatars (4 distinct handsome Korean men)
    this.manCount = 4;
    
    // Dock pieces (up to 3)
    this.dockPieces = [null, null, null];
    this.selectedPieceIndex = null;
    
    // Drag state
    this.isDragging = false;
    this.draggedPieceIndex = null;
    this.dragAvatar = null;
    this.activePointerId = null;
    this.lastGhostPlacement = null; // {r, c, valid}

    // Audio setup
    this.initAudio();
    this.loadSettings();

    // Particle system setup
    this.particles = [];
    this.floatingScores = [];
    this.initParticles();

    // Setup Shape definitions & palette
    this.initShapeLibrary();

    // Build DOM
    this.buildBoardDOM();
    this.initEventListeners();
    
    // Start game
    this.restart();
  }

  /* ================== SHAPE LIBRARY ================== */
  initShapeLibrary() {
    this.colors = {
      gold: { name: 'gold', hex: '#f59e0b', light: '#fbbf24', dark: '#b45309', glow: 'rgba(245, 158, 11, 0.45)' },
      cyan: { name: 'cyan', hex: '#06b6d4', light: '#38bdf8', dark: '#0e7490', glow: 'rgba(6, 182, 212, 0.45)' },
      emerald: { name: 'emerald', hex: '#10b981', light: '#34d399', dark: '#047857', glow: 'rgba(16, 185, 129, 0.45)' },
      ruby: { name: 'ruby', hex: '#ef4444', light: '#f87171', dark: '#b91c1c', glow: 'rgba(239, 68, 68, 0.45)' },
      purple: { name: 'purple', hex: '#8b5cf6', light: '#a78bfa', dark: '#6d28d9', glow: 'rgba(139, 92, 246, 0.45)' },
      orange: { name: 'orange', hex: '#f97316', light: '#fb923c', dark: '#c2410c', glow: 'rgba(249, 115, 22, 0.45)' },
      pink: { name: 'pink', hex: '#ec4899', light: '#f472b6', dark: '#be185d', glow: 'rgba(236, 72, 153, 0.45)' },
      blue: { name: 'blue', hex: '#3b82f6', light: '#60a5fa', dark: '#1d4ed8', glow: 'rgba(59, 130, 246, 0.45)' },
    };

    this.shapes = [
      // 1x1 Dot
      { matrix: [[1]], color: 'gold' },
      
      // 1x2 Lines
      { matrix: [[1, 1]], color: 'cyan' },
      { matrix: [[1], [1]], color: 'cyan' },
      
      // 1x3 Lines
      { matrix: [[1, 1, 1]], color: 'cyan' },
      { matrix: [[1], [1], [1]], color: 'cyan' },
      
      // 1x4 Lines
      { matrix: [[1, 1, 1, 1]], color: 'blue' },
      { matrix: [[1], [1], [1], [1]], color: 'blue' },

      // 1x5 Lines
      { matrix: [[1, 1, 1, 1, 1]], color: 'blue' },
      { matrix: [[1], [1], [1], [1], [1]], color: 'blue' },

      // 2x2 Square
      { matrix: [[1, 1], [1, 1]], color: 'orange' },

      // 3x3 Square
      { matrix: [[1, 1, 1], [1, 1, 1], [1, 1, 1]], color: 'ruby' },

      // 2x3 Rectangles
      { matrix: [[1, 1, 1], [1, 1, 1]], color: 'emerald' },
      { matrix: [[1, 1], [1, 1], [1, 1]], color: 'emerald' },

      // Small 2x2 Corners (3 cells)
      { matrix: [[1, 1], [1, 0]], color: 'purple' },
      { matrix: [[1, 1], [0, 1]], color: 'purple' },
      { matrix: [[1, 0], [1, 1]], color: 'purple' },
      { matrix: [[0, 1], [1, 1]], color: 'purple' },

      // Large 3x3 Corners (5 cells)
      { matrix: [[1, 1, 1], [1, 0, 0], [1, 0, 0]], color: 'gold' },
      { matrix: [[1, 1, 1], [0, 0, 1], [0, 0, 1]], color: 'gold' },
      { matrix: [[1, 0, 0], [1, 0, 0], [1, 1, 1]], color: 'gold' },
      { matrix: [[0, 0, 1], [0, 0, 1], [1, 1, 1]], color: 'gold' },

      // L-shapes (3x2, 4 cells)
      { matrix: [[1, 0], [1, 0], [1, 1]], color: 'pink' },
      { matrix: [[0, 1], [0, 1], [1, 1]], color: 'pink' },
      { matrix: [[1, 1], [1, 0], [1, 0]], color: 'pink' },
      { matrix: [[1, 1], [0, 1], [0, 1]], color: 'pink' },
      { matrix: [[1, 1, 1], [1, 0, 0]], color: 'pink' },
      { matrix: [[1, 1, 1], [0, 0, 1]], color: 'pink' },
      { matrix: [[1, 0, 0], [1, 1, 1]], color: 'pink' },
      { matrix: [[0, 0, 1], [1, 1, 1]], color: 'pink' },

      // T-shapes (3x2, 4 cells)
      { matrix: [[1, 1, 1], [0, 1, 0]], color: 'cyan' },
      { matrix: [[0, 1, 0], [1, 1, 1]], color: 'cyan' },
      { matrix: [[1, 0], [1, 1], [1, 0]], color: 'cyan' },
      { matrix: [[0, 1], [1, 1], [0, 1]], color: 'cyan' },

      // Z and S shapes (4 cells)
      { matrix: [[1, 1, 0], [0, 1, 1]], color: 'ruby' },
      { matrix: [[0, 1, 1], [1, 1, 0]], color: 'ruby' },
      { matrix: [[0, 1], [1, 1], [1, 0]], color: 'ruby' },
      { matrix: [[1, 0], [1, 1], [0, 1]], color: 'ruby' },

      // Plus / Cross shape (5 cells)
      { matrix: [[0, 1, 0], [1, 1, 1], [0, 1, 0]], color: 'purple' }
    ];
  }

  /* ================== AUDIO SYNTHESIS ================== */
  initAudio() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioCtx();
    } catch (e) {
      console.warn('Web Audio API not supported', e);
    }
  }

  resumeAudio() {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  playPlaceSound() {
    if (!this.soundEnabled || !this.audioCtx) return;
    this.resumeAudio();
    const now = this.audioCtx.currentTime;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.12);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.13);
  }

  playInvalidSound() {
    if (!this.soundEnabled || !this.audioCtx) return;
    this.resumeAudio();
    const now = this.audioCtx.currentTime;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.linearRampToValueAtTime(110, now + 0.15);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.16);
  }

  playBlastSound(linesCleared, combo) {
    if (!this.soundEnabled || !this.audioCtx) return;
    this.resumeAudio();
    const now = this.audioCtx.currentTime;

    const baseFreqs = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98, 2093.00];
    const comboIndex = Math.min(combo, baseFreqs.length - 1);
    const startFreq = baseFreqs[comboIndex];

    const osc1 = this.audioCtx.createOscillator();
    const gain1 = this.audioCtx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(startFreq, now);
    osc1.frequency.exponentialRampToValueAtTime(startFreq * 1.5, now + 0.3);

    gain1.gain.setValueAtTime(0.4, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain1);
    gain1.connect(this.audioCtx.destination);
    osc1.start(now);
    osc1.stop(now + 0.36);

    const osc2 = this.audioCtx.createOscillator();
    const gain2 = this.audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(startFreq * 1.25, now + 0.05);
    osc2.frequency.exponentialRampToValueAtTime(startFreq * 2, now + 0.4);

    gain2.gain.setValueAtTime(0.3, now + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc2.connect(gain2);
    gain2.connect(this.audioCtx.destination);
    osc2.start(now + 0.05);
    osc2.stop(now + 0.41);

    this.playNoiseBlast(now, linesCleared);
  }

  playNoiseBlast(startTime, intensity = 1) {
    if (!this.audioCtx) return;
    const bufferSize = this.audioCtx.sampleRate * 0.15;
    const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.audioCtx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200 + intensity * 400, startTime);
    filter.Q.setValueAtTime(2.5, startTime);

    const gain = this.audioCtx.createGain();
    gain.gain.setValueAtTime(0.25, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.audioCtx.destination);

    whiteNoise.start(startTime);
  }

  playGameOverSound() {
    if (!this.soundEnabled || !this.audioCtx) return;
    this.resumeAudio();
    const now = this.audioCtx.currentTime;

    const notes = [440, 392, 349.23, 293.66];
    notes.forEach((freq, idx) => {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      const t = now + idx * 0.15;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  playNewRecordFanfare() {
    if (!this.soundEnabled || !this.audioCtx) return;
    this.resumeAudio();
    const now = this.audioCtx.currentTime;

    const fanfare = [
      { f: 523.25, d: 0.12 },
      { f: 659.25, d: 0.12 },
      { f: 783.99, d: 0.12 },
      { f: 1046.5, d: 0.35 }
    ];

    let t = now;
    fanfare.forEach(note => {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.f, t);

      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + note.d);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(t);
      osc.stop(t + note.d + 0.05);
      t += note.d * 0.85;
    });
  }

  /* ================== DOM INITIALIZATION ================== */
  buildBoardDOM() {
    this.boardEl.innerHTML = '';
    this.cellElements = [];

    for (let r = 0; r < this.gridSize; r++) {
      this.cellElements[r] = [];
      for (let c = 0; c < this.gridSize; c++) {
        const cell = document.createElement('div');
        cell.className = 'bb-cell';
        cell.dataset.r = r;
        cell.dataset.c = c;
        this.boardEl.appendChild(cell);
        this.cellElements[r][c] = cell;
      }
    }
  }

  initParticles() {
    if (!this.particlesCanvas) return;
    this.pCtx = this.particlesCanvas.getContext('2d');
    
    const resizeCanvas = () => {
      const rect = this.boardEl.getBoundingClientRect();
      this.particlesCanvas.width = rect.width;
      this.particlesCanvas.height = rect.height;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const animateParticles = () => {
      this.updateParticles();
      requestAnimationFrame(animateParticles);
    };
    requestAnimationFrame(animateParticles);
  }

  updateParticles() {
    if (!this.pCtx) return;
    this.pCtx.clearRect(0, 0, this.particlesCanvas.width, this.particlesCanvas.height);

    // Update & draw explosion particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.rotation += p.vRot;
      p.alpha -= p.fade;
      p.size = Math.max(0, p.size - p.shrink);

      if (p.alpha <= 0 || p.size <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      this.pCtx.save();
      this.pCtx.translate(p.x, p.y);
      this.pCtx.rotate(p.rotation);
      this.pCtx.globalAlpha = p.alpha;

      if (p.isHeart) {
        // Draw Heart Particle 💖
        this.pCtx.font = `${Math.floor(p.size * 1.4)}px sans-serif`;
        this.pCtx.textAlign = 'center';
        this.pCtx.textBaseline = 'middle';
        this.pCtx.fillText('💖', 0, 0);
      } else {
        this.pCtx.fillStyle = p.color;
        this.pCtx.shadowBlur = 8;
        this.pCtx.shadowColor = p.glow;
        const half = p.size / 2;
        this.pCtx.fillRect(-half, -half, p.size, p.size);
      }
      this.pCtx.restore();
    }

    // Update & draw floating score labels
    for (let i = this.floatingScores.length - 1; i >= 0; i--) {
      const fs = this.floatingScores[i];
      fs.y += fs.vy;
      fs.alpha -= fs.fade;
      fs.scale += fs.vScale;

      if (fs.alpha <= 0) {
        this.floatingScores.splice(i, 1);
        continue;
      }

      this.pCtx.save();
      this.pCtx.translate(fs.x, fs.y);
      this.pCtx.scale(fs.scale, fs.scale);
      this.pCtx.globalAlpha = fs.alpha;
      this.pCtx.font = '800 22px Outfit, "Noto Sans KR", sans-serif';
      this.pCtx.textAlign = 'center';
      this.pCtx.shadowBlur = 12;
      this.pCtx.shadowColor = fs.glow || '#f59e0b';
      this.pCtx.fillStyle = '#ffffff';
      this.pCtx.fillText(fs.text, 0, 0);

      if (fs.subText) {
        this.pCtx.font = '700 15px "Noto Sans KR", sans-serif';
        this.pCtx.fillStyle = '#fde047';
        this.pCtx.fillText(fs.subText, 0, 24);
      }
      this.pCtx.restore();
    }
  }

  spawnCellExplosion(r, c, colorKey) {
    if (!this.particlesCanvas) return;
    const rect = this.boardEl.getBoundingClientRect();
    const cellW = rect.width / this.gridSize;
    const cellH = rect.height / this.gridSize;
    const cx = (c + 0.5) * cellW;
    const cy = (r + 0.5) * cellH;

    const col = this.colors[colorKey] || this.colors.gold;
    const count = 12;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5.5;
      const isHeart = Math.random() < 0.25; // 25% hearts!

      this.particles.push({
        x: cx + (Math.random() - 0.5) * (cellW * 0.5),
        y: cy + (Math.random() - 0.5) * (cellH * 0.5),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        gravity: 0.16,
        size: isHeart ? 14 : 7 + Math.random() * 8,
        shrink: 0.1,
        rotation: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 0.25,
        alpha: 1,
        fade: 0.018 + Math.random() * 0.02,
        color: Math.random() > 0.4 ? col.hex : col.light,
        glow: col.glow,
        isHeart: isHeart
      });
    }
  }

  addFloatingScore(text, subText = '', r = 3, c = 3, colorKey = 'gold') {
    if (!this.particlesCanvas) return;
    const rect = this.boardEl.getBoundingClientRect();
    const cellW = rect.width / this.gridSize;
    const cellH = rect.height / this.gridSize;
    const cx = (c + 0.5) * cellW;
    const cy = (r + 0.5) * cellH;

    const col = this.colors[colorKey] || this.colors.gold;

    this.floatingScores.push({
      text: text,
      subText: subText,
      x: cx,
      y: cy,
      vy: -1.7,
      alpha: 1,
      fade: 0.015,
      scale: 0.8,
      vScale: 0.01,
      glow: col.glow
    });
  }

  /* ================== EVENT LISTENERS ================== */
  initEventListeners() {
    if (this.modalRestartBtn) {
      this.modalRestartBtn.addEventListener('click', () => {
        if (this.modalEl) this.modalEl.classList.remove('show');
        this.restart();
      });
    }

    document.addEventListener('pointermove', (e) => this.onPointerMove(e));
    document.addEventListener('pointerup', (e) => this.onPointerUp(e));
    document.addEventListener('pointercancel', (e) => this.onPointerCancel(e));

    this.boardEl.addEventListener('click', (e) => {
      const cell = e.target.closest('.bb-cell');
      if (!cell || this.selectedPieceIndex === null) return;
      const r = parseInt(cell.dataset.r, 10);
      const c = parseInt(cell.dataset.c, 10);
      this.tryPlaceSelectedPiece(r, c);
    });
  }

  /* ================== DOCK & PIECE GENERATION ================== */
  spawnDockPieces() {
    this.dockPieces = [
      this.getRandomShape(),
      this.getRandomShape(),
      this.getRandomShape()
    ];

    let anyPlaceable = this.dockPieces.some(piece => this.canPlaceAnywhere(piece.matrix));
    if (!anyPlaceable) {
      const friendlyCandidates = this.shapes.filter(s => {
        const rows = s.matrix.length;
        const cols = s.matrix[0].length;
        return rows <= 2 && cols <= 2;
      });
      for (let s of friendlyCandidates) {
        if (this.canPlaceAnywhere(s.matrix)) {
          const piece = JSON.parse(JSON.stringify(s));
          piece.man = Math.floor(Math.random() * this.manCount) + 1;
          this.dockPieces[0] = piece;
          break;
        }
      }
    }

    this.renderDock();
    this.checkGameOver();
  }

  getRandomShape() {
    const idx = Math.floor(Math.random() * this.shapes.length);
    const piece = JSON.parse(JSON.stringify(this.shapes[idx]));
    // Assign a handsome man avatar (1 to 4)
    piece.man = Math.floor(Math.random() * this.manCount) + 1;
    return piece;
  }

  renderDock() {
    this.dockEl.innerHTML = '';
    
    this.dockPieces.forEach((piece, index) => {
      const slot = document.createElement('div');
      slot.className = 'bb-dock-slot';
      slot.dataset.index = index;

      if (piece) {
        const pieceContainer = document.createElement('div');
        pieceContainer.className = 'bb-piece-card';
        pieceContainer.dataset.index = index;

        const playable = this.canPlaceAnywhere(piece.matrix);
        if (!playable) {
          pieceContainer.classList.add('unplayable');
        }

        if (this.selectedPieceIndex === index) {
          pieceContainer.classList.add('selected');
        }

        const matrix = piece.matrix;
        const rows = matrix.length;
        const cols = matrix[0].length;

        const grid = document.createElement('div');
        grid.className = 'bb-piece-grid';
        grid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
        grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const block = document.createElement('div');
            if (matrix[r][c]) {
              block.className = `bb-mini-block bb-color-${piece.color} bb-man-${piece.man}`;
            } else {
              block.className = 'bb-mini-block empty';
            }
            grid.appendChild(block);
          }
        }

        pieceContainer.appendChild(grid);

        pieceContainer.addEventListener('pointerdown', (e) => this.onPiecePointerDown(e, index));

        pieceContainer.addEventListener('click', (e) => {
          if (this.isDragging) return;
          if (this.selectedPieceIndex === index) {
            this.selectedPieceIndex = null;
          } else {
            this.selectedPieceIndex = index;
          }
          this.renderDock();
        });

        slot.appendChild(pieceContainer);
      }

      this.dockEl.appendChild(slot);
    });
  }

  /* ================== DRAG & DROP LOGIC ================== */
  onPiecePointerDown(e, index) {
    if (this.gameOver) return;
    const piece = this.dockPieces[index];
    if (!piece) return;

    e.preventDefault();

    this.isDragging = true;
    this.draggedPieceIndex = index;
    this.activePointerId = e.pointerId;

    this.createDragAvatar(piece, e.clientX, e.clientY);

    const slot = this.dockEl.querySelector(`.bb-dock-slot[data-index="${index}"] .bb-piece-card`);
    if (slot) slot.classList.add('dragging-source');

    this.resumeAudio();
  }

  createDragAvatar(piece, clientX, clientY) {
    if (this.dragAvatar) {
      document.body.removeChild(this.dragAvatar);
    }

    const avatar = document.createElement('div');
    avatar.className = 'bb-drag-avatar';
    
    const boardRect = this.boardEl.getBoundingClientRect();
    const cellSize = boardRect.width / this.gridSize;

    const rows = piece.matrix.length;
    const cols = piece.matrix[0].length;

    avatar.style.width = `${cols * cellSize}px`;
    avatar.style.height = `${rows * cellSize}px`;
    avatar.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
    avatar.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const block = document.createElement('div');
        if (piece.matrix[r][c]) {
          block.className = `bb-avatar-block bb-color-${piece.color} bb-man-${piece.man}`;
        } else {
          block.className = 'bb-avatar-block empty';
        }
        avatar.appendChild(block);
      }
    }

    document.body.appendChild(avatar);
    this.dragAvatar = avatar;

    this.updateAvatarPosition(clientX, clientY, rows, cols, cellSize);
  }

  updateAvatarPosition(clientX, clientY, rows, cols, cellSize) {
    if (!this.dragAvatar) return;
    
    const touchOffset = ('ontouchstart' in window || navigator.maxTouchPoints > 0) ? 65 : 15;
    const left = clientX - (cols * cellSize) / 2;
    const top = clientY - (rows * cellSize) / 2 - touchOffset;

    this.dragAvatar.style.left = `${left}px`;
    this.dragAvatar.style.top = `${top}px`;
  }

  onPointerMove(e) {
    if (!this.isDragging || this.draggedPieceIndex === null || !this.dragAvatar) return;

    const piece = this.dockPieces[this.draggedPieceIndex];
    if (!piece) return;

    const boardRect = this.boardEl.getBoundingClientRect();
    const cellSize = boardRect.width / this.gridSize;
    const rows = piece.matrix.length;
    const cols = piece.matrix[0].length;

    this.updateAvatarPosition(e.clientX, e.clientY, rows, cols, cellSize);

    const avatarRect = this.dragAvatar.getBoundingClientRect();
    const gridTargetC = Math.round((avatarRect.left - boardRect.left) / cellSize);
    const gridTargetR = Math.round((avatarRect.top - boardRect.top) / cellSize);

    this.updateGhostPreview(gridTargetR, gridTargetC, piece);
  }

  updateGhostPreview(targetR, targetC, piece) {
    this.clearGhostHighlights();

    if (targetR < 0 || targetC < 0 || targetR + piece.matrix.length > this.gridSize || targetC + piece.matrix[0].length > this.gridSize) {
      this.lastGhostPlacement = null;
      return;
    }

    const canFit = this.canPlaceAt(piece.matrix, targetR, targetC);
    this.lastGhostPlacement = { r: targetR, c: targetC, valid: canFit };

    for (let r = 0; r < piece.matrix.length; r++) {
      for (let c = 0; c < piece.matrix[0].length; c++) {
        if (piece.matrix[r][c]) {
          const br = targetR + r;
          const bc = targetC + c;
          if (br >= 0 && br < this.gridSize && bc >= 0 && bc < this.gridSize) {
            const cell = this.cellElements[br][bc];
            if (canFit) {
              cell.classList.add('ghost-valid', `ghost-color-${piece.color}`, `bb-man-${piece.man}`);
            } else {
              cell.classList.add('ghost-invalid');
            }
          }
        }
      }
    }

    if (canFit) {
      this.previewBlastHighlights(targetR, targetC, piece.matrix);
    }
  }

  previewBlastHighlights(targetR, targetC, matrix) {
    const tempBoard = this.board.map(row => [...row]);
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[0].length; c++) {
        if (matrix[r][c]) {
          tempBoard[targetR + r][targetC + c] = 1;
        }
      }
    }

    // Full rows
    for (let r = 0; r < this.gridSize; r++) {
      if (tempBoard[r].every(v => v !== 0 && v !== null)) {
        for (let c = 0; c < this.gridSize; c++) {
          this.cellElements[r][c].classList.add('ghost-blast-line');
        }
      }
    }

    // Full cols
    for (let c = 0; c < this.gridSize; c++) {
      let full = true;
      for (let r = 0; r < this.gridSize; r++) {
        if (!tempBoard[r][c]) { full = false; break; }
      }
      if (full) {
        for (let r = 0; r < this.gridSize; r++) {
          this.cellElements[r][c].classList.add('ghost-blast-line');
        }
      }
    }
  }

  clearGhostHighlights() {
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        const cell = this.cellElements[r][c];
        const val = this.board[r][c];
        if (val && typeof val === 'object') {
          cell.className = `bb-cell filled bb-color-${val.color} bb-man-${val.man}`;
        } else {
          cell.className = 'bb-cell';
        }
      }
    }
  }

  onPointerUp(e) {
    if (!this.isDragging) return;

    const pieceIndex = this.draggedPieceIndex;

    if (this.dragAvatar && this.dragAvatar.parentNode) {
      document.body.removeChild(this.dragAvatar);
    }
    this.dragAvatar = null;
    this.isDragging = false;
    this.draggedPieceIndex = null;

    const slot = this.dockEl.querySelector(`.bb-dock-slot[data-index="${pieceIndex}"] .bb-piece-card`);
    if (slot) slot.classList.remove('dragging-source');

    if (this.lastGhostPlacement && this.lastGhostPlacement.valid) {
      this.placePiece(pieceIndex, this.lastGhostPlacement.r, this.lastGhostPlacement.c);
    } else {
      this.playInvalidSound();
    }

    this.clearGhostHighlights();
    this.lastGhostPlacement = null;
  }

  onPointerCancel(e) {
    if (this.isDragging) {
      if (this.dragAvatar && this.dragAvatar.parentNode) {
        document.body.removeChild(this.dragAvatar);
      }
      this.dragAvatar = null;
      this.isDragging = false;
      this.draggedPieceIndex = null;
      this.clearGhostHighlights();
      this.renderDock();
    }
  }

  /* ================== CLICK TO PLACE ================== */
  tryPlaceSelectedPiece(r, c) {
    if (this.selectedPieceIndex === null) return;
    const piece = this.dockPieces[this.selectedPieceIndex];
    if (!piece) return;

    if (this.canPlaceAt(piece.matrix, r, c)) {
      this.placePiece(this.selectedPieceIndex, r, c);
      this.selectedPieceIndex = null;
    } else {
      this.playInvalidSound();
    }
  }

  /* ================== PLACEMENT & CLEAR LOGIC ================== */
  canPlaceAt(matrix, startR, startC) {
    const rows = matrix.length;
    const cols = matrix[0].length;

    if (startR < 0 || startC < 0 || startR + rows > this.gridSize || startC + cols > this.gridSize) {
      return false;
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (matrix[r][c] && this.board[startR + r][startC + c] !== 0) {
          return false;
        }
      }
    }

    return true;
  }

  canPlaceAnywhere(matrix) {
    const rows = matrix.length;
    const cols = matrix[0].length;

    for (let r = 0; r <= this.gridSize - rows; r++) {
      for (let c = 0; c <= this.gridSize - cols; c++) {
        if (this.canPlaceAt(matrix, r, c)) {
          return true;
        }
      }
    }
    return false;
  }

  placePiece(index, startR, startC) {
    const piece = this.dockPieces[index];
    if (!piece) return;

    let placedCellCount = 0;
    const rows = piece.matrix.length;
    const cols = piece.matrix[0].length;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (piece.matrix[r][c]) {
          // Store both color and handsome man avatar index
          this.board[startR + r][startC + c] = {
            color: piece.color,
            man: piece.man
          };
          placedCellCount++;
          
          const cell = this.cellElements[startR + r][startC + c];
          cell.className = `bb-cell filled bb-color-${piece.color} bb-man-${piece.man} placed-pop`;
          setTimeout(() => cell.classList.remove('placed-pop'), 250);
        }
      }
    }

    this.dockPieces[index] = null;
    this.totalPlaced += placedCellCount;

    const placeScore = placedCellCount * 10;
    this.addScore(placeScore);

    this.playPlaceSound();

    this.checkLineClears(startR + Math.floor(rows / 2), startC + Math.floor(cols / 2));

    if (this.dockPieces.every(p => p === null)) {
      this.spawnDockPieces();
    } else {
      this.renderDock();
      this.checkGameOver();
    }

    this.updateStatsUI();
  }

  checkLineClears(centerR, centerC) {
    const fullRows = [];
    const fullCols = [];

    // Check rows
    for (let r = 0; r < this.gridSize; r++) {
      if (this.board[r].every(v => v !== 0 && v !== null)) {
        fullRows.push(r);
      }
    }

    // Check cols
    for (let c = 0; c < this.gridSize; c++) {
      let isFull = true;
      for (let r = 0; r < this.gridSize; r++) {
        if (!this.board[r][c]) { isFull = false; break; }
      }
      if (isFull) {
        fullCols.push(c);
      }
    }

    const totalLines = fullRows.length + fullCols.length;

    if (totalLines > 0) {
      this.combo++;
      if (this.combo > this.maxCombo) {
        this.maxCombo = this.combo;
      }
      this.totalLines += totalLines;

      const lineBase = totalLines * 100;
      const multiBonus = totalLines >= 4 ? 300 : totalLines >= 3 ? 150 : totalLines >= 2 ? 60 : 0;
      const comboMultiplier = this.combo;
      const earnedScore = (lineBase + multiBonus) * comboMultiplier;

      this.addScore(earnedScore);

      const cellsToClear = new Set();
      fullRows.forEach(r => {
        for (let c = 0; c < this.gridSize; c++) cellsToClear.add(`${r},${c}`);
      });
      fullCols.forEach(c => {
        for (let r = 0; r < this.gridSize; r++) cellsToClear.add(`${r},${c}`);
      });

      // Animate line blasts & particles
      cellsToClear.forEach(key => {
        const [r, c] = key.split(',').map(Number);
        const cellData = this.board[r][c];
        const colorKey = cellData ? cellData.color : 'gold';
        this.spawnCellExplosion(r, c, colorKey);
        
        const cell = this.cellElements[r][c];
        cell.classList.add('blasting');
      });

      this.playBlastSound(totalLines, this.combo);

      // Fun handsome compliments!
      const handsomeCompliments = [
        '💖 심쿵 블라스트!',
        '✨ 존잘 콤보!',
        '🔥 얼굴천재 클리어!',
        '👑 훈남 올클리어!',
        '💫 눈호강 대폭발!'
      ];
      const randomCompliment = handsomeCompliments[Math.floor(Math.random() * handsomeCompliments.length)];

      let comboSubText = randomCompliment;
      if (this.combo > 1) {
        comboSubText = `🔥 COMBO x${this.combo}! ${randomCompliment}`;
      }
      const label = totalLines >= 3 ? `MEGA BLAST! +${earnedScore}` : `+${earnedScore}`;
      this.addFloatingScore(label, comboSubText, centerR, centerC, 'gold');

      setTimeout(() => {
        cellsToClear.forEach(key => {
          const [r, c] = key.split(',').map(Number);
          this.board[r][c] = 0;
          const cell = this.cellElements[r][c];
          cell.className = 'bb-cell';
        });
        this.renderBoard();
        this.renderDock();
        this.checkGameOver();
      }, 200);

    } else {
      this.combo = 0;
    }

    this.updateComboUI();
  }

  renderBoard() {
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        const cell = this.cellElements[r][c];
        const val = this.board[r][c];
        if (val && typeof val === 'object') {
          cell.className = `bb-cell filled bb-color-${val.color} bb-man-${val.man}`;
        } else {
          cell.className = 'bb-cell';
        }
      }
    }
  }

  /* ================== GAME OVER & SCORES ================== */
  checkGameOver() {
    if (this.gameOver) return;

    const remainingPieces = this.dockPieces.filter(p => p !== null);
    if (remainingPieces.length === 0) return;

    const hasPlayable = remainingPieces.some(piece => this.canPlaceAnywhere(piece.matrix));

    if (!hasPlayable) {
      this.triggerGameOver();
    }
  }

  triggerGameOver() {
    this.gameOver = true;
    this.playGameOverSound();

    const prevHighScore = this.getHighScore();
    const isNewRecord = this.score > prevHighScore;
    if (isNewRecord) {
      this.setHighScore(this.score);
      this.playNewRecordFanfare();
      if (window.confetti) {
        window.confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      }
    }

    setTimeout(() => {
      if (this.modalScoreEl) this.modalScoreEl.textContent = this.score.toLocaleString();
      if (this.modalHighScoreEl) this.modalHighScoreEl.textContent = this.getHighScore().toLocaleString();
      if (this.modalLinesEl) this.modalLinesEl.textContent = this.totalLines;
      if (this.modalMaxComboEl) this.modalMaxComboEl.textContent = `x${this.maxCombo}`;
      if (this.modalNewRecordBadge) {
        this.modalNewRecordBadge.style.display = isNewRecord ? 'inline-flex' : 'none';
      }

      if (this.modalEl) {
        this.modalEl.classList.add('show');
      }
    }, 550);
  }

  restart() {
    this.board = Array(this.gridSize).fill(null).map(() => Array(this.gridSize).fill(0));
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.totalLines = 0;
    this.totalPlaced = 0;
    this.gameOver = false;
    this.selectedPieceIndex = null;
    this.particles = [];
    this.floatingScores = [];

    this.renderBoard();
    this.spawnDockPieces();
    this.updateScoreUI();
    this.updateComboUI();
    this.updateStatsUI();

    if (this.modalEl) {
      this.modalEl.classList.remove('show');
    }
  }

  /* ================== SCORE & STATS UI ================== */
  addScore(pts) {
    this.score += pts;
    this.updateScoreUI();
    if (this.score > this.getHighScore()) {
      this.setHighScore(this.score);
    }
  }

  updateScoreUI() {
    if (this.scoreEl) {
      this.scoreEl.textContent = this.score.toLocaleString();
      this.scoreEl.classList.add('bump');
      setTimeout(() => this.scoreEl.classList.remove('bump'), 180);
    }
    if (this.highScoreEl) {
      this.highScoreEl.textContent = this.getHighScore().toLocaleString();
    }
    this.updateTierUI();
  }

  updateComboUI() {
    if (!this.comboBadgeEl) return;
    if (this.combo > 1) {
      this.comboBadgeEl.classList.add('active');
      if (this.comboCountEl) this.comboCountEl.textContent = `x${this.combo}`;
    } else {
      this.comboBadgeEl.classList.remove('active');
    }
  }

  updateStatsUI() {
    if (this.statLinesEl) this.statLinesEl.textContent = this.totalLines;
    if (this.statMaxComboEl) this.statMaxComboEl.textContent = `x${this.maxCombo}`;
    if (this.statBlocksEl) this.statBlocksEl.textContent = this.totalPlaced;
  }

  updateTierUI() {
    if (!this.statTierEl) return;
    let tier = '초보 퍼즐러';
    if (this.score >= 5000) tier = '👑 뚱의 전설';
    else if (this.score >= 3000) tier = '💎 마스터';
    else if (this.score >= 1800) tier = '🔥 콤보 장인';
    else if (this.score >= 800) tier = '⚡ 블록 프로';
    else if (this.score >= 300) tier = '🌱 루키';

    this.statTierEl.textContent = tier;
  }

  /* ================== STORAGE & SETTINGS ================== */
  loadSettings() {
    try {
      const savedSound = localStorage.getItem('ddung_bb_sound');
      if (savedSound !== null) {
        this.soundEnabled = savedSound === 'true';
      }
    } catch (e) {}
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    try {
      localStorage.setItem('ddung_bb_sound', this.soundEnabled.toString());
    } catch (e) {}
    return this.soundEnabled;
  }

  getHighScore() {
    try {
      const saved = localStorage.getItem('ddung_bb_highscore');
      return saved ? parseInt(saved, 10) : 0;
    } catch (e) {
      return 0;
    }
  }

  setHighScore(val) {
    try {
      localStorage.setItem('ddung_bb_highscore', val.toString());
    } catch (e) {}
    if (this.highScoreEl) {
      this.highScoreEl.textContent = val.toLocaleString();
    }
  }
}

// Make accessible globally
window.BlockBlastGame = BlockBlastGame;
