(() => {
  "use strict";

  const STRATEGIES = {
    maintenance: {
      name: "Maintenance rehearsal",
      short: "Maintenance",
      instructions: "Repeat the word silently to yourself again and again while it is on the screen. Focus on keeping the word active in your memory.",
      prompt: "Repeat each word silently to yourself."
    },
    self: {
      name: "Self-reference",
      short: "Self-reference",
      instructions: "Think about how each word relates to you personally. You might consider whether you own it, use it, like it, or have an experience involving it.",
      prompt: "Connect each word to your own life."
    },
    imagery: {
      name: "Mental imagery",
      short: "Mental imagery",
      instructions: "Create a clear mental picture of each word. Imagine what it looks like, including its color, shape, size, or surroundings.",
      prompt: "Make a vivid mental image of each word."
    }
  };

  const WORD_LISTS = [
    ["apple", "ladder", "candle", "rabbit", "pencil", "bucket"],
    ["bridge", "lemon", "button", "guitar", "window", "carrot"],
    ["hammer", "turtle", "blanket", "spoon", "basket", "flower"]
  ];
  const WORD_SECONDS = 4;
  const DISTRACTOR_SECONDS = 30;
  const app = document.getElementById("app");
  const stageLabel = document.getElementById("stage-label");
  const progressLabel = document.getElementById("progress-label");
  const progressFill = document.getElementById("progress-fill");

  let session = null;
  let strategyIndex = 0;
  let wordIndex = 0;
  let timerId = null;
  let timeLeft = WORD_SECONDS;
  let distractorStart = null;

  const shuffle = (array) => {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));

  function setProgress(stage, percent) {
    stageLabel.textContent = stage;
    progressLabel.textContent = `${percent}%`;
    progressFill.style.width = `${percent}%`;
  }
  function stopTimer() {
    if (timerId) clearInterval(timerId);
    timerId = null;
  }
  function startExperiment() {
    const strategies = shuffle(Object.keys(STRATEGIES));
    const lists = shuffle(WORD_LISTS);
    session = {
      session_id: `ENC-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      started_at: new Date().toISOString(),
      strategy_order: strategies,
      assignments: {},
      trials: [],
      recall_text: "",
      recalled_words: [],
      completed_at: null,
      distractor_start_number: null
    };
    strategies.forEach((strategy, i) => {
      session.assignments[strategy] = lists[i];
      lists[i].forEach((word, j) => session.trials.push({
        strategy, strategy_name: STRATEGIES[strategy].name,
        word, list_position: j + 1, recalled: false
      }));
    });
    strategyIndex = 0;
    showInstructions();
  }

  function showInstructions() {
    stopTimer();
    const strategy = session.strategy_order[strategyIndex];
    const info = STRATEGIES[strategy];
    setProgress(`Learning round ${strategyIndex + 1} of 3`, 5 + strategyIndex * 25);
    app.innerHTML = `
      <span class="strategy-pill">ROUND ${strategyIndex + 1} OF 3</span>
      <h2>${escapeHtml(info.name)}</h2>
      <p class="intro-copy">You will study six words using this approach. Each word will appear for ${WORD_SECONDS} seconds.</p>
      <div class="instruction-card"><strong>What to do</strong><p>${escapeHtml(info.instructions)}</p></div>
      <p class="small-note">Try to use this strategy consistently for all six words in this round.</p>
      <button id="continue-btn" class="primary-btn">I'm ready <span aria-hidden="true">→</span></button>`;
    document.getElementById("continue-btn").addEventListener("click", () => {
      wordIndex = 0;
      showWord();
    });
  }

  function showWord() {
    stopTimer();
    const strategy = session.strategy_order[strategyIndex];
    const words = session.assignments[strategy];
    if (wordIndex >= words.length) {
      strategyIndex++;
      if (strategyIndex < 3) showInstructions();
      else showDistractorIntro();
      return;
    }
    const percent = 10 + (strategyIndex * 25) + (wordIndex / 6) * 20;
    setProgress(`Learning round ${strategyIndex + 1} of 3`, Math.min(80, Math.round(percent)));
    timeLeft = WORD_SECONDS;
    app.innerHTML = `
      <div class="word-stage">
        <span class="strategy-pill">${escapeHtml(STRATEGIES[strategy].short.toUpperCase())}</span>
        <div class="word-counter">WORD ${wordIndex + 1} OF 6</div>
        <div class="word-card"><span>${escapeHtml(words[wordIndex])}</span></div>
        <p class="field-help">${escapeHtml(STRATEGIES[strategy].prompt)}</p>
        <div class="timer" id="word-timer">${timeLeft}</div>
        <p class="small-note">The next word will appear automatically.</p>
      </div>`;
    timerId = setInterval(() => {
      timeLeft--;
      const display = document.getElementById("word-timer");
      if (display) display.textContent = timeLeft;
      if (timeLeft <= 0) {
        stopTimer();
        wordIndex++;
        showWord();
      }
    }, 1000);
  }

  function showDistractorIntro() {
    setProgress("Distraction task", 82);
    const start = Math.floor(Math.random() * 700) + 200;
    session.distractor_start_number = start;
    app.innerHTML = `
      <p class="eyebrow">SHORT DISTRACTION TASK</p>
      <h2>Let's briefly shift your focus.</h2>
      <p class="intro-copy">For the next 30 seconds, count backward by 3 from the number below. Type each answer into the box, one at a time, and press Enter. Keep going until the timer ends.</p>
      <div class="task-box center"><div class="eyebrow">STARTING NUMBER</div><div class="timer">${start}</div>
        <label for="count-input">Your next number</label>
        <input id="count-input" inputmode="numeric" autocomplete="off" placeholder="Type the next number">
      </div>
      <button id="start-counting" class="primary-btn">Start 30-second task <span aria-hidden="true">→</span></button>`;
    document.getElementById("start-counting").addEventListener("click", beginDistractor);
  }

  function beginDistractor() {
    const input = document.getElementById("count-input");
    let expected = session.distractor_start_number - 3;
    const entries = [];
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && input.value.trim()) {
        const value = input.value.trim();
        entries.push(value);
        input.value = "";
        input.placeholder = "Next number…";
      }
    });
    distractorStart = Date.now();
    setProgress("Distraction task", 84);
    app.innerHTML = `
      <p class="eyebrow">COUNT BACKWARD BY 3</p>
      <h2>Keep counting.</h2>
      <p class="intro-copy">Starting from <strong>${session.distractor_start_number}</strong>, continue subtracting 3. Enter each answer and press Enter.</p>
      <div class="timer" id="distractor-timer">30</div>
      <div class="task-box"><label for="count-input">Your next number</label><input id="count-input" inputmode="numeric" autocomplete="off" placeholder="Type the next number">
      <p class="field-help">Keep going until the timer reaches zero.</p></div>`;
    const countInput = document.getElementById("count-input");
    countInput.focus();
    countInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && countInput.value.trim()) {
        entries.push(countInput.value.trim());
        countInput.value = "";
      }
    });
    let remaining = DISTRACTOR_SECONDS;
    timerId = setInterval(() => {
      remaining--;
      const display = document.getElementById("distractor-timer");
      if (display) display.textContent = remaining;
      if (remaining <= 0) {
        stopTimer();
        session.distractor_duration_seconds = Math.round((Date.now() - distractorStart) / 1000);
        session.distractor_entries = entries;
        showRecall();
      }
    }, 1000);
  }

  function showRecall() {
    setProgress("Free recall", 90);
    app.innerHTML = `
      <p class="eyebrow">FINAL MEMORY TEST</p>
      <h2>What do you remember?</h2>
      <p class="intro-copy">Type as many of the 18 words you studied as you can remember. You may enter them in any order. Separate words with commas, spaces, or line breaks.</p>
      <label for="recall-input"><strong>Your remembered words</strong></label>
      <textarea id="recall-input" placeholder="Type the words you remember here…"></textarea>
      <p class="field-help">Do your best without going back to previous screens.</p>
      <button id="submit-recall" class="primary-btn">Submit answers <span aria-hidden="true">→</span></button>`;
    document.getElementById("submit-recall").addEventListener("click", () => {
      const text = document.getElementById("recall-input").value;
      if (!text.trim()) {
        if (!confirm("You haven't entered any words. Submit an empty response?")) return;
      }
      session.recall_text = text;
      scoreRecall(text);
      session.completed_at = new Date().toISOString();
      showResults();
    });
  }

  function normalize(word) {
    return word.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
  }
  function editDistance(a, b) {
    const row = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      let diagonal = row[0];
      row[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const above = row[j];
        row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
        diagonal = above;
      }
    }
    return row[b.length];
  }
  function scoreRecall(text) {
    const normalizedInput = new Set(text.split(/[\s,;]+/).map(normalize).filter(Boolean));
    session.recalled_words = [];
    session.trials.forEach(trial => {
      const target = normalize(trial.word);
      // Accept exact matches or a one-character spelling slip; do not count the same response twice.
      let matched = normalizedInput.has(target);
      if (!matched) {
        for (const response of normalizedInput) {
          if (Math.abs(response.length - target.length) <= 1 && editDistance(response, target) <= 1) {
            matched = true;
            break;
          }
        }
      }
      trial.recalled = matched;
      if (trial.recalled) session.recalled_words.push(trial.word);
    });
    session.strategy_scores = {};
    Object.keys(STRATEGIES).forEach(strategy => {
      const rows = session.trials.filter(t => t.strategy === strategy);
      session.strategy_scores[strategy] = rows.filter(t => t.recalled).length;
    });
  }

  function showResults() {
    setProgress("Results", 100);
    const scoreRows = session.strategy_order.map(key => {
      const score = session.strategy_scores[key];
      return `<div class="score-row"><span>${escapeHtml(STRATEGIES[key].short)}</span><div class="score-track"><div class="score-fill" style="width:${(score / 6) * 100}%"></div></div><span class="score-number">${score}/6</span></div>`;
    }).join("");
    const total = session.recalled_words.length;
    app.innerHTML = `
      <p class="eyebrow">YOUR RESULTS</p>
      <h2>Experiment complete.</h2>
      <div class="results-top"><div class="eyebrow">TOTAL WORDS RECALLED</div><div class="timer">${total}<span style="font-size:1.2rem;color:#687572"> / 18</span></div><p class="result-note">You correctly recalled ${total} of the 18 studied words.</p></div>
      <h3>Recall by encoding strategy</h3>
      ${scoreRows}
      <p class="result-note">A word is counted as correct when it matches a studied word, ignoring capitalization and punctuation and allowing a one-character spelling error. Each studied word is scored once.</p>
      <div class="notice"><strong>Your data is private to this session.</strong><br>Download the CSV files below to save your results. This practice website does not send responses to a server.</div>
      <div class="result-actions">
        <button id="summary-csv" class="primary-btn">Download summary CSV ↓</button>
        <button id="trials-csv" class="secondary-btn">Download trial-level CSV ↓</button>
      </div>
      <p class="small-note">Thank you for participating. You may close this page after downloading your files.</p>`;
    document.getElementById("summary-csv").addEventListener("click", downloadSummary);
    document.getElementById("trials-csv").addEventListener("click", downloadTrials);
  }

  function csvCell(value) {
    const str = value == null ? "" : String(value);
    return `"${str.replace(/"/g, '""')}"`;
  }
  function downloadCsv(filename, headers, rows) {
    const csv = [headers, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }
  function downloadSummary() {
    const headers = ["session_id", "started_at", "completed_at", "strategy_order", "maintenance_recalled", "self_reference_recalled", "mental_imagery_recalled", "total_recalled", "total_studied", "distractor_duration_seconds"];
    const row = [
      session.session_id, session.started_at, session.completed_at,
      session.strategy_order.map(s => STRATEGIES[s].name).join(" > "),
      session.strategy_scores.maintenance, session.strategy_scores.self,
      session.strategy_scores.imagery, session.recalled_words.length, 18,
      session.distractor_duration_seconds || DISTRACTOR_SECONDS
    ];
    downloadCsv("encoding-experiment-summary.csv", headers, [row]);
  }
  function downloadTrials() {
    const headers = ["session_id", "strategy", "strategy_name", "word", "list_position", "recalled"];
    const rows = session.trials.map(t => [
      session.session_id, t.strategy, t.strategy_name, t.word, t.list_position, t.recalled ? 1 : 0
    ]);
    downloadCsv("encoding-experiment-trials.csv", headers, rows);
  }

  document.getElementById("start-btn").addEventListener("click", startExperiment);
})();