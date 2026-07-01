/* ==========================================================================
   TaskFlow To-Do — Application Logic
   Vanilla JS, no frameworks. LocalStorage persistence.
   ========================================================================== */

(() => {
  "use strict";

  /* ---------------------------------------------------------------------
     State & Constants
  --------------------------------------------------------------------- */
  const STORAGE_KEY = "TaskFlow-todo-tasks";
  const THEME_KEY = "TaskFlow-todo-theme";

  let tasks = [];               // { id, title, date, category, priority, completed, createdAt, order }
  let currentFilter = "all";    // all | active | completed
  let currentSort = "created";  // created | date | priority | alpha
  let searchQuery = "";
  let taskPendingDelete = null;
  let draggedTaskId = null;

  const priorityWeight = { High: 3, Medium: 2, Low: 1 };

  const QUOTES = [
    "The secret of getting ahead is getting started.",
    "Small steps every day lead to big results.",
    "Focus on progress, not perfection.",
    "Done is better than perfect.",
    "Your future is created by what you do today.",
    "One task at a time. One win at a time.",
    "Discipline is choosing what you want most over what you want now.",
    "A little progress each day adds up to big results.",
    "Clarity comes from action, not thought.",
    "Organize today, conquer tomorrow."
  ];

  /* ---------------------------------------------------------------------
     DOM References
  --------------------------------------------------------------------- */
  const $ = (id) => document.getElementById(id);

  const el = {
    loader: $("loader"),
    taskInput: $("taskInput"),
    taskDate: $("taskDate"),
    taskCategory: $("taskCategory"),
    taskPriority: $("taskPriority"),
    addBtn: $("addBtn"),
    fab: $("fab"),
    searchInput: $("searchInput"),
    sortSelect: $("sortSelect"),
    filterBtns: document.querySelectorAll(".filter-btn"),
    clearCompletedBtn: $("clearCompletedBtn"),
    progressBar: $("progressBar"),
    progressLabel: $("progressLabel"),
    progressCount: $("progressCount"),
    remainingCount: $("remainingCount"),
    completedCount: $("completedCount"),
    taskList: $("taskList"),
    emptyState: $("emptyState"),
    themeToggle: $("themeToggle"),
    datetime: $("timeText"),
    quoteText: $("quoteText").querySelector("span"),
    toastContainer: $("toastContainer"),
    // Edit modal
    editModal: $("editModal"),
    editTitle: $("editTitle"),
    editDate: $("editDate"),
    editCategory: $("editCategory"),
    editPriority: $("editPriority"),
    closeModalBtn: $("closeModalBtn"),
    cancelEditBtn: $("cancelEditBtn"),
    saveEditBtn: $("saveEditBtn"),
    // Delete modal
    deleteModal: $("deleteModal"),
    cancelDeleteBtn: $("cancelDeleteBtn"),
    confirmDeleteBtn: $("confirmDeleteBtn"),
    confettiCanvas: $("confettiCanvas"),
  };

  let editingTaskId = null;

  /* ---------------------------------------------------------------------
     Persistence
  --------------------------------------------------------------------- */
  function saveTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }

  function loadTasks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      tasks = raw ? JSON.parse(raw) : [];
    } catch (e) {
      tasks = [];
    }
  }

  function saveTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
  }

  function loadTheme() {
    return localStorage.getItem(THEME_KEY) || "dark";
  }

  /* ---------------------------------------------------------------------
     Utility
  --------------------------------------------------------------------- */
  function uid() {
    return "t-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function formatDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr + "T00:00:00");
    if (isNaN(d)) return null;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  function isOverdue(dateStr, completed) {
    if (!dateStr || completed) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(dateStr + "T00:00:00");
    return d < today;
  }

  /* ---------------------------------------------------------------------
     Toast Notifications
  --------------------------------------------------------------------- */
  function showToast(message, type = "info") {
    const icons = {
      success: "fa-circle-check",
      danger: "fa-circle-xmark",
      info: "fa-circle-info",
    };
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i><span>${escapeHtml(message)}</span>`;
    el.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("hide");
      toast.addEventListener("animationend", () => toast.remove());
    }, 2600);
  }

  /* ---------------------------------------------------------------------
     Ripple Effect (event delegation on any .ripple button)
  --------------------------------------------------------------------- */
  function attachRipple(button) {
    button.addEventListener("click", (e) => {
      const rect = button.getBoundingClientRect();
      const circle = document.createElement("span");
      const size = Math.max(rect.width, rect.height);
      circle.className = "ripple-circle";
      circle.style.width = circle.style.height = `${size}px`;
      circle.style.left = `${e.clientX - rect.left - size / 2}px`;
      circle.style.top = `${e.clientY - rect.top - size / 2}px`;
      button.appendChild(circle);
      setTimeout(() => circle.remove(), 650);
    });
  }
  document.querySelectorAll(".ripple").forEach(attachRipple);

  /* ---------------------------------------------------------------------
     Date / Time / Quote
  --------------------------------------------------------------------- */
  function updateDateTime() {
    const now = new Date();
    el.datetime.textContent = now.toLocaleString(undefined, {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function setRandomQuote() {
    const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    el.quoteText.textContent = q;
  }

  /* ---------------------------------------------------------------------
     Theme
  --------------------------------------------------------------------- */
  function applyTheme(theme) {
    document.body.setAttribute("data-theme", theme);
    const icon = el.themeToggle.querySelector("i");
    icon.className = theme === "dark" ? "fa-solid fa-moon" : "fa-solid fa-sun";
    saveTheme(theme);
  }

  function toggleTheme() {
    const current = document.body.getAttribute("data-theme");
    applyTheme(current === "dark" ? "light" : "dark");
  }

  /* ---------------------------------------------------------------------
     Task CRUD
  --------------------------------------------------------------------- */
  function addTask() {
    const title = el.taskInput.value.trim();
    if (!title) {
      showToast("Please enter a task title", "danger");
      el.taskInput.focus();
      return;
    }

    const newTask = {
      id: uid(),
      title,
      date: el.taskDate.value || "",
      category: el.taskCategory.value,
      priority: el.taskPriority.value,
      completed: false,
      createdAt: Date.now(),
      order: tasks.length,
    };

    tasks.unshift(newTask);
    saveTasks();
    renderTasks();
    showToast("Task added", "success");

    // Reset inputs
    el.taskInput.value = "";
    el.taskDate.value = "";
    el.taskCategory.value = "Personal";
    el.taskPriority.value = "Medium";
    el.taskInput.focus();
  }

  function toggleComplete(id) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    task.completed = !task.completed;
    saveTasks();
    renderTasks();

    if (task.completed) {
      showToast("Task completed 🎉", "success");
      if (tasks.length > 0 && tasks.every((t) => t.completed)) {
        launchConfetti();
      }
    }
  }

  function openEditModal(id) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    editingTaskId = id;
    el.editTitle.value = task.title;
    el.editDate.value = task.date || "";
    el.editCategory.value = task.category;
    el.editPriority.value = task.priority;
    el.editModal.classList.add("show");
    setTimeout(() => el.editTitle.focus(), 100);
  }

  function closeEditModal() {
    el.editModal.classList.remove("show");
    editingTaskId = null;
  }

  function saveEdit() {
    const title = el.editTitle.value.trim();
    if (!title) {
      showToast("Task title can't be empty", "danger");
      return;
    }
    const task = tasks.find((t) => t.id === editingTaskId);
    if (!task) return;

    task.title = title;
    task.date = el.editDate.value || "";
    task.category = el.editCategory.value;
    task.priority = el.editPriority.value;

    saveTasks();
    renderTasks();
    closeEditModal();
    showToast("Task updated", "success");
  }

  function openDeleteModal(id) {
    taskPendingDelete = id;
    el.deleteModal.classList.add("show");
  }

  function closeDeleteModal() {
    el.deleteModal.classList.remove("show");
    taskPendingDelete = null;
  }

  function confirmDelete() {
    if (!taskPendingDelete) return;
    const cardEl = document.querySelector(`[data-id="${taskPendingDelete}"]`);
    if (cardEl) {
      cardEl.classList.add("removing");
      setTimeout(() => {
        tasks = tasks.filter((t) => t.id !== taskPendingDelete);
        saveTasks();
        renderTasks();
      }, 320);
    } else {
      tasks = tasks.filter((t) => t.id !== taskPendingDelete);
      saveTasks();
      renderTasks();
    }
    showToast("Task deleted", "danger");
    closeDeleteModal();
  }

  function clearCompleted() {
    const completedCount = tasks.filter((t) => t.completed).length;
    if (completedCount === 0) {
      showToast("No completed tasks to clear", "info");
      return;
    }
    tasks = tasks.filter((t) => !t.completed);
    saveTasks();
    renderTasks();
    showToast(`Cleared ${completedCount} completed task${completedCount > 1 ? "s" : ""}`, "success");
  }

  /* ---------------------------------------------------------------------
     Filtering / Searching / Sorting
  --------------------------------------------------------------------- */
  function getVisibleTasks() {
    let list = [...tasks];

    // Filter
    if (currentFilter === "active") list = list.filter((t) => !t.completed);
    if (currentFilter === "completed") list = list.filter((t) => t.completed);

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          t.priority.toLowerCase().includes(q)
      );
    }

    // Sort
    switch (currentSort) {
      case "date":
        list.sort((a, b) => {
          if (!a.date) return 1;
          if (!b.date) return -1;
          return new Date(a.date) - new Date(b.date);
        });
        break;
      case "priority":
        list.sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority]);
        break;
      case "alpha":
        list.sort((a, b) => a.title.localeCompare(b.title));
        break;
      default: // created / manual order
        list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }

    return list;
  }

  /* ---------------------------------------------------------------------
     Rendering
  --------------------------------------------------------------------- */
  function renderTasks() {
    const visible = getVisibleTasks();
    el.taskList.innerHTML = "";

    if (visible.length === 0) {
      el.emptyState.classList.add("show");
    } else {
      el.emptyState.classList.remove("show");
      visible.forEach((task) => el.taskList.appendChild(buildTaskCard(task)));
    }

    updateStats();
  }

  function buildTaskCard(task) {
    const li = document.createElement("li");
    li.className = `task-card${task.completed ? " completed" : ""}`;
    li.dataset.id = task.id;
    li.draggable = true;

    const overdue = isOverdue(task.date, task.completed);
    const dateHtml = task.date
      ? `<span class="badge badge-date${overdue ? " overdue" : ""}"><i class="fa-regular fa-calendar"></i> ${formatDate(task.date)}</span>`
      : "";

    li.innerHTML = `
      <span class="task-drag-handle"><i class="fa-solid fa-grip-vertical"></i></span>
      <button class="task-check${task.completed ? " checked" : ""}" aria-label="Toggle complete">
        ${task.completed ? '<i class="fa-solid fa-check"></i>' : ""}
      </button>
      <div class="task-content">
        <p class="task-title">${escapeHtml(task.title)}</p>
        <div class="task-meta">
          ${dateHtml}
          <span class="badge badge-category"><i class="fa-solid fa-tag"></i> ${escapeHtml(task.category)}</span>
          <span class="badge badge-priority ${task.priority.toLowerCase()}"><i class="fa-solid fa-flag"></i> ${task.priority}</span>
        </div>
      </div>
      <div class="task-actions">
        <button class="task-action-btn edit" aria-label="Edit task"><i class="fa-solid fa-pen"></i></button>
        <button class="task-action-btn delete" aria-label="Delete task"><i class="fa-solid fa-trash"></i></button>
      </div>
    `;

    // Event bindings
    li.querySelector(".task-check").addEventListener("click", () => toggleComplete(task.id));
    li.querySelector(".task-action-btn.edit").addEventListener("click", () => openEditModal(task.id));
    li.querySelector(".task-action-btn.delete").addEventListener("click", () => openDeleteModal(task.id));

    // Drag & drop reordering
    li.addEventListener("dragstart", () => {
      draggedTaskId = task.id;
      requestAnimationFrame(() => li.classList.add("dragging"));
    });
    li.addEventListener("dragend", () => {
      li.classList.remove("dragging");
      document.querySelectorAll(".task-card.drag-over").forEach((c) => c.classList.remove("drag-over"));
    });
    li.addEventListener("dragover", (e) => {
      e.preventDefault();
      li.classList.add("drag-over");
    });
    li.addEventListener("dragleave", () => li.classList.remove("drag-over"));
    li.addEventListener("drop", (e) => {
      e.preventDefault();
      li.classList.remove("drag-over");
      if (!draggedTaskId || draggedTaskId === task.id) return;
      reorderTasks(draggedTaskId, task.id);
    });

    return li;
  }

  function reorderTasks(draggedId, targetId) {
    // Only meaningful with manual/created sort; switch to that view
    currentSort = "created";
    el.sortSelect.value = "created";

    const draggedIdx = tasks.findIndex((t) => t.id === draggedId);
    const targetIdx = tasks.findIndex((t) => t.id === targetId);
    if (draggedIdx === -1 || targetIdx === -1) return;

    const [moved] = tasks.splice(draggedIdx, 1);
    tasks.splice(targetIdx, 0, moved);

    // Reassign order values
    tasks.forEach((t, i) => (t.order = i));

    saveTasks();
    renderTasks();
  }

  function updateStats() {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.completed).length;
    const remaining = total - completed;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

    el.progressBar.style.width = `${percent}%`;
    el.progressLabel.textContent = `${percent}% complete`;
    el.progressCount.textContent = `${completed} / ${total} tasks`;
    el.remainingCount.textContent = remaining;
    el.completedCount.textContent = completed;
  }

  /* ---------------------------------------------------------------------
     Confetti (all tasks completed celebration)
  --------------------------------------------------------------------- */
  function launchConfetti() {
    const canvas = el.confettiCanvas;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ["#6366f1", "#8b5cf6", "#22c55e", "#f59e0b", "#0ea5e9", "#ef4444"];
    const pieces = Array.from({ length: 140 }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * canvas.height * 0.5,
      size: 6 + Math.random() * 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      speedY: 2 + Math.random() * 3,
      speedX: -1.5 + Math.random() * 3,
      rotation: Math.random() * 360,
      rotSpeed: -6 + Math.random() * 12,
    }));

    let frame = 0;
    const maxFrames = 220;

    function draw() {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach((p) => {
        p.y += p.speedY;
        p.x += p.speedX;
        p.rotation += p.rotSpeed;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      });

      if (frame < maxFrames) {
        requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    draw();
    showToast("All tasks complete! Amazing work 🎊", "success");
  }

  window.addEventListener("resize", () => {
    el.confettiCanvas.width = window.innerWidth;
    el.confettiCanvas.height = window.innerHeight;
  });

  /* ---------------------------------------------------------------------
     Event Bindings
  --------------------------------------------------------------------- */
  el.addBtn.addEventListener("click", addTask);
  el.fab.addEventListener("click", () => {
    el.taskInput.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => el.taskInput.focus(), 350);
  });

  el.taskInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addTask();
  });

  el.searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value;
    renderTasks();
  });

  el.sortSelect.addEventListener("change", (e) => {
    currentSort = e.target.value;
    renderTasks();
  });

  el.filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      el.filterBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.dataset.filter;
      renderTasks();
    });
  });

  el.clearCompletedBtn.addEventListener("click", clearCompleted);
  el.themeToggle.addEventListener("click", toggleTheme);

  // Edit modal
  el.closeModalBtn.addEventListener("click", closeEditModal);
  el.cancelEditBtn.addEventListener("click", closeEditModal);
  el.saveEditBtn.addEventListener("click", saveEdit);
  el.editTitle.addEventListener("keydown", (e) => {
    if (e.key === "Enter") saveEdit();
  });
  el.editModal.addEventListener("click", (e) => {
    if (e.target === el.editModal) closeEditModal();
  });

  // Delete modal
  el.cancelDeleteBtn.addEventListener("click", closeDeleteModal);
  el.confirmDeleteBtn.addEventListener("click", confirmDelete);
  el.deleteModal.addEventListener("click", (e) => {
    if (e.target === el.deleteModal) closeDeleteModal();
  });

  // Escape key closes modals
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeEditModal();
      closeDeleteModal();
    }
  });

  /* ---------------------------------------------------------------------
     Init
  --------------------------------------------------------------------- */
  function init() {
    loadTasks();
    applyTheme(loadTheme());
    updateDateTime();
    setRandomQuote();
    renderTasks();

    setInterval(updateDateTime, 1000 * 30);

    // Hide loader once ready
    setTimeout(() => el.loader.classList.add("hidden"), 500);
  }

  init();
})();
