const form = document.getElementById("appointmentForm");
const list = document.getElementById("list");
const enableNotif = document.getElementById("enableNotif");

let appointments = JSON.parse(localStorage.getItem("appointments")) || [];
let triggered = JSON.parse(localStorage.getItem("triggered")) || {};

let mediaRecorder = null;
let audioChunks = [];
let pendingAudio = null;

// ===== NOTIFICATIONS =====
enableNotif.onclick = async () => {
  const perm = await Notification.requestPermission();
  alert(perm === "granted"
    ? "Notifications activées ✅"
    : "Notifications refusées ❌");
};

// ===== AUDIO RECORD =====
document.getElementById("recordBtn").onclick = async () => {
  try {
    if (!mediaRecorder || mediaRecorder.state === "inactive") {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];

      mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunks, { type: "audio/webm" });
        pendingAudio = URL.createObjectURL(blob);
        document.getElementById("recordStatus").textContent = "✅ Audio prêt";
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      document.getElementById("recordStatus").textContent = "🎙️ Enregistrement...";
    } else {
      mediaRecorder.stop();
    }
  } catch {
    alert("Erreur micro ❌ Autorise le micro");
  }
};

// ===== ADD RDV =====
form.onsubmit = e => {
  e.preventDefault();

  appointments.push({
    id: Date.now(),
    date: date.value,
    time: time.value,
    text: text.value,
    audio: pendingAudio
  });

  pendingAudio = null;
  save();
  render();
  form.reset();
};

// ===== SAVE =====
function save() {
  localStorage.setItem("appointments", JSON.stringify(appointments));
  localStorage.setItem("triggered", JSON.stringify(triggered));
}

// ===== RENDER =====
function render() {
  list.innerHTML = "";
  appointments.forEach(a => {
    const li = document.createElement("li");
    li.innerHTML = `
      <b>${a.date} ${a.time}</b><br>
      ${a.text}<br>
      ${a.audio ? `<button onclick="playAudio(${a.id})">▶️ Écouter</button>` : ""}
      <button onclick="removeAppointment(${a.id})">🗑️ Supprimer</button>
      <hr>
    `;
    list.appendChild(li);
  });
}

// ===== PLAY AUDIO (USER CLICK) =====
window.playAudio = id => {
  const a = appointments.find(x => x.id === id);
  if (a?.audio) new Audio(a.audio).play();
};

// ===== DELETE =====
window.removeAppointment = id => {
  appointments = appointments.filter(a => a.id !== id);
  delete triggered[id];
  save();
  render();
};

// ===== CHECK ALARM =====
setInterval(() => {
  const now = new Date();

  appointments.forEach(a => {
    const target = new Date(`${a.date}T${a.time}`);
    if (now >= target && !triggered[a.id]) {
      triggered[a.id] = true;
      save();

      // 🔔 Notification système (ding automatique)
      if (Notification.permission === "granted") {
        const n = new Notification("⏰ Rappel", {
          body: a.text
        });

        // 👉 clic utilisateur = autorise l'audio
        n.onclick = () => {
          window.focus();
        };
      }

      alert("⏰ Rappel : " + a.text);
    }
  });
}, 1000);

render();
