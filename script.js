/* Final script.js — virtual keypad + logging for all modes + sounds + comets + results modal */
document.addEventListener('DOMContentLoaded', () => {
  /* ---------- Elements ---------- */
  const bgCanvas = document.getElementById('bgCanvas');
  const confCanvas = document.getElementById('confettiCanvas');
  const cometCanvas = document.getElementById('cometCanvas');
  const bg = bgCanvas.getContext('2d');
  const conf = confCanvas.getContext('2d');
  const cometCtx = cometCanvas.getContext('2d');

  const statPage = document.getElementById('statPage');
  const gamePage = document.getElementById('gamePage');
  const countdownOverlay = document.getElementById('countdownOverlay');
  const countdownText = document.getElementById('countdownText');
  const rocketSVG = document.getElementById('rocketSVG');

  const playerSelect = document.getElementById('playerSelect');
  const newPlayer = document.getElementById('newPlayer');
  const addPlayerBtn = document.getElementById('addPlayerBtn');
  const avatarPicker = document.getElementById('avatarPicker');
  const tableList = document.getElementById('tableList');
  const startBtn = document.getElementById('startBtn');
  const mcToggle = document.getElementById('mcToggle');

  const activePlayerLabel = document.getElementById('activePlayerLabel');
  const scoreDisplay = document.getElementById('scoreDisplay');
  const streakDisplay = document.getElementById('streakDisplay');
  const timeDisplay = document.getElementById('timeDisplay');
  const questionCounter = document.getElementById('questionCounter');
  const qText = document.getElementById('questionText');
  const answersContainer = document.getElementById('answersContainer');
  const answerInput = document.getElementById('answerInput');
  const submitBtn = document.getElementById('submitBtn');
  const feedback = document.getElementById('feedback');

  const keypad = document.getElementById('keypad');
  const leaderboardBtn = document.getElementById('leaderboardBtn');
  const leaderboardModal = document.getElementById('leaderboardModal');
  const leaderboardList = document.getElementById('leaderboardList');
  const closeLeaderboard = document.getElementById('closeLeaderboard');

  const resultsModal = document.getElementById('resultsModal');
  const resultsList = document.getElementById('resultsList');
  const resultsSummary = document.getElementById('resultsSummary');
  const closeResults = document.getElementById('closeResults');
  const saveToLeaderboard = document.getElementById('saveToLeaderboard');

  const newMissionBtn = document.getElementById('newMissionBtn');
  const resetPlayersBtn = document.getElementById('resetPlayers');
  const muteBtn = document.getElementById('muteBtn');

  /* ---------- State ---------- */
  let players = JSON.parse(localStorage.getItem('ttPlayers') || '[]');
  let activeIndex = null;
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

  // single persistent log that records all Qs & answers for the last finished game (used in Results modal)
  let sessionLog = []; // { q, expected, given, correct, timestamp }

  /* ---------- Avatars ---------- */
  const avatars = ['🚀','🛸','👽','🌟','🌕','🪐','🛰','☄️'];
  function renderAvatars(){
    avatarPicker.innerHTML = '';
    avatars.forEach(a=>{
      const btn = document.createElement('button');
      btn.type='button'; btn.className='avatar-choice'; btn.textContent = a;
      btn.addEventListener('click', ()=>{ document.querySelectorAll('.avatar-choice').forEach(x=>x.classList.remove('selected')); btn.classList.add('selected'); });
      avatarPicker.appendChild(btn);
    });
    const first = avatarPicker.querySelector('.avatar-choice'); if(first) first.classList.add('selected');
  }

  /* ---------- Resize canvases ---------- */
  function resizeAll(){
    const dpr = window.devicePixelRatio || 1;
    [bgCanvas, confCanvas, cometCanvas].forEach(c=>{
      c.style.width = window.innerWidth + 'px';
      c.style.height = window.innerHeight + 'px';
      c.width = Math.round(window.innerWidth * dpr);
      c.height = Math.round(window.innerHeight * dpr);
    });
  }
  window.addEventListener('resize', resizeAll);
  resizeAll();

  /* ---------- Players UI ---------- */
  function refreshPlayers(){
    playerSelect.innerHTML = '';
    players.forEach((p,i)=>{ const o = document.createElement('option'); o.value = i; o.textContent = `${p.avatar} ${p.name}`; playerSelect.appendChild(o); });
    if(players.length) playerSelect.value = 0;
  }
  addPlayerBtn.addEventListener('click', ()=>{
    const name = newPlayer.value.trim();
    const sel = document.querySelector('.avatar-choice.selected');
    if(!name){ alert('Enter a name'); return; }
    if(!sel){ alert('Pick an avatar'); return; }
    players.push({ name, avatar: sel.textContent, lastScore: 0 });
    localStorage.setItem('ttPlayers', JSON.stringify(players));
    newPlayer.value=''; document.querySelectorAll('.avatar-choice').forEach(x=>x.classList.remove('selected'));
    refreshPlayers();
  });
  resetPlayersBtn.addEventListener('click', ()=>{ if(!confirm('Clear saved players?')) return; players=[]; localStorage.removeItem('ttPlayers'); refreshPlayers(); });

  renderAvatars();
  refreshPlayers();

  /* ---------- Table chips ---------- */
  function renderTableChips(){
    tableList.innerHTML = '';
    for(let i=1;i<=12;i++){
      const b = document.createElement('button'); b.type='button'; b.className='table-chip'; b.textContent = i;
      b.addEventListener('click', ()=>{ b.classList.toggle('selected'); updateSelectedTables(); });
      tableList.appendChild(b);
    }
  }
  function updateSelectedTables(){ selectedTables = Array.from(document.querySelectorAll('.table-chip.selected')).map(x=>Number(x.textContent)); }
  renderTableChips(); updateSelectedTables();

  /* ---------- WebAudio synthesized sounds ---------- */
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  let audioCtx = null;
  function ensureAudio(){ if(!audioCtx) audioCtx = new AudioCtor(); return audioCtx; }

  function soundCorrect(){
    if(muted) return;
    try{
      const ctx = ensureAudio(); const now = ctx.currentTime;
      const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
      o1.type='sine'; o2.type='sine'; o1.frequency.value=880; o2.frequency.value=1320;
      g.gain.setValueAtTime(0.12, now); g.gain.exponentialRampToValueAtTime(0.001, now+0.45);
      o1.connect(g); o2.connect(g); g.connect(ctx.destination); o1.start(now); o2.start(now); o1.stop(now+0.45); o2.stop(now+0.45);
    }catch(e){}
  }
  function soundWrong(){
    if(muted) return;
    try{
      const ctx = ensureAudio(); const now = ctx.currentTime;
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type='triangle'; o.frequency.value=220;
      g.gain.setValueAtTime(0.14, now); g.gain.exponentialRampToValueAtTime(0.001, now+0.36);
      o.connect(g); g.connect(ctx.destination); o.start(now); o.stop(now+0.36);
    }catch(e){}
  }
  function soundPerfect(){
    if(muted) return;
    try{
      const ctx = ensureAudio(); const now = ctx.currentTime;
      const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
      o1.type='sine'; o2.type='sine'; o1.frequency.value=660; o2.frequency.value=990;
      g.gain.setValueAtTime(0.14, now); g.gain.exponentialRampToValueAtTime(0.001, now+1.0);
      o1.connect(g); o2.connect(g); g.connect(ctx.destination); o1.start(now); o2.start(now); o1.stop(now+0.95); o2.stop(now+0.95);
    }catch(e){}
  }

  /* ---------- Background: planets + emoji parallax + stars ---------- */
  const stars = [], emojis = [], planets = [];
  function initBackground(){
    stars.length=0; emojis.length=0; planets.length=0;
    const W = bgCanvas.width, H = bgCanvas.height;
    for(let i=0;i<140;i++) stars.push({ x: Math.random()*W, y: Math.random()*H, r: Math.random()*1.3+0.2, speed: 0.03 + Math.random()*0.2 });
    for(let i=0;i<36;i++) emojis.push({ x: Math.random()*W, y: Math.random()*H, vx:(Math.random()-0.5)*0.22, vy:(Math.random()-0.5)*0.22, char: avatars[Math.floor(Math.random()*avatars.length)], size: 16 + Math.random()*20 });
    for(let i=0;i<5;i++) planets.push({ x: Math.random()*W, y: Math.random()*H, r: 22 + Math.random()*60, color: `hsl(${Math.random()*360},70%,55%)`, vy: 0.02 + Math.random()*0.08 });
  }
  initBackground();

  function drawBackground(){
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

  /* ---------- Comets / rockets ---------- */
  const comets = [];
  function spawnComet(kind='comet'){
    const startX = Math.random() * cometCanvas.width * 0.8;
    comets.push({ x: startX, y:-30, vx: 3 + Math.random()*4, vy: 1.6 + Math.random()*1.8, len: 40 + Math.random()*80, life: 320, kind });
    if(comets.length > 12) comets.splice(0, comets.length-10);
  }
  // periodic spawn
  setTimeout(function cometLoop(){
    spawnComet(Math.random()>0.6 ? 'rocket' : 'comet');
    setTimeout(cometLoop, 18000 + Math.random()*12000);
  }, 8000);

  function drawComets(){
    cometCtx.clearRect(0,0,cometCanvas.width,cometCanvas.height);
    for(let i=comets.length-1;i>=0;i--){
      const c = comets[i];
      cometCtx.beginPath();
      cometCtx.lineWidth = c.kind==='rocket' ? 3 : 2;
      cometCtx.strokeStyle = c.kind==='rocket' ? 'rgba(255,210,140,0.95)' : 'rgba(255,255,220,0.95)';
      cometCtx.moveTo(c.x, c.y); cometCtx.lineTo(c.x - c.len, c.y - c.len*0.25); cometCtx.stroke();
      cometCtx.beginPath(); cometCtx.fillStyle = c.kind==='rocket' ? '#ffdd99' : '#fff8cc'; cometCtx.arc(c.x, c.y, c.kind==='rocket'?5:3, 0, Math.PI*2); cometCtx.fill();
      c.x += c.vx; c.y += c.vy; c.life--;
      if(c.x > cometCanvas.width + 80 || c.y > cometCanvas.height + 80 || c.life <= 0) comets.splice(i,1);
    }
    requestAnimationFrame(drawComets);
  }
  drawComets();

  /* ---------- Particles (emoji sparkles) ---------- */
  const particles = [];
  function spawnEmojiBurst(x,y,count=10,set=['✨','💫','⭐']){
    for(let i=0;i<count;i++){
      particles.push({ x, y, vx:(Math.random()-0.5)*3, vy:- (1 + Math.random()*3), life:30 + Math.random()*40, size: 18 + Math.random()*14, char: set[Math.floor(Math.random()*set.length)] });
    }
    if(particles.length > 500) particles.splice(0, particles.length-300);
  }
  function drawParticles(){
    conf.clearRect(0,0,confCanvas.width,confCanvas.height);
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

  /* ---------- Game logic ---------- */
  function generateQuestions(){
    questions = [];
    if(mode === 'practice' || mode === 'lightspeed'){
      selectedTables.forEach(t => { for(let b=1;b<=12;b++) questions.push({ q:`${t} × ${b}`, expected: t*b }); });
    } else if(mode === 'chaos'){
      for(let i=0;i<50;i++){
        const t = selectedTables[Math.floor(Math.random()*selectedTables.length)];
        const b = Math.floor(Math.random()*12)+1;
        questions.push({ q:`${t} × ${b}`, expected: t*b });
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
  }

  function presentQuestion(){
    if(mode==='chaos' && currentQ >= 50){ finishRound(); return; }
    if(mode!=='lightspeed' && currentQ >= questions.length){ finishRound(); return; }
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
      // hide keypad in MC
      keypad.classList.add('hidden');
    } else {
      // show keypad
      keypad.classList.remove('hidden');
      answersContainer.innerHTML = '';
      answerInput.value = '';
      setTimeout(()=>answerInput.focus(), 50);
    }
  }

  function handleSubmit(given){
    const q = questions[currentQ];
    const expected = q.expected;
    const numericGiven = (typeof given === 'number' || !isNaN(Number(given))) ? Number(given) : given;
    const correct = numericGiven === expected;
    // log
    sessionLog.push({ q: q.q, expected, given: numericGiven, correct, ts: Date.now() });
    if(correct){
      score++; streak++;
      // one burst only
      const rect = qText.getBoundingClientRect();
      spawnEmojiBurst(rect.left + rect.width/2, rect.top + rect.height/2, 10);
      soundCorrect();
    } else {
      streak = 0;
      soundWrong();
    }
    updateTopbar();
    currentQ++;
    setTimeout(()=>presentQuestion(), 420);
  }

  submitBtn.addEventListener('click', ()=> { if(answerInput.value.trim() !== '') handleSubmit(answerInput.value.trim()); answerInput.value=''; });
  answerInput.addEventListener('keydown', e => { if(e.key === 'Enter') submitBtn.click(); });

  /* ---------- Virtual keypad wiring ---------- */
  keypad.addEventListener('click', (e)=>{
    const t = e.target;
    if(!t.classList.contains('key')) return;
    if(t.classList.contains('blank')) return;
    if(t.classList.contains('back')){
      // remove last digit
      answerInput.value = answerInput.value.slice(0, -1);
      return;
    }
    if(t.classList.contains('check')){
      // submit
      if(answerInput.value.trim() !== '') { handleSubmit(answerInput.value.trim()); answerInput.value = ''; }
      return;
    }
    // digit
    const d = t.textContent.trim();
    if(d.length === 1 && /\d/.test(d)) answerInput.value += d;
  });

  /* ---------- Countdown & rocket ---------- */
  function startCountdownThenStart(){
    countdownOverlay.classList.remove('hidden');
    countdownText.textContent = '3';
    rocketSVG.style.transform = 'translateY(0)';
    let c = 3;
    const iv = setInterval(()=>{
      c--; if(c>0) countdownText.textContent = String(c);
      else {
        clearInterval(iv);
        countdownText.textContent = 'Blast Off!';
        rocketSVG.style.transform = 'translateY(-140%)';
        setTimeout(()=>{ countdownOverlay.classList.add('hidden'); startGame(); }, 900);
      }
    }, 1000);
  }

  function startGame(){
    // initialize session state
    sessionLog = [];
    score = 0; streak = 0; currentQ = 0;
    // selected tables already set
    generateQuestions();
    presentQuestion();
    startTime = Date.now();
    if(mode === 'lightspeed') remainingTime = 60;
    startMainTimer();
    statPage.classList.add('hidden');
    gamePage.classList.remove('hidden');
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
    }, 1000);
  }

  /* ---------- Finish / Results ---------- */
  function finishRound(){
    clearInterval(timerInterval);
    // detect perfect (non-lightspeed: answered all & all correct)
    const playedCount = sessionLog.length;
    const allCorrect = (playedCount > 0 && sessionLog.every(s => s.correct) && (mode === 'lightspeed' ? true : playedCount === questions.length));
    if(allCorrect){ spawnEmojiBurst(window.innerWidth*0.5, window.innerHeight*0.25, 40, ['☄️','🌟','✨']); soundPerfect(); }

    // update lastScore for player
    activeIndex = Number(playerSelect.value);
    if(activeIndex != null && players[activeIndex]){ players[activeIndex].lastScore = score; localStorage.setItem('ttPlayers', JSON.stringify(players)); }

    // show unified results modal (works for all modes)
    showResultsModal();
    // reset lightspeed time display
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
        li.innerHTML = `<div style="font-weight:700">${i+1}. ${r.q}</div><div style="opacity:0.9">${r.correct ? '✅' : '❌'} Given: ${r.given} — Answer: ${r.expected}</div>`;
        resultsList.appendChild(li);
      });
    }
    resultsModal.classList.remove('hidden');
  }

  /* ---------- Leaderboard ---------- */
  function updateLeaderboard(){
    leaderboardList.innerHTML = '';
    players.forEach(p=>{ const li = document.createElement('li'); li.innerHTML = `<span>${p.avatar} ${p.name}</span><strong>${p.lastScore ?? '-'}</strong>`; leaderboardList.appendChild(li); });
  }

  leaderboardBtn.addEventListener('click', ()=>{ updateLeaderboard(); leaderboardModal.classList.remove('hidden'); });
  closeLeaderboard.addEventListener('click', ()=> leaderboardModal.classList.add('hidden') );
  closeResults.addEventListener('click', ()=> resultsModal.classList.add('hidden') );
  saveToLeaderboard.addEventListener('click', ()=>{ if(activeIndex!=null && players[activeIndex]){ players[activeIndex].lastScore = score; localStorage.setItem('ttPlayers', JSON.stringify(players)); updateLeaderboard(); alert('Score saved to player.'); } });

  /* ---------- Buttons ---------- */
  startBtn.addEventListener('click', ()=>{
    if(players.length === 0){ alert('Add a player first'); return; }
    activeIndex = Number(playerSelect.value); activePlayer = players[activeIndex];
    activePlayerLabel.textContent = `${activePlayer.avatar} ${activePlayer.name}`;
    updateSelectedTables();
    if(selectedTables.length === 0){ alert('Select at least one table'); return; }
    mode = document.querySelector('input[name="mode"]:checked').value;
    multipleChoice = mcToggle.checked;
    // prepare time display
    timeDisplay.textContent = mode === 'lightspeed' ? '01:00' : '00:00';
    // show countdown
    startCountdownThenStart();
  });

  newMissionBtn.addEventListener('click', ()=>{
    clearInterval(timerInterval);
    statPage.classList.remove('hidden');
    gamePage.classList.add('hidden');
    remainingTime = 60; timeDisplay.textContent = '01:00';
    resultsModal.classList.add('hidden'); leaderboardModal.classList.add('hidden');
  });

  resetPlayersBtn.addEventListener('click', ()=>{players=[];localStorage.removeItem('ttPlayers');refreshPlayers();});

  /* ---------- Mute ---------- */
  muteBtn.addEventListener('click', ()=>{ muted = !muted; muteBtn.textContent = muted ? '🔇' : '🔊'; });

  /* ---------- Helpers ---------- */
  function updateSelectedTables(){ selectedTables = Array.from(document.querySelectorAll('.table-chip.selected')).map(x=>Number(x.textContent)); }
  newPlayer.addEventListener('keydown', e=>{ if(e.key==='Enter') addPlayerBtn.click(); });

  // refill UI initial
  refreshPlayers();
  renderAvatars();
  renderTableChips();
  updateSelectedTables();

  // ensure canvases size & background correct
  resizeAll();
  initBackground();

  // tiny UX: hide keypad if MC selected initially
  mcToggle.addEventListener('change', ()=> { if(mcToggle.checked) keypad.classList.add('hidden'); else keypad.classList.remove('hidden'); });

}); // DOMContentLoaded end
