// ====== ELEMENTS DOM ======
const form = document.getElementById("appointmentForm");
const list = document.getElementById("list");
const enableNotif = document.getElementById("enableNotif");

const dateInput = document.getElementById("date");
const timeInput = document.getElementById("time");
const textInput = document.getElementById("text");

const recordBtn = document.getElementById("recordBtn");
const recordStatus = document.getElementById("recordStatus");

// ====== DATA ======
let appointments = JSON.parse(localStorage.getItem("appointments")) || [];
let triggered = JSON.parse(localStorage.getItem("triggered")) || {};

// Audio "prêt" (sera attaché au prochain rendez-vous ajouté)
let pendingAudio = null;

// Recorder
let mediaRecorder = null;
let audioChunks = [];
let currentStream = null;

// ====== NOTIFICATIONS ======
enableNotif.addEventListener("click", async () => {
  if (!("Notification" in window)) {
    alert("Notifications non supportées sur ce navigateur.");
    return;
  }
  const perm = await Notification.requestPermission();
  alert(perm === "granted" ? "Notifications activées ✅" : "Notifications refusées ❌");
});

// ====== SAVE ======
function save() {
  localStorage.setItem("appointments", JSON.stringify(appointments));
  localStorage.setItem("triggered", JSON.stringify(triggered));
}

// ====== RENDER ======
function render() {
  list.innerHTML = "";

  appointments.forEach(a => {
    const li = document.createElement("li");

    li.innerHTML = `
      <strong>${a.date} ${a.time}</strong><br>
      ${escapeHtml(a.text)}<br><br>

      ${a.audio ? `<button type="button" onclick="playAudio(${a.id})">▶️ Écouter</button>` : `<em>Pas d’audio</em>`}
      &nbsp;&nbsp;
      <button type="button" onclick="removeAppointment(${a.id})">🗑️ Supprimer</button>

      <hr>
    `;

    list.appendChild(li);
  });
}

// Petit helper pour éviter des soucis si texte contient < >
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ====== SUPPRIMER ======
window.removeAppointment = function (id) {
  appointments = appointments.filter(a => a.id !== id);
  delete triggered[id];
  save();
  render();
};

// ====== PLAY AUDIO (clic utilisateur) ======
window.playAudio = function (id) {
  const a = appointments.find(x => x.id === id);
  if (!a || !a.audio) return;

  try {
    const audio = new Audio(a.audio);
    audio.play();
  } catch (e) {
    alert("Impossible de lire l’audio sur ce téléphone.");
    console.error(e);
  }
};

// ====== ENREGISTREMENT AUDIO ======
recordBtn.addEventListener("click", async () => {
  try {
    // Si on n'enregistre pas encore => START
    if (!mediaRecorder || mediaRecorder.state === "inactive") {
      // IMPORTANT : ça marche uniquement en https (GitHub Pages OK)
      currentStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      mediaRecorder = new MediaRecorder(currentStream);
      audioChunks = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        // Créer un blob audio
        const blob = new Blob(audioChunks, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);

        pendingAudio = url;
        recordStatus.textContent = "✅ Audio prêt (il sera attaché au prochain rendez-vous)";

        // Stop micro (important)
        if (currentStream) {
          currentStream.getTracks().forEach(t => t.stop());
          currentStream = null;
        }

        recordBtn.textContent = "🎙️ Enregistrer l’audio";
      };

      mediaRecorder.start();
      recordStatus.textContent = "🎙️ Enregistrement en cours... clique encore pour arrêter";
      recordBtn.textContent = "⏹️ Arrêter l’audio";
      return;
    }

    // Sinon => STOP
    if (mediaRecorder.state === "recording") {
      mediaRecorder.stop();
    }
  } catch (err) {
    console.error(err);
    alert("Erreur micro ❌\n1) Ouvre le site en https\n2) Autorise le micro\n3) Essaie sur Chrome");
  }
});

// ====== AJOUT RENDEZ-VOUS ======
form.addEventListener("submit", (e) => {
  e.preventDefault();

  const appointment = {
    id: Date.now(),
    date: dateInput.value,
    time: timeInput.value,
    text: textInput.value,
    audio: pendingAudio // attach audio to THIS appointment
  };

  appointments.push(appointment);

  // reset "pendingAudio" after attaching it
  pendingAudio = null;
  recordStatus.textContent = "";

  save();
  render();
  form.reset();
});

// ====== RAPPEL (check chaque seconde) ======
setInterval(() => {
  const now = new Date();

  appointments.forEach(a => {
    const target = new Date(`${a.date}T${a.time}`);
    if (now >= target && !triggered[a.id]) {
      triggered[a.id] = true;
      save();

      alert("⏰ Rappel : " + a.text);

      if ("Notification" in window && Notification.permission === "granted") {
        const n = new Notification("⏰ Rappel", { body: a.text });
        // si l'utilisateur clique la notification => on peut jouer l'audio
        n.onclick = () => {
          if (a.audio) {
            try { new Audio(a.audio).play(); } catch {}
          }
        };
      }
    }
  });
}, 1000);

// ====== INIT ======
render();
