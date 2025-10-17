document.addEventListener("DOMContentLoaded",()=>{

// CANVASES
const bg=document.getElementById("bgCanvas"),conf=document.getElementById("confettiCanvas");
const bctx=bg.getContext("2d"),cctx=conf.getContext("2d");
function resize(){[bg,conf].forEach(c=>{c.width=window.innerWidth;c.height=window.innerHeight;});}
window.addEventListener("resize",resize);resize();

// ELEMENTS
const statPage=document.getElementById("statPage");
const gamePage=document.getElementById("gamePage");
const countdownOverlay=document.getElementById("countdownOverlay");
const countdownText=document.getElementById("countdownText");
const rocketSVG=document.getElementById("rocketSVG");

const playerSelect=document.getElementById("playerSelect");
const newPlayer=document.getElementById("newPlayer");
const addPlayerBtn=document.getElementById("addPlayerBtn");
const avatarPicker=document.getElementById("avatarPicker");
const tableList=document.getElementById("tableList");
const startBtn=document.getElementById("startBtn");
const mcToggle=document.getElementById("mcToggle");
const newMissionBtn=document.getElementById("newMissionBtn");
const muteBtn=document.getElementById("muteBtn");

const activePlayerLabel=document.getElementById("activePlayerLabel");
const scoreDisplay=document.getElementById("scoreDisplay");
const streakDisplay=document.getElementById("streakDisplay");
const timeDisplay=document.getElementById("timeDisplay");
const qText=document.getElementById("questionText");
const answersContainer=document.getElementById("answersContainer");
const answerInput=document.getElementById("answerInput");
const submitBtn=document.getElementById("submitBtn");
const feedback=document.getElementById("feedback");

// STATE
let players=JSON.parse(localStorage.getItem("ttPlayers")||"[]");
let activePlayer=null,selectedAvatar="🧑‍🚀",selectedTables=[],questions=[],currentQ=0,score=0,streak=0,timer,time=0,mode="practice",multipleChoice=false,muted=false;

// SOUND
const beep=(freq=500)=>{if(muted)return; const ctx=new AudioContext(); const o=ctx.createOscillator(); const g=ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.frequency.value=freq; o.start(); o.stop(ctx.currentTime+0.2);};

// AVATARS
const avatars=["🧑‍🚀","👩‍🚀","👽","🤖","🪐","🌕","🚀"];
avatars.forEach(a=>{const div=document.createElement("div");div.className="avatar-choice";div.textContent=a;div.onclick=()=>{selectedAvatar=a;document.querySelectorAll(".avatar-choice").forEach(el=>el.classList.remove("selected"));div.classList.add("selected");};avatarPicker.appendChild(div);});
avatarPicker.firstChild.classList.add("selected");

// PLAYERS
function updatePlayerList(){playerSelect.innerHTML="";players.forEach((p,i)=>{const opt=document.createElement("option");opt.value=i;opt.textContent=`${p.avatar} ${p.name}`;playerSelect.appendChild(opt);});}
updatePlayerList();
addPlayerBtn.onclick=()=>{const name=newPlayer.value.trim();if(!name)return;players.push({name,avatar:selectedAvatar});newPlayer.value="";localStorage.setItem("ttPlayers",JSON.stringify(players));updatePlayerList();};

// TABLES
for(let i=1;i<=12;i++){const chip=document.createElement("div");chip.className="table-chip";chip.textContent=i;chip.onclick=()=>chip.classList.toggle("selected");tableList.appendChild(chip);}

// MUTE
muteBtn.addEventListener("click",()=>{muted=!muted; muteBtn.textContent=muted?"🔇":"🔊";});

// STARFIELD + EMOJI + COMETS
const stars=[],emojis=[],emojiChars=["🪐","🌕","⭐","☄️","🚀"],comets=[];
for(let i=0;i<200;i++){stars.push({x:Math.random()*bg.width,y:Math.random()*bg.height,r:Math.random()*1.5+0.5,speed:0.2+Math.random()*0.3});}
for(let i=0;i<30;i++){emojis.push({x:Math.random()*bg.width,y:Math.random()*bg.height,char:emojiChars[Math.floor(Math.random()*emojiChars.length)],speed:0.5+Math.random()*0.5});}
function drawBG(){
  bctx.fillStyle="black";bctx.fillRect(0,0,bg.width,bg.height);
  stars.forEach(s=>{bctx.fillStyle="white";bctx.beginPath();bctx.arc(s.x,s.y,s.r,0,2*Math.PI);bctx.fill(); s.y+=s.speed;if(s.y>bg.height)s.y=0;});
  emojis.forEach(e=>{bctx.font="32px Arial"; bctx.fillText(e.char,e.x,e.y); e.y+=e.speed;if(e.y>bg.height)e.y=0;});
  // draw comets
  comets.forEach((c,i)=>{bctx.strokeStyle="white";bctx.lineWidth=2;bctx.beginPath();bctx.moveTo(c.x,c.y);bctx.lineTo(c.x-c.length,c.y-c.length);bctx.stroke(); c.x+=c.vx; c.y+=c.vy; c.life--; if(c.life<=0) comets.splice(i,1);});
  requestAnimationFrame(drawBG);
}
drawBG();
setInterval(()=>{comets.push({x:Math.random()*bg.width, y:0, vx:Math.random()*4+2, vy:Math.random()*4+2, length:50, life:200});},20000);

// ROCKET PARTICLES
let rocketParticles=[];
function createRocketParticles(x,y){for(let i=0;i<4;i++){rocketParticles.push({x:x+Math.random()*10-5, y:y, vx:Math.random()*2-1, vy:Math.random()*-2-1, life:30+Math.random()*20, size:2+Math.random()*2});}}
function drawRocketParticles(){cctx.clearRect(0,0,conf.width,conf.height); rocketParticles.forEach((p,i)=>{cctx.fillStyle="orange"; cctx.beginPath(); cctx.arc(p.x,p.y,p.size,0,2*Math.PI); cctx.fill(); p.x+=p.vx; p.y+=p.vy; p.life--; if(p.life<=0) rocketParticles.splice(i,1);}); requestAnimationFrame(drawRocketParticles);}
drawRocketParticles();

// GAME LOGIC
startBtn.onclick=()=>{
  const idx=playerSelect.value;if(idx===""||idx===null)return alert("Select or create a player");activePlayer=players[idx];activePlayerLabel.textContent=`${activePlayer.avatar} ${activePlayer.name}`;
  mode=document.querySelector('input[name="mode"]:checked').value; multipleChoice=mcToggle.checked;
  selectedTables=Array.from(document.querySelectorAll(".table-chip.selected")).map(el=>parseInt(el.textContent));
  if(selectedTables.length===0)return alert("Select at least one table!");
  statPage.classList.add("hidden"); countdownOverlay.classList.remove("hidden");
  startCountdown();
};

let rocketY=0, countdownInterval, rocketInterval, gameTimer;

// COUNTDOWN + ROCKET
function startCountdown(){
  let count=3; countdownText.textContent=count; rocketSVG.style.transform="translateY(0)";
  countdownInterval=setInterval(()=>{
    count--; if(count===0){countdownText.textContent="🚀";launchRocket(); clearInterval(countdownInterval);}
    else if(count<0)clearInterval(countdownInterval); else countdownText.textContent=count;
  },1000);
}
function launchRocket(){
  rocketY=0; const flame=rocketSVG.querySelector("#flame");
  rocketInterval=setInterval(()=>{
    rocketY-=10; rocketSVG.style.transform=`translateY(${rocketY}px)`; createRocketParticles(window.innerWidth/2, window.innerHeight/2+50);
    if(rocketY<-window.innerHeight){clearInterval(rocketInterval); countdownOverlay.classList.add("hidden"); startGame();}
  },30);
}

// QUESTIONS
function generateQuestions(){
  questions=[];
  if(mode==="practice"){
    selectedTables.forEach(t=>{for(let i=1;i<=12;i++){questions.push({q:t,i:i,ans:t*i});}});
  } else {
    for(let i=0;i<50;i++){const t=selectedTables[Math.floor(Math.random()*selectedTables.length)];const n=Math.floor(Math.random()*12)+1;questions.push({q:t,i:n,ans:t*n});}
  }
  questions.sort(()=>Math.random()-0.5);
  currentQ=0; score=0; streak=0; time=0; updateStats();
}

function updateStats(){scoreDisplay.textContent=score; streakDisplay.textContent=streak; timeDisplay.textContent=`${Math.floor(time/60).toString().padStart(2,"0")}:${(time%60).toString().padStart(2,"0")}`;}

function startGame(){
  gamePage.classList.remove("hidden");
  generateQuestions();
  displayQuestion();
  gameTimer=setInterval(()=>{time++; updateStats();},1000);
}

function displayQuestion(){
  const q=questions[currentQ];
  qText.textContent=`${q.q} × ${q.i} = ?`;
  answersContainer.innerHTML="";
  if(multipleChoice){
    let opts=[q.ans];
    while(opts.length<4){const val=Math.floor(Math.random()*144)+1; if(!opts.includes(val)) opts.push(val);}
    opts.sort(()=>Math.random()-0.5);
    opts.forEach(o=>{const btn=document.createElement("button");btn.className="answer-btn";btn.textContent=o; btn.onclick=()=>checkAnswer(o); answersContainer.appendChild(btn);});
    answerInput.style.display="none"; submitBtn.style.display="none";
  } else { answerInput.style.display="inline-block"; submitBtn.style.display="inline-block"; answersContainer.innerHTML="";}
}

function checkAnswer(ans){
  const q=questions[currentQ];
  if(ans===q.ans){score++; streak++; feedback.textContent="Correct!"; feedback.className="feedback good"; beep(700);}
  else {streak=0; feedback.textContent=`Wrong! (${q.ans})`; feedback.className="feedback bad"; beep(300);}
  updateStats();
  currentQ++; if(currentQ>=questions.length){clearInterval(gameTimer); feedback.textContent="Mission Complete!";} else displayQuestion();
}

submitBtn.onclick=()=>{checkAnswer(Number(answerInput.value)); answerInput.value="";};
answerInput.addEventListener("keyup",(e)=>{if(e.key==="Enter") submitBtn.click();});

newMissionBtn.onclick=()=>{gamePage.classList.add("hidden"); statPage.classList.remove("hidden"); clearInterval(gameTimer);}