// MSH CBT HUB - ENHANCED PREMIUM JavaScript V5
// Global variables with better organization
const AppState = {
    currentUser: null,
    currentExam: null,
    examTimer: null,
    trialTimer: null,
    timeRemaining: 0,
    trialTimeRemaining: 0,
    trialElapsedSeconds: 0,
    examResults: null,
    isInitialized: false,
    // V5: LocalStorage keys
    localStorageKeys: {
        USER_DATA: 'msh_cbt_user_data',
        EXAM_RESULTS: 'msh_cbt_exam_results',
        RECENT_ACTIVITY: 'msh_cbt_recent_activity',
        TRIAL_TIMER: 'msh_cbt_trial_timer',
        LAST_SYNC: 'msh_cbt_last_sync',
        BROWSER_DATA: 'msh_cbt_browser_data'
    },
    // V5: Trial timer state
    trialTimerState: {
        startTime: null,
        elapsedSeconds: 0,
        lastUpdate: null,
        isRunning: false
    }
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
    
    console.log('🚀 MSH CBT HUB Enhanced V5 Initializing...');
    
    // V5: Load data from localStorage first
    loadFromLocalStorage();
    
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
    
    // V5: Start trial timer with offline support
    startOfflineTrialTimer();
    
    // V5: Setup periodic sync to server
    setupBrowserDataSync();
    
    AppState.isInitialized = true;
    console.log('✅ MSH CBT HUB Enhanced V5 Initialized Successfully');
}

// Subject configuration with icons - UPDATED FOR V5
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

// Enhanced Performance messages for V5
const PERFORMANCE_MESSAGES = {
    excellent: {
        range: [80, 100],
        message: "Outstanding performance! 😁🏆 You're ready to ace the real exam!",
        submessage: "Your dedication and hard work have paid off remarkably well!",
        color: "performance-excellent",
        icon: "fas fa-trophy",
        badge: "Champion Level"
    },
    good: {
        range: [60, 79],
        message: "Great work! 😃💪 With a bit more practice, you'll be excellent!",
        submessage: "You're on the right track to outstanding performance!",
        color: "performance-good", 
        icon: "fas fa-star",
        badge: "Great Achiever"
    },
    average: {
        range: [40, 59],
        message: "Good effort! 🙂📚 Keep practicing to improve your score.",
        submessage: "Consistent practice will help you reach greater heights!",
        color: "performance-average",
        icon: "fas fa-graduation-cap",
        badge: "Solid Foundation"
    },
    poor: {
        range: [0, 39],
        message: "Don't worry! 😞🌟 Review the materials and try again. You can do it!",
        submessage: "Every expert was once a beginner. Keep learning and growing!",
        color: "performance-poor",
        icon: "fas fa-redo",
        badge: "Learning Journey"
    }
};

// ==================== LOCALSTORAGE FUNCTIONS - V5 NEW ====================

/**
 * V5: Save data to localStorage
 */
function saveToLocalStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        console.log(`💾 Saved to localStorage: ${key}`);
        return true;
    } catch (error) {
        console.error(`Error saving to localStorage (${key}):`, error);
        return false;
    }
}

/**
 * V5: Load data from localStorage
 */
function loadFromLocalStorage(key = null) {
    try {
        if (key) {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } else {
            // Load all application data
            const userData = loadFromLocalStorage(AppState.localStorageKeys.USER_DATA);
            const examResults = loadFromLocalStorage(AppState.localStorageKeys.EXAM_RESULTS);
            const recentActivity = loadFromLocalStorage(AppState.localStorageKeys.RECENT_ACTIVITY);
            const trialTimer = loadFromLocalStorage(AppState.localStorageKeys.TRIAL_TIMER);
            const browserData = loadFromLocalStorage(AppState.localStorageKeys.BROWSER_DATA);
            
            // Update AppState with loaded data
            if (userData) {
                AppState.currentUser = userData;
            }
            if (examResults) {
                AppState.examResults = examResults;
            }
            if (trialTimer) {
                AppState.trialTimerState = trialTimer;
                AppState.trialElapsedSeconds = trialTimer.elapsedSeconds || 0;
            }
            
            return {
                userData,
                examResults,
                recentActivity,
                trialTimer,
                browserData
            };
        }
    } catch (error) {
        console.error(`Error loading from localStorage (${key}):`, error);
        return null;
    }
}

/**
 * V5: Save user data to localStorage
 */
function saveUserDataToStorage(userData) {
    if (!userData) return;
    
    const storageData = {
        ...userData,
        lastSaved: new Date().toISOString()
    };
    
    saveToLocalStorage(AppState.localStorageKeys.USER_DATA, storageData);
    
    // Also save to browser data for sync
    saveBrowserData('user_data', storageData);
}

/**
 * V5: Save exam results to localStorage
 */
function saveExamResultsToStorage(results) {
    if (!results) return;
    
    const storageData = {
        ...results,
        lastSaved: new Date().toISOString(),
        storedLocally: true
    };
    
    saveToLocalStorage(AppState.localStorageKeys.EXAM_RESULTS, storageData);
    
    // Also save to recent activity
    addToRecentActivity({
        type: 'exam_result',
        exam_type: results.examType,
        subjects: results.subjects,
        score: results.score,
        total_questions: results.totalQuestions,
        percentage: results.percentage,
        date: results.date,
        timestamp: new Date().toISOString()
    });
    
    // Save to browser data for sync
    saveBrowserData('exam_results', results);
}

/**
 * V5: Save recent activity to localStorage
 */
function addToRecentActivity(activity) {
    try {
        let recentActivities = loadFromLocalStorage(AppState.localStorageKeys.RECENT_ACTIVITY) || [];
        
        // Add new activity at the beginning
        recentActivities.unshift({
            ...activity,
            id: Date.now(),
            storedLocally: true
        });
        
        // Keep only last 50 activities
        if (recentActivities.length > 50) {
            recentActivities = recentActivities.slice(0, 50);
        }
        
        saveToLocalStorage(AppState.localStorageKeys.RECENT_ACTIVITY, recentActivities);
        
        // Save to browser data for sync
        saveBrowserData('recent_activity', recentActivities);
        
        return true;
    } catch (error) {
        console.error('Error saving recent activity:', error);
        return false;
    }
}

/**
 * V5: Save trial timer state to localStorage
 */
function saveTrialTimerToStorage(timerState) {
    if (!timerState) return;
    
    const storageData = {
        ...timerState,
        lastSaved: new Date().toISOString()
    };
    
    saveToLocalStorage(AppState.localStorageKeys.TRIAL_TIMER, storageData);
    
    // Save to browser data for sync
    saveBrowserData('trial_timer', timerState);
}

/**
 * V5: Save browser data for sync
 */
function saveBrowserData(key, data) {
    try {
        let browserData = loadFromLocalStorage(AppState.localStorageKeys.BROWSER_DATA) || {};
        browserData[key] = {
            data: data,
            lastUpdated: new Date().toISOString(),
            synced: false
        };
        
        saveToLocalStorage(AppState.localStorageKeys.BROWSER_DATA, browserData);
        
        // Schedule sync to server
        scheduleBrowserDataSync();
        
        return true;
    } catch (error) {
        console.error('Error saving browser data:', error);
        return false;
    }
}

/**
 * V5: Get all browser data for sync
 */
function getBrowserDataForSync() {
    try {
        const browserData = loadFromLocalStorage(AppState.localStorageKeys.BROWSER_DATA) || {};
        const syncData = {};
        
        // Prepare data for sync
        for (const [key, value] of Object.entries(browserData)) {
            if (!value.synced) {
                syncData[key] = value.data;
            }
        }
        
        return syncData;
    } catch (error) {
        console.error('Error getting browser data for sync:', error);
        return null;
    }
}

/**
 * V5: Mark browser data as synced
 */
function markBrowserDataAsSynced(keys) {
    try {
        let browserData = loadFromLocalStorage(AppState.localStorageKeys.BROWSER_DATA) || {};
        
        if (Array.isArray(keys)) {
            keys.forEach(key => {
                if (browserData[key]) {
                    browserData[key].synced = true;
                    browserData[key].lastSynced = new Date().toISOString();
                }
            });
        } else if (keys === 'all') {
            for (const key in browserData) {
                browserData[key].synced = true;
                browserData[key].lastSynced = new Date().toISOString();
            }
        }
        
        saveToLocalStorage(AppState.localStorageKeys.BROWSER_DATA, browserData);
        
        // Update last sync time
        saveToLocalStorage(AppState.localStorageKeys.LAST_SYNC, new Date().toISOString());
        
        return true;
    } catch (error) {
        console.error('Error marking browser data as synced:', error);
        return false;
    }
}

/**
 * V5: Sync browser data to server
 */
async function syncBrowserDataToServer() {
    try {
        const syncData = getBrowserDataForSync();
        
        if (!syncData || Object.keys(syncData).length === 0) {
            console.log('📡 No browser data to sync');
            return true;
        }
        
        console.log('📡 Syncing browser data to server:', Object.keys(syncData));
        
        const response = await fetch('/api/user/sync-browser-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(syncData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Mark data as synced
            markBrowserDataAsSynced(Object.keys(syncData));
            console.log('✅ Browser data synced successfully');
            return true;
        } else {
            console.error('❌ Browser data sync failed:', result.message);
            return false;
        }
    } catch (error) {
        console.error('❌ Browser data sync error:', error);
        return false;
    }
}

/**
 * V5: Get browser data from server
 */
async function getBrowserDataFromServer() {
    try {
        const response = await fetch('/api/user/get-browser-data');
        const result = await response.json();
        
        if (result.success) {
            console.log('📥 Got browser data from server');
            
            // Merge with local data
            if (result.exam_results && result.exam_results.length > 0) {
                // Check if we need to update local exam results
                const localResults = loadFromLocalStorage(AppState.localStorageKeys.EXAM_RESULTS);
                if (!localResults || result.exam_results.length > 0) {
                    // Use server results if available
                    if (result.exam_results[0]) {
                        AppState.examResults = result.exam_results[0];
                        saveExamResultsToStorage(AppState.examResults);
                    }
                }
            }
            
            return result;
        } else {
            console.log('No browser data from server');
            return null;
        }
    } catch (error) {
        console.error('Error getting browser data from server:', error);
        return null;
    }
}

/**
 * V5: Setup periodic browser data sync
 */
function setupBrowserDataSync() {
    // Initial sync
    setTimeout(() => {
        syncBrowserDataToServer();
        getBrowserDataFromServer();
    }, 3000);
    
    // Periodic sync every 30 seconds
    setInterval(() => {
        if (navigator.onLine) {
            syncBrowserDataToServer();
        }
    }, 30000);
    
    // Sync when coming online
    window.addEventListener('online', () => {
        console.log('🌐 Connection restored, syncing browser data...');
        syncBrowserDataToServer();
        getBrowserDataFromServer();
    });
    
    // Save data when going offline
    window.addEventListener('offline', () => {
        console.log('📴 Going offline, saving data locally...');
        saveAllDataToLocalStorage();
    });
}

/**
 * V5: Schedule browser data sync
 */
function scheduleBrowserDataSync() {
    // Debounce sync to avoid too many requests
    if (window.syncTimeout) {
        clearTimeout(window.syncTimeout);
    }
    
    window.syncTimeout = setTimeout(() => {
        if (navigator.onLine) {
            syncBrowserDataToServer();
        }
    }, 5000); // Sync after 5 seconds of inactivity
}

/**
 * V5: Save all current data to localStorage
 */
function saveAllDataToLocalStorage() {
    if (AppState.currentUser) {
        saveUserDataToStorage(AppState.currentUser);
    }
    
    if (AppState.examResults) {
        saveExamResultsToStorage(AppState.examResults);
    }
    
    if (AppState.trialTimerState) {
        saveTrialTimerToStorage(AppState.trialTimerState);
    }
    
    console.log('💾 All data saved to localStorage');
}

// ==================== OFFLINE TRIAL TIMER - V5 NEW ====================

/**
 * V5: Start offline trial timer
 */
function startOfflineTrialTimer() {
    // Load saved timer state
    const savedTimer = loadFromLocalStorage(AppState.localStorageKeys.TRIAL_TIMER);
    
    if (savedTimer && savedTimer.isRunning) {
        // Resume timer from saved state
        AppState.trialTimerState = savedTimer;
        
        // Calculate additional elapsed time since last save
        if (savedTimer.lastUpdate) {
            const lastUpdate = new Date(savedTimer.lastUpdate);
            const now = new Date();
            const additionalSeconds = Math.floor((now - lastUpdate) / 1000);
            
            AppState.trialTimerState.elapsedSeconds += additionalSeconds;
            AppState.trialElapsedSeconds = AppState.trialTimerState.elapsedSeconds;
        }
        
        console.log('⏰ Resuming trial timer from localStorage');
    } else if (AppState.currentUser && AppState.currentUser.status === 'trial') {
        // Start new timer
        AppState.trialTimerState = {
            startTime: new Date().toISOString(),
            elapsedSeconds: 0,
            lastUpdate: new Date().toISOString(),
            isRunning: true
        };
        
        AppState.trialElapsedSeconds = 0;
        console.log('⏰ Starting new trial timer');
    } else {
        return; // No trial active
    }
    
    // Start timer interval
    if (AppState.trialTimer) {
        clearInterval(AppState.trialTimer);
    }
    
    AppState.trialTimer = setInterval(() => {
        if (AppState.trialTimerState.isRunning) {
            AppState.trialTimerState.elapsedSeconds++;
            AppState.trialElapsedSeconds = AppState.trialTimerState.elapsedSeconds;
            AppState.trialTimerState.lastUpdate = new Date().toISOString();
            
            // Save timer state every 30 seconds
            if (AppState.trialTimerState.elapsedSeconds % 30 === 0) {
                saveTrialTimerToStorage(AppState.trialTimerState);
                
                // Update server if online
                if (navigator.onLine) {
                    updateTrialTimerOnServer();
                }
            }
            
            // Update display
            updateTrialTimerDisplay();
            
            // Check if trial has expired
            if (AppState.trialElapsedSeconds >= 3600) { // 1 hour = 3600 seconds
                handleTrialExpired();
            }
        }
    }, 1000);
    
    // Initial save
    saveTrialTimerToStorage(AppState.trialTimerState);
    
    // Initial server update if online
    if (navigator.onLine) {
        updateTrialTimerOnServer();
    }
}

/**
 * V5: Update trial timer on server
 */
async function updateTrialTimerOnServer() {
    try {
        if (!AppState.currentUser || AppState.currentUser.status !== 'trial') {
            return;
        }
        
        const response = await fetch('/api/user/trial-timer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                elapsed_seconds: AppState.trialElapsedSeconds
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('⏰ Trial timer updated on server');
        }
    } catch (error) {
        console.error('Error updating trial timer on server:', error);
    }
}

/**
 * V5: Get trial status from server
 */
async function getTrialStatusFromServer() {
    try {
        const response = await fetch('/api/user/trial-status');
        const result = await response.json();
        
        if (result.success) {
            // Update local state with server data
            if (result.trial_active && result.elapsed_seconds) {
                AppState.trialElapsedSeconds = result.elapsed_seconds;
                AppState.trialTimerState.elapsedSeconds = result.elapsed_seconds;
                
                // Save updated timer state
                saveTrialTimerToStorage(AppState.trialTimerState);
            }
            
            return result;
        }
    } catch (error) {
        console.error('Error getting trial status from server:', error);
    }
    
    return null;
}

/**
 * V5: Pause trial timer
 */
function pauseTrialTimer() {
    if (AppState.trialTimerState.isRunning) {
        AppState.trialTimerState.isRunning = false;
        AppState.trialTimerState.lastUpdate = new Date().toISOString();
        saveTrialTimerToStorage(AppState.trialTimerState);
        console.log('⏸️ Trial timer paused');
    }
}

/**
 * V5: Resume trial timer
 */
function resumeTrialTimer() {
    if (!AppState.trialTimerState.isRunning) {
        AppState.trialTimerState.isRunning = true;
        AppState.trialTimerState.lastUpdate = new Date().toISOString();
        saveTrialTimerToStorage(AppState.trialTimerState);
        console.log('▶️ Trial timer resumed');
    }
}

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
    
    // Visibility change for timers
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // V5: Handle page visibility for trial timer
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // Page is hidden, pause timers if needed
            pauseTrialTimer();
        } else {
            // Page is visible, resume timers
            resumeTrialTimer();
        }
    });
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
                status: data.status,
                is_admin: data.is_admin || false
            };
            
            // V5: Save to localStorage
            saveUserDataToStorage(AppState.currentUser);
            
            // Store trial time if in trial
            if (data.status === 'trial' && data.remaining_seconds) {
                AppState.trialTimeRemaining = data.remaining_seconds;
                AppState.trialElapsedSeconds = 3600 - data.remaining_seconds;
                
                // Update trial timer state
                AppState.trialTimerState = {
                    startTime: new Date().toISOString(),
                    elapsedSeconds: AppState.trialElapsedSeconds,
                    lastUpdate: new Date().toISOString(),
                    isRunning: true
                };
                
                // Save timer state
                saveTrialTimerToStorage(AppState.trialTimerState);
            }
            
            // Update navigation with admin link if user is admin
            updateNavigation();
            
            // V5: Get browser data from server
            getBrowserDataFromServer();
            
            showNotification(`Welcome back, ${data.user_name}!`, 'success');
        }
    } catch (error) {
        console.log('No active session found, using localStorage data');
        // Try to use localStorage data
        const userData = loadFromLocalStorage(AppState.localStorageKeys.USER_DATA);
        if (userData) {
            AppState.currentUser = userData;
            updateNavigation();
        }
    }
}

// ==================== ENHANCED PAGE MANAGEMENT ====================

/**
 * Enhanced page navigation with loading states
 */
function showPage(pageName, options = {}) {
    const { forceReload = false, data = null } = options;
    
    console.log(`📄 Showing page: ${pageName}`);
    
    // V5: Save current state before page change
    saveAllDataToLocalStorage();
    
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
            // V5 FIX: Always display results with localStorage backup
            setTimeout(() => {
                if (AppState.examResults) {
                    displayResults();
                } else {
                    // Try to get results from localStorage as backup
                    const savedResults = loadFromLocalStorage(AppState.localStorageKeys.EXAM_RESULTS);
                    if (savedResults) {
                        AppState.examResults = savedResults;
                        displayResults();
                    } else {
                        showNotification('No exam results available.', 'warning');
                        showPage('dashboard');
                    }
                }
            }, 100);
            break;
        case 'review':
            if (AppState.examResults) {
                displayReviewQuestions('all');
            } else {
                // Try to load from localStorage
                const savedResults = loadFromLocalStorage(AppState.localStorageKeys.EXAM_RESULTS);
                if (savedResults) {
                    AppState.examResults = savedResults;
                    displayReviewQuestions('all');
                }
            }
            break;
        case 'admin':
            // Admin dashboard - only accessible to admins
            if (AppState.currentUser && AppState.currentUser.is_admin) {
                loadAdminDashboard();
            } else {
                showNotification('Access denied. Admin only!', 'error');
                showPage('dashboard');
            }
            break;
    }
}

/**
 * Update navigation based on user state - V5 FIX: Added admin link
 */
function updateNavigation() {
    const navLinks = document.getElementById('navLinks');
    if (!navLinks) return;
    
    if (AppState.currentUser) {
        let navHtml = `
            <span class="nav-link text-light user-welcome">
                <i class="fas fa-user me-1"></i>Welcome, ${AppState.currentUser.full_name}
            </span>
            <a class="nav-link" href="#" onclick="showPage('dashboard')">
                <i class="fas fa-tachometer-alt me-1"></i>Dashboard
            </a>
        `;
        
        // V5 FIX: Add admin link if user is admin
        if (AppState.currentUser.is_admin) {
            navHtml += `
                <a class="nav-link text-warning" href="#" onclick="showPage('admin')">
                    <i class="fas fa-crown me-1"></i>Admin Dashboard
                </a>
            `;
        }
        
        navHtml += `
            <a class="nav-link" href="#" onclick="handleLogout()">
                <i class="fas fa-sign-out-alt me-1"></i>Logout
            </a>
        `;
        
        navLinks.innerHTML = navHtml;
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

// ==================== TRIAL TIMER SYSTEM - V5 UPDATE ====================

/**
 * Start trial timer for free trial users
 */
function startTrialTimer() {
    if (!AppState.currentUser || AppState.currentUser.status !== 'trial') return;
    
    // V5: Use offline timer instead
    startOfflineTrialTimer();
}

/**
 * Update trial timer display
 */
function updateTrialTimerDisplay() {
    const userGreeting = document.getElementById('userGreeting');
    const accountStatus = document.getElementById('accountStatus');
    
    if (userGreeting && AppState.currentUser?.status === 'trial') {
        const remainingSeconds = 3600 - AppState.trialElapsedSeconds;
        const minutes = Math.floor(remainingSeconds / 60);
        const seconds = remainingSeconds % 60;
        userGreeting.innerHTML = `Welcome to your free trial! <span class="text-teal">${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} remaining</span> ⏰`;
    }
    
    if (accountStatus && AppState.currentUser?.status === 'trial') {
        const remainingSeconds = 3600 - AppState.trialElapsedSeconds;
        const minutes = Math.floor(remainingSeconds / 60);
        const seconds = remainingSeconds % 60;
        const progressPercentage = (remainingSeconds / 3600) * 100;
        
        // V5: Show offline indicator if applicable
        const offlineIndicator = !navigator.onLine ? '<span class="badge bg-warning ms-2">Offline</span>' : '';
        
        accountStatus.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-clock me-2"></i>
                <strong>Free Trial Active ${offlineIndicator}</strong>
                <div class="trial-timer mt-2">${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}</div>
                <div class="progress mt-2" style="height: 6px;">
                    <div class="progress-bar bg-warning" style="width: ${progressPercentage}%"></div>
                </div>
                <small class="text-muted mt-2 d-block">${Math.floor(minutes)} minutes ${seconds} seconds remaining</small>
                <small class="text-muted d-block">Elapsed: ${Math.floor(AppState.trialElapsedSeconds / 60)}:${(AppState.trialElapsedSeconds % 60).toString().padStart(2, '0')}</small>
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
 * Handle trial expiration
 */
function handleTrialExpired() {
    AppState.currentUser.status = 'expired';
    
    // V5: Save to localStorage
    saveUserDataToStorage(AppState.currentUser);
    
    // Stop timer
    if (AppState.trialTimer) {
        clearInterval(AppState.trialTimer);
        AppState.trialTimer = null;
    }
    
    showNotification('Your free trial has expired. Please activate your account to continue.', 'warning');
    
    // Show activation modal immediately
    showActivationModal();
    
    // Update dashboard to show expired state
    loadDashboard();
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
            
            // V5: Create user object and save to localStorage
            AppState.currentUser = {
                full_name: formData.full_name,
                email: formData.email,
                status: 'trial',
                is_admin: result.is_admin || false
            };
            
            saveUserDataToStorage(AppState.currentUser);
            
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
                status: result.is_activated ? 'activated' : 'trial',
                is_admin: result.is_admin || false
            };
            
            // V5: Save to localStorage
            saveUserDataToStorage(AppState.currentUser);
            
            // Initialize trial timer if in trial
            if (result.trial_active && !result.is_activated) {
                // Get remaining time from server or set default
                const statusResponse = await fetch('/api/user-status');
                const statusData = await statusResponse.json();
                
                if (statusData.remaining_seconds) {
                    AppState.trialTimeRemaining = statusData.remaining_seconds;
                    AppState.trialElapsedSeconds = 3600 - statusData.remaining_seconds;
                } else {
                    AppState.trialTimeRemaining = 3600;
                    AppState.trialElapsedSeconds = 0;
                }
                
                // Start offline timer
                startOfflineTrialTimer();
            }
            
            showNotification(result.message, 'success');
            document.getElementById('loginForm').reset();
            
            // V5: Sync browser data
            setTimeout(() => {
                syncBrowserDataToServer();
                getBrowserDataFromServer();
            }, 1000);
            
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
            // Clear all timers
            if (AppState.trialTimer) {
                clearInterval(AppState.trialTimer);
            }
            if (AppState.examTimer) {
                clearInterval(AppState.examTimer);
            }
            
            // V5: Save data before clearing
            saveAllDataToLocalStorage();
            
            AppState.currentUser = null;
            AppState.currentExam = null;
            AppState.examResults = null;
            AppState.trialTimeRemaining = 0;
            AppState.trialElapsedSeconds = 0;
            AppState.trialTimerState = {
                startTime: null,
                elapsedSeconds: 0,
                lastUpdate: null,
                isRunning: false
            };
            
            // V5: Clear sensitive data from localStorage
            localStorage.removeItem(AppState.localStorageKeys.USER_DATA);
            localStorage.removeItem(AppState.localStorageKeys.TRIAL_TIMER);
            
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
        // V5: Try to get latest data from server if online
        if (navigator.onLine) {
            await getBrowserDataFromServer();
            await getTrialStatusFromServer();
        }
        
        // Check user status
        const userStatus = await checkUserStatus();
        
        if (!userStatus || !userStatus.active) {
            // Show activation modal immediately if trial expired
            if (AppState.currentUser.status === 'expired') {
                showNotification('Your trial has expired. Please activate your account to continue.', 'warning');
                showActivationModal();
                return;
            }
        }
        
        if (AppState.currentUser.status === 'trial') {
            // Show dashboard with trial timer
            updateWelcomeMessage(userStatus);
            showTrialDashboard(userStatus);
        } else if (AppState.currentUser.status === 'activated') {
            // Show full activated dashboard
            updateWelcomeMessage(userStatus);
            showActivatedDashboard();
        }
        
        // Load common dashboard components
        await loadQuickStats();
        await loadRecentActivity();
        animateDashboardElements();
        
        // V5: Update trial timer display
        updateTrialTimerDisplay();
        
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
        if (AppState.currentUser.status === 'trial') {
            const remainingSeconds = 3600 - AppState.trialElapsedSeconds;
            const minutes = Math.floor(remainingSeconds / 60);
            const seconds = remainingSeconds % 60;
            const offlineIndicator = !navigator.onLine ? ' (Offline)' : '';
            welcomeMessage.innerHTML = `Welcome to your free trial! <span class="text-teal">${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} remaining${offlineIndicator}</span> ⏰`;
        } else if (AppState.currentUser.status === 'activated') {
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
        const remainingSeconds = 3600 - AppState.trialElapsedSeconds;
        const minutes = Math.floor(remainingSeconds / 60);
        const seconds = remainingSeconds % 60;
        const progressPercentage = (remainingSeconds / 3600) * 100;
        
        // V5: Show offline indicator
        const offlineIndicator = !navigator.onLine ? '<span class="badge bg-warning ms-2">Offline</span>' : '';
        
        accountStatus.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-clock me-2"></i>
                <strong>Free Trial Active ${offlineIndicator}</strong>
                <div class="trial-timer mt-2">${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}</div>
                <div class="progress mt-2" style="height: 6px;">
                    <div class="progress-bar bg-warning" style="width: ${progressPercentage}%"></div>
                </div>
                <small class="text-muted mt-2 d-block">${Math.floor(minutes)} minutes ${seconds} seconds remaining</small>
                <small class="text-muted d-block">Time tracked even when offline</small>
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
        // V5: Use localStorage data if offline
        const examResults = loadFromLocalStorage(AppState.localStorageKeys.EXAM_RESULTS);
        if (examResults) {
            quickStats.innerHTML = `
                <div class="col-6">
                    <div class="stat-number text-teal">1</div>
                    <div class="stat-label">Tests Taken</div>
                </div>
                <div class="col-6">
                    <div class="stat-number text-teal">${examResults.percentage}%</div>
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
    }
}

/**
 * Load recent activity - V5 FIXED: Now shows real data with localStorage
 */
async function loadRecentActivity() {
    const recentActivity = document.getElementById('recentActivity');
    if (!recentActivity) return;
    
    try {
        let activities = [];
        
        if (navigator.onLine) {
            // Try to get from server first
            const response = await fetch('/api/user/recent-activity');
            const result = await response.json();
            
            if (result.success && result.activities && result.activities.length > 0) {
                activities = result.activities;
                // Save to localStorage for offline use
                saveToLocalStorage('server_activities', activities);
            }
        }
        
        // If no server data, try localStorage
        if (activities.length === 0) {
            activities = loadFromLocalStorage('server_activities') || [];
        }
        
        // Add local activities
        const localActivities = loadFromLocalStorage(AppState.localStorageKeys.RECENT_ACTIVITY) || [];
        if (localActivities.length > 0) {
            activities = [...localActivities, ...activities].slice(0, 10);
        }
        
        if (activities.length > 0) {
            let html = '<div class="activity-list">';
            
            activities.forEach(activity => {
                const date = new Date(activity.date || activity.timestamp).toLocaleDateString();
                const time = new Date(activity.date || activity.timestamp).toLocaleTimeString();
                const isLocal = activity.storedLocally ? '<span class="badge bg-info ms-2">Local</span>' : '';
                
                html += `
                    <div class="activity-item mb-3 p-3 border rounded">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <h6 class="mb-1">${activity.exam_type || 'Exam'} Test ${isLocal}</h6>
                                <p class="mb-1 text-muted">${activity.subjects || 'Multiple subjects'}</p>
                                <small class="text-muted">Score: ${activity.score}/${activity.total_questions} (${activity.percentage}%)</small>
                            </div>
                            <div class="text-end">
                                <small class="text-muted">${date}</small>
                                <br>
                                <small class="text-muted">${time}</small>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
            recentActivity.innerHTML = html;
        } else {
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
    } catch (error) {
        console.error('Error loading recent activity:', error);
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

// ==================== ADMIN DASHBOARD SYSTEM ====================

/**
 * Load admin dashboard
 */
async function loadAdminDashboard() {
    if (!AppState.currentUser || !AppState.currentUser.is_admin) {
        showNotification('Access denied. Admin only!', 'error');
        showPage('dashboard');
        return;
    }
    
    const adminPage = document.getElementById('admin-page');
    if (!adminPage) {
        // Create admin page if it doesn't exist
        createAdminPage();
    }
    
    try {
        // Load admin stats
        const response = await fetch('/api/admin/stats');
        const result = await response.json();
        
        if (result.success) {
            displayAdminStats(result.stats);
        }
        
        // Load users
        await loadAdminUsers();
        
        // Load activation codes
        await loadAdminCodes();
        
    } catch (error) {
        console.error('Error loading admin dashboard:', error);
        showNotification('Error loading admin dashboard', 'error');
    }
}

// ... [Rest of the admin dashboard functions remain the same] ...

// ==================== EXAM SYSTEM - V5 ENHANCED ====================

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
    
    // Ensure English is included (double check)
    if (!selectedSubjects.includes('english')) {
        showNotification('English Language is compulsory for WAEC', 'warning');
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
 * Start exam with selected subjects - V5 FIX: 60 questions with proper distribution
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
        // V5: Check localStorage for trial status if offline
        if (AppState.currentUser.status === 'expired') {
            showNotification('Your trial has expired. Please activate your account.', 'warning');
            showActivationModal();
            return;
        }
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

    // Load questions from backend - V5 FIX: Ensure 60 questions with proper distribution
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
            // V5 FIX: Verify we have questions
            let questions = result.questions;
            
            if (questions.length !== 60) {
                console.warn(`Expected 60 questions but got ${questions.length}`);
            }
            
            AppState.currentExam.questions = questions;
            
            if (AppState.currentExam.questions.length === 0) {
                showNotification('No questions available for the selected subjects. Please try different subjects.', 'error');
                return;
            }
            
            showPage('exam-interface');
            initializeExamInterface();
            startExamTimer();
            showNotification(`Exam started with ${questions.length} questions! Good luck! 🎯`, 'success');
        } else {
            showNotification('Error loading questions: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error starting exam:', error);
        showNotification('Error starting exam. Please try again.', 'error');
    }
}

/**
 * Submit exam to backend - V5 FIX: Enhanced for stable results with localStorage backup
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
            // V5 FIX: Store complete results for display with backup to localStorage
            AppState.examResults = {
                score: result.score,
                totalQuestions: result.total_questions,
                percentage: result.percentage,
                timeTaken: result.time_taken || timeTaken,
                date: new Date(result.created_at || new Date()).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }),
                subjects: AppState.currentExam.subjects,
                examType: AppState.currentExam.type,
                userAnswers: AppState.currentExam.userAnswers,
                questions: AppState.currentExam.questions,
                subjectScores: result.subject_scores || {},
                resultId: result.result_id
            };
            
            // V5: Save to localStorage
            saveExamResultsToStorage(AppState.examResults);
            
            showNotification('Exam submitted successfully!', 'success');
            showPage('results');
        } else {
            showNotification('Error submitting exam: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error submitting exam:', error);
        // V5: Fallback to localStorage if offline
        const score = calculateScore();
        const totalQuestions = AppState.currentExam.questions.length;
        const percentage = Math.round((score / totalQuestions) * 100);
        
        AppState.examResults = {
            score: score,
            totalQuestions: totalQuestions,
            percentage: percentage,
            timeTaken: timeTaken,
            date: new Date().toLocaleDateString(),
            subjects: AppState.currentExam.subjects,
            examType: AppState.currentExam.type,
            userAnswers: AppState.currentExam.userAnswers,
            questions: AppState.currentExam.questions,
            storedLocally: true
        };
        
        // Save to localStorage
        saveExamResultsToStorage(AppState.examResults);
        
        showNotification('Exam submitted (offline mode - saved locally)', 'warning');
        showPage('results');
    }
}

// ==================== RESULTS SYSTEM FUNCTIONS - V5 ENHANCED ====================

/**
 * Display exam results - V5 FIX: Stable results display with no blanking
 */
async function displayResults() {
    // V5 FIX: Ensure results are available
    if (!AppState.examResults) {
        console.log('No exam results found in state, checking localStorage...');
        const savedResults = loadFromLocalStorage(AppState.localStorageKeys.EXAM_RESULTS);
        if (savedResults) {
            AppState.examResults = savedResults;
        } else {
            showNotification('No exam results available. Please try again.', 'error');
            showPage('dashboard');
            return;
        }
    }
    
    // Update results display - V5 FIX: Use direct DOM manipulation for stability
    const scorePercentage = document.getElementById('scorePercentage');
    const scoreText = document.getElementById('scoreText');
    const timeTaken = document.getElementById('timeTaken');
    const completionDate = document.getElementById('completionDate');
    
    if (scorePercentage) scorePercentage.textContent = `${AppState.examResults.percentage}%`;
    if (scoreText) scoreText.textContent = `${AppState.examResults.score} out of ${AppState.examResults.totalQuestions} questions`;
    if (timeTaken) timeTaken.textContent = formatTime(AppState.examResults.timeTaken);
    if (completionDate) completionDate.textContent = AppState.examResults.date;

    // V5 FIX: Modern results message with performance-based styling
    const resultsMessage = document.getElementById('resultsMessage');
    let performanceLevel = '';
    
    if (AppState.examResults.percentage >= 80) {
        performanceLevel = 'excellent';
    } else if (AppState.examResults.percentage >= 60) {
        performanceLevel = 'good';
    } else if (AppState.examResults.percentage >= 40) {
        performanceLevel = 'average';
    } else {
        performanceLevel = 'poor';
    }
    
    const performance = PERFORMANCE_MESSAGES[performanceLevel];
    
    // Add offline indicator if result was saved locally
    const offlineIndicator = AppState.examResults.storedLocally ? 
        '<div class="alert alert-info mt-3"><i class="fas fa-save me-2"></i>Saved locally - will sync when online</div>' : '';
    
    // Replace the simple message with enhanced V5 design
    if (resultsMessage) {
        resultsMessage.outerHTML = `
            <div class="results-message-container ${performance.color}">
                <div class="results-message-content">
                    <div class="performance-icon">
                        <i class="${performance.icon}"></i>
                    </div>
                    <h4 class="performance-message">${performance.message}</h4>
                    <p class="performance-submessage">${performance.submessage}</p>
                    <div class="performance-badge">
                        <i class="fas fa-award me-2"></i>${performance.badge}
                    </div>
                    ${offlineIndicator}
                </div>
            </div>
        `;
    }

    // Update subject breakdown
    updateSubjectBreakdown();
    
    // V5 FIX: If we have a result ID and are online, try to fetch detailed results from server
    if (AppState.examResults.resultId && navigator.onLine && !AppState.examResults.storedLocally) {
        try {
            const response = await fetch(`/api/exam-results/${AppState.examResults.resultId}`);
            const result = await response.json();
            
            if (result.success && result.result) {
                // Update with server data
                AppState.examResults = {
                    ...AppState.examResults,
                    subjectScores: result.result.subject_scores || AppState.examResults.subjectScores,
                    questions: result.result.questions || AppState.examResults.questions,
                    userAnswers: result.result.user_answers || AppState.examResults.userAnswers
                };
                
                // Save updated results to localStorage
                saveExamResultsToStorage(AppState.examResults);
                
                // Update display again with server data
                updateSubjectBreakdown();
            }
        } catch (error) {
            console.log('Could not fetch detailed results from server:', error);
            // Use local data - already displayed
        }
    }
}

// ==================== EVENT HANDLERS ====================

/**
 * Handle beforeunload event
 */
function handleBeforeUnload(e) {
    if (AppState.currentExam) {
        e.preventDefault();
        e.returnValue = 'You have an ongoing exam. Are you sure you want to leave?';
        return e.returnValue;
    }
    
    // V5: Save all data before leaving
    saveAllDataToLocalStorage();
}

/**
 * Handle visibility change for timers
 */
function handleVisibilityChange() {
    if (document.hidden) {
        // Page is hidden, pause timers if needed
        pauseTrialTimer();
        console.log('Page hidden - timers paused');
    } else {
        // Page is visible, resume timers
        resumeTrialTimer();
        console.log('Page visible - timers resumed');
    }
}

// ==================== ACTIVATION SYSTEM ====================

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
            
            // Update user status
            AppState.currentUser.status = 'activated';
            AppState.currentUser.is_activated = true;
            
            // V5: Save to localStorage
            saveUserDataToStorage(AppState.currentUser);
            
            // Clear trial timer
            if (AppState.trialTimer) {
                clearInterval(AppState.trialTimer);
                AppState.trialTimer = null;
            }
            
            // Reload dashboard
            loadDashboard();
        } else {
            showNotification(result.message, 'error');
        }
    } catch (error) {
        showNotification('Activation failed. Please try again.', 'error');
    }
}

// ==================== ENHANCED UTILITY FUNCTIONS ====================

/**
 * Check user status from server
 */
async function checkUserStatus() {
    try {
        const response = await fetch('/api/user-status');
        return await response.json();
    } catch (error) {
        // V5: Return status from localStorage if offline
        if (AppState.currentUser) {
            return {
                active: true,
                status: AppState.currentUser.status,
                user_name: AppState.currentUser.full_name,
                user_email: AppState.currentUser.email,
                is_admin: AppState.currentUser.is_admin
            };
        }
        return { active: false };
    }
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
    loadDashboard,
    loadAdminDashboard,
    // V5: Export localStorage functions
    saveToLocalStorage,
    loadFromLocalStorage,
    syncBrowserDataToServer
};

console.log('📚 MSH CBT HUB Enhanced JavaScript V5 Loaded');
console.log('✅ Features: Admin Dashboard Fix, JAMB Results Fix, localStorage Support, Offline Trial Timer');
