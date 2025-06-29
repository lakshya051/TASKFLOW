
// ============================
// LANDING PAGE - INDEX.JS
// ============================

document.addEventListener("DOMContentLoaded", () => {
  // Initialize elements
  const form = document.getElementById("user-form");
  const nameInput = document.getElementById("name");
  const dobInput = document.getElementById("dob");
  const submitBtn = document.getElementById("submit-btn");
  const errorMessage = document.getElementById("error-message");
  const successMessage = document.getElementById("success-message");
  
  // Error display elements
  const nameError = document.getElementById("name-error");
  const dobError = document.getElementById("dob-error");

  // Set max date for DOB input (today's date)
  const today = new Date();
  dobInput.max = today.toISOString().split('T')[0];

  // Check if user already exists and redirect
  checkExistingUser();

  // Form validation functions
  function showError(element, message) {
    element.textContent = message;
    element.style.display = 'block';
  }

  function hideError(element) {
    element.textContent = '';
    element.style.display = 'none';
  }

  function showMessage(element, message, isError = false) {
    element.textContent = message;
    element.style.display = 'block';
    element.className = isError ? 'error-message' : 'success-message';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      element.style.display = 'none';
    }, 5000);
  }

  function validateName(name) {
    if (!name || name.length < 2) {
      showError(nameError, "Name must be at least 2 characters long");
      return false;
    }
    if (name.length > 50) {
      showError(nameError, "Name must be less than 50 characters");
      return false;
    }
    if (!/^[a-zA-Z\s]+$/.test(name)) {
      showError(nameError, "Name can only contain letters and spaces");
      return false;
    }
    hideError(nameError);
    return true;
  }

  function validateAge(dobString) {
    if (!dobString) {
      showError(dobError, "Please select your date of birth");
      return false;
    }

    const dob = new Date(dobString);
    const today = new Date();
    
    // Check if date is valid
    if (isNaN(dob.getTime())) {
      showError(dobError, "Please enter a valid date");
      return false;
    }

    // Check if date is not in the future
    if (dob > today) {
      showError(dobError, "Date of birth cannot be in the future");
      return false;
    }

    // Calculate age more accurately
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    const dayDiff = today.getDate() - dob.getDate();

    // Adjust age if birthday hasn't occurred this year
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      age--;
    }

    // Check minimum age requirement (must be over 10, not 10 or younger)
    if (age <= 10) {
      showError(dobError, "You must be older than 10 years to use TaskFlow");
      return false;
    }

    // Check maximum reasonable age
    if (age > 120) {
      showError(dobError, "Please enter a valid date of birth");
      return false;
    }

    hideError(dobError);
    return true;
  }

  function checkExistingUser() {
    try {
      const existingUser = localStorage.getItem("user");
      if (existingUser) {
        const userData = JSON.parse(existingUser);
        // Validate that the stored data is complete
        if (userData.name && userData.dob) {
          showMessage(successMessage, "Welcome back! Redirecting to your tasks...");
          setTimeout(() => {
            window.location.href = "app.html";
          }, 1500);
        } else {
          // Clear invalid data
          localStorage.removeItem("user");
        }
      }
    } catch (error) {
      console.error("Error checking existing user:", error);
      localStorage.removeItem("user");
    }
  }

  // Real-time validation
  nameInput.addEventListener("input", () => {
    const name = nameInput.value.trim();
    if (name.length > 0) {
      validateName(name);
    } else {
      hideError(nameError);
    }
  });

  dobInput.addEventListener("change", () => {
    const dob = dobInput.value;
    if (dob) {
      validateAge(dob);
    } else {
      hideError(dobError);
    }
  });

  // Form submission
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    // Clear previous messages
    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';

    // Get form values
    const name = nameInput.value.trim();
    const dobString = dobInput.value;

    // Validate all fields
    const isNameValid = validateName(name);
    const isAgeValid = validateAge(dobString);

    if (!isNameValid || !isAgeValid) {
      showMessage(errorMessage, "Please fix the errors above before continuing", true);
      return;
    }

    // Show loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <span class="btn-text">Creating your profile...</span>
      <span class="btn-icon">⏳</span>
    `;

    try {
      // Create user data object
  const userData = {
    id: Date.now().toString(36),  // new line for unique ID
    name: name,
    dob: dobString,
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString()
  };


      // Save to localStorage
      localStorage.setItem("user", JSON.stringify(userData));

      // Show success message
      showMessage(successMessage, `Welcome to TaskFlow, ${name}! Setting up your workspace...`);

      // Redirect after a short delay
      setTimeout(() => {
        window.location.href = "app.html";
      }, 2000);

    } catch (error) {
      console.error("Error saving user data:", error);
      showMessage(errorMessage, "There was an error creating your profile. Please try again.", true);
      
      // Reset button state
      submitBtn.disabled = false;
      submitBtn.innerHTML = `
        <span class="btn-text">Enter TaskFlow</span>
        <span class="btn-icon">→</span>
      `;
    }
  });

  // Handle browser back/forward buttons
  window.addEventListener("popstate", () => {
    checkExistingUser();
  });

  // Add keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    // Submit form with Ctrl/Cmd + Enter
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      form.dispatchEvent(new Event("submit"));
    }
  });

  // Add some visual feedback
  nameInput.addEventListener("focus", () => {
    nameInput.parentElement.classList.add("focused");
  });

  nameInput.addEventListener("blur", () => {
    nameInput.parentElement.classList.remove("focused");
  });

  dobInput.addEventListener("focus", () => {
    dobInput.parentElement.classList.add("focused");
  });

  dobInput.addEventListener("blur", () => {
    dobInput.parentElement.classList.remove("focused");
  });
});

// Utility function to format date for display
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Error handling for any uncaught errors
window.addEventListener("error", (e) => {
  console.error("Uncaught error:", e.error);
  const errorElement = document.getElementById("error-message");
  if (errorElement) {
    errorElement.textContent = "An unexpected error occurred. Please refresh the page and try again.";
    errorElement.style.display = "block";
  }
});