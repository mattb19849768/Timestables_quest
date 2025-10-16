document.addEventListener("DOMContentLoaded", ()=>{
const bgCanvas=document.getElementById("bgCanvas");
const confCanvas=document.getElementById("confettiCanvas");
const bctx=bgCanvas.getContext("2d");
const confCtx=confCanvas.getContext("2d");

function resize(){[bgCanvas,confCanvas].forEach(c=>{c.width=window.innerWidth;c.height=window.innerHeight;});}
window.addEventListener("resize",resize);resize();

// Elements
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

// State
let players=JSON.parse(localStorage.getItem("ttPlayers")||"[]");
let activePlayer=null,selectedAvatar="🧑‍🚀",selectedTables=[],questions=[],currentQ=0,score=0,streak=0,timer,time=0,mode="practice",multipleChoice=false,muted=false;

// Sound
const AudioCtx=window.AudioContext||window.webkitAudioContext;const audioCtx=new AudioCtx();
const sounds={sparkle:(pitch=800)=>{if(muted)return;const o=audioCtx.createOscillator();const g=audioCtx.createGain();o.type="sine";o.frequency.value=pitch;g.gain.setValueAtTime(0.2,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(0.001,audioCtx.currentTime+0.4);o.connect(g).connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+0.4);},rumble:()=>{if(muted)return;const bufferSize=2*audioCtx.sampleRate;const noiseBuffer=audioCtx.createBuffer(1,bufferSize,audioCtx.sampleRate);const output=noiseBuffer.getChannelData(0);for(let i=0;i<bufferSize;i++)output[i]=Math.random()*2-1;const source=audioCtx.createBufferSource();source.buffer=noiseBuffer;const filter=audioCtx.createBiquadFilter();filter.type="lowpass";filter.frequency.value=80;const gainNode=audioCtx.createGain();gainNode.gain.value=0.4;source.connect(filter).connect(gainNode).connect(audioCtx.destination);source.start();source.stop(audioCtx.currentTime+3);}};
muteBtn.addEventListener("click",()=>{muted=!muted; muteBtn.textContent=muted?"🔇":"🔊";});

// Player setup
const avatars=["🧑‍🚀","👩‍🚀","👽","🤖","🪐","🌕","🚀"];
avatars.forEach(a=>{const div=document.createElement("div");div.className="avatar-choice";div.textContent=a;div.onclick=()=>{selectedAvatar=a;document.querySelectorAll(".avatar-choice").forEach(el=>el.classList.remove("selected"));div.classList.add("selected");};avatarPicker.appendChild(div);});
avatarPicker.firstChild.classList.add("selected");

function updatePlayerList(){playerSelect.innerHTML="";players.forEach((p,i)=>{const opt=document.createElement("option");opt.value=i;opt.textContent=`${p.avatar} ${p.name}`;playerSelect.appendChild(opt);});}
updatePlayerList();

addPlayerBtn.onclick=()=>{const name=newPlayer.value.trim();if(!name)return;players.push({name,avatar:selectedAvatar,bestPractice:0,bestChaos:0});newPlayer.value="";localStorage.setItem("ttPlayers",JSON.stringify(players));updatePlayerList();};

// Table selection
for(let i=1;i<=12;i++){const chip=document.createElement("div");chip.className="table-chip";chip.textContent=i;chip.onclick=()=>chip.classList.toggle("selected");tableList.appendChild(chip);}

// Start game
startBtn.onclick=()=>{
  const idx=playerSelect.value;if(idx===""||idx===null)return alert("Select or create a player");activePlayer=players[idx];activePlayerLabel.textContent=`${activePlayer.avatar} ${activePlayer.name}`;
  mode=document.querySelector('input[name="mode"]:checked').value; multipleChoice=mcToggle.checked;
  selectedTables=Array.from(document.querySelectorAll(".table-chip.selected")).map(el=>parseInt(el.textContent));
  if(selectedTables.length===0)return alert("Select at least one table!");
  statPage.classList.add("hidden"); countdownOverlay.classList.remove("hidden"); sounds.rumble();
  startCountdown();
};

newMissionBtn.onclick=()=>{gamePage.classList.add("hidden"); statPage.classList.remove("hidden");};

// Rocket + countdown
let sparks=[];
function createSparks(){for(let i=0;i<5;i++){sparks.push({x:40,y:130,vx:(Math.random()-0.5)*4,vy:Math.random()*-4,life:20+Math.random()*10,size:2+Math.random()*2});}}
function drawSparks(){confCtx.clearRect(0,0,confCanvas.width,confCanvas.height);sparks.forEach((s,i)=>{confCtx.fillStyle="orange";confCtx.beginPath();confCtx.arc(s.x,s.y,s.size,0,Math.PI*2);confCtx.fill();s.x+=s.vx;s.y+=s.vy;s.life--;if(s.life<=0)sparks.splice(i,1);});requestAnimationFrame(drawSparks);}
drawSparks();

function startCountdown(){
  let count=3; countdownText.textContent=count;
  rocketSVG.style.transform="translateY(0)";
  const interval=setInterval(()=>{
    count--; if(count===0){countdownText.textContent="🚀";launchRocket(); clearInterval(interval);}
    else if(count<0)clearInterval(interval); else countdownText.textContent=count;
  },1000);
}

function launchRocket(){
  const flame=rocketSVG.querySelector("#flame"); let y=0;
  const flameAnim=setInterval(()=>{flame.setAttribute("points",`40,130 48,${150+Math.random()*10} 40,140 32,${150+Math.random()*10}`); createSparks();},50);
  const anim=setInterval(()=>{
    y-=10; rocketSVG.style.transform=`translateY(${y}px)`;
    if(y<-window.innerHeight){clearInterval(anim); clearInterval(flameAnim); countdownOverlay.classList.add("hidden"); startGame();}
  },30);
}

// Placeholder startGame function
function startGame(){
  gamePage.classList.remove("hidden");
  qText.textContent="Ready for questions!";
}

// === STARFIELD + EMOJI PARALLAX BACKGROUND ===
const stars=[]; const emojis=[];
const emojiChars=["🪐","🌕","⭐","☄️","🚀"];
for(let i=0;i<200;i++){stars.push({x:Math.random()*bgCanvas.width,y:Math.random()*bgCanvas.height,r:Math.random()*1.5+0.5,speed:0.2+Math.random()*0.3});}
for(let i=0;i<30;i++){emojis.push({x:Math.random()*bgCanvas.width,y:Math.random()*bgCanvas.height,char:emojiChars[Math.floor(Math.random()*emojiChars.length)],speed:0.5+Math.random()*0.5});}

function drawBG(){
  bctx.fillStyle="black"; bctx.fillRect(0,0,bgCanvas.width,bgCanvas.height);
  stars.forEach(s=>{bctx.fillStyle="white"; bctx.beginPath(); bctx.arc(s.x,s.y,s.r,0,Math.PI*2); bctx.fill(); s.y+=s.speed; if(s.y>bgCanvas.height)s.y=0;});
  emojis.forEach(e=>{bctx.font="32px Arial"; bctx.fillText(e.char,e.x,e.y); e.y+=e.speed; if(e.y>bgCanvas.height)e.y=0;});
  requestAnimationFrame(drawBG);
}
drawBG();
});