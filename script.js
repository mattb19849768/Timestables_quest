document.addEventListener('DOMContentLoaded', () => {

  const bgCanvas = document.getElementById('bgCanvas'), bgCtx = bgCanvas.getContext('2d');
  const confCanvas = document.getElementById('confettiCanvas'), confCtx = confCanvas.getContext('2d');
  const fireCanvas = document.getElementById('fireworksCanvas'), fireCtx = fireCanvas.getContext('2d');

  let players = [], activePlayer = null, tables = [], questions = [], currentQ = 0, score = 0, streak = 0;
  let mode = 'practice', multipleChoice = false;
  let timerInterval = null, startTime = 0;

  const statPage = document.getElementById('statPage');
  const gamePage = document.getElementById('gamePage');
  const playerSelect = document.getElementById('playerSelect');
  const scoreboard = document.getElementById('scoreboard');
  const tableList = document.getElementById('tableList');
  const startBtn = document.getElementById('startBtn');
  const leaderBtn = document.getElementById('leaderBtn');
  const resetBtn = document.getElementById('resetBtn');
  const answerInput = document.getElementById('answerInput');
  const submitBtn = document.getElementById('submitBtn');
  const answersContainer = document.getElementById('answersContainer');
  const feedback = document.getElementById('feedback');
  const activePlayerLabel = document.getElementById('activePlayerLabel');
  const scoreDisplay = document.getElementById('scoreDisplay');
  const streakDisplay = document.getElementById('streakDisplay');
  const qnumDisplay = document.getElementById('qnumDisplay');
  const countdownOverlay = document.getElementById('countdownOverlay');
  const countdownText = document.getElementById('countdownText');
  const rocketSVG = document.getElementById('rocketSVG');
  const leaderModal = document.getElementById('leaderModal');
  const leaderClose = document.getElementById('leaderClose');

  const avatarPicker = document.getElementById('avatarPicker');
  const avatarList = ['🚀','🛸','🌟','🌙','🪐','✨'];
  let selectedAvatar = null;

  // ------------------ CANVAS RESIZE ------------------
  function resizeCanvas() {
    bgCanvas.width = window.innerWidth; bgCanvas.height = window.innerHeight;
    confCanvas.width = window.innerWidth; confCanvas.height = window.innerHeight;
    fireCanvas.width = window.innerWidth; fireCanvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // ------------------ PLAYER / AVATAR ------------------
  avatarList.forEach(a=>{
    const div = document.createElement('div'); div.className='avatar-choice'; div.textContent=a;
    div.addEventListener('click',()=>{
      selectedAvatar=a;
      document.querySelectorAll('.avatar-choice').forEach(c=>c.classList.remove('selected'));
      div.classList.add('selected');
    });
    avatarPicker.appendChild(div);
  });

  document.getElementById('addPlayerBtn').addEventListener('click',()=>{
    const name=document.getElementById('newPlayer').value.trim();
    if(!name||!selectedAvatar)return alert('Pick avatar and name');
    players.push({name, avatar:selectedAvatar, bestPractice:0, bestChaos:0});
    selectedAvatar=null; document.getElementById('newPlayer').value='';
    document.querySelectorAll('.avatar-choice').forEach(c=>c.classList.remove('selected'));
    savePlayers(); updatePlayerSelect();
  });

  playerSelect.addEventListener('change',()=>{activePlayer=players[playerSelect.value];});

  leaderBtn.addEventListener('click',()=>{leaderModal.classList.remove('hidden');});
  leaderClose.addEventListener('click',()=>{leaderModal.classList.add('hidden');});

  function savePlayers(){ localStorage.setItem('ttPlayers', JSON.stringify(players)); }
  function loadPlayers(){ players=JSON.parse(localStorage.getItem('ttPlayers')||'[]'); updatePlayerSelect(); }
  function updatePlayerSelect(){
    playerSelect.innerHTML='<option value="">Select Player</option>';
    players.forEach((p,i)=>playerSelect.innerHTML+=`<option value="${i}">${p.name}</option>`);
    updateScoreboard();
  }
  function updateScoreboard(){
    scoreboard.innerHTML=players.map(p=>`<div>${p.avatar} ${p.name}: Best Practice ${p.bestPractice||0}, Best Chaos ${p.bestChaos||0}</div>`).join('');
  }

  // ------------------ TABLES ------------------
  for(let i=2;i<=12;i++){
    const chip=document.createElement('div'); chip.className='table-chip'; chip.textContent=i;
    chip.addEventListener('click',()=>{chip.classList.toggle('selected');});
    tableList.appendChild(chip);
  }

  // ------------------ TIMER ------------------
  function startTimer(){
    startTime = Date.now();
    timerInterval = setInterval(()=>{
      const elapsed = Date.now() - startTime;
      const minutes = Math.floor(elapsed/60000).toString().padStart(2,'0');
      const seconds = Math.floor((elapsed%60000)/1000).toString().padStart(2,'0');
      document.getElementById('timeDisplay').textContent = `${minutes}:${seconds}`;
    },500);
  }
  function stopTimer(){ clearInterval(timerInterval); }

  // ------------------ GAME LOGIC ------------------
  startBtn.addEventListener('click',startGame);
  document.getElementById('newMissionBtn').addEventListener('click',()=>{gamePage.classList.add('hidden'); statPage.classList.remove('hidden'); stopTimer();});
  document.getElementById('playAgainBtn').addEventListener('click',startGame);

  function startGame(){
    if(!activePlayer) return alert('Select player');
    tables=[]; document.querySelectorAll('.table-chip.selected').forEach(c=>tables.push(parseInt(c.textContent)));
    if(tables.length===0) return alert('Select at least one table');
    mode=document.querySelector('input[name="mode"]:checked').value;
    multipleChoice=document.getElementById('mcToggle').checked;
    score=0; streak=0; currentQ=0;
    activePlayerLabel.textContent=activePlayer.name;
    scoreDisplay.textContent=0; streakDisplay.textContent=0; qnumDisplay.textContent=0;
    document.getElementById('timeDisplay').textContent='00:00';
    generateQuestions();
    statPage.classList.add('hidden'); gamePage.classList.remove('hidden');
    runCountdown();
  }

  function generateQuestions(){
    questions=[];
    if(mode==='chaos'){
      for(let i=0;i<50;i++){
        const t=tables[Math.floor(Math.random()*tables.length)];
        questions.push({a:t,b:Math.ceil(Math.random()*12)});
      }
    } else {
      tables.forEach(t=>{for(let i=1;i<=12;i++){questions.push({a:t,b:i});}});
    }
    shuffleArray(questions);
  }

  function shuffleArray(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]];}}

  // ------------------ COUNTDOWN ------------------
  function runCountdown(){
    countdownOverlay.classList.remove('hidden');
    let count=3;
    rocketSVG.style.transform='translateY(0)';
    const interval=setInterval(()=>{
      if(count>0){countdownText.textContent=count; playTone(440+count*100,0.2);}
      else{countdownText.textContent='Blast Off!'; playTone(880,0.4); animateRocket(); startTimer();}
      count--; if(count<-1){clearInterval(interval); countdownOverlay.classList.add('hidden'); showQuestion();}
    },800);
  }

  function animateRocket(){let y=0; const anim=setInterval(()=>{y-=8; rocketSVG.style.transform=`translateY(${y}px)`; if(y<-window.innerHeight)clearInterval(anim);},30);}

  // ------------------ SHOW QUESTIONS ------------------
  function showQuestion(){
    if(currentQ>=questions.length){endGame(); return;}
    const q=questions[currentQ];
    document.getElementById('questionText').textContent=`${q.a} × ${q.b} = ?`;
    if(multipleChoice){
      answersContainer.innerHTML=''; const correct=q.a*q.b;
      const options=[correct];
      while(options.length<4){const o=Math.floor(Math.random()*12*q.a)+1; if(!options.includes(o)) options.push(o);}
      shuffleArray(options);
      options.forEach(o=>{
        const btn=document.createElement('button'); btn.className='answer-btn'; btn.textContent=o;
        btn.addEventListener('click',()=>{checkAnswer(o);}); answersContainer.appendChild(btn);
      });
      answerInput.parentElement.style.display='none';
    } else {
      answersContainer.innerHTML=''; answerInput.value=''; answerInput.parentElement.style.display='flex'; answerInput.focus();
    }
    qnumDisplay.textContent=currentQ+1;
  }

  submitBtn.addEventListener('click',()=>checkAnswer(parseInt(answerInput.value)));
  answerInput.addEventListener('keydown',(e)=>{if(e.key==='Enter') submitBtn.click();});

  function checkAnswer(ans){
    const q=questions[currentQ]; const correct=q.a*q.b;
    if(ans===correct){score++; streak++; feedback.textContent='Correct!'; feedback.className='feedback good'; playTone(1200,0.1);}
    else{streak=0; feedback.textContent=`Wrong (${correct})`; feedback.className='feedback bad'; playTone(200,0.1);}
    scoreDisplay.textContent=score; streakDisplay.textContent=streak; currentQ++;
    setTimeout(showQuestion,600);
  }

  function endGame(){
    feedback.textContent=`Mission Complete! Score: ${score}`;
    stopTimer();
    if(mode==='practice'&&score>activePlayer.bestPractice)activePlayer.bestPractice=score;
    if(mode==='chaos'&&score>activePlayer.bestChaos)activePlayer.bestChaos=score;
    savePlayers(); updateScoreboard();
  }

  // ------------------ AUDIO ------------------
  function playTone(freq,dur){
    const ctx=new (window.AudioContext||window.webkitAudioContext)();
    const o=ctx.createOscillator(); const g=ctx.createGain();
    o.connect(g); g.connect(ctx.destination); o.type='square'; o.frequency.value=freq;
    g.gain.setValueAtTime(0.2,ctx.currentTime); o.start(); o.stop(ctx.currentTime+dur);
  }

  loadPlayers();
});