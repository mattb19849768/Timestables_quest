document.addEventListener('DOMContentLoaded', () => {

  const bgCanvas=document.getElementById('bgCanvas'), bgCtx=bgCanvas.getContext('2d');
  const confCanvas=document.getElementById('confettiCanvas'), confCtx=confCanvas.getContext('2d');
  const fireCanvas=document.getElementById('fireworksCanvas'), fireCtx=fireCanvas.getContext('2d');

  function resizeCanvas(){[bgCanvas,confCanvas,fireCanvas].forEach(c=>{c.width=window.innerWidth;c.height=window.innerHeight;});}
  window.addEventListener('resize',resizeCanvas); resizeCanvas();

  // Players and avatars
  let players=[], activePlayer=null, selectedAvatar=null;
  const playerSelect=document.getElementById('playerSelect'), scoreboard=document.getElementById('scoreboard'), avatarPicker=document.getElementById('avatarPicker');
  const avatarList=['🚀','🛸','🌟','🌙','🪐','✨'];
  avatarList.forEach(a=>{const d=document.createElement('div'); d.className='avatar-choice'; d.textContent=a;
    d.addEventListener('click',()=>{
      selectedAvatar=a;
      document.querySelectorAll('.avatar-choice').forEach(c=>c.classList.remove('selected'));
      d.classList.add('selected');
    }); avatarPicker.appendChild(d);
  });

  document.getElementById('addPlayerBtn').addEventListener('click',()=>{
    const name=document.getElementById('newPlayer').value.trim();
    if(!name||!selectedAvatar) return alert('Pick avatar and name');
    players.push({name,avatar:selectedAvatar,bestPractice:0,bestChaos:0});
    selectedAvatar=null; document.getElementById('newPlayer').value='';
    document.querySelectorAll('.avatar-choice').forEach(c=>c.classList.remove('selected'));
    savePlayers(); updatePlayerSelect();
  });

  playerSelect.addEventListener('change',()=>{activePlayer=players[playerSelect.value];});
  function savePlayers(){localStorage.setItem('ttPlayers',JSON.stringify(players));}
  function loadPlayers(){players=JSON.parse(localStorage.getItem('ttPlayers')||'[]'); updatePlayerSelect();}
  function updatePlayerSelect(){
    playerSelect.innerHTML='<option value="">Select Player</option>';
    players.forEach((p,i)=>playerSelect.innerHTML+=`<option value="${i}">${p.name}</option>`);
    updateScoreboard();
  }
  function updateScoreboard(){scoreboard.innerHTML=players.map(p=>`<div>${p.avatar} ${p.name}: Best Practice ${p.bestPractice||0}, Best Chaos ${p.bestChaos||0}</div>`).join('');}

  // Tables
  const tableList=document.getElementById('tableList');
  for(let i=2;i<=12;i++){const chip=document.createElement('div'); chip.className='table-chip'; chip.textContent=i;
    chip.addEventListener('click',()=>chip.classList.toggle('selected')); tableList.appendChild(chip);
  }

  // Game Variables
  let tables=[], questions=[], currentQ=0, score=0, streak=0, mode='practice', multipleChoice=false;
  let timerInterval=0, startTime=0;

  // Timer
  function startTimer(){startTime=Date.now(); timerInterval=setInterval(()=>{const elapsed=Date.now()-startTime; const m=Math.floor(elapsed/60000).toString().padStart(2,'0'); const s=Math.floor((elapsed%60000)/1000).toString().padStart(2,'0'); document.getElementById('timeDisplay').textContent=`${m}:${s}`;},500);}
  function stopTimer(){clearInterval(timerInterval);}

  // Elements
  const statPage=document.getElementById('statPage'), gamePage=document.getElementById('gamePage');
  const startBtn=document.getElementById('startBtn'), activePlayerLabel=document.getElementById('activePlayerLabel');
  const scoreDisplay=document.getElementById('scoreDisplay'), streakDisplay=document.getElementById('streakDisplay');
  const qnumDisplay=document.getElementById('qnumDisplay'), answersContainer=document.getElementById('answersContainer');
  const feedback=document.getElementById('feedback'), answerInput=document.getElementById('answerInput'), submitBtn=document.getElementById('submitBtn');
  const countdownOverlay=document.getElementById('countdownOverlay'), countdownText=document.getElementById('countdownText'), rocketSVG=document.getElementById('rocketSVG');

  document.getElementById('newMissionBtn').addEventListener('click',()=>{gamePage.classList.add('hidden'); statPage.classList.remove('hidden'); stopTimer();});
  document.getElementById('playAgainBtn').addEventListener('click',startGame);

  startBtn.addEventListener('click',startGame);

  function startGame(){
    if(!activePlayer) return alert('Select player');
    tables=[]; document.querySelectorAll('.table-chip.selected').forEach(c=>tables.push(parseInt(c.textContent)));
    if(tables.length===0) return alert('Select at least one table');
    mode=document.querySelector('input[name="mode"]:checked').value; multipleChoice=document.getElementById('mcToggle').checked;
    score=0; streak=0; currentQ=0; activePlayerLabel.textContent=activePlayer.name;
    scoreDisplay.textContent=0; streakDisplay.textContent=0; qnumDisplay.textContent=0;
    document.getElementById('timeDisplay').textContent='00:00';
    generateQuestions(); statPage.classList.add('hidden'); gamePage.classList.remove('hidden'); runCountdown();
  }

  function generateQuestions(){
    questions=[];
    if(mode==='chaos'){for(let i=0;i<50;i++){const t=tables[Math.floor(Math.random()*tables.length)]; questions.push({a:t,b:Math.ceil(Math.random()*12)});}}
    else{tables.forEach(t=>{for(let i=1;i<=12;i++){questions.push({a:t,b:i});}});}
    shuffleArray(questions);
  }

  function shuffleArray(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]];}}

  // Countdown & Rocket
  function runCountdown(){
    countdownOverlay.classList.remove('hidden');
    let count=3; rocketSVG.style.transform='translateY(0) rotate(0deg)'; animateRocketShake();
    const interval=setInterval(()=>{
      if(count>0){countdownText.textContent=count; playTone(440+count*100,0.2);}
      else{countdownText.textContent='Blast Off!'; playTone(880,0.4); launchRocket(); startTimer();}
      count--; if(count<-1){clearInterval(interval); countdownOverlay.classList.add('hidden'); showQuestion();}
    },800);
  }

  function animateRocketShake(){let t=0; const shake=setInterval(()=>{t++; rocketSVG.style.transform=`translateY(${Math.sin(t*0.5)*2}px) rotate(${Math.sin(t*0.3)*2}deg)`; if(t>20) clearInterval(shake);},50);}

  function launchRocket(){
    let y=0; const flame=rocketSVG.querySelector('#flame'); const flameParticles=[];
    const anim=setInterval(()=>{
      y-=10; rocketSVG.style.transform=`translateY(${y}px)`;
      flame.setAttribute('points',`40,110 48,${150+Math.random()*10} 40,140 32,${150+Math.random()*10}`);
      flameParticles.push({x:40,y:110-y,size:Math.random()*6+3,alpha:1});
      fireCtx.clearRect(0,0,fireCanvas.width,fireCanvas.height);
      flameParticles.forEach(p=>{fireCtx.fillStyle=`rgba(255,200,50,${p.alpha})`; fireCtx.beginPath(); fireCtx.arc(window.innerWidth/2+(p.x-40),fireCanvas.height-p.y,p.size,0,Math.PI*2); fireCtx.fill(); p.alpha-=0.03; p.size*=0.95;});
      for(let i=flameParticles.length-1;i>=0;i--) if(flameParticles[i].alpha<=0) flameParticles.splice(i,1);
      if(y<-window.innerHeight) clearInterval(anim);
    },30);
  }

  // Show questions
  function showQuestion(){
    if(currentQ>=questions.length){endGame(); return;}
    const q=questions[currentQ]; document.getElementById('questionText').textContent=`${q.a} × ${q.b} = ?`;
    if(multipleChoice){
      answersContainer.innerHTML=''; const correct=q.a*q.b; const options=[correct];
      while(options.length<4){const o=Math.floor(Math.random()*12*q.a)+1; if(!options.includes(o)) options.push(o);}
      shuffleArray(options);
      options.forEach(o=>{const btn=document.createElement('button'); btn.className='answer-btn'; btn.textContent=o; btn.addEventListener('click',()=>{checkAnswer(o);}); answersContainer.appendChild(btn);});
      answerInput.parentElement.style.display='none';
    } else {answersContainer.innerHTML=''; answerInput.value=''; answerInput.parentElement.style.display='flex'; answerInput.focus();}
    qnumDisplay.textContent=currentQ+1;
  }

  submitBtn.addEventListener('click',()=>checkAnswer(parseInt(answerInput.value)));
  answerInput.addEventListener('keydown',(e)=>{if(e.key==='Enter') submitBtn.click();});

  function checkAnswer(ans){
    const q=questions[currentQ]; const correct=q.a*q.b;
    if(ans===correct){score++; streak++; feedback.textContent='Correct!'; feedback.className='feedback good'; playTone(1200,0.1); launchConfetti();}
    else{streak=0; feedback.textContent=`Wrong (${correct})`; feedback.className='feedback bad'; playTone(200,0.1);}
    scoreDisplay.textContent=score; streakDisplay.textContent=streak; currentQ++;
    setTimeout(showQuestion,600);
  }

  function endGame(){feedback.textContent=`Mission Complete! Score: ${score}`; stopTimer();
    if(mode==='practice'&&score>activePlayer.bestPractice) activePlayer.bestPractice=score;
    if(mode==='chaos'&&score>activePlayer.bestChaos) activePlayer.bestChaos=score;
    savePlayers(); updateScoreboard();
  }

  function playTone(freq,dur){const ctx=new (window.AudioContext||window.webkitAudioContext)();const o=ctx.createOscillator();const g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.type='square';o.frequency.value=freq;g.gain.setValueAtTime(0.2,ctx.currentTime);o.start();o.stop(ctx.currentTime+dur);}

  // Confetti
  let confettiParticles=[];
  function launchConfetti(){for(let i=0;i<30;i++){confettiParticles.push({x:Math.random()*confCanvas.width,y:0,vx:(Math.random()-0.5)*2,vy:Math.random()*3+2,color:`hsl(${Math.random()*360},80%,60%)`,size:Math.random()*6+4});}}
  function updateConfetti(){confCtx.clearRect(0,0,confCanvas.width,confCanvas.height); confettiParticles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy*=0.99;p.vy+=0.05; confCtx.fillStyle=p.color; confCtx.fillRect(p.x,p.y,p.size,p.size);}); confettiParticles=confettiParticles.filter(p=>p.y<confCanvas.height+10); requestAnimationFrame(updateConfetti);}
  updateConfetti();

  // Starfield
  const stars=[], planets=[], asteroids=[];
  for(let i=0;i<250;i++) stars.push({x:Math.random()*bgCanvas.width,y:Math.random()*bgCanvas.height,r:Math.random()*1.5+0.5,twinkle:Math.random()*0.05});
  for(let i=0;i<5;i++) planets.push({x:Math.random()*bgCanvas.width,y:Math.random()*bgCanvas.height,r:Math.random()*50+30,speed:Math.random()*0.2+0.05,color:`hsl(${Math.random()*360},70%,60%)`}));
  for(let i=0;i<30;i++) asteroids.push({x:Math.random()*bgCanvas.width,y:Math.random()*bgCanvas.height,r:Math.random()*6+3,vx:(Math.random()-0.5)*1,vy:Math.random()*0.5+0.2,color:`hsl(${Math.random()*60+30},80%,50%)`}));

  function updateStarsPlanets(){bgCtx.clearRect(0,0,bgCanvas.width,bgCanvas.height);
    stars.forEach(s=>{s.y+=0.2;if(s.y>bgCanvas.height)s.y=0; bgCtx.fillStyle=`rgba(255,255,255,${0.5+Math.sin(Date.now()*s.twinkle)})`; bgCtx.beginPath(); bgCtx.arc(s.x,s.y,s.r,0,Math.PI*2); bgCtx.fill();});
    planets.forEach(p=>{p.x+=p.speed;if(p.x>bgCanvas.width+p.r)p.x=-p.r; bgCtx.fillStyle=p.color; bgCtx.beginPath(); bgCtx.arc(p.x,p.y,p.r,0,Math.PI*2); bgCtx.fill();});
    asteroids.forEach(a=>{a.x+=a.vx;a.y+=a.vy; if(a.y>bgCanvas.height)a.y=-a.r;if(a.x>bgCanvas.width)a.x=0;if(a.x<0)a.x=bgCanvas.width; bgCtx.fillStyle=a.color; bgCtx.beginPath(); bgCtx.arc(a.x,a.y,a.r,0,Math.PI*2); bgCtx.fill();});
    requestAnimationFrame(updateStarsPlanets);
  }
  updateStarsPlanets();

  loadPlayers();
});