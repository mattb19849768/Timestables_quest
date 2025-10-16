document.addEventListener("DOMContentLoaded", () => {
  // === CANVASES ===
  const bgCanvas = document.getElementById("bgCanvas");
  const confCanvas = document.getElementById("confettiCanvas");
  const fireCanvas = document.getElementById("fireworksCanvas");
  const bctx = bgCanvas.getContext("2d");
  const confCtx = confCanvas.getContext("2d");
  const fireCtx = fireCanvas.getContext("2d");

  function resize() {
    [bgCanvas, confCanvas, fireCanvas].forEach((c) => {
      c.width = window.innerWidth;
      c.height = window.innerHeight;
    });
  }
  window.addEventListener("resize", resize);
  resize();

  // === ELEMENTS ===
  const statPage = document.getElementById("statPage");
  const gamePage = document.getElementById("gamePage");
  const countdownOverlay = document.getElementById("countdownOverlay");
  const countdownText = document.getElementById("countdownText");
  const rocketSVG = document.getElementById("rocketSVG");

  const playerSelect = document.getElementById("playerSelect");
  const newPlayer = document.getElementById("newPlayer");
  const addPlayerBtn = document.getElementById("addPlayerBtn");
  const avatarPicker = document.getElementById("avatarPicker");
  const tableList = document.getElementById("tableList");
  const startBtn = document.getElementById("startBtn");
  const mcToggle = document.getElementById("mcToggle");
  const newMissionBtn = document.getElementById("newMissionBtn");
  const muteBtn = document.getElementById("muteBtn");

  const activePlayerLabel = document.getElementById("activePlayerLabel");
  const scoreDisplay = document.getElementById("scoreDisplay");
  const streakDisplay = document.getElementById("streakDisplay");
  const timeDisplay = document.getElementById("timeDisplay");
  const qnumDisplay = document.getElementById("qnumDisplay");
  const qText = document.getElementById("questionText");
  const answersContainer = document.getElementById("answersContainer");
  const answerInput = document.getElementById("answerInput");
  const submitBtn = document.getElementById("submitBtn");
  const feedback = document.getElementById("feedback");

  // === STATE ===
  let players = JSON.parse(localStorage.getItem("ttPlayers") || "[]");
  let activePlayer = null;
  let selectedAvatar = "🧑‍🚀";
  let selectedTables = [];
  let questions = [];
  let currentQ = 0;
  let score = 0;
  let streak = 0;
  let timer;
  let time = 0;
  let mode = "practice";
  let multipleChoice = false;

  // === SOUND ENGINE ===
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const audioCtx = new AudioCtx();
  let muted = false;

  const sounds = {
    ambientOsc: null,
    rumbleOsc: null,
    sparkle: (pitch = 800) => {
      if (muted) return;
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = "sine";
      o.frequency.value = pitch;
      g.gain.setValueAtTime(0.2, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
      o.connect(g).connect(audioCtx.destination);
      o.start();
      o.stop(audioCtx.currentTime + 0.4);
    },
  };

  function playAmbient() {
    if (muted) return;
    if (sounds.ambientOsc) return; // already playing
    const o1 = audioCtx.createOscillator();
    const o2 = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o1.type = "sine";
    o2.type = "triangle";
    o1.frequency.value = 110;
    o2.frequency.value = 220;
    g.gain.value = 0.05;
    o1.connect(g);
    o2.connect(g);
    g.connect(audioCtx.destination);
    o1.start();
    o2.start();
    sounds.ambientOsc = { o1, o2, g };
  }

  function stopAmbient() {
    if (sounds.ambientOsc) {
      sounds.ambientOsc.o1.stop();
      sounds.ambientOsc.o2.stop();
      sounds.ambientOsc = null;
    }
  }

  function playRumble() {
    if (muted) return;
    const bufferSize = 2 * audioCtx.sampleRate;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
    const whiteNoise = audioCtx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = audioCtx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 80;

    const gainNode = audioCtx.createGain();
    gainNode.gain.value = 0.4;

    whiteNoise.connect(filter).connect(gainNode).connect(audioCtx.destination);
    whiteNoise.start();
    whiteNoise.stop(audioCtx.currentTime + 3);
  }

  muteBtn.addEventListener("click", () => {
    muted = !muted;
    muteBtn.textContent = muted ? "🔇" : "🔊";
    if (muted) stopAmbient();
    else playAmbient();
  });

  // === BACKGROUND ===
  const stars = Array.from({ length: 150 }, () => ({
    x: Math.random() * bgCanvas.width,
    y: Math.random() * bgCanvas.height,
    r: Math.random() * 2,
    s: Math.random() * 0.5 + 0.1,
  }));

  function drawBG() {
    bctx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
    const gradient = bctx.createRadialGradient(
      bgCanvas.width / 2,
      bgCanvas.height / 2,
      0,
      bgCanvas.width / 2,
      bgCanvas.height / 2,
      bgCanvas.width / 1.5
    );
    gradient.addColorStop(0, "#050818");
    gradient.addColorStop(1, "#000010");
    bctx.fillStyle = gradient;
    bctx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);

    // Twinkling stars
    bctx.fillStyle = "white";
    stars.forEach((s) => {
      s.y += s.s;
      if (s.y > bgCanvas.height) s.y = 0;
      bctx.globalAlpha = Math.random();
      bctx.beginPath();
      bctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      bctx.fill();
    });
    bctx.globalAlpha = 1;

    requestAnimationFrame(drawBG);
  }
  drawBG();

  // === AVATARS ===
  const avatars = ["🧑‍🚀", "👩‍🚀", "👽", "🤖", "🪐", "🌕", "🚀"];
  avatars.forEach((a) => {
    const div = document.createElement("div");
    div.className = "avatar-choice";
    div.textContent = a;
    div.onclick = () => {
      selectedAvatar = a;
      document.querySelectorAll(".avatar-choice").forEach((el) => el.classList.remove("selected"));
      div.classList.add("selected");
    };
    avatarPicker.appendChild(div);
  });
  avatarPicker.firstChild.classList.add("selected");

  // === PLAYERS ===
  function updatePlayerList() {
    playerSelect.innerHTML = "";
    players.forEach((p, i) => {
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = `${p.avatar} ${p.name}`;
      playerSelect.appendChild(opt);
    });
  }
  updatePlayerList();

  addPlayerBtn.onclick = () => {
    const name = newPlayer.value.trim();
    if (!name) return;
    players.push({ name, avatar: selectedAvatar, bestPractice: 0, bestChaos: 0 });
    newPlayer.value = "";
    localStorage.setItem("ttPlayers", JSON.stringify(players));
    updatePlayerList();
  };

  // === TABLE SELECT ===
  for (let i = 1; i <= 12; i++) {
    const chip = document.createElement("div");
    chip.className = "table-chip";
    chip.textContent = i;
    chip.onclick = () => chip.classList.toggle("selected");
    tableList.appendChild(chip);
  }

  // === GAME LOGIC ===
  startBtn.onclick = () => {
    const idx = playerSelect.value;
    if (idx === "" || idx === null) return alert("Select or create a player");
    activePlayer = players[idx];
    activePlayerLabel.textContent = `${activePlayer.avatar} ${activePlayer.name}`;
    mode = document.querySelector('input[name="mode"]:checked').value;
    multipleChoice = mcToggle.checked;

    selectedTables = Array.from(document.querySelectorAll(".table-chip.selected")).map((el) => parseInt(el.textContent));
    if (selectedTables.length === 0) return alert("Select at least one table!");

    statPage.classList.add("hidden");
    countdownOverlay.classList.remove("hidden");
    playAmbient();
    playRumble();
    startCountdown();
  };

  newMissionBtn.onclick = () => {
    gamePage.classList.add("hidden");
    statPage.classList.remove("hidden");
  };

  function startCountdown() {
    let count = 3;
    countdownText.textContent = count;
    const interval = setInterval(() => {
      count--;
      if (count === 0) {
        countdownText.textContent = "🚀";
        launchRocket();
      } else if (count < 0) {
        clearInterval(interval);
        countdownOverlay.classList.add("hidden");
        startGame();
      } else countdownText.textContent = count;
    }, 1000);
  }

  function launchRocket() {
    let y = 0;
    const flame = rocketSVG.querySelector("#flame");
    const flameParticles = [];
    const anim = setInterval(() => {
      y -= 10;
      rocketSVG.style.transform = `translateY(${y}px)`;
      flame.setAttribute("points", `40,130 48,${150 + Math.random() * 10} 40,140 32,${150 + Math.random() * 10}`);
      if (y < -window.innerHeight) clearInterval(anim);
    }, 30);
  }

  // === QUESTION GENERATION ===
  function generateQuestions() {
    const qs = [];
    if (mode === "practice") {
      selectedTables.forEach((t) => {
        for (let i = 1; i <= 12; i++) qs.push({ a: t, b: i });
      });
    } else {
      for (let i = 0; i < 50; i++) qs.push({ a: Math.ceil(Math.random() * 12), b: Math.ceil(Math.random() * 12) });
    }
    return qs.sort(() => Math.random() - 0.5);
  }

  function startGame() {
    questions = generateQuestions();
    currentQ = 0;
    score = 0;
    streak = 0;
    time = 0;
    updateTimer();
    gamePage.classList.remove("hidden");
    showQuestion();
  }

  function updateTimer() {
    clearInterval(timer);
    timer = setInterval(() => {
      time++;
      const m = String(Math.floor(time / 60)).padStart(2, "0");
      const s = String(time % 60).padStart(2, "0");
      timeDisplay.textContent = `${m}:${s}`;
    }, 1000);
  }

  function showQuestion() {
    if (currentQ >= questions.length) return endGame();
    const q = questions[currentQ];
    qText.textContent = `${q.a} × ${q.b} = ?`;
    feedback.textContent = "";

    if (multipleChoice) {
      answersContainer.innerHTML = "";
      const correct = q.a * q.b;
      const opts = [correct];
      while (opts.length < 4) {
        const o = Math.ceil(Math.random() * 12 * q.a);
        if (!opts.includes(o)) opts.push(o);
      }
      opts.sort(() => Math.random() - 0.5);
      opts.forEach((o) => {
        const btn = document.createElement("button");
        btn.className = "answer-btn";
        btn.textContent = o;
        btn.onclick = () => checkAnswer(o);
        answersContainer.appendChild(btn);
      });
      document.getElementById("typedAnswer").style.display = "none";
    } else {
      answersContainer.innerHTML = "";
      document.getElementById("typedAnswer").style.display = "flex";
      answerInput.value = "";
      answerInput.focus();
    }
  }

  submitBtn.onclick = () => checkAnswer(parseInt(answerInput.value));
  answerInput.onkeydown = (e) => {
    if (e.key === "Enter") submitBtn.click();
  };

  function checkAnswer(ans) {
    const q = questions[currentQ];
    const correct = q.a * q.b;
    if (ans === correct) {
      score++;
      streak++;
      feedback.textContent = "✅ Correct!";
      feedback.className = "feedback good";
      sounds.sparkle(600 + Math.random() * 400);
      confetti();
    } else {
      streak = 0;
      feedback.textContent = `❌ ${correct}`;
      feedback.className = "feedback bad";
    }
    scoreDisplay.textContent = score;
    streakDisplay.textContent = streak;
    currentQ++;
    setTimeout(showQuestion, 600);
  }

  function endGame() {
    clearInterval(timer);
    feedback.textContent = `🎉 Mission Complete! Score: ${score}`;
  }

  // === CONFETTI ===
  let conf = [];
  function confetti() {
    for (let i = 0; i < 25; i++) {
      conf.push({
        x: Math.random() * confCanvas.width,
        y: 0,
        vx: (Math.random() - 0.5) * 3,
        vy: Math.random() * 4 + 2,
        c: `hsl(${Math.random() * 360},70%,60%)`,
        s: Math.random() * 6 + 3,
      });
    }
  }
  function confUpdate() {
    confCtx.clearRect(0, 0, confCanvas.width, confCanvas.height);
    conf.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      confCtx.fillStyle = p.c;
      confCtx.fillRect(p.x, p.y, p.s, p.s);
    });
    conf = conf.filter((p) => p.y < confCanvas.height);
    requestAnimationFrame(confUpdate);
  }
  confUpdate();
});
