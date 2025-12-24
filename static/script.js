// script.js - VERSION 5.2 - FIXED TRIAL EXPIRY BEHAVIOR
// MSH CBT HUB - ENHANCED PREMIUM JavaScript V5.2
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
        USER_DATA: 'msh_cbt_user_data_v5',
        EXAM_RESULTS: 'msh_cbt_exam_results_v5',
        RECENT_ACTIVITY: 'msh_cbt_recent_activity_v5',
        TRIAL_TIMER: 'msh_cbt_trial_timer_v5',
        LAST_SYNC: 'msh_cbt_last_sync_v5',
        BROWSER_DATA: 'msh_cbt_browser_data_v5',
        TRIAL_EXPIRED: 'msh_cbt_trial_expired_v5'
    },
    // V5: Trial timer state
    trialTimerState: {
        startTime: null,
        elapsedSeconds: 0,
        lastUpdate: null,
        isRunning: false,
        hasExpired: false
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
    
    console.log('🚀 MSH CBT HUB Enhanced V5.2 Initializing...');
    
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
    console.log('✅ MSH CBT HUB Enhanced V5.2 Initialized Successfully');
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
            const trialExpired = loadFromLocalStorage(AppState.localStorageKeys.TRIAL_EXPIRED);
            
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
            if (trialExpired) {
                AppState.trialTimerState.hasExpired = true;
            }
            
            return {
                userData,
                examResults,
                recentActivity,
                trialTimer,
                browserData,
                trialExpired
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
 * V5: Save recent activity to localStorage with deduplication
 */
function addToRecentActivity(activity) {
    try {
        let recentActivities = loadFromLocalStorage(AppState.localStorageKeys.RECENT_ACTIVITY) || [];
        
        // V5.1 FIX: Create a unique key for this activity
        const activityKey = `${activity.exam_type}_${activity.subjects}_${activity.score}_${activity.total_questions}_${activity.date}`;
        
        // Check if this activity already exists
        const existingIndex = recentActivities.findIndex(a => {
            const existingKey = `${a.exam_type}_${a.subjects}_${a.score}_${a.total_questions}_${a.date}`;
            return existingKey === activityKey;
        });
        
        // If it doesn't exist, add it
        if (existingIndex === -1) {
            recentActivities.unshift({
                ...activity,
                id: Date.now(),
                storedLocally: true,
                uniqueKey: activityKey
            });
            
            // Keep only last 50 activities
            if (recentActivities.length > 50) {
                recentActivities = recentActivities.slice(0, 50);
            }
            
            saveToLocalStorage(AppState.localStorageKeys.RECENT_ACTIVITY, recentActivities);
            
            // Save to browser data for sync
            saveBrowserData('recent_activity', recentActivities);
        } else {
            console.log('Activity already exists, skipping duplicate');
        }
        
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
 * V5: Mark trial as expired in localStorage (CANNOT BE RESET)
 */
function markTrialAsExpired() {
    const expirationData = {
        expired: true,
        expiredAt: new Date().toISOString(),
        deviceId: AppState.currentUser?.device_id || session.get('device_id'),
        cannotRestart: true
    };
    
    saveToLocalStorage(AppState.localStorageKeys.TRIAL_EXPIRED, expirationData);
    
    // Also mark in browser data for sync
    saveBrowserData('trial_expired', expirationData);
    
    console.log('⏰ Trial marked as expired permanently');
    
    // Force show activation modal
    setTimeout(() => {
        showActivationModal();
    }, 1000);
}

/**
 * V5: Check if trial has expired permanently
 */
function isTrialExpiredPermanently() {
    const trialExpired = loadFromLocalStorage(AppState.localStorageKeys.TRIAL_EXPIRED);
    return trialExpired && trialExpired.expired === true;
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
        if (navigator.onLine) {
            syncBrowserDataToServer();
            getBrowserDataFromServer();
        }
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
    // V5: FIRST check if trial has expired permanently (cannot restart)
    if (isTrialExpiredPermanently()) {
        console.log('⏰ Trial has expired permanently - cannot restart');
        AppState.currentUser.status = 'expired';
        AppState.trialTimerState.hasExpired = true;
        
        // Force show activation modal
        setTimeout(() => {
            showActivationModal();
        }, 1000);
        return;
    }
    
    // Load saved timer state
    const savedTimer = loadFromLocalStorage(AppState.localStorageKeys.TRIAL_TIMER);
    
    if (savedTimer && savedTimer.isRunning && !savedTimer.hasExpired) {
        // Resume timer from saved state
        AppState.trialTimerState = savedTimer;
        
        // Calculate additional elapsed time since last save
        if (savedTimer.lastUpdate) {
            const lastUpdate = new Date(savedTimer.lastUpdate);
            const now = new Date();
            const additionalSeconds = Math.floor((now - lastUpdate) / 1000);
            
            AppState.trialTimerState.elapsedSeconds += additionalSeconds;
            AppState.trialElapsedSeconds = AppState.trialTimerState.elapsedSeconds;
            
            // Check if trial has expired during offline time
            if (AppState.trialElapsedSeconds >= 3600) { // 1 hour = 3600 seconds
                handleTrialExpired();
                return;
            }
        }
        
        console.log('⏰ Resuming trial timer from localStorage');
    } else if (AppState.currentUser && AppState.currentUser.status === 'trial' && !AppState.trialTimerState.hasExpired) {
        // Start new timer only if trial hasn't expired
        AppState.trialTimerState = {
            startTime: new Date().toISOString(),
            elapsedSeconds: 0,
            lastUpdate: new Date().toISOString(),
            isRunning: true,
            hasExpired: false
        };
        
        AppState.trialElapsedSeconds = 0;
        console.log('⏰ Starting new trial timer');
    } else {
        return; // No trial active or trial expired
    }
    
    // Start timer interval
    if (AppState.trialTimer) {
        clearInterval(AppState.trialTimer);
    }
    
    AppState.trialTimer = setInterval(() => {
        if (AppState.trialTimerState.isRunning && !AppState.trialTimerState.hasExpired) {
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
        if (!AppState.currentUser || AppState.currentUser.status !== 'trial' || AppState.trialTimerState.hasExpired) {
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
    if (AppState.trialTimerState.isRunning && !AppState.trialTimerState.hasExpired) {
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
    if (!AppState.trialTimerState.isRunning && !AppState.trialTimerState.hasExpired) {
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
    
    // V5.1 FIX: Admin button event listener
    document.addEventListener('click', function(e) {
        if (e.target.closest('[onclick*="admin"]')) {
            e.preventDefault();
            showPage('admin');
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
                is_admin: data.is_admin || false,
                has_access: data.has_access !== false // V5.2 FIX: Track access
            };
            
            // V5: Check if trial has expired permanently
            if (isTrialExpiredPermanently() && data.status === 'trial') {
                AppState.currentUser.status = 'expired';
                AppState.currentUser.has_access = false;
                showNotification('Your trial has expired. Please activate your account to continue.', 'warning');
                showActivationModal();
                return;
            }
            
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
                    isRunning: true,
                    hasExpired: false
                };
                
                // Save timer state
                saveTrialTimerToStorage(AppState.trialTimerState);
            }
            
            // V5.2 FIX: If user has no access, redirect to activation
            if (data.status === 'expired' && !data.has_access) {
                AppState.currentUser.has_access = false;
                showNotification('Your trial has expired. Please activate your account.', 'warning');
                setTimeout(() => showActivationModal(), 1000);
            }
            
            // Update navigation with admin link if user is admin
            updateNavigation();
            
            // V5: Get browser data from server
            getBrowserDataFromServer();
            
            if (data.status !== 'expired') {
                showNotification(`Welcome back, ${data.user_name}!`, 'success');
            }
        }
    } catch (error) {
        console.log('No active session found, using localStorage data');
        // Try to use localStorage data
        const userData = loadFromLocalStorage(AppState.localStorageKeys.USER_DATA);
        if (userData) {
            AppState.currentUser = userData;
            
            // V5: Check if trial has expired
            if (isTrialExpiredPermanently() && AppState.currentUser.status === 'trial') {
                AppState.currentUser.status = 'expired';
                AppState.currentUser.has_access = false;
                showNotification('Your trial has expired. Please activate your account to continue.', 'warning');
                showActivationModal();
            }
            
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
    
    // V5.2 FIX: Check if user has access to this page
    if (AppState.currentUser && !AppState.currentUser.has_access && 
        pageName !== 'activation' && pageName !== 'home' && pageName !== 'login' && pageName !== 'register') {
        showNotification('Your trial has expired. Please activate your account to access this feature.', 'warning');
        showActivationModal();
        return;
    }
    
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
            // V5.1 FIX: Admin dashboard - only accessible to admins
            if (AppState.currentUser && AppState.currentUser.is_admin) {
                // If admin page doesn't exist, redirect to admin route
                if (!document.getElementById('admin-page')) {
                    window.location.href = '/admin';
                    return;
                }
                loadAdminDashboard();
            } else {
                showNotification('Access denied. Admin only!', 'error');
                showPage('dashboard');
            }
            break;
    }
}

/**
 * Update navigation based on user state - V5.1 FIX: Added admin link with proper routing
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
        
        // V5.1 FIX: Add admin link if user is admin - with proper routing
        if (AppState.currentUser.is_admin) {
            navHtml += `
                <a class="nav-link text-warning" href="/admin" target="_blank">
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
    } else if (hash === 'admin') {
        // Special handling for admin page
        showPage('admin');
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
 * Handle trial expiration - PERMANENT, CANNOT RESTART
 */
function handleTrialExpired() {
    console.log('⏰ Trial expired - marking as permanent');
    
    // Stop timer
    if (AppState.trialTimer) {
        clearInterval(AppState.trialTimer);
        AppState.trialTimer = null;
    }
    
    // Mark trial as expired permanently
    AppState.currentUser.status = 'expired';
    AppState.currentUser.has_access = false; // V5.2 FIX: Remove access
    AppState.trialTimerState.hasExpired = true;
    AppState.trialTimerState.isRunning = false;
    
    // V5: Save to localStorage - MARK AS PERMANENTLY EXPIRED
    saveUserDataToStorage(AppState.currentUser);
    saveTrialTimerToStorage(AppState.trialTimerState);
    markTrialAsExpired(); // This marks it as permanently expired
    
    showNotification('Your free trial has expired. Please activate your account to continue.', 'warning');
    
    // Force show activation modal - user MUST activate
    showActivationModal(true);
    
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
                is_admin: result.is_admin || false,
                has_access: true
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
                status: result.status || (result.is_activated ? 'activated' : 'trial'),
                is_admin: result.is_admin || false,
                has_access: result.has_access !== false // V5.2 FIX: Track access
            };
            
            // V5: Check if trial has expired permanently
            if (isTrialExpiredPermanently() && !result.is_activated) {
                AppState.currentUser.status = 'expired';
                AppState.currentUser.has_access = false;
                showNotification('Your trial has expired. Please activate your account to continue.', 'warning');
                showActivationModal(true);
                return;
            }
            
            // V5: Save to localStorage
            saveUserDataToStorage(AppState.currentUser);
            
            // Initialize trial timer if in trial
            if (result.status === 'trial' && !result.is_activated) {
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
            
            // V5.2 FIX: If user has no access, show activation modal
            if (result.status === 'expired' && !result.has_access) {
                showNotification('Your trial has expired. Please activate your account.', 'warning');
                setTimeout(() => showActivationModal(true), 1000);
            } else {
                showNotification(result.message, 'success');
            }
            
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
                isRunning: false,
                hasExpired: false
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
    
    // V5.2 FIX: Check if user has access
    if (!AppState.currentUser.has_access) {
        // Show expired dashboard with activation prompt
        updateWelcomeMessage({status: 'expired'});
        showExpiredDashboard();
        return;
    }
    
    // V5: Check if trial has expired permanently
    if (isTrialExpiredPermanently() && AppState.currentUser.status === 'trial') {
        AppState.currentUser.status = 'expired';
        AppState.currentUser.has_access = false;
        showNotification('Your trial has expired. Please activate your account to continue.', 'warning');
        showActivationModal(true);
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
            if (AppState.currentUser.status === 'expired' || isTrialExpiredPermanently()) {
                showNotification('Your trial has expired. Please activate your account to continue.', 'warning');
                showActivationModal(true);
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
        } else if (AppState.currentUser.status === 'expired') {
            // Show expired dashboard
            updateWelcomeMessage(userStatus);
            showExpiredDashboard();
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
        } else if (AppState.currentUser.status === 'expired') {
            welcomeMessage.innerHTML = `Your trial has expired. Please activate your account. 🔒`;
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
 * Show expired dashboard
 */
function showExpiredDashboard() {
    const accountStatus = document.getElementById('accountStatus');
    if (accountStatus) {
        accountStatus.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                <strong>Trial Expired</strong>
                <p class="mb-2">Your 1-hour free trial has ended. To continue using MSH CBT HUB:</p>
                <ol class="mb-0 ps-3">
                    <li>Get an activation code via WhatsApp</li>
                    <li>Enter the code in the activation form</li>
                    <li>Enjoy full access for 5 months!</li>
                </ol>
            </div>
            <div class="d-grid gap-2">
                <button class="btn btn-primary" onclick="showActivationModal(true)">
                    <i class="fas fa-key me-2"></i>Enter Activation Code
                </button>
                <a href="https://wa.me/2347084315679?text=Hello%2C%20I%20want%20to%20apply%20for%20an%20activation%20code%20for%20MSH%20CBT%20HUB." 
                   class="btn btn-success" target="_blank">
                    <i class="fab fa-whatsapp me-2"></i>Get Code via WhatsApp
                </a>
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
        } else if (result.requires_activation) {
            // V5.2 FIX: Show activation required message
            quickStats.innerHTML = `
                <div class="col-12 text-center">
                    <div class="alert alert-warning">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        <p class="mb-0">Activate your account to view statistics</p>
                    </div>
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
 * V5.1 FIX: Load recent activity - No duplication with unique activities
 */
async function loadRecentActivity() {
    const recentActivity = document.getElementById('recentActivity');
    if (!recentActivity) return;
    
    try {
        let activities = [];
        let serverActivities = [];
        
        if (navigator.onLine) {
            // Try to get from server first - V5.1 FIX: Server now returns unique activities
            const response = await fetch('/api/user/recent-activity');
            const result = await response.json();
            
            if (result.success && result.activities && result.activities.length > 0) {
                serverActivities = result.activities;
                // Save to localStorage for offline use
                saveToLocalStorage('server_activities', serverActivities);
            } else if (result.requires_activation) {
                // V5.2 FIX: Show activation required message
                recentActivity.innerHTML = `
                    <div class="text-center py-4">
                        <div class="alert alert-warning">
                            <i class="fas fa-exclamation-triangle me-2"></i>
                            <p class="mb-0">Activate your account to view recent activity</p>
                            <button class="btn btn-primary btn-sm mt-2" onclick="showActivationModal()">
                                <i class="fas fa-key me-2"></i>Activate Now
                            </button>
                        </div>
                    </div>
                `;
                return;
            }
        } else {
            // If offline, try to get server activities from localStorage
            serverActivities = loadFromLocalStorage('server_activities') || [];
        }
        
        // V5.1 FIX: Use server activities as primary source (already unique)
        activities = [...serverActivities];
        
        // Add local activities only if they don't duplicate server activities
        const localActivities = loadFromLocalStorage(AppState.localStorageKeys.RECENT_ACTIVITY) || [];
        
        // Create a set of server activity keys for quick lookup
        const serverActivityKeys = new Set();
        serverActivities.forEach(activity => {
            const key = `${activity.exam_type}_${activity.subjects}_${activity.score}_${activity.total_questions}_${activity.date}`;
            serverActivityKeys.add(key);
        });
        
        // Add local activities that aren't duplicates of server activities
        localActivities.forEach(activity => {
            const key = `${activity.exam_type}_${activity.subjects}_${activity.score}_${activity.total_questions}_${activity.date}`;
            if (!serverActivityKeys.has(key)) {
                activities.push(activity);
            }
        });
        
        // Sort by date (most recent first) and take top 10
        activities.sort((a, b) => {
            const dateA = new Date(a.date || a.timestamp);
            const dateB = new Date(b.date || b.timestamp);
            return dateB - dateA;
        }).slice(0, 10);
        
        if (activities.length > 0) {
            let html = '<div class="activity-list">';
            
            // Track displayed activities to avoid duplicates in display
            const displayedKeys = new Set();
            
            activities.forEach(activity => {
                const date = new Date(activity.date || activity.timestamp).toLocaleDateString();
                const time = new Date(activity.date || activity.timestamp).toLocaleTimeString();
                const isLocal = activity.storedLocally ? '<span class="badge bg-info ms-2">Local</span>' : '';
                
                // Create a unique key for this activity
                const displayKey = `${activity.exam_type}_${activity.subjects}_${activity.score}_${date}`;
                
                // Skip if we've already displayed this activity
                if (displayedKeys.has(displayKey)) {
                    return;
                }
                
                displayedKeys.add(displayKey);
                
                html += `
                    <div class="activity-item mb-3 p-3 border rounded">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <h6 class="mb-1">${activity.exam_type || 'Exam'} Test ${isLocal}</h6>
                                <p class="mb-1 text-muted">${activity.subjects || 'Multiple subjects'}</p>
                                <small class="text-muted">Score: ${activity.score}/${activity.total_questions} (${activity.percentage}%)</small>
                                ${activity.time_taken ? `<br><small class="text-muted">Time: ${formatTime(activity.time_taken)}</small>` : ''}
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
        // V5.1 FIX: If admin page doesn't exist, we're in the wrong place
        window.location.href = '/admin';
        return;
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

/**
 * Create admin page dynamically
 */
function createAdminPage() {
    // V5.1 FIX: Admin page should be served by Flask route /admin
    // This function is kept for backward compatibility
    console.log('Admin page should be served by Flask route /admin');
    
    // Create a simple placeholder if needed
    const pagesContainer = document.querySelector('.page-section.active')?.parentElement;
    if (!pagesContainer) return;
    
    const adminPageHTML = `
        <div id="admin-page" class="page-section">
            <div class="container mt-5 pt-5">
                <div class="cbt-card">
                    <div class="text-center py-5">
                        <i class="fas fa-crown fa-4x text-warning mb-3"></i>
                        <h3>Admin Dashboard</h3>
                        <p class="text-muted">Redirecting to admin interface...</p>
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    pagesContainer.insertAdjacentHTML('beforeend', adminPageHTML);
    
    // Redirect to actual admin page
    setTimeout(() => {
        window.location.href = '/admin';
    }, 1000);
}

/**
 * Display admin statistics
 */
function displayAdminStats(stats) {
    const adminStats = document.getElementById('adminStats');
    if (!adminStats) return;
    
    adminStats.innerHTML = `
        <div class="col-md-3 mb-3">
            <div class="cbt-card text-center p-3">
                <div class="stat-number text-teal">${stats.total_users}</div>
                <div class="stat-label">Total Users</div>
            </div>
        </div>
        <div class="col-md-3 mb-3">
            <div class="cbt-card text-center p-3">
                <div class="stat-number text-success">${stats.activated_users}</div>
                <div class="stat-label">Activated Users</div>
            </div>
        </div>
        <div class="col-md-3 mb-3">
            <div class="cbt-card text-center p-3">
                <div class="stat-number text-warning">${stats.active_trials}</div>
                <div class="stat-label">Active Trials</div>
            </div>
        </div>
        <div class="col-md-3 mb-3">
            <div class="cbt-card text-center p-3">
                <div class="stat-number text-danger">${stats.expired_trials}</div>
                <div class="stat-label">Expired Trials</div>
            </div>
        </div>
        <div class="col-md-3 mb-3">
            <div class="cbt-card text-center p-3">
                <div class="stat-number text-primary">${stats.total_codes}</div>
                <div class="stat-label">Total Codes</div>
            </div>
        </div>
        <div class="col-md-3 mb-3">
            <div class="cbt-card text-center p-3">
                <div class="stat-number text-info">${stats.used_codes}</div>
                <div class="stat-label">Used Codes</div>
            </div>
        </div>
        <div class="col-md-3 mb-3">
            <div class="cbt-card text-center p-3">
                <div class="stat-number text-teal">${stats.total_exams}</div>
                <div class="stat-label">Total Exams</div>
            </div>
        </div>
        <div class="col-md-3 mb-3">
            <div class="cbt-card text-center p-3">
                <div class="stat-number text-teal">${stats.recent_exams}</div>
                <div class="stat-label">Recent Exams (7 days)</div>
            </div>
        </div>
    `;
}

/**
 * Load admin users
 */
async function loadAdminUsers() {
    try {
        const response = await fetch('/api/admin/users');
        const result = await response.json();
        
        if (result.success && result.users) {
            displayAdminUsers(result.users);
        }
    } catch (error) {
        console.error('Error loading admin users:', error);
    }
}

/**
 * Display admin users
 */
function displayAdminUsers(users) {
    const adminUsersTable = document.getElementById('adminUsersTable');
    if (!adminUsersTable) return;
    
    let html = `
        <table class="table table-hover">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Exams</th>
                    <th>Join Date</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    users.forEach(user => {
        let statusClass = '';
        if (user.status === 'Activated') statusClass = 'badge bg-success';
        else if (user.status === 'Admin') statusClass = 'badge bg-warning';
        else if (user.status === 'Active Trial') statusClass = 'badge bg-info';
        else if (user.status === 'Expired Trial') statusClass = 'badge bg-danger';
        else statusClass = 'badge bg-secondary';
        
        html += `
            <tr>
                <td>${user.id}</td>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td><span class="${statusClass}">${user.status}</span></td>
                <td>${user.exam_count}</td>
                <td>${user.join_date}</td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
        <div class="text-muted text-end mt-2">Total: ${users.length} users</div>
    `;
    
    adminUsersTable.innerHTML = html;
}

/**
 * Refresh admin users
 */
function refreshAdminUsers() {
    const adminUsersTable = document.getElementById('adminUsersTable');
    if (adminUsersTable) {
        adminUsersTable.innerHTML = `
            <div class="text-center py-4">
                <div class="loading-spinner"></div>
                <p class="mt-3">Refreshing users...</p>
            </div>
        `;
    }
    loadAdminUsers();
}

/**
 * Load admin codes
 */
async function loadAdminCodes() {
    try {
        const response = await fetch('/api/admin/codes');
        const result = await response.json();
        
        if (result.success && result.codes) {
            displayAdminCodes(result.codes);
        }
    } catch (error) {
        console.error('Error loading admin codes:', error);
    }
}

/**
 * Display admin codes
 */
function displayAdminCodes(codes) {
    const adminCodesTable = document.getElementById('adminCodesTable');
    if (!adminCodesTable) return;
    
    let html = `
        <table class="table table-hover">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Code</th>
                    <th>Status</th>
                    <th>Used By</th>
                    <th>Created</th>
                    <th>Expires</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    codes.forEach(code => {
        let statusBadge = code.used ? 
            '<span class="badge bg-danger">Used</span>' : 
            '<span class="badge bg-success">Available</span>';
        
        html += `
            <tr>
                <td>${code.id}</td>
                <td><code>${code.code}</code></td>
                <td>${statusBadge}</td>
                <td>${code.used_by || 'N/A'}</td>
                <td>${code.created_at}</td>
                <td>${code.expires_at || 'N/A'}</td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
        <div class="text-muted text-end mt-2">Total: ${codes.length} codes</div>
    `;
    
    adminCodesTable.innerHTML = html;
}

/**
 * Refresh admin codes
 */
function refreshAdminCodes() {
    const adminCodesTable = document.getElementById('adminCodesTable');
    if (adminCodesTable) {
        adminCodesTable.innerHTML = `
            <div class="text-center py-4">
                <div class="loading-spinner"></div>
                <p class="mt-3">Refreshing codes...</p>
            </div>
        `;
    }
    loadAdminCodes();
}

/**
 * Generate activation codes
 */
async function generateActivationCodes() {
    if (!confirm('Generate 100 new activation codes?')) return;
    
    try {
        const response = await fetch('/api/generate-codes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('100 activation codes generated successfully!', 'success');
            refreshAdminCodes();
        } else {
            showNotification('Error generating codes: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error generating codes:', error);
        showNotification('Error generating activation codes', 'error');
    }
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
    
    // V5.2 FIX: Check if user has access
    if (!AppState.currentUser.has_access) {
        showNotification('Your trial has expired. Please activate your account to access exams.', 'warning');
        showActivationModal(true);
        return;
    }
    
    // Check if trial expired
    if (AppState.currentUser.status === 'expired') {
        showNotification('Your trial has expired. Please activate your account.', 'warning');
        showActivationModal(true);
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
    
    // V5.2 FIX: Check if user has access
    if (!AppState.currentUser.has_access) {
        showNotification('Your trial has expired. Please activate your account to access exams.', 'warning');
        showActivationModal(true);
        return;
    }
    
    // Check if trial expired
    if (AppState.currentUser.status === 'expired') {
        showNotification('Your trial has expired. Please activate your account.', 'warning');
        showActivationModal(true);
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
 * Start exam with selected subjects - V5 FIX: 60 questions with proper distribution
 */
async function startExam(examType, selectedSubjects) {
    if (!AppState.currentUser) {
        showNotification('Please login first', 'warning');
        showPage('login');
        return;
    }

    // V5.2 FIX: Check if user has access
    if (!AppState.currentUser.has_access) {
        showNotification('Your trial has expired. Please activate your account to access exams.', 'warning');
        showActivationModal(true);
        return;
    }

    // Check trial/activation status
    try {
        const userStatus = await checkUserStatus();
        if (!userStatus.active) {
            showNotification('Your access has expired. Please activate your account.', 'warning');
            showActivationModal(true);
            return;
        }
    } catch (error) {
        // V5: Check localStorage for trial status if offline
        if (AppState.currentUser.status === 'expired' || isTrialExpiredPermanently()) {
            showNotification('Your trial has expired. Please activate your account.', 'warning');
            showActivationModal(true);
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
        } else if (result.requires_activation) {
            // V5.2 FIX: Handle activation required
            showNotification('Your trial has expired. Please activate your account to access exams.', 'warning');
            showActivationModal(true);
        } else {
            showNotification('Error loading questions: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error starting exam:', error);
        showNotification('Error starting exam. Please try again.', 'error');
    }
}

/**
 * Get exam time based on type and subjects - V5 UPDATE: Standard timing
 */
function getExamTime(examType, subjects) {
    // V5 ENHANCEMENT: Standard timing for all exams
    return examType === 'WAEC' ? 7200 : 7200; // 2 hours for both WAEC and JAMB
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
        const examName = AppState.currentExam.type === 'WAEC' ? 'WAEC' : 'JAMB';
        examSubject.innerHTML = `<i class="fas fa-book me-2"></i>${examName} - ${AppState.currentExam.questions.length} Questions`;
    }
    
    if (examInfo) {
        examInfo.textContent = `${AppState.currentExam.subjects.length} Subjects • ${formatTime(AppState.currentExam.timeRemaining)}`;
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
        const optionElement = document.querySelector(`.option[data-option="${userAnswer}"]`);
        if (optionElement) {
            optionElement.classList.add('selected');
        }
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
 * Update timer display - V5 UPDATE: Enhanced formatting
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
                        <h4 id="unansweredCount">You have ${unanswered} unanswered questions!</h4>
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
        } else if (result.requires_activation) {
            // V5.2 FIX: Handle activation required
            showNotification('Your trial has expired. Please activate your account to submit exams.', 'warning');
            showActivationModal(true);
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

/**
 * Update subject performance breakdown - V5 FIX: Better calculation
 */
function updateSubjectBreakdown() {
    if (!AppState.examResults) return;
    
    const container = document.getElementById('subjectBreakdown');
    let subjectScores = AppState.examResults.subjectScores || {};
    
    // If no subject scores, calculate from questions
    if (Object.keys(subjectScores).length === 0 && AppState.examResults.questions) {
        const calculatedScores = {};
        
        AppState.examResults.questions.forEach((question, index) => {
            const subject = question.subject || 'General';
            if (!calculatedScores[subject]) {
                calculatedScores[subject] = { total: 0, correct: 0 };
            }
            
            calculatedScores[subject].total++;
            const userAnswer = AppState.examResults.userAnswers[index];
            if (userAnswer && userAnswer === question.correct_answer) {
                calculatedScores[subject].correct++;
            }
        });
        
        subjectScores = calculatedScores;
    }

    // Generate HTML for each subject
    let html = '';
    Object.keys(subjectScores).forEach(subject => {
        const score = subjectScores[subject];
        const percentage = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;
        
        html += `
            <div class="subject-performance mb-3">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <div class="subject-name">
                        <i class="fas fa-book me-2 text-teal"></i>
                        <strong>${subject.charAt(0).toUpperCase() + subject.slice(1)}</strong>
                    </div>
                    <div class="subject-score">
                        ${score.correct}/${score.total} (${percentage}%)
                    </div>
                </div>
                <div class="subject-progress">
                    <div class="progress" style="height: 8px;">
                        <div class="progress-bar ${getProgressBarColor(percentage)}" 
                             style="width: ${percentage}%"></div>
                    </div>
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
 * Display review questions with filtering - V5 FIX: Better display
 */
function displayReviewQuestions(filter) {
    if (!AppState.examResults) return;
    
    const container = document.getElementById('reviewQuestionsContainer');
    let html = '';

    AppState.examResults.questions.forEach((question, index) => {
        const userAnswer = AppState.examResults.userAnswers[index];
        const isCorrect = userAnswer && userAnswer === question.correct_answer;
        const isUnanswered = !userAnswer;

        // Apply filters
        if (filter === 'correct' && !isCorrect) return;
        if (filter === 'wrong' && (isCorrect || isUnanswered)) return;
        if (filter === 'unanswered' && !isUnanswered) return;

        let itemClass = 'review-item p-3 mb-3 border rounded';
        if (isCorrect) itemClass += ' border-success bg-success-light';
        else if (isUnanswered) itemClass += ' border-warning bg-warning-light';
        else itemClass += ' border-danger bg-danger-light';

        html += `
            <div class="${itemClass}">
                <div class="review-question mb-3">
                    <strong>Q${index + 1}:</strong> ${question.question}
                    ${question.passage ? `<div class="text-muted small mt-2"><em>Comprehension Passage</em></div>` : ''}
                </div>

                <div class="review-options">
                    ${Object.entries(question.options).map(([option, text]) => {
                        let optionClass = 'review-option p-2 mb-1 border rounded';
                        let icon = '';

                        if (option === question.correct_answer) {
                            optionClass += ' border-success bg-success-light';
                            icon = '<i class="fas fa-check-circle ms-2 text-success"></i>';
                        }

                        if (option === userAnswer) {
                            if (option === question.correct_answer) {
                                optionClass += ' border-success border-2';
                                icon = '<i class="fas fa-check-circle ms-2 text-success"></i> Your answer';
                            } else {
                                optionClass += ' border-danger border-2';
                                icon = '<i class="fas fa-times-circle ms-2 text-danger"></i> Your answer';
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
                    <div class="review-explanation mt-3 p-2 bg-light rounded">
                        <strong><i class="fas fa-lightbulb me-2 text-warning"></i>Explanation:</strong>
                        <p class="mb-0 mt-2">${question.explanation || 'No explanation available.'}</p>
                    </div>
                ` : `
                    <div class="review-explanation mt-3 p-2 bg-info-light rounded">
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
 * Format time from seconds to HH:MM:SS or MM:SS
 */
function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
}

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
                is_admin: AppState.currentUser.is_admin,
                has_access: AppState.currentUser.has_access
            };
        }
        return { active: false };
    }
}

// ==================== ACTIVATION SYSTEM ====================

/**
 * Show activation modal
 */
function showActivationModal(force = false) {
    const modal = new bootstrap.Modal(document.getElementById('activationModal'));
    
    // V5: If forcing (trial expired), make sure modal shows
    if (force) {
        // Ensure activation code field is empty
        const activationCodeInput = document.getElementById('activationCode');
        if (activationCodeInput) {
            activationCodeInput.value = '';
            activationCodeInput.focus();
        }
        
        // Show expiration message
        const modalBody = document.querySelector('#activationModal .modal-body');
        if (modalBody) {
            const warningHtml = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    <strong>Your free trial has expired!</strong>
                    <p class="mb-0 mt-2">You must activate your account to continue using MSH CBT HUB.</p>
                </div>
            `;
            
            // Insert warning at the top
            const firstChild = modalBody.firstChild;
            if (firstChild && !firstChild.classList.contains('alert-danger')) {
                modalBody.insertAdjacentHTML('afterbegin', warningHtml);
            }
        }
    }
    
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
            
            // Update user status
            AppState.currentUser.status = 'activated';
            AppState.currentUser.is_activated = true;
            AppState.currentUser.has_access = true; // V5.2 FIX: Restore access
            
            // V5: Save to localStorage and CLEAR expired trial marker
            saveUserDataToStorage(AppState.currentUser);
            localStorage.removeItem(AppState.localStorageKeys.TRIAL_EXPIRED);
            
            // Clear trial timer
            if (AppState.trialTimer) {
                clearInterval(AppState.trialTimer);
                AppState.trialTimer = null;
            }
            
            // Clear trial timer state
            AppState.trialTimerState = {
                startTime: null,
                elapsedSeconds: 0,
                lastUpdate: null,
                isRunning: false,
                hasExpired: false
            };
            
            // Clear trial timer from localStorage
            localStorage.removeItem(AppState.localStorageKeys.TRIAL_TIMER);
            
            // Reload dashboard
            loadDashboard();
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
    
    // V5.1 FIX: Admin button handling
    if (e.target.closest('.admin-link') || e.target.closest('[href*="/admin"]')) {
        e.preventDefault();
        // Check if user is admin
        if (AppState.currentUser && AppState.currentUser.is_admin) {
            window.location.href = '/admin';
        } else {
            showNotification('Access denied. Admin only!', 'error');
        }
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

    const { percentage, examType } = AppState.examResults;
    const message = `*I just scored ${percentage}% in my ${examType} practice test on MSH CBT HUB🎓! 🧠🔥*\n\nThink you can beat me?\nTest your knowledge too 👉 🔗*Try now:* https://mshcbthub.onrender.com`;
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
 * Retake exam - V5 FIX: Proper exam restart
 */
function retakeExam() {
    if (!AppState.examResults) return;
    
    if (confirm('Start a new exam with different questions?')) {
        // Clear previous exam state
        AppState.currentExam = null;
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
    loadDashboard,
    loadAdminDashboard,
    // V5: Export localStorage functions
    saveToLocalStorage,
    loadFromLocalStorage,
    syncBrowserDataToServer,
    // V5: Export trial timer functions
    startOfflineTrialTimer,
    pauseTrialTimer,
    resumeTrialTimer,
    // V5: Export trial check function
    isTrialExpiredPermanently
};

console.log('📚 MSH CBT HUB Enhanced JavaScript V5.2 Loaded');
console.log('✅ V5.2 Features:');
console.log('   ✅ FIXED: Trial Expiry Behavior - Users can login but only access activation page');
console.log('   ✅ FIXED: Access Control - Expired trial users can ONLY access activation');
console.log('   ✅ FIXED: Recent Activity Duplication - Shows unique activities only');
console.log('   ✅ FIXED: Admin Dashboard Button - Now opens /admin route correctly');
console.log('   ✅ FIXED: JAMB Results - No more disappearing results');
console.log('   ✅ ADDED: localStorage Support - Data persists across sessions');
console.log('   ✅ ADDED: Offline Trial Timer - Tracks time even when offline');
console.log('   ✅ ENHANCED: Permanent Trial Expiry - 1-hour trial CANNOT restart');
console.log('   ✅ ENHANCED: Activation Required - User MUST activate after trial');
