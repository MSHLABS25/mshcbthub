// MSH CBT HUB - ENHANCED PREMIUM JavaScript V2
// Global variables with better organization
const AppState = {
    currentUser: null,
    currentExam: null,
    examTimer: null,
    timeRemaining: 0,
    examResults: null,
    isInitialized: false
};

// ==================== LOADING SYSTEM ====================

/**
 * Initialize loading screen
 */
function initializeLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    
    // Simulate loading process
    let progress = 0;
    const loadingInterval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress >= 100) {
            clearInterval(loadingInterval);
            // Hide loading screen after everything is loaded
            setTimeout(() => {
                loadingScreen.classList.add('fade-out');
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                    // Initialize main app after loading
                    initializeMainApp();
                }, 500);
            }, 500);
        }
    }, 200);
}

/**
 * Initialize main application after loading
 */
function initializeMainApp() {
    if (AppState.isInitialized) return;
    
    console.log('🚀 MSH CBT HUB Enhanced Initializing...');
    
    // Initialize event listeners
    initializeEventListeners();
    
    // Check for existing user session
    checkUserSession();
    
    // Initialize animations
    initializeAnimations();
    
    // Update navigation
    updateNavigation();
    
    // Initialize page based on URL hash
    initializeFromURL();
    
    AppState.isInitialized = true;
    console.log('✅ MSH CBT HUB Enhanced Initialized Successfully');
}

// Subject configuration with icons
const SUBJECT_CONFIG = {
    waec: [
        { id: 'english', name: 'English Language', compulsory: true, icon: 'fa-language', color: '#4361EE' },
        { id: 'mathematics', name: 'Mathematics', compulsory: true, icon: 'fa-calculator', color: '#FF6B00' },
        { id: 'physics', name: 'Physics', compulsory: false, icon: 'fa-atom', color: '#F72585' },
        { id: 'chemistry', name: 'Chemistry', compulsory: false, icon: 'fa-flask', color: '#00A000' },
        { id: 'biology', name: 'Biology', compulsory: false, icon: 'fa-dna', color: '#7209B7' },
        { id: 'geography', name: 'Geography', compulsory: false, icon: 'fa-globe-africa', color: '#4895EF' },
        { id: 'economics', name: 'Economics', compulsory: false, icon: 'fa-chart-line', color: '#FFD166' },
        { id: 'government', name: 'Government', compulsory: false, icon: 'fa-landmark', color: '#EF476F' },
        { id: 'literature', name: 'Literature in English', compulsory: false, icon: 'fa-book', color: '#06D6A0' },
        { id: 'crs', name: 'Christian Religious Studies', compulsory: false, icon: 'fa-church', color: '#560BAD' },
        { id: 'irs', name: 'Islamic Religious Studies', compulsory: false, icon: 'fa-mosque', color: '#4895EF' }
    ],
    jamb: [
        { id: 'english', name: 'English Language', compulsory: true, icon: 'fa-language', color: '#4361EE' },
        { id: 'mathematics', name: 'Mathematics', compulsory: false, icon: 'fa-calculator', color: '#FF6B00' },
        { id: 'physics', name: 'Physics', compulsory: false, icon: 'fa-atom', color: '#F72585' },
        { id: 'chemistry', name: 'Chemistry', compulsory: false, icon: 'fa-flask', color: '#00A000' },
        { id: 'biology', name: 'Biology', compulsory: false, icon: 'fa-dna', color: '#7209B7' },
        { id: 'geography', name: 'Geography', compulsory: false, icon: 'fa-globe-africa', color: '#4895EF' },
        { id: 'economics', name: 'Economics', compulsory: false, icon: 'fa-chart-line', color: '#FFD166' },
        { id: 'government', name: 'Government', compulsory: false, icon: 'fa-landmark', color: '#EF476F' },
        { id: 'literature', name: 'Literature in English', compulsory: false, icon: 'fa-book', color: '#06D6A0' },
        { id: 'crs', name: 'Christian Religious Studies', compulsory: false, icon: 'fa-church', color: '#560BAD' },
        { id: 'irs', name: 'Islamic Religious Studies', compulsory: false, icon: 'fa-mosque', color: '#4895EF' }
    ]
};

// Performance messages based on scores
const PERFORMANCE_MESSAGES = {
    excellent: {
        range: [80, 100],
        message: "Outstanding performance!😁🏆 You're ready to ace the real exam!",
        color: "text-success",
        icon: "fas fa-trophy"
    },
    good: {
        range: [60, 79],
        message: "Great work!😃💪 With a bit more practice, you'll be excellent!",
        color: "text-warning", 
        icon: "fas fa-star"
    },
    average: {
        range: [40, 59],
        message: "Good effort! 🙂📚 Keep practicing to improve your score.",
        color: "text-info",
        icon: "fas fa-graduation-cap"
    },
    poor: {
        range: [0, 39],
        message: "Don't worry!😞🌟 Review the materials and try again. You can do it!",
        color: "text-danger",
        icon: "fas fa-redo"
    }
};

// ==================== INITIALIZATION & UTILITIES ====================

/**
 * Initialize the application when DOM is loaded
 */
function initializeApp() {
    // This is now handled by initializeLoadingScreen()
    // Keeping this function for backward compatibility
    initializeLoadingScreen();
}

/**
 * Initialize all event listeners - FIXED: Proper form attachment
 */
function initializeEventListeners() {
    // Form submissions - FIXED: Wait for DOM to be fully ready
    setTimeout(() => {
        const registerForm = document.getElementById('registerForm');
        const loginForm = document.getElementById('loginForm');
        
        if (registerForm) {
            console.log('📝 Register form found, attaching listener');
            registerForm.addEventListener('submit', handleRegistration);
        } else {
            console.log('❌ Register form NOT found');
        }
        
        if (loginForm) {
            console.log('🔑 Login form found, attaching listener');
            loginForm.addEventListener('submit', handleLogin);
        } else {
            console.log('❌ Login form NOT found');
        }
    }, 100);
    
    // Global click handlers
    document.addEventListener('click', handleGlobalClicks);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Window events
    window.addEventListener('beforeunload', handleBeforeUnload);
}

/**
 * Initialize animations and effects
 */
function initializeAnimations() {
    // Add hover effects to all interactive elements
    initializeHoverEffects();
    
    // Initialize scroll animations
    initializeScrollAnimations();
    
    // Add loading states to buttons
    initializeButtonEffects();
}

/**
 * Check if user has an active session
 */
async function checkUserSession() {
    try {
        const response = await fetch('/api/user-status');
        const data = await response.json();
        
        if (data.active && data.user_name) {
            AppState.currentUser = {
                full_name: data.user_name,
                email: data.user_email || '',
                status: data.status
            };
            showNotification(`Welcome back, ${data.user_name}!`, 'success');
        }
    } catch (error) {
        console.log('No active session found');
    }
}

// ==================== ENHANCED PAGE MANAGEMENT ====================

/**
 * Enhanced page navigation with loading states
 */
function showPage(pageName, options = {}) {
    const { forceReload = false, data = null } = options;
    
    console.log(`📄 Showing page: ${pageName}`);
    
    // Show loading state for page transitions
    showPageLoading();
    
    // Hide all pages with fade out
    document.querySelectorAll('.page-section').forEach(page => {
        if (page.classList.contains('active')) {
            page.style.opacity = '0';
            page.style.transform = 'translateY(20px)';
            setTimeout(() => {
                page.classList.remove('active');
            }, 300);
        }
    });
    
    // Show target page with fade in
    setTimeout(() => {
        const targetPage = document.getElementById(`${pageName}-page`);
        if (targetPage) {
            targetPage.classList.add('active');
            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
            
            // Page-specific initializations
            initializePage(pageName, data);
            
            // Animate in
            setTimeout(() => {
                targetPage.style.opacity = '1';
                targetPage.style.transform = 'translateY(0)';
                hidePageLoading();
            }, 50);
        } else {
            console.error(`Page not found: ${pageName}`);
            showNotification('Page not available yet!', 'warning');
            hidePageLoading();
        }
    }, 350);
    
    // Update navigation
    updateNavigation();
    
    // Update URL hash
    window.location.hash = pageName;
}

/**
 * Show page loading indicator
 */
function showPageLoading() {
    // You can add a small loading indicator here if needed
    document.body.style.cursor = 'wait';
}

/**
 * Hide page loading indicator
 */
function hidePageLoading() {
    document.body.style.cursor = 'default';
}

/**
 * Initialize page-specific functionality
 */
function initializePage(pageName, data) {
    switch (pageName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'waec-selection':
            loadWAECSubjects();
            break;
        case 'jamb-selection':
            loadJAMBSubjects();
            break;
        case 'exam-interface':
            if (AppState.currentExam) {
                initializeExamInterface();
            }
            break;
        case 'results':
            if (AppState.examResults) {
                displayResults(AppState.examResults);
            }
            break;
        case 'review':
            if (AppState.examResults) {
                displayReviewQuestions('all');
            }
            break;
    }
}

/**
 * Update navigation based on user state
 */
function updateNavigation() {
    const navLinks = document.getElementById('navLinks');
    if (!navLinks) return;
    
    if (AppState.currentUser) {
        navLinks.innerHTML = `
            <span class="nav-link text-light user-welcome">
                <i class="fas fa-user me-1"></i>Welcome, ${AppState.currentUser.full_name}
            </span>
            <a class="nav-link" href="#" onclick="showPage('dashboard')">
                <i class="fas fa-tachometer-alt me-1"></i>Dashboard
            </a>
            <a class="nav-link" href="#" onclick="handleLogout()">
                <i class="fas fa-sign-out-alt me-1"></i>Logout
            </a>
        `;
    } else {
        navLinks.innerHTML = `
            <a class="nav-link" href="#" onclick="showPage('login')">
                <i class="fas fa-sign-in-alt me-1"></i>Login
            </a>
            <a class="nav-link" href="#" onclick="showPage('register')">
                <i class="fas fa-user-plus me-1"></i>Register
            </a>
        `;
    }
}

/**
 * Initialize from URL hash
 */
function initializeFromURL() {
    const hash = window.location.hash.substring(1);
    if (hash && document.getElementById(`${hash}-page`)) {
        showPage(hash);
    }
}

// ==================== AUTHENTICATION SYSTEM ====================

/**
 * Handle user registration - FIXED: Proper form handling
 */
async function handleRegistration(e) {
    e.preventDefault();
    
    const formData = {
        full_name: document.getElementById('registerName').value.trim(),
        email: document.getElementById('registerEmail').value.trim().toLowerCase(),
        password: document.getElementById('registerPassword').value
    };
    
    // Validation
    if (!validateRegistration(formData)) return;
    
    // Show loading state
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Creating Account...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch('/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(result.message, 'success');
            // Clear form
            document.getElementById('registerForm').reset();
            // Show login page
            setTimeout(() => showPage('login'), 1500);
        } else {
            showNotification(result.message, 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showNotification('Registration failed. Please check your connection.', 'error');
    } finally {
        // Restore button
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

/**
 * Handle user login - FIXED: Proper form handling
 */
async function handleLogin(e) {
    e.preventDefault();
    
    const formData = {
        email: document.getElementById('loginEmail').value.trim().toLowerCase(),
        password: document.getElementById('loginPassword').value
    };
    
    // Validation
    if (!validateLogin(formData)) return;
    
    // Show loading state
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Signing In...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            AppState.currentUser = {
                full_name: result.user_name,
                email: formData.email,
                status: result.is_activated ? 'activated' : 'trial'
            };
            
            showNotification(result.message, 'success');
            document.getElementById('loginForm').reset();
            showPage('dashboard');
        } else {
            showNotification(result.message, 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Login failed. Please check your connection.', 'error');
    } finally {
        // Restore button
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

/**
 * Handle user logout
 */
async function handleLogout() {
    if (!confirm('Are you sure you want to logout?')) return;
    
    try {
        const response = await fetch('/logout');
        const result = await response.json();
        
        if (result.success) {
            AppState.currentUser = null;
            AppState.currentExam = null;
            AppState.examResults = null;
            
            showNotification(result.message, 'success');
            showPage('home');
        }
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Logout failed.', 'error');
    }
}

/**
 * Validate registration data
 */
function validateRegistration(data) {
    if (data.full_name.length < 2) {
        showNotification('Please enter your full name', 'warning');
        return false;
    }
    
    if (!isValidEmail(data.email)) {
        showNotification('Please enter a valid email address', 'warning');
        return false;
    }
    
    if (data.password.length < 6) {
        showNotification('Password must be at least 6 characters', 'warning');
        return false;
    }
    
    return true;
}

/**
 * Validate login data
 */
function validateLogin(data) {
    if (!isValidEmail(data.email)) {
        showNotification('Please enter a valid email address', 'warning');
        return false;
    }
    
    if (data.password.length === 0) {
        showNotification('Please enter your password', 'warning');
        return false;
    }
    
    return true;
}

/**
 * Email validation helper
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// ==================== FIXED DASHBOARD SYSTEM ====================

/**
 * Load dashboard data with proper trial status check
 */
async function loadDashboard() {
    if (!AppState.currentUser) {
        showPage('login');
        return;
    }
    
    try {
        // Check user status first
        const userStatus = await checkUserStatus();
        
        if (!userStatus.active) {
            // Show activation modal immediately if trial expired
            showNotification('Your trial has expired. Please activate your account to continue.', 'warning');
            showActivationModal();
            return;
        }
        
        if (userStatus.status === 'trial') {
            // Show dashboard with trial timer
            updateWelcomeMessage(userStatus);
            showTrialDashboard(userStatus);
        } else if (userStatus.status === 'activated') {
            // Show full activated dashboard
            updateWelcomeMessage(userStatus);
            showActivatedDashboard();
        }
        
        // Load common dashboard components
        await loadQuickStats();
        await loadRecentActivity();
        animateDashboardElements();
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showNotification('Error loading dashboard', 'error');
    }
}

/**
 * Update welcome message based on user status
 */
function updateWelcomeMessage(userStatus) {
    const welcomeMessage = document.getElementById('userGreeting');
    if (welcomeMessage) {
        if (userStatus.status === 'trial') {
            welcomeMessage.innerHTML = `Welcome to your free trial! <span class="text-teal">${userStatus.remaining_minutes} minutes remaining</span> ⏰`;
        } else if (userStatus.status === 'activated') {
            welcomeMessage.innerHTML = `Welcome back! Full access activated 🎉`;
        } else {
            welcomeMessage.innerHTML = `Welcome to MSH CBT HUB!`;
        }
    }
}

/**
 * Show trial dashboard with timer
 */
function showTrialDashboard(userStatus) {
    const accountStatus = document.getElementById('accountStatus');
    if (accountStatus) {
        accountStatus.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-clock me-2"></i>
                <strong>Free Trial Active</strong>
                <p class="mb-2">${userStatus.remaining_minutes} minutes remaining</p>
                <div class="progress" style="height: 6px;">
                    <div class="progress-bar bg-warning" style="width: ${(userStatus.remaining_minutes / 60) * 100}%"></div>
                </div>
            </div>
            <div class="d-grid">
                <button class="btn btn-primary" onclick="showActivationModal()">
                    <i class="fas fa-key me-2"></i>Activate Full Access
                </button>
            </div>
        `;
    }
}

/**
 * Show activated dashboard
 */
function showActivatedDashboard() {
    const accountStatus = document.getElementById('accountStatus');
    if (accountStatus) {
        accountStatus.innerHTML = `
            <div class="alert alert-success">
                <i class="fas fa-check-circle me-2"></i>
                <strong>Account Activated</strong>
                <p class="mb-0">Full access to all features until your subscription ends.</p>
            </div>
        `;
    }
}

/**
 * Load quick statistics
 */
async function loadQuickStats() {
    const quickStats = document.getElementById('quickStats');
    if (!quickStats) return;
    
    try {
        const response = await fetch('/api/user/stats');
        const result = await response.json();
        
        if (result.success) {
            const stats = result.stats;
            quickStats.innerHTML = `
                <div class="col-6">
                    <div class="stat-number text-teal">${stats.total_exams}</div>
                    <div class="stat-label">Tests Taken</div>
                </div>
                <div class="col-6">
                    <div class="stat-number text-teal">${stats.average_score}%</div>
                    <div class="stat-label">Average Score</div>
                </div>
            `;
        } else {
            quickStats.innerHTML = `
                <div class="col-6">
                    <div class="stat-number text-teal">0</div>
                    <div class="stat-label">Tests Taken</div>
                </div>
                <div class="col-6">
                    <div class="stat-number text-teal">0%</div>
                    <div class="stat-label">Average Score</div>
                </div>
            `;
        }
    } catch (error) {
        quickStats.innerHTML = `
            <div class="col-6">
                <div class="stat-number text-teal">0</div>
                <div class="stat-label">Tests Taken</div>
            </div>
            <div class="col-6">
                <div class="stat-number text-teal">0%</div>
                <div class="stat-label">Average Score</div>
            </div>
        `;
    }
}

/**
 * Load recent activity
 */
async function loadRecentActivity() {
    const recentActivity = document.getElementById('recentActivity');
    if (!recentActivity) return;
    
    // For now, show placeholder - will be connected to backend later
    recentActivity.innerHTML = `
        <div class="text-center py-4">
            <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
            <p class="text-muted">No recent activity yet</p>
            <button class="btn btn-teal btn-sm" onclick="startWAECSelection()">
                Start Your First Exam
            </button>
        </div>
    `;
}

/**
 * Animate dashboard elements
 */
function animateDashboardElements() {
    const actionCards = document.querySelectorAll('.action-card');
    actionCards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
        card.classList.add('fade-in');
    });
}

// ==================== SUBJECT SELECTION SYSTEM ====================

/**
 * Show WAEC selection page
 */
function showWAECSelectionPage() {
    showPage('waec-selection');
    loadWAECSubjects();
}

/**
 * Show JAMB selection page
 */
function showJAMBSelectionPage() {
    showPage('jamb-selection');
    loadJAMBSubjects();
}

/**
 * Start WAEC subject selection
 */
function startWAECSelection() {
    if (!AppState.currentUser) {
        showNotification('Please login first', 'warning');
        showPage('login');
        return;
    }
    showWAECSelectionPage();
}

/**
 * Start JAMB subject selection
 */
function startJAMBSelection() {
    if (!AppState.currentUser) {
        showNotification('Please login first', 'warning');
        showPage('login');
        return;
    }
    showJAMBSelectionPage();
}

/**
 * Load WAEC subjects with icons
 */
function loadWAECSubjects() {
    const container = document.getElementById('waecSubjectsList');
    if (!container) return;
    
    let html = `
        <div class="selection-info mb-4">
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                <strong>Note:</strong> English Language and Mathematics are compulsory. Select 7 additional subjects to make 9 total.
            </div>
        </div>
        <div class="row g-3">
    `;
    
    SUBJECT_CONFIG.waec.forEach((subject, index) => {
        html += `
            <div class="col-md-6">
                <div class="subject-selection-card ${subject.compulsory ? 'compulsory' : ''}">
                    <div class="subject-selection-header">
                        <div class="subject-icon" style="background: ${subject.color}">
                            <i class="fas ${subject.icon}"></i>
                        </div>
                        <div class="subject-info">
                            <h6 class="mb-1">${subject.name}</h6>
                            ${subject.compulsory ? 
                                '<small class="text-success"><i class="fas fa-check-circle me-1"></i>Compulsory</small>' : 
                                '<small class="text-muted">Optional</small>'
                            }
                        </div>
                    </div>
                    <div class="form-check form-switch">
                        <input class="form-check-input" type="checkbox" 
                               id="waec-${subject.id}" 
                               ${subject.compulsory ? 'checked disabled' : ''}
                               value="${subject.id}">
                        <label class="form-check-label" for="waec-${subject.id}">
                            ${subject.compulsory ? 'Required' : 'Select'}
                        </label>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += `
        </div>
        <div class="text-center mt-4">
            <button class="btn btn-primary btn-lg" onclick="startWAECExam()">
                <i class="fas fa-play me-2"></i>Start WAEC Exam
            </button>
        </div>
    `;
    
    container.innerHTML = html;
}

/**
 * Load JAMB subjects with icons
 */
function loadJAMBSubjects() {
    const container = document.getElementById('jambSubjectsList');
    if (!container) return;
    
    let html = `
        <div class="selection-info mb-4">
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                <strong>Note:</strong> English Language is compulsory. Select 3 additional subjects to make 4 total.
            </div>
        </div>
        <div class="row g-3">
    `;
    
    SUBJECT_CONFIG.jamb.forEach((subject, index) => {
        html += `
            <div class="col-md-6">
                <div class="subject-selection-card ${subject.compulsory ? 'compulsory' : ''}">
                    <div class="subject-selection-header">
                        <div class="subject-icon" style="background: ${subject.color}">
                            <i class="fas ${subject.icon}"></i>
                        </div>
                        <div class="subject-info">
                            <h6 class="mb-1">${subject.name}</h6>
                            ${subject.compulsory ? 
                                '<small class="text-success"><i class="fas fa-check-circle me-1"></i>Compulsory</small>' : 
                                '<small class="text-muted">Optional</small>'
                            }
                        </div>
                    </div>
                    <div class="form-check form-switch">
                        <input class="form-check-input jamb-subject" type="checkbox" 
                               id="jamb-${subject.id}" 
                               ${subject.compulsory ? 'checked' : ''}
                               value="${subject.id}"
                               onchange="validateJAMBSelection()">
                        <label class="form-check-label" for="jamb-${subject.id}">
                            ${subject.compulsory ? 'Required' : 'Select'}
                        </label>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += `
        </div>
        <div class="text-center mt-4">
            <button class="btn btn-primary btn-lg" onclick="startJAMBExam()" id="jambStartBtn">
                <i class="fas fa-play me-2"></i>Start JAMB Exam
            </button>
        </div>
    `;
    
    container.innerHTML = html;
    validateJAMBSelection();
}

/**
 * Validate JAMB subject selection - FIXED: Exactly 4 subjects required
 */
function validateJAMBSelection() {
    const selectedSubjects = document.querySelectorAll('.jamb-subject:checked');
    const englishCheckbox = document.getElementById('jamb-english');
    const startBtn = document.getElementById('jambStartBtn');
    
    // Ensure English is always selected
    if (!englishCheckbox.checked) {
        englishCheckbox.checked = true;
        showNotification('English Language is compulsory for JAMB', 'info');
    }
    
    // Limit to exactly 4 subjects total
    if (selectedSubjects.length > 4) {
        showNotification('You can only select exactly 4 subjects for JAMB (including English)', 'warning');
        event.target.checked = false;
        return;
    }
    
    // Enable/disable start button based on selection
    if (startBtn) {
        if (selectedSubjects.length === 4) {
            startBtn.disabled = false;
            startBtn.classList.remove('btn-secondary');
            startBtn.classList.add('btn-primary');
        } else {
            startBtn.disabled = true;
            startBtn.classList.remove('btn-primary');
            startBtn.classList.add('btn-secondary');
        }
    }
}

// ==================== EXAM SYSTEM ====================

/**
 * Start WAEC exam with selected subjects - FIXED: Validate 9 subjects
 */
async function startWAECExam() {
    const selectedSubjects = getSelectedSubjects('waec');
    
    // Validate selection - exactly 9 subjects required
    if (selectedSubjects.length !== 9) {
        showNotification(`Please select exactly 9 subjects for WAEC (currently ${selectedSubjects.length})`, 'warning');
        return;
    }
    
    await startExam('WAEC', selectedSubjects);
}

/**
 * Start JAMB exam with selected subjects - FIXED: Validate 4 subjects
 */
async function startJAMBExam() {
    const selectedSubjects = getSelectedSubjects('jamb');
    
    // Validate selection - exactly 4 subjects required
    if (selectedSubjects.length !== 4) {
        showNotification(`Please select exactly 4 subjects for JAMB (currently ${selectedSubjects.length})`, 'warning');
        return;
    }
    
    // Check if English is selected
    if (!selectedSubjects.includes('english')) {
        showNotification('English Language is compulsory for JAMB', 'warning');
        return;
    }
    
    await startExam('JAMB', selectedSubjects);
}

/**
 * Get selected subjects from checkboxes
 */
function getSelectedSubjects(examType) {
    const selectedSubjects = [];
    const prefix = examType === 'waec' ? 'waec-' : 'jamb-';
    const subjects = examType === 'waec' ? SUBJECT_CONFIG.waec : SUBJECT_CONFIG.jamb;
    
    subjects.forEach(subject => {
        const checkbox = document.getElementById(`${prefix}${subject.id}`);
        if (checkbox && checkbox.checked) {
            selectedSubjects.push(subject.id);
        }
    });
    
    return selectedSubjects;
}

/**
 * Start exam with selected subjects
 */
async function startExam(examType, selectedSubjects) {
    if (!AppState.currentUser) {
        showNotification('Please login first', 'warning');
        showPage('login');
        return;
    }

    // Check trial/activation status
    try {
        const userStatus = await checkUserStatus();
        if (!userStatus.active) {
            showNotification('Your access has expired. Please activate your account.', 'warning');
            showActivationModal();
            return;
        }
    } catch (error) {
        showNotification('Error checking account status', 'error');
        return;
    }

    // Show loading state
    showNotification('Loading exam questions...', 'info');

    // Initialize exam state
    AppState.currentExam = {
        type: examType,
        subjects: selectedSubjects,
        questions: [],
        currentQuestionIndex: 0,
        userAnswers: {},
        timeRemaining: getExamTime(examType, selectedSubjects),
        timer: null,
        startTime: new Date()
    };

    // Load questions from backend
    try {
        const response = await fetch('/api/get-questions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                exam_type: examType,
                subjects: selectedSubjects
            })
        });

        const result = await response.json();
        
        if (result.success) {
            AppState.currentExam.questions = result.questions;
            showPage('exam-interface');
            initializeExamInterface();
            startExamTimer();
            showNotification('Exam started! Good luck! 🎯', 'success');
        } else {
            showNotification('Error loading questions: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error starting exam:', error);
        showNotification('Error starting exam. Please try again.', 'error');
    }
}

/**
 * Get exam time based on type and subjects
 */
function getExamTime(examType, subjects) {
    if (subjects.includes('english')) {
        return 9000; // 2.5 hours for English
    }
    return examType === 'WAEC' ? 8400 : 7200; // WAEC: 2h20m, JAMB: 2h
}

/**
 * Initialize exam interface
 */
function initializeExamInterface() {
    if (!AppState.currentExam) return;
    
    updateQuestionDisplay();
    initializeQuestionsGrid();
    updateProgress();
    
    // Set exam info
    const examSubject = document.getElementById('examSubject');
    const examInfo = document.getElementById('examInfo');
    
    if (examSubject) {
        examSubject.innerHTML = `<i class="fas fa-book me-2"></i>${AppState.currentExam.type} ${AppState.currentExam.subjects.join(', ')}`;
    }
    
    if (examInfo) {
        examInfo.textContent = `${AppState.currentExam.questions.length} Questions • ${formatTime(AppState.currentExam.timeRemaining)}`;
    }
}

/**
 * Update question display
 */
function updateQuestionDisplay() {
    if (!AppState.currentExam) return;
    
    const question = AppState.currentExam.questions[AppState.currentExam.currentQuestionIndex];
    
    document.getElementById('currentQuestion').textContent = AppState.currentExam.currentQuestionIndex + 1;
    document.getElementById('totalQuestions').textContent = AppState.currentExam.questions.length;
    document.getElementById('questionText').textContent = question.question;
    
    // Update options
    const optionsContainer = document.getElementById('optionsContainer');
    if (optionsContainer) {
        optionsContainer.innerHTML = `
            <div class="option" data-option="A">
                <span class="option-letter">A</span>
                <span class="option-text">${question.options.A}</span>
            </div>
            <div class="option" data-option="B">
                <span class="option-letter">B</span>
                <span class="option-text">${question.options.B}</span>
            </div>
            <div class="option" data-option="C">
                <span class="option-letter">C</span>
                <span class="option-text">${question.options.C}</span>
            </div>
            <div class="option" data-option="D">
                <span class="option-letter">D</span>
                <span class="option-text">${question.options.D}</span>
            </div>
        `;
    }
    
    // Clear previous selection
    document.querySelectorAll('.option').forEach(opt => {
        opt.classList.remove('selected');
    });
    
    // Show current selection
    const userAnswer = AppState.currentExam.userAnswers[AppState.currentExam.currentQuestionIndex];
    if (userAnswer) {
        document.querySelector(`.option[data-option="${userAnswer}"]`).classList.add('selected');
    }
    
    // Handle comprehension passages
    const passageElement = document.getElementById('comprehensionPassage');
    if (question.passage) {
        document.getElementById('passageContent').textContent = question.passage;
        passageElement.style.display = 'block';
    } else {
        passageElement.style.display = 'none';
    }
    
    // Update navigation buttons
    document.getElementById('prevBtn').disabled = AppState.currentExam.currentQuestionIndex === 0;
    document.getElementById('nextBtn').disabled = AppState.currentExam.currentQuestionIndex === AppState.currentExam.questions.length - 1;
    
    // Update questions grid
    updateQuestionsGrid();
}

/**
 * Initialize questions grid for exam
 */
function initializeQuestionsGrid() {
    if (!AppState.currentExam) return;
    
    const grid = document.getElementById('questionsGrid');
    grid.innerHTML = '';
    
    for (let i = 0; i < AppState.currentExam.questions.length; i++) {
        const btn = document.createElement('button');
        btn.className = 'question-number-btn unanswered';
        btn.textContent = i + 1;
        btn.onclick = () => navigateToQuestion(i);
        
        if (i === AppState.currentExam.currentQuestionIndex) {
            btn.classList.add('current');
        }
        
        grid.appendChild(btn);
    }
}

/**
 * Update questions grid display
 */
function updateQuestionsGrid() {
    if (!AppState.currentExam) return;
    
    const buttons = document.querySelectorAll('.question-number-btn');
    
    buttons.forEach((btn, index) => {
        btn.className = 'question-number-btn';
        
        if (index === AppState.currentExam.currentQuestionIndex) {
            btn.classList.add('current');
        } else if (AppState.currentExam.userAnswers[index]) {
            btn.classList.add('answered');
        } else {
            btn.classList.add('unanswered');
        }
    });
}

/**
 * Navigate to specific question
 */
function navigateToQuestion(index) {
    if (!AppState.currentExam) return;
    
    AppState.currentExam.currentQuestionIndex = index;
    updateQuestionDisplay();
}

/**
 * Start exam timer
 */
function startExamTimer() {
    if (!AppState.currentExam) return;
    
    updateTimerDisplay();
    
    AppState.currentExam.timer = setInterval(() => {
        AppState.currentExam.timeRemaining--;
        updateTimerDisplay();
        
        if (AppState.currentExam.timeRemaining <= 0) {
            clearInterval(AppState.currentExam.timer);
            autoSubmitExam();
        }
    }, 1000);
}

/**
 * Update timer display
 */
function updateTimerDisplay() {
    if (!AppState.currentExam) return;
    
    const timerElement = document.getElementById('examTimer');
    const progressElement = document.getElementById('timerProgress');
    
    if (timerElement) {
        timerElement.textContent = formatTime(AppState.currentExam.timeRemaining);
    }
    
    if (progressElement) {
        // Update progress bar color based on time
        const totalTime = getExamTime(AppState.currentExam.type, AppState.currentExam.subjects);
        const progress = (AppState.currentExam.timeRemaining / totalTime) * 100;
        
        progressElement.style.width = `${progress}%`;
        
        if (progress < 20) {
            progressElement.className = 'progress-bar bg-danger';
        } else if (progress < 50) {
            progressElement.className = 'progress-bar bg-warning';
        } else {
            progressElement.className = 'progress-bar bg-success';
        }
    }
}

/**
 * Auto-submit when time is up
 */
function autoSubmitExam() {
    showNotification('Time is up! Your exam has been automatically submitted.', 'warning');
    submitExam();
}

/**
 * Show submit confirmation modal
 */
function showSubmitConfirmation(unanswered) {
    const modalHtml = `
        <div class="modal fade" id="submitConfirmationModal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-exclamation-triangle me-2"></i>Confirm Submission
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body text-center">
                        <i class="fas fa-question-circle fa-4x text-warning mb-3"></i>
                        <h4>You have ${unanswered} unanswered questions!</h4>
                        <p>Are you sure you want to submit your exam?</p>
                    </div>
                    <div class="modal-footer justify-content-center">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            <i class="fas fa-arrow-left me-2"></i>Continue Exam
                        </button>
                        <button type="button" class="btn btn-danger" onclick="submitExam()">
                            <i class="fas fa-paper-plane me-2"></i>Submit Anyway
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to body if not exists
    if (!document.getElementById('submitConfirmationModal')) {
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
    
    // Update unanswered count
    const unansweredElement = document.querySelector('#submitConfirmationModal h4');
    if (unansweredElement) {
        unansweredElement.textContent = `You have ${unanswered} unanswered questions!`;
    }
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('submitConfirmationModal'));
    modal.show();
}

/**
 * Submit exam to backend
 */
async function submitExam() {
    if (!AppState.currentExam) return;
    
    // Clear timer
    if (AppState.currentExam.timer) {
        clearInterval(AppState.currentExam.timer);
    }
    
    // Calculate time taken
    const timeTaken = Math.floor((new Date() - AppState.currentExam.startTime) / 1000);
    
    // Show loading
    showNotification('Submitting exam...', 'info');
    
    try {
        const response = await fetch('/api/submit-exam', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                exam_type: AppState.currentExam.type,
                subjects: AppState.currentExam.subjects,
                user_answers: AppState.currentExam.userAnswers,
                questions: AppState.currentExam.questions,
                time_taken: timeTaken
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Store results for display
            AppState.examResults = {
                score: result.score,
                totalQuestions: result.total_questions,
                percentage: result.percentage,
                timeTaken: timeTaken,
                date: new Date().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }),
                subjects: AppState.currentExam.subjects,
                examType: AppState.currentExam.type,
                userAnswers: AppState.currentExam.userAnswers,
                questions: AppState.currentExam.questions,
                subjectScores: result.subject_scores
            };
            
            showNotification('Exam submitted successfully!', 'success');
            showPage('results');
        } else {
            showNotification('Error submitting exam: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error submitting exam:', error);
        // Still show results even if backend fails
        AppState.examResults = {
            score: calculateScore(),
            totalQuestions: AppState.currentExam.questions.length,
            percentage: Math.round((calculateScore() / AppState.currentExam.questions.length) * 100),
            timeTaken: timeTaken,
            date: new Date().toLocaleDateString(),
            subjects: AppState.currentExam.subjects,
            examType: AppState.currentExam.type,
            userAnswers: AppState.currentExam.userAnswers,
            questions: AppState.currentExam.questions
        };
        showNotification('Exam submitted (offline mode)', 'warning');
        showPage('results');
    }
}

/**
 * Calculate exam score
 */
function calculateScore() {
    if (!AppState.currentExam) return 0;
    
    let correct = 0;
    
    AppState.currentExam.questions.forEach((question, index) => {
        const userAnswer = AppState.currentExam.userAnswers[index];
        if (userAnswer && userAnswer === question.correct_answer) {
            correct++;
        }
    });
    
    return correct;
}

/**
 * Update progress display
 */
function updateProgress() {
    if (!AppState.currentExam) return;
    
    const answered = Object.keys(AppState.currentExam.userAnswers).length;
    const total = AppState.currentExam.questions.length;
    const progress = (answered / total) * 100;
    
    const progressBar = document.getElementById('progressBar');
    const answeredCount = document.getElementById('answeredCount');
    const totalCount = document.getElementById('totalCount');
    
    if (progressBar) progressBar.style.width = `${progress}%`;
    if (answeredCount) answeredCount.textContent = answered;
    if (totalCount) totalCount.textContent = total;
}

// ==================== RESULTS SYSTEM FUNCTIONS ====================

/**
 * Display exam results
 */
function displayResults() {
    if (!AppState.examResults) return;
    
    // Update results display
    document.getElementById('scorePercentage').textContent = `${AppState.examResults.percentage}%`;
    document.getElementById('scoreText').textContent = `${AppState.examResults.score} out of ${AppState.examResults.totalQuestions} questions`;
    document.getElementById('timeTaken').textContent = formatTime(AppState.examResults.timeTaken);
    document.getElementById('completionDate').textContent = AppState.examResults.date;

    // Update results message based on performance
    const resultsMessage = document.getElementById('resultsMessage');
    if (AppState.examResults.percentage >= 80) {
        resultsMessage.innerHTML = 'Outstanding performance! You\'re ready to ace the real exam! 🏆';
        resultsMessage.className = 'lead text-success';
    } else if (AppState.examResults.percentage >= 60) {
        resultsMessage.innerHTML = 'Great work! With a bit more practice, you\'ll be excellent! 💪';
        resultsMessage.className = 'lead text-warning';
    } else if (AppState.examResults.percentage >= 40) {
        resultsMessage.innerHTML = 'Good effort! Keep practicing to improve your score. 📚';
        resultsMessage.className = 'lead text-info';
    } else {
        resultsMessage.innerHTML = 'Don\'t worry! Review the materials and try again. You can do it! 🌟';
        resultsMessage.className = 'lead text-danger';
    }

    // Update subject breakdown
    updateSubjectBreakdown();
}

/**
 * Update subject performance breakdown
 */
function updateSubjectBreakdown() {
    if (!AppState.examResults) return;
    
    const container = document.getElementById('subjectBreakdown');
    const subjectScores = {};
    
    // Calculate scores per subject
    AppState.examResults.questions.forEach((question, index) => {
        const subject = question.subject || 'General';
        if (!subjectScores[subject]) {
            subjectScores[subject] = { total: 0, correct: 0 };
        }
        
        subjectScores[subject].total++;
        const userAnswer = AppState.examResults.userAnswers[index];
        if (userAnswer && userAnswer === question.correct_answer) {
            subjectScores[subject].correct++;
        }
    });

    // Generate HTML for each subject
    let html = '';
    Object.keys(subjectScores).forEach(subject => {
        const score = subjectScores[subject];
        const percentage = Math.round((score.correct / score.total) * 100);
        
        html += `
            <div class="subject-performance">
                <div class="subject-name">
                    <i class="fas fa-book me-2 text-teal"></i>${subject.charAt(0).toUpperCase() + subject.slice(1)}
                </div>
                <div class="subject-progress">
                    <div class="progress" style="height: 8px;">
                        <div class="progress-bar ${getProgressBarColor(percentage)}" 
                             style="width: ${percentage}%"></div>
                    </div>
                </div>
                <div class="subject-score">
                    ${score.correct}/${score.total} (${percentage}%)
                </div>
            </div>
        `;
    });

    if (container) {
        container.innerHTML = html || '<p class="text-muted text-center">No subject data available</p>';
    }
}

/**
 * Get progress bar color based on percentage
 */
function getProgressBarColor(percentage) {
    if (percentage >= 80) return 'bg-success';
    if (percentage >= 60) return 'bg-warning';
    return 'bg-danger';
}

/**
 * Review answers
 */
function reviewAnswers() {
    if (!AppState.examResults) {
        showNotification('No exam results to review', 'warning');
        return;
    }
    showPage('review');
    displayReviewQuestions('all');
}

/**
 * Display review questions with filtering
 */
function displayReviewQuestions(filter) {
    if (!AppState.examResults) return;
    
    const container = document.getElementById('reviewQuestionsContainer');
    let html = '';

    AppState.examResults.questions.forEach((question, index) => {
        const userAnswer = AppState.examResults.userAnswers[index];
        const isCorrect = userAnswer === question.correct_answer;
        const isUnanswered = !userAnswer;

        // Apply filters
        if (filter === 'correct' && !isCorrect) return;
        if (filter === 'wrong' && (isCorrect || isUnanswered)) return;
        if (filter === 'unanswered' && !isUnanswered) return;

        let itemClass = 'review-item';
        if (isCorrect) itemClass += ' correct';
        else if (isUnanswered) itemClass += ' unanswered';
        else itemClass += ' wrong';

        html += `
            <div class="${itemClass}">
                <div class="review-question">
                    <strong>Q${index + 1}:</strong> ${question.question}
                    ${question.passage ? `<div class="text-muted small mt-2"><em>Comprehension Passage</em></div>` : ''}
                </div>

                <div class="review-options">
                    ${Object.entries(question.options).map(([option, text]) => {
                        let optionClass = 'review-option';
                        let icon = '';

                        if (option === question.correct_answer) {
                            optionClass += ' correct-answer';
                            icon = '<i class="fas fa-check-circle ms-2 text-success"></i>';
                        }

                        if (option === userAnswer) {
                            if (option === question.correct_answer) {
                                optionClass += ' user-correct';
                                icon = '<i class="fas fa-check-circle ms-2 text-success"></i>';
                            } else {
                                optionClass += ' user-wrong';
                                icon = '<i class="fas fa-times-circle ms-2 text-danger"></i>';
                            }
                        }

                        return `
                            <div class="${optionClass}">
                                <strong>${option}:</strong> ${text} ${icon}
                            </div>
                        `;
                    }).join('')}
                </div>

                ${!isUnanswered ? `
                    <div class="review-explanation">
                        <strong><i class="fas fa-lightbulb me-2 text-warning"></i>Explanation:</strong>
                        <p class="mb-0 mt-2">${question.explanation || 'No explanation available.'}</p>
                    </div>
                ` : `
                    <div class="review-explanation">
                        <strong><i class="fas fa-info-circle me-2 text-info"></i>Note:</strong>
                        <p class="mb-0 mt-2">You didn't answer this question. The correct answer is <strong>${question.correct_answer}</strong>.</p>
                    </div>
                `}
            </div>
        `;
    });

    if (container) {
        container.innerHTML = html || '<div class="text-center py-5"><p class="text-muted">No questions match the selected filter.</p></div>';
    }

    // Update filter buttons
    document.querySelectorAll('.review-filters .btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
}

/**
 * Filter review questions
 */
function filterReview(type) {
    displayReviewQuestions(type);
}

// ==================== NOTIFICATION SYSTEM ====================

/**
 * Show notification to user
 */
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.custom-notification');
    existingNotifications.forEach(notification => {
        notification.remove();
    });
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    
    const notification = document.createElement('div');
    notification.className = `custom-notification alert-${type} fade-in`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="${icons[type]} me-2"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Format time from seconds to HH:MM:SS
 */
function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Check user status from server
 */
async function checkUserStatus() {
    try {
        const response = await fetch('/api/user-status');
        return await response.json();
    } catch (error) {
        return { active: false };
    }
}

// ==================== ACTIVATION SYSTEM ====================

/**
 * Show activation modal
 */
function showActivationModal() {
    const modal = new bootstrap.Modal(document.getElementById('activationModal'));
    modal.show();
}

/**
 * Activate account with code - FIXED: Enhanced format validation
 */
async function activateAccount() {
    const code = document.getElementById('activationCode')?.value.trim();
    
    if (!code) {
        showNotification('Please enter an activation code.', 'warning');
        return;
    }
    
    // Validate code format - ENHANCED: MSH-XXXX-XXXX
    const codeRegex = /^MSH-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    if (!codeRegex.test(code)) {
        showNotification('Invalid activation code format. Format should be MSH-XXXX-XXXX (e.g., MSH-KDUK-5273)', 'warning');
        return;
    }
    
    try {
        const response = await fetch('/activate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                code: code
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(result.message, 'success');
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('activationModal'));
            modal.hide();
            // Reload dashboard
            loadDashboard();
            // Update session
            AppState.currentUser.status = 'activated';
        } else {
            showNotification(result.message, 'error');
        }
    } catch (error) {
        showNotification('Activation failed. Please try again.', 'error');
    }
}

// ==================== EVENT HANDLERS ====================

/**
 * Handle global click events
 */
function handleGlobalClicks(e) {
    // Option selection in exam
    if (e.target.closest('.option')) {
        const option = e.target.closest('.option');
        const selectedAnswer = option.dataset.option;
        
        if (!AppState.currentExam) return;
        
        // Clear other selections
        document.querySelectorAll('.option').forEach(opt => {
            opt.classList.remove('selected');
        });
        
        // Select current option
        option.classList.add('selected');
        
        // Save answer
        AppState.currentExam.userAnswers[AppState.currentExam.currentQuestionIndex] = selectedAnswer;
        
        // Update progress
        updateProgress();
        updateQuestionsGrid();
    }
    
    // Next question button
    if (e.target.id === 'nextBtn' || e.target.closest('#nextBtn')) {
        if (AppState.currentExam && AppState.currentExam.currentQuestionIndex < AppState.currentExam.questions.length - 1) {
            AppState.currentExam.currentQuestionIndex++;
            updateQuestionDisplay();
        }
    }
    
    // Previous question button
    if (e.target.id === 'prevBtn' || e.target.closest('#prevBtn')) {
        if (AppState.currentExam && AppState.currentExam.currentQuestionIndex > 0) {
            AppState.currentExam.currentQuestionIndex--;
            updateQuestionDisplay();
        }
    }
    
    // Submit exam button
    if (e.target.id === 'submitExamBtn' || e.target.closest('#submitExamBtn')) {
        if (!AppState.currentExam) return;
        
        const unanswered = AppState.currentExam.questions.length - Object.keys(AppState.currentExam.userAnswers).length;
        
        if (unanswered > 0) {
            showSubmitConfirmation(unanswered);
        } else {
            submitExam();
        }
    }
    
    // Calculator button
    if (e.target.id === 'calculatorBtn' || e.target.closest('#calculatorBtn')) {
        const modal = new bootstrap.Modal(document.getElementById('calculatorModal'));
        modal.show();
    }
}

/**
 * Handle keyboard shortcuts
 */
function handleKeyboardShortcuts(e) {
    // Only handle shortcuts when not in input fields
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    switch(e.key) {
        case '1':
        case '2':
        case '3':
        case '4':
            // Select options A, B, C, D in exam
            if (AppState.currentExam && document.getElementById('exam-interface-page').classList.contains('active')) {
                const option = document.querySelector(`.option[data-option="${e.key}"]`);
                if (option) option.click();
            }
            break;
        case 'ArrowRight':
            // Next question
            if (AppState.currentExam) document.getElementById('nextBtn').click();
            break;
        case 'ArrowLeft':
            // Previous question
            if (AppState.currentExam) document.getElementById('prevBtn').click();
            break;
        case 'Escape':
            // Close modals
            const openModal = document.querySelector('.modal.show');
            if (openModal) {
                bootstrap.Modal.getInstance(openModal).hide();
            }
            break;
    }
}

/**
 * Handle beforeunload event
 */
function handleBeforeUnload(e) {
    if (AppState.currentExam) {
        e.preventDefault();
        e.returnValue = 'You have an ongoing exam. Are you sure you want to leave?';
        return e.returnValue;
    }
}

// ==================== ANIMATION HELPERS ====================

/**
 * Initialize hover effects
 */
function initializeHoverEffects() {
    // Add hover effects to cards
    const cards = document.querySelectorAll('.cbt-card, .feature-card, .subject-item');
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
        });
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
    
    // Add fast button click effects
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 150);
        });
    });
}

/**
 * Initialize scroll animations
 */
function initializeScrollAnimations() {
    // Add intersection observer for scroll animations
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
            }
        });
    }, { threshold: 0.1 });
    
    // Observe all elements with fade-in class
    document.querySelectorAll('.fade-in').forEach(el => {
        observer.observe(el);
    });
}

/**
 * Initialize button effects
 */
function initializeButtonEffects() {
    // Add loading states to forms
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            const submitBtn = this.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.classList.add('loading');
            }
        });
    });
}

// ==================== SHARING FUNCTIONS ====================

/**
 * Share results
 */
function shareResults() {
    if (!AppState.examResults) {
        showNotification('No results to share', 'warning');
        return;
    }
    const modal = new bootstrap.Modal(document.getElementById('shareModal'));
    modal.show();
}

/**
 * Share on WhatsApp
 */
function shareOnWhatsApp() {
    if (!AppState.examResults) return;
    
    const message = `I just scored ${AppState.examResults.percentage}% on my ${AppState.examResults.examType} practice test on MSH CBT HUB! 🎉 Test your knowledge too!`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}

/**
 * Copy results link
 */
function copyResultsLink() {
    const tempInput = document.createElement('input');
    tempInput.value = window.location.href;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);
    
    showNotification('Results link copied to clipboard!', 'success');
}

/**
 * Download results as text file
 */
function downloadResults() {
    if (!AppState.examResults) return;
    
    // Create a simple text report
    const report = `
MSH CBT HUB - Exam Results
==========================

Exam Type: ${AppState.examResults.examType}
Subjects: ${AppState.examResults.subjects.join(', ')}
Score: ${AppState.examResults.score}/${AppState.examResults.totalQuestions} (${AppState.examResults.percentage}%)
Time Taken: ${formatTime(AppState.examResults.timeTaken)}
Date: ${AppState.examResults.date}

Performance Summary:
${Object.keys(AppState.examResults.subjectScores || {}).map(subject => {
    const score = AppState.examResults.subjectScores[subject];
    return `- ${subject}: ${score.correct}/${score.total} (${Math.round((score.correct/score.total)*100)}%)`;
}).join('\n')}

Keep practicing and improving! 🚀
    `.trim();

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `msh-cbt-results-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('Results downloaded!', 'success');
}

/**
 * Retake exam
 */
function retakeExam() {
    if (!AppState.examResults) return;
    
    if (confirm('Start a new exam with different questions?')) {
        startExam(AppState.examResults.examType, AppState.examResults.subjects);
    }
}

/**
 * Show study materials
 */
function showStudyMaterials() {
    showNotification('Study materials feature coming soon!', 'info');
}

// ==================== CALCULATOR FUNCTIONS ====================

let calculatorValue = '';

/**
 * Input to calculator
 */
function calcInput(value) {
    calculatorValue += value;
    const display = document.getElementById('calcDisplay');
    if (display) {
        display.value = calculatorValue;
    }
}

/**
 * Clear calculator
 */
function clearCalc() {
    calculatorValue = '';
    const display = document.getElementById('calcDisplay');
    if (display) {
        display.value = '';
    }
}

/**
 * Calculate expression
 */
function calculate() {
    try {
        // Replace ^ with ** for exponentiation
        const expression = calculatorValue.replace(/\^/g, '**');
        const result = eval(expression);
        calculatorValue = result.toString();
        const display = document.getElementById('calcDisplay');
        if (display) {
            display.value = calculatorValue;
        }
    } catch (error) {
        const display = document.getElementById('calcDisplay');
        if (display) {
            display.value = 'Error';
        }
        calculatorValue = '';
    }
}

// ==================== ENHANCED UTILITY FUNCTIONS ====================

/**
 * Animate counter from start to end value
 */
function animateCounter(elementId, start, end, duration) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const value = Math.floor(progress * (end - start) + start);
        element.textContent = end === 75 ? `${value}%` : value;
        
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    
    window.requestAnimationFrame(step);
}

// ==================== INITIALIZATION ====================

/**
 * Start the application with loading screen
 */
document.addEventListener('DOMContentLoaded', function() {
    // Start with loading screen
    initializeLoadingScreen();
    
    // Initialize navigation
    updateNavigation();
    
    // Add animation delays for elements
    const animatedElements = document.querySelectorAll('.fade-in');
    animatedElements.forEach((element, index) => {
        element.style.animationDelay = `${index * 0.1}s`;
    });
});

// Export for global access
window.MSH_CBT_HUB = {
    AppState,
    showPage,
    showNotification,
    startWAECSelection,
    startJAMBSelection,
    loadDashboard
};

console.log('📚 MSH CBT HUB Enhanced JavaScript V2 Loaded');