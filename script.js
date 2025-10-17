document.addEventListener('DOMContentLoaded', () => {
  // Canvas & SVG layers
  const bgCanvas = document.getElementById('bgCanvas');
  const confCanvas = document.getElementById('confettiCanvas');
  const svgLayer = document.getElementById('svgLayer');
  const bg = bgCanvas.getContext('2d');
  const conf = confCanvas.getContext('2d');

  // Pages & overlays
  const statPage = document.getElementById('statPage');
  const gamePage = document.getElementById('gamePage');
  const countdownOverlay = document.getElementById('countdownOverlay');
  const countdownText = document.getElementById('countdownText');
  const rocketSVG = document.getElementById('rocketSVG');
  const leaderboardModal = document.getElementById('leaderboardModal');
  const leaderboardList = document.getElementById('leaderboardList');

  // Elements
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

  const muteBtn = document.getElementById('muteBtn');
  const leaderboardBtn = document.getElementById('leaderboardBtn');
  const closeLeaderboard = document.getElementById('closeLeaderboard');
  const newMissionBtn = document.getElementById('newMissionBtn');

  // Game variables
  let players = JSON.parse(localStorage.getItem('ttPlayers') || '[]');
  let activePlayer = null, activeIndex = null;
  let selectedTables = [], mode = 'practice', multipleChoice = false;
  let score = 0, streak = 0, currentQ = 0, questions = [], startTime = 0;
  let lightspeedTimer = null, remainingTime = 60;
  let timerInterval = null, muted = false;

  const avatars = ['🚀','🛸','👽','🌟','🌕','🪐','🛰','☄️'];

  // Sounds
  const correctSound = new Audio('https://freesound.org/data/previews/320/320655_5260877-lq.mp3');
  const wrongSound = new Audio('https://freesound.org/data/previews/109/109662_945474-lq.mp3');
  const perfectSound = new Audio('https://freesound.org/data/previews/331/331912_3248244-lq.mp3');

  function resizeCanvas(){
    bgCanvas.width = window.innerWidth;
    bgCanvas.height = window.innerHeight;
    confCanvas.width = window.innerWidth;
    confCanvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // Player functions
  function renderPlayers(){
    playerSelect.innerHTML = '';
    players.forEach((p,i)=>{
      const opt = document.createElement('option');
      opt.value = i; opt.textContent = `${p.avatar} ${p.name}`;
      playerSelect.appendChild(opt);
    });
    if(activeIndex!=null) playerSelect.value = activeIndex;
  }

  function renderAvatars(){
    avatarPicker.innerHTML = '';
    avatars.forEach(a=>{
      const span = document.createElement('div');
      span.className='avatar-choice'; span.textContent=a;
      span.onclick = ()=>{document.querySelectorAll('.avatar-choice').forEach(c=>c.classList.remove('selected')); span.classList.add('selected');};
      avatarPicker.appendChild(span);
    });
  }

  addPlayerBtn.onclick = ()=>{
    const name = newPlayer.value.trim();
    const avatarEl = document.querySelector('.avatar-choice.selected');
    if(!name || !avatarEl) return;
    const avatar = avatarEl.textContent;
    players.push({name,avatar});
    localStorage.setItem('ttPlayers', JSON.stringify(players));
    newPlayer.value=''; document.querySelectorAll('.avatar-choice').forEach(c=>c.classList.remove('selected'));
    renderPlayers();
  };

  renderPlayers(); renderAvatars();

  // Table chips
  for(let i=1;i<=12;i++){
    const chip = document.createElement('div'); chip.className='table-chip'; chip.textContent=i;
    chip.onclick=()=>{chip.classList.toggle('selected'); updateSelectedTables();};
    tableList.appendChild(chip);
  }
  function updateSelectedTables(){
    selectedTables = Array.from(document.querySelectorAll('.table-chip.selected')).map(c=>parseInt(c.textContent));
  }

  // Mode & MC toggle
  document.querySelectorAll('input[name="mode"]').forEach(r=>r.addEventListener('change',e=>mode=e.target.value));
  mcToggle.addEventListener('change', ()=>multipleChoice=mcToggle.checked);

  // Generate questions
  function generateQuestions(){
    questions=[];
    if(mode==='practice' || mode==='lightspeed'){
      selectedTables.forEach(t=>{
        for(let i=1;i<=12;i++) questions.push({q:`${t} × ${i}`,a:t*i});
      });
    }else if(mode==='chaos'){
      for(let i=0;i<50;i++){
        const t = selectedTables[Math.floor(Math.random()*selectedTables.length)];
        const n = Math.floor(Math.random()*12)+1;
        questions.push({q:`${t} × ${n}`,a:t*n});
      }
    }
    questions = questions.sort(()=>0.5-Math.random());
  }

  // Display question
  function showQuestion(){
    if(currentQ>=questions.length || (mode==='lightspeed' && remainingTime<=0)){
      endGame(); return;
    }
    const q = questions[currentQ];
    qText.textContent = q.q;
    answersContainer.innerHTML=''; feedback.textContent='';

    const totalQuestions = mode==='chaos'?50:((mode==='practice')?questions.length:currentQ+1);
    questionCounter.textContent = (mode==='lightspeed')?`Question ${currentQ+1}`:`Question ${currentQ+1} of ${totalQuestions}`;

    if(multipleChoice){
      const choices = new Set([q.a]);
      while(choices.size<4) choices.add(Math.floor(Math.random()*144)+1);
      [...choices].sort(()=>0.5-Math.random()).forEach(c=>{
        const btn = document.createElement('button');
        btn.textContent=c; btn.className='answer-btn';
        btn.onclick=()=>checkAnswer(c);
        answersContainer.appendChild(btn);
      });
      answerInput.style.display='none'; submitBtn.style.display='none';
    }else{
      answerInput.value=''; answerInput.style.display='inline-block'; submitBtn.style.display='inline-block';
    }
  }

  function checkAnswer(ans){
    const q=questions[currentQ]; let correct=false;
    if(ans===q.a || parseInt(ans)===q.a) correct=true;

    if(correct){score++; streak++; sparkConfetti(1); if(!muted) correctSound.play();}
    else{streak=0; if(!muted) wrongSound.play();}
    scoreDisplay.textContent=score; streakDisplay.textContent=streak;
    currentQ++; setTimeout(showQuestion,400);
  }

  // Countdown overlay
  function startCountdown(callback){
    countdownOverlay.classList.remove('hidden');
    let count=3;
    countdownText.textContent=count;
    rocketSVG.style.transform='translateY(0)';
    const interval=setInterval(()=>{
      count--;
      if(count>0){countdownText.textContent=count;}
      else{
        clearInterval(interval);
        countdownText.textContent='Blast Off!';
        rocketSVG.style.transform='translateY(-120%)';
        setTimeout(()=>{countdownOverlay.classList.add('hidden'); callback();},1000);
      }
    },1000);
  }

  // Start game
  function startGame(){
    if(players.length===0) return alert('Add a player first!');
    activeIndex = parseInt(playerSelect.value); activePlayer = players[activeIndex];
    activePlayerLabel.textContent = `${activePlayer.avatar} ${activePlayer.name}`;
    updateSelectedTables();
    if(selectedTables.length===0) return alert('Select at least one table!');
    generateQuestions(); score=0; streak=0; currentQ=0; startTime=Date.now(); scoreDisplay.textContent=0; streakDisplay.textContent=0;
    remainingTime = 60;
    startCountdown(()=>{
      statPage.classList.add('hidden'); gamePage.classList.remove('hidden');
      showQuestion(); startTimer();
    });
  }
  startBtn.onclick=startGame;

  // New mission
  newMissionBtn.onclick=()=>{gamePage.classList.add('hidden'); statPage.classList.remove('hidden'); clearInterval(timerInterval);};

  // Timer
  function startTimer(){
    clearInterval(timerInterval);
    timerInterval=setInterval(()=>{
      if(mode==='lightspeed'){remainingTime--; if(remainingTime<=0) {endGame(); return;} timeDisplay.textContent=`00:${String(remainingTime).padStart(2,'0')}`;}
      else{let t=Math.floor((Date.now()-startTime)/1000); timeDisplay.textContent=`${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`;}
    },1000);
  }

  submitBtn.onclick=()=>checkAnswer(answerInput.value);
  answerInput.addEventListener('keydown',e=>{if(e.key==='Enter') submitBtn.click();});

  // Mute toggle
  muteBtn.onclick=()=>{muted=!muted; muteBtn.textContent=muted?'🔇':'🔊';};

  // Leaderboard modal
  leaderboardBtn.onclick=()=>{updateLeaderboard(); leaderboardModal.classList.remove('hidden');};
  closeLeaderboard.onclick=()=>{leaderboardModal.classList.add('hidden');};

  function updateLeaderboard(){
    leaderboardList.innerHTML='';
    players.forEach(p=>{
      const li=document.createElement('li');
      li.textContent=`${p.avatar} ${p.name}`;
      const scoreSpan=document.createElement('span');
      scoreSpan.textContent = (p.name===activePlayer.name)?score:'-';
      li.appendChild(scoreSpan);
      leaderboardList.appendChild(li);
    });
  }

  // Confetti / sparkles
  function sparkConfetti(n){
    for(let i=0;i<n;i++){
      const x=Math.random()*confCanvas.width;
      const y=Math.random()*confCanvas.height;
      conf.fillStyle='rgba(255,255,255,0.7)'; conf.beginPath();
      conf.arc(x,y,4*Math.random()+2,0,Math.PI*2); conf.fill();
    }
  }

  // Emoji + planet background
  const emojis=[]; const planets=[];
  for(let i=0;i<50;i++) emojis.push({x:Math.random()*bgCanvas.width, y:Math.random()*bgCanvas.height, vx:(Math.random()-0.5)*0.2, vy:(Math.random()-0.5)*0.2, char:avatars[Math.floor(Math.random()*avatars.length)], size:16+Math.random()*16});
  for(let i=0;i<5;i++) planets.push({x:Math.random()*bgCanvas.width, y:Math.random()*bgCanvas.height, r:20+Math.random()*50, color:`hsl(${Math.random()*360},60%,50%)`, vy:0.05+Math.random()*0.1});

  function drawBG(){
    bg.clearRect(0,0,bgCanvas.width,bgCanvas.height);
    planets.forEach(p=>{p.y-=p.vy; if(p.y<-p.r) p.y=bgCanvas.height+p.r; bg.fillStyle=p.color; bg.beginPath(); bg.arc(p.x,p.y,p.r,0,Math.PI*2); bg.fill();});
    emojis.forEach(e=>{e.x+=e.vx; e.y+=e.vy; if(e.x<0) e.x=bgCanvas.width; if(e.x>bgCanvas.width) e.x=0; if(e.y<0) e.y=bgCanvas.height; if(e.y>bgCanvas.height) e.y=0; bg.font=`${e.size}px serif`; bg.fillText(e.char,e.x,e.y);});
    requestAnimationFrame(drawBG);
  }
  drawBG();

  function endGame(){
    clearInterval(timerInterval);
    if(score===questions.length && questions.length>0 && !muted) perfectSound.play();
    updateLeaderboard(); leaderboardModal.classList.remove('hidden');
  }
});
