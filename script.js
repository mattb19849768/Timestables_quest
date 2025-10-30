/* script.js — Space Times Table Adventure
   Full file with music fades, music toggle, SFX, parallax, comets, modes,
   multiple choice, keypad, avatars, leaderboard, coins, results modal, etc.
   Copy & paste the entire file into script.js
*/

document.addEventListener('DOMContentLoaded', () => {
  // Helper to get elements by id
  const $ = (id) => document.getElementById(id);

  // Canvas elements
  const bgCanvas = $('bgCanvas');
  const cometCanvas = $('cometCanvas');
  const confettiCanvas = $('confettiCanvas');

  // Pages & UI elements
  const statPage = $('statPage');
  const gamePage = $('gamePage');

  const playerSelect = $('playerSelect');
  const newPlayer = $('newPlayer');
  const addPlayerBtn = $('addPlayerBtn');
  const resetPlayersBtn = $('resetPlayers');
  const avatarPicker = $('avatarPicker');

  const tableList = $('tableList');
  const mcToggle = $('mcToggle');

  const startBtn = $('startBtn');
  const leaderboardBtn = $('leaderboardBtn');
  const leaderboardModal = $('leaderboardModal');
  const closeLeaderboard = $('closeLeaderboard');
  const leaderboardList = $('leaderboardList');

  const activePlayerLabel = $('activePlayerLabel');
  const scoreDisplay = $('scoreDisplay');
  const streakDisplay = $('streakDisplay');
  const timeDisplay = $('timeDisplay');
  const questionCounter = $('questionCounter');

  const qText = $('questionText');
  const answersContainer = $('answersContainer');
  const answerInput = $('answerInput');
  const submitBtn = $('submitBtn');
  const keypad = $('keypad');
  const feedback = $('feedback');

  const countdownOverlay = $('countdownOverlay');
  const countdownText = $('countdownText');
  const rocketSVG = $('rocketSVG');

  const resultsModal = $('resultsModal');
  const resultsList = $('resultsList');
  const resultsSummary = $('resultsSummary');
  const closeResults = $('closeResults');
  const saveToLeaderboard = $('saveToLeaderboard');

  const newMissionBtn = $('newMissionBtn');

  const muteBtn = $('muteBtn'); // SFX mute
  // We'll create music toggle UI next to this button dynamically

  const walletDisplay = $('walletDisplay'); // optional

  // Canvas contexts (defensive)
  const bg = bgCanvas?.getContext ? bgCanvas.getContext('2d') : null;
  const cometCtx = cometCanvas?.getContext ? cometCanvas.getContext('2d') : null;
  const conf = confettiCanvas?.getContext ? confettiCanvas.getContext('2d') : null;

  // Resize canvases
  function resizeAll() {
    const dpr = window.devicePixelRatio || 1;
    [bgCanvas, cometCanvas, confettiCanvas].forEach(c => {
      if (!c) return;
      c.style.width = window.innerWidth + 'px';
      c.style.height = window.innerHeight + 'px';
      c.width = Math.round(window.innerWidth * dpr);
      c.height = Math.round(window.innerHeight * dpr);
    });
  }
  window.addEventListener('resize', resizeAll);
  resizeAll();

  /* ===========================
     App state
     =========================== */
  let players = JSON.parse(localStorage.getItem('ttPlayers') || '[]');
  let activeIndex = 0;
  let activePlayer = null;
  let selectedTables = [];
  let mode = 'practice'; // practice | chaos | lightspeed
  let multipleChoice = false;
  let questions = [];
  let currentQ = 0;
  let score = 0;
  let streak = 0;
  let startTime = 0;
  let timerInterval = null;
  let remainingTime = 60;
  let mutedSfx = false; // sfx mute
  let musicOn = true;   // music toggle
  let sessionLog = [];  // logs for results
  let particles = [];   // for emoji burst
  let comets = [];      // comet list
  let stars = [], emojis = [], planets = []; // background

  /* ===========================
     Audio: sfx and music
     =========================== */
  const sfxVolume = 1.0;  // baseline for SFX
  const musicRelative = 0.8; // music plays at 80% of SFX volume

  const SFX = {
    start: new Audio('sounds/start.mp3'),
    countdown: new Audio('sounds/countdown.mp3'),
    correct: new Audio('sounds/correct.mp3'),
    wrong: new Audio('sounds/wrong.mp3'),
    fireworks: new Audio('sounds/fireworks.mp3'),
    coin: new Audio('sounds/coin.mp3'),
  };

  Object.values(SFX).forEach(a => {
    try { a.volume = sfxVolume; a.preload = 'auto'; } catch (e) {}
  });

  // Music files (placeholder names)
  const MUSIC_FILES = ['sounds/music_1.mp3', 'sounds/music_2.mp3'];
  let bgMusic = null;   // Audio object for chosen track
  let bgMusicSrc = null;

  function createMusic(src) {
    try {
      const a = new Audio(src);
      a.loop = true;
      a.preload = 'auto';
      a.volume = Math.max(0, Math.min(1, sfxVolume * musicRelative));
      return a;
    } catch (e) {
      return null;
    }
  }

  function pickRandomMusic() {
    const idx = Math.floor(Math.random() * MUSIC_FILES.length);
    bgMusicSrc = MUSIC_FILES[idx];
    if (bgMusic && typeof bgMusic.pause === 'function') {
      try { bgMusic.pause(); } catch (e) {}
    }
    bgMusic = createMusic(bgMusicSrc);
    return bgMusic;
  }

  function playSfx(name) {
    if (mutedSfx) return;
    const a = SFX[name];
    if (!a) return;
    try {
      a.currentTime = 0;
      a.play().catch(()=>{ /* ignore autoplay rejections; will play after user gesture */ });
    } catch (e) {}
  }

  // Fade utility for audio elements (smoothly change volume)
  function fadeAudio(audio, toVolume, duration = 700) {
    if (!audio) return;
    const steps = Math.max(8, Math.round(duration / 50));
    const stepTime = duration / steps;
    const start = audio.volume;
    const delta = toVolume - start;
    if (audio._fadeInterval) { clearInterval(audio._fadeInterval); audio._fadeInterval = null; }
    let step = 0;
    audio._fadeInterval = setInterval(() => {
      step++;
      const t = step / steps;
      audio.volume = Math.max(0, Math.min(1, start + delta * t));
      if (step >= steps) {
        clearInterval(audio._fadeInterval); audio._fadeInterval = null;
        audio.volume = Math.max(0, Math.min(1, toVolume));
        if (toVolume === 0) {
          try { audio.pause(); } catch(e) {}
        }
      }
    }, stepTime);
  }

  function playMusic() {
    if (!musicOn) return;
    if (!bgMusic) pickRandomMusic();
    if (!bgMusic) return;
    try {
      const targetVol = Math.max(0, Math.min(1, sfxVolume * musicRelative));
      // start from 0 to fade in
      bgMusic.volume = 0;
      bgMusic.play().catch(()=>{ /* may be blocked until user gesture */ });
      fadeAudio(bgMusic, targetVol, 1000);
    } catch(e){}
  }

  function stopMusic() {
    if (!bgMusic) return;
    fadeAudio(bgMusic, 0, 700);
  }

  function pauseMusicImmediate() {
    if (!bgMusic) return;
    if (bgMusic._fadeInterval) { clearInterval(bgMusic._fadeInterval); bgMusic._fadeInterval = null; }
    try { bgMusic.pause(); } catch(e) {}
  }

  // Music toggle UI (create next to muteBtn)
  function createMusicToggleUI() {
    if (!muteBtn || !muteBtn.parentElement) return;
    // avoid adding twice
    if ($('musicBtn')) return;
    const btn = document.createElement('button');
    btn.id = 'musicBtn';
    btn.className = 'btn';
    btn.style.marginLeft = '8px';
    btn.textContent = musicOn ? '🎵' : '🔕';
    muteBtn.parentElement.insertBefore(btn, muteBtn.nextSibling);
    btn.addEventListener('click', () => {
      musicOn = !musicOn;
      btn.textContent = musicOn ? '🎵' : '🔕';
      if (musicOn) {
        if (!bgMusic) pickRandomMusic();
        playMusic();
      } else {
        stopMusic();
      }
    });
    // Add a music volume slider (optional)
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = 0; slider.max = 100; slider.value = Math.round(musicRelative * 100);
    slider.title = 'Music volume';
    slider.style.marginLeft = '8px';
    muteBtn.parentElement.insertBefore(slider, btn.nextSibling);
    slider.addEventListener('input', () => {
      const v = Number(slider.value)/100;
      // adjust musicRelative (affects future picks) and live volume
      // keep sfxVolume constant; only adjust bgMusic volume
      if (bgMusic) {
        fadeAudio(bgMusic, sfxVolume * v, 200);
      }
    });
  }

  // SFX mute toggle wiring
  if (muteBtn) {
    muteBtn.addEventListener('click', () => {
      mutedSfx = !mutedSfx;
      muteBtn.textContent = mutedSfx ? '🔇' : '🔊';
    });
  }
  createMusicToggleUI();

  /* ===========================
     Background parallax (stars, planets, emoji)
     =========================== */
  function initBackground() {
    if (!bgCanvas) return;
    stars = []; emojis = []; planets = [];
    const W = bgCanvas.width, H = bgCanvas.height;
    for (let i=0;i<160;i++) stars.push({ x: Math.random()*W, y: Math.random()*H, r: Math.random()*1.4 + 0.2, speed: 0.02 + Math.random()*0.22 });
    const emojiChars = ['🚀','🛸','👽','🌟','🌕','🪐','🛰','☄️','✨'];
    for (let i=0;i<36;i++) emojis.push({ x: Math.random()*W, y: Math.random()*H, vx:(Math.random()-0.5)*0.22, vy:(Math.random()-0.5)*0.22, char: emojiChars[Math.floor(Math.random()*emojiChars.length)], size: 14 + Math.random()*20 });
    for (let i=0;i<5;i++) planets.push({ x: Math.random()*W, y: Math.random()*H, r: 22 + Math.random()*60, color: `hsl(${Math.random()*360},70%,55%)`, vy: 0.02 + Math.random()*0.08 });
  }
  initBackground();

  function drawBackground() {
    if (!bg) return;
    bg.clearRect(0,0,bgCanvas.width,bgCanvas.height);
    const grad = bg.createLinearGradient(0,0,0,bgCanvas.height);
    grad.addColorStop(0,'#071033'); grad.addColorStop(1,'#000012');
    bg.fillStyle = grad; bg.fillRect(0,0,bgCanvas.width,bgCanvas.height);

    planets.forEach(p => {
      p.y -= p.vy;
      if (p.y < -p.r) p.y = bgCanvas.height + p.r;
      bg.beginPath(); bg.fillStyle = p.color; bg.arc(p.x, p.y, p.r, 0, Math.PI*2); bg.fill();
    });

    bg.fillStyle = 'white';
    stars.forEach(s => {
      bg.beginPath(); bg.arc(s.x, s.y, s.r, 0, Math.PI*2); bg.fill();
      s.y += s.speed; if (s.y > bgCanvas.height + 10) s.y = -10;
    });

    emojis.forEach(e => {
      e.x += e.vx; e.y += e.vy;
      if (e.x < -40) e.x = bgCanvas.width + 40;
      if (e.x > bgCanvas.width + 40) e.x = -40;
      if (e.y < -40) e.y = bgCanvas.height + 40;
      if (e.y > bgCanvas.height + 40) e.y = -40;
      bg.font = `${Math.round(e.size)}px serif`; bg.fillText(e.char, e.x, e.y);
    });

    requestAnimationFrame(drawBackground);
  }
  drawBackground();

  /* ===========================
     Comets spawn (every 5 seconds)
     =========================== */
  function spawnComet(kind='comet') {
    if (!cometCanvas) return;
    const startX = Math.random() * cometCanvas.width;
    const vx = - (2 + Math.random()*6);
    const vy = 0.5 + Math.random()*1.5;
    comets.push({ x: startX, y: -10, vx, vy, len: 40 + Math.random()*80, life: 300, kind });
    if (comets.length > 14) comets.splice(0, comets.length - 12);
  }
  // schedule first spawn then every 5s
  setTimeout(()=>{ spawnComet(Math.random()>0.6 ? 'rocket' : 'comet'); setInterval(()=>spawnComet(Math.random()>0.6 ? 'rocket' : 'comet'), 5000); }, 1200);

  function drawComets() {
    if (!cometCtx) return;
    cometCtx.clearRect(0,0,cometCanvas.width, cometCanvas.height);
    for (let i=comets.length-1;i>=0;i--) {
      const c = comets[i];
      cometCtx.save();
      const angle = Math.atan2(c.vy, c.vx);
      cometCtx.translate(c.x, c.y);
      cometCtx.rotate(angle);
      const tail = Math.max(30, c.len);
      const g = cometCtx.createLinearGradient(0,0,-tail,0);
      g.addColorStop(0,'rgba(255,255,255,0.95)'); g.addColorStop(1,'rgba(255,255,255,0)');
      cometCtx.fillStyle = g;
      cometCtx.beginPath(); cometCtx.moveTo(0,0); cometCtx.lineTo(-tail, -tail*0.12); cometCtx.lineTo(-tail, tail*0.12); cometCtx.closePath(); cometCtx.fill();
      cometCtx.beginPath(); cometCtx.fillStyle = c.kind==='rocket' ? '#ffdd99' : '#fff8cc'; cometCtx.arc(0,0, c.kind==='rocket'?6:4, 0, Math.PI*2); cometCtx.fill();
      cometCtx.restore();

      c.x += c.vx; c.y += c.vy; c.life--;
      if (c.x < -80 || c.life <= 0) comets.splice(i,1);
    }
    requestAnimationFrame(drawComets);
  }
  drawComets();

  /* ===========================
     Particles (emoji sparkles)
     =========================== */
  function spawnEmojiBurst(x,y,count=12,set=['✨','💫','⭐']) {
    for (let i=0;i<count;i++){
      particles.push({ x, y, vx:(Math.random()-0.5)*4, vy:-(1+Math.random()*3), life:30+Math.random()*40, size:16+Math.random()*18, char:set[Math.floor(Math.random()*set.length)] });
    }
    if (particles.length > 800) particles.splice(0, particles.length - 500);
  }

  function drawParticles() {
    if (!conf) return;
    conf.clearRect(0,0,confettiCanvas.width, confettiCanvas.height);
    conf.textBaseline = 'middle';
    for (let i=particles.length-1;i>=0;i--){
      const p = particles[i];
      conf.globalAlpha = Math.max(0, p.life/70);
      conf.font = `${Math.round(p.size)}px serif`;
      conf.fillText(p.char, p.x, p.y);
      p.x += p.vx; p.y += p.vy; p.vy += 0.06; p.life--;
      if (p.life <= 0) particles.splice(i,1);
    }
    conf.globalAlpha = 1;
    requestAnimationFrame(drawParticles);
  }
  drawParticles();

  /* ===========================
     Avatars & players
     =========================== */
  const defaultAvatars = ['🚀','🛸','👽','🌟','🌕','🪐','🛰','☄️','✨','🪄'];
  function renderAvatars() {
    if (!avatarPicker) return;
    avatarPicker.innerHTML = '';
    defaultAvatars.forEach(a => {
      const btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'avatar-choice'; btn.textContent = a;
      btn.addEventListener('click', () => {
        avatarPicker.querySelectorAll('.avatar-choice')?.forEach(x=>x.classList.remove('selected'));
        btn.classList.add('selected');
      });
      avatarPicker.appendChild(btn);
    });
    const first = avatarPicker.querySelector('.avatar-choice');
    if (first) first.classList.add('selected');
  }

  function ensureDefaultPlayer() {
    if (!players || players.length === 0) {
      players = [{ name: 'Player 1', avatar: defaultAvatars[0], lastScore:0, coins:0 }];
      localStorage.setItem('ttPlayers', JSON.stringify(players));
    }
  }

  function refreshPlayers() {
    if (!playerSelect) return;
    playerSelect.innerHTML = '';
    players.forEach((p,i) => {
      const opt = document.createElement('option'); opt.value = i; opt.textContent = `${p.avatar} ${p.name}`;
      playerSelect.appendChild(opt);
    });
    if (players.length) playerSelect.value = 0;
    if (walletDisplay) walletDisplay.textContent = players[0] ? (players[0].coins||0) : 0;
  }

  addPlayerBtn?.addEventListener('click', () => {
    const name = (newPlayer.value || '').trim();
    const sel = avatarPicker?.querySelector('.avatar-choice.selected');
    if (!name) { alert('Enter a name'); return; }
    if (!sel) { alert('Pick an avatar'); return; }
    players.push({ name, avatar: sel.textContent, lastScore: 0, coins: 0 });
    localStorage.setItem('ttPlayers', JSON.stringify(players));
    newPlayer.value = '';
    renderAvatars(); refreshPlayers();
  });

  resetPlayersBtn?.addEventListener('click', ()=>{
    if (!confirm('Clear saved players?')) return;
    players = []; localStorage.removeItem('ttPlayers'); ensureDefaultPlayer(); renderAvatars(); refreshPlayers();
  });

  newPlayer?.addEventListener('keydown', e => { if (e.key === 'Enter') addPlayerBtn.click(); });

  /* ===========================
     Table chips
     =========================== */
  function renderTableChips() {
    if (!tableList) return;
    tableList.innerHTML = '';
    for (let i=1;i<=12;i++){
      const b = document.createElement('button'); b.type='button'; b.className='table-chip'; b.textContent = i;
      b.addEventListener('click', ()=>{ b.classList.toggle('selected'); selectedTables = Array.from(document.querySelectorAll('.table-chip.selected')).map(x=>Number(x.textContent)); });
      tableList.appendChild(b);
    }
  }

  /* ===========================
     Questions generation
     =========================== */
  function generateQuestions() {
    questions = [];
    if (!selectedTables || selectedTables.length === 0) return;
    if (mode === 'practice') {
      selectedTables.forEach(t => { for (let b=1;b<=12;b++) questions.push({ q:`${t} × ${b}`, expected: t*b, t, b }); });
    } else if (mode === 'lightspeed') {
      for (let i=0;i<200;i++){
        const t = selectedTables[Math.floor(Math.random()*selectedTables.length)];
        const b = Math.floor(Math.random()*12)+1;
        questions.push({ q:`${t} × ${b}`, expected: t*b, t, b });
      }
    } else if (mode === 'chaos') {
      for (let i=0;i<50;i++){
        const t = selectedTables[Math.floor(Math.random()*selectedTables.length)];
        const b = Math.floor(Math.random()*12)+1;
        questions.push({ q:`${t} × ${b}`, expected: t*b, t, b });
      }
    }
    // shuffle
    for (let i = questions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random()*(i+1)); [questions[i],questions[j]] = [questions[j],questions[i]];
    }
  }

  /* ===========================
     Topbar update + present question
     =========================== */
  function updateTopbar() {
    const total = (mode==='chaos')?50:((mode==='practice'||mode==='lightspeed')? (selectedTables.length*12):questions.length);
    if (mode === 'lightspeed') questionCounter.textContent = `Question ${Math.max(1, currentQ+1)}`;
    else questionCounter.textContent = `Question ${Math.min(currentQ+1, total)} of ${total}`;
    scoreDisplay.textContent = score; streakDisplay.textContent = streak;
    if (walletDisplay) walletDisplay.textContent = players[Number(playerSelect.value||0)] ? (players[Number(playerSelect.value||0)].coins||0) : 0;
  }

  function presentQuestion() {
    // regen for lightspeed if needed
    if (mode === 'lightspeed' && currentQ >= questions.length - 1) { generateQuestions(); currentQ = 0; }
    if ((mode==='chaos' && currentQ >= 50) || (mode!=='lightspeed' && currentQ >= questions.length)) { finishRound(); return; }
    if (mode==='lightspeed' && remainingTime <= 0) { finishRound(); return; }

    const q = questions[currentQ];
    if (!q) { finishRound(); return; }
    qText.textContent = q.q;
    answersContainer.innerHTML = '';
    feedback.textContent = '';
    updateTopbar();

    if (multipleChoice) {
      // generate 4 options including correct
      const opts = new Set([q.expected]);
      while (opts.size < 4) opts.add(Math.max(1, Math.round(q.expected + (Math.random()*20 - 10))));
      const arr = Array.from(opts);
      for (let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; }
      arr.forEach(v=>{
        const b = document.createElement('button'); b.className='answer-btn'; b.textContent = v;
        b.addEventListener('click', ()=> handleSubmit(String(v)));
        answersContainer.appendChild(b);
      });
      keypad.classList.add('hidden');
      if (answerInput && answerInput.parentElement) answerInput.parentElement.classList.add('hidden');
    } else {
      keypad.classList.remove('hidden');
      if (answerInput && answerInput.parentElement) answerInput.parentElement.classList.remove('hidden');
      answerInput.value = '';
      setTimeout(()=>answerInput.focus(),50);
    }
  }

  /* ===========================
     Normalize & handle answers
     =========================== */
  function normalizeGiven(givenRaw) {
    if (typeof givenRaw === 'number') return givenRaw;
    if (typeof givenRaw === 'string') {
      const t = givenRaw.trim();
      if (/^[+-]?\d+$/.test(t)) return parseInt(t, 10);
      return t;
    }
    return givenRaw;
  }

  function handleSubmit(givenRaw) {
    if (givenRaw === undefined || givenRaw === null) return;
    const q = questions[currentQ];
    if (!q) return;
    const given = normalizeGiven(givenRaw);
    const expected = q.expected;
    let correct = false;
    if (typeof given === 'number' && typeof expected === 'number') correct = (given === expected);
    else correct = (given === expected);
    sessionLog.push({ q: q.q, expected, given, correct, ts: Date.now() });

    if (correct) {
      score++; streak++;
      // award coins
      const idx = Number(playerSelect.value || 0);
      players[idx] = players[idx] || { name: `Player ${idx+1}`, avatar: defaultAvatars[0], lastScore:0, coins:0 };
      players[idx].coins = (players[idx].coins || 0) + 5;
      localStorage.setItem('ttPlayers', JSON.stringify(players));
      // effects
      const rect = qText.getBoundingClientRect();
      spawnEmojiBurst(rect.left + rect.width/2, rect.top + rect.height/2, 12, ['✨','💫','⭐']);
      playSfx('correct'); playSfx('coin');
    } else {
      streak = 0;
      playSfx('wrong');
    }

    updateTopbar();
    currentQ++;
    if (answerInput) { answerInput.value = ''; answerInput.focus(); }

    setTimeout(()=>{
      if (mode === 'lightspeed' && remainingTime <= 0) { finishRound(); return; }
      presentQuestion();
    }, 420);
  }

  submitBtn?.addEventListener('click', ()=>{ if (answerInput.value.trim() !== '') { handleSubmit(answerInput.value.trim()); answerInput.value = ''; } });
  answerInput?.addEventListener('keydown', (e)=>{ if (e.key === 'Enter') { e.preventDefault(); if (answerInput.value.trim() !== '') { handleSubmit(answerInput.value.trim()); answerInput.value=''; } } });

  // Keypad click handling — fixed to prevent double input
  if (keypad) {
    keypad.addEventListener('click', (e)=>{
      const t = e.target;
      if (!t.classList.contains('key')) return;
      e.stopPropagation(); e.preventDefault();
      if (t.classList.contains('blank')) return;
      if (t.classList.contains('back')) { answerInput.value = answerInput.value.slice(0,-1); return; }
      if (t.classList.contains('check')) { if (answerInput.value.trim() !== '') { handleSubmit(answerInput.value.trim()); answerInput.value = ''; } return; }
      const d = t.textContent.trim();
      if (d.length === 1 && /\d/.test(d)) answerInput.value += d;
    });
  }

  /* ===========================
     Countdown & Start sequencing
     =========================== */
  let countdownRunning = false;

  function startCountdownSequence() {
    if (countdownRunning) return;
    countdownRunning = true;
    if (countdownOverlay) countdownOverlay.classList.remove('hidden');
    if (rocketSVG) rocketSVG.style.transform = 'translateY(0)';

    // Play countdown audio once (contains voice 3-2-1-blast)
    playSfx('countdown');

    let c = 3;
    if (countdownText) countdownText.textContent = String(c);
    const iv = setInterval(()=>{
      c--;
      if (c > 0) {
        if (countdownText) countdownText.textContent = String(c);
      } else if (c === 0) {
        if (countdownText) countdownText.textContent = 'Blast Off!';
        if (rocketSVG) rocketSVG.style.transform = 'translateY(-140%)';
      } else {
        clearInterval(iv);
        setTimeout(()=>{
          if (countdownOverlay) countdownOverlay.classList.add('hidden');
          if (rocketSVG) rocketSVG.style.transform = 'translateY(0)';
          countdownRunning = false;
          // resume music with fade
          if (musicOn) { playMusic(); }
          // start gameplay
          startGame();
        }, 900);
      }
    }, 1000);
  }

  function startSequence_playStartThenCountdown() {
    // Disable start button temporarily to avoid double starts
    if (startBtn) { startBtn.disabled = true; startBtn.classList.add('disabled'); }
    // Fade out music and pause so SFX are clear
    if (bgMusic) { fadeAudio(bgMusic, 0, 300); setTimeout(()=>pauseMusicImmediate(), 350); }
    // play start SFX immediately
    playSfx('start');
    // After 2 seconds show countdown & play countdown audio (handled in startCountdownSequence)
    setTimeout(()=>{
      startCountdownSequence();
      // re-enable start after a reasonable time
      setTimeout(()=>{ if (startBtn) { startBtn.disabled = false; startBtn.classList.remove('disabled'); } }, 4200);
    }, 2000);
  }

  /* ===========================
     Start button wiring
     =========================== */
  startBtn?.addEventListener('click', () => {
    if (!bgMusic) pickRandomMusic();
    // validation
    if (!players || players.length === 0) { alert('Add a player first'); return; }
    const selected = Array.from(document.querySelectorAll('.table-chip.selected'));
    if (selected.length === 0) { alert('Select at least one times table'); return; }
    // read mode radio if present (.mode-btn approach optional)
    const modeRadio = document.querySelector('input[name="mode"]:checked');
    if (modeRadio) mode = modeRadio.value;
    multipleChoice = mcToggle && mcToggle.checked;
    // Start sequence: startSfx -> 2s -> countdown -> startGame
    startSequence_playStartThenCountdown();
  });

  /* ===========================
     Start actual gameplay (called after countdown)
     =========================== */
  function startGame() {
    activeIndex = Number(playerSelect.value || 0);
    activePlayer = players[activeIndex] || players[0];
    if (activePlayer && activePlayerLabel) activePlayerLabel.textContent = `${activePlayer.avatar} ${activePlayer.name}`;

    selectedTables = Array.from(document.querySelectorAll('.table-chip.selected')).map(x => Number(x.textContent));
    if (!selectedTables || selectedTables.length === 0) { alert('Select at least one table'); return; }

    score = 0; streak = 0; currentQ = 0; sessionLog = []; remainingTime = 60;
    generateQuestions();
    updateTopbar();

    clearInterval(timerInterval);
    if (mode === 'lightspeed') {
      if (timeDisplay) timeDisplay.textContent = '01:00';
      timerInterval = setInterval(()=>{
        remainingTime--;
        if (timeDisplay) timeDisplay.textContent = `00:${String(remainingTime).padStart(2,'0')}`;
        if (remainingTime <= 0) { clearInterval(timerInterval); finishRound(); }
      }, 1000);
    } else {
      startTime = Date.now();
      timerInterval = setInterval(()=>{
        const elapsed = Math.floor((Date.now() - startTime)/1000);
        if (timeDisplay) timeDisplay.textContent = `${String(Math.floor(elapsed/60)).padStart(2,'0')}:${String(elapsed%60).padStart(2,'0')}`;
      }, 1000);
    }

    if (statPage) statPage.classList.add('hidden');
    if (gamePage) gamePage.classList.remove('hidden');

    // present first q after tiny delay so UI updates
    setTimeout(()=>presentQuestion(), 120);
  }

  /* ===========================
     Finish round & results
     =========================== */
  function finishRound() {
    clearInterval(timerInterval);
    const playedCount = sessionLog.length;
    const allCorrect = (playedCount > 0 && sessionLog.every(s => s.correct) && (mode === 'lightspeed' ? true : playedCount === questions.length));
    if (allCorrect) {
      spawnEmojiBurst(window.innerWidth*0.5, window.innerHeight*0.25, 40, ['☄️','🌟','✨']);
      playSfx('fireworks');
    } else {
      playSfx('fireworks');
    }

    // update lastScore & persist
    if (players[activeIndex]) {
      players[activeIndex].lastScore = score;
      localStorage.setItem('ttPlayers', JSON.stringify(players));
    }

    // reduce music volume (soft) to highlight fireworks, then stop
    if (bgMusic) fadeAudio(bgMusic, Math.max(0.15, sfxVolume * 0.4), 400);
    setTimeout(()=>stopMusic(), 2500);

    // Show results list with Question 1 labels
    resultsList.innerHTML = '';
    resultsSummary.innerHTML = `<div style="font-weight:700;margin-bottom:8px">Score: ${score} — Mode: ${mode}</div>`;
    if (sessionLog.length === 0) {
      const li = document.createElement('li'); li.textContent = 'No answers recorded.'; resultsList.appendChild(li);
    } else {
      sessionLog.forEach((r,i) => {
        const li = document.createElement('li');
        li.innerHTML = `<div style="font-weight:700">Question ${i+1}. ${r.q}</div><div style="opacity:0.9">${r.correct ? '✅' : '❌'} Given: ${r.given} — Answer: ${r.expected}</div>`;
        resultsList.appendChild(li);
      });
    }
    if (resultsModal) resultsModal.classList.remove('hidden');

    // reset lightspeed display
    remainingTime = 60;
    if (timeDisplay) timeDisplay.textContent = '01:00';
  }

  closeResults?.addEventListener('click', ()=>{ if (resultsModal) resultsModal.classList.add('hidden'); if (statPage) statPage.classList.remove('hidden'); if (gamePage) gamePage.classList.add('hidden'); });

  saveToLeaderboard?.addEventListener('click', ()=>{
    if (players[activeIndex]) {
      players[activeIndex].lastScore = score;
      localStorage.setItem('ttPlayers', JSON.stringify(players));
      updateLeaderboard();
      alert('Score saved to player.');
    }
  });

  function updateLeaderboard() {
    if (!leaderboardList) return;
    leaderboardList.innerHTML = '';
    const sorted = players.slice().sort((a,b)=> (b.lastScore||0) - (a.lastScore||0));
    sorted.forEach(p=>{
      const li = document.createElement('li'); li.innerHTML = `<span>${p.avatar} ${p.name}</span><strong>${p.lastScore ?? '-'}</strong>`;
      leaderboardList.appendChild(li);
    });
  }
  leaderboardBtn?.addEventListener('click', ()=>{ updateLeaderboard(); if (leaderboardModal) leaderboardModal.classList.remove('hidden'); });
  closeLeaderboard?.addEventListener('click', ()=>{ if (leaderboardModal) leaderboardModal.classList.add('hidden'); });

  /* ===========================
     New mission / back to menu
     =========================== */
  newMissionBtn?.addEventListener('click', ()=>{
    clearInterval(timerInterval);
    if (statPage) statPage.classList.remove('hidden');
    if (gamePage) gamePage.classList.add('hidden');
    remainingTime = 60; if (timeDisplay) timeDisplay.textContent = '01:00';
    if (resultsModal) resultsModal.classList.add('hidden');
    if (leaderboardModal) leaderboardModal.classList.add('hidden');
    // pick a new background music and play on home screen if musicOn
    if (musicOn) { pickRandomMusic(); playMusic(); }
  });

  /* ===========================
     Utility: spawn emoji burst (wrapper)
     =========================== */
  function spawnEmojiBurst(x, y, count = 10, set = ['✨','💫','⭐']) {
    for (let i=0;i<count;i++){
      particles.push({ x, y, vx:(Math.random()-0.5)*4, vy:-(1+Math.random()*3), life:30+Math.random()*40, size:16+Math.random()*18, char:set[Math.floor(Math.random()*set.length)] });
    }
  }

  /* ===========================
     Boot & initial UI
     =========================== */
  function updateTopbar() {
    scoreDisplay && (scoreDisplay.textContent = score);
    streakDisplay && (streakDisplay.textContent = streak);
    walletDisplay && (walletDisplay.textContent = players[Number(playerSelect.value || 0)] ? (players[Number(playerSelect.value || 0)].coins || 0) : 0);
  }

  (function boot(){
    ensureDefaultPlayer();
    renderAvatars();
    renderTableChips();
    refreshPlayers();
    selectedTables = Array.from(document.querySelectorAll('.table-chip.selected')).map(x=>Number(x.textContent));
    if (statPage) statPage.classList.remove('hidden');
    if (gamePage) gamePage.classList.add('hidden');
    updateTopbar();
    // try to pick & autoplay music on home screen (may be blocked by browser)
    pickRandomMusic();
    try { playMusic(); } catch(e) {}
  })();

  /* ===========================
     Helper: ensureDefaultPlayer (inside boot scope)
     =========================== */
  function ensureDefaultPlayer() {
    if (!players || players.length === 0) {
      players = [{ name: 'Player 1', avatar: defaultAvatars[0], lastScore: 0, coins: 0 }];
      localStorage.setItem('ttPlayers', JSON.stringify(players));
    }
  }

  // end of DOMContentLoaded
}); // DOMContentLoaded end
