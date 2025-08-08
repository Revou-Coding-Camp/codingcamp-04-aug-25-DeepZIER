/* ============================
   Full app JS — dengan Countdown
   ============================ */

let todos = [];
let sortType = "newest";
let statusFilter = "all";
let countdownInterval = null;

/* --- Tambah task --- */
function addTodo() {
  const task = document.getElementById("todo-input").value.trim();
  const dateValue = document.getElementById("todo-date").value; // datetime-local atau date
  const importance = parseInt(
    document.getElementById("importance").value || "1"
  );
  const difficulty = parseInt(
    document.getElementById("difficulty").value || "1"
  );

  if (!task || !dateValue) {
    alert("Lengkapi task dan tanggal!");
    return;
  }

  // jika input cuma yyyy-mm-dd (date), tambahkan T23:59:59 supaya hitung mundur sampai akhir hari
  let dueTimestamp;
  if (dateValue.indexOf("T") === -1) {
    dueTimestamp = new Date(dateValue + "T23:59:59").getTime();
  } else {
    dueTimestamp = new Date(dateValue).getTime();
  }

  todos.push({
    task,
    due: dueTimestamp,
    dateRaw: dateValue, // optional: simpan string asli
    importance,
    ease: difficulty,
    status: "belum",
  });

  // clear input
  document.getElementById("todo-input").value = "";
  document.getElementById("todo-date").value = "";

  renderTable();
}

/* --- Render tabel (filter + sort) --- */
function renderTable() {
  const tbody = document.getElementById("todo-table-body");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (todos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5">No task found</td></tr>';
    updateDashboard();
    stopCountdown(); // tidak perlu interval jika tidak ada task
    return;
  }

  // Update overdue status on master array (so dashboard counts correct)
  const now = Date.now();
  todos.forEach((t) => {
    if (t.status === "belum" && t.due <= now) {
      t.status = "terlambat";
    }
  });

  // Filter
  let filtered = todos.filter((t) => {
    if (statusFilter === "all") return true;
    return t.status === statusFilter;
  });

  // Sort by due
  filtered.sort((a, b) =>
    sortType === "newest" ? b.due - a.due : a.due - b.due
  );

  // Render each filtered todo
  filtered.forEach((todo) => {
    const originalIndex = todos.indexOf(todo); // index in master array

    const tr = document.createElement("tr");

    // Task cell (batasi teks agar tidak pecah layout)
    tr.innerHTML = `
      <td class="task-col td-task">${escapeHtml(todo.task)}</td>
      <td class="countdown-cell" data-index="${originalIndex}" title="${new Date(
      todo.due
    ).toLocaleString()}"></td>
      <td>
        <div class="bar-group">
          <div class="bar-title">Kepentingan</div>
          <div class="bar">${generateScaleBar(todo.importance)}</div>
          <div class="bar-title">Kesulitan</div>
          <div class="bar">${generateScaleBar(todo.ease)}</div>
        </div>
      </td>
      <td><span class="status-${todo.status}">${statusLabel(
      todo.status
    )}</span></td>
      <td>
        ${
          todo.status === "belum"
            ? `<button class="action-btn done-btn" onclick="markDone(${originalIndex})">Selesai</button>
               <button class="action-btn cancel-btn" onclick="cancelTask(${originalIndex})">Batal</button>`
            : ""
        }
        <button class="icon-btn delete-btn" onclick="deleteTask(${originalIndex})">
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  updateDashboard();
  startCountdown();
}

/* --- Status label mapping --- */
function statusLabel(status) {
  switch (status) {
    case "belum":
      return "Belum Dikerjakan";
    case "selesai":
      return "Selesai";
    case "batal":
      return "Tidak Dikerjakan";
    case "terlambat":
      return "Terlambat";
    default:
      return status;
  }
}

/* --- Actions --- */
function markDone(index) {
  if (typeof todos[index] !== "undefined") {
    todos[index].status = "selesai";
    renderTable();
  }
}

function cancelTask(index) {
  if (typeof todos[index] !== "undefined") {
    todos[index].status = "batal";
    renderTable();
  }
}

function deleteTask(index) {
  if (typeof todos[index] === "undefined") return;
  if (confirm("Yakin mau hapus task ini?")) {
    todos.splice(index, 1);
    renderTable();
  }
}

function deleteAll() {
  if (confirm("Hapus semua task?")) {
    todos = [];
    renderTable();
  }
}

/* --- Scale bar --- */
function generateScaleBar(value) {
  const v = parseInt(value) || 0;
  let html = "";
  for (let i = 1; i <= 5; i++) {
    html += `<span class="bar-unit ${getBarColor(i)} ${
      i <= v ? "filled" : ""
    }"></span>`;
  }
  return html;
}

/* --- Preview sliders --- */
function updatePreview() {
  const importance = document.getElementById("importance")?.value || "1";
  const difficulty = document.getElementById("difficulty")?.value || "1";
  const impEl = document.getElementById("importance-value");
  const diffEl = document.getElementById("difficulty-value");
  if (impEl) impEl.innerText = importance;
  if (diffEl) diffEl.innerText = difficulty;
  localStorage.setItem("importance", importance);
  localStorage.setItem("difficulty", difficulty);
}

/* --- Init on load --- */
window.addEventListener("load", function () {
  const importance = localStorage.getItem("importance") || "1";
  const difficulty = localStorage.getItem("difficulty") || "1";
  const impEl = document.getElementById("importance-value");
  const diffEl = document.getElementById("difficulty-value");
  if (impEl) impEl.innerText = importance;
  if (diffEl) diffEl.innerText = difficulty;
  const impInput = document.getElementById("importance");
  const diffInput = document.getElementById("difficulty");
  if (impInput) impInput.value = importance;
  if (diffInput) diffInput.value = difficulty;

  renderTable();
});

/* --- Colors for scale units --- */
function getBarColor(i) {
  switch (i) {
    case 1:
      return "bar-green";
    case 2:
      return "bar-lime";
    case 3:
      return "bar-yellow";
    case 4:
      return "bar-orange";
    case 5:
      return "bar-red";
    default:
      return "";
  }
}

/* --------------------------
   Countdown (updates visible countdown cells)
   -------------------------- */
function startCountdown() {
  stopCountdown(); // clear existing

  // if no tasks -> skip
  if (todos.length === 0) return;

  countdownInterval = setInterval(() => {
    const now = Date.now();
    // select all visible countdown cells
    const cells = document.querySelectorAll(".countdown-cell");
    let shouldRerender = false;

    cells.forEach((cell) => {
      const idx = parseInt(cell.dataset.index, 10);
      const todo = todos[idx];
      if (!todo) return;

      // if not "belum", show the formatted due date (or keep blank)
      if (todo.status !== "belum") {
        cell.textContent = new Date(todo.due).toLocaleString();
        cell.style.color = ""; // default color
        return;
      }

      const diff = todo.due - now;

      if (diff <= 0) {
        // time's up -> mark terlambat on master array, and rerender once
        todo.status = "terlambat";
        shouldRerender = true;
      } else {
        // update countdown text and color based on remaining time
        cell.textContent = formatCountdown(diff);

        if (diff <= 1000 * 60 * 60) {
          // < 1 hour -> red
          cell.style.color = "#ff4d4d";
        } else if (diff <= 1000 * 60 * 60 * 24) {
          // < 1 day -> yellow/orange
          cell.style.color = "#ffcc00";
        } else {
          cell.style.color = "#e2e8f0"; // normal (match your theme)
        }
      }
    });

    if (shouldRerender) {
      // Re-render table once to reflect status changes (will also restart countdown)
      renderTable();
    }
  }, 1000);
}

function stopCountdown() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
}

function formatCountdown(ms) {
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);
  return `${pad(days)}d : ${pad(hours)}h : ${pad(minutes)}m : ${pad(seconds)}s`;
}

function pad(n) {
  return n.toString().padStart(2, "0");
}

/* --------------------------
   Dashboard updater
   -------------------------- */
function updateDashboard() {
  const total = todos.length;
  const done = todos.filter((t) => t.status === "selesai").length;
  const pending = todos.filter((t) => t.status === "belum").length;
  const late = todos.filter((t) => t.status === "terlambat").length;
  const cancel = todos.filter((t) => t.status === "batal").length;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  const totalEl = document.getElementById("total-task");
  const doneEl = document.getElementById("done-task");
  const pendingEl = document.getElementById("pending-task");
  const lateEl = document.getElementById("late-task"); // optional
  const cancelEl = document.getElementById("cancel-task"); // optional
  const progressPercentEl = document.getElementById("progress-percent");
  const progressBarEl = document.getElementById("progress-bar");

  if (totalEl) totalEl.textContent = total;
  if (doneEl) doneEl.textContent = done;
  if (pendingEl) pendingEl.textContent = pending;
  if (lateEl) lateEl.textContent = late;
  if (cancelEl) cancelEl.textContent = cancel;
  if (progressPercentEl) progressPercentEl.textContent = progress + "%";
  if (progressBarEl) progressBarEl.style.width = progress + "%";
}

/* --------------------------
   Filter & Sort
   -------------------------- */
function toggleFilterMenu() {
  const menu = document.getElementById("filter-menu");
  if (!menu) return;
  menu.style.display = menu.style.display === "block" ? "none" : "block";
}

function setSort(type) {
  sortType = type;
  renderTable();
}

function setFilter(type) {
  statusFilter = type;
  const filterBtn = document.getElementById("filter-btn");
  if (filterBtn) {
    switch (type) {
      case "all":
        filterBtn.textContent = "📋 Semua";
        break;
      case "selesai":
        filterBtn.textContent = "✅ Selesai";
        break;
      case "belum":
        filterBtn.textContent = "🕒 Belum";
        break;
      case "terlambat":
        filterBtn.textContent = "⏰ Terlambat";
        break;
      case "batal":
        filterBtn.textContent = "❌ Dibatalkan";
        break;
      default:
        filterBtn.textContent = "Filter";
    }
  }
  renderTable();
}

// klik di luar tutup menu
document.addEventListener("click", function (event) {
  const filterContainer = document.querySelector(".filter-container");
  const menu = document.getElementById("filter-menu");
  if (!filterContainer || !menu) return;
  if (!filterContainer.contains(event.target)) {
    menu.style.display = "none";
  }
});

/* --------------------------
   Canvas background (optional — pasted from your code)
   -------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("bg-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  const blobs = [];
  const numBlobs = 10;
  const brightColors = [
    "rgba(255, 41, 41, 0.6)",
    "rgba(23, 255, 23, 0.6)",
    "rgba(33, 33, 255, 0.6)",
    "rgba(255, 255, 41, 0.6)",
    "rgba(0,255,255,0.6)",
    "rgba(255, 20, 255, 0.6)",
  ];

  function random(min, max) {
    return Math.random() * (max - min) + min;
  }

  function createBlobs() {
    blobs.length = 0;
    for (let i = 0; i < numBlobs; i++) {
      blobs.push({
        x: random(0, canvas.width),
        y: random(0, canvas.height),
        radius: random(150, 300),
        dx: random(-0.8, 0.8),
        dy: random(-0.8, 0.8),
        color: brightColors[Math.floor(Math.random() * brightColors.length)],
      });
    }
  }

  function drawBlob(blob) {
    const glow1 = ctx.createRadialGradient(
      blob.x,
      blob.y,
      0,
      blob.x,
      blob.y,
      blob.radius * 1.6
    );
    glow1.addColorStop(0, blob.color);
    glow1.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow1;
    ctx.beginPath();
    ctx.arc(blob.x, blob.y, blob.radius * 1.6, 0, Math.PI * 2);
    ctx.fill();

    const coreColor = blob.color.replace("0.6", "0.9");
    const glow2 = ctx.createRadialGradient(
      blob.x,
      blob.y,
      0,
      blob.x,
      blob.y,
      blob.radius
    );
    glow2.addColorStop(0, coreColor);
    glow2.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow2;
    ctx.beginPath();
    ctx.arc(blob.x, blob.y, blob.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function updateBlobs() {
    blobs.forEach((blob) => {
      blob.x += blob.dx;
      blob.y += blob.dy;

      if (blob.x - blob.radius > canvas.width) blob.x = -blob.radius;
      if (blob.x + blob.radius < 0) blob.x = canvas.width + blob.radius;
      if (blob.y - blob.radius > canvas.height) blob.y = -blob.radius;
      if (blob.y + blob.radius < 0) blob.y = canvas.height + blob.radius;
    });
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    blobs.forEach(drawBlob);
    updateBlobs();
    requestAnimationFrame(animate);
  }

  createBlobs();
  animate();
});

/* --------------------------
   Helper
   -------------------------- */
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
