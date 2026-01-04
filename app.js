// ===== DOM =====

const VAPID_KEY = "BAfZbxjnwa35di5_iFswUYEr4dHUgz1hrIz6rOTnEGL3WcJUro9iMHP3s28jbLC56Qa6w41pvKdqp3yu-89KeSc";
const form = document.getElementById("appointmentForm");
const list = document.getElementById("list");
const enableNotif = document.getElementById("enableNotif");
const recordBtn = document.getElementById("recordBtn");
const recordStatus = document.getElementById("recordStatus");

const alarmModal = document.getElementById("alarmModal");
const alarmText = document.getElementById("alarmText");
const listenBtn = document.getElementById("listenBtn");
const closeModalBtn = document.getElementById("closeModalBtn");

// ===== DATA =====
let appointments = JSON.parse(localStorage.getItem("appointments")) || [];
let triggered = JSON.parse(localStorage.getItem("triggered")) || {};

let mediaRecorder = null;
let audioChunks = [];
let pendingAudioBlob = null;

// ===== IndexedDB (audio storage) =====
const DB_NAME = "rappels-db";
const DB_STORE = "audios";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).put(value, key);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGet(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readonly");
    const req = tx.objectStore(DB_STORE).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbDel(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).delete(key);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

// ===== NOTIFICATIONS =====
enableNotif.onclick = async () => {
  if (!("Notification" in window)) {
    alert("Ce navigateur ne supporte pas les notifications");
    return;
  }

  const permission = await Notification.requestPermission();

  if (permission === "granted") {
    alert("🔔 Notifications activées avec succès");
  } else {
    alert("❌ Notifications refusées");
  }
};

// ===== AUDIO RECORD =====
recordBtn.onclick = async () => {
  try {
    if (!mediaRecorder || mediaRecorder.state === "inactive") {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];

      mediaRecorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) audioChunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunks, { type: "audio/webm" });
        pendingAudioBlob = blob;
        recordStatus.textContent = "✅ Audio prêt (il sera attaché au prochain rendez-vous)";
        stream.getTracks().forEach(t => t.stop());
        recordBtn.textContent = "🎙️ Enregistrer l’audio";
      };

      mediaRecorder.start();
      recordStatus.textContent = "🎙️ Enregistrement...";
      recordBtn.textContent = "⏹️ Arrêter l’audio";
    } else {
      mediaRecorder.stop();
    }
  } catch (e) {
    console.error(e);
    alert("Erreur micro ❌ Autorise le micro (Chrome conseillé).");
  }
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
      ${escapeHtml(a.text)}<br><br>
      ${a.audioKey ? `<button type="button" onclick="playAudio(${a.id})">▶️ Écouter</button>` : `<em>Pas d’audio</em>`}
      <button type="button" onclick="removeAppointment(${a.id})">🗑️ Supprimer</button>
      <hr>
    `;
    list.appendChild(li);
  });
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ===== PLAY AUDIO (USER CLICK) =====
window.playAudio = async (id) => {
  const a = appointments.find(x => x.id === id);
  if (!a?.audioKey) return;

  const blob = await idbGet(a.audioKey);
  if (!blob) {
    alert("Audio introuvable (peut-être supprimé).");
    return;
  }

  const url = URL.createObjectURL(blob);
  try {
    const audio = new Audio(url);
    await audio.play();
  } catch (e) {
    console.error(e);
    alert("Impossible de lire l’audio sur ce téléphone.");
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 20000);
  }
};

// ===== DELETE =====
window.removeAppointment = async (id) => {
  const a = appointments.find(x => x.id === id);
  if (a?.audioKey) await idbDel(a.audioKey);

  appointments = appointments.filter(x => x.id !== id);
  delete triggered[id];
  save();
  render();
};

// ===== ADD RDV =====
form.onsubmit = async (e) => {
  e.preventDefault();

  const id = Date.now();
  let audioKey = null;

  // Si audio enregistré => stocker en IndexedDB
  if (pendingAudioBlob) {
    audioKey = "audio-" + id;
    await idbSet(audioKey, pendingAudioBlob);
  }

  appointments.push({
    id,
    date: date.value,
    time: time.value,
    text: text.value,
    audioKey
  });

  pendingAudioBlob = null;
  recordStatus.textContent = "";
  save();
  render();
  form.reset();
};

// ===== MODAL Rappel =====
function showAlarmModal(appointment) {
  alarmText.textContent = appointment.text;

  listenBtn.onclick = async () => {
    // audio uniquement après clic utilisateur
    if (appointment.audioKey) await window.playAudio(appointment.id);
    else alert("Pas d'audio pour ce rappel.");
  };

  alarmModal.classList.remove("hidden");
}

closeModalBtn.onclick = () => alarmModal.classList.add("hidden");
alarmModal.addEventListener("click", (e) => {
  if (e.target === alarmModal) alarmModal.classList.add("hidden");
});

// ===== Réception du message du SW après clic notification =====
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data?.type === "OPEN_ALARM") {
      const alarmId = event.data.alarmId;
      const a = appointments.find(x => x.id === alarmId);
      if (a) showAlarmModal(a);
    }
  });
}

// ===== CHECK ALARM (app ouverte / active) =====
// IMPORTANT : sans serveur push, ça ne peut déclencher QUE si l'app tourne.
setInterval(async () => {
  const now = new Date();

  for (const a of appointments) {
    const target = new Date(`${a.date}T${a.time}`);
    if (now >= target && !triggered[a.id]) {
      triggered[a.id] = true;
      save();

      // ✅ Notification via Service Worker (plus fiable)
      if ("serviceWorker" in navigator && Notification.permission === "granted") {
        const reg = await navigator.serviceWorker.ready;
        reg.showNotification("⏰ Rappel", {
          body: a.text,
          tag: "alarm-" + a.id,
          renotify: true,
          data: { alarmId: a.id }
        });
      } else {
        alert("⏰ Rappel : " + a.text);
      }

      // Affiche aussi dans l'app si elle est ouverte
      showAlarmModal(a);
    }
  }
}, 1000);

render();
