/**
 * 뚱의 홈페이지 - 정통 오목(Gomoku) 엔진 & AI
 */

class OmokGame {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    
    // Board config
    this.size = 15; // 15 x 15
    this.cellSize = 36;
    this.padding = 24;
    this.boardWidth = (this.size - 1) * this.cellSize + this.padding * 2;
    this.boardHeight = this.boardWidth;
    
    this.canvas.width = this.boardWidth;
    this.canvas.height = this.boardHeight;
    
    // Game States
    this.board = Array(this.size).fill(null).map(() => Array(this.size).fill(0)); // 0: empty, 1: Black, 2: White
    this.history = []; // [{r, c, player}]
    this.currentPlayer = 1; // 1: Black (First), 2: White
    this.gameOver = false;
    this.winner = null;
    this.winningLine = null; // [{r, c}, ...]
    
    // Modes
    this.mode = 'ai'; // 'ai' or 'pvp'
    this.aiDifficulty = 'hard'; // 'easy', 'normal', 'hard'
    this.playerColor = 1; // Player is Black (1) in AI mode
    this.soundEnabled = true;
    
    // Hover state
    this.hoverPos = null; // {r, c}
    
    // Audio Context
    this.initAudio();
    
    // Stats
    this.stats = this.loadStats();
    
    // Bindings
    this.initEvents();
    this.draw();
    this.updateStatsUI();
    this.updateTurnUI();
  }

  /* === Audio Synthesis (Realistic Wood Click & Victory Fanfare) === */
  initAudio() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContext();
    } catch (e) {
      console.warn("Web Audio API not supported", e);
    }
  }

  playStoneSound() {
    if (!this.soundEnabled || !this.audioCtx) return;
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    
    const now = this.audioCtx.currentTime;
    
    // Realistic wood "Clack"
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    const filter = this.audioCtx.createBiquadFilter();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.exponentialRampToValueAtTime(300, now + 0.08);
    
    gain.gain.setValueAtTime(0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.audioCtx.destination);
    
    osc.start(now);
    osc.stop(now + 0.1);

    // Subtle snap impact noise
    const bufferSize = this.audioCtx.sampleRate * 0.04;
    const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.audioCtx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = this.audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.2, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    
    noise.connect(noiseGain);
    noiseGain.connect(this.audioCtx.destination);
    noise.start(now);
  }

  playWinSound() {
    if (!this.soundEnabled || !this.audioCtx) return;
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      const now = this.audioCtx.currentTime + idx * 0.1;
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      
      osc.start(now);
      osc.stop(now + 0.5);
    });
  }

  /* === Event Listeners === */
  initEvents() {
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mouseleave', () => this.handleMouseLeave());
    this.canvas.addEventListener('click', (e) => this.handleClick(e));
    
    // Touch support for mobile
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const scale = this.canvas.width / rect.width;
      const x = (touch.clientX - rect.left) * scale;
      const y = (touch.clientY - rect.top) * scale;
      const coords = this.getGridCoords(x, y);
      if (coords) {
        this.makeMove(coords.r, coords.c);
      }
    }, { passive: false });
  }

  getGridCoords(x, y) {
    const r = Math.round((y - this.padding) / this.cellSize);
    const c = Math.round((x - this.padding) / this.cellSize);
    if (r >= 0 && r < this.size && c >= 0 && c < this.size) {
      return { r, c };
    }
    return null;
  }

  handleMouseMove(e) {
    if (this.gameOver) return;
    if (this.mode === 'ai' && this.currentPlayer !== this.playerColor) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const scale = this.canvas.width / rect.width;
    const x = (e.clientX - rect.left) * scale;
    const y = (e.clientY - rect.top) * scale;
    
    const coords = this.getGridCoords(x, y);
    if (coords && this.board[coords.r][coords.c] === 0) {
      this.hoverPos = coords;
    } else {
      this.hoverPos = null;
    }
    this.draw();
  }

  handleMouseLeave() {
    this.hoverPos = null;
    this.draw();
  }

  handleClick(e) {
    if (this.gameOver) return;
    if (this.mode === 'ai' && this.currentPlayer !== this.playerColor) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const scale = this.canvas.width / rect.width;
    const x = (e.clientX - rect.left) * scale;
    const y = (e.clientY - rect.top) * scale;
    
    const coords = this.getGridCoords(x, y);
    if (coords) {
      this.makeMove(coords.r, coords.c);
    }
  }

  /* === Core Move Logic === */
  makeMove(r, c) {
    if (this.board[r][c] !== 0 || this.gameOver) return false;
    
    const player = this.currentPlayer;
    this.board[r][c] = player;
    this.history.push({ r, c, player });
    this.hoverPos = null;
    
    this.playStoneSound();
    
    // Check Win
    const winResult = this.checkWin(r, c, player);
    if (winResult) {
      this.gameOver = true;
      this.winner = player;
      this.winningLine = winResult.line;
      this.draw();
      this.handleGameOver(player);
      return true;
    }
    
    // Check Draw
    if (this.history.length === this.size * this.size) {
      this.gameOver = true;
      this.winner = 0;
      this.draw();
      this.handleGameOver(0);
      return true;
    }
    
    // Switch turn
    this.currentPlayer = player === 1 ? 2 : 1;
    this.updateTurnUI();
    this.draw();
    
    // Trigger AI if applicable
    if (this.mode === 'ai' && !this.gameOver && this.currentPlayer !== this.playerColor) {
      setTimeout(() => this.makeAIMove(), 300);
    }
    
    return true;
  }

  /* === 5-in-a-row Win Check === */
  checkWin(r, c, player) {
    const directions = [
      [[0, 1], [0, -1]],   // Horizontal
      [[1, 0], [-1, 0]],   // Vertical
      [[1, 1], [-1, -1]],  // Diagonal \
      [[1, -1], [-1, 1]]   // Anti-Diagonal /
    ];

    for (const dir of directions) {
      const line = [{ r, c }];
      
      for (const [dr, dc] of dir) {
        let nr = r + dr;
        let nc = c + dc;
        while (nr >= 0 && nr < this.size && nc >= 0 && nc < this.size && this.board[nr][nc] === player) {
          line.push({ r: nr, c: nc });
          nr += dr;
          nc += dc;
        }
      }
      
      if (line.length >= 5) {
        return { won: true, line };
      }
    }
    return null;
  }

  /* === Smart Omok AI Heuristics === */
  makeAIMove() {
    if (this.gameOver) return;
    
    const aiPlayer = this.currentPlayer;
    const humanPlayer = this.playerColor;
    
    let bestMove = null;
    
    if (this.history.length === 0) {
      bestMove = { r: 7, c: 7 };
    } else if (this.aiDifficulty === 'easy') {
      bestMove = this.getEasyMove(aiPlayer, humanPlayer);
    } else {
      bestMove = this.getHeuristicMove(aiPlayer, humanPlayer, this.aiDifficulty === 'hard');
    }
    
    if (bestMove) {
      this.makeMove(bestMove.r, bestMove.c);
    }
  }

  getEasyMove(ai, human) {
    // Check immediate win or immediate block, otherwise random near center
    const winMove = this.findWinningMove(ai);
    if (winMove) return winMove;
    const blockMove = this.findWinningMove(human);
    if (blockMove) return blockMove;
    
    const validMoves = [];
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.board[r][c] === 0 && this.hasNeighbor(r, c, 2)) {
          validMoves.push({ r, c });
        }
      }
    }
    return validMoves[Math.floor(Math.random() * validMoves.length)] || { r: 7, c: 7 };
  }

  findWinningMove(player) {
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.board[r][c] === 0) {
          this.board[r][c] = player;
          const win = this.checkWin(r, c, player);
          this.board[r][c] = 0;
          if (win) return { r, c };
        }
      }
    }
    return null;
  }

  hasNeighbor(r, c, dist = 2) {
    for (let dr = -dist; dr <= dist; dr++) {
      for (let dc = -dist; dc <= dist; dc++) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < this.size && nc >= 0 && nc < this.size && this.board[nr][nc] !== 0) {
          return true;
        }
      }
    }
    return false;
  }

  getHeuristicMove(ai, human, isHard = true) {
    let maxScore = -Infinity;
    let bestMoves = [];

    // Prioritize candidates with neighbor stones
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.board[r][c] !== 0) continue;
        if (!this.hasNeighbor(r, c, 2)) continue;

        // Score this candidate
        const aiScore = this.evaluatePoint(r, c, ai);
        const humanScore = this.evaluatePoint(r, c, human);

        // Immediate win gets astronomical score
        if (aiScore >= 100000) return { r, c };
        
        // Defense is heavily weighted in hard mode
        let totalScore = aiScore * (isHard ? 1.1 : 0.9) + humanScore * (isHard ? 1.0 : 0.8);
        
        // Positional bonus for central control
        const centerDist = Math.abs(r - 7) + Math.abs(c - 7);
        totalScore += (14 - centerDist) * 2;

        if (totalScore > maxScore) {
          maxScore = totalScore;
          bestMoves = [{ r, c }];
        } else if (totalScore === maxScore) {
          bestMoves.push({ r, c });
        }
      }
    }

    return bestMoves.length > 0 ? bestMoves[Math.floor(Math.random() * bestMoves.length)] : { r: 7, c: 7 };
  }

  evaluatePoint(r, c, player) {
    let totalScore = 0;
    const directions = [
      [0, 1],   // horizontal
      [1, 0],   // vertical
      [1, 1],   // diagonal \
      [1, -1]   // anti-diagonal /
    ];

    for (const [dr, dc] of directions) {
      let count = 1;
      let openEnds = 0;

      // Positive direction
      let nr = r + dr;
      let nc = c + dc;
      while (nr >= 0 && nr < this.size && nc >= 0 && nc < this.size && this.board[nr][nc] === player) {
        count++;
        nr += dr;
        nc += dc;
      }
      if (nr >= 0 && nr < this.size && nc >= 0 && nc < this.size && this.board[nr][nc] === 0) {
        openEnds++;
      }

      // Negative direction
      nr = r - dr;
      nc = c - dc;
      while (nr >= 0 && nr < this.size && nc >= 0 && nc < this.size && this.board[nr][nc] === player) {
        count++;
        nr -= dr;
        nc -= dc;
      }
      if (nr >= 0 && nr < this.size && nc >= 0 && nc < this.size && this.board[nr][nc] === 0) {
        openEnds++;
      }

      // Heuristic Scoring Matrix
      if (count >= 5) totalScore += 100000;
      else if (count === 4) {
        if (openEnds === 2) totalScore += 10000; // Open 4 (unstoppable)
        else if (openEnds === 1) totalScore += 2500; // Closed 4
      } else if (count === 3) {
        if (openEnds === 2) totalScore += 3000; // Open 3
        else if (openEnds === 1) totalScore += 500;
      } else if (count === 2) {
        if (openEnds === 2) totalScore += 400;
        else if (openEnds === 1) totalScore += 50;
      } else if (count === 1 && openEnds === 2) {
        totalScore += 10;
      }
    }

    return totalScore;
  }

  /* === Undo Move === */
  undo() {
    if (this.history.length === 0 || this.gameOver) return;

    if (this.mode === 'ai') {
      // In AI mode, undo 2 steps (AI's move & Player's move)
      if (this.currentPlayer === this.playerColor) {
        if (this.history.length >= 2) {
          const aiMove = this.history.pop();
          const playerMove = this.history.pop();
          this.board[aiMove.r][aiMove.c] = 0;
          this.board[playerMove.r][playerMove.c] = 0;
        } else if (this.history.length === 1) {
          const single = this.history.pop();
          this.board[single.r][single.c] = 0;
          this.currentPlayer = 1;
        }
      }
    } else {
      // In PvP mode, undo 1 step
      const last = this.history.pop();
      this.board[last.r][last.c] = 0;
      this.currentPlayer = last.player;
    }

    this.winningLine = null;
    this.gameOver = false;
    this.updateTurnUI();
    this.draw();
  }

  /* === Reset / Restart Game === */
  restart() {
    this.board = Array(this.size).fill(null).map(() => Array(this.size).fill(0));
    this.history = [];
    this.currentPlayer = 1;
    this.gameOver = false;
    this.winner = null;
    this.winningLine = null;
    this.hoverPos = null;
    
    // Hide victory modal
    const modal = document.getElementById('victoryModal');
    if (modal) modal.classList.remove('show');
    
    this.updateTurnUI();
    this.draw();
  }

  /* === Game Over Handling === */
  handleGameOver(winner) {
    this.playWinSound();
    
    let winnerText = "";
    let descText = "";
    
    if (winner === 0) {
      winnerText = "무승부 (Draw)";
      descText = "반상에 빈 공간이 모두 채워졌습니다!";
    } else {
      const isBlack = winner === 1;
      const winnerName = isBlack ? "흑돌 (Black)" : "백돌 (White)";
      
      if (this.mode === 'ai') {
        if (winner === this.playerColor) {
          winnerText = "🎉 대승리! (Victory)";
          descText = `멋진 수로 AI를 꺾으셨습니다! (총 ${this.history.length}수)`;
          this.stats.wins++;
        } else {
          winnerText = "패배 (Defeat)";
          descText = "AI가 5목을 완성했습니다. 다음 판에 도전해보세요!";
          this.stats.losses++;
        }
      } else {
        winnerText = `👑 ${winnerName} 승리!`;
        descText = `${winnerName}이 5목을 먼저 달성했습니다! (총 ${this.history.length}수)`;
        if (winner === 1) this.stats.wins++;
        else this.stats.losses++;
      }
    }
    
    this.stats.totalGames++;
    this.saveStats();
    this.updateStatsUI();
    
    // Show Modal
    setTimeout(() => {
      const modal = document.getElementById('victoryModal');
      const titleEl = document.getElementById('modalWinnerTitle');
      const descEl = document.getElementById('modalWinnerDesc');
      if (modal && titleEl && descEl) {
        titleEl.textContent = winnerText;
        descEl.textContent = descText;
        modal.classList.add('show');
        this.triggerConfetti();
      }
    }, 400);
  }

  /* === Stats Storage === */
  loadStats() {
    try {
      const saved = localStorage.getItem('omok_ddung_stats');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return { wins: 0, losses: 0, totalGames: 0 };
  }

  saveStats() {
    try {
      localStorage.setItem('omok_ddung_stats', JSON.stringify(this.stats));
    } catch (e) {}
  }

  updateStatsUI() {
    const totalEl = document.getElementById('statTotalGames');
    const winRateEl = document.getElementById('statWinRate');
    const winLossEl = document.getElementById('statWinLoss');
    
    const winRate = this.stats.totalGames > 0 ? Math.round((this.stats.wins / this.stats.totalGames) * 100) : 0;
    
    if (totalEl) totalEl.textContent = this.stats.totalGames;
    if (winRateEl) winRateEl.textContent = `${winRate}%`;
    if (winLossEl) winLossEl.textContent = `${this.stats.wins}승 ${this.stats.losses}패`;
    
    // Also update main page stats
    const mainTotalEl = document.getElementById('mainTotalGames');
    const mainWinRateEl = document.getElementById('mainWinRate');
    if (mainTotalEl) mainTotalEl.textContent = this.stats.totalGames;
    if (mainWinRateEl) mainWinRateEl.textContent = `${winRate}%`;
  }

  updateTurnUI() {
    const stoneIndicator = document.getElementById('turnStoneIndicator');
    const turnText = document.getElementById('turnText');
    const moveCount = document.getElementById('statMoveCount');
    
    if (moveCount) moveCount.textContent = this.history.length;
    
    if (stoneIndicator && turnText) {
      if (this.currentPlayer === 1) {
        stoneIndicator.className = 'turn-stone black';
        turnText.textContent = this.mode === 'ai' ? '내 차례 (흑돌)' : '흑돌 차례';
      } else {
        stoneIndicator.className = 'turn-stone white';
        turnText.textContent = this.mode === 'ai' ? 'AI 생각 중... (백돌)' : '백돌 차례';
      }
    }
  }

  /* === Canvas Drawing === */
  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 1. Draw Grid Lines
    ctx.strokeStyle = '#5c3a16';
    ctx.lineWidth = 1.2;

    for (let i = 0; i < this.size; i++) {
      const pos = this.padding + i * this.cellSize;
      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(this.padding, pos);
      ctx.lineTo(this.boardWidth - this.padding, pos);
      ctx.stroke();

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(pos, this.padding);
      ctx.lineTo(pos, this.boardHeight - this.padding);
      ctx.stroke();
    }

    // 2. Draw Star Points (화점)
    const starPoints = [
      { r: 3, c: 3 }, { r: 11, c: 3 },
      { r: 7, c: 7 }, // 천원
      { r: 3, c: 11 }, { r: 11, c: 11 }
    ];

    ctx.fillStyle = '#5c3a16';
    for (const pt of starPoints) {
      const x = this.padding + pt.c * this.cellSize;
      const y = this.padding + pt.r * this.cellSize;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Draw Placed Stones
    const stoneRadius = this.cellSize * 0.44;
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const player = this.board[r][c];
        if (player !== 0) {
          const x = this.padding + c * this.cellSize;
          const y = this.padding + r * this.cellSize;
          this.drawStone(ctx, x, y, stoneRadius, player);
        }
      }
    }

    // 4. Highlight Last Move
    if (this.history.length > 0) {
      const lastMove = this.history[this.history.length - 1];
      const lx = this.padding + lastMove.c * this.cellSize;
      const ly = this.padding + lastMove.r * this.cellSize;

      ctx.beginPath();
      ctx.arc(lx, ly, 5, 0, Math.PI * 2);
      ctx.fillStyle = lastMove.player === 1 ? '#eab308' : '#e11d48';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
    }

    // 5. Winning 5-in-a-row Line Glow
    if (this.winningLine && this.winningLine.length >= 5) {
      ctx.save();
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 6;
      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      const first = this.winningLine[0];
      ctx.moveTo(this.padding + first.c * this.cellSize, this.padding + first.r * this.cellSize);
      for (let i = 1; i < this.winningLine.length; i++) {
        const pt = this.winningLine[i];
        ctx.lineTo(this.padding + pt.c * this.cellSize, this.padding + pt.r * this.cellSize);
      }
      ctx.stroke();
      ctx.restore();

      // Highlight winning stones
      for (const pt of this.winningLine) {
        const px = this.padding + pt.c * this.cellSize;
        const py = this.padding + pt.r * this.cellSize;
        ctx.beginPath();
        ctx.arc(px, py, stoneRadius + 2, 0, Math.PI * 2);
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }

    // 6. Draw Translucent Hover Stone Guide
    if (this.hoverPos && !this.gameOver) {
      const hx = this.padding + this.hoverPos.c * this.cellSize;
      const hy = this.padding + this.hoverPos.r * this.cellSize;
      ctx.save();
      ctx.globalAlpha = 0.55;
      this.drawStone(ctx, hx, hy, stoneRadius, this.currentPlayer);
      ctx.restore();
    }
  }

  drawStone(ctx, x, y, radius, player) {
    ctx.save();
    
    // Realistic 3D drop shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 4;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);

    if (player === 1) {
      // Black stone with gloss highlight
      const grad = ctx.createRadialGradient(
        x - radius * 0.3, y - radius * 0.3, radius * 0.1,
        x, y, radius
      );
      grad.addColorStop(0, '#555e6d');
      grad.addColorStop(0.5, '#1e293b');
      grad.addColorStop(1, '#020617');
      ctx.fillStyle = grad;
      ctx.fill();
    } else {
      // White stone with delicate pearl luster
      const grad = ctx.createRadialGradient(
        x - radius * 0.3, y - radius * 0.3, radius * 0.1,
        x, y, radius
      );
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.7, '#e2e8f0');
      grad.addColorStop(1, '#94a3b8');
      ctx.fillStyle = grad;
      ctx.fill();
      
      // Subtle outer ring
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.restore();
  }

  /* === Confetti Fireworks Particle System === */
  triggerConfetti() {
    const canvas = document.getElementById('confettiCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#f59e0b', '#38bdf8', '#ec4899', '#10b981', '#f43f5e', '#a855f7', '#fbbf24'];

    for (let i = 0; i < 120; i++) {
      particles.push({
        x: canvas.width / 2 + (Math.random() * 200 - 100),
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 0.8) * 16,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        gravity: 0.35,
        opacity: 1
      });
    }

    function render() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let active = false;

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.rotation += p.rotationSpeed;
        p.opacity -= 0.008;

        if (p.opacity > 0) {
          active = true;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = Math.max(0, p.opacity);
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        }
      }

      if (active) {
        requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    render();
  }
}

// Global instance export
window.OmokGame = OmokGame;
