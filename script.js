/* ========================
   Space Times Table Adventure
   script.js — complete
   ======================== */

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- Element references ---------- */
  const bgCanvas = document.getElementById('bgCanvas');
  const cometCanvas = document.getElementById('cometCanvas');
  const confettiCanvas = document.getElementById('confettiCanvas');

  const statPage = document.getElementById('statPage');
  const gamePage = document.getElementById('gamePage');

  const playerSelect = document.getElementById('playerSelect');
  const newPlayer = document.getElementById('newPlayer');
  const addPlayerBtn = document.getElementById('addPlayerBtn');
  const resetPlayersBtn = document.getElementById('resetPlayers');
  const avatarPicker = document.getElementById('avatarPicker');

  const tableList = document.getElementById('tableList');
  const startBtn = document.getElementById('startBtn');
  const mcToggle = document.getElementById('mcToggle');

  const practiceBtnLabel = document.querySelector('.mode-btn[data-mode="practice"]');
  const chaosBtnLabel = document.querySelector('.mode-btn[data-mode="chaos"]');
  const lightspeedBtnLabel = document.querySelector('.mode-btn[data-mode="lightspeed"]');

  const leaderboardBtn = document.getElementById('leaderboardBtn');
  const leaderboardModal = document.getElementById('leaderboardModal');
  const closeLeaderboard = document.getElementById('closeLeaderboard');
  const leaderboardList = document.getElementById('leaderboardList');

  const activePlayerLabel = document.getElementById('activePlayerLabel');
  const scoreDisplay = document.getElementById('scoreDisplay');
  const streakDisplay = document.getElementById('streakDisplay');
  const timeDisplay = document.getElementById('timeDisplay');
  const questionCounter = document.getElementById('questionCounter');

  const qText = document.getElementById('questionText');
  const answersContainer = document.getElementById('answersContainer');
  const answerInput = document.getElementById('answerInput');
  const submitBtn = document.getElementById('submitBtn');
  const keypad = document.getElementById('keypad');
  const feedback = document.getElementById('feedback');

  const countdownOverlay = document.getElementById('countdownOverlay');
  const countdownText = document.getElementById('countdownText');
  const rocketSVG = document.getElementById('rocketSVG');

  const resultsModal = document.getElementById('resultsModal');
  const resultsList = document.getElementById('resultsList');
  const resultsSummary = document.getElementById('resultsSummary');
  const closeResults = document.getElementById('closeResults');
  const saveToLeaderboard = document.getElementById('saveToLeaderboard');

  const walletDisplay = document.getElementById('walletDisplay');
  const muteBtn = document.getElementById('muteBtn');
  const newMissionBtn = document.getElementById('newMissionBtn');

  /* ---------- Canvas contexts ---------- */
  const bg = bgCanvas.getContext('2d');
  const cometCtx = cometCanvas.getContext('2d');
  const conf = confettiCanvas.getContext('2d');

  /* ---------- State ---------- */
  let players = JSON.parse(localStorage.getItem('ttPlayers') || '[]');
  let board = JSON.parse(localStorage.getItem('ttBoard') || '[]'); // leaderboard array
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
  let muted = false;
  let sessionLog = []; // {q,expected,given,correct}

  /* ---------- Avatars ---------- */
  const avatars = ['🚀','🛸','👽','🌟','🌕','🪐','🛰','☄️','🪄','✨'];
  function renderAvatars(){
    avatarPicker.innerHTML = '';
    avatars.forEach(a=>{
      const btn = document.createElement('button');
      btn.type='button';
      btn.className='avatar-choice';
      btn.textContent = a;
      btn.addEventListener('click', ()=> {
        document.querySelectorAll('.avatar-choice').forEach(x=>x.classList.remove('selected'));
        btn.classList.add('selected');
        avatarPicker.dataset.selected = a;
      });
      avatarPicker.appendChild(btn);
    });
    const first = avatarPicker.querySelector('.avatar-choice'); if(first) { first.classList.add('selected'); avatarPicker.dataset.selected = first.textContent; }
  }

  /* ---------- Canvas sizing ---------- */
  function resizeAll(){
    const dpr = window.devicePixelRatio || 1;
    [bgCanvas, cometCanvas, confettiCanvas].forEach(c=>{
      c.style.width = window.innerWidth + 'px';
      c.style.height = window.innerHeight + 'px';
      c.width = Math.round(window.innerWidth * dpr);
      c.height = Math.round(window.innerHeight * dpr);
    });
  }
  window.addEventListener('resize', resizeAll);
  resizeAll();

  /* ---------- Background: stars, planets, emoji parallax ---------- */
  const stars = [], emojis = [], planets = [];
  function initBackground(){
    stars.length=0; emojis.length=0; planets.length=0;
    const W = bgCanvas.width, H = bgCanvas.height;
    for(let i=0;i<160;i++) stars.push({ x: Math.random()*W, y: Math.random()*H, r: Math.random()*1.3+0.2, speed: 0.03 + Math.random()*0.2 });
    for(let i=0;i<36;i++) emojis.push({ x: Math.random()*W, y: Math.random()*H, vx:(Math.random()-0.5)*0.22, vy:(Math.random()-0.5)*0.22, char: avatars[Math.floor(Math.random()*avatars.length)], size: 18 + Math.random()*20 });
    for(let i=0;i<5;i++) planets.push({ x: Math.random()*W, y: Math.random()*H, r: 22 + Math.random()*60, color: `hsl(${Math.random()*360},70%,55%)`, vy: 0.02 + Math.random()*0.08 });
  }
  initBackground();

  function drawBackground(){
    if(!bg) return;
    bg.clearRect(0,0,bgCanvas.width,bgCanvas.height);
    const grad = bg.createLinearGradient(0,0,0,bgCanvas.height); grad.addColorStop(0,'#071033'); grad.addColorStop(1,'#000012');
    bg.fillStyle=grad; bg.fillRect(0,0,bgCanvas.width,bgCanvas.height);

    // planets
    planets.forEach(p=>{ p.y -= p.vy; if(p.y < -p.r) p.y = bgCanvas.height + p.r; bg.beginPath(); bg.fillStyle = p.color; bg.arc(p.x,p.y,p.r,0,Math.PI*2); bg.fill(); });

    // stars
    bg.fillStyle = 'white';
    stars.forEach(s=>{ bg.beginPath(); bg.arc(s.x,s.y,s.r,0,Math.PI*2); bg.fill(); s.y += s.speed; if(s.y > bgCanvas.height + 10) s.y = -10; });

    // emojis
    emojis.forEach(e=>{ e.x += e.vx; e.y += e.vy; if(e.x < -40) e.x = bgCanvas.width + 40; if(e.x > bgCanvas.width + 40) e.x = -40; if(e.y < -40) e.y = bgCanvas.height + 40; if(e.y > bgCanvas.height + 40) e.y = -40; bg.font = `${Math.round(e.size)}px serif`; bg.fillText(e.char, e.x, e.y); });

    requestAnimationFrame(drawBackground);
  }
  drawBackground();

  /* ---------- Comets ---------- */
  const comets = [];
  function spawnComet(kind='comet'){
    const startX = Math.random() * cometCanvas.width * 0.8 + cometCanvas.width*0.1;
    const vx = - (3 + Math.random()*4);
    const vy = 1.6 + Math.random()*1.8;
    comets.push({ x: startX, y:-30, vx, vy, len: 40 + Math.random()*80, life: 320, kind });
    if(comets.length > 16) comets.splice(0, comets.length-12);
  }

  function drawComets(){
    if(!cometCtx) return;
    cometCtx.clearRect(0,0,cometCanvas.width,cometCanvas.height);
    for(let i=comets.length-1;i>=0;i--){
      const c = comets[i];
      cometCtx.save();
      const ang = Math.atan2(c.vy, c.vx);
      cometCtx.translate(c.x, c.y);
      cometCtx.rotate(ang);
      const tailLen = Math.max(30, c.len);
      const g = cometCtx.createLinearGradient(0, 0, -tailLen, 0);
      g.addColorStop(0, 'rgba(255,255,255,0.95)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      cometCtx.fillStyle = g;
      cometCtx.beginPath();
      cometCtx.moveTo(0, 0);
      cometCtx.lineTo(-tailLen, -tailLen*0.12);
      cometCtx.lineTo(-tailLen, tailLen*0.12);
      cometCtx.closePath(); cometCtx.fill();

      cometCtx.beginPath(); cometCtx.fillStyle = c.kind==='rocket' ? '#ffdd99' : '#fff8cc'; cometCtx.arc(0,0,c.kind==='rocket'?6:4,0,Math.PI*2); cometCtx.fill();
      cometCtx.restore();
      c.x += c.vx; c.y += c.vy; c.life--;
      if(c.x < -80 || c.y > cometCanvas.height + 80 || c.life <= 0) comets.splice(i,1);
    }
    requestAnimationFrame(drawComets);
  }
  drawComets();

  setInterval(()=>spawnComet(Math.random()>0.7?'rocket':'comet'),5000);

  /* ---------- Particles (emoji sparkles) ---------- */
  const particles = [];
  function spawnEmojiBurst(x,y,count=10,set=['✨','💫','⭐']){
    for(let i=0;i<count;i++){
      particles.push({ x, y, vx:(Math.random()-0.5)*3, vy:- (1 + Math.random()*3), life:30 + Math.random()*40, size: 18 + Math.random()*14, char: set[Math.floor(Math.random()*set.length)] });
    }
    if(particles.length > 500) particles.splice(0, particles.length-300);
  }
  function drawParticles(){
    if(!conf) return;
    conf.clearRect(0,0,confettiCanvas.width,confettiCanvas.height);
    conf.textBaseline = 'middle';
    for(let i=particles.length-1;i>=0;i--){
      const p = particles[i];
      conf.globalAlpha = Math.max(0,p.life/70);
      conf.font = `${Math.round(p.size)}px serif`;
      conf.fillText(p.char, p.x, p.y);
      p.x += p.vx; p.y += p.vy; p.vy += 0.06; p.life--;
      if(p.life <= 0) particles.splice(i,1);
    }
    conf.globalAlpha = 1;
    requestAnimationFrame(drawParticles);
  }
  drawParticles();

  /* ---------- Players UI ---------- */
  function ensureDefaultPlayer(){
    if(!Array.isArray(players) || players.length === 0){
      players = [{ name:'Player 1', avatar:'🚀', lastScore:0, coins:0 }];
      localStorage.setItem('ttPlayers', JSON.stringify(players));
    }
  }
  ensureDefaultPlayer();

  function refreshPlayers(){
    playerSelect.innerHTML = '';
    players.forEach((p,i)=>{ const o = document.createElement('option'); o.value = i; o.textContent = `${p.avatar} ${p.name}`; playerSelect.appendChild(o); });
    playerSelect.value = 0;
    walletDisplay.textContent = players[Number(playerSelect.value)].coins || 0;
  }

  addPlayerBtn?.addEventListener('click', ()=>{
    const name = newPlayer.value.trim();
    const sel = avatarPicker.querySelector('.avatar-choice.selected');
    if(!name){ alert('Enter a name'); return; }
    const avatar = sel ? sel.textContent : avatars[0];
    players.push({ name, avatar, lastScore:0, coins:0 });
    localStorage.setItem('ttPlayers', JSON.stringify(players));
    newPlayer.value='';
    renderAvatars(); refreshPlayers();
  });

  resetPlayersBtn?.addEventListener('click', ()=>{ if(!confirm('Clear saved players?')) return; players=[]; localStorage.removeItem('ttPlayers'); ensureDefaultPlayer(); renderAvatars(); refreshPlayers(); });

  function renderAvatars(){
    avatarPicker.innerHTML = '';
    avatars.forEach(a=>{
      const btn = document.createElement('button'); btn.type='button'; btn.className='avatar-choice'; btn.textContent = a;
      btn.addEventListener('click', ()=>{ avatarPicker.querySelectorAll('.avatar-choice').forEach(x=>x.classList.remove('selected')); btn.classList.add('selected'); });
      avatarPicker.appendChild(btn);
    });
    const first = avatarPicker.querySelector('.avatar-choice'); if(first) first.classList.add('selected');
  }

  renderAvatars();
  refreshPlayers();

  /* ---------- Table chips ---------- */
  function renderTableChips(){
    tableList.innerHTML = '';
    for(let i=1;i<=12;i++){
      const b = document.createElement('button'); b.type='button'; b.className='table-chip'; b.textContent = i;
      b.addEventListener('click', ()=>{ b.classList.toggle('selected'); selectedTables = Array.from(document.querySelectorAll('.table-chip.selected')).map(x=>Number(x.textContent)); });
      tableList.appendChild(b);
    }
  }
  renderTableChips(); selectedTables = [];

  /* ---------- Sounds (placeholders) ---------- */
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  // also allow user-supplied audio files; placeholders:
  const audioFiles = {
    start: 'audio/start.mp3',
    countdown: 'audio/countdown.mp3',
    correct: 'audio/correct.mp3',
    wrong: 'audio/wrong.mp3',
    fireworks: 'audio/fireworks.mp3',
    coin: 'audio/coin.mp3'
  };
  // small utility: play short audio file (safe)
  function playFile(path){
    if(muted) return;
    if(!path) return;
    const a = new Audio(path);
    a.volume = 0.9;
    a.play().catch(()=>{});
  }

  /* ---------- Game logic ---------- */
  function generateQuestions(){
    questions = [];
    if(selectedTables.length === 0){ alert('Select at least one table'); return; }
    if(mode === 'practice' || mode === 'lightspeed'){
      selectedTables.forEach(t => { for(let b=1;b<=12;b++) questions.push({ q:`${t} × ${b}`, expected: t*b, t, b }); });
    } else if(mode === 'chaos'){
      for(let i=0;i<50;i++){
        const t = selectedTables[Math.floor(Math.random()*selectedTables.length)];
        const b = Math.floor(Math.random()*12)+1;
        questions.push({ q:`${t} × ${b}`, expected: t*b, t, b });
      }
    }
    // shuffle
    for(let i=questions.length-1;i>0;i--){ const j = Math.floor(Math.random()*(i+1)); [questions[i],questions[j]]=[questions[j],questions[i]]; }
  }

  function updateTopbar(){
    const total = (mode === 'chaos') ? 50 : ((mode==='practice' || mode==='lightspeed') ? (selectedTables.length * 12) : questions.length);
    if(mode === 'lightspeed') questionCounter.textContent = `Question ${Math.max(1, currentQ+1)}`;
    else questionCounter.textContent = `Question ${Math.min(currentQ+1, total)} of ${total}`;
    scoreDisplay.textContent = score; streakDisplay.textContent = streak;
    walletDisplay.textContent = players[Number(playerSelect.value)].coins || 0;
  }

  function presentQuestion(){
    if((mode==='chaos' && currentQ >= 50) || (mode!=='lightspeed' && currentQ >= questions.length)) { finishRound(); return; }
    if(mode==='lightspeed' && remainingTime <= 0){ finishRound(); return; }
    const q = questions[currentQ];
    qText.textContent = q.q;
    answersContainer.innerHTML = '';
    feedback.textContent = '';
    updateTopbar();

    if(multipleChoice){
      const opts = new Set([q.expected]);
      while(opts.size < 4) opts.add(Math.max(1, Math.round(q.expected + (Math.random()*20 - 10))));
      const arr = Array.from(opts);
      for(let i=arr.length-1;i>0;i--){ const j = Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; }
      arr.forEach(v=>{
        const b = document.createElement('button'); b.className='answer-btn'; b.textContent = v;
        b.addEventListener('click', ()=> handleSubmit(v));
        answersContainer.appendChild(b);
      });
      keypad.classList.add('hidden');
      answerInput.parentElement && answerInput.parentElement.classList.add('hidden');
    } else {
      keypad.classList.remove('hidden');
      answersContainer.innerHTML = '';
      answerInput.value = '';
      answerInput.parentElement && answerInput.parentElement.classList.remove('hidden');
      setTimeout(()=>answerInput.focus(), 50);
    }
  }

  function handleSubmit(given){
    const q = questions[currentQ];
    const expected = q.expected;
    const numericGiven = (typeof given === 'number' || !isNaN(Number(given))) ? Number(given) : given;
    const correct = numericGiven === expected;
    sessionLog.push({ q: q.q, expected, given: numericGiven, correct, ts: Date.now() });
    if(correct){
      score++; streak++;
      // add coins to active player
      const idx = Number(playerSelect.value || 0);
      players[idx].coins = (players[idx].coins || 0) + 5;
      localStorage.setItem('ttPlayers', JSON.stringify(players));
      spawnEmojiBurst(window.innerWidth*0.5, window.innerHeight*0.35, 8, ['✨','💫','⭐']);
      playFile(audioFiles.correct);
      playFile(audioFiles.coin);
    } else {
      streak = 0;
      playFile(audioFiles.wrong);
    }
    updateTopbar();
    currentQ++;
    setTimeout(()=>presentQuestion(), 420);
  }

  submitBtn.addEventListener('click', ()=>{ if(answerInput.value.trim() !== '') handleSubmit(answerInput.value.trim()); answerInput.value=''; });
  answerInput.addEventListener('keydown', e => { if(e.key === 'Enter'){ e.preventDefault(); submitBtn.click(); } });

  // keypad clicks
  keypad.addEventListener('click', (e)=>{
    const t = e.target;
    if(!t.classList.contains('key')) return;
    if(t.classList.contains('blank')) return;
    if(t.classList.contains('back')){ answerInput.value = answerInput.value.slice(0, -1); return; }
    if(t.classList.contains('check')){ if(answerInput.value.trim() !== ''){ handleSubmit(answerInput.value.trim()); answerInput.value=''; } return; }
    const d = t.textContent.trim();
    if(d.length === 1 && /\d/.test(d)) answerInput.value += d;
  });

  /* ---------- Countdown & rocket ---------- */
  function startCountdownThenStart(){
    playFile(audioFiles.start);
    countdownOverlay.classList.remove('hidden');
    countdownText.textContent = '3';
    rocketSVG.style.transform = 'translateY(0)';
    let c = 3;
    const iv = setInterval(()=>{
      c--; if(c>0){ countdownText.textContent = String(c); playFile(audioFiles.countdown); }
      else {
        clearInterval(iv);
        countdownText.textContent = 'Blast Off!';
        rocketSVG.style.transform = 'translateY(-140%)';
        setTimeout(()=>{ countdownOverlay.classList.add('hidden'); startGame(); }, 900);
      }
    }, 1000);
  }

  function startGame(){
    sessionLog = [];
    score = 0; streak = 0; currentQ = 0;
    // ensure selectedTables up to date
    selectedTables = Array.from(document.querySelectorAll('.table-chip.selected')).map(x=>Number(x.textContent));
    if(selectedTables.length === 0){ alert('Select at least one table'); return; }
    generateQuestions();
    presentQuestion();
    startTime = Date.now();
    if(mode === 'lightspeed') remainingTime = 60;
    startMainTimer();
    statPage.classList.add('hidden');
    gamePage.classList.remove('hidden');
    activeIndex = Number(playerSelect.value || 0);
    activePlayer = players[activeIndex];
    activePlayerLabel.textContent = `${activePlayer.avatar} ${activePlayer.name}`;
    updateTopbar();
  }

  /* ---------- Timer ---------- */
  function startMainTimer(){
    clearInterval(timerInterval);
    timerInterval = setInterval(()=>{
      if(mode === 'lightspeed'){
        remainingTime--; if(remainingTime < 0) remainingTime = 0;
        timeDisplay.textContent = `00:${String(remainingTime).padStart(2,'0')}`;
        if(remainingTime === 0){ clearInterval(timerInterval); finishRound(); }
      } else {
        const elapsed = Math.floor((Date.now()-startTime)/1000);
        timeDisplay.textContent = `${String(Math.floor(elapsed/60)).padStart(2,'0')}:${String(elapsed%60).padStart(2,'0')}`;
      }
    },1000);
  }

  /* ---------- Finish / Results ---------- */
  function finishRound(){
    clearInterval(timerInterval);
    const playedCount = sessionLog.length;
    const allCorrect = (playedCount > 0 && sessionLog.every(s=>s.correct) && (mode === 'lightspeed' ? true : playedCount === questions.length));
    if(allCorrect){ spawnEmojiBurst(window.innerWidth*0.5, window.innerHeight*0.25, 40, ['☄️','🌟','✨']); playFile(audioFiles.fireworks); }
    // update lastScore for player
    activeIndex = Number(playerSelect.value||0);
    if(players[activeIndex]) { players[activeIndex].lastScore = score; localStorage.setItem('ttPlayers', JSON.stringify(players)); }
    showResultsModal();
    remainingTime = 60;
    timeDisplay.textContent = '01:00';
  }

  function showResultsModal(){
    resultsList.innerHTML = '';
    resultsSummary.innerHTML = `<div style="font-weight:700;margin-bottom:8px">Score: ${score} — Mode: ${mode}</div>`;
    if(sessionLog.length === 0){
      const li = document.createElement('li'); li.textContent = 'No answers recorded.'; resultsList.appendChild(li);
    } else {
      sessionLog.forEach((r,i)=>{
        const li = document.createElement('li');
        li.innerHTML = `<div style="font-weight:700">Question ${i+1}. ${r.q}</div><div style="opacity:0.9">${r.correct ? '✅' : '❌'} Given: ${r.given} — Answer: ${r.expected}</div>`;
        resultsList.appendChild(li);
      });
    }
    resultsModal.classList.remove('hidden');
  }

  closeResults?.addEventListener('click', ()=>{ resultsModal.classList.add('hidden'); statPage.classList.remove('hidden'); gamePage.classList.add('hidden'); });

  /* ---------- Leaderboard ---------- */
  function updateLeaderboard(){
    leaderboardList.innerHTML = '';
    const sorted = (players.slice()).sort((a,b)=> (b.lastScore||0) - (a.lastScore||0));
    sorted.forEach(p=>{ const li = document.createElement('li'); li.innerHTML = `<span>${p.avatar} ${p.name}</span><strong>${p.lastScore ?? '-'}</strong>`; leaderboardList.appendChild(li); });
  }
  leaderboardBtn?.addEventListener('click', ()=>{ updateLeaderboard(); leaderboardModal.classList.remove('hidden'); });
  closeLeaderboard?.addEventListener('click', ()=> leaderboardModal.classList.add('hidden') );
  saveToLeaderboard?.addEventListener('click', ()=>{ const idx = Number(playerSelect.value||0); if(players[idx]){ players[idx].lastScore = score; localStorage.setItem('ttPlayers', JSON.stringify(players)); updateLeaderboard(); alert('Score saved to player.'); } });

  /* ---------- Buttons ---------- */
  startBtn?.addEventListener('click', ()=> {
    // choose mode label selected
    document.querySelectorAll('.mode-btn').forEach(l=>{ if(l.classList.contains('selected')) mode = l.dataset.mode; });
    multipleChoice = mcToggle.checked;
    // stage countdown
    playFile(audioFiles.start);
    startCountdownThenStart();
  });

  // mode button clicks (visual)
  document.querySelectorAll('.mode-btn').forEach(btn=> btn.addEventListener('click', ()=>{
    document.querySelectorAll('.mode-btn').forEach(x=>x.classList.remove('selected'));
    btn.classList.add('selected');
    mode = btn.dataset.mode;
  }));

  newMissionBtn?.addEventListener('click', ()=> {
    clearInterval(timerInterval);
    statPage.classList.remove('hidden');
    gamePage.classList.add('hidden');
    remainingTime = 60; timeDisplay.textContent = '01:00';
    resultsModal.classList.add('hidden'); leaderboardModal.classList.add('hidden');
  });

  // mute
  muteBtn?.addEventListener('click', ()=>{ muted = !muted; muteBtn.textContent = muted ? '🔇' : '🔊'; });

  // New player quick add via Enter
  newPlayer?.addEventListener('keydown', e=>{ if(e.key==='Enter') addPlayerBtn.click(); });

  // update selected tables helper
  function updateSelectedTables(){ selectedTables = Array.from(document.querySelectorAll('.table-chip.selected')).map(x=>Number(x.textContent)); }

  // initial UI fill
  renderAvatars();
  renderTableChips();
  refreshPlayers();
  updateSelectedTables();

  // ensure start page visible
  statPage.classList.remove('hidden');
  gamePage.classList.add('hidden');

}); // DOMContentLoaded end
