/**
 * 뚱의 홈페이지 - Main App Controller & Interactions
 * 오목(Omok) & 훈남 블록블라스트(Block Blast) 듀얼 게임 허브 제어
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Omok Game Instance
  const omok = new OmokGame('omokCanvas');
  window.currentOmok = omok;

  // Initialize Block Blast Game Instance
  const blockBlast = new BlockBlastGame({
    boardId: 'bbBoard',
    dockId: 'bbDock',
    canvasId: 'bbParticleCanvas',
    scoreId: 'bbScore',
    highScoreId: 'bbHighScore',
    comboBadgeId: 'bbComboBadge',
    comboCountId: 'bbComboCount',
    statLinesId: 'bbStatLines',
    statMaxComboId: 'bbStatMaxCombo',
    statBlocksId: 'bbStatBlocks',
    statTierId: 'bbStatTier',
    modalId: 'bbGameOverModal',
    modalScoreId: 'bbModalScore',
    modalHighScoreId: 'bbModalHighScore',
    modalNewRecordId: 'bbModalNewRecord',
    modalLinesId: 'bbModalLines',
    modalMaxComboId: 'bbModalMaxCombo',
    modalRestartId: 'bbModalRestartBtn'
  });
  window.currentBlockBlast = blockBlast;

  // View Navigation Elements
  const navLinks = document.querySelectorAll('.nav-link[data-target]');
  const views = document.querySelectorAll('.view-section');
  const gameLaunchCard = document.getElementById('gameLaunchCard');
  const heroPlayBtn = document.getElementById('heroPlayBtn');
  const navOmokCta = document.getElementById('navOmokCta');
  const backToHomeBtn = document.getElementById('backToHomeBtn');
  const mainBbHighScore = document.getElementById('mainBbHighScore');

  function updateHomeStats() {
    if (mainBbHighScore && blockBlast) {
      mainBbHighScore.textContent = blockBlast.getHighScore().toLocaleString();
    }
  }

  // Switch View Helper
  function switchView(targetId) {
    views.forEach(view => {
      if (view.id === targetId) {
        view.classList.add('active-view');
      } else {
        view.classList.remove('active-view');
      }
    });

    // Update Nav Active state
    navLinks.forEach(link => {
      if (link.getAttribute('data-target') === targetId) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Handle game resizes & state
    if (targetId === 'view-game' && omok) {
      omok.draw();
    } else if (targetId === 'view-home' && blockBlast) {
      updateHomeStats();
      setTimeout(() => {
        blockBlast.renderBoard();
        blockBlast.renderDock();
        if (blockBlast.particlesCanvas && blockBlast.boardEl) {
          const rect = blockBlast.boardEl.getBoundingClientRect();
          blockBlast.particlesCanvas.width = rect.width;
          blockBlast.particlesCanvas.height = rect.height;
        }
      }, 50);
    }
  }

  // Bind View Switches for Nav Links
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = link.getAttribute('data-target');
      if (target) switchView(target);
    });
  });

  // Nav Brand to Home
  const navBrand = document.querySelector('.nav-brand');
  if (navBrand) {
    navBrand.addEventListener('click', () => switchView('view-home'));
  }

  // Omok View Switches
  if (gameLaunchCard) {
    gameLaunchCard.addEventListener('click', () => switchView('view-game'));
  }
  if (heroPlayBtn) {
    heroPlayBtn.addEventListener('click', () => switchView('view-game'));
  }
  if (navOmokCta) {
    navOmokCta.addEventListener('click', () => switchView('view-game'));
  }
  if (backToHomeBtn) {
    backToHomeBtn.addEventListener('click', () => switchView('view-home'));
  }

  // === Omok Game Control Bindings ===
  const modeBtns = document.querySelectorAll('.mode-btn');
  const aiDiffContainer = document.getElementById('aiDifficultyContainer');
  
  modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      modeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const mode = btn.getAttribute('data-mode');
      omok.mode = mode;
      if (aiDiffContainer) {
        aiDiffContainer.style.display = mode === 'ai' ? 'flex' : 'none';
      }
      omok.restart();
    });
  });

  const diffBtns = document.querySelectorAll('.diff-btn');
  diffBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      diffBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      omok.aiDifficulty = btn.getAttribute('data-diff');
      omok.restart();
    });
  });

  const btnRestart = document.getElementById('btnRestart');
  const btnUndo = document.getElementById('btnUndo');
  const btnSound = document.getElementById('btnSound');
  const modalRestartBtn = document.getElementById('modalRestartBtn');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const victoryModal = document.getElementById('victoryModal');

  if (btnRestart) {
    btnRestart.addEventListener('click', () => omok.restart());
  }
  if (btnUndo) {
    btnUndo.addEventListener('click', () => omok.undo());
  }
  if (btnSound) {
    btnSound.addEventListener('click', () => {
      omok.soundEnabled = !omok.soundEnabled;
      btnSound.classList.toggle('sound-on', omok.soundEnabled);
      btnSound.innerHTML = omok.soundEnabled 
        ? '<span>🔊</span> 착수 효과음 켜짐' 
        : '<span>🔇</span> 착수 효과음 꺼짐';
    });
  }

  if (modalRestartBtn) {
    modalRestartBtn.addEventListener('click', () => omok.restart());
  }
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', () => {
      if (victoryModal) victoryModal.classList.remove('show');
    });
  }

  // === Block Blast Game Control Bindings ===
  const bbBtnRestart = document.getElementById('bbBtnRestart');
  const bbBtnSound = document.getElementById('bbBtnSound');
  const bbModalCloseBtn = document.getElementById('bbModalCloseBtn');
  const bbGameOverModal = document.getElementById('bbGameOverModal');

  if (bbBtnRestart) {
    bbBtnRestart.addEventListener('click', () => blockBlast.restart());
  }
  if (bbBtnSound) {
    bbBtnSound.addEventListener('click', () => {
      const isSound = blockBlast.toggleSound();
      bbBtnSound.classList.toggle('sound-on', isSound);
      bbBtnSound.innerHTML = isSound 
        ? '<span>🔊</span> 효과음 켜짐' 
        : '<span>🔇</span> 효과음 꺼짐';
    });
  }
  if (bbModalCloseBtn) {
    bbModalCloseBtn.addEventListener('click', () => {
      if (bbGameOverModal) bbGameOverModal.classList.remove('show');
    });
  }

  // === Guestbook Logic ===
  const guestbookForm = document.getElementById('guestbookForm');
  const guestbookInput = document.getElementById('guestbookInput');
  const guestbookList = document.getElementById('guestbookList');

  const defaultMessages = [
    { text: "뚱님 안녕하세요! 블록블라스트 훈남 블록 너무 취향저격이에요 💖", time: "방금 전" },
    { text: "블록블라스트 5000점 넘어서 뚱의 전설 티어 달성했습니다 🔥", time: "10분 전" },
    { text: "오목 AI 3단도 재밌고 블록블라스트 손맛 대박입니다!", time: "1시간 전" }
  ];

  function loadGuestbook() {
    let list = [];
    try {
      const saved = localStorage.getItem('ddung_guestbook');
      if (saved) {
        list = JSON.parse(saved);
      } else {
        list = defaultMessages;
        localStorage.setItem('ddung_guestbook', JSON.stringify(list));
      }
    } catch (e) {
      list = defaultMessages;
    }
    renderGuestbook(list);
  }

  function renderGuestbook(list) {
    if (!guestbookList) return;
    guestbookList.innerHTML = '';
    list.forEach(item => {
      const el = document.createElement('div');
      el.className = 'guestbook-item';
      el.innerHTML = `
        <span>${escapeHtml(item.text)}</span>
        <span class="guestbook-item-time">${item.time}</span>
      `;
      guestbookList.appendChild(el);
    });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  if (guestbookForm && guestbookInput) {
    guestbookForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = guestbookInput.value.trim();
      if (!val) return;

      let list = [];
      try {
        const saved = localStorage.getItem('ddung_guestbook');
        list = saved ? JSON.parse(saved) : defaultMessages;
      } catch (e) {
        list = defaultMessages;
      }

      list.unshift({ text: val, time: "방금 전" });
      if (list.length > 20) list.pop();

      try {
        localStorage.setItem('ddung_guestbook', JSON.stringify(list));
      } catch (e) {}

      guestbookInput.value = '';
      renderGuestbook(list);
    });
  }

  loadGuestbook();
  updateHomeStats();
});
