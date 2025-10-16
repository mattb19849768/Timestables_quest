document.addEventListener('DOMContentLoaded', () => {

// -------------------------
// INITIALIZATION
// -------------------------
const bgCanvas = document.getElementById('bgCanvas'), bgCtx = bgCanvas.getContext('2d');
const confCanvas = document.getElementById('confettiCanvas'), confCtx = confCanvas.getContext('2d');
const fireCanvas = document.getElementById('fireworksCanvas'), fireCtx = fireCanvas.getContext('2d');

let players = [], activePlayer = null;
let tables = [], mode = 'practice', multipleChoice = false;
let questions = [], currentQ = 0, score = 0, streak = 0;

// ELEMENTS
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
const timeDisplay = document.getElementById('timeDisplay');

const countdownOverlay = document.getElementById('countdownOverlay');
const countdownText = document.getElementById('countdownText');
const rocketSVG = document.getElementById('rocketSVG');

// -------------------------
// UTILS
// -------------------------
function resizeCanvas() {
bgCanvas.width = window.innerWidth; bgCanvas.height = window.innerHeight;
confCanvas.width = window.innerWidth; confCanvas.height = window.innerHeight;
fireCanvas.width = window.innerWidth; fireCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function savePlayers() { localStorage.setItem('ttPlayers', JSON.stringify(players)); }
function loadPlayers() { players = JSON.parse(localStorage.getItem('ttPlayers') || '[]'); updatePlayerSelect(); }
function updatePlayerSelect() {
playerSelect.innerHTML = '<option value="">Select Player</option>';
players.forEach((p, i) => playerSelect.innerHTML += `<option value="${i}">${p.name}</option>`);
updateScoreboard();
}
function updateScoreboard() {
scoreboard.innerHTML = players.map(p => `<div>${p.avatar} ${p.name}: Best Practice ${p.bestPractice||0}, Best Chaos ${p.bestChaos||0}</div>`).join('');
}

// -------------------------
// AVATAR
// -------------------------
const avatarPicker = document.getElementById('avatarPicker');
const avatarList = ['🚀','🛸','🌟','🌙','🪐','✨'];
let selectedAvatar = null;
avatarList.forEach(a=>{
const div = document.createElement('div'); div.className='avatar-choice'; div.textContent=a;
div.addEventListener('click',()=>{
selectedAvatar=a;
document.querySelectorAll('.avatar-choice').forEach(c=>c.classList.remove('selected'));
div.classList.add('selected');
});
avatarPicker.appendChild(div);
});

// -------------------------
// TABLES
// -------------------------
for(let i=2;i<=12;i++){
const chip=document.createElement('div'); chip.className='table-chip'; chip.textContent=i;
chip.addEventListener('click',()=>{chip.classList.toggle('selected');});
tableList.appendChild(chip);
}

// -------------------------
// PLAYER ADD
// -------------------------
document.getElementById('addPlayerBtn').addEventListener('click',()=>{
const name=document.getElementById('newPlayer').value.trim();
if(!name || !selectedAvatar) return alert('Pick avatar and name');
players.push({name, avatar:selectedAvatar, bestPractice:0, bestChaos:0});
selectedAvatar=null; document.getElementById('newPlayer').value='';
document.querySelectorAll('.avatar-choice').forEach(c=>c.classList.remove('selected'));
savePlayers(); updatePlayerSelect();
});
playerSelect.addEventListener('change',()=>{activePlayer=players[playerSelect.value];});

// -------------------------
// GAME LOGIC
// -------------------------
function startGame(){
if(!activePlayer) return alert('Select player');
tables=[]; document.querySelectorAll('.table-chip.selected').forEach(c=>tables.push(parseInt(c.textContent)));
if(tables.length===0) return alert('Select at least one table');
mode=document.querySelector('input[name="mode"]:checked').value;
multipleChoice=document.getElementById('mcToggle').checked;
score=0; streak=0; currentQ=0;
activePlayerLabel.textContent=activePlayer.name;
scoreDisplay.textContent=0; streakDisplay.textContent=0; qnumDisplay.textContent=0; timeDisplay.textContent='00:00';
generateQuestions();
statPage.classList.add('hidden');
gamePage.classList.remove('hidden');
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
tables.forEach(t=>{
for(let i=1;i<=12;i++){questions.push({a:t,b:i});}
});
}
shuffleArray(questions);
}

function shuffleArray(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]];}}

// -------------------------
// COUNTDOWN & ROCKET
// -------------------------
function runCountdown(){
countdownOverlay.style.display='flex';
let count=3;
rocketSVG.style.transform='translateY(0)';
const interval=setInterval(()=>{
if(count>0){countdownText.textContent=count; playTone(440+count*100,0.2);}
else{countdownText.textContent='Blast Off!'; playTone(880,0.4); animateRocket();}
count--; if(count<-1){clearInterval(interval); countdownOverlay.style.display='none'; showQuestion();}
},800);
}

function animateRocket(){
let y=0;
const anim=setInterval(()=>{
y-=8; rocketSVG.style.transform=`translateY(${y}px)`;
if(y<-window.innerHeight){clearInterval(anim);}
},30);
}

// -------------------------
// SHOW QUESTION
// -------------------------
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
const q=questions[currentQ];
const correct=q.a*q.b;
if(ans===correct){
score++; streak++;
feedback.textContent='Correct!'; feedback.className='feedback good';
playTone(1200,0.1);
fireworks(window.innerWidth/2,window.innerHeight/2);
triggerFirework(window.innerWidth/2,window.innerHeight/2);
} else {
streak=0; feedback.textContent=`Wrong (${correct})`; feedback.className='feedback bad';
playTone(200,0.2);
}
scoreDisplay.textContent=score; streakDisplay.textContent=streak; currentQ++;
setTimeout(showQuestion,600);
}

function endGame(){
feedback.textContent=`Mission Complete! Score: ${score}`;
if(mode==='practice' && score>activePlayer.bestPractice) activePlayer.bestPractice=score;
if(mode==='chaos' && score>activePlayer.bestChaos) activePlayer.bestChaos=score;
savePlayers(); updateScoreboard();
}

// -------------------------
// AUDIO
// -------------------------
function playTone(freq,dur){
const ctx = new (window.AudioContext || window.webkitAudioContext)();
const o = ctx.createOscillator();
const g = ctx.createGain();
o.connect(g); g.connect(ctx.destination);
o.type='square'; o.frequency.value=freq;
g.gain.setValueAtTime(0.2, ctx.currentTime);
o.start(); o.stop(ctx.currentTime+dur);
}

// -------------------------
// STARFIELD & EMOJI PARALLAX
// -------------------------
const stars=[], emojis=[];
const emojiChars=['🌟','✨','🪐','🌙'];
for(let i=0;i<150;i++) stars.push({x:Math.random()*bgCanvas.width, y:Math.random()*bgCanvas.height, size:Math.random()*2+1, speed:Math.random()*0.5+0.2});
for(let i=0;i<50;i++) emojis.push({x:Math.random()*bgCanvas.width, y:Math.random()*bgCanvas.height, char:emojiChars[Math.floor(Math.random()*emojiChars.length)], size:Math.random()*24+12, speed:Math.random()*1+0.5});

function drawStarfield(){
bgCtx.clearRect(0,0,bgCanvas.width,bgCanvas.height);
stars.forEach(s=>{
bgCtx.fillStyle='#fff'; bgCtx.beginPath(); bgCtx.arc(s.x,s.y,s.size,0,Math.PI*2); bgCtx.fill();
s.y+=s.speed; if(s.y>bgCanvas.height) s.y=0;
});
emojis.forEach(e=>{
bgCtx.font=`${e.size}px serif`; bgCtx.fillText(e.char,e.x,e.y);
e.y+=e.speed; if(e.y>bgCanvas.height) e.y=0;
});
requestAnimationFrame(drawStarfield);
}
drawStarfield();

// -------------------------
// CONFETTI
// -------------------------
const confettiPieces=[];
function fireworks(x=window.innerWidth/2,y=window.innerHeight/2){
for(let i=0;i<50;i++){
confettiPieces.push({x,y,vx:(Math.random()-0.5)*5,vy:(Math.random()-1.5)*5,size:Math.random()*6+4,color:`hsl(${Math.random()*360},80%,60%)`,life:100});
}
}
function drawConfetti(){
confCtx.clearRect(0,0,confCanvas.width,confCanvas.height);
confettiPieces.forEach((p,i)=>{
confCtx.fillStyle=p.color; confCtx.fillRect(p.x,p.y,p.size,p.size);
p.x+=p.vx; p.y+=p.vy; p.vy+=0.1; p.life--;
if(p.life<=0) confettiPieces.splice(i,1);
});
requestAnimationFrame(drawConfetti);
}
drawConfetti();

// -------------------------
// FIREWORKS
// -------------------------
const fireParticles=[];
function triggerFirework(x=window.innerWidth/2,y=window.innerHeight/2){
for(let i=0;i<60;i++){
const angle=Math.random()*Math.PI*2;
const speed=Math.random()*5+2;
fireParticles.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:60,color:`hsl(${Math.random()*360},80%,60%)`});
}
}
function drawFireworks(){
fireCtx.clearRect(0,0,fireCanvas.width,fireCanvas.height);
fireParticles.forEach((p,i)=>{
fireCtx.fillStyle=p.color;
fireCtx.beginPath();
fireCtx.arc(p.x,p.y,2,0,Math.PI*2); fireCtx.fill();
p.x+=p.vx; p.y+=p.vy; p.vy+=0.1; p.life--;
if(p.life<=0) fireParticles.splice(i,1);
});
requestAnimationFrame(drawFireworks);
}
drawFireworks();

// -------------------------
// BUTTONS
// -------------------------
startBtn.addEventListener('click', startGame);
document.getElementById('newMissionBtn').addEventListener('click',()=>{gamePage.classList.add('hidden'); statPage.classList.remove('hidden');});
document.getElementById('playAgainBtn').addEventListener('click', startGame);

// -------------------------
// LOAD PLAYERS
// -------------------------
loadPlayers();

});