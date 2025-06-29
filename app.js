

// ============================
// MAIN TODO APP - APP.JS
// ============================

document.addEventListener("DOMContentLoaded", async () => {
  // Check authentication
  const user = checkAuthentication();
  if (!user) return;

  // Initialize app state
  let tasks = {
    todo: [],
    completed: [],
    archived: []
  };

  let isLoading = false;

  // Get DOM elements
  const elements = {
    username: document.getElementById("username"),
    avatar: document.getElementById("user-avatar"),
    signoutBtn: document.getElementById("signout-btn"),
    taskInput: document.getElementById("new-task-input"),
    addTaskBtn: document.getElementById("add-task-btn"),
    taskInputError: document.getElementById("task-input-error"),
    loadingOverlay: document.getElementById("loading-overlay"),
    
    // Stage elements
    todoList: document.getElementById("todo-list"),
    completedList: document.getElementById("completed-list"),
    archivedList: document.getElementById("archived-list"),
    todoCount: document.getElementById("todo-count"),
    completedCount: document.getElementById("completed-count"),
    archivedCount: document.getElementById("archived-count")
  };

  // Initialize the app
  await initializeApp();

  // ============================
  // AUTHENTICATION & INITIALIZATION
  // ============================

  function checkAuthentication() {
    try {
      const userData = localStorage.getItem("user");
      if (!userData) {
        redirectToLanding();
        return null;
      }

      const user = JSON.parse(userData);
      if (!user.name || !user.dob) {
        redirectToLanding();
        return null;
      }

      return user;
    } catch (error) {
      console.error("Error checking authentication:", error);
      redirectToLanding();
      return null;
    }
  }

  function redirectToLanding() {
    window.location.href = "index.html";
  }

  async function initializeApp() {
    try {
      // Show loading
      showLoading("Setting up your workspace...");

      // Setup user profile
      setupUserProfile(user);

      // Load tasks
      await loadTasks();

      // Setup event listeners
      setupEventListeners();

      // Hide loading
      hideLoading();

      // Show welcome message for new users
      showWelcomeMessage();

    } catch (error) {
      console.error("Error initializing app:", error);
      hideLoading();
      showError("Failed to load your tasks. Please refresh the page.");
    }
  }

  function setupUserProfile(user) {
    // Set username
    elements.username.textContent = user.name;

    // Set avatar using UI Avatars API
    const avatarUrl = `https://ui-avatars.com/api/?background=0D8ABC&color=fff&name=${encodeURIComponent(user.name)}&size=100&font-size=0.33`;
    elements.avatar.src = avatarUrl;
    elements.avatar.alt = `${user.name}'s Avatar`;

    // Update last login
    updateLastLogin();
  }

  function updateLastLogin() {
    try {
      const userData = JSON.parse(localStorage.getItem("user"));
      userData.lastLogin = new Date().toISOString();
      localStorage.setItem("user", JSON.stringify(userData));
    } catch (error) {
      console.error("Error updating last login:", error);
    }
  }

  // ============================
  // TASK MANAGEMENT
  // ============================

  async function loadTasks() {
    try {
      const savedTasks = localStorage.getItem(`tasks_${user.name}`);

      if (savedTasks) {
        // Load existing tasks
        tasks = JSON.parse(savedTasks);
      } else {
        // First time user - load dummy data
        await loadDummyTasks();
      }

      renderAllTasks();
    } catch (error) {
      console.error("Error loading tasks:", error);
      showError("Failed to load tasks");
    }
  }

  async function loadDummyTasks() {
    try {
      showLoading("Loading your initial tasks...");
      
      const response = await fetch("https://dummyjson.com/todos");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Transform API data to our task format (ignore completed status as per requirements)
      tasks.todo = data.todos.slice(0, 8).map(item => ({
        id: generateTaskId(),
        text: item.todo,
        created: new Date().toISOString(),
        updated: new Date().toISOString()
      }));

      // Save to localStorage
      saveTasks();
      
    } catch (error) {
      console.error("Error loading dummy tasks:", error);
      // Fallback to default tasks if API fails
      tasks.todo = [
        {
          id: generateTaskId(),
          text: "Welcome to TaskFlow! This is your first task.",
          created: new Date().toISOString(),
          updated: new Date().toISOString()
        },
        {
          id: generateTaskId(),
          text: "Try moving tasks between different stages",
          created: new Date().toISOString(),
          updated: new Date().toISOString()
        }
      ];
      saveTasks();
    }
  }

function saveTasks() {
  try {
    localStorage.setItem(`tasks_${user.name}`, JSON.stringify(tasks));
  } catch (error) {
    console.error("Error saving tasks:", error);
    showError("Failed to save tasks");
  }
}



  function generateTaskId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  function addTask() {
    const taskText = elements.taskInput.value.trim();
    
    // Validate input
    if (!taskText) {
      showInputError("Please enter a task description");
      elements.taskInput.focus();
      return;
    }

    if (taskText.length > 200) {
      showInputError("Task description must be less than 200 characters");
      return;
    }

    // Create new task
    const newTask = {
      id: generateTaskId(),
      text: taskText,
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    };

    // Add to todo stage
    tasks.todo.unshift(newTask); // Add to beginning for better UX

    // Clear input
    elements.taskInput.value = "";
    hideInputError();

    // Save and render
    saveTasks();
    renderAllTasks();

    // Show success feedback
    showTaskAddedFeedback();
  }

  function moveTask(fromStage, taskId, toStage) {
    try {
      // Find and remove task from source stage
      const taskIndex = tasks[fromStage].findIndex(task => task.id === taskId);
      if (taskIndex === -1) {
        console.error("Task not found:", taskId);
        return;
      }

      const task = tasks[fromStage].splice(taskIndex, 1)[0];
      
      // Update timestamp
      task.updated = new Date().toISOString();
      
      // Add to destination stage
      tasks[toStage].unshift(task); // Add to beginning

      // Save and render
      saveTasks();
      renderAllTasks();

      // Show feedback
      showTaskMovedFeedback(task.text, toStage);

    } catch (error) {
      console.error("Error moving task:", error);
      showError("Failed to move task");
    }
  }

  function renderAllTasks() {
    renderTaskStage("todo", elements.todoList, elements.todoCount);
    renderTaskStage("completed", elements.completedList, elements.completedCount);
    renderTaskStage("archived", elements.archivedList, elements.archivedCount);
  }

  function renderTaskStage(stage, container, countElement) {
    // Update count
    countElement.textContent = `(${tasks[stage].length})`;

    // Clear container
    container.innerHTML = "";

    // Handle empty state
    if (tasks[stage].length === 0) {
      container.innerHTML = `<div class="empty-state">${getEmptyStateMessage(stage)}</div>`;
      return;
    }

    // Render tasks
    tasks[stage].forEach(task => {
      const taskCard = createTaskCard(task, stage);
      container.appendChild(taskCard);
    });
  }

  function createTaskCard(task, stage) {
    const card = document.createElement("div");
    card.className = "task-card fade-in";
    card.dataset.taskId = task.id;

    card.innerHTML = `
      <div class="task-content">
        <div class="task-title">${escapeHtml(task.text)}</div>
        <div class="task-timestamp">Last modified: ${formatTimestamp(task.updated)}</div>
      </div>
      <div class="task-actions">
        ${getTaskButtons(stage, task.id)}
      </div>
    `;

    return card;
  }

  function getTaskButtons(stage, taskId) {
    const buttons = [];

    if (stage === "todo") {
      buttons.push(`<button class="task-btn complete" onclick="moveTask('todo', '${taskId}', 'completed')">✓ Mark Complete</button>`);
      buttons.push(`<button class="task-btn archive" onclick="moveTask('todo', '${taskId}', 'archived')">📦 Archive</button>`);
    } else if (stage === "completed") {
      buttons.push(`<button class="task-btn" onclick="moveTask('completed', '${taskId}', 'todo')">↩ Move to Todo</button>`);
      buttons.push(`<button class="task-btn archive" onclick="moveTask('completed', '${taskId}', 'archived')">📦 Archive</button>`);
    } else if (stage === "archived") {
      buttons.push(`<button class="task-btn" onclick="moveTask('archived', '${taskId}', 'todo')">↩ Move to Todo</button>`);
      buttons.push(`<button class="task-btn complete" onclick="moveTask('archived', '${taskId}', 'completed')">✓ Move to Completed</button>`);
    }

    return buttons.join("");
  }

  function getEmptyStateMessage(stage) {
    const messages = {
      todo: "No tasks yet. Add your first task above! 📝",
      completed: "No completed tasks yet. Mark some tasks as complete! ✅",
      archived: "No archived tasks yet. Archive completed tasks to keep them for reference! 📦"
    };
    return messages[stage] || "No tasks in this stage";
  }

  // ============================
  // EVENT LISTENERS
  // ============================

  function setupEventListeners() {
    // Add task button
    elements.addTaskBtn.addEventListener("click", addTask);

    // Add task on Enter key
    elements.taskInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addTask();
      }
    });

    // Clear input error on typing
    elements.taskInput.addEventListener("input", () => {
      if (elements.taskInputError.style.display !== "none") {
        hideInputError();
      }
    });

    // Sign out button
    elements.signoutBtn.addEventListener("click", handleSignOut);

    // Keyboard shortcuts
    document.addEventListener("keydown", handleKeyboardShortcuts);
  }

  function handleSignOut() {
    if (confirm("Are you sure you want to sign out? Your tasks will be saved.")) {
      try {
        // Clear user data but keep tasks
        localStorage.removeItem("user");
        
        // Redirect to landing page
        window.location.href = "index.html";
      } catch (error) {
        console.error("Error during sign out:", error);
        showError("Error signing out. Please try again.");
      }
    }
  }

  function handleKeyboardShortcuts(e) {
    // Ctrl/Cmd + N: Focus on new task input
    if ((e.ctrlKey || e.metaKey) && e.key === "n") {
      e.preventDefault();
      elements.taskInput.focus();
    }

    // Escape: Clear input
    if (e.key === "Escape") {
      elements.taskInput.value = "";
      elements.taskInput.blur();
      hideInputError();
    }
  }

  // ============================
  // GLOBAL FUNCTIONS (for onclick handlers)
  // ============================

  // Make moveTask available globally for onclick handlers
  window.moveTask = moveTask;

  // ============================
  // UI FEEDBACK FUNCTIONS
  // ============================

  function showLoading(message = "Loading...") {
    isLoading = true;
    elements.loadingOverlay.querySelector("p").textContent = message;
    elements.loadingOverlay.style.display = "flex";
  }

  function hideLoading() {
    isLoading = false;
    elements.loadingOverlay.style.display = "none";
  }

  function showInputError(message) {
    elements.taskInputError.textContent = message;
    elements.taskInputError.style.display = "block";
    elements.taskInput.style.borderColor = "#e74c3c";
  }

  function hideInputError() {
    elements.taskInputError.style.display = "none";
    elements.taskInput.style.borderColor = "";
  }

  function showError(message) {
    // You could implement a toast notification system here
    console.error(message);
    alert(message); // Simple fallback
  }

  function showTaskAddedFeedback() {
    // Simple visual feedback - you could enhance this with animations
    elements.addTaskBtn.style.background = "#28a745";
    elements.addTaskBtn.querySelector(".add-text").textContent = "Added!";
    
    setTimeout(() => {
      elements.addTaskBtn.style.background = "";
      elements.addTaskBtn.querySelector(".add-text").textContent = "Add Task";
    }, 1500);
  }

  function showTaskMovedFeedback(taskText, toStage) {
    const stageNames = {
      todo: "Todo",
      completed: "Completed",
      archived: "Archived"
    };
    
    console.log(`Moved "${taskText}" to ${stageNames[toStage]}`);
    // You could implement toast notifications here
  }

  function showWelcomeMessage() {
    // Check if this is a new user (no tasks saved previously)
    const hasExistingTasks = localStorage.getItem(`tasks_${user.name}`);
    if (!hasExistingTasks) {
      // You could show a welcome modal or tooltip here
      console.log(`Welcome to TaskFlow, ${user.name}!`);
    }
  }

  // ============================
  // UTILITY FUNCTIONS
  // ============================

  function formatTimestamp(isoString) {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ============================
  // ERROR HANDLING
  // ============================

  window.addEventListener("error", (e) => {
    console.error("Uncaught error:", e.error);
    if (!isLoading) {
      showError("An unexpected error occurred. Please refresh the page.");
    }
  });

  window.addEventListener("unhandledrejection", (e) => {
    console.error("Unhandled promise rejection:", e.reason);
    if (!isLoading) {
      showError("An unexpected error occurred. Please refresh the page.");
    }
  });

  // ============================
  // PAGE VISIBILITY HANDLING
  // ============================

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      // Page became visible - refresh data if needed
      const lastLogin = JSON.parse(localStorage.getItem("user"))?.lastLogin;
      const timeSinceLastLogin = Date.now() - new Date(lastLogin).getTime();
      
      // If it's been more than 1 hour, refresh tasks
      if (timeSinceLastLogin > 3600000) {
        updateLastLogin();
        // Optionally reload tasks from API
      }
    }
  });
});