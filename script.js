/* script.js — Space Times Table Adventure (Complete) */

document.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);

  /* ===========================
     Canvas & UI Elements
  =========================== */
  const bgCanvas = $('bgCanvas'), cometCanvas = $('cometCanvas'), confettiCanvas = $('confettiCanvas');
  const statPage = $('statPage'), gamePage = $('gamePage');
  const playerSelect = $('playerSelect'), newPlayer = $('newPlayer'), addPlayerBtn = $('addPlayerBtn'), resetPlayersBtn = $('resetPlayers');
  const avatarPicker = $('avatarPicker'), tableList = $('tableList'), mcToggle = $('mcToggle');
  const startBtn = $('startBtn'), leaderboardBtn = $('leaderboardBtn'), leaderboardModal = $('leaderboardModal');
  const closeLeaderboard = $('closeLeaderboard'), leaderboardList = $('leaderboardList');
  const activePlayerLabel = $('activePlayerLabel'), scoreDisplay = $('scoreDisplay'), streakDisplay = $('streakDisplay');
  const timeDisplay = $('timeDisplay'), questionCounter = $('questionCounter');
  const qText = $('questionText'), answersContainer = $('answersContainer'), answerInput = $('answerInput');
  const submitBtn = $('submitBtn'), keypad = $('keypad'), feedback = $('feedback');
  const countdownOverlay = $('countdownOverlay'), countdownText = $('countdownText'), rocketSVG = $('rocketSVG');
  const resultsModal = $('resultsModal'), resultsList = $('resultsList'), resultsSummary = $('resultsSummary');
  const closeResults = $('closeResults'), saveToLeaderboard = $('saveToLeaderboard');
  const newMissionBtn = $('newMissionBtn'), muteBtn = $('muteBtn'), walletDisplay = $('walletDisplay');

  const bg = bgCanvas?.getContext('2d') || null;
  const cometCtx = cometCanvas?.getContext('2d') || null;
  const conf = confettiCanvas?.getContext('2d') || null;

  /* ===========================
     Resize Canvases
  =========================== */
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
     App State
  =========================== */
  let players = JSON.parse(localStorage.getItem('ttPlayers') || '[]');
  let activeIndex = 0, activePlayer = null;
  let selectedTables = [], mode = 'practice', multipleChoice = false;
  let questions = [], currentQ = 0, score = 0, streak = 0, startTime = 0;
  let timerInterval = null, remainingTime = 60;
  let mutedSfx = false, musicOn = true;
  let sessionLog = [], particles = [], comets = [], stars = [], emojis = [], planets = [];

  const defaultAvatars = ['🚀','🛸','👽','🌟','🌕','🪐','🛰','☄️','✨','🪄'];

  /* ===========================
     Audio: SFX & Music
  =========================== */
  const sfxVolume = 1.0, musicRelative = 0.8;
  const SFX = {
    start: new Audio('sounds/start.mp3'),
    countdown: new Audio('sounds/countdown.mp3'),
    correct: new Audio('sounds/correct.mp3'),
    wrong: new Audio('sounds/wrong.mp3'),
    fireworks: new Audio('sounds/fireworks.mp3'),
    coin: new Audio('sounds/coin.mp3'),
  };
  Object.values(SFX).forEach(a => { try { a.volume = sfxVolume; a.preload='auto'; } catch(e){} });

  const MUSIC_FILES = ['sounds/music_1.mp3','sounds/music_2.mp3'];
  let bgMusic = null, bgMusicSrc = null;

  function createMusic(src){
    try {
      const a = new Audio(src); a.loop = true; a.preload='auto';
      a.volume = Math.max(0,Math.min(1,sfxVolume*musicRelative));
      return a;
    } catch(e){ return null; }
  }

  function pickRandomMusic() {
    const idx = Math.floor(Math.random()*MUSIC_FILES.length);
    bgMusicSrc = MUSIC_FILES[idx];
    if (bgMusic && typeof bgMusic.pause === 'function') { try { bgMusic.pause(); } catch(e){} }
    bgMusic = createMusic(bgMusicSrc);
    return bgMusic;
  }

  function playSfx(name) {
    if (mutedSfx) return;
    const a = SFX[name]; if (!a) return;
    try { a.currentTime=0; a.play().catch(()=>{}); } catch(e){}
  }

  function fadeAudio(audio, toVolume, duration=700){
    if (!audio) return;
    const steps = Math.max(8, Math.round(duration/50)), stepTime = duration/steps;
    const start = audio.volume, delta = toVolume - start;
    if (audio._fadeInterval){ clearInterval(audio._fadeInterval); audio._fadeInterval=null; }
    let step=0;
    audio._fadeInterval = setInterval(()=>{
      step++; const t = step/steps;
      audio.volume = Math.max(0,Math.min(1,start+delta*t));
      if(step>=steps){ clearInterval(audio._fadeInterval); audio._fadeInterval=null; audio.volume=Math.max(0,Math.min(1,toVolume));
        if(toVolume===0){ try{audio.pause();}catch(e){} }
      }
    }, stepTime);
  }
  function playMusic(){
    if(!musicOn) return;
    if(!bgMusic) pickRandomMusic();
    if(!bgMusic) return;
    try{ bgMusic.volume=0; bgMusic.play().catch(()=>{}); fadeAudio(bgMusic, sfxVolume*musicRelative, 1000); }catch(e){}
  }

  function stopMusic(){ if(bgMusic) fadeAudio(bgMusic,0,700); }
  function pauseMusicImmediate(){ if(bgMusic){ if(bgMusic._fadeInterval){clearInterval(bgMusic._fadeInterval); bgMusic._fadeInterval=null;} try{bgMusic.pause();}catch(e){} } }

  if(muteBtn) muteBtn.addEventListener('click',()=>{ mutedSfx=!mutedSfx; muteBtn.textContent=mutedSfx?'🔇':'🔊'; });

  /* ===========================
     Music Toggle UI
  =========================== */
  function createMusicToggleUI(){
    if(!muteBtn||!muteBtn.parentElement) return;
    if($('musicBtn')) return;
    const btn = document.createElement('button');
    btn.id='musicBtn'; btn.className='btn'; btn.style.marginLeft='8px'; btn.textContent=musicOn?'🎵':'🔕';
    muteBtn.parentElement.insertBefore(btn,muteBtn.nextSibling);
    btn.addEventListener('click',()=>{
      musicOn=!musicOn; btn.textContent=musicOn?'🎵':'🔕';
      if(musicOn){ if(!bgMusic) pickRandomMusic(); playMusic(); } else { stopMusic(); }
    });
    const slider = document.createElement('input');
    slider.type='range'; slider.min=0; slider.max=100; slider.value=Math.round(musicRelative*100);
    slider.title='Music volume'; slider.style.marginLeft='8px';
    muteBtn.parentElement.insertBefore(slider,btn.nextSibling);
    slider.addEventListener('input',()=>{
      const v=Number(slider.value)/100;
      if(bgMusic) fadeAudio(bgMusic,sfxVolume*v,200);
    });
  }
  createMusicToggleUI();

  /* ===========================
     Background: stars, planets, emojis
  =========================== */
  function initBackground(){
    if(!bgCanvas) return; stars=[]; emojis=[]; planets=[];
    const W=bgCanvas.width,H=bgCanvas.height;
    for(let i=0;i<160;i++) stars.push({x:Math.random()*W, y:Math.random()*H, r:Math.random()*1.4+0.2, speed:0.02+Math.random()*0.22});
    const emojiChars=['🚀','🛸','👽','🌟','🌕','🪐','🛰','☄️','✨'];
    for(let i=0;i<36;i++) emojis.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-0.5)*0.22,vy:(Math.random()-0.5)*0.22,char:emojiChars[Math.floor(Math.random()*emojiChars.length)],size:14+Math.random()*20});
    for(let i=0;i<5;i++) planets.push({x:Math.random()*W,y:Math.random()*H,r:22+Math.random()*60,color:`hsl(${Math.random()*360},70%,55%)`,vy:0.02+Math.random()*0.08});
  }
  initBackground();

  function drawBackground(){
    if(!bg) return;
    bg.clearRect(0,0,bgCanvas.width,bgCanvas.height);
    const grad=bg.createLinearGradient(0,0,0,bgCanvas.height); grad.addColorStop(0,'#071033'); grad.addColorStop(1,'#000012');
    bg.fillStyle=grad; bg.fillRect(0,0,bgCanvas.width,bgCanvas.height);

    planets.forEach(p=>{ p.y-=p.vy; if(p.y<-p.r)p.y=bgCanvas.height+p.r; bg.beginPath(); bg.fillStyle=p.color; bg.arc(p.x,p.y,p.r,0,Math.PI*2); bg.fill(); });

    bg.fillStyle='white';
    stars.forEach(s=>{ bg.beginPath(); bg.arc(s.x,s.y,s.r,0,Math.PI*2); bg.fill(); s.y+=s.speed; if(s.y>bgCanvas.height+10)s.y=-10; });

    emojis.forEach(e=>{
      e.x+=e.vx; e.y+=e.vy;
      if(e.x<-40)e.x=bgCanvas.width+40; if(e.x>bgCanvas.width+40)e.x=-40;
      if(e.y<-40)e.y=bgCanvas.height+40; if(e.y>bgCanvas.height+40)e.y=-40;
      bg.font=`${Math.round(e.size)}px serif`; bg.fillText(e.char,e.x,e.y);
    });

    requestAnimationFrame(drawBackground);
  }
  drawBackground();

  /* ===========================
     Comets
  =========================== */
  function spawnComet(kind='comet'){
    if(!cometCanvas) return;
    const startX=Math.random()*cometCanvas.width;
    const vx=-(2+Math.random()*6), vy=0.5+Math.random()*1.5;
    comets.push({x:startX,y:-10,vx,vy,len:40+Math.random()*80,life:300,kind});
    if(comets.length>14) comets.splice(0,comets.length-12);
  }
  setTimeout(()=>{ spawnComet(Math.random()>0.6?'rocket':'comet'); setInterval(()=>spawnComet(Math.random()>0.6?'rocket':'comet'),5000); },1200);

  function drawComets(){
    if(!cometCtx) return;
    cometCtx.clearRect(0,0,cometCanvas.width,cometCanvas.height);
    for(let i=comets.length-1;i>=0;i--){
      const c=comets[i]; cometCtx.save();
      const angle=Math.atan2(c.vy,c.vx); cometCtx.translate(c.x,c.y); cometCtx.rotate(angle);
      const tail=Math.max(30,c.len);
      const g=cometCtx.createLinearGradient(0,0,-tail,0);
      g.addColorStop(0,'rgba(255,255,255,0.95)'); g.addColorStop(1,'rgba(255,255,255,0)');
      cometCtx.fillStyle=g;
      cometCtx.beginPath(); cometCtx.moveTo(0,0); cometCtx.lineTo(-tail,-tail*0.12); cometCtx.lineTo(-tail,tail*0.12); cometCtx.closePath(); cometCtx.fill();
      cometCtx.beginPath(); cometCtx.fillStyle=c.kind==='rocket'?'#ffdd99':'#fff8cc'; cometCtx.arc(0,0,c.kind==='rocket'?6:4,0,Math.PI*2); cometCtx.fill();
      cometCtx.restore();

      c.x+=c.vx; c.y+=c.vy; c.life--;
      if(c.x<-80 || c.life<=0) comets.splice(i,1);
    }
    requestAnimationFrame(drawComets);
  }
  drawComets();

  /* ===========================
     Particles (emoji bursts)
  =========================== */
  function spawnEmojiBurst(x,y,count=12,set=['✨','💫','⭐']){
    for(let i=0;i<count;i++){
      particles.push({x,y,vx:(Math.random()-0.5)*4,vy:-(1+Math.random()*3),life:30+Math.random()*40,size:16+Math.random()*18,char:set[Math.floor(Math.random()*set.length)]});
    }
    if(particles.length>800) particles.splice(0,particles.length-500);
  }

  function drawParticles(){
    if(!conf) return;
    conf.clearRect(0,0,confettiCanvas.width,confettiCanvas.height);
    conf.textBaseline='middle';
    for(let i=particles.length-1;i>=0;i--){
      const p=particles[i];
      conf.globalAlpha=Math.max(0,p.life/70);
      conf.font=`${Math.round(p.size)}px serif`; conf.fillText(p.char,p.x,p.y);
      p.x+=p.vx; p.y+=p.vy; p.vy+=0.06; p.life--;
      if(p.life<=0) particles.splice(i,1);
    }
    conf.globalAlpha=1;
    requestAnimationFrame(drawParticles);
  }
  drawParticles();

  /* ===========================
     Avatars & Players
  =========================== */
  function renderAvatars(){
    if(!avatarPicker) return; avatarPicker.innerHTML='';
    defaultAvatars.forEach(a=>{
      const btn=document.createElement('button');
      btn.type='button'; btn.className='avatar-choice'; btn.textContent=a;
      btn.addEventListener('click',()=>{
        avatarPicker.querySelectorAll('.avatar-choice')?.forEach(x=>x.classList.remove('selected'));
        btn.classList.add('selected');
      });
      avatarPicker.appendChild(btn);
    });
    const first=avatarPicker.querySelector('.avatar-choice'); if(first) first.classList.add('selected');
  }

  // Single player selection and total coins display
  const totalCoinsDisplay = document.createElement('div');
  totalCoinsDisplay.id = 'totalCoinsDisplay';
  totalCoinsDisplay.style.fontWeight = '700';
  totalCoinsDisplay.style.marginTop = '6px';
  if(playerSelect?.parentElement) playerSelect.parentElement.appendChild(totalCoinsDisplay);

  function updateTotalCoinsDisplay() {
    const idx = Number(playerSelect.value||0);
    const p = players[idx];
    totalCoinsDisplay.textContent = p ? `Total coins: ${p.coins || 0}` : 'Total coins: 0';
  }

  function refreshPlayers(){
    if(!playerSelect) return; playerSelect.innerHTML='';
    players.forEach((p,i)=>{
      const opt=document.createElement('option'); opt.value=i; opt.textContent=`${p.avatar} ${p.name}`;
      playerSelect.appendChild(opt);
    });
    if(players.length) playerSelect.value=0;
    updateTotalCoinsDisplay();
  }

  playerSelect?.addEventListener('change',()=>{
    activeIndex = Number(playerSelect.value||0);
    activePlayer = players[activeIndex] || null;
    updateTotalCoinsDisplay();
    activePlayerLabel && (activePlayerLabel.textContent = `${activePlayer?.avatar||'🚀'} ${activePlayer?.name||'Player'}`);
  });

  addPlayerBtn?.addEventListener('click',()=>{
    const name=(newPlayer.value||'').trim();
    const sel=avatarPicker?.querySelector('.avatar-choice.selected');
    if(!name){ alert('Enter a name'); return; }
    if(!sel){ alert('Pick an avatar'); return; }
    players.push({name, avatar: sel.textContent, lastScore:0, coins:0});
    localStorage.setItem('ttPlayers',JSON.stringify(players));
    newPlayer.value=''; renderAvatars(); refreshPlayers();
  });

  resetPlayersBtn?.addEventListener('click',()=>{
    if(!confirm('Clear saved players?')) return;
    players=[]; localStorage.removeItem('ttPlayers'); ensureDefaultPlayer(); renderAvatars(); refreshPlayers();
  });

  newPlayer?.addEventListener('keydown',e=>{ if(e.key==='Enter') addPlayerBtn.click(); });

  function ensureDefaultPlayer(){
    if(!players||players.length===0){
      players=[{name:'Player 1', avatar:defaultAvatars[0], lastScore:0, coins:0}];
      localStorage.setItem('ttPlayers',JSON.stringify(players));
    }
  }

  /* ===========================
     Table Chips
  =========================== */
  function renderTableChips(){
    if(!tableList) return; tableList.innerHTML='';
    for(let i=1;i<=12;i++){
      const b=document.createElement('button'); b.type='button'; b.className='table-chip'; b.textContent=i;
      b.addEventListener('click',()=>{
        b.classList.toggle('selected');
        selectedTables = Array.from(document.querySelectorAll('.table-chip.selected')).map(x=>Number(x.textContent));
      });
      tableList.appendChild(b);
    }
  }
  /* ===========================
     Questions & Gameplay (continued)
  =========================== */

  // Track coins earned this mission separately
  let missionCoins = 0;

  function generateQuestions(){
    questions = [];
    if (!selectedTables?.length) return;

    if (mode === 'practice') {
      // practice: every selected table × 1..12
      selectedTables.forEach(t => {
        for (let b = 1; b <= 12; b++) questions.push({ q: `${t} × ${b}`, expected: t * b, t, b });
      });
    } else if (mode === 'lightspeed') {
      // lightspeed: 50 questions (random)
      for (let i = 0; i < 50; i++) {
        const t = selectedTables[Math.floor(Math.random() * selectedTables.length)];
        const b = Math.floor(Math.random() * 12) + 1;
        questions.push({ q: `${t} × ${b}`, expected: t * b, t, b });
      }
    } else if (mode === 'chaos') {
      // chaos: we'll generate an initial set of questions but treat it as unlimited (we won't rely on total)
      for (let i = 0; i < 200; i++) {
        const t = selectedTables[Math.floor(Math.random() * selectedTables.length)];
        const b = Math.floor(Math.random() * 12) + 1;
        questions.push({ q: `${t} × ${b}`, expected: t * b, t, b });
      }
    }

    // shuffle
    for (let i = questions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [questions[i], questions[j]] = [questions[j], questions[i]];
    }
  }

  // Topbar question counter logic: practice => "Question X of Y", lightspeed => "Question X of 50", chaos => "Question X"
  function updateTopbar(){
    const practiceTotal = (selectedTables.length * 12) || 0;

    if (mode === 'practice') {
      const total = practiceTotal;
      questionCounter.textContent = `Question ${Math.min(currentQ + 1, total)} of ${total}`;
    } else if (mode === 'lightspeed') {
      questionCounter.textContent = `Question ${Math.max(1, currentQ + 1)} of 50`;
    } else if (mode === 'chaos') {
      questionCounter.textContent = `Question ${Math.max(1, currentQ + 1)}`;
    } else {
      // fallback
      questionCounter.textContent = `Question ${Math.max(1, currentQ + 1)}`;
    }

    // update score & streak displays
    scoreDisplay && (scoreDisplay.textContent = score);
    streakDisplay && (streakDisplay.textContent = streak);

    // walletDisplay (in-game) shows coins earned so far this mission or total? We'll show player's total coins in topbar wallet,
    // while missionCoins is displayed in the mission area. Keep walletDisplay as player's current total coins.
    if (walletDisplay) {
      const idx = Number(playerSelect.value || activeIndex || 0);
      walletDisplay.textContent = players[idx]?.coins || 0;
    }

    // update mission coins display if present
    const missionEl = document.getElementById('missionCoins');
    if (missionEl) missionEl.textContent = `${missionCoins} 🪙`;
  }

  function presentQuestion(){
    // For lightspeed regenerate if we run out
    if (mode === 'lightspeed' && currentQ >= questions.length - 1) { generateQuestions(); currentQ = 0; }

    // Termination conditions:
    if ((mode === 'chaos' && currentQ >= 1000000) // arbitrary large guard (chaos effectively endless)
      || (mode !== 'lightspeed' && currentQ >= questions.length)
      || (mode === 'lightspeed' && remainingTime <= 0)) {
      finishRound();
      return;
    }

    const q = questions[currentQ];
    if (!q) { finishRound(); return; }

    qText.textContent = q.q;
    answersContainer.innerHTML = '';
    feedback.textContent = '';
    updateTopbar();

    if (multipleChoice) {
      const opts = new Set([q.expected]);
      while (opts.size < 4) opts.add(Math.max(1, Math.round(q.expected + (Math.random() * 20 - 10))));
      const arr = Array.from(opts);
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      arr.forEach(v => {
        const b = document.createElement('button');
        b.className = 'answer-btn';
        b.textContent = v;
        b.addEventListener('click', () => handleSubmit(String(v)));
        answersContainer.appendChild(b);
      });
      keypad.classList.add('hidden');
      if (answerInput?.parentElement) answerInput.parentElement.classList.add('hidden');
    } else {
      keypad.classList.remove('hidden');
      if (answerInput?.parentElement) answerInput.parentElement.classList.remove('hidden');
      answerInput.value = '';
      setTimeout(()=>answerInput.focus(), 50);
    }
  }

  function normalizeGiven(givenRaw){
    if (typeof givenRaw === 'number') return givenRaw;
    if (typeof givenRaw === 'string') {
      const t = givenRaw.trim();
      if (/^[+-]?\d+$/.test(t)) return parseInt(t, 10);
      return t;
    }
    return givenRaw;
  }

  function updateMissionCoinsDisplay() {
    const el = document.getElementById('missionCoins');
    if (el) el.textContent = `${missionCoins} 🪙`;
  }

  function handleSubmit(givenRaw){
    if (givenRaw == null) return;
    const q = questions[currentQ];
    if (!q) return;
    const given = normalizeGiven(givenRaw), expected = q.expected;
    const correct = (typeof given === 'number' && typeof expected === 'number') ? given === expected : given === expected;
    sessionLog.push({ q: q.q, expected, given, correct, ts: Date.now() });

    if (correct) {
      score++; streak++;
      // ensure player exists
      const idx = Number(playerSelect.value || activeIndex || 0);
      players[idx] = players[idx] || { name: `Player ${idx+1}`, avatar: defaultAvatars[0], lastScore: 0, coins: 0 };

      // Award 5 coins per correct answer
      players[idx].coins = (players[idx].coins || 0) + 5;
      missionCoins += 5;

      // persist immediately
      localStorage.setItem('ttPlayers', JSON.stringify(players));

      // update displays
      updateTotalCoinsDisplay();
      updateMissionCoinsDisplay();

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

  submitBtn?.addEventListener('click', ()=>{ if (answerInput && answerInput.value.trim() !== '') { handleSubmit(answerInput.value.trim()); answerInput.value=''; } });
  answerInput?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); if (answerInput && answerInput.value.trim() !== '') { handleSubmit(answerInput.value.trim()); answerInput.value=''; } } });

  if (keypad) {
    keypad.addEventListener('click', e => {
      const t = e.target;
      if (!t.classList.contains('key')) return;
      e.stopPropagation(); e.preventDefault();
      if (t.classList.contains('blank')) return;
      if (t.classList.contains('back')) { if (answerInput) answerInput.value = answerInput.value.slice(0, -1); return; }
      if (t.classList.contains('check')) { if (answerInput && answerInput.value.trim() !== '') { handleSubmit(answerInput.value.trim()); answerInput.value = ''; } return; }
      const d = t.textContent.trim();
      if (d.length === 1 && /\d/.test(d) && answerInput) answerInput.value += d;
    });
  }

  /* ===========================
     Countdown & Start Sequence
  =========================== */
  let countdownRunning = false;

  function startCountdownSequence() {
    if (countdownRunning) return;
    countdownRunning = true;
    countdownOverlay?.classList.remove('hidden');
    rocketSVG && (rocketSVG.style.transform = 'translateY(0)');

    playSfx('countdown');

    let c = 3;
    countdownText && (countdownText.textContent = String(c));

    const iv = setInterval(() => {
      c--;
      if (c > 0) countdownText && (countdownText.textContent = String(c));
      else if (c === 0) {
        countdownText && (countdownText.textContent = 'Blast Off!');
        rocketSVG && (rocketSVG.style.transform = 'translateY(-140%)');
      } else {
        clearInterval(iv);
        setTimeout(() => {
          countdownOverlay?.classList.add('hidden');
          rocketSVG && (rocketSVG.style.transform = 'translateY(0)');
          countdownRunning = false;
          musicOn && playMusic();
          startGame();
        }, 900);
      }
    }, 1000);
  }

  function startSequence_playStartThenCountdown() {
    startBtn && (startBtn.disabled = true, startBtn.classList.add('disabled'));
    if (bgMusic) { fadeAudio(bgMusic, 0, 300); setTimeout(()=>pauseMusicImmediate(), 350); }
    playSfx('start');
    setTimeout(() => {
      startCountdownSequence();
      setTimeout(()=>{ startBtn && (startBtn.disabled=false, startBtn.classList.remove('disabled')); }, 4200);
    }, 2000);
  }

  /* ===========================
     Start button wiring
  =========================== */
  startBtn?.addEventListener('click', () => {
    !bgMusic && pickRandomMusic();

    // validate player and tables
    if (!players.length) { alert('Add a player first'); return; }
    if (!document.querySelectorAll('.table-chip.selected').length) { alert('Select at least one times table'); return; }

    const modeRadio = document.querySelector('input[name="mode"]:checked');
    modeRadio && (mode = modeRadio.value);
    multipleChoice = mcToggle?.checked || false;

    // reset mission coins
    missionCoins = 0;
    updateMissionCoinsDisplay();

    startSequence_playStartThenCountdown();
  });

  /* ===========================
     Start Gameplay
  =========================== */
  function startGame() {
    activeIndex = Number(playerSelect.value || 0);
    activePlayer = players[activeIndex] || players[0];
    activePlayerLabel && (activePlayerLabel.textContent = `${activePlayer.avatar} ${activePlayer.name}`);

    selectedTables = Array.from(document.querySelectorAll('.table-chip.selected')).map(x => Number(x.textContent));
    if (!selectedTables.length) { alert('Select at least one table'); return; }

    score = 0; streak = 0; currentQ = 0; sessionLog = []; remainingTime = 60;
    missionCoins = 0;
    generateQuestions();
    updateTopbar();

    clearInterval(timerInterval);
    if (mode === 'lightspeed') {
      timeDisplay && (timeDisplay.textContent = '01:00');
      timerInterval = setInterval(()=>{
        remainingTime--;
        timeDisplay && (timeDisplay.textContent = `00:${String(remainingTime).padStart(2,'0')}`);
        if (remainingTime <= 0) { clearInterval(timerInterval); finishRound(); }
      },1000);
    } else {
      startTime = Date.now();
      timerInterval = setInterval(()=>{
        const elapsed = Math.floor((Date.now()-startTime)/1000);
        timeDisplay && (timeDisplay.textContent = `${String(Math.floor(elapsed/60)).padStart(2,'0')}:${String(elapsed%60).padStart(2,'0')}`);
      },1000);
    }

    statPage?.classList.add('hidden');
    gamePage?.classList.remove('hidden');

    setTimeout(()=>presentQuestion(), 120);
  }

  /* ===========================
     Finish Round & Results
  =========================== */
  function finishRound() {
    clearInterval(timerInterval);

    // Do not re-add missionCoins to player's coins here because coins were added per correct answer already.
    // Ensure player's latest coins are persisted (they were saved on each correct answer), just update displays.
    const playedCount = sessionLog.length;
    const allCorrect = playedCount>0 && sessionLog.every(s=>s.correct) && (mode==='lightspeed'?true:playedCount===questions.length);

    if(allCorrect) { spawnEmojiBurst(window.innerWidth*0.5, window.innerHeight*0.25, 40, ['☄️','🌟','✨']); playSfx('fireworks'); }
    else playSfx('fireworks');

    // ensure lastScore stored and saved
    if(players[activeIndex]) {
      players[activeIndex].lastScore = score;
      localStorage.setItem('ttPlayers', JSON.stringify(players));
    }

    bgMusic && fadeAudio(bgMusic, Math.max(0.15, sfxVolume*0.4), 400);
    setTimeout(()=>stopMusic(), 2500);

    resultsList.innerHTML = '';
    resultsSummary.innerHTML = `<div style="font-weight:700;margin-bottom:8px">Score: ${score} — Mode: ${mode} — Coins Earned: ${missionCoins}</div>`;

    if (!sessionLog.length) {
      const li = document.createElement('li'); li.textContent = 'No answers recorded.'; resultsList.appendChild(li);
    } else {
      sessionLog.forEach((r,i)=>{
        const li = document.createElement('li');
        li.innerHTML = `<div style="font-weight:700">Question ${i+1}. ${r.q}</div><div style="opacity:0.9">${r.correct ? '✅' : '❌'} Given: ${r.given} — Answer: ${r.expected}</div>`;
        resultsList.appendChild(li);
      });
    }

    // Show results modal after 5 seconds (delay)
    setTimeout(()=>{
      // update displays
      updateTotalCoinsDisplay();
      updateMissionCoinsDisplay();
      resultsModal?.classList.remove('hidden');
    }, 5000);

    remainingTime = 60;
    timeDisplay && (timeDisplay.textContent = '01:00');
  }

  closeResults?.addEventListener('click', ()=>{
    resultsModal?.classList.add('hidden');
    statPage?.classList.remove('hidden');
    gamePage?.classList.add('hidden');
  });

  saveToLeaderboard?.addEventListener('click', ()=>{
    if (players[activeIndex]) {
      players[activeIndex].lastScore = score;
      localStorage.setItem('ttPlayers', JSON.stringify(players));
      updateLeaderboard();
      alert('Score saved to player.');
    }
  });

  /* ===========================
     Leaderboard
  =========================== */
  function updateLeaderboard() {
    if (!leaderboardList) return;
    leaderboardList.innerHTML = '';
    players.slice().sort((a,b)=>(b.lastScore||0)-(a.lastScore||0)).forEach(p=>{
      const li = document.createElement('li');
      li.innerHTML = `<span>${p.avatar} ${p.name}</span><strong>${p.lastScore ?? '-'}</strong>`;
      leaderboardList.appendChild(li);
    });
  }

  leaderboardBtn?.addEventListener('click', ()=>{ updateLeaderboard(); leaderboardModal?.classList.remove('hidden'); });
  closeLeaderboard?.addEventListener('click', ()=>{ leaderboardModal?.classList.add('hidden'); });

  /* ===========================
     New Mission / Back to Menu
  =========================== */
  newMissionBtn?.addEventListener('click', ()=>{
    clearInterval(timerInterval);
    statPage?.classList.remove('hidden');
    gamePage?.classList.add('hidden');
    remainingTime = 60; timeDisplay && (timeDisplay.textContent = '01:00');
    resultsModal?.classList.add('hidden');
    leaderboardModal?.classList.add('hidden');
    musicOn && (pickRandomMusic(), playMusic());
    // reset mission coins display
    missionCoins = 0;
    updateMissionCoinsDisplay();
    updateTopbar();
  });

  /* ===========================
     Total Coins Display helper (keeps single display in sync)
  =========================== */
  function updateTotalCoinsDisplay(){
    const el = document.getElementById('totalCoinsDisplay');
    if (!el) return;
    const idx = Number(playerSelect.value || 0);
    const p = players[idx];
    el.textContent = `🪙 Total coins: ${p ? (p.coins || 0) : 0}`;
    // Also update walletDisplay (topbar) to match selected player's total
    if (walletDisplay) walletDisplay.textContent = p ? (p.coins || 0) : 0;
  }

  // Ensure total coins updates when selecting or adding players (already wired earlier; just double-check)
  playerSelect?.addEventListener('change', ()=>{
    activeIndex = Number(playerSelect.value || 0);
    activePlayer = players[activeIndex] || null;
    updateTotalCoinsDisplay();
    activePlayerLabel && (activePlayerLabel.textContent = `${activePlayer?.avatar || '🚀'} ${activePlayer?.name || 'Player'}`);
  });

  addPlayerBtn?.addEventListener('click', ()=>{
    // (already handled earlier) make sure total coins display refreshed after add
    updateTotalCoinsDisplay();
  });

  /* ===========================
     Boot & Initialization
  =========================== */
  (function boot(){
    ensureDefaultPlayer();
    renderAvatars();
    renderTableChips();
    refreshPlayers();
    selectedTables = Array.from(document.querySelectorAll('.table-chip.selected')).map(x=>Number(x.textContent));
    statPage?.classList.remove('hidden');
    gamePage?.classList.add('hidden');
    updateTopbar();
    pickRandomMusic();
    try { playMusic(); } catch(e){}
    updateTotalCoinsDisplay();
    updateMissionCoinsDisplay();
  })();

}); // DOMContentLoaded end
