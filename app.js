		
        import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
        import { getAuth, signInAnonymously, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
        import { getFirestore, doc, setDoc, getDoc, onSnapshot, collection, addDoc, query, deleteDoc, updateDoc, setLogLevel, getDocs, serverTimestamp, orderBy, limit, writeBatch, increment, where } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
        import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-functions.js";

        // --- Firebase Initialization and Auth ---
        const firebaseConfig = {
          apiKey: "AIzaSyCCsU4YY_Rwqo-F9KJjeOOSD4NpUGLNq8s",
          authDomain: "tools-a180f.firebaseapp.com",
          projectId: "tools-a180f",
          storageBucket: "tools-a180f.firebasestorage.app",
          messagingSenderId: "195275159442",
          appId: "1:195275159442:web:20031fd5ccf0428162334b",
          measurementId: "G-TP0VKGV0EE"
        };
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'my-tools-app';
        const safeAppId = appId.replace(/[:\/]/g, '-');

        // Initialize Firebase
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);
        const functions = getFunctions(app); 
        setLogLevel('debug');

		const ADMIN_EMAIL = "pabarca@google.com"; // REPLACE THIS with your email
        
        // --- Global State Variables ---
        let workshopResponsesCache = [];
        let workshopUnsubscribe = null;
        let clipboardToastTimeout = null;
        let editingArticleId = null; 
        let currentPolicyId = null;		
        let currentPolicyTimestamp = 0;		
        let globalKnowledgeCache = []; // Stores the "Brain" locally
        let currentAdminUser = null;	
        let categories = {};
        let activeCategory = '';
        let userId = null;
        let isAnonymous = true;
        let responseToDeleteId = null;
        let categoryToEdit = null;
        let currentPage = 'canned-responses';
        let userName = '';
        let currentTextToCopy = '';
        let currentEditingId = null;
        let openCategoryMenu = null;
        let editingLinkDocId = null;
        let openMenuId = null;
        let defaultLinks = [];
        let cannedResponsesUnsubscribe = null;
        let helpfulLinksUnsubscribe = null;
        let userLinks = [];
        let renderedStaticLinks = false;
        let isSubmittingLink = false;
        let isTutorialActive = false;	
        let currentResponseToCopyId = null; 
        let currentResponseToCopyCategory = null; 
        let statsChart = null; 	
        let shownAchievements = new Set();	
        let categoryChartInstance = null;
        let activityChartInstance = null;
        let firstSignIn = null; 		
        let audioUnlocked = false;
        let userLevelData = { level: 0, xp: 0 };
        let masterBlueprintVersion = 1;
        let lastCopyTimestamps = {};
        let activeAchievementFilter = 'all';		
        let profileChartInstance = null;	
        let messageTimeout = null;
        let trackedChallengeId = null;
        let notificationQueue = [];
        let isNotificationActive = false;
        let expandedChartInstance = null; // <--- ADD THIS LINE HERE
        let expandedChartEvents = [];     // <--- AND THIS ONE
        let cachedStatsEvents = null; // Tell the app this hasn't been loaded yet
        let cachedStatsUserData = null;
        let hasLoadedStats = false; // Prevents re-running the heavy logic
        let currentLeaderboardView = 'all';
        let sessionStartTime = null;
        let isSilencingUpdates = false; // New flag to stop flickering
        let lastProcessedClipboard = "";		
        let isDataLoaded = false; // NEW: The Vault Door Lock		
        let isReorderingResponses = false;
        let sortableCategoryInstance = null;
        let sortableResponseInstance = null;	
	


const initSmartClipboard = () => {
    // 1. The Trigger: When the window gains focus (user tabs back in)
    window.addEventListener('focus', async () => {
        // Only run if user is logged in
        if (!userId || isAnonymous) return;

        try {
            // 2. Read Clipboard
            const text = await navigator.clipboard.readText();

            // 3. Logic Filter: Don't process if empty or same as last time
            if (!text || text === lastProcessedClipboard) return;

            // 4. Regex Match (Using your existing FedEx pattern)
            const fedexRegex = /(?:78\d{10}|79\d{10}|80\d{10}|81\d{10}|82\d{10}|(?:96\d{20}|96\d{32}|\d{15}|\d{12}))/g;
            const matches = text.match(fedexRegex) || [];
            const uniqueMatches = [...new Set(matches)];

            // 5. Threshold Check: Must be > 1 number
            if (uniqueMatches.length > 1) {
                showClipboardToast(uniqueMatches);
                lastProcessedClipboard = text; // Mark as "seen"
            }

        } catch (err) {
            // This usually happens if the user denies permission or browser blocks it
            console.log("Clipboard access denied or empty:", err);
        }
    });
};
		
const showClipboardToast = (numbers) => {
    const toast = document.getElementById('clipboard-toast');
    const textEl = document.getElementById('clipboard-toast-text');
    
    // Safety check just in case
    if (!toast || !textEl) return;

    if (clipboardToastTimeout) clearTimeout(clipboardToastTimeout);

    textEl.textContent = `Found ${numbers.length} numbers. Click to process.`;
    toast.classList.add('visible');

    const newToast = toast.cloneNode(true);
    toast.parentNode.replaceChild(newToast, toast);
    
    clipboardToastTimeout = setTimeout(() => {
        newToast.classList.remove('visible');
    }, 8000); 

    newToast.addEventListener('click', async (e) => {
        if (clipboardToastTimeout) clearTimeout(clipboardToastTimeout);

        // --- 1. THE CORE ACTIONS ---
        const numbersToCopy = numbers.join('\t');
        await copyToClipboard(numbersToCopy);

        const numbersForUrl = numbers.join(',');
        const encodedNumbers = encodeURIComponent(numbersForUrl);
        const fedexUrl = `https://www.fedex.com/en-us/tracking.html?tracknumbers=${encodedNumbers}`;
        window.open(fedexUrl, '_blank');

        // --- 2. LOG CHALLENGE PROGRESS ---
        logUserEvent('extract_tracking', { count: numbers.length });
        await awardXP(XP_VALUES.FEDEX_TRACKING, 'Smart Extraction');
        
        if (currentPage === 'my-stats') renderAdvancedStats();

        // --- 3. HIDE TOAST & SHOW SUCCESS ---
        newToast.classList.remove('visible');
        showMessage(`Processed ${numbers.length} numbers!`, 'success');

        // --- 4. THE COOL PART: INJECT INTO "SUGGESTED NEXT STEP" BOX ---
        const suggestions = getShippingSuggestions(); 
        
        // Only inject if we have suggestions AND we are on the Canned Responses page
        if (suggestions.length > 0 && currentPage === 'canned-responses') {
            const container = document.getElementById('smart-suggestions-wrapper');
            const list = document.getElementById('smart-suggestions-list');
            const timeLabel = document.getElementById('time-of-day-label');
            const icon = container.querySelector('i.fa-sparkles') || container.querySelector('i');

            // Style the box for Logistics Focus (Orange theme)
            timeLabel.textContent = "Logistics Focus";
            timeLabel.className = "text-orange-400 font-bold";
            if(icon) {
                icon.className = "fas fa-truck-fast text-orange-400 text-sm animate-pulse";
            }
            
            // Swap border colors to match the theme
            container.querySelector('.floating-card').classList.remove('border-emerald-500/30', 'border-blue-500/30');
            container.querySelector('.floating-card').classList.add('border-orange-500/30');

            list.innerHTML = ''; // Clear current suggestions

            suggestions.forEach(res => {
                const btn = document.createElement('div');
                btn.className = 'bg-gray-800 border border-gray-700 hover:border-orange-500/50 hover:bg-gray-700 rounded-xl p-3 cursor-pointer transition-all duration-200 group relative overflow-hidden shadow-lg transform hover:translate-x-1';

                btn.innerHTML = `
                    <div class="relative z-10 flex flex-col h-full justify-between">
                        <div>
                            <div class="flex justify-between items-center mb-1">
                                <span class="text-[10px] uppercase font-bold text-gray-500 tracking-wider">${res.categoryName}</span>
                            </div>
                            <h4 class="font-bold text-gray-200 text-sm group-hover:text-white truncate">${res.label || 'Untitled'}</h4>
                        </div>
                        <div class="mt-2 flex items-center text-[10px] text-gray-500 gap-2 border-t border-gray-700/50 pt-2">
                            <i class="fas fa-truck text-orange-400/70"></i>
                            <span>Recommended for shipping</span>
                        </div>
                    </div>
                `;

                // Handle click on the new suggestion
                btn.addEventListener('click', () => {
                    processAndCopy(res.text, res.id, res.categoryName);
                    
                    // Flash Orange on Click
                    btn.classList.remove('bg-gray-800', 'hover:bg-gray-700');
                    btn.classList.add('bg-orange-900/50', 'border-orange-500');
                    
                    setTimeout(() => {
                        btn.classList.add('bg-gray-800', 'hover:bg-gray-700');
                        btn.classList.remove('bg-orange-900/50', 'border-orange-500');
                    }, 400);
                });

                list.appendChild(btn);
            });

            // Ensure the sidebar container is visible
            container.classList.remove('hidden');
        }
    });
};
// 1. Store the exact date the page was initially loaded
const sessionLoadedDate = new Date().toISOString().split('T')[0];

// 2. The Sensor: Tracks when you are actually looking at the tab
const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
        
        // --- NEW: The "New Day" Check ---
        const todayStr = new Date().toISOString().split('T')[0];
        
        // If today's date doesn't match the date the page was loaded...
        if (todayStr !== sessionLoadedDate) {
            // The user just clicked on the tab, and it's a new day! 
            // Refresh immediately and silently.
            window.location.reload(true);
            return; // Stop the rest of the function from running
        }
        // ---------------------------------

        sessionStartTime = Date.now();
        // Trigger the Smart Brain immediately when user returns
        updateSmartSuggestions();
    } else {
        if (sessionStartTime) {
            const durationMinutes = ((Date.now() - sessionStartTime) / 60000).toFixed(1);
            logUserEvent('session_end', { duration: parseFloat(durationMinutes) });
            sessionStartTime = null;
        }
    }
};

// 2. The Brain: Calculates specific suggestions based on hour/day
const getContextualSuggestions = (events) => {
    if (!events || events.length === 0) return [];

    const lastCopiedId = sessionStorage.getItem('last_copied_id');
    const suggestions = {}; // Stores scores: { responseId: score }

    // --- STRATEGY 1: SEQUENCE ANALYSIS (The "Next Step") ---
    if (lastCopiedId) {
        for (let i = 0; i < events.length - 1; i++) {
            const reaction = events[i];
            const trigger = events[i+1]; 
            
            if (trigger.type === 'copy' && trigger.responseId === lastCopiedId) {
                if (reaction.type === 'copy' && reaction.responseId) {
                    suggestions[reaction.responseId] = (suggestions[reaction.responseId] || 0) + 10;
                }
            }
        }
    }

    // --- STRATEGY 2: TIME ROUTINE (Fallback) ---
    const now = new Date();
    const currentHour = now.getHours();
    
    events.filter(e => e.type === 'copy').forEach(e => {
        if (!e.timestamp || !e.responseId) return;
        const eDate = e.timestamp.toDate();
        
        if (Math.abs(eDate.getHours() - currentHour) <= 1) {
            suggestions[e.responseId] = (suggestions[e.responseId] || 0) + 2;
        }
        if ((now - eDate) < 24 * 60 * 60 * 1000) {
            suggestions[e.responseId] = (suggestions[e.responseId] || 0) + 1;
        }
    });

    let results = Object.entries(suggestions)
        .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
        .map(([id]) => id)
        .filter(id => id !== lastCopiedId) // Try to filter out the last clicked
        .slice(0, 3);

    // --- STRATEGY 3: ULTIMATE FALLBACK (Most Popular Overall) ---
    if (results.length === 0) {
        const popular = {};
        events.filter(e => e.type === 'copy' && e.responseId).forEach(e => {
            popular[e.responseId] = (popular[e.responseId] || 0) + 1;
        });
        
        let backupResults = Object.entries(popular)
            .sort(([, countA], [, countB]) => countB - countA)
            .map(([id]) => id);
            
        // Try to show popular items, excluding what they just clicked
        results = backupResults.filter(id => id !== lastCopiedId).slice(0, 3);
        
        // THE FIX: If filtering makes it empty (e.g., they only ever test one response), just show it anyway so the box doesn't break!
        if (results.length === 0) {
            results = backupResults.slice(0, 3);
        }
    }

    return results;
};

// 3. The Renderer: Updates the UI
const updateSmartSuggestions = async () => {
    // Only run on the right page
    if (currentPage !== 'canned-responses' || !userId || isAnonymous) return;

    // Safety check for data
    if (!cachedStatsEvents || cachedStatsEvents.length === 0) {
         try {
            const q = query(getUserEventsCollectionRef(userId), orderBy('timestamp', 'desc'), limit(500));
            const snapshot = await getDocs(q);
            cachedStatsEvents = snapshot.docs.map(doc => doc.data());
        } catch (e) {
            console.error("Error fetching events for suggestions:", e);
            return;
        }
    }

    const topResponseIds = getContextualSuggestions(cachedStatsEvents);
    const container = document.getElementById('smart-suggestions-wrapper');
    const list = document.getElementById('smart-suggestions-list');
    const suggestionsCard = list.closest('.floating-card'); // Target the specific box
    const timeLabel = document.getElementById('time-of-day-label');
    const icon = container.querySelector('i.fa-sparkles'); 

    // --- FIX: Only hide the suggestions list, but keep the Magic Draft visible ---
    if (topResponseIds.length === 0) {
        if(suggestionsCard) suggestionsCard.classList.add('hidden');
        container.classList.remove('hidden'); 
        return;
    } else {
        if(suggestionsCard) suggestionsCard.classList.remove('hidden');
    }

    // --- DYNAMIC HEADER LOGIC ---
    const lastCopiedId = sessionStorage.getItem('last_copied_id');
    
    if (lastCopiedId) {
        // Mode: SEQUENCE (Green)
        timeLabel.textContent = "Suggested Next Step";
        timeLabel.className = "text-emerald-400 font-bold"; 
        if(icon) {
            icon.className = "fas fa-forward text-emerald-400 text-sm animate-pulse";
        }
        suggestionsCard.classList.add('border-emerald-500/30');
    } else {
        // Mode: ROUTINE (Blue/Default)
        const hour = new Date().getHours();
        let timeText = "Daily Routine";
        if (hour < 12) timeText = "Morning Routine";
        else if (hour < 17) timeText = "Afternoon Flow";
        
        timeLabel.textContent = timeText;
        timeLabel.className = "text-blue-400 font-bold";
        if(icon) {
            icon.className = "fas fa-history text-blue-400 text-sm";
        }
        suggestionsCard.classList.remove('border-emerald-500/30');
    }

    list.innerHTML = ''; 

    topResponseIds.forEach(id => {
        let foundResponse = null;
        let foundCategory = null;

        // Find the response data
        for (const [catName, catData] of Object.entries(categories)) {
            const match = catData.responses.find(r => r.id === id);
            if (match) {
                foundResponse = match;
                foundCategory = catName;
                break;
            }
        }

        if (foundResponse) {
            const btn = document.createElement('div');
            // Add hover animation
            btn.className = 'bg-gray-800 border border-gray-700 hover:border-emerald-500/50 hover:bg-gray-700 rounded-xl p-3 cursor-pointer transition-all duration-200 group relative overflow-hidden shadow-lg transform hover:translate-x-1';
            
            // Smart Label
            let contextLabel = "Commonly used now";
            if (lastCopiedId) contextLabel = "Often used next";

            btn.innerHTML = `
                <div class="relative z-10 flex flex-col h-full justify-between">
                    <div>
                        <div class="flex justify-between items-center mb-1">
                            <span class="text-[10px] uppercase font-bold text-gray-500 tracking-wider">${foundCategory}</span>
                            ${lastCopiedId ? '<i class="fas fa-link text-[10px] text-emerald-500/50"></i>' : ''}
                        </div>
                        <h4 class="font-bold text-gray-200 text-sm group-hover:text-white truncate">${foundResponse.label || 'Untitled'}</h4>
                    </div>
                    <div class="mt-2 flex items-center text-[10px] text-gray-500 gap-2 border-t border-gray-700/50 pt-2">
                        <i class="fas fa-magic ${lastCopiedId ? 'text-emerald-400/70' : 'text-blue-400/70'}"></i>
                        <span>${contextLabel}</span>
                    </div>
                </div>
            `;

            btn.addEventListener('click', () => {
                processAndCopy(foundResponse.text, foundResponse.id, foundCategory);
                
                // Flash Green on Click
                btn.classList.remove('bg-gray-800', 'hover:bg-gray-700');
                btn.classList.add('bg-emerald-900/50', 'border-emerald-500');
                
                setTimeout(() => {
                    btn.classList.add('bg-gray-800', 'hover:bg-gray-700');
                    btn.classList.remove('bg-emerald-900/50', 'border-emerald-500');
                }, 400);
            });

            list.appendChild(btn);
        }
    });

    container.classList.remove('hidden');
};

// 4. Activate Listeners
document.addEventListener('visibilitychange', handleVisibilityChange);
if (document.visibilityState === 'visible') sessionStartTime = Date.now();		

// --- 1. DEFINE THE FUNCTION HERE (Right after Global Variables) ---
const applyBackgroundTheme = (themeName) => {
    // Remove all possible theme classes
    document.body.classList.remove('theme-deep-space', 'theme-midnight', 'theme-nebula', 'theme-aurora');
    
    // Add the selected theme
    document.body.classList.add(themeName);
    
    // Save preference
    localStorage.setItem('backgroundTheme', themeName);

    // Update UI Buttons (Visual Feedback)
    const btns = document.querySelectorAll('.bg-theme-btn');
    if(btns.length > 0) {
        btns.forEach(btn => {
            btn.classList.remove('border-blue-500', 'border-teal-500', 'ring-2', 'ring-blue-500/50', 'ring-teal-500/50');
            btn.classList.add('border-gray-600');

            if (btn.dataset.theme === themeName) {
                const activeColor = themeName === 'theme-aurora' ? 'teal' : 'blue';
                btn.classList.remove('border-gray-600');
                btn.classList.add(`border-${activeColor}-500`, 'ring-2', `ring-${activeColor}-500/50`);
            }
        });
    }
};

// --- 2. INITIALIZE IT IMMEDIATELY ---
// This code runs right when the page loads
const savedPage = localStorage.getItem('lastVisitedPage');
if (savedPage) { currentPage = savedPage; }		

const storedTheme = localStorage.getItem('theme');
if (storedTheme === 'light') { document.body.classList.add('light-mode'); }

// Initialize Background Theme
const storedBgTheme = localStorage.getItem('backgroundTheme') || 'theme-deep-space';
applyBackgroundTheme(storedBgTheme);		

const openExpandedAchievements = () => {
    const modal = document.getElementById('expanded-chart-modal');
    const modalTitle = document.getElementById('expanded-chart-title');
    
    // Toggle Visibility
    document.getElementById('expanded-activity-controls').classList.add('hidden');
    document.getElementById('expanded-activity-stats').classList.add('hidden');
    document.getElementById('expanded-chart-canvas').classList.add('hidden'); // Hide Canvas
    
    // Show Achievement Specifics
    document.getElementById('expanded-achievements-controls').classList.remove('hidden');
    document.getElementById('expanded-achievements-controls').classList.add('flex');
    document.getElementById('expanded-achievements-grid').classList.remove('hidden');
    
    modalTitle.textContent = "Trophy Case";

    // Reset filters to 'All' visual state
    updateModalAchFilterUI('all');

    // Initial Render using Cached Data
    // We use 'all' filter and target the new grid ID
    renderFilteredAchievements(cachedStatsEvents, cachedStatsUserData, 'all', 'expanded-achievements-grid');

    // Show Modal Animation
    modal.classList.remove('hidden');
    void modal.offsetHeight; 
    modal.classList.add('modal-visible');
};

const updateModalAchFilterUI = (filter) => {
    const allBtn = document.getElementById('modal-ach-filter-all');
    const unlockedBtn = document.getElementById('modal-ach-filter-unlocked');
    
    if (filter === 'all') {
        allBtn.className = "px-4 py-2 rounded-full text-sm font-semibold bg-blue-600 text-white transition-all";
        unlockedBtn.className = "px-4 py-2 rounded-full text-sm font-semibold text-gray-400 hover:text-white transition-all";
    } else {
        unlockedBtn.className = "px-4 py-2 rounded-full text-sm font-semibold bg-blue-600 text-white transition-all";
        allBtn.className = "px-4 py-2 rounded-full text-sm font-semibold text-gray-400 hover:text-white transition-all";
    }
};		

const openExpandedChart = (sourceChartInstance, title, eventsData = null, chartType = 'generic') => {
    if (!sourceChartInstance) return;

    const modal = document.getElementById('expanded-chart-modal');
    const modalTitle = document.getElementById('expanded-chart-title');
    const ctx = document.getElementById('expanded-chart-canvas').getContext('2d');
    
    // 1. SHOW MODAL FIRST (Critical Fix: Canvas needs dimensions to render)
    modal.classList.remove('hidden');
    
    // 2. Reset UI State
    document.getElementById('expanded-chart-canvas').classList.remove('hidden');
    document.getElementById('expanded-achievements-controls').classList.add('hidden');
    document.getElementById('expanded-achievements-controls').classList.remove('flex');
    document.getElementById('expanded-achievements-grid').classList.add('hidden');

    // 3. Setup Controls
    const controlsDiv = document.getElementById('expanded-activity-controls');
    const statsDiv = document.getElementById('expanded-activity-stats');

    modalTitle.textContent = title;

    if (expandedChartInstance) expandedChartInstance.destroy();

    // --- CASE A: ACTIVITY CHART ---
    if (chartType === 'activity' && eventsData) {
        controlsDiv.classList.remove('hidden');
        controlsDiv.classList.add('flex');
        statsDiv.classList.remove('hidden');
        statsDiv.classList.add('grid');
        
        expandedChartEvents = eventsData;
        
        // RENDER NOW (Since modal is visible, this will work immediately)
        renderExpandedActivityChart('all');

        // Setup Filter Click Listeners
        const filterGroup = document.getElementById('modal-activity-filter-group');
        // cloneNode removal logic to prevent duplicate listeners
        const newFilterGroup = filterGroup.cloneNode(true);
        filterGroup.parentNode.replaceChild(newFilterGroup, filterGroup);
        
        newFilterGroup.addEventListener('click', (e) => {
            const btn = e.target.closest('.activity-filter-btn');
            if (btn) {
                newFilterGroup.querySelectorAll('.activity-filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderExpandedActivityChart(btn.dataset.period);
            }
        });

    } 
    // --- CASE B: GENERIC CHARTS ---
    else {
        controlsDiv.classList.add('hidden');
        controlsDiv.classList.remove('flex');
        statsDiv.classList.add('hidden');
        statsDiv.classList.remove('grid');

        // Logic for other charts...
        const config = sourceChartInstance.config;
        const newOptions = {
            ...config.options,
            maintainAspectRatio: false,
            responsive: true,
            plugins: {
                legend: { display: true, labels: { color: '#e5e7eb', font: { size: 14 } } }
            },
            scales: config.options.scales
        };

        expandedChartInstance = new Chart(ctx, {
            type: config.type,
            data: config.data,
            options: newOptions
        });
    }

    // 4. Trigger Animation (Fade In)
    // Small delay ensures the browser registers the display:block before fading opacity
    requestAnimationFrame(() => {
        modal.classList.add('modal-visible');
    });
};

// Internal function to handle rendering inside the modal
const renderExpandedActivityChart = (period) => {
    const ctxElement = document.getElementById('expanded-chart-canvas');
    if (!ctxElement) return;
    
    const ctx = ctxElement.getContext('2d');
    
    // 1. Process Data
    const processed = processActivityData(expandedChartEvents, period);

    // 2. Update Modal Stats text
    document.getElementById('modal-stats-total').textContent = processed.total.toLocaleString();
    document.getElementById('modal-stats-avg').textContent = processed.avg;
    document.getElementById('modal-stats-peak-date').textContent = processed.peakDate;
    document.getElementById('modal-stats-peak-count').textContent = processed.peakCount > 0 ? `${processed.peakCount} copies` : '--';

    // 3. Destroy old instance if it exists
    if (expandedChartInstance) expandedChartInstance.destroy();

    // 4. Create the Green Stock Market Gradient (Same as dashboard)
    const gradient = ctx.createLinearGradient(0, 0, 0, 400); // Taller gradient for the modal
    gradient.addColorStop(0, 'rgba(34, 197, 94, 0.5)'); // Green-500
    gradient.addColorStop(1, 'rgba(34, 197, 94, 0.0)');

    const isLightMode = document.body.classList.contains('light-mode');
    const textColor = isLightMode ? '#1f2937' : '#e5e7eb';
    const gridColor = isLightMode ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)';

    // 5. Render as LINE Chart
    expandedChartInstance = new Chart(ctx, {
        type: 'line', // <--- CHANGED FROM 'bar' TO 'line'
        data: {
            labels: processed.labels,
            datasets: [{
                label: 'Copies',
                data: processed.data,
                // --- GREEN STYLING MATCH ---
                borderColor: '#22c55e',       
                backgroundColor: gradient,    
                borderWidth: 3,
                pointBackgroundColor: '#111827', // Dark background for points
                pointBorderColor: '#22c55e',
                pointBorderWidth: 2,
                pointHoverBackgroundColor: '#22c55e',
                pointHoverBorderColor: '#fff',
                pointRadius: 4, // Slightly larger points for the expanded view
                pointHoverRadius: 8,
                fill: true,                   
                tension: 0.4 // Smooth curves
            }]
        },
        options: {
            maintainAspectRatio: false,
            responsive: true,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                x: { 
                    ticks: { color: textColor, maxRotation: 45, minRotation: 0 }, 
                    grid: { color: gridColor, display: false } // Hide X grid for cleaner look
                },
                y: { 
                    beginAtZero: true, 
                    ticks: { color: textColor }, 
                    grid: { color: gridColor, borderDash: [5, 5] } // Dashed grid lines
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    titleColor: '#22c55e', // Green title
                    bodyColor: '#fff',
                    borderColor: 'rgba(34, 197, 94, 0.3)',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        title: function(context) {
                            // Show full date in tooltip
                            const dateIndex = context[0].dataIndex;
                            const originalDateStr = processed.rawSortedDates[dateIndex]; 
                            if(originalDateStr) {
                               const d = new Date(originalDateStr + 'T00:00:00');
                               return d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                            }
                            return context[0].label;
                        },
                        label: function(context) {
                            return `${context.parsed.y} Copies`;
                        }
                    }
                }
            }
        }
    });
};

const closeExpandedChart = () => {
    const modal = document.getElementById('expanded-chart-modal');
    
    if (modal) {
        // 1. Remove the visible class to trigger the fade-out/zoom-down animation
        modal.classList.remove('modal-visible');

        // 2. Wait for the CSS transition (0.3s) to finish before adding display:none
        setTimeout(() => {
            modal.classList.add('hidden');
            
            // Clean up chart after animation is done
            if (expandedChartInstance) {
                expandedChartInstance.destroy();
                expandedChartInstance = null;
            }
        }, 300); // This must match the CSS transition time (0.3s)
    }
};


// --- CONFIG: Smart Synonym Dictionary ---
const SYNONYM_MAP = {
    // Identity & Hierarchy
    'user': ['customer', 'requester', 'employee', 'client', 'noogler'],
    'escalate': ['manager', 'supervisor', 'lead', 'boss', 'route', 'director'],
    'name': ['identity', 'who'],

    // Hardware & Assets
    'asset': ['device', 'hardware', 'equipment', 'item', 'laptop', 'phone', 'machine', 'unit', 'model', 'computer', 'cellphone', 'pixel', 'chromebook', 'macbook'],
    'accessory': ['monitor', 'headset', 'keyboard', 'security key', 'power adapter', 'usb-c', 'peripheral', 'arms'],
    'identifier': ['tag', 'id', 'serial', 'number', 'sticker', 'asset tag', 'serial number', 'sn', 's/n', 'tracking number', 'sto', 'bug id', 'mid', 'project code'],

    // Logistics & Locations
    'logistics': ['fedex', 'shipment', 'tracking', 'delivery', 'package', 'mail', 'mail room', 'transit', 'waybill', 'dispatch', 'carrier', 'track'],
    'return': ['send back', 'rma', 'collection', 'drop off', 'revert', 'return kit', 'recovery', 'retrieve', 'mail back'],
    'location': ['desk', 'site code', 'locker', 'vending machine', 'piktime', 'onsite', 'remote', 'address'],
    'packaging': ['box', 'tape', 'bubble wrap', 'mailer', 'shipping materials', 'supplies', 'uline', 'return label', 'kimwipes'],

    // Support & Actions
    'ticket': ['case', 'request', 'incident', 'order', 'bug', 'guts', 'bronco', 'support ticket', 'transfer order'],
    'contact': ['reach out', 'email', 'message', 'ping', 'call'],
    'repair': ['break/fix', 'service call', 'ricoh', 'technician', 'troubleshooting', 'issue', 'dss', 'maintenance', 'av', 'audio'],

    // Status & Outcomes
    'status': ['pending', 'delayed', 'out of stock', 'canceled', 'shipped', 'duplicate'],
    'resolved': ['closed', 'completed', 'finished', 'done', 'fixed', 'delivered', 'arrived', 'received', 'signed for'],

    // IT Specifics
    'penalty': ['chargeback', 'cost center', 'corporate access', 'restriction', 'lost', 'stolen'],
    'infrastructure': ['netblock', 'ip address', 'subnet', 'vlan'],
    'disposal': ['e-waste', 'iron mountain', 'wisetek', 'recycling', 'disposition', 'vendor']
};
		
// --- NEW: Leveling System Configuration ---		
const XP_VALUES = {
    COPY_RESPONSE: 25,
    CREATE_RESPONSE: 50,
    CREATE_CATEGORY: 100,
    UNLOCK_ACHIEVEMENT: 1000,
	FEDEX_TRACKING: 50,
	WEEKLY_WINNER: 2000,
    MONTHLY_WINNER: 5000
};

const BASE_XP = 100; // XP needed for level 1
const XP_INCREASE_FACTOR = 1.2; // Every other level needs 20% more XP

const LEVEL_RANKS = [
    { level: 0, name: "Newbie", icon: "fa-seedling" },
    { level: 20, name: "Apprentice", icon: "fa-book-reader" },
    { level: 30, name: "Journeyman", icon: "fa-pencil-ruler" },
    { level: 40, name: "Artisan", icon: "fa-hammer" },
    { level: 50, name: "Expert", icon: "fa-star" },
    { level: 60, name: "Master", icon: "fa-trophy" },
    { level: 70, name: "Grandmaster", icon: "fa-crown" },
    { level: 80, name: "Legend", icon: "fa-dragon" },
    { level: 90, name: "Demigod", icon: "fa-bolt" },
    { level: 100, name: "Deity", icon: "fa-sun" } 
];

// Add this new function to your helper functions section
const updateLeaderboardData = async (uid, levelInfo) => {
    if (!uid || isAnonymous) return; // Don't run for anonymous users

    const leaderboardDocRef = doc(db, "leaderboard", uid);
    try {
        const user = auth.currentUser;
        if (!user) return;

        const dataToSet = {
            displayName: user.displayName || 'Anonymous User',
            xp: levelInfo.totalXp,
            level: levelInfo.level,
            rankName: levelInfo.rankName,
            rankIcon: levelInfo.rankIcon,
            memberSince: user.metadata.creationTime ? new Date(user.metadata.creationTime) : serverTimestamp()
        };

        await setDoc(leaderboardDocRef, dataToSet, { merge: true });
    } catch (error) {
        console.error("Error updating leaderboard:", error);
    }
};
		
// Function to darken a color for light mode backgrounds
function lightenColor(hexColor) {
    // Remove the '#' if it exists
    const hex = hexColor.replace('#', '');
    
    // Convert hex to R, G, B
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    // Find the max and min RGB values
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    
    // Convert RGB to HSL
    let h, s, l = (max + min) / 255 / 2;
    
    if (max === min) {
        h = s = 0; // Achromatic
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        
        switch(max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        
        h /= 6;
    }
    
    // Increase lightness for light mode (e.g., to 90% or 95%)
    let newL = Math.min(l + 0.5, 0.95); // Ensure it's not too light
    
    // Convert back to RGB
    let newR, newG, newB;
    if (s === 0) {
        newR = newG = newB = newL; // Achromatic
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        const q = newL < 0.5 ? newL * (1 + s) : newL + s - newL * s;
        const p = 2 * newL - q;
        newR = hue2rgb(p, q, h + 1/3);
        newG = hue2rgb(p, q, h);
        newB = hue2rgb(p, q, h - 1/3);
    }
    
    // Convert RGB back to hex
    const toHex = (c) => {
        const hex = Math.round(c * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    
    return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
}




// --- Master Blueprint Data for Initialization ---
const defaultCannedResponsesBlueprint = {
    'BRONCO': {
        color: '#32789C',
        responses: [
            { id: 'bronco-1', label: 'NON ACTIONABLE ORDER', text: 'Hello [Customer\'s Name],\n\nThank you for your request for a [Hardware Name]. Unfortunately, this item is currently out of stock.\n\nWe will place your ticket in pending hardware. The estimated wait time is 1-4 weeks, though it may be longer due to potential delays. We will provide an update as soon as the item is available.\n\nAs an alternative we have a [Substitution Hardware Name] in stock and ready to deploy. Please let us know if this works for you or if you prefer to wait.\n\nIf you have any other questions or concerns, please do not hesitate to contact me.\n\nKind regards,\n\n[Name]', isPinned: false, createdAt: new Date().toISOString(), isDefault: true, version: 1},
            { id: 'bronco-2', label: 'ACTIONABLE ITEM RESPONSE', text: 'Hello [Customer\'s Name],\n\nWe have received your request for [Asset/Accessory].\n\nWe expect that your order will be ready for delivery within the next 1-2 business days. If anything changes, we will reach back out to you with further updates.\n\nPlease let us know if you have any questions.\n\nThank you\n\n[Name]', isPinned: false, createdAt: new Date().toISOString(), isDefault: true, version: 1 },
            { id: 'bronco-3', label: 'OUT FOR DELIVERY RESPONSE', text: 'Hello [Customer\'s Name],\n\nYour order will ship today or the next business day, depending on FedEx\'s pickup schedule. You can track your shipment with FedEx Tracking [TrackingNumber].\n\nPlease make sure to check your local Mail room once this order is marked delivered.\n\nPlease note that once the order is delivered, we are unable to see and respond to updates in the order.\n\nIf you need further help, please submit a request through go/stuff by selecting “Have questions about your order?”, or by opening a ticket at go/emt-request.\n\nThank you,\n\n[Name]', isPinned: false, createdAt: new Date().toISOString(), isDefault: true, version: 1},
            { id: 'bronco-4', label: 'ITEM DELIVERED', text: 'Hello [Customer\'s Name],\n\nI have delivered the [Device Model] to your desk location [Desk Location], as noted on MOMA, today [Date].\n\nPlease note that once the order is delivered, we are unable to see and respond to updates in the order.\n\nIf you need further help, please submit a request through go/stuff by selecting “Have questions about your order?”, or by opening a ticket at go/emt-request.\n\nThank you,\n\n[Name]', isPinned: false, createdAt: new Date().toISOString(), isDefault: true, version: 1 },
            { id: 'bronco-5', label: 'SECURITY KEY DELIVERED', text: 'Hello [Customer\'s Name],\n\nYour security key order has been delivered to your desk location [Desk Location], as noted on MOMA, today [Date]. Please be sure to follow the Techstop security key setup instructions at go/setup-sk.\n\nPlease note that once the order is delivered, we are unable to see and respond to updates in the order.\n\nIf you need further help, please submit a request through go/stuff by selecting “Have questions about your order?”, or by opening a ticket at go/emt-request.\n\nThank you,\n\n[Name]', isPinned: false, createdAt: new Date().toISOString(), isDefault: true, version: 1 },
            { id: 'bronco-6', label: 'PIKTIME', text: 'Hello [Customer\'s Name],\n\nThank you for your request.\n\nWe\'ve prepared your order and it will be ready for you to pick up at your confirmed appointment time.\n\nPick-up Location: https://floorscope.googleplex.com/US-LAX-BIN2-1#US-LAX-BIN2-1-100 (Please knock on our door when you arrive to pick up your order.)\n\nKind regards,\n\n[Name]', isPinned: false, createdAt: new Date().toISOString(), isDefault: true, version: 1 },
            { id: 'bronco-7', label: 'PIKTIME DELIVERED', text: 'Hello [Customer\'s Name],\n\nYour order for a [Device Model] was successfully picked up on [Date]. Thanks for stopping by!\n\nWe will now mark this order delivered.\n\nKind regards,\n\n[Name]', isPinned: false, createdAt: new Date().toISOString(), isDefault: true, version: 1 },
            { id: 'bronco-8', label: 'PIKTIME CANCELLED', text: 'Hello [Customer\'s Name],\n\nThis is to inform you that your order has been canceled. This is due to the failure to pick up the order at the confirmed date and time of your appointment.\n\nKind regards,\n\n[Name]', isPinned: false, createdAt: new Date().toISOString(), isDefault: true, version: 1 },
			{ id: 'bronco-9', label: 'Remote Security Key Delivery', text: 'Hello [Customer\'s Name],\n\nYour Security Key order has shipped. When the order arrives, please be sure to follow the Techstop Security Key setup instructions at go/setup-sk and Enroll: go/sl-enroll\n\nYou can track your shipment with the following FedEx tracking Number: [TrackingNumber]\n\nPlease view this tracking number for updates about your delivery, and expect an update once the package has been delivered.\n\nPlease note that once the order is delivered, we are unable to see and respond to updates in the order. If you need further help, please submit a request through go/stuff by selecting “Have questions about your order?”, or by opening a ticket at go/emt-request.\n\nKind regards,\n\n[Name]', isPinned: false, createdAt: new Date().toISOString(), isDefault: true, version: 1 },
			{ id: 'bronco-10', label: 'REMOTE ORDER DELIVERED', text: 'Hello [Customer\'s Name],\n\nAccording to the FedEx tracking Number your order has been delivered:\n\n[FedEx Tracking] - [Screenshot]\n\nReminder:\n\nOnce the order is marked delivered, please retrieve the package. On-site users should check their local Mailroom, and remote users should check their mailbox or door.\n\nPlease note that once the order is delivered, we are unable to see and respond to updates in the order.\n\nIf you need further help, please submit a request through go/stuff by selecting "Have questions about your order?", or by opening a ticket at go/emt-request.\n\nKind regards,\n\n[Name]', isPinned: false, createdAt: new Date().toISOString(), isDefault: true, version: 1 },
			{ id: 'bronco-11', label: 'Sulafat GID8 Bluetooth Headset Delivered', text: 'Hello [Customer\'s Name],\n\nI have delivered the Sulafat GID8 Bluetooth Headset to your desk location [Desk Location], as noted on MOMA, today [Date].\n\nIf the GID8 Headset arrives broken, file a bug at go/gid8-bug.\n\nIf the GID8 Headset does not arrive or is stolen upon arrival, file a GUTS ticket at go/emt-ticket to deploy a new headset. We will request delivery information in the ticket.\n\nPlease note that once the order is delivered, we are unable to see and respond to updates in the order.\n\nIf you need further help, please submit a request through go/stuff by selecting "Have questions about your order?", or by opening a ticket at go/emt-request.\n\nKind regards,\n\n[Name]', isPinned: false, createdAt: new Date().toISOString(), isDefault: true, version: 1 }

        ]
    },
    'PAR': {
        color: '#242020',
        responses: [
            { id: 'par-1', label: 'PAR REMOTE ORDER', text: 'Hello [Customer\'s Name],\n\nYour shipping materials have been sent for your return order\n\nFedEx Tracking: [TrackingNumber]\nReturn Tracking: [ReturnTrackingNumber]\n\nKind regards,\n\n[Name]', isPinned: false, createdAt: new Date().toISOString(), isDefault: true, version: 1 },
            { id: 'par-2', label: 'PAR SHIPPING MATERIALS DELIVERED', text: 'Hello [Customer\'s Name],\n\nAccording to the FedEx tracking number, the shipping Materials were delivered on [Date].\n\nScreenshot:\n\nAs a reminder, per Google’s device return policy, you have 10 business days to complete your return. If you still have your device after the return window, this device will lose corporate access and your cost center will be charged back after 40 days.\n\nBest regards,\n\n[Name]', isPinned: false, createdAt: new Date().toISOString(), isDefault: true, version: 1 },
            { id: 'par-3', label: 'PAR STUFF LOCKER', text: 'Hello [Customer\'s Name],\n\nThank you for submitting your return request.\n\nWe\'ll retrieve your asset from the Stuff Station return locker as soon as it\'s dropped off.\n\nJust a friendly reminder: you have 10 business days from the creation date of this order to place your asset in the return locker. If it\'s not dropped off within this time frame, your return order will be automatically canceled.\n\nKind regards,\n\n[Name]', isPinned: false, createdAt: new Date().toISOString(), isDefault: true, version: 1 },
			{ id: 'par-4', label: 'CANCEL RETURN LOCKER ORDER', text: 'Please be advised that your return order has been canceled. The cancellation is due to the item not being deposited in the designated return locker within the required timeframe.\n\nTo proceed with a return, a new request will need to be submitted.', isPinned: false, createdAt: new Date().toISOString(), isDefault: true, version: 1 },
			{ id: 'par-5', label: 'PAR CONFIRMING DATE PICK-UP', text: 'Hello [Customer\'s Name],\n\nThank you for your return request.\n\nYour pickup has been scheduled for [Date]. To make the collection as easy as possible, please have the item ready on your desk in a clear and visible location.\n\nPlease note that a technician will arrive on the scheduled date to collect the asset. If anything changes or you have any questions before then, please let us know.\n\nKind regards,\n\n[Name]', isPinned: false, createdAt: new Date().toISOString(), isDefault: true, version: 1 },
			{ id: 'par-6', label: 'ASSET NOT FOUND AT DESK LOCATION', text: 'Hello [Customer\'s Name],\n\nWe\'re reaching out about your recent return order. When we checked the desk location provided, [Desk Location], we were unable to find the asset, [Asset Tag], associated with your return request.\n\nTo help us resolve this, could you please confirm the current location of the asset?\n\nThank you for your help.\n\nKind regards,\n\n[Name]', isPinned: false, createdAt: new Date().toISOString(), isDefault: true, version: 1 },
			{ id: 'par-7', label: 'CANCEL REMOTE PAR', text: 'Please be advised that your return order has been canceled.\n\nThe cancellation is due to the return asset not being shipped back to us after the return shipping materials were provided to you. We did not receive the item within the 10 business day limit.\n\nTo proceed with a return, you will need to submit a new return request.', isPinned: false, createdAt: new Date().toISOString(), isDefault: true, version: 1 },
            { id: 'par-8', label: 'PAR REMOTE ORDER', text: 'Hello [Customer\'s Name],\n\nThe return kit, which includes a box and a pre-paid return label, has been shipped.\n\n1. Tracking Information\nPlease use the following numbers to track your package:\n\nInbound Kit Tracking (Box arrival): [TrackingNumber]\n\nReturn Label Tracking (Your shipment back to us): [ReturnTrackingNumber]\n\n2. Return Instructions\nOnce the box arrives, please follow these steps:\n\nPack: Place your device securely inside the box.\n\nLabel: Attach the included pre-paid return label to the outside.\n\nShip: Drop the sealed package off at any FedEx location.\n\nRequired Action:\nYou must ship the device back within 10 business days of the kit\'s delivery. Failure to meet this deadline will result in the closure of the return order.\n\nThank You,\n\n[Name]', isPinned: false, createdAt: new Date().toISOString(), isDefault: true, version: 1 },
			{ id: 'par-9', label: 'PAR SHIPPING MATERIALS DELIVERED', text: 'Hello [Customer\'s Name],\n\nAccording to the FedEx tracking number, the shipping Materials were delivered on [Date].\n\nScreenshot: [ScreenshotLink]\n\nAs a reminder, per Google’s device return policy, you have 10 business days to complete your return starting the day you received the shipping materials. If you still have your device after the return window, this device will lose corporate access and your cost center will be charged back after 40 days.\n\nBest Regards,\n\n[Name]', isPinned: false, createdAt: new Date().toISOString(), isDefault: true, version: 1 }
        ]
    },
    'GUTS': {
        color: '#014B34',
        responses: [
            { id: 'guts-1', label: 'GNG LOCKERS PROACTIVE TICKET', text: 'The GNG lockers contain [Number] loaners and [Number2] empty slots.\n\nScreenshot:\n\nThis ticket will be marked resolved.\n\nKind regards,\n\n[Name]', isPinned: false, createdAt: new Date().toISOString(), isDefault: true, version: 1 },
            { id: 'guts-2', label: 'GUTS STUFF STATION VENDING', text: 'The stuff station vending machine has been replenished .\n\nScreenshot:\n\nThis ticket will now be resolved.\n\nKind regards,\n\n[Name]', isPinned: false, createdAt: new Date().toISOString(), isDefault: true, version: 1 },
            { id: 'guts-3', label: 'Remote Return Shipment Information', text: 'Your request has been prepped and ready to ship. Feel free to reach out to us if you need more assistance. (1 Box Sent)\n\nFedEx Tracking:[TrackingNumber]\nReturn Tracking:[ReturnTrackingNumber]\n\nAs a reminder, per Google’s device return policy, you have 14 days (10 business days) to complete your return. If you still have your device after the return window, this device will lose corporate access and your cost center will be charged.\n\nWe will send a reminder in 3 business days if we haven\'t received your return by then.\n\nI’ll set this ticket to Pending Hardware Return while we wait for delivery.\n\nKind regards,\n\n[Name]', isPinned: false, createdAt: new Date().toISOString(), isDefault: true, version: 1 },
            { id: 'guts-4', label: 'Resolution For Lost Device', text: 'After conducting a search for [Asset Number] - [Device Model], I have concluded that this device is lost and I updated our records to reflect this.\n\nThe following actions were taken to search for this device:\n1:\n2:\n3:\n\nSince no further actions are needed, I will resolve this ticket now. Please feel free to reach out if you have any further questions regarding this request.\n\nKind regards,\n\n[Name]', isPinned: false, createdAt: new Date().toISOString(), isDefault: true, version: 1 },
            { id: 'guts-5', label: 'Exit Onsite Collection Information', text: 'Thank you for confirming that your [Asset Number] - [Device Model] is ready for pickup on [Date].\n\nI will set this ticket to Pending Date of Event until the collection date, and I will update the ticket again when the collection is in progress.\n\nIn the meantime, please let me know if you have any further questions regarding this request.\n\nKind regards,\n\n[Name]', isPinned: false, createdAt: new Date().toISOString(), isDefault: true, version: 1 },
            { id: 'guts-6', label: 'Onsite Collection That Was Not Found/Not Ready for Pick Up', text: 'I just want to follow up because we visited [Desk Location] and your [Device Model] Asset Number [Asset Number] was not ready for collection.\n\nCan you please confirm a new collection date and the correct pick up location site code?\n\nAs a reminder, you have [Number] business days remaining to complete your return. If you do not complete your return in [Number] business days this request will be closed, and your device will lose corporate access.\n\nIn the meantime, I’ll set this ticket back to Pending Customer Action while we wait for your reply.\n\nKind regards,\n\n[Name]', isPinned: false, createdAt: new Date().toISOString(), isDefault: true, version: 1 },
            { id: 'guts-7', label: 'Remote Return Shipment That Has Not Been Received', text: 'I just want to follow up because we have not received your return.\n\nAs a reminder, you have 5 business days remaining to complete your return.\n\nIf you do not complete your return in 5 business days this request will be closed, and your device will lose corporate access.\n\nIn the meantime, I’ll set this ticket back to Pending Hardware Return while we wait for your return to be delivered.\n\nKind regards,\n\n[Name]', isPinned: false, createdAt: new Date().toISOString(), isDefault: true, version: 1 },
            { id: 'guts-8', label: 'Successful Return', text: 'The following devices have been returned to inventory, so I’ll resolve this ticket now:\n\n [Asset Number] - [Device Model]\n\nPlease feel free to reach out if you have any further questions regarding this return.\nKind regards,\n\n[Name]', isPinned: false, createdAt: new Date().toISOString(), isDefault: true, version: 1 },
			{ id: 'guts-9', label: 'Approvals Needed', text: 'This ticket was generated because go/stuff was unable to determine your eligibility to receive the equipment you selected.\n\nBecause this equipment is an upgrade from your current equipment, we need to obtain approval from your director before the order can proceed.\n\nBecause this is not self explanatory, I want to let you know that I am going to deny the approval of this request. This will trigger the approval chain to be activated so all necessary approvals are recorded.\n\nOnce all approvals are complete, the order will be released through the inventory system to a fulfillment team.  You will be able to track the progress of the approvals in this ticket, and the order status through your open orders on go/stuff.\n\nKind regards,\n\n[Name]', isPinned: false, createdAt: new Date().toISOString(), isDefault: true, version: 1 },
			{ id: 'guts-10', label: 'Approvals Complete', text: 'All approvals have been completed at this time and your order has been released to a fulfillment team.\n\nAt this point, the purpose for this ticket is complete and you can track further progress on your order from your open orders page through go/stuff.\n\nThank you for your patience.\n\nKind regards,\n\n[Name]', isPinned: false, createdAt: new Date().toISOString(), isDefault: true, version: 1 },
			{ id: 'guts-11', label: 'No Approvals Needed', text: 'This ticket was generated because go/stuff was unable to determine your eligibility to receive the equipment you selected.\n\nI have reviewed your asset records and verified your request falls within Google’s Distribution policy.\n\nWhen I approve this request, the ticket\'s purpose will be completed and resolved.\n\nYou can track the progress of your request though the go/stuff open orders page.\n\nKind regards,\n\n[Name]', isPinned: false, createdAt: new Date().toISOString(), isDefault: true, version: 1 },
			{ id: 'guts-12', label: 'DSS Scheduling Appointment', text: 'We are happy to assist you with &lt;issue description&gt; and would like to set an appointment for us to complete this service.\n\nWould [Date] at [Time] be a convenient time for this service appointment?\n\nIf not, please feel free to suggest a time that works best for you.\n\nKind regards,\n\n[Name]', isPinned: false, createdAt: new Date().toISOString(), isDefault: true, version: 1 },
			{ id: 'guts-13', label: 'DSS Confirming Appointment', text: 'Thank you for confirming your service appointment on [Date] at [Time].\n\nI will set this ticket to “Pending Date of Event” until the date of your appointment.In the meantime, feel free to reach out with any further questions regarding this request.\n\nKind regards,\n\n[Name]', isPinned: false, createdAt: new Date().toISOString(), isDefault: true, version: 1 },
			{ id: 'guts-14', label: 'DSS Documentation and Resolution', text: 'This service appointment is complete and below are our findings. Please let us know if you have any further issues.\n\nKind regards,\n\n[Name]\n\n**Tech Report**\n\nSymptom(s) experienced by the Requester: \n\nWere you able to replicate the symptom(s) reported (Yes or No)?\n\nTroubleshooting steps from issue confirmation until resolution:\n\n1)\n\n2)\n\n3)\n\nRoot cause of the issue: \n\nAction that resolved the issue: ', isPinned: false, createdAt: new Date().toISOString(), isDefault: true, version: 1 },
			{ id: 'guts-15', label: 'Out of Scope Request', text: 'Thank you for reaching out regarding &lt;Requested Service&gt;.\n\nUnfortunately this request is out of scope for our team, so we will route this ticket to the &lt;Team GUTS Group&gt; Team so that they can assist you with this request.\n\nHello &lt;GUTS Group&gt; Team,\n\nWould you please assist &lt;Requester Name&gt; with &lt;Requested Service&gt;?\n\n&lt;Provide all available information that will help the team successfully complete the request.&gt;\n\nThank you!\n\n[Name]', isPinned: false, createdAt: new Date().toISOString(), isDefault: true, version: 1 },
			{ id: 'guts-16', label: 'Ricoh Service Call Request was Submitted', text: 'I have submitted a request for a Ricoh service visit and I expect to receive call from a Ricoh service representative to schedule the appointment within the next 2 business days.\n\nI will set this ticket to Pending 3rd Party Action while we wait for the call from Ricoh, and I will update the ticket again to confirm the appointment date and time.\n\nIn the meantime, please feel free to reach out if you have any questions regarding this request.\n\nKind regards,\n\n[Name]', isPinned: false, createdAt: new Date().toISOString(), isDefault: true, version: 1 },
			{ id: 'guts-17', label: 'Ricoh Service Call Appointment', text: 'I have scheduled a Ricoh service call appointment for [Date] at [Time] AM/PM.\n\nI will set this ticket to Pending Date of Event until the appointment date.\n\nIn the meantime, please feel free to reach out if you have any questions regarding this request.\n\nKind regards,\n\n[Name]', isPinned: false, createdAt: new Date().toISOString(), isDefault: true, version: 1 },
			{ id: 'guts-18', label:	'Ricoh Replacement Part Order', text: '[Part Name] has been ordered for this service, and the order details are listed below.\n\nOrder GUTS Ticket number: [TicketNumber]\n\nETA: [Date]\n\nI will set this ticket to Pending Hardware while we wait for this part to be delivered, and I will update this ticket again to confirm when we receive the part and the service can be completed.\n\nKind regards,\n\n[Name]', isPinned: false, createdAt: new Date().toISOString(), isDefault: true, version: 1 },
			{ id: 'guts-19', label: 'AV Break/Fix Resolution Response', text: 'We concluded our investigation and below are our findings. Please let us know if you have any further issues.\n\nKind regards,\n\n[Name]\n\n**Tech Report**\n\nSymptom(s) experienced by the Requester: \n\nWere you able to replicate the symptom(s) reported (Yes or No)?\n\nTroubleshooting steps from issue confirmation until resolution:\n\n1)\n\n2)\n\n3)\n\nRoot cause of the issue: \n\nAction that resolved the issue: ', isPinned: false, createdAt: new Date().toISOString(), isDefault: true, version: 1 }
        ]
    }
};

const defaultHelpfulLinksBlueprint = [
    { id: 'admin-device-portal', title: 'Admin Device Portal (Armada)', description: 'The Armada portal for device administration.', url: 'https://admin-device-portal.corp.google.com/' },
    { id: 'astreya-audits', title: 'Astreya Audits', description: 'Review and manage Astreya audit reports.', url: 'https://ui-web-dot-emt-inspecto-dev.uc.r.appspot.com/app/' },
    { id: 'astreya-kb', title: 'Astreya KB', description: 'Access the Astreya knowledge base for support.', url: 'https://supportcenter.corp.google.com/corpengkb/category/bltc1355050242a3f3d?e=ServicedeskCommonGuidedSupport::Launch' },
    { id: 'bronco-plant-codes', title: 'Bronco Plant Codes', description: 'A spreadsheet of plant codes for the Bronco project.', url: 'https://docs.google.com/spreadsheets/d/1urmopWJvKXdXqAsPf1TBW2W97h5wbkFkNs9CKcBdwsE/edit?gid=0#gid=0' },
    { id: 'bronco-support', title: 'Bronco Support', description: 'Resources for Bronco project support.', url: 'https://sites.google.com/corp/google.com/gobronco-support/home' },
    { id: 'buganizer', title: 'Buganizer', description: 'A bug and issue tracking tool.', url: 'https://b.corp.google.com/issues?q=assignee:gasparl@google.com%20status:open' },
    { id: 'clipper', title: 'Clipper', description: 'A search tool for BIOS passwords.', url: 'https://clipper.googleplex.com/ui/#/search' },
    { id: 'emt-signage', title: 'EMT Signage', description: 'A folder of EMT signage and templates.', url: 'https://drive.google.com/corp/drive/folders/1uhrfZjH6Jz_9Mnftjl021nhduaRVdAtv?resourcekey=0-904bGgjllpWnTujOP-M5-w' },
    { id: 'find-net-blocks', title: 'Find Net blocks', description: 'Search for network blocks and IP information.', url: 'https://ipdb.corp.google.com/ipdb/corp-list/?ip_address=&netmask=&description=&vlan=&address_type=all&region_name=&country_name=&city_name=&building_name=&network_name=&tag=ACL-CORP-MNP' },
    { id: 'gallop', title: 'Gallop', description: 'The Gallop platform for asset and equipment management.', url: 'https://dasinfra-sap-fiori-prod5.gcpnode.com/sap/bc/ui5_ui5/ui2/ushell/shells/abap/FioriLaunchpad.html#ZEQUIPMGMTSEMOBJ-display' },
    { id: 'ganpati', title: 'Ganpati', description: 'Project management and group information.', url: 'https://ganpati2.corp.google.com/group/eng.corp?tab=descendants' },
    { id: 'gng-audit-legacy', title: 'GNG Audit (Legacy)', description: 'Access to the legacy loaner audit system.', url: 'https://loaner-2.googleplex.com/authorization' },
    { id: 'guts', title: 'GUTS', description: 'The GUTS ticket management system.', url: 'https://gutsv3.corp.google.com/#search/default/Assigned%20To%20Me/0' },
    { id: 'guts-cti', title: 'GUTS CTI', description: 'Check the GUTS CTI spreadsheet for contact info.', url: 'https://docs.google.com/spreadsheets/d/1zYSxHSdwIwrEvWAcpVyhbx6b5R2raWq322pM3EGexy0/edit?resourcekey=0-ghk2iWDZcH3sFEZ_NA-uyQ&gid=421127237#gid=421127237' },
    { id: 'guts-ticket-checklist', title: 'GUTS Ticket Checklist', description: 'A checklist for resolving GUTS tickets.', url: 'https://docs.google.com/spreadsheets/d/1VeKBxej95gIGqB2RhER9cRu-8DvD4kNcbL2PDIPMtp0/edit?gid=0#gid=0' },
    { id: 'hardware-part-numbers', title: 'Hardware Part Numbers', description: 'A dashboard for looking up hardware part numbers.', url: 'https://lookerstudio.google.com/c/u/0/reporting/36d77f1b-9303-44f9-8cf2-7b63ec333308/page/JRgzB' },
    { id: 'host-admin', title: 'Host Admin', description: 'A portal for host and asset management.', url: 'https://hostadmin.corp.google.com/#' },
    { id: 'install-glinux', title: 'Install gLinux', description: 'Instructions for installing gLinux.', url: 'https://supportcenter.corp.google.com/techstop/article/00000185-7924-d5bd-a3c5-fff7c03b0000/interactive?visit_id=638917657833593233-968085255&hl=en&rd=3' },
    { id: 'install-windows', title: 'Install Windows', description: 'Instructions for installing Windows on a corporate device.', url: 'https://supportcenter.corp.google.com/techstop/article/blt584aae127d944eb1?visit_id=638917657536484308-3551301642&hl=en&rd=2' },
    { id: 'litigation-hold', title: 'Litigation Hold', description: 'Manage litigation holds for devices.', url: 'https://amionhold.googleplex.com/lookup' },
    { id: 'mac-setup', title: 'Mac Setup', description: 'Instructions for setting up a new Mac.', url: 'https://drive.google.com/file/d/1TevV8ZdDYHOJFbpgXyaNAzyWUnLsyb3d/view?resourcekey=0-5eszItugO833_pRzoCePCw' },
    { id: 'noogley', title: 'Noogley', description: 'Internal resources for Nooglers (new Googlers).', url: 'https://noogley.googleplex.com/' },
    { id: 'office-move-stats', title: 'Office Move Stats', description: 'Statistics for office moves and logistics.', url: 'https://movestats.googleplex.com/' },
    { id: 'people-view', title: 'People View', description: 'Internal employee information and directory (check for Director or VP).', url: 'https://data.corp.google.com/sites/persons/home/' },
    { id: 'piktime', title: 'Piktime', description: 'The Piktime appointment and scheduling platform.', url: 'https://piktime.corp.google.com/' },
    { id: 'print-central', title: 'Print Central', description: 'Manage and monitor corporate printers.', url: 'https://printcentral.googleplex.com/#/printers/active' },
    { id: 'project-codes', title: 'Project Codes', description: 'A spreadsheet containing various project codes.', url: 'https://docs.google.com/spreadsheets/d/1li6NkMulPByZwcJrvQlK9Qrx64JWahwRg2xMSWEI6Dc/edit?gid=0#gid=0' },
    { id: 'purser', title: 'Purser', description: 'An internal tool to destroy Host ID.', url: 'https://purser.corp.google.com/#/home' },
    { id: 'recyclable-report', title: 'Recyclable Report', description: 'A report for tracking recyclable items.', url: 'https://lookerstudio.google.com/c/u/0/reporting/482b6544-e45b-4db3-ace7-2251d99b4e04/page/qPdtB?s=pF0bgEtUbIw' },
    { id: 'recycling-helper', title: 'Recycling Helper', description: 'A tool to assist with recycling processes.', url: 'https://script.google.com/a/macros/google.com/s/AKfycbzuJiDm7OqFxA6fIRq4Huiu2bUJLbQjqaTtZ69D2r5w0A2sjVca/exec' },
    { id: 'starting-gate', title: 'Starting Gate', description: 'Onboarding and new hire resources.', url: 'https://startinggate.corp.google.com/' },
    { id: 'techstop', title: 'Techstop', description: 'The main Techstop support center.', url: 'https://supportcenter.corp.google.com/techstop/site' },
    { id: 'technician-workload-management', title: 'Technician Workload Management', description: 'View and manage technician workload.', url: 'https://lookerstudio.google.com/c/u/0/reporting/462c770f-51f7-42e4-811d-b3fb3daf09eb/page/p_6a7jcz4nsd' },
    { id: 'wistek', title: 'Wistek / Iron Mountain', description: 'The Wistek and Iron Mountain return portal.', url: 'https://www.returntek.com/' }
];

// --- Helper Functions ---
const showSkeletonLoader = () => {
    const list = document.getElementById('responses-list');
    const emptyState = document.getElementById('empty-state');
    
    if (list) {
        list.innerHTML = `
            <div class="animate-pulse flex flex-col space-y-4 p-6 border border-gray-700/50 rounded-xl bg-gray-800/30 w-full shadow-md">
                <div class="h-5 bg-gray-700 rounded w-1/4 mb-2"></div>
                <div class="h-3 bg-gray-700 rounded w-full"></div>
                <div class="h-3 bg-gray-700 rounded w-5/6"></div>
                <div class="h-3 bg-gray-700 rounded w-4/6"></div>
                <div class="flex justify-between items-center mt-4 pt-4 border-t border-gray-700/50">
                    <div class="h-8 bg-emerald-500/20 rounded-lg w-24"></div>
                    <div class="flex gap-2"><div class="h-8 w-8 bg-gray-700 rounded-lg"></div><div class="h-8 w-8 bg-gray-700 rounded-lg"></div></div>
                </div>
            </div>
            <div class="animate-pulse flex flex-col space-y-4 p-6 border border-gray-700/50 rounded-xl bg-gray-800/30 w-full opacity-70 shadow-md">
                <div class="h-5 bg-gray-700 rounded w-1/3 mb-2"></div>
                <div class="h-3 bg-gray-700 rounded w-11/12"></div>
                <div class="h-3 bg-gray-700 rounded w-3/4"></div>
                <div class="flex justify-between items-center mt-4 pt-4 border-t border-gray-700/50">
                    <div class="h-8 bg-emerald-500/20 rounded-lg w-24"></div>
                    <div class="flex gap-2"><div class="h-8 w-8 bg-gray-700 rounded-lg"></div><div class="h-8 w-8 bg-gray-700 rounded-lg"></div></div>
                </div>
            </div>
        `;
    }
    if (emptyState) emptyState.classList.add('hidden');
};
		


const stripAIMetadata = (text) => {
    if (!text) return '';
    return text.replace(/### \[(?:TOPIC_ANCHORS|BIGRAM_CLUSTERS|NEGATIVE_ANCHORS)\][\s\S]*?(?=\n## |\n# |$)/g, '').trim();
};

// --- New Confetti Helpers ---
const fireWeeklyConfetti = () => {
    const end = Date.now() + (2 * 1000);
    const colors = ['#818cf8', '#ffffff', '#4338ca'];
    (function frame() {
        confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors });
        confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors });
        if (Date.now() < end) requestAnimationFrame(frame);
    }());
};

const fireMonthlyFireworks = () => {
    const duration = 5 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
    const randomInRange = (min, max) => Math.random() * (max - min) + min;

    const interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) return clearInterval(interval);
        const particleCount = 50 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
};		

// 1. Open Function (Called by your Table Row)
const openSLAModal = (item) => {
    const modal = document.getElementById('sla-details-modal');
    const panel = document.getElementById('sla-modal-panel');
    
    // Populate Data
    document.getElementById('modal-title').textContent = item.task;
    document.getElementById('modal-time').textContent = item.time;
    document.getElementById('modal-desc').textContent = item.description || "No detailed description available.";
    document.getElementById('modal-expect').textContent = item.expectation || "Standard resolution time applies.";
    document.getElementById('modal-conditions').textContent = item.conditions || "No specific exclusions listed.";
    
    // Inject Badge
    document.getElementById('modal-team-badge').innerHTML = getTeamBadgeTable(item.team);

    // Show Modal
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        panel.classList.remove('scale-95');
        panel.classList.add('scale-100');
    }, 10);
};

// 2. Close Function - FIXED (Attached to Window)
window.closeSLAModal = () => {
    const modal = document.getElementById('sla-details-modal');
    const panel = document.getElementById('sla-modal-panel');

    if (!modal || !panel) return;

    // Fade Out
    modal.classList.add('opacity-0');
    panel.classList.remove('scale-100');
    panel.classList.add('scale-95');

    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300); 
};


const modalElement = document.getElementById('sla-details-modal');
if (modalElement) {
    modalElement.onclick = (e) => {
        // If the user clicked the dark background (the parent div), close it
        if (e.target.id === 'sla-details-modal') {
            window.closeSLAModal();
        }
    };
}
		

// --- NEW: Helper to generate Team Pills & Icons ---
const getTeamBadge = (teamName) => {
    let color = 'border-gray-600 text-gray-400';
    let icon = 'fa-users';
    
    // Logic to assign colors/icons based on team name keywords
    if (teamName.includes('Field Services')) {
        color = 'border-green-500/50 text-green-300 bg-green-900/20';
        icon = 'fa-wrench';
    } else if (teamName.includes('Inventory') || teamName.includes('Logistics')) {
        color = 'border-orange-500/50 text-orange-300 bg-orange-900/20';
        icon = 'fa-box-open';
    } else if (teamName.includes('ROSG')) {
        color = 'border-purple-500/50 text-purple-300 bg-purple-900/20';
        icon = 'fa-crown';
    } else if (teamName.includes('CellOps')) {
        color = 'border-blue-500/50 text-blue-300 bg-blue-900/20';
        icon = 'fa-mobile-alt';
    } else if (teamName.includes('Noogler')) {
        color = 'border-yellow-500/50 text-yellow-300 bg-yellow-900/20';
        icon = 'fa-user-plus';
    }

    return `
        <span class="border ${color} px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide flex items-center gap-1.5 w-fit">
            <i class="fas ${icon} text-[9px]"></i> ${teamName.replace(' - ', '<br>')}
        </span>
    `;
};

// Helper for sorting
const getSlaSortValue = (item) => {
    if (item.durationMin) return item.durationMin;
    if (item.businessDays) return item.businessDays * 1440; 
    return 999999; 
};

// Helper for tiny icons
const getSimpleTeamIcon = (teamName) => {
    let icon = 'fa-users';
    let color = 'text-gray-500';
    if (teamName.includes('Field')) { icon = 'fa-wrench'; color = 'text-green-400'; }
    else if (teamName.includes('Inventory')) { icon = 'fa-box'; color = 'text-orange-400'; }
    else if (teamName.includes('ROSG')) { icon = 'fa-crown'; color = 'text-purple-400'; }
    else if (teamName.includes('CellOps')) { icon = 'fa-mobile'; color = 'text-blue-400'; }
    return `<i class="fas ${icon} text-[10px] ${color}"></i>`;
};

// --- UPDATED: Render SLA Dashboard (Table with Day Conversions) ---
const renderSLADashboard = (filter = 'all', searchQuery = '') => {
    const tbody = document.getElementById('sla-table-body');
    if(!tbody) return;

    tbody.innerHTML = '';
    const query = searchQuery.toLowerCase();

    // 1. Sort Data (Fastest -> Slowest)
    const sortedData = [...slaDatabase].sort((a, b) => getSlaSortValue(a) - getSlaSortValue(b));

    sortedData.forEach(item => {
        // --- Filtering ---
        if (query && !item.task.toLowerCase().includes(query) && !item.team.toLowerCase().includes(query)) return;
        if (filter === 'urgent' && item.type !== 'urgent') return;
        if (filter === 'logistics' && !item.team.includes('Logistics')) return;

        // --- Row Styling ---
        let timeClass = 'text-gray-300 font-mono';
        let rowClass = 'hover:bg-gray-800/50 transition-colors group border-b border-gray-800/50 last:border-0';
        let iconHtml = '';

        if (item.type === 'urgent') {
            timeClass = 'text-red-400 font-bold';
            rowClass = 'bg-red-900/5 hover:bg-red-900/10 border-l-2 border-l-red-500/50 border-b-gray-800/50 transition-colors group';
            iconHtml = '<i class="fas fa-fire text-red-500 mr-2 text-xs animate-pulse"></i>';
        } else if (item.type === 'high') {
            timeClass = 'text-orange-300';
            rowClass = 'hover:bg-orange-900/10 border-l-2 border-l-transparent hover:border-l-orange-500/30 transition-colors group';
        } else if (item.businessDays >= 10) {
            timeClass = 'text-blue-400';
        }

        // Clean time text
        const displayTime = item.time.replace(/Bus\. |Business /i, '');

        // --- CONVERSION LABEL LOGIC (The New Part) ---
        let conversionSubtext = '';
        // If the label says "Hours" but we know it equals specific Business Days (like 3, 3.5, 6.5)
        if (item.time.includes('Hours') && item.businessDays) {
            conversionSubtext = `<div class="text-[10px] text-gray-500 font-normal mt-0.5">≈ ${item.businessDays} Days</div>`;
        }

        // --- HTML Generation ---
        const tr = document.createElement('tr');
        tr.className = rowClass + ' cursor-pointer relative';
		tr.onclick = () => openSLAModal(item);
        
        tr.innerHTML = `
            <td class="p-4 py-3 whitespace-nowrap align-top">
                <span class="${timeClass} text-sm block leading-none">${displayTime}</span>
                ${conversionSubtext} </td>
            
            <td class="p-4 py-3 align-top">
                <div class="flex items-start">
                    <span class="mt-0.5">${iconHtml}</span>
                    <span class="text-gray-200 font-medium text-sm group-hover:text-white leading-tight">${item.task}</span>
                </div>
            </td>

            <td class="p-4 py-3 text-right align-top">
                <div class="flex justify-end">
                    ${getTeamBadgeTable(item.team)}
                </div>
            </td>
        `;

        tbody.appendChild(tr);
    });

    if (tbody.children.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="p-8 text-center text-gray-500 italic">No tasks found</td></tr>`;
    }
    
    renderMaintenanceSideList();
};

// Simplified badge helper for Table view
const getTeamBadgeTable = (teamName) => {
    let color = 'text-gray-500 bg-gray-800';
    
    if (teamName.includes('Field')) color = 'text-green-300 bg-green-900/20 border-green-500/30';
    else if (teamName.includes('Inventory')) color = 'text-orange-300 bg-orange-900/20 border-orange-500/30';
    else if (teamName.includes('ROSG')) color = 'text-purple-300 bg-purple-900/20 border-purple-500/30';
    else if (teamName.includes('CellOps')) color = 'text-blue-300 bg-blue-900/20 border-blue-500/30';

    return `
        <span class="px-2 py-1 rounded text-[10px] font-bold uppercase border ${color} bg-opacity-50 whitespace-nowrap">
            ${teamName.split(' - ')[0]} </span>
    `;
};
const renderMaintenanceSideList = () => {
    const container = document.getElementById('maintenance-list');
    if(!container || container.children.length > 0) return;

    maintenanceSLA.forEach(m => {
        container.innerHTML += `
            <div class="text-xs border-l-2 border-gray-700 pl-3 py-1 hover:border-blue-500 transition-colors">
                <div class="flex justify-between items-center mb-0.5">
                    <span class="font-bold text-gray-300">${m.task}</span>
                    <span class="text-[9px] bg-blue-900/30 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/20">${m.freq}</span>
                </div>
                <p class="text-[10px] text-gray-500">${m.detail}</p>
            </div>
        `;
    });
};

const setupCalculator = () => {
    const startInput = document.getElementById('sla-start-time');
    const durationSelect = document.getElementById('sla-duration-select');
    const resultDisplay = document.getElementById('sla-result-display');

    if (!startInput) return;

    // Set default start time to "Now"
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    startInput.value = now.toISOString().slice(0, 16);

    const calculate = () => {
        if (!startInput.value) return;
        const startDate = new Date(startInput.value);
        const durationVal = durationSelect.value;
        let endDate = new Date(startDate);

        if (durationVal.startsWith('bd-')) {
            // 1. Split the value (e.g., "3.5" becomes 3 days and 0.5 remainder)
            let totalDays = parseFloat(durationVal.split('-')[1]);
            let fullDays = Math.floor(totalDays);
            let partialDay = totalDays - fullDays; // e.g. 0.5

            // 2. Add Full Business Days (Skipping Weekends)
            let count = 0;
            while (count < fullDays) {
                endDate.setDate(endDate.getDate() + 1);
                // 0 is Sunday, 6 is Saturday
                if (endDate.getDay() !== 0 && endDate.getDay() !== 6) {
                    count++;
                }
            }

            // 3. Add Partial Business Day (Converted to Hours)
            // If you work 8 hours a day, 0.5 days = 4 hours.
            if (partialDay > 0) {
                const businessHoursPerDay = 8; 
                const hoursToAdd = partialDay * businessHoursPerDay;
                endDate.setHours(endDate.getHours() + hoursToAdd);
            }

        } else {
            // Standard Minutes logic (Urgent tasks)
            endDate.setMinutes(endDate.getMinutes() + parseInt(durationVal));
        }

        const options = { weekday: 'short', hour: 'numeric', minute: '2-digit', month: 'short', day: 'numeric' };
        resultDisplay.textContent = endDate.toLocaleDateString('en-US', options);
    };

    startInput.addEventListener('change', calculate);
    durationSelect.addEventListener('change', calculate);
    
    // Initial calc
    calculate(); 
};

// Initialize listeners
const setupSLAListeners = () => {
    const searchInput = document.getElementById('sla-search-input');
    const filterBtns = document.querySelectorAll('.sla-filter-btn');

    if(searchInput) {
        searchInput.addEventListener('input', (e) => {
            const activeFilter = document.querySelector('.sla-filter-btn.active').dataset.filter;
            renderSLADashboard(activeFilter, e.target.value);
        });
    }

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // UI Update
            filterBtns.forEach(b => {
                b.classList.remove('bg-pink-600', 'text-white', 'active');
                b.classList.add('bg-gray-700', 'text-gray-300');
            });
            btn.classList.remove('bg-gray-700', 'text-gray-300');
            btn.classList.add('bg-pink-600', 'text-white', 'active');

            // Logic Update
            renderSLADashboard(btn.dataset.filter, searchInput.value);
        });
    });
};
		

const slaDatabase = [
    // --- URGENT (Minutes/Hours) ---
    { 
        time: '30 Minutes', 
        task: 'Stuff Station Break-fix L1 Support - Urgent', 
        team: 'EMT - Field Services', 
        type: 'urgent', 
        durationMin: 30,
        description: 'Check power (on/off), verify indication lights, run reset button, check cable/USB connections, test doors (alignment/latching), check elevator for jams, reset stock levels, and ensure physical stock matches virtual data.',
        expectation: 'Resolution or escalation to L2 support within 30 minutes.',
        conditions: 'Applicable when machine is down at a priority site. Measure ticket resolution.'
    },
    { 
        time: '30 Minutes', 
        task: 'FMR and Ticket Triaging', 
        team: 'CSD - Request Management', 
        type: 'urgent', 
        durationMin: 30,
        description: 'First meaningful response and triaging of all incoming requests (via GUTS, Bronco, Buganizer, etc.) by CSD.',
        expectation: 'Ticket should be acknowledged and categorized within 30 mins.',
        conditions: 'Applies to tickets entering the EMT/CSD queue.'
    },
    { 
        time: '1 Hour', 
        task: 'Order Creation - Nooglers', 
        team: 'CSD - Inventory and Logistics', 
        type: 'urgent', 
        durationMin: 60,
        description: 'Create Bronco orders for all Nooglers based on received data.',
        expectation: 'Orders created within 1 hour of all Noogler info being available.',
        conditions: "This service and SLA may go away depending on CPO's success."
    },
    { 
        time: '2 Hours', 
        task: 'Stuff Station Break-fix L1 Support - High', 
        team: 'EMT - Field Services', 
        type: 'urgent', 
        durationMin: 120,
        description: 'Standard L1 troubleshooting: Check power, cables, doors, elevator jams, and reset stock levels.',
        expectation: 'Resolution or escalation to L2 support within 2 hours.',
        conditions: 'Measure ticket resolution.'
    },
    { 
        time: '2 Hours', 
        task: 'Stuff Station Replenishment (Out of Stock)', 
        team: 'EMT - Field Services', 
        type: 'urgent', 
        durationMin: 120,
        description: 'Replenish Stuff Stations with out-of-stock assets/accessories as per generated tickets.',
        expectation: '95% of out-of-stock alerts should be resolved within 2 hours.',
        conditions: 'OOS tickets for items not in LOC (Pending Hardware) are excluded.'
    },
    { 
        time: '4 Hours', 
        task: 'Order Routing', 
        team: 'CSD - Inventory and Logistics', 
        type: 'high', 
        durationMin: 240,
        description: 'Routing all V3 orders to the correct fulfilment destination based on the routing guide.',
        expectation: '99% requests to be routed in 4 hours.',
        conditions: 'Standard resolution time applies.'
    },

    // --- DAILY (Business Hours Converted) ---
    { 
        time: '24 Bus. Hours', 
        task: 'Stuff Station Break-fix L1 Support - Medium', 
        team: 'EMT - Field Services', 
        type: 'high', 
        businessDays: 3,
        description: 'Standard L1 troubleshooting for non-critical issues.',
        expectation: 'Resolution within 24 business hours (3 days).',
        conditions: 'Measure ticket resolution.'
    },
    { 
        time: '24 Bus. Hours', 
        task: 'Stuff Station Replenishment (Low Inventory Alert)', 
        team: 'EMT - Field Services', 
        type: 'high', 
        businessDays: 3,
        description: 'Replenish Stuff Stations with low stock assets.',
        expectation: '95% of low inventory alerts resolved within 24 hours.',
        conditions: 'OOS tickets for items not in LOC are excluded.'
    },
    { 
        time: '28 Bus. Hours', 
        task: 'ROSG Max Resolution time P0', 
        team: 'EMT - ROSG', 
        type: 'high', 
        businessDays: 3.5,
        description: 'Attend to P0 requests originating from ROSG sites.',
        expectation: 'P0 incidents resolved within 28 consecutive hours.',
        conditions: 'Exclude time in pending statuses beyond EMT control.'
    },
    { 
        time: '52 Bus. Hours', 
        task: 'ROSG Max Resolution time P1', 
        team: 'EMT - ROSG', 
        type: 'medium', 
        businessDays: 6.5,
        description: 'Attend to P1 requests originating from ROSG sites.',
        expectation: 'P1 incidents resolved within 52 consecutive hours.',
        conditions: 'Exclude time in pending statuses beyond EMT control.'
    },
    { 
        time: '1 Bus. Day', 
        task: 'Critical Hardware Deployment (In Office)', 
        team: 'EMT - Inv & Log', 
        type: 'high', 
        businessDays: 1,
        description: 'Replacement asset for broken/lost/stolen items assigned and provisioned to user.',
        expectation: 'In-office fulfillment within 1 business day (8 consecutive business hours).',
        conditions: 'Excludes Pending Hardware, Pending Approval, or Customer Action. 1 BD = 8 business hours.'
    },
    { 
        time: '1 Bus. Day', 
        task: 'Flex Desk Support (Break/Fix)', 
        team: 'EMT - Field Services', 
        type: 'high', 
        businessDays: 1,
        description: 'Replacement of defective Hoteling Desk Hardware.',
        expectation: 'Requests resolved within 1 Business Day.',
        conditions: 'Measured from time of receipt.'
    },
    { 
        time: '1 Bus. Day', 
        task: 'Printer & Plotter Maintenance', 
        team: 'EMT - Field Services', 
        type: 'high', 
        businessDays: 1,
        description: 'Toner management and paper jams on Ricoh Copiers and HP Plotters.',
        expectation: '95% requests resolved in 1 business day.',
        conditions: 'Standard maintenance SLA.'
    },
    { 
        time: '1 Bus. Day', 
        task: 'Serialized & Non-Serialized Asset Receiving', 
        team: 'EMT - Inv & Log', 
        type: 'high', 
        businessDays: 1,
        description: 'New Hardware Asset & Accessory Inventory is received into stock (includes Mobile devices).',
        expectation: '95% of assets received in inventory in 1 BD.',
        conditions: 'Depends on the success of tracking POD project.'
    },

    // --- STANDARD (2+ Days) ---
    { 
        time: '2 Bus. Days', 
        task: 'Critical Hardware Deployment (Remote)', 
        team: 'EMT - Inv & Log', 
        type: 'medium', 
        businessDays: 2,
        description: 'Shipping replacement hardware to remote users.',
        expectation: 'Ticket raised with logistics for pickup within 2 days after imaging/packing.',
        conditions: 'Excludes shipping transit time. 1 BD = 8 business hours.'
    },
    { 
        time: '2 Bus. Days', 
        task: 'Hardware Deployment - Noogler', 
        team: 'EMT', 
        type: 'medium', 
        businessDays: 2,
        description: 'Hardware asset assigned, configured and provisioned to Noogler FTE/TVC.',
        expectation: 'Hardware will be delivered on or before the joining date.',
        conditions: '99% of hardware handed over to logistics within 2 BDs of info receipt.'
    },
    { 
        time: '2 Bus. Days', 
        task: 'Mobile Device Support (Break-fix)', 
        team: 'CellOps', 
        type: 'medium', 
        businessDays: 2,
        description: 'Troubleshooting non-functioning cellphones/SIMs and provisioning replacements.',
        expectation: 'Incident to be resolved within 2 business days.',
        conditions: "Excludes Pending Customer Action/Carrier. For remote: measure time until ticket raised with logistics."
    },
    { 
        time: '2 Bus. Days', 
        task: 'Return order packaging', 
        team: 'EMT - Inv & Log', 
        type: 'medium', 
        businessDays: 2,
        description: 'Ship packaging material and return label to the user.',
        expectation: '95% of packaging material is sent within 2 BDs.',
        conditions: 'Standard shipping SLA.'
    },
    { 
        time: '2 Bus. Days', 
        task: 'VAR Drop Ship Enrollment Support', 
        team: 'CSD - Inv & Log', 
        type: 'medium', 
        businessDays: 2,
        description: 'VAR Shipment coordination (Initiate, Receive, Assign), Fallout reconciliation, Corp Enrollment.',
        expectation: '95% requests should be resolved in 2 business days.',
        conditions: 'Exclude time in pending statuses beyond EMT control.'
    },

    // --- PROJECTS (3+ Days) ---
    { 
        time: '3 Bus. Days', 
        task: 'Hardware/Accessory Deployment - New', 
        team: 'EMT - Inv & Log', 
        type: 'low', 
        businessDays: 3,
        description: 'New hardware asset/accessory assigned, configured, tested, and delivered/deployed.',
        expectation: '95% hardware is provisioned in 3 BDs.',
        conditions: 'For items ordered for the first time by users.'
    },
    { 
        time: '3 Bus. Days', 
        task: 'Mobile Device Support (New/Upgrade)', 
        team: 'CellOps', 
        type: 'low', 
        businessDays: 3,
        description: 'New connection requests (eSim/pSim), New Device Requests, Upgrade Device Requests.',
        expectation: 'Incident to be resolved within 3 business days.',
        conditions: "Excludes Pending Customer Action/Carrier."
    },
    { 
        time: '3 Bus. Days', 
        task: 'Return Serialized Asset', 
        team: 'EMT - Inv & Log', 
        type: 'low', 
        businessDays: 3,
        description: 'Return asset process: Charging/reset & wipe down of Returned assets.',
        expectation: '95% requests should be resolved in 3 business days.',
        conditions: 'Desk collection: Time starts from return order creation. Remote: measured against POD time stamp.'
    },
    { 
        time: '3 Bus. Days', 
        task: 'Saksham Project Code creation', 
        team: 'CSD - Inv & Log', 
        type: 'low', 
        businessDays: 3,
        description: 'Create project codes for Saksham device enrollement.',
        expectation: '95% requests should be resolved in 3 business days.',
        conditions: 'Exclude time in pending statuses beyond EMT control.'
    },
    { 
        time: '7 Bus. Days', 
        task: 'Stuff Station Break-fix L1 Support - Low', 
        team: 'EMT - Field Services', 
        type: 'low', 
        businessDays: 7,
        description: 'Standard L1 troubleshooting for low priority issues.',
        expectation: 'Resolution within 7 days.',
        conditions: 'Measure ticket resolution.'
    },
    { 
        time: '10 Bus. Days', 
        task: 'Flex Desk Setup', 
        team: 'EMT - Field Services', 
        type: 'low', 
        businessDays: 10,
        description: 'Deployment, Configuration and Refresh of Hoteling Desk Hardware.',
        expectation: '95% requests should be resolved within 10 Business Days.',
        conditions: 'Measured from time of receipt.'
    },
    { 
        time: '10 Bus. Days', 
        task: 'Hardware Deployment - Refresh/Swaps', 
        team: 'EMT - Inv & Log', 
        type: 'low', 
        businessDays: 10,
        description: 'Scheduled refresh of hardware assets (laptops, phones, monitors).',
        expectation: 'Assets delivered to user within 10 Business Days.',
        conditions: 'Excludes time waiting for hardware availability. 1 BD = 8 business hours.'
    },
    { 
        time: '10 Bus. Days', 
        task: 'Saksham MPN Creation', 
        team: 'CSD - Inv & Log', 
        type: 'low', 
        businessDays: 10,
        description: 'Check eligibility and create an MPN for the device models procured by MSPs.',
        expectation: '95% requests should be resolved in 10 business days.',
        conditions: 'Exclude time in pending statuses beyond EMT control.'
    }
];

const maintenanceSLA = [
    { freq: '3x Daily', task: 'Accessory Rack Replenishment', detail: 'Start of day, 12 PM, and 4 PM' },
    { freq: '3x Daily', task: 'Grab and Go Rack Maintenance', detail: 'Replenished thrice a day' },
    { freq: 'Daily', task: 'Return Locker Maintenance', detail: 'Emptied at least once every working day' },
    { freq: 'Weekly', task: 'eWaste / Recycle', detail: 'Based on maintenance event' },
    { freq: 'Scheduled', task: 'Click & Collect Deployment', detail: 'Delivered during scheduled slot' },
    { freq: 'Next Visit', task: 'ROSG Max Resolution P2 & P3', detail: 'Resolved during the Next Visit' }
];		

const generateFixPrompt = async (policy, analysis, currentDraft) => {
    // 1. Identify the Gaps
    const missingReqs = analysis.requirements.filter(i => i.isMissing).map(i => i.text);
    const missingWarns = analysis.warnings.filter(i => i.isMissing).map(i => i.text);
    
    if (missingReqs.length === 0 && missingWarns.length === 0) {
        showMessage("No issues to fix!", "success");
        return;
    }

    // 2. Build the Prompt
    let prompt = `Act as a specialized Customer Support Agent for Google IT. Your goal is to write polite, clear emails to users.\n\n`;
    
    prompt += `--- GOAL ---\n`;
    prompt += `Refine the current draft to ensure it meets the missing communication requirements listed below. \n\n`;

    prompt += `--- CURRENT DRAFT ---\n`;
    prompt += `"${currentDraft}"\n\n`;

    prompt += `--- MISSING REQUIREMENTS (Integrate these naturally) ---\n`;
    missingReqs.forEach(req => prompt += `[ACTION] ${req}\n`);
    missingWarns.forEach(warn => prompt += `[NOTE] ${warn}\n`);
    prompt += `\n`;

    prompt += `--- POLICY CONTEXT (For your reference only) ---\n`;
    const snippet = policy.focusedSnippet || policy.content.substring(0, 1500); 
    prompt += `"${snippet}..."\n\n`;

    prompt += `--- STRICT WRITING RULES ---\n`;
    prompt += `1. **Customer Facing Only:** Do NOT mention internal tools (PAR, GUTS, SAP), status codes (e.g., 'Assigned - Additional'), or backend workflows (e.g., 'destroy hostnames').\n`;
    prompt += `2. **Tag Prioritization:** The POLICY CONTEXT may contain tags like [CONTENT] and [PROCESS]. You MUST prioritize and utilize information marked with [CONTENT] as this is meant directly for the customer. Strictly avoid mentioning any internal tech steps marked with [PROCESS].\n`;
    prompt += `3. **Template Mode (Placeholders):** You are creating a reusable canned response template. You MUST replace specific names, dates, or item models with bracketed placeholders (e.g., [Customer Name], [Date], [Device Model]). Do NOT invent fake data.\n`;
    prompt += `4. **Tone:** Professional, helpful, and concise.\n`;
    prompt += `5. **Structure:** Seamlessly weave the missing requirements into the email. Do not just tack them onto the end.\n`;
    prompt += `6. **Output:** Provide ONLY the rewritten email body.`;

    // 3. Copy & Launch
    try {
        await navigator.clipboard.writeText(prompt);
        
        const btn = document.getElementById('insight-magic-fix-btn');
        if(btn) {
            const originalHTML = btn.innerHTML;
            const originalClasses = btn.className;
            
            btn.classList.remove('from-purple-600', 'to-indigo-600', 'hover:from-purple-500', 'hover:to-indigo-500');
            btn.classList.add('bg-green-600', 'border-green-500', 'scale-105');
            btn.innerHTML = `<i class="fas fa-check-circle text-white"></i> <span>Prompt Copied!</span>`;
            
            showMessage("Copied! Press Ctrl+V when Gemini opens.", "success", 4000);

            setTimeout(() => {
                window.open('https://gemini.google.com/app', '_blank');
                setTimeout(() => {
                    btn.className = originalClasses;
                    btn.innerHTML = originalHTML;
                }, 1000);
            }, 1500);
        }

    } catch (err) {
        console.error("Clipboard failed:", err);
        showMessage("Could not copy prompt. Please copy manually.", "error");
    }
};
		
const deletePolicyArticle = async (policyId, title) => {
    // 1. Confirm deletion
    const confirmed = confirm(`Are you sure you want to delete the policy: "${title}"?\n\nThis will remove the Insight link for all canned responses matching this article.`);
    
    if (!confirmed) return;

    try {
        // 2. Reference the specific document in global_knowledge
        const policyDocRef = doc(db, 'global_knowledge', policyId);
        
        // 3. Delete from Firebase
        await deleteDoc(policyDocRef);
        
        // 4. Feedback
        showMessage("Policy Article Deleted", "success");
        
        // Note: Your existing onSnapshot listener on 'global_knowledge' 
        // will automatically detect this and refresh the cache/UI.
        
    } catch (error) {
        console.error("Error deleting policy article:", error);
        showMessage("Failed to delete article. Check permissions.", "error");
    }
};

		
const extractKeyConcepts = (sentence) => {
    // Words to ignore (Stopwords) - Common English filler
    const ignoreList = new Set([
        'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'must', 'should', 'shall', 'required', 'policy', 'please', 'ensure', 'make', 'sure', 'include', 'provide', 'state'
    ]);

    // Clean and tokenize
    return sentence.toLowerCase()
        .replace(/[^\w\s]/g, '') // Remove punctuation
        .split(/\s+/)
        .filter(w => w.length > 2 && !ignoreList.has(w)); // Keep words > 2 chars
};		

const scrollToSnippet = (textSnippet, occurrenceIndex = 0) => {
    if (!textSnippet) return;

    const wrapper = document.getElementById('full-policy-wrapper');
    const toggleBtn = document.getElementById('toggle-policy-btn');
    const sourceContainer = document.querySelector('.policy-prose');
    const scrollContainer = document.getElementById('insights-content'); 
    
    if (!wrapper || !sourceContainer || !scrollContainer) return;

    // 1. Clean previous highlights
    document.querySelectorAll('.ghost-active').forEach(el => {
        el.classList.remove('ghost-active');
    });

    // 2. Normalize snippet for search
    const normalize = (str) => str.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
    const searchStr = normalize(textSnippet);

    // 3. Find ALL matches
    const blocks = sourceContainer.querySelectorAll('p, li, h4');
    const matches = [];

    for (const block of blocks) {
        const blockText = normalize(block.textContent);
        if (blockText.includes(searchStr)) {
            matches.push(block);
        }
    }

    // 4. Select the specific occurrence (or the last available one if index is out of bounds)
    // We use the passed index, defaulting to 0 (the first one)
    const targetElement = matches[occurrenceIndex] || matches[0];

    if (targetElement) {
        // Highlight
        targetElement.classList.add('ghost-active');

        // Force Open Drawer
        if (wrapper.classList.contains('slide-down-enter')) {
            wrapper.classList.remove('slide-down-enter');
            wrapper.classList.add('slide-down-active');
            if (toggleBtn) {
                toggleBtn.querySelector('span').textContent = "Hide Full Policy";
                toggleBtn.querySelector('i').className = "fas fa-chevron-up ml-2";
            }
        }

        // Scroll Logic
        setTimeout(() => {
            const containerRect = scrollContainer.getBoundingClientRect();
            const targetRect = targetElement.getBoundingClientRect();
            
            const relativeTop = targetRect.top - containerRect.top;
            const currentScroll = scrollContainer.scrollTop;
            const centerOffset = (containerRect.height / 2) - (targetRect.height / 2);
            
            scrollContainer.scrollTo({
                top: currentScroll + relativeTop - centerOffset,
                behavior: 'smooth'
            });
        }, 150);
    }
};
window.scrollToSnippet = scrollToSnippet;
		
// 2. SMART LINKER: Weighted Matching Engine
const calculatePolicyWeight = (responseText, responseCategory, policy) => {
    let score = 0;
    const lowerText = responseText.toLowerCase();
    const lowerTitle = policy.title.toLowerCase();
    
    // Exact Category Match (+10)
    if (responseCategory && lowerTitle.includes(responseCategory.toLowerCase())) score += 10;
    
    // Keyword Overlap (+1 per match)
    if (policy.keywords) {
        policy.keywords.forEach(kw => {
            if (lowerText.includes(kw.toLowerCase())) score += 1;
        });
    }
    return score;
};

const detectPolicyConflicts = (userText, policyContent) => {
    const conflicts = [];
    const lowerUser = userText.toLowerCase();
    const lowerPolicy = policyContent.toLowerCase();

    const contextPatterns = [
        { name: 'Return Window', keywords: 'return|complete|due', regex: /(?:return|complete|due).{0,50}?(\d+)\s+days/g },
        { name: 'Chargeback', keywords: 'charge|cost|bill', regex: /(?:charge|cost|bill).{0,50}?(\d+)\s+days/g },
        { name: 'Reminder', keywords: 'reminder|follow', regex: /(?:reminder|follow).{0,50}?(\d+)\s+days/g }
    ];

    contextPatterns.forEach(pattern => {
        // 1. User Search
        pattern.regex.lastIndex = 0;
        let userMatch;
        while ((userMatch = pattern.regex.exec(lowerUser)) !== null) {
            const userNum = userMatch[1]; // e.g. "40"
            const userContext = pattern.name;

            // 2. Policy Search (Targeted)
            // We create a dynamic regex to search the policy ONLY for the same context
            const policyRegex = new RegExp(`(?:${pattern.keywords}).{0,60}?(\\d+)\\s+days`, 'g');
            let policyMatch;
            
            while ((policyMatch = policyRegex.exec(lowerPolicy)) !== null) {
                const policyNum = policyMatch[1]; // e.g. "14"

                // 3. The Comparison
                if (userNum !== policyNum) {
                    
                    // 4. The "Safety Net" (From my previous suggestion)
                    // If the numbers don't match, check if the user text contains the CORRECT number
                    // explicitly associated with the days unit nearby.
                    // This saves us if the user wrote: "40 days for chargeback (standard is 14 days)"
                    const redeemingContext = new RegExp(`${policyNum}\\s+days`, 'i');
                    
                    if (!redeemingContext.test(lowerUser)) {
                        conflicts.push({
                            userPhrase: userMatch[0],
                            policyPhrase: policyMatch[0],
                            context: userContext, // "Chargeback"
                            expected: policyNum,
                            found: userNum
                        });
                    }
                }
            }
        }
    });

    return conflicts;
};

// 4. COMPLIANCE CHECKER: Timestamps
const getComplianceStatus = (responseDate, policyTimestamp, matchScore) => {
    if (!policyTimestamp) return 'verified'; 
    if (!responseDate) return 'warning'; 
    if (matchScore < 15) return 'verified';

    const rDate = new Date(responseDate);
    const pDate = policyTimestamp.toDate(); 
    
    return pDate > rDate ? 'warning' : 'verified';
};		


const generatePolicyCheatSheet = (policyText, userResponseText, currentCategory = '') => {
    if (!policyText) return null;

    const lines = policyText.split('\n');
    const lowerUserText = (userResponseText || '').toLowerCase();
    const safeCategory = (currentCategory || '').toUpperCase();

    // 1. EXCLUSION RULES
    const CATEGORY_EXCLUSIONS = {
        'BRONCO': ['dss', 'guts', 'sla', 'ticket number', 'validation', 'Dashboard', 'Monitoring'],
    };

    const IGNORED_PHRASES = [
        'mandatory data to confirm', 'mandatory data:', 'required information:',
        'following information:', 'specifics below:', 'lithium-ion compliance',
        'please refer to the process below', 'video was created using artificial intelligence',
        'inaccurate translation', 'this document provides', 'this section outlines',
        'purpose of this document', 'the goal is to ensure', 'it also emphasizes'
    ];

    const SCOPE_DEFINITIONS = {
        remote: ['ship', 'shipping', 'transit', 'tracking', 'carrier', 'package', 'mail', 'remote', 'label', 'box'],
        onsite: ['onsite', 'desk', 'arrive', 'pick up', 'pickup', 'locker', 'vending', 'in person', 'office']
    };

    const OPPOSING_SCOPES = { 'remote': 'onsite', 'onsite': 'remote' };

    const insights = { requirements: [], warnings: [], deadlines: [], process: [], tips: [] };
    const sentenceCounts = {}; 

    const userScopes = new Set();
    Object.entries(SCOPE_DEFINITIONS).forEach(([scope, keywords]) => {
        if (keywords.some(kw => lowerUserText.includes(kw))) userScopes.add(scope);
    });

    let activeScopeContext = null; 

    lines.forEach(line => {
        const rawLine = line.trim();
        if (!rawLine) return; 

        const lowerLine = rawLine.toLowerCase();

        // Structural Headers
        if (rawLine.startsWith('#') || (rawLine.startsWith('**') && rawLine.endsWith('**'))) {
            activeScopeContext = null; 
            Object.entries(SCOPE_DEFINITIONS).forEach(([scope, keywords]) => {
                if (keywords.some(kw => lowerLine.includes(kw))) activeScopeContext = scope;
            });
            return; 
        }

        // NEW: DETECT THE 3 TAGS
        const isContentLine = rawLine.includes('[CONTENT]');
        const isProcessLine = rawLine.includes('[PROCESS]');
        const isMandatoryLine = rawLine.includes('[MANDATORY]');

        // Clean the text for pure analysis
        const textToAnalyze = rawLine.replace(/\[PROCESS\]|\[CONTENT\]|\[MANDATORY\]/gi, '').replace(/\*\*/g, '').trim();
        const lowerAnalyze = textToAnalyze.toLowerCase();

        if (textToAnalyze.length < 10) return;
        if (IGNORED_PHRASES.some(phrase => lowerAnalyze.includes(phrase))) return;

        // --- PHASE-AWARE CONDITIONAL FILTERING ---
        // If a rule starts with "For [X]" or "When [X]", check if the user is even talking about [X]
        const conditionalMatch = lowerAnalyze.match(/^(?:for|if|when|in the event)\s+([^,:]+)/);
        if (conditionalMatch) {
            const conditionSubject = conditionalMatch[1]; 
            // Extract the core noun to test against the user's draft
            const conditionWords = conditionSubject.split(/\s+/).filter(w => w.length > 3 && !['with', 'that', 'this', 'user', 'the', 'equipped', 'workstations', 'confirming', 'initial', 'details'].includes(w));
            
            if (conditionWords.length > 0) {
                const userTalksAboutCondition = conditionWords.some(w => lowerUserText.includes(w));
                if (!userTalksAboutCondition) {
                    return; // DROP THE RULE! The tech's email does not match this specific phase/condition.
                }
            }
        }

        // Scope Bleed Prevention
        let lineScope = null;
        Object.entries(SCOPE_DEFINITIONS).forEach(([scope, keywords]) => {
            if (keywords.some(kw => lowerAnalyze.includes(kw))) lineScope = scope;
        });

        const effectiveScope = lineScope || activeScopeContext;
        if (effectiveScope && OPPOSING_SCOPES[effectiveScope]) {
            const opposing = OPPOSING_SCOPES[effectiveScope];
            if (userScopes.has(opposing) && !userScopes.has(effectiveScope)) return; 
        }

        // Split and evaluate
        const sentences = textToAnalyze.match(/[^.!?]+[.!?]*/g) || [textToAnalyze];

        sentences.forEach(sentence => {
            const lowerSentence = sentence.toLowerCase().trim();
            if (lowerSentence.length < 10) return;

            const uniqueKey = sentence.trim();
            const currentIndex = sentenceCounts[uniqueKey] || 0;
            sentenceCounts[uniqueKey] = currentIndex + 1;

            if (CATEGORY_EXCLUSIONS[safeCategory] && CATEGORY_EXCLUSIONS[safeCategory].some(badWord => lowerSentence.includes(badWord))) return; 

			const isGreetingRule = /\b(hi|hello|greetings|dear)\b/.test(lowerSentence) && /\b(name|requester|customer)\b/.test(lowerSentence);
			let isMet = false;
			
			if (isGreetingRule) {
			    // If the rule asks for a greeting, check if the user used ANY valid greeting
			    isMet = /\b(hi|hello|hey|greetings|dear)\b/.test(lowerUserText);
			} else {
			    // Standard matching logic
			    const words = lowerSentence.replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 4);
			    let matchCount = 0;
			    words.forEach(w => { if (lowerUserText.includes(w)) matchCount++; });
			    isMet = matchCount >= 2; 
			}

            // --- ADVANCED TAG ROUTING ---
            if (isContentLine || isMandatoryLine) {
                // Must be in the email - triggers Red Alert if missing
                insights.requirements.push({
                    text: sentence.trim(),
                    status: isMet ? 'met' : 'missing', 
                    isMissing: !isMet,
                    occurrenceIndex: currentIndex
                });
            } else if (isProcessLine) {
                // It's an internal technician step - triggers Gray Clipboard
                insights.process.push({
                    text: sentence.trim(),
                    status: isMet ? 'met' : 'process_step', 
                    isMissing: false, // Prevents triggering the Auto-Fix Alert
                    occurrenceIndex: currentIndex
                });
            } else {
                // Untagged Legacy Handling
                if (lowerSentence.match(/\b(\d+)\s+(days|hours)\b/)) {
                    insights.deadlines.push({ text: sentence.trim(), status: isMet ? 'met' : 'missing', isMissing: !isMet, occurrenceIndex: currentIndex });
                } else if (lowerSentence.match(/\b(escalate|warning|critical|deny)\b/)) {
                    insights.warnings.push({ text: sentence.trim(), status: isMet ? 'met' : 'missing', isMissing: !isMet, occurrenceIndex: currentIndex });
                }
            }
        });
    });

    insights.requirements = insights.requirements.slice(0, 3);
    insights.process = insights.process.slice(0, 3);
    insights.warnings = insights.warnings.slice(0, 2);
    insights.deadlines = insights.deadlines.slice(0, 2);

    return insights;
};
		
const extractContextualSnippet = (fullText, triggerWords) => {
    if (!fullText) return "";
    
    // Split into paragraphs (looking for double line breaks)
    const paragraphs = fullText.split(/\n\s*\n/);
    
    // Find the paragraph with the most trigger word matches
    let bestParagraph = paragraphs[0]; // Default to the first paragraph (Intro) if no specific match
    let maxMatches = 0;

    paragraphs.forEach(para => {
        const lowerPara = para.toLowerCase();
        let matchCount = 0;
        triggerWords.forEach(word => {
            if (lowerPara.includes(word)) matchCount++;
        });

        if (matchCount > maxMatches) {
            maxMatches = matchCount;
            bestParagraph = para;
        }
    });

    // If the article is short (< 300 chars), just return the whole thing
    if (fullText.length < 300) return null; // Returning null signals "Show Full Text"

    return bestParagraph;
};		

const renderAdminPolicies = () => {
    const listContainer = document.getElementById('admin-policy-list');
    if (!listContainer) return;

    // 1. Empty State
    if (globalKnowledgeCache.length === 0) {
        listContainer.innerHTML = '<p class="text-gray-500 text-center text-sm py-4">No policies ingested yet.</p>';
        return;
    }

    listContainer.innerHTML = ''; 

    // 2. Sort by Date (Keep existing logic)
    const sortedPolicies = [...globalKnowledgeCache].sort((a, b) => {
        const timeA = a.updatedAt ? a.updatedAt.toMillis() : 0;
        const timeB = b.updatedAt ? b.updatedAt.toMillis() : 0;
        return timeB - timeA;
    });

    sortedPolicies.forEach(policy => {
        const item = document.createElement('div');
        
        // --- 3. SEARCH INTEGRATION STARTS HERE ---
        // A. Add "admin-policy-item" class so the search bar can find this element
        item.className = 'admin-policy-item flex justify-between items-center p-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg border border-transparent hover:border-gray-600 transition group cursor-pointer';
        
        // B. Add Data Attributes for the Filter Logic
        // We clean the text to prevent errors
        item.dataset.title = (policy.title || "").toLowerCase();
        item.dataset.content = (policy.content || "").toLowerCase(); 
        item.dataset.categories = (policy.targetCategories || []).join(' ').toLowerCase();
        // --- SEARCH INTEGRATION ENDS ---

        const updatedDate = policy.updatedAt ? new Date(policy.updatedAt.toDate()).toLocaleDateString() : 'Unknown';

        item.innerHTML = `
            <div class="flex-grow min-w-0 mr-4 edit-trigger">
                <h4 class="font-bold text-gray-200 text-sm truncate">${policy.title}</h4>
                <div class="flex items-center gap-2">
                    <p class="text-xs text-gray-500 truncate">Updated: ${updatedDate}</p>
                    ${(policy.targetCategories || []).map(cat => 
                        `<span class="text-[9px] bg-blue-900/30 text-blue-300 px-1.5 rounded border border-blue-500/20">${cat}</span>`
                    ).join('')}
                </div>
            </div>
            <div class="flex gap-2">
                <button class="edit-btn text-gray-400 hover:text-yellow-400 transition p-2" title="Edit Article">
                    <i class="fas fa-pencil-alt"></i>
                </button>
                <button class="delete-policy-btn text-gray-500 hover:text-red-500 transition p-2" title="Delete Article">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `;

        // LISTENER: Edit (clicking the text or pencil)
        const triggerEdit = () => {
            editingArticleId = policy.id;
            document.getElementById('ingest-title').value = policy.title || "";
            document.getElementById('ingest-content').value = policy.content || "";
            document.getElementById('ingest-url').value = policy.sourceUrl || "";
            document.getElementById('ingest-modal-title').textContent = "Edit Policy";
            // Safe handling for arrays
            document.getElementById('ingest-anchors').value = (policy.requiredAnchors || []).join(', ');
            document.getElementById('ingest-categories').value = (policy.targetCategories || []).join(', ');
            document.getElementById('ingest-negative').value = (policy.negativeKeywords || []).join(', ');
            
            document.getElementById('ingest-modal').classList.remove('hidden');
        };

        item.querySelector('.edit-trigger').addEventListener('click', triggerEdit);
        item.querySelector('.edit-btn').addEventListener('click', triggerEdit);

        // LISTENER: Delete
        item.querySelector('.delete-policy-btn').addEventListener('click', (e) => {
            e.stopPropagation(); // Prevents opening the edit modal
            if(confirm(`Delete "${policy.title}"?`)) {
                 // Assuming deletePolicyArticle is defined elsewhere in your code
                 deletePolicyArticle(policy.id, policy.title); 
            }
        });

        listContainer.appendChild(item);
    });
};

const resetIngestForm = () => {
    document.getElementById('ingest-title').value = "";
    document.getElementById('ingest-content').value = "";
	document.getElementById('ingest-categories').value = "";
    document.getElementById('ingest-url').value = "";
    document.getElementById('ingest-anchors').value = ""; // <--- Added
    document.getElementById('ingest-negative').value = ""; // <--- Added
    document.getElementById('ingest-modal-title').textContent = "Ingest Knowledge";
    editingArticleId = null; 
};
		
const formatPolicyText = (text) => {
    if (!text) return '';

    let cleanText = stripAIMetadata(text);
    const lines = cleanText.split('\n');
    let html = '';
    let inList = false; 
    let inTable = false;
    let inContentBlock = false; 
    let inProcessBlock = false;

    // Helper to safely close open HTML tags
    const closeBlocks = () => {
        if (inList) { html += '</ul>'; inList = false; }
        if (inTable) { html += '</tbody></table></div>'; inTable = false; }
        if (inContentBlock) { html += '</div></div>'; inContentBlock = false; }
        if (inProcessBlock) { html += '</div></div>'; inProcessBlock = false; }
    };

    lines.forEach(line => {
        let cleanLine = line.trim();

        if (!cleanLine) {
            closeBlocks();
            html += '<div class="h-3"></div>';
            return;
        }

        // --- 1. HEADERS ---
        if (cleanLine.startsWith('### ')) {
            closeBlocks();
            html += `<h5 class="text-slate-200 font-extrabold text-md mt-5 mb-2 tracking-tight flex items-center gap-2"><i class="fas fa-caret-right text-blue-500"></i> ${applyInlineStyles(cleanLine.replace(/^###\s+/, ''))}</h5>`;
            return;
        } 
        else if (cleanLine.startsWith('## ') || (cleanLine.endsWith(':') && cleanLine.length < 60 && !cleanLine.includes('['))) {
            closeBlocks();
            const headerContent = cleanLine.replace(/^[#\s]+/, '').replace(/:$/, '');
            html += `<h4 class="text-blue-400 font-black text-lg mt-8 mb-3 border-b border-slate-700/50 pb-2 flex items-center gap-2 drop-shadow-sm"><i class="fas fa-layer-group text-sm opacity-50"></i> ${applyInlineStyles(headerContent)}</h4>`;
            return;
        }

        // --- 2. CANNED RESPONSE BOX (Green) ---
        if (cleanLine.includes('[CONTENT]')) {
            if (inProcessBlock || inTable) closeBlocks(); 
            
            let textWithoutTag = cleanLine.replace(/\[CONTENT\]/gi, '').trim();
            
            if (!inContentBlock) {
                html += `
                <div class="my-5 bg-emerald-900/20 border border-emerald-500/30 rounded-xl overflow-hidden shadow-lg relative transition-all hover:border-emerald-500/50">
                    <div class="bg-emerald-800/40 px-4 py-2 border-b border-emerald-500/20 flex items-center gap-2">
                        <i class="fas fa-copy text-emerald-400 text-xs"></i>
                        <span class="text-[10px] font-bold text-emerald-300 uppercase tracking-widest">Canned Response Template</span>
                    </div>
                    <div class="p-4 space-y-2">
                `;
                inContentBlock = true;
            }
            html += `<p class="text-emerald-50 font-mono text-[13px] leading-relaxed break-words">${applyInlineStyles(textWithoutTag)}</p>`;
            return;
        }

        // --- 3. STANDARD OPERATING PROCEDURE BOX (Slate/Blue) ---
        // THE FIX: We now catch BOTH Process and Mandatory tags here so they stay in the box!
        if (cleanLine.includes('[PROCESS]') || cleanLine.includes('[MANDATORY]')) {
            if (inContentBlock || inTable) closeBlocks(); 
            
            let isList = false;
            let itemContent = cleanLine;

            // Strip the markdown bullet, but KEEP the tag so the badge renders
            if (cleanLine.match(/^[-•*]\s/)) {
                isList = true;
                itemContent = cleanLine.replace(/^[-•*]\s+/, '').trim();
            } else if (cleanLine.match(/^\d+\.\s/)) {
                isList = 'numbered';
                itemContent = cleanLine.replace(/^\d+\.\s+/, '').trim();
            }

            if (!inProcessBlock) {
                html += `
                <div class="my-4 bg-slate-800/40 border border-slate-600/50 rounded-xl overflow-hidden shadow-md relative transition-all hover:border-slate-500/50">
                    <div class="bg-slate-700/30 px-4 py-2 border-b border-slate-600/50 flex items-center gap-2">
                        <i class="fas fa-cog text-blue-400 text-xs"></i>
                        <span class="text-[10px] font-bold text-blue-300 uppercase tracking-widest">Operating Procedure</span>
                    </div>
                    <div class="p-4">
                `;
                inProcessBlock = true;
            }

            if (isList === true) {
                if (!inList || inList === 'numbered') { 
                    if (inList) html += '</ul>';
                    html += '<ul class="list-none space-y-2.5 mt-2 mb-2">'; 
                    inList = true; 
                }
                html += `<li class="leading-relaxed pl-6 relative text-[13px] text-slate-300 before:content-['\\f0da'] before:font-['Font_Awesome_6_Free'] before:font-bold before:absolute before:left-1 before:top-0.5 before:text-blue-500 before:text-sm">${applyInlineStyles(itemContent)}</li>`;
            } 
            else if (isList === 'numbered') {
                 if (!inList || inList === true) { 
                     if (inList) html += '</ul>';
                     html += '<ul class="list-decimal pl-6 space-y-2.5 mt-2 mb-2 text-slate-300 marker:text-blue-400 marker:font-bold text-[13px]">'; 
                     inList = 'numbered'; 
                 }
                 html += `<li class="leading-relaxed pl-1">${applyInlineStyles(itemContent)}</li>`;
            } 
            else {
                if (inList) { html += '</ul>'; inList = false; } 
                html += `<p class="text-slate-300 leading-relaxed mb-3 text-[13px]">${applyInlineStyles(itemContent)}</p>`;
            }
            return;
        }

        // --- 4. TABLES ---
        if (cleanLine.startsWith('|')) {
            closeBlocks();
            if (cleanLine.match(/^\|(?:-+|:?-+:?\|)+$/)) return;
            
            const cells = cleanLine.split('|').filter(c => c.trim() !== '').map(c => c.trim());
            
            if (!inTable) { 
                html += '<div class="w-full overflow-x-auto my-5 custom-scrollbar shadow-lg"><table><thead><tr>'; 
                cells.forEach(cell => html += `<th>${applyInlineStyles(cell)}</th>`);
                html += '</tr></thead><tbody>';
                inTable = true; 
            } else {
                html += '<tr>';
                cells.forEach(cell => html += `<td>${applyInlineStyles(cell)}</td>`);
                html += '</tr>';
            }
            return;
        }
        
        // --- 5. NORMAL TEXT (No Tags) ---
        closeBlocks(); 
        
        if (cleanLine.match(/^[-•*]\s/)) {
            if (!inList) { html += '<ul class="list-none space-y-2.5 mb-4 mt-2">'; inList = true; }
            let itemContent = cleanLine.replace(/^[-•*]\s+/, '').trim();
            html += `<li class="leading-relaxed pl-6 relative text-[13px] text-slate-300 before:content-[''] before:absolute before:left-1.5 before:top-2 before:w-1.5 before:h-1.5 before:bg-blue-500 before:rounded-full">${applyInlineStyles(itemContent)}</li>`;
        } else {
            html += `<p class="text-slate-300 leading-relaxed mb-3 text-[13px]">${applyInlineStyles(cleanLine)}</p>`;
        }
    });

    closeBlocks(); 
    return html;
};

// Helper to style Bold and Links inside the text
const applyInlineStyles = (text) => {
    return text
        // 1. Safety: Escape HTML to prevent injection FIRST
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        
        // 2. Bold (**text** or *text*) 
        .replace(/\*\*([^*]+)\*\*/g, '<span class="text-white font-bold">$1</span>')
        .replace(/\*([^*]+)\*/g, '<span class="text-white font-bold">$1</span>')
        
        // 3. Links (http...) 
        .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" class="text-blue-400 hover:text-blue-300 hover:underline transition-colors">$1</a>')
        
        // 4. Transform Tags into HTML Badges
        .replace(/\[PROCESS\]/gi, `<span class="inline-badge badge-process"><i class="fas fa-cog text-[10px]"></i> Process</span>`)
        .replace(/\[CONTENT\]/gi, `<span class="inline-badge badge-content"><i class="fas fa-comment-dots text-[10px]"></i> Content</span>`)
        .replace(/\[MANDATORY\]/gi, `<span class="inline-badge badge-mandatory"><i class="fas fa-exclamation-triangle text-[10px]"></i> Mandatory</span>`);
};

// --- KNOWLEDGE BASE LOGIC ---

// 1. Check Admin Status
const checkAdminStatus = (user) => {
    currentAdminUser = user;
    const adminSection = document.getElementById('admin-knowledge-settings');
    
    // Show/Hide Admin Tools in Settings based on email match
    if (user && user.email === ADMIN_EMAIL) {
        if(adminSection) adminSection.classList.remove('hidden');
    } else {
        if(adminSection) adminSection.classList.add('hidden');
    }
};

// 2. Load the Brain (Runs on startup for everyone)
const loadGlobalKnowledge = () => {
    onSnapshot(collection(db, 'global_knowledge'), (snapshot) => {
        globalKnowledgeCache = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        console.log(`🧠 Brain updated: ${globalKnowledgeCache.length} articles.`);
        
        // FORCE UI REFRESH
        if (currentPage === 'canned-responses') {
            renderResponses(document.getElementById('search-input').value);
        }
    });
};

// --- 1. CONFIGURATION: Common words to ignore (Stopwords) ---
const STOP_WORDS = new Set([
    'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me', 'hello', 'thanks', 'thank', 'kind', 'regards', 'best', 'sincerely'
]);

// --- 2. HELPER: A lightweight stemmer (converts 'shipping' -> 'ship') ---
const getRootWord = (word) => {
    if (word.length < 4) return word;
    if (word.endsWith('ing')) return word.slice(0, -3);
    if (word.endsWith('ed')) return word.slice(0, -2);
    if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
    if (word.endsWith('ly')) return word.slice(0, -2);
    return word;
};

// --- 3. HELPER: Generate Bigrams (Word Pairs) ---
// Input: "return shipping label" -> ["return shipping", "shipping label"]
const getBigrams = (tokens) => {
    const bigrams = [];
    for (let i = 0; i < tokens.length - 1; i++) {
        bigrams.push(`${tokens[i]} ${tokens[i+1]}`);
    }
    return bigrams;
};
		

// --- 1. THE CONTEXTUAL BRAIN (Weighted Scoring & Fuzzy Logic) ---
const findRelevantPolicy = (text, currentCategory) => {
    if (!text || !globalKnowledgeCache || globalKnowledgeCache.length === 0) return null;

    const lowerText = text.toLowerCase();
    
    // Clean and Extract unique words > 3 chars
    const rawTokens = lowerText.replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 3 && !STOP_WORDS.has(w));
    const userBigrams = getBigrams(rawTokens);

    // Expand User Tokens using Synonym Map (Pseudo-RAG query expansion)
    let expandedTokens = new Set([...rawTokens]);
    rawTokens.forEach(token => {
        for (const [key, synonyms] of Object.entries(SYNONYM_MAP)) {
            if (key === token || synonyms.includes(token)) {
                expandedTokens.add(key);
                synonyms.forEach(syn => expandedTokens.add(syn));
            }
        }
    });
    const finalTokens = Array.from(expandedTokens);

    const RESTRICTIVE_SCOPES = ['onsite', 'remote', 'break/fix', 'vip', 'security key', 'locker'];

    let bestMatch = null;
    let highestScore = 0;
    let bestSnippet = null;

    globalKnowledgeCache.forEach(policy => {
        const policyTitle = (policy.title || "").toLowerCase();
        const policyContent = (policy.content || "").toLowerCase();
        let score = 0;

        // Veto Checks (Scopes & Categories)
        const foundScopes = RESTRICTIVE_SCOPES.filter(scope => policyTitle.includes(scope));
        if (foundScopes.length > 0 && !foundScopes.some(scope => lowerText.includes(scope))) return;

        if (policy.targetCategories && policy.targetCategories.length > 0) {
            const normalizedTargets = policy.targetCategories.map(c => c.toUpperCase());
            if (currentCategory && !normalizedTargets.includes(currentCategory.toUpperCase())) return;
        }

        // --- WEIGHTED SCORING ---
        // 1. Direct Title Hits (Massive Weight)
        if (lowerText.includes(policyTitle)) score += 50;

        // 2. Token Matching (Normal Weight)
        finalTokens.forEach(token => {
            // Count occurrences of the token in the policy
            const regex = new RegExp(`\\b${token}\\b`, 'g');
            const count = (policyContent.match(regex) || []).length;
            // Cap the reward per token so long documents don't automatically win
            score += Math.min(count * 2, 10); 
        });

        // 3. Bigram Matching (Contextual Weight)
        userBigrams.forEach(bigram => {
            if (policyContent.includes(bigram)) score += 15;
        });

		// --- SNIPPET EXTRACTION ---
        // Strip metadata specifically for snippet generation so the UI never sees it
        const cleanForSnippet = stripAIMetadata(policy.content);
        const paragraphs = cleanForSnippet.split(/\n\s*\n/);
        let policyBestSnippet = paragraphs[0]; // Default to intro
        let snippetMaxScore = 0;

        paragraphs.forEach(para => {
            const lowerPara = para.toLowerCase();
            let pScore = 0;
            finalTokens.forEach(t => { if (lowerPara.includes(t)) pScore++; });
            if (pScore > snippetMaxScore) {
                snippetMaxScore = pScore;
                policyBestSnippet = para;
            }
        });

        if (score > highestScore) {
            highestScore = score;
            bestMatch = policy;
            bestSnippet = policyBestSnippet;
        }
    });

    // Threshold requires at least a decent cluster of keywords to match
    return highestScore > 15 ? { ...bestMatch, score: highestScore, focusedSnippet: bestSnippet } : null;
};

// --- THE MAGIC DRAFT BRAIN (Optimized for noisy Ticket Summaries) ---
const findPolicyForTicket = (ticketText, currentCategory) => {
    if (!ticketText || !globalKnowledgeCache || globalKnowledgeCache.length === 0) return null;

    const lowerTicket = ticketText.toLowerCase();
    
    let bestMatch = null;
    let highestScore = 0;
    let bestSnippet = null;

    globalKnowledgeCache.forEach(policy => {
        const policyTitle = (policy.title || "").toLowerCase();
        const policyContent = (policy.content || "").toLowerCase();
        let score = 0;

        // 1. STRICT FILTERS
        if (policy.targetCategories && policy.targetCategories.length > 0) {
            const normalizedTargets = policy.targetCategories.map(c => c.toUpperCase());
            if (currentCategory && !normalizedTargets.includes(currentCategory.toUpperCase())) return;
        }

        if (policy.negativeKeywords && policy.negativeKeywords.length > 0) {
            const validNegatives = policy.negativeKeywords.filter(n => n.trim().length > 0);
            if (validNegatives.some(neg => lowerTicket.includes(neg.toLowerCase().trim()))) return; // Instant Kill
        }

        // 2. REQUIRED ANCHORS (The Secret Weapon for Tickets)
        // If the article has required anchors defined, the ticket MUST contain at least one.
        // If it does, we give it a MASSIVE point boost.
        let matchedAnchors = 0;
        if (policy.requiredAnchors && policy.requiredAnchors.length > 0) {
            const validAnchors = policy.requiredAnchors.filter(a => a.trim().length > 0);
            if (validAnchors.length > 0) {
                validAnchors.forEach(anchor => {
                    if (lowerTicket.includes(anchor.toLowerCase().trim())) {
                        matchedAnchors++;
                        score += 80; // HUGE boost for hitting a specific anchor
                    }
                });
                // If the policy requires anchors and the ticket has NONE of them, skip this policy.
                if (matchedAnchors === 0) return; 
            }
        }

        // 3. TITLE MATCHING
        // If the ticket explicitly mentions the title (e.g., "Flex Desk")
        if (lowerTicket.includes(policyTitle)) score += 50;

        // Check if a good chunk of the title words are in the ticket
        const titleWords = policyTitle.split(' ').filter(w => w.length > 3);
        let titleHitCount = 0;
        titleWords.forEach(word => { if (lowerTicket.includes(word)) titleHitCount++; });
        if (titleWords.length > 0 && titleHitCount >= Math.ceil(titleWords.length / 2)) {
            score += 30; 
        }

        // 4. TOKEN OVERLAP (Capped to prevent long articles from cheating)
        const ticketTokens = [...new Set(lowerTicket.replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 4 && !STOP_WORDS.has(w)))];
        let tokenMatchScore = 0;
        
        ticketTokens.forEach(token => {
            if (policyContent.includes(token)) tokenMatchScore += 1;
        });
        
        // Cap the maximum points a policy can get just from random word overlaps to 15.
        score += Math.min(tokenMatchScore, 15);

        // 5. SNIPPET EXTRACTION
        const cleanForSnippet = stripAIMetadata(policy.content);
        const paragraphs = cleanForSnippet.split(/\n\s*\n/);
        let policyBestSnippet = paragraphs[0]; 
        let snippetMaxScore = 0;

        paragraphs.forEach(para => {
            const lowerPara = para.toLowerCase();
            let pScore = 0;
            ticketTokens.forEach(t => { if (lowerPara.includes(t)) pScore++; });
            if (pScore > snippetMaxScore) {
                snippetMaxScore = pScore;
                policyBestSnippet = para;
            }
        });

        if (score > highestScore) {
            highestScore = score;
            bestMatch = policy;
            bestSnippet = policyBestSnippet;
        }
    });

    // Requires a solid score to trigger (prevents random weak matches)
    return highestScore > 25 ? { ...bestMatch, score: highestScore, focusedSnippet: bestSnippet } : null;
};

		
const showInsightsSidebar = (match, forceOpen = false, responseId = null) => {
    const sidebar = document.getElementById('insights-sidebar');
    const contentDiv = document.getElementById('insights-content');
    const footerDiv = document.getElementById('sidebar-footer');
    
    const headerText = document.getElementById('sidebar-header-text');
    const updatedDateEl = document.getElementById('sidebar-updated-date');
    const sourceLinkEl = document.getElementById('sidebar-source-link');

    if (!match) return; 

    const policyTime = match.updatedAt ? match.updatedAt.toMillis() : 0;
    const seenKey = `pkb_seen_${match.id}`;
    const lastSeenTime = localStorage.getItem(seenKey);

    if (!forceOpen && lastSeenTime && parseInt(lastSeenTime) >= policyTime) {
        return; 
    }

    currentPolicyId = match.id;
    currentPolicyTimestamp = policyTime;
    
    // --- Confidence Score Logic ---
    const score = match.score || 20; 
    let confClass = 'conf-med';
    let confLabel = 'Medium Match';
    let confColor = 'text-yellow-400';

    if (score >= 30) {
        confClass = 'conf-high';
        confLabel = 'High Confidence';
        confColor = 'text-emerald-400';
    } else if (score < 15) {
        confClass = 'conf-low';
        confLabel = 'Low Confidence';
        confColor = 'text-gray-400';
    }

    const confidenceHTML = `
        <div class="flex items-center gap-2 ml-2 border-l border-white/10 pl-3" title="Match Score: ${score}">
            <div class="flex gap-0.5 items-end ${confClass} drop-shadow-md">
                <div class="conf-bar bar-1"></div>
                <div class="conf-bar bar-2" style="height: 14px;"></div>
                <div class="conf-bar bar-3" style="height: 18px;"></div>
            </div>
            <span class="text-[9px] font-black uppercase ${confColor} tracking-widest">${confLabel}</span>
        </div>
    `;

    // --- Update Header ---
    if(headerText) headerText.innerHTML = `<div class="flex items-center gap-2"><i class="fas fa-brain text-purple-400"></i> ${match.title}</div>`;
    if(updatedDateEl) updatedDateEl.innerHTML = `<span class="bg-white/5 px-2 py-1 rounded-md border border-white/5 font-mono"><i class="far fa-clock"></i> Updated ${match.updatedAt ? new Date(match.updatedAt.toDate()).toLocaleDateString() : 'Unknown'}</span>`;
    
    if (sourceLinkEl) {
        if (match.sourceUrl) {
            sourceLinkEl.classList.remove('hidden');
            const link = sourceLinkEl.querySelector('a');
            if(link) {
                link.href = match.sourceUrl;
                link.setAttribute('target', '_blank'); 
                link.setAttribute('rel', 'noopener noreferrer');
                link.className = "text-blue-400 hover:text-blue-300 flex items-center gap-1 font-bold bg-blue-500/10 px-2 py-1 rounded-md border border-blue-500/20 transition-all";
            }
        } else {
            sourceLinkEl.classList.add('hidden');
        }
    }

    const userText = window.currentUserResponseText || "";
    const activeResponseEl = document.querySelector(`.response-item[data-id="${currentEditingId || ''}"]`) || document.querySelector('.response-item'); 
    const categoryContext = activeResponseEl ? activeResponseEl.dataset.category : activeCategory;
    
    const cheatSheet = generatePolicyCheatSheet(match.content, userText, categoryContext);

    // --- NEW: Feature 3 - Apply Ignored Rules from LocalStorage ---
    const ignoredRulesKey = responseId ? `ignored_rules_${responseId}` : null;
    const ignoredRules = ignoredRulesKey ? JSON.parse(localStorage.getItem(ignoredRulesKey) || '[]') : [];

    if (cheatSheet && cheatSheet.requirements) {
        cheatSheet.requirements.forEach(req => {
            if (ignoredRules.includes(req.text)) {
                req.isMissing = false;
                req.status = 'met'; // Treat as met so it clears the red flag
            }
        });
    }
    // --------------------------------------------------------------

    const missingReqsCount = cheatSheet ? cheatSheet.requirements.filter(i => i.isMissing).length : 0;
    const hasInsights = cheatSheet && (cheatSheet.requirements.length > 0 || cheatSheet.warnings.length > 0 || cheatSheet.deadlines.length > 0 || cheatSheet.process.length > 0);

    const cleanFocusedSnippet = match.focusedSnippet ? stripAIMetadata(match.focusedSnippet) : null;
    const isSnippetMode = !!cleanFocusedSnippet;

    const renderSmartListItems = (items) => {
        return items.map(item => {
            const cleanScrollText = item.text.replace(/\[PROCESS\]|\[CONTENT\]/g, '').replace(/['"]/g, '').replace(/\n/g, ' ').trim();
            const htmlText = item.text;
            
            let icon = '';
            let textClass = '';
            let ignoreBtnHTML = '';

            if (item.status === 'missing') {
                icon = '<i class="fas fa-exclamation-circle text-red-400 text-sm animate-pulse drop-shadow-[0_0_5px_rgba(248,113,113,0.8)]"></i>';
                textClass = 'text-white font-medium border-b border-red-500/50 pb-0.5';
                // --- NEW: Feature 3 - Add Ignore Button UI ---
                if (responseId) {
                    ignoreBtnHTML = `<button class="ignore-rule-btn ml-auto flex-shrink-0 text-[9px] text-gray-500 hover:text-red-400 bg-gray-800 border border-gray-600 px-1.5 py-0.5 rounded transition-colors" data-rule="${encodeURIComponent(item.text)}">Ignore</button>`;
                }
            } else if (item.status === 'process_step') {
                icon = '<i class="fas fa-clipboard-list text-gray-400 text-sm"></i>';
                textClass = 'text-gray-300 italic';
            } else if (item.status === 'pending') {
                icon = '<i class="fas fa-keyboard text-blue-400 text-sm"></i>';
                textClass = 'text-blue-100 italic';
            } else {
                icon = '<div class="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center"><i class="fas fa-check text-emerald-400 text-[10px]"></i></div>';
                textClass = 'text-slate-400';
            }

            return `
                <li class="py-2 cursor-pointer group flex items-start gap-3 hover:bg-white/5 rounded-lg px-2 transition-all" 
                    onclick="event.stopPropagation(); scrollToSnippet('${cleanScrollText}', ${item.occurrenceIndex || 0})">
                    <div class="mt-0.5 min-w-[16px] text-center shrink-0">${icon}</div>
                    <span class="text-[13px] leading-tight ${textClass} flex-grow">${htmlText}</span>
                    ${ignoreBtnHTML}
                </li>`;
        }).join('');
    };

    let htmlContent = `<div class="mb-6 animate-fade-in relative z-10">
        <div class="flex justify-between items-end mb-4 border-b border-white/10 pb-3">
            <h4 class="text-[11px] font-black text-slate-300 uppercase tracking-[0.2em] flex items-center gap-2">
                <i class="fas fa-robot text-purple-400"></i> AI Breakdown
            </h4>
            ${confidenceHTML}
        </div>`;

    // --- NEW: Feature 1 - Perfect Compliance displays if NO mandatory tags are missing ---
    if (missingReqsCount === 0) {
        htmlContent += `
        <div class="insight-card border-t-2 border-t-emerald-500 bg-gradient-to-br from-emerald-900/20 to-slate-900 flex items-center gap-5 mb-3">
            <div class="bg-emerald-500/20 p-4 rounded-xl text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                <i class="fas fa-check-circle text-2xl"></i>
            </div>
            <div>
                <h4 class="font-bold text-emerald-400 text-base">Perfect Compliance</h4>
                <p class="text-[13px] text-slate-400 mt-1 leading-tight">No mandatory requirements missing.</p>
            </div>
        </div>`;
    }

    if (hasInsights) {
        if (cheatSheet.process && cheatSheet.process.length > 0) {
            htmlContent += `
            <div class="insight-card mb-3" style="border-left-color: #6b7280; background: linear-gradient(90deg, rgba(107, 114, 128, 0.1) 0%, rgba(0,0,0,0) 100%);">
                <div class="text-gray-400 flex justify-between text-xs font-bold uppercase tracking-wider mb-2">
                    <span><i class="fas fa-cogs mr-1"></i> Internal Tech Steps</span>
                </div>
                <ul class="list-none ml-1 space-y-1">
                    ${renderSmartListItems(cheatSheet.process)}
                </ul>
            </div>`;
        }

        if (cheatSheet.requirements.length > 0 && missingReqsCount > 0) {
            htmlContent += `
            <div class="insight-card insight-must mb-3">
                <div class="text-blue-400 flex justify-between text-xs font-bold uppercase tracking-wider mb-2">
                    <span><i class="fas fa-clipboard-check mr-1"></i> Missing Email Content</span>
                </div>
                <ul class="list-none ml-1 space-y-1">
                    ${renderSmartListItems(cheatSheet.requirements)}
                </ul>
            </div>`;
        }
        
        if (cheatSheet.warnings.length > 0) {
             htmlContent += `
            <div class="insight-card insight-warn mb-3">
                <div class="text-amber-400 flex justify-between text-xs font-bold uppercase tracking-wider mb-2">
                    <span><i class="fas fa-exclamation-triangle mr-1"></i> Policy Warnings</span>
                </div>
                <ul class="list-none ml-1 space-y-1">
                    ${renderSmartListItems(cheatSheet.warnings)} 
                </ul>
            </div>`;
        }
        
        if (cheatSheet.deadlines.length > 0) {
             htmlContent += `
            <div class="insight-card insight-time mb-3">
                <div class="text-emerald-400 flex justify-between text-xs font-bold uppercase tracking-wider mb-2">
                    <span><i class="fas fa-stopwatch mr-1"></i> Action Timelines</span>
                </div>
                <ul class="list-none ml-1 space-y-1">
                    ${renderSmartListItems(cheatSheet.deadlines)}
                </ul>
            </div>`;
        }
    }
    
    htmlContent += `</div>`;

    const hiddenClass = hasInsights ? 'slide-down-enter' : 'slide-down-active';
    const btnText = hasInsights ? 'View Full Documentation' : 'Hide Documentation';
    const btnIcon = hasInsights ? 'fa-chevron-down' : 'fa-chevron-up';

    contentDiv.innerHTML = `
        <div class="flex flex-col min-h-full">
            ${htmlContent}
            ${hasInsights ? `
            <div class="relative z-10 flex justify-center mt-2 mb-6">
                <button id="toggle-policy-btn" class="bg-slate-800/80 hover:bg-slate-700 border border-slate-600 rounded-full px-5 py-2 text-xs font-bold text-slate-300 uppercase tracking-widest transition-all shadow-lg group flex items-center gap-2">
                    <i class="fas fa-file-alt text-blue-400"></i>
                    <span>${btnText}</span>
                    <i class="fas ${btnIcon} text-slate-500 group-hover:translate-y-0.5 transition-transform"></i>
                </button>
            </div>
            ` : ''}

            <div id="full-policy-wrapper" class="${hiddenClass} relative">
                <div class="absolute -top-10 left-1/2 -translate-x-1/2 w-3/4 h-10 bg-blue-500/10 blur-xl rounded-full pointer-events-none"></div>
                <div class="policy-prose flex-grow pb-10 relative pt-6 border-t border-slate-700/50">
                    <div class="flex justify-between items-center mb-6">
                        <h4 class="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] bg-blue-900/20 px-3 py-1 rounded border border-blue-500/20">Source Document</h4>
                        ${isSnippetMode ? `<span class="text-[10px] text-purple-400 font-mono uppercase tracking-widest"><i class="fas fa-crosshairs"></i> Targeted</span>` : ''}
                    </div>
                    ${formatPolicyText(match.content)}
                </div>
            </div>
        </div>
    `;

    // --- NEW: Feature 3 - Attach listeners to Ignore buttons ---
    contentDiv.querySelectorAll('.ignore-rule-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const ruleText = decodeURIComponent(btn.dataset.rule);
            if (ignoredRulesKey) {
                const currentIgnored = JSON.parse(localStorage.getItem(ignoredRulesKey) || '[]');
                if (!currentIgnored.includes(ruleText)) {
                    currentIgnored.push(ruleText);
                    localStorage.setItem(ignoredRulesKey, JSON.stringify(currentIgnored));
                }
                // Re-render sidebar instantly to remove the red flag
                showInsightsSidebar(match, true, responseId);
            }
        });
    });
    // ------------------------------------------------------------

    const toggleBtn = document.getElementById('toggle-policy-btn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const wrapper = document.getElementById('full-policy-wrapper');
            const isHidden = wrapper.classList.contains('slide-down-enter');
            if (isHidden) {
                wrapper.classList.remove('slide-down-enter');
                wrapper.classList.add('slide-down-active');
                toggleBtn.querySelector('span').textContent = "Hide Documentation";
                toggleBtn.querySelector('.fa-chevron-down').classList.replace('fa-chevron-down', 'fa-chevron-up');
            } else {
                wrapper.classList.remove('slide-down-active');
                wrapper.classList.add('slide-down-enter');
                toggleBtn.querySelector('span').textContent = "View Full Documentation";
                toggleBtn.querySelector('.fa-chevron-up').classList.replace('fa-chevron-up', 'fa-chevron-down');
            }
        });
    }

    if (footerDiv) {
        footerDiv.classList.remove('hidden');
        footerDiv.className = "p-5 border-t border-slate-700/80 bg-slate-900/95 backdrop-blur-3xl z-20 flex-shrink-0 relative";
        
        const missingCount = missingReqsCount + cheatSheet.warnings.filter(i => i.isMissing).length;

        if (missingCount > 0) {
            footerDiv.innerHTML = `
                <div class="flex flex-col w-full gap-3 relative z-10">
                    <div class="text-[11px] text-red-400 font-bold uppercase tracking-widest text-center">
                        <i class="fas fa-exclamation-triangle"></i> ${missingCount} Gaps Detected
                    </div>
                    <button id="insight-magic-fix-btn" class="w-full bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 border border-purple-400/50 group">
                        <i class="fas fa-magic text-yellow-300 group-hover:scale-110 transition-transform"></i>
                        <span class="tracking-wide">Auto-Fix with Gemini</span>
                    </button>
                    <button id="close-sidebar-footer-btn" class="w-full text-slate-500 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors py-2">
                        Dismiss
                    </button>
                </div>
            `;

            document.getElementById('insight-magic-fix-btn').addEventListener('click', () => {
                generateFixPrompt(match, cheatSheet, userText);
            });

        } else {
            footerDiv.innerHTML = `
                <div class="w-full flex flex-col gap-3 relative z-10">
                    <button id="close-sidebar-footer-btn" class="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 rounded-xl transition border border-slate-600 flex items-center justify-center shadow-lg uppercase tracking-widest text-xs">
                        Close Insight
                    </button>
                </div>
            `;
        }
    }
    
    document.body.classList.add('sidebar-active');
    sidebar.classList.remove('translate-x-full');
    sidebar.classList.add('translate-x-0');
};

// --- FUZZY MATCHING HELPER (Levenshtein Distance) ---
const getLevenshteinDistance = (a, b) => {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = [];

    // Increment along the first column of each row
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    // Increment each column in the first row
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    // Fill in the rest of the matrix
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    Math.min(
                        matrix[i][j - 1] + 1, // insertion
                        matrix[i - 1][j] + 1  // deletion
                    )
                );
            }
        }
    }

    return matrix[b.length][a.length];
};		

const updateSmartHistory = (key, value, category, action) => {
    const lowerKey = key.toLowerCase().trim();
    
    // 1. Define inputs we NEVER want to remember (One-off data)
    const blacklistKeywords = [
        'tracking', 'number', 'date', 'screenshot', 'link', 'url', 'ticket'
    ];
    
    const isBlacklisted = blacklistKeywords.some(keyword => lowerKey.includes(keyword));
    
    // 2. AGGRESSIVE CLEANUP: If this key is blacklisted, ensure it is WIPED from memory
    if (isBlacklisted) {
        let history = JSON.parse(localStorage.getItem('smart_placeholder_memory') || '{}');
        // If we find data for this blacklisted key, delete it to fix the "stuck suggestions" issue
        if (history[key]) {
            delete history[key]; 
            localStorage.setItem('smart_placeholder_memory', JSON.stringify(history));
            console.log(`🧹 Auto-cleaned blacklisted history for: ${key}`);
        }
        return; // Stop here, do not save the new value
    }

    // --- Standard Logic Below (Unchanged) ---

    // 3. Get existing brain data
    let history = JSON.parse(localStorage.getItem('smart_placeholder_memory') || '{}');
    if (!history[key]) history[key] = [];

    // 4. Find if this specific value already exists
    let existingItemIndex = history[key].findIndex(item => item.val === value);
    let item = existingItemIndex > -1 ? history[key][existingItemIndex] : null;

    const now = Date.now();

    // 5. APPLY LEARNING LOGIC
    if (action === 'use') {
        if (item) {
            item.score += 2; 
            item.lastUsed = now;
            item.category = category; 
        } else {
            history[key].push({ val: value, score: 5, lastUsed: now, category: category });
        }
    } 
    else if (action === 'ignore') {
        if (item) {
            item.score -= 0.5; 
        }
    } 
    else if (action === 'delete') {
        if (existingItemIndex > -1) {
            history[key].splice(existingItemIndex, 1);
        }
    }

    // 6. CLEANUP (Remove low scores or old items)
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
    if (history[key]) {
        history[key] = history[key].filter(i => i.score >= 1 && i.lastUsed > sevenDaysAgo);
        history[key].sort((a, b) => b.score - a.score);
        history[key] = history[key].slice(0, 5); // Keep top 5 only
    }

    // 7. Save
    localStorage.setItem('smart_placeholder_memory', JSON.stringify(history));
};

const getSmartSuggestions = (key, currentCategory) => {
    const history = JSON.parse(localStorage.getItem('smart_placeholder_memory') || '{}');
    if (!history[key]) return [];

    // Sort by Score, but give a bonus if it matches the current category
    return history[key].sort((a, b) => {
        let scoreA = a.score + (a.category === currentCategory ? 2 : 0); // Context Bonus
        let scoreB = b.score + (b.category === currentCategory ? 2 : 0);
        return scoreB - scoreA;
    });
};	

// --- 1. The Contextual Brain ---
const getShippingSuggestions = () => {
    let allResponses = [];
    // Flatten all categories into one big list
    for (const cat in categories) {
        if (categories[cat].responses) {
            allResponses.push(...categories[cat].responses.map(r => ({...r, categoryName: cat})));
        }
    }

    // Trigger Words: It looks for these words in your responses
    const keywords = ['fedex', 'track', 'ship', 'delivery', 'transit', 'bound', 'return', 'arrive', 'package'];
    
    return allResponses
        .filter(res => {
            const content = (res.text + " " + res.label).toLowerCase();
            return keywords.some(k => content.includes(k));
        })
        // Sort by 'timesCopied' (Highest usage first)
        .sort((a, b) => (b.timesCopied || 0) - (a.timesCopied || 0))
        .slice(0, 3); // Grab the Top 3 best matches
};

// Replace the button styling and animation inside showShippingSuggestions
const showShippingSuggestions = () => {
    const bar = document.getElementById('fedex-suggestion-bar');
    const list = document.getElementById('fedex-suggestion-list');
    const suggestions = getShippingSuggestions();

    if (suggestions.length === 0) return;

    list.innerHTML = ''; 

    suggestions.forEach(res => {
        const btn = document.createElement('button');
        // --- NEW DRAWER CARD STYLING ---
        btn.className = 'group flex flex-col items-start gap-1 bg-white/5 hover:bg-blue-600 border border-white/10 hover:border-blue-400 rounded-xl px-5 py-4 transition-all duration-200 text-left w-full cursor-pointer shadow-sm hover:shadow-lg hover:-translate-y-1';
        
        const label = res.label.length > 40 ? res.label.substring(0, 37) + '...' : (res.label || "Untitled");
        
        btn.innerHTML = `
            <span class="text-[9px] text-blue-300 font-bold uppercase tracking-widest mb-1 group-hover:text-blue-200">${res.categoryName}</span>
            <span class="text-sm font-bold text-gray-200 group-hover:text-white truncate w-full">${label}</span>
            <span class="text-xs text-gray-500 group-hover:text-blue-100 mt-2 border-t border-white/5 pt-2 w-full">
                <i class="fas fa-copy mr-1 opacity-70"></i> Used ${res.timesCopied || 0} times
            </span>
        `;

        btn.addEventListener('click', () => {
            processAndCopy(res.text, res.id, res.categoryName);
            
            const originalClass = btn.className;
            const originalHTML = btn.innerHTML;
            
            // Success state styling
            btn.className = 'bg-green-500 text-white border-green-400 rounded-xl px-5 py-4 text-center w-full transition-all flex items-center justify-center';
            btn.innerHTML = '<span class="text-sm font-bold"><i class="fas fa-check mr-2"></i>Copied</span>';

            setTimeout(() => {
                btn.className = originalClass;
                btn.innerHTML = originalHTML;
            }, 1000);
        });

        list.appendChild(btn);
    });

    // --- NEW ANIMATION LOGIC ---
    bar.classList.remove('hidden');
    setTimeout(() => {
        bar.classList.add('slide-down-fade-in');
    }, 10);
};

// --- 3. Close Button Logic (Smart Drawer) ---
document.getElementById('close-suggestion-bar-btn')?.addEventListener('click', () => {
    const bar = document.getElementById('fedex-suggestion-bar');
    bar.classList.remove('slide-down-fade-in'); 
    setTimeout(() => bar.classList.add('hidden'), 500); 
});

		const recalculateCurrentPeriodStats = async (uid) => {
    if (!uid || isAnonymous) return;
    
    console.log("Recalculating Weekly/Monthly stats based on history...");

    try {
        const eventsCollectionRef = getUserEventsCollectionRef(uid);
        const snapshot = await getDocs(query(eventsCollectionRef));
        
        const currentWeekId = getCurrentWeekId();
        const currentMonthId = getCurrentMonthId();
        
        let calculatedWeekly = 0;
        let calculatedMonthly = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.type === 'copy' && data.timestamp) {
                const date = data.timestamp.toDate();
                
                // Check Week
                // Re-using the logic inside getCurrentWeekId but for a specific date
                const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
                d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
                const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
                const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
                const eventWeekId = `${d.getUTCFullYear()}-${weekNo}`;

                // Check Month
                const eventMonthId = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

                if (eventWeekId === currentWeekId) {
                    calculatedWeekly++;
                }
                if (eventMonthId === currentMonthId) {
                    calculatedMonthly++;
                }
            }
        });

        // Update the Leaderboard Document with the correct history counts
        const leaderboardDocRef = doc(db, "leaderboard", uid);
        await setDoc(leaderboardDocRef, {
            weeklyXp: calculatedWeekly,
            lastWeeklyXpId: currentWeekId,
            monthlyXp: calculatedMonthly,
            lastMonthlyXpId: currentMonthId,
            statsRecalculated: true // Flag to prevent re-running
        }, { merge: true });

        console.log(`✅ Fixed! Weekly: ${calculatedWeekly}, Monthly: ${calculatedMonthly}`);

    } catch (error) {
        console.error("Error recalculating stats:", error);
    }
};

const getTimeAgo = (timestamp) => {
    if (!timestamp) return 'Offline';
    const date = timestamp.toDate();
    const seconds = Math.floor((new Date() - date) / 1000);

    if (seconds < 300) return 'Online'; // Active in last 5 mins
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
    return 'Offline';
};		

const openAchievementDetailsModal = (card) => {
    const modal = document.getElementById('achievement-details-modal');
    // Get data from the clicked card
    const { name, desc, icon, color, unlockedDate, unlocked } = card.dataset;
    const isUnlocked = unlocked === 'true';

    // Populate Icon
    const modalIcon = document.getElementById('modal-achievement-icon');
    modalIcon.className = `text-6xl mb-4 ${isUnlocked ? color : 'text-gray-500'}`;
    modalIcon.innerHTML = `<i class="fas ${icon}"></i>`;

    // Populate Text
    document.getElementById('modal-achievement-title').textContent = name;
    document.getElementById('modal-achievement-desc').textContent = desc;
    
    // Populate Date or Reward
    const modalDateEl = document.getElementById('modal-achievement-date');
    if (isUnlocked) {
        modalDateEl.classList.remove('text-yellow-400', 'font-bold', 'text-lg');
        if (unlockedDate) {
            const date = new Date(unlockedDate);
            modalDateEl.textContent = `Unlocked on: ${date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}`;
        } else {
            modalDateEl.textContent = 'Unlocked!';
        }
    } else {
        modalDateEl.classList.add('text-yellow-400', 'font-bold', 'text-lg');
        modalDateEl.textContent = `Reward: ${XP_VALUES.UNLOCK_ACHIEVEMENT.toLocaleString()} XP`;
    }

    // Show Modal
    modal.classList.remove('hidden');
};
		
// Animation for numbers
const animateValue = (obj, start, end, duration) => {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start).toLocaleString();
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
};
		
const calculateAndSaveUserRecords = async (uid) => {
    if (!uid || isAnonymous) return; // Don't run for anonymous users
    console.log(`Calculating and saving personal records for user ${uid}...`);

    try {
        const eventsCollectionRef = getUserEventsCollectionRef(uid);
        const leaderboardDocRef = doc(db, "leaderboard", uid);

        // 1. Fetch all of the user's past events
        const snapshot = await getDocs(query(eventsCollectionRef));
        const events = snapshot.docs.map(doc => doc.data());

        // 2. Calculate user's personal records (using your existing helper)
        const records = calculateUserRecords(events); 

        // 3. Prepare the data object to update
        const recordsToUpdate = {
            recordDaily: records.daily,
            recordWeekly: records.weekly,
            recordMonthly: records.monthly
        };

        // 4. Update the public leaderboard document with the latest records
        await setDoc(leaderboardDocRef, recordsToUpdate, { merge: true });
        console.log(`✅ Successfully updated personal records for user ${uid}.`);

    } catch (error) {
        console.error(`Error calculating and saving user records for ${uid}:`, error);
    }
};
		
const calculateUserRecords = (events) => {
    // 1. Filter for only 'copy' events that have a valid timestamp
    const copyEvents = events.filter(e => e.type === 'copy' && e.timestamp && e.timestamp.toDate);

    // If the user has no copy events, return 0s
    if (copyEvents.length === 0) {
        return { daily: 0, weekly: 0, monthly: 0 };
    }

    // 2. Helper function to get the week key (you already have this)
    const getWeekKey = (d) => {
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
    };

    // 3. Group all copy events
    const dailyCounts = {};
    const weeklyCounts = {};
    const monthlyCounts = {};

    copyEvents.forEach(event => {
        const date = event.timestamp.toDate();
        const dayKey = date.toISOString().split('T')[0];
        const weekKey = getWeekKey(date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        dailyCounts[dayKey] = (dailyCounts[dayKey] || 0) + 1;
        weeklyCounts[weekKey] = (weeklyCounts[weekKey] || 0) + 1;
        monthlyCounts[monthKey] = (monthlyCounts[monthKey] || 0) + 1;
    });

    // 4. Find the highest value (the record) from each group
    const maxDaily = Object.values(dailyCounts).length > 0 ? Math.max(...Object.values(dailyCounts)) : 0;
    const maxWeekly = Object.values(weeklyCounts).length > 0 ? Math.max(...Object.values(weeklyCounts)) : 0;
    const maxMonthly = Object.values(monthlyCounts).length > 0 ? Math.max(...Object.values(monthlyCounts)) : 0;

    // 5. Return the data as an object
    return { daily: maxDaily, weekly: maxWeekly, monthly: maxMonthly };
};

const showChallengeCompletionAnimation = (challengeId) => {
    // 1. Only run the animation if the completed challenge is the one being tracked.
    if (challengeId !== trackedChallengeId) {
        return;
    }

    const hud = document.getElementById('challenge-tracker-hud');
    if (!hud) return;

    // 2. Add the green glow and replace the content with the success message.
    hud.classList.add('challenge-completed');
    hud.innerHTML = `
        <div class="challenge-completed-message">
            <i class="fas fa-check-circle"></i>
            <p>Challenge Completed!</p>
        </div>
    `;

    // 3. Wait 3 seconds to let the user see the message.
    setTimeout(() => {
        // 4. Trigger the slide-out animation.
        hud.classList.remove('visible');

        // 5. After the animation finishes, clean up the state.
        setTimeout(() => {
            stopTrackingChallenge();
            // Also, remove the completion style in case the HUD is shown again
            hud.classList.remove('challenge-completed');
        }, 500); // This MUST match your CSS transition duration

    }, 3000); // 3-second delay
};		

const calculateAndRenderRecords = (events) => {
    const copyEvents = events.filter(e => e.type === 'copy' && e.timestamp && e.timestamp.toDate);

    // --- Helper: Format Week Range ---
    const getWeekKey = (d) => {
        const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
        return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
    };

    const getDateRangeFromWeek = (weekKey) => {
        const [yearStr, weekStr] = weekKey.split('-W');
        const year = parseInt(yearStr);
        const week = parseInt(weekStr);
        const simple = new Date(year, 0, 1 + (week - 1) * 7);
        const dow = simple.getDay();
        const ISOweekStart = simple;
        if (dow <= 4) ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
        else ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
        const startMonth = ISOweekStart.toLocaleDateString('en-US', { month: 'short' });
        const startDay = ISOweekStart.getDate();
        const ISOweekEnd = new Date(ISOweekStart);
        ISOweekEnd.setDate(ISOweekStart.getDate() + 6);
        const endMonth = ISOweekEnd.toLocaleDateString('en-US', { month: 'short' });
        const endDay = ISOweekEnd.getDate();
        return (startMonth === endMonth) 
            ? `${startMonth} ${startDay}-${endDay}, ${year}` 
            : `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
    };

    // --- 1. Fill Data Buckets ---
    const dailyData = {};
    const weeklyData = {};
    const monthlyData = {};

    copyEvents.forEach(event => {
        const date = event.timestamp.toDate();
        const dayKey = date.toISOString().split('T')[0];
        const weekKey = getWeekKey(date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        dailyData[dayKey] = (dailyData[dayKey] || 0) + 1;
        weeklyData[weekKey] = (weeklyData[weekKey] || 0) + 1;
        monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
    });

    // --- 2. Find Records (Max Values) ---
    const findRecord = (dataObj) => {
        let maxVal = 0;
        let maxKey = null;
        for (const [key, val] of Object.entries(dataObj)) {
            if (val > maxVal) { maxVal = val; maxKey = key; }
            else if (val === maxVal && key > maxKey) { maxKey = key; }
        }
        return { val: maxVal, key: maxKey };
    };

    const bestDay = findRecord(dailyData);
    const bestWeek = findRecord(weeklyData);
    const bestMonth = findRecord(monthlyData);

    // --- 3. Determine "Current" Values ---
    const now = new Date();
    const currentDayKey = now.toISOString().split('T')[0];
    const currentWeekKey = getWeekKey(now);
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const currentDayVal = dailyData[currentDayKey] || 0;
    const currentWeekVal = weeklyData[currentWeekKey] || 0;
    const currentMonthVal = monthlyData[currentMonthKey] || 0;

    // --- 4. Render Logic (Reusable Function) ---
    const updateUI = (type, best, current, dateFormatter) => {
        const countEl = document.getElementById(`record-${type}`);
        const dateEl = document.getElementById(`record-${type}-date`);
        const statusEl = document.getElementById(`record-${type}-status`);
        const percentEl = document.getElementById(`record-${type}-percent`);
        const barEl = document.getElementById(`record-${type}-bar`);
        const paceEl = document.getElementById(`record-${type}-pace`);

        // Update Record Number
        animateValue(countEl, 0, best.val, 1500);

        // Update Record Date
        if (best.key) {
            dateEl.textContent = dateFormatter(best.key);
        } else {
            dateEl.textContent = '--';
        }

        // --- PACING CALCULATOR LOGIC ---
        if (paceEl) {
            let pace = 0;
            let isPaceValid = true;

            if (type === 'daily') {
                const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const hoursElapsed = Math.max((now - startOfDay) / (1000 * 60 * 60), 0.1); 
                pace = Math.round((current / hoursElapsed) * 24);
            } else if (type === 'weekly') {
                const dayOfWeek = now.getDay();
                const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 0 for Monday, 6 for Sunday
                const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMonday);
                const daysElapsed = Math.max((now - startOfWeek) / (1000 * 60 * 60 * 24), 0.1);
                pace = Math.round((current / daysElapsed) * 7);
            } else if (type === 'monthly') {
                const daysElapsed = Math.max(now.getDate(), 0.1);
                const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                pace = Math.round((current / daysElapsed) * totalDaysInMonth);
            }

            if (current > 0 && isPaceValid) {
                if (pace > best.val && best.val > 0) {
                    paceEl.className = "mt-1.5 text-[9px] font-mono text-emerald-400 font-bold text-right h-3 tracking-wider";
                    paceEl.innerHTML = `<i class="fas fa-arrow-trend-up mr-0.5"></i> On pace to break record: ~${pace}`;
                } else {
                    paceEl.className = "mt-1.5 text-[9px] font-mono text-gray-500 text-right h-3 tracking-wider";
                    paceEl.innerHTML = `On pace for: ~${pace}`;
                }
            } else {
                paceEl.innerHTML = "";
            }
        }

        // --- THE HYPE LOGIC ---
        let percentage = best.val > 0 ? (current / best.val) * 100 : 0;
        const displayPercent = Math.min(percentage, 100);
        
        barEl.style.width = `${displayPercent}%`;
        percentEl.textContent = `${Math.floor(percentage)}%`;

        const distance = best.val - current;

        // Reset Styles
        statusEl.className = "font-semibold";
        statusEl.innerHTML = ""; 
        barEl.className = `h-full rounded-full transition-all duration-1000 ${type === 'daily' ? 'bg-blue-400' : type === 'weekly' ? 'bg-purple-400' : 'bg-yellow-400'}`;
        countEl.classList.remove('new-record-glow', 'text-green-400');

        if (current >= best.val && best.val > 0) {
            statusEl.innerHTML = `<i class="fas fa-crown text-yellow-400 mr-1"></i> <span class="text-green-400">Current Record!</span>`;
            barEl.classList.remove('bg-blue-400', 'bg-purple-400', 'bg-yellow-400');
            barEl.classList.add('bg-green-400');
            countEl.classList.add('new-record-glow', 'text-green-400'); 
            percentEl.textContent = "100%";
            if(paceEl) paceEl.innerHTML = ""; // Clear pace text if record is already broken
        } 
        else if (percentage >= 80) {
            statusEl.innerHTML = `<i class="fas fa-fire text-orange-500 mr-1 animate-pulse"></i> <span class="text-orange-300">${distance} away!</span>`;
            barEl.classList.remove('bg-blue-400', 'bg-purple-400', 'bg-yellow-400');
            barEl.classList.add('bg-orange-500'); 
        } 
        else {
            let label = type === 'daily' ? "Today" : type === 'weekly' ? "This Week" : "This Month";
            let colorClass = type === 'daily' ? "text-blue-100" : type === 'weekly' ? "text-purple-100" : "text-yellow-100";

            statusEl.className = `font-semibold ${colorClass}`;
            statusEl.textContent = `${label}: ${current}`;
        }
    };

    const formatDay = (key) => {
        const [y, m, d] = key.split('-');
        return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };
    const formatWeek = (key) => getDateRangeFromWeek(key);
    const formatMonth = (key) => {
        const [y, m] = key.split('-');
        return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };

    updateUI('daily', bestDay, currentDayVal, formatDay);
    updateUI('weekly', bestWeek, currentWeekVal, formatWeek);
    updateUI('monthly', bestMonth, currentMonthVal, formatMonth);
};

const displayToast = (notification) => {
    isNotificationActive = true; // Set the flag

    // This function now ONLY handles general messages for the top-right toast
    const toast = document.getElementById('copy-toast');
    const toastIcon = document.getElementById('copy-toast-icon');
    const toastMessage = document.getElementById('copy-toast-message');

    if (!toast || !toastIcon || !toastMessage) {
        // If elements don't exist, free up the queue and process the next item
        isNotificationActive = false;
        processNotificationQueue();
        return;
    }

    if (notification.style === 'success') {
        toastIcon.innerHTML = `<i class="fas fa-check-circle text-green-400"></i>`;
    } else if (notification.style === 'error') {
        toastIcon.innerHTML = `<i class="fas fa-times-circle text-red-400"></i>`;
    }

    toastMessage.textContent = notification.message;
    toast.classList.add('show');

    // Set a timer to hide the toast
    setTimeout(() => {
        toast.classList.remove('show');
        // IMPORTANT: Wait for the CSS fade-out animation to finish
        setTimeout(() => {
            isNotificationActive = false; // Free up the queue
            processNotificationQueue();   // Check for the next notification
        }, 500); // This duration must match your CSS transition-duration
    }, 3000);
};

const processNotificationQueue = () => {
    // If a toast is already active, or if the queue is empty, do nothing.
    if (isNotificationActive || notificationQueue.length === 0) {
        return;
    }
    // Get the next notification from the front of the queue and display it
    const nextNotification = notificationQueue.shift();
    displayToast(nextNotification);
};

const startTrackingChallenge = async (challengeId) => {
    trackedChallengeId = challengeId;
    localStorage.setItem('trackedChallengeId', challengeId);

    // Re-fetch events to ensure we have the latest data
    const eventsCollectionRef = getUserEventsCollectionRef(userId);
    const snapshot = await getDocs(query(eventsCollectionRef));
    const events = snapshot.docs.map(doc => doc.data());

    // Now re-render only the two components that need to change
    await renderChallenges(events);
    await renderChallengeTracker(events);
};

const stopTrackingChallenge = async () => {
    trackedChallengeId = null;
    localStorage.removeItem('trackedChallengeId');
    
    const hud = document.getElementById('challenge-tracker-hud');
    if (hud) {
        hud.classList.remove('visible');
        // A short delay to allow the fade-out animation
        setTimeout(() => hud.classList.add('hidden'), 500); 
    }

    // Re-fetch events to update the UI
    const eventsCollectionRef = getUserEventsCollectionRef(userId);
    const snapshot = await getDocs(query(eventsCollectionRef));
    const events = snapshot.docs.map(doc => doc.data());
    
    // Just re-render the challenges list to update the icon
    await renderChallenges(events);
};

// In your <script> tag...

const renderChallengeTracker = async (events) => {
    const hud = document.getElementById('challenge-tracker-hud');
    if (!trackedChallengeId || !hud) {
        if (hud) {
            hud.classList.remove('visible');
            setTimeout(() => hud.classList.add('hidden'), 500);
        }
        return;
    }

    const challenge = CHALLENGES_CONFIG[trackedChallengeId];
    if (!challenge) {
        stopTrackingChallenge(); // Clean up if the tracked ID is invalid
        return;
    }

    const progressData = await challenge.getProgress(events);
    const progressPercent = Math.min((progressData.current / challenge.goal) * 100, 100);

    hud.innerHTML = `
        <div class="challenge-tracker-header">
            <div class="flex items-center">
                <i class="fas ${challenge.icon} text-blue-400"></i>
                <span class="challenge-tracker-title">${challenge.title}</span>
            </div>
            <button id="challenge-tracker-close-btn" title="Stop Tracking">&times;</button>
        </div>
        <p class="text-sm text-gray-400 mb-3 px-1">${challenge.description}</p>
        <div>
            <div class="challenge-tracker-progress-text">
                ${progressData.current.toLocaleString()} / ${challenge.goal.toLocaleString()}
            </div>
            <div class="challenge-progress-container">
                <div class="challenge-progress-bar" style="width: ${progressPercent}%;"></div>
            </div>
        </div>
    `;
    hud.classList.remove('hidden');
    setTimeout(() => hud.classList.add('visible'), 10);
};
				

const backfillActiveDays = async (uid) => {
    console.log(`Checking if active days backfill is needed for user ${uid}...`);
    try {
        const userDocRef = getUserRootDocRef(uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data().activeDaysBackfilled) {
            console.log('Active days already backfilled. Skipping.');
            return;
        }

        const eventsCollectionRef = getUserEventsCollectionRef(uid);
        const snapshot = await getDocs(query(eventsCollectionRef));
        const copyEvents = snapshot.docs
            .map(doc => doc.data())
            .filter(e => e.type === 'copy' && e.timestamp);

        if (copyEvents.length === 0) {
             await updateDoc(userDocRef, { activeDaysBackfilled: true });
             console.log('No copy events to backfill.');
             return;
        }

        // Use a Set to get all unique dates
        const uniqueDays = new Set(
            copyEvents.map(e => e.timestamp.toDate().toISOString().split('T')[0])
        );

        // Use a batch to write all documents efficiently
        const batch = writeBatch(db);
        uniqueDays.forEach(dateStr => {
            const activeDayDocRef = doc(db, "leaderboard", uid, "activeDays", dateStr);
            batch.set(activeDayDocRef, { backfilled: true });
        });
        await batch.commit();

        // CRITICAL: Set a flag so this function never runs for this user again
        await updateDoc(userDocRef, { activeDaysBackfilled: true });

        console.log(`✅ Successfully backfilled ${uniqueDays.size} active days for user ${uid}.`);

    } catch (error) {
        console.error("Error during active days backfill:", error);
    }
};
		
const calculateAverageOnActiveDays = (totalCopies, activeDaysCount) => {
    // If there are no copies or no active days, the average is 0.
    if (!totalCopies || totalCopies === 0 || !activeDaysCount || activeDaysCount === 0) {
        return '0.0';
    }
    const average = totalCopies / activeDaysCount;
    // Return the average with one decimal place.
    return average.toFixed(1);
};
		
const findFavoriteCategory = (categoryCounts) => {
    if (!categoryCounts || Object.keys(categoryCounts).length === 0) {
        return "N/A";
    }
    // Find the category with the highest count
    return Object.keys(categoryCounts).reduce((a, b) => categoryCounts[a] > categoryCounts[b] ? a : b);
};
		
const backfillUserStats = async (uid) => {
    console.log(`Checking if full stats backfill is needed for user ${uid}...`);
    try {
        const userDocRef = getUserRootDocRef(uid);
        const userDoc = await getDoc(userDocRef); // Get the user doc
        const userData = userDoc.exists() ? userDoc.data() : {}; // Get data

        // IMPORTANT: We change this check so it can re-run on old users
        if (userData.recordsBackfilled) {
             console.log('Records already backfilled. Skipping.');
             return;
        }

        const eventsCollectionRef = getUserEventsCollectionRef(uid);
        const leaderboardDocRef = doc(db, "leaderboard", uid);

        // 1. Fetch all of the user's past events
        const snapshot = await getDocs(query(eventsCollectionRef));
        const events = snapshot.docs.map(doc => doc.data());

        // 2. Calculate basic stats from events
        const totalCopies = events.filter(e => e.type === 'copy').length;
        const categoryCounts = events
            .filter(e => e.type === 'copy' && e.categoryName)
            .reduce((acc, event) => {
                acc[event.categoryName] = (acc[event.categoryName] || 0) + 1;
                return acc;
            }, {});

        // --- NEW ---
        // 3. Calculate user's personal records
        const records = calculateUserRecords(events); 
        // --- END NEW ---

        // 3. NEW: Calculate achievements based purely on the user's event history
        // ... (your existing achievement calculation logic is unchanged) ...
        const unlockedAchievementIds = new Set();
        const totalCategoriesCreated = events.filter(e => e.type === 'create_category').length;
        const responsesPerCategory = events
            .filter(e => e.type === 'create_response' && e.category)
            .reduce((acc, e) => {
                acc[e.category] = (acc[e.category] || 0) + 1;
                return acc;
            }, {});

        if (totalCopies > 0) unlockedAchievementIds.add('first_responder');
        if (totalCopies >= 10) unlockedAchievementIds.add('copy_tiers');
        if (events.some(e => e.type === 'create_response')) unlockedAchievementIds.add('the_creator');
        if (totalCategoriesCreated >= 5) unlockedAchievementIds.add('librarian_tiers');
        if (Object.values(responsesPerCategory).some(count => count >= 5)) unlockedAchievementIds.add('the_architect');
        if (events.some(e => e.type === 'edit_response')) unlockedAchievementIds.add('the_editor');
        if (events.some(e => e.type === 'pin_response')) unlockedAchievementIds.add('the_curator');
        if (events.some(e => e.type === 'change_color')) unlockedAchievementIds.add('the_color_coder');
        if (events.some(e => e.type === 'import_data')) unlockedAchievementIds.add('the_data_hoarder');
        if (events.some(e => e.type === 'add_link')) unlockedAchievementIds.add('the_personalizer');
        if (events.some(e => e.type === 'globetrotter_milestone')) unlockedAchievementIds.add('the_globetrotter');
        if (events.some(e => e.type === 'publish_to_workshop')) unlockedAchievementIds.add('community_voice');

        const visitedPages = new Set(events.filter(e => e.type === 'visit_page').map(e => e.page));
        if (visitedPages.has('canned-responses') && visitedPages.has('fedex-tracker') && visitedPages.has('helpful-links')) {
            unlockedAchievementIds.add('the_explorer');
        }
        
        // 4. Prepare the complete data object for the public leaderboard document
        const statsToUpdate = {
            totalCopies: totalCopies,
            categoryCounts: categoryCounts,
            unlockedAchievements: Array.from(unlockedAchievementIds),
            // --- NEW ---
            recordDaily: records.daily,
            recordWeekly: records.weekly,
            recordMonthly: records.monthly
            // --- END NEW ---
        };

        // 5. Update the public leaderboard document with all the data
        await setDoc(leaderboardDocRef, statsToUpdate, { merge: true });

        // 6. Set the flag so this never runs again for this user
        await setDoc(userDocRef, { statsBackfilled: true, recordsBackfilled: true }, { merge: true });

        console.log(`✅ Successfully backfilled stats, records, and ${unlockedAchievementIds.size} achievements for user ${uid}.`);

    } catch (error) {
        console.error(`Error during stats backfill for user ${uid}:`, error);
    }
};
		
// Renders the achievement icons inside the profile modal
const renderProfileAchievements = (unlockedAchievements) => {
    const container = document.getElementById('profile-achievements-container');
    if (!container) return;

    if (!unlockedAchievements || unlockedAchievements.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-sm text-center col-span-4 pt-16">No achievements unlocked.</p>';
        return;
    }

    // This is the complete master list of all achievements
    const allAchievementsMasterList = [
        { id: 'first_responder', name: 'First Responder', icon: "fa-rocket", color: "text-blue-400" },
        { id: 'copy_tiers', name: 'Copycat / Wordsmith', icon: "fa-clipboard", color: "text-yellow-400" },
        { id: 'the_creator', name: 'The Creator', icon: "fa-plus-circle", color: "text-green-400" },
        { id: 'librarian_tiers', name: 'The Librarian', icon: "fa-book-open", color: "text-yellow-400" },
        { id: 'the_architect', name: 'The Architect', icon: "fa-drafting-compass", color: "text-teal-400" },
        { id: 'the_editor', name: 'The Editor', icon: "fa-pencil-alt", color: "text-indigo-400" },
        { id: 'the_curator', name: 'The Curator', icon: "fa-thumbtack", color: "text-white" },
        { id: 'the_color_coder', name: 'The Color Coder', icon: "fa-palette", color: "text-pink-400" },
        { id: 'the_explorer', name: 'The Explorer', icon: "fa-compass", color: "text-orange-400" },
        { id: 'the_data_hoarder', name: 'The Data Hoarder', icon: "fa-cloud-download-alt", color: "text-sky-400" },
        { id: 'the_personalizer', name: 'The Personalizer', icon: "fa-link", color: "text-lime-400" },
        { id: 'the_globetrotter', name: 'The Globetrotter', icon: "fa-globe-americas", color: "text-cyan-400" },
        { id: 'the_night_owl', name: 'The Night Owl', icon: "fa-moon", color: "text-purple-400" },
        { id: 'endless_scroll', name: 'The Endless Scroll', icon: "fa-infinity", color: "text-violet-500" },
        { id: 'perfect_day', name: 'The Perfect Day', icon: "fa-sun", color: "text-yellow-300" },
        { id: 'living_library', name: 'The Living Library', icon: "fa-book-dead", color: "text-green-600" },
        { id: 'the_scribe', name: 'The Scribe', icon: "fa-feather-alt", color: "text-gray-300" },
        { id: 'the_historian', name: 'The Historian', icon: "fa-calendar-alt", color: "text-red-400" },
		{ id: 'marathon_finisher', name: 'Marathon Finisher', icon: "fa-shoe-prints", color: "text-yellow-400" },
		{ id: 'challenge_champion', name: 'Challenge Champion', icon: "fa-shield-alt", color: "text-teal-400" },
        { id: 'streak_breaker', name: 'The Streak Breaker', icon: "fa-fire", color: "text-red-500" },
        { id: 'meticulous_mover', name: 'The Meticulous Mover', icon: "fa-truck-moving", color: "text-blue-500" },
        { id: 'clean_slate', name: 'The Clean Slate', icon: "fa-broom", color: "text-amber-600" },
        { id: 'the_purist', name: 'The Purist', icon: "fa-file-alt", color: "text-slate-300" },
        { id: 'the_improviser', name: 'The Improviser', icon: "fa-cogs", color: "text-cyan-500" },
        { id: 'community_voice', name: 'The Community Voice', icon: "fa-bullhorn", color: "text-indigo-400" },
        { id: 'crowd_favorite', name: 'Crowd Favorite', icon: "fa-heart", color: "text-pink-400" },
        { id: 'grand_master', name: 'The Grand Master', icon: "fa-trophy", color: "text-yellow-400" }
    ];

    let html = '';
    unlockedAchievements.forEach(achId => {
        const achDetails = allAchievementsMasterList.find(a => a.id === achId);
        if (achDetails) {
            const badgeClass = getAchievementClassFromColor(achDetails.color);
            html += `
                <div class="flex justify-center items-center" title="${achDetails.name}">
                    <div class="achievement-icon-wrapper ${badgeClass}" style="width: 40px; height: 40px;">
                        <i class="fas ${achDetails.icon}" style="font-size: 1rem;"></i>
                    </div>
                </div>
            `;
        }
    });
    container.innerHTML = html;
};		

// Renders the category chart inside the profile modal
const renderProfileCategoryChart = (categoryCounts) => {
    // Find the wrapper, not the canvas itself
    const chartWrapper = document.getElementById('profile-chart-wrapper');
    if (!chartWrapper) return;

    // Clear previous chart instance if it exists
    if (profileChartInstance) {
        profileChartInstance.destroy();
    }

    // Always reset the wrapper to contain the canvas element
    chartWrapper.innerHTML = '<canvas id="profile-category-chart"></canvas>';
    const ctx = document.getElementById('profile-category-chart').getContext('2d');

    if (!categoryCounts || Object.keys(categoryCounts).length === 0) {
        // ▼▼▼ THIS IS THE CORRECTED LINE ▼▼▼
        chartWrapper.innerHTML = '<p class="text-gray-500 text-center pt-16">No category data yet.</p>';
        return;
    }

    const labels = Object.keys(categoryCounts);
    const data = Object.values(categoryCounts);
    const backgroundColors = labels.map(label => categories[label]?.color || '#888888');

    profileChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors,
                borderColor: '#1f2937', 
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
};
		
// ADD THIS NEW FUNCTION to your helper functions area
const showUserProfile = async (profileUserId) => {
    const modal = document.getElementById('profile-modal');
	const header = document.getElementById('profile-modal-header');
    const headerContainer = document.getElementById('profile-header-container');
    const chartWrapper = document.getElementById('profile-chart-wrapper');

    // Show modal and clear previous content
    modal.classList.remove('hidden');
    document.getElementById('stats-tab-btn').click(); 

    // Show a loading state
    header.style.background = '#1f2937';
    headerContainer.innerHTML = `<div class="flex justify-center items-center h-48"><svg class="animate-spin h-10 w-10 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></div>`;
    
    // Clear the stats sections
    document.getElementById('profile-achievements-container').innerHTML = '';
    chartWrapper.innerHTML = '<canvas id="profile-category-chart"></canvas>';
    document.getElementById('profile-total-copies').textContent = '--';
    document.getElementById('profile-fav-category').textContent = '--';
    document.getElementById('profile-cpd').textContent = '--'; // Clear the new stat

    try {
        const userProfileDocRef = doc(db, "leaderboard", profileUserId);
        const userProfileDoc = await getDoc(userProfileDocRef);

        if (!userProfileDoc.exists()) {
            headerContainer.innerHTML = '<p class="text-red-400">Could not find profile data.</p>';
            return;
        }

        const profileData = userProfileDoc.data();
        const rankClass = `level-badge-${profileData.rankName.toLowerCase().replace(' ', '-')}`;
        const memberSinceDate = profileData.memberSince?.toDate ? profileData.memberSince.toDate() : new Date();
        const formattedDate = memberSinceDate.toLocaleDateString(undefined, {
            year: 'numeric', month: 'long', day: 'numeric'
        });

        // Dynamically get the rank gradient and apply it to the header
        const tempRankIcon = document.createElement('div');
        tempRankIcon.className = `level-badge-wrapper ${rankClass}`;
        tempRankIcon.style.display = 'none';
        document.body.appendChild(tempRankIcon);
        const rankGradient = getComputedStyle(tempRankIcon).backgroundImage;
        document.body.removeChild(tempRankIcon);
        header.style.background = `linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 100%), ${rankGradient}`;		

        // Populate the HEADER of the modal
        headerContainer.innerHTML = `
            <div class="${rankClass} level-badge-wrapper beveled-edge" style="width: 100px; height: 100px; margin: 0 auto 1rem auto; box-shadow: 0 5px 15px rgba(0,0,0,0.3);">
                <i class="fas ${profileData.rankIcon}" style="font-size: 3rem;"></i>
            </div>
            <h3 class="text-3xl font-bold text-white" style="text-shadow: 1px 1px 5px rgba(0,0,0,0.5);">${profileData.displayName}</h3>
            <p class="text-lg text-gray-200" style="text-shadow: 1px 1px 3px rgba(0,0,0,0.5);">${profileData.rankName}</p>
            <div class="mt-4 w-full bg-black bg-opacity-25 p-3 rounded-xl">
                <div class="flex justify-between items-center text-lg">
                    <span class="text-blue-300 font-semibold">Level ${profileData.level}</span>
                    <span class="text-green-300 font-bold">${profileData.xp.toLocaleString()} XP</span>
                </div>
            </div>
            <div class="mt-2 text-xs text-gray-300">
                Member since ${formattedDate}
            </div>`;
        
// ▼▼▼ POPULATE THE ALL-TIME STATS ▼▼▼
        const totalCopies = profileData.totalCopies || 0;
        const favoriteCategory = findFavoriteCategory(profileData.categoryCounts);
        
        // 1. Fetch the count of active days from the new subcollection
        const activeDaysColRef = collection(db, "leaderboard", profileUserId, "activeDays");
        const activeDaysSnapshot = await getDocs(activeDaysColRef);
        const numberOfActiveDays = activeDaysSnapshot.size;

        // 2. Call the calculation function
        const copiesPerDay = calculateAverageOnActiveDays(totalCopies, numberOfActiveDays);

        // 3. Populate the existing "All-Time Stats"
        document.getElementById('profile-total-copies').textContent = totalCopies.toLocaleString();
        document.getElementById('profile-fav-category').textContent = favoriteCategory;
        document.getElementById('profile-cpd').textContent = copiesPerDay;

        // 4. --- NEW --- Populate the "Personal Records"
        document.getElementById('profile-record-daily').textContent = (profileData.recordDaily || 0).toLocaleString();
        document.getElementById('profile-record-weekly').textContent = (profileData.recordWeekly || 0).toLocaleString();
        document.getElementById('profile-record-monthly').textContent = (profileData.recordMonthly || 0).toLocaleString();
        // --- END NEW ---
        
        // RENDER THE CHARTS AND ACHIEVEMENTS
        renderProfileCategoryChart(profileData.categoryCounts || {});
        renderProfileAchievements(profileData.unlockedAchievements || []);

    } catch (error) {
        console.error("Error fetching user profile:", error);
        headerContainer.innerHTML = '<p class="text-red-400">An error occurred while fetching the profile.</p>';
    }
};

const updateUserLeaderboardEntry = async () => {
    if (!userId || isAnonymous) return; // Only run for signed-in users

    try {
        const userDocRef = getUserRootDocRef(userId);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) return; // User document doesn't exist yet

        const userData = userDoc.data();
        
        // This is the key: we check if they are already on the leaderboard.
        const leaderboardDocRef = doc(db, "leaderboard", userId);
        const leaderboardDoc = await getDoc(leaderboardDocRef);

        // If they aren't on the leaderboard, we add them.
        if (!leaderboardDoc.exists()) {
            console.log(`Adding user ${userId} to the leaderboard for the first time.`);
            const levelInfo = calculateLevelInfo(userData.xp || 0);
            
            const leaderboardData = {
                displayName: auth.currentUser.displayName || "Anonymous User",
                xp: levelInfo.totalXp,
                level: levelInfo.level,
                rankName: levelInfo.rankName,
                rankIcon: levelInfo.rankIcon,
                memberSince: userData.firstSignIn || serverTimestamp()
            };

            await setDoc(leaderboardDocRef, leaderboardData);
            showMessage("You've been added to the leaderboard!", "success");
        }
    } catch (error) {
        console.error("Error updating user's leaderboard entry:", error);
    }
};
	

const renderFilteredAchievements = (events, userData, filterType = 'all', containerId = 'achievements-container') => {
    const userAchievements = userData.achievementsData || {};
    const allAchievements = calculateAllAchievements(events, userData);

    // Calculate Counts for Progress Bar (Only update if rendering the main dashboard widget)
    if (containerId === 'achievements-container') {
        const unlockedCount = allAchievements.filter(a => a.unlocked).length;
        const totalCount = allAchievements.length;
        const progress = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;
        
        document.getElementById('ach-progress-text').textContent = `${unlockedCount} / ${totalCount} Unlocked`;
        document.getElementById('ach-progress-bar').style.width = `${progress}%`;
    }
    
    const container = document.getElementById(containerId);
    if (!container) return;

    // Filter Logic
    let filtered = filterType === 'unlocked' 
        ? allAchievements.filter(a => a.unlocked) 
        : allAchievements;

    if (filtered.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500 col-span-full py-8 text-sm italic">No achievements found.</p>';
        return;
    }
    
    container.innerHTML = filtered.map(ach => {
        const badgeClass = ach.unlocked ? getAchievementClassFromColor(ach.color) : 'achievement-icon-locked';
        const tileClass = ach.unlocked ? '' : 'locked';
        const textColor = ach.unlocked ? 'text-gray-100' : 'text-gray-500';
        const sanitizedDesc = ach.desc.replace(/"/g, '&quot;');
        const unlockedDate = ach.unlocked ? (userAchievements[ach.id]?.date || new Date().toISOString()) : '';
        const indicator = ach.unlocked ? '<div class="unlocked-indicator"></div>' : '';

        // Slightly larger icons for the expanded view
        const scaleClass = containerId === 'expanded-achievements-grid' ? 'scale-100' : 'transform scale-75 sm:scale-90';

        return `
            <div class="achievement-tile ${tileClass} achievement-card-redesign"
                 data-id="${ach.id}" data-name="${ach.name}" data-desc="${sanitizedDesc}"
                 data-icon="${ach.icon}" data-color="${ach.color || 'text-yellow-400'}"
                 data-unlocked="${ach.unlocked}" data-unlocked-date="${unlockedDate}"
                 title="${ach.name}: ${sanitizedDesc}">
                
                ${indicator}
                
                <div class="achievement-icon-wrapper ${badgeClass} ${scaleClass}">
                    <i class="fas ${ach.icon}"></i>
                </div>
                
                <p class="font-bold ${textColor} text-[10px] sm:text-xs text-center leading-tight line-clamp-2">${ach.name}</p>
            </div>
        `;
    }).join('');
};

// --- Sets up the click listeners for the achievement filter tabs ---
const setupAchievementFiltering = () => {
    const achievementTabs = document.getElementById('achievement-tabs');
    if (achievementTabs) {
        achievementTabs.addEventListener('click', (e) => {
            const button = e.target.closest('.achievement-tab');
            if (button && button.dataset.filter !== activeAchievementFilter) {
                activeAchievementFilter = button.dataset.filter;
                document.querySelectorAll('.achievement-tab').forEach(btn => {
                    btn.classList.remove('bg-blue-600', 'text-white');
                    btn.classList.add('text-gray-300', 'hover:bg-gray-700');
                });
                button.classList.add('bg-blue-600', 'text-white');
                button.classList.remove('text-gray-300', 'hover:bg-gray-700');
                // Re-render the stats to apply the filter
                renderAdvancedStats();
            }
        });
    }
};		

const checkForGlobalAlerts = async (uid) => {
    if (!uid || isAnonymous) return;

    const userDocRef = getUserRootDocRef(uid);
    const userDoc = await getDoc(userDocRef);
    const userData = userDoc.exists() ? userDoc.data() : {};
    
    const alertsToCheck = [
        { docId: 'weekly_champion', seenField: 'lastSeenWeeklyWinnerId', modalId: 'weekly-winner-modal', msgId: 'weekly-winner-message' },
        { docId: 'monthly_legend', seenField: 'lastSeenMonthlyWinnerId', modalId: 'monthly-winner-modal', msgId: 'monthly-winner-message' }
    ];

    for (const alert of alertsToCheck) {
        const alertRef = doc(db, 'artifacts', safeAppId, 'global_alerts', alert.docId);
        const alertSnap = await getDoc(alertRef);

        if (alertSnap.exists()) {
            const alertData = alertSnap.data();
            if (alertData.status === 'no_winner') continue;

            const lastSeenId = userData[alert.seenField];
            
            if (lastSeenId !== alertData.periodId) {
                if (alertData.winnerId === uid) {
                    // YOU ARE THE WINNER
                    const sound = document.getElementById('level-up-sound');
                    if (sound) { sound.currentTime = 0; sound.play().catch(()=>{}); }
                    
                    if (alert.docId === 'weekly_champion') fireWeeklyConfetti();
                    else fireMonthlyFireworks();

                    document.getElementById(alert.msgId).innerHTML = `
                        You crushed the ${alertData.type} sprint!<br>
                        <span class="inline-block mt-4 px-6 py-2 bg-black/40 rounded-xl border border-white/10 font-mono text-2xl text-green-400">
                            +${alertData.xpReward.toLocaleString()} XP
                        </span>`;
                    document.getElementById(alert.modalId).classList.remove('hidden');
                } else {
                    // SOMEONE ELSE WON (New Animated Toast)
                    const toast = document.getElementById('winner-announcement-toast');
                    const iconBox = document.getElementById('toast-icon-box');
                    const titleEl = document.getElementById('toast-title');
                    
                    toast.className = ''; // Reset
                    iconBox.className = 'flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center border ';

                    if (alert.docId === 'weekly_champion') {
                        toast.classList.add('border-indigo');
                        iconBox.classList.add('bg-indigo-500/20', 'border-indigo-500/50', 'text-indigo-400');
                        titleEl.textContent = "WEEKLY CHAMPION CROWNED";
                        titleEl.className = "text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400";
                    } else {
                        toast.classList.add('border-gold');
                        iconBox.classList.add('bg-yellow-500/20', 'border-yellow-500/50', 'text-yellow-500');
                        titleEl.textContent = "MONTHLY LEGEND CROWNED";
                        titleEl.className = "text-[10px] font-bold uppercase tracking-[0.2em] text-yellow-500";
                    }

                    document.getElementById('toast-name').textContent = alertData.winnerName;
                    toast.classList.add('show');
                    setTimeout(() => toast.classList.remove('show'), 8000);
                }
                await updateDoc(userDocRef, { [alert.seenField]: alertData.periodId });
            }
        }
    }
};	

const checkAndDistributeRewards = async () => {
    // 1. Define periods using the new safe helpers
    const periods = [
        { 
            type: 'weekly', 
            id: getPreviousWeekId(), 
            xp: XP_VALUES.WEEKLY_WINNER, 
            xpField: 'weeklyXp',
            idField: 'lastWeeklyXpId',
            alertDocId: 'weekly_champion'
        },
        { 
            type: 'monthly', 
            id: getPreviousMonthId(), // This now safely returns the correct past month
            xp: XP_VALUES.MONTHLY_WINNER, 
            xpField: 'monthlyXp',
            idField: 'lastMonthlyXpId',
            alertDocId: 'monthly_legend'
        }
    ];

    const alertsCollectionRef = collection(db, 'artifacts', safeAppId, 'global_alerts');

    for (const period of periods) {
        try {
            // 2. Check the Bulletin Board First
            const alertDocRef = doc(alertsCollectionRef, period.alertDocId);
            const alertDoc = await getDoc(alertDocRef);

            // If the board already has a winner for THIS ID (e.g. "2024-36"), stop. calculation is done.
            if (alertDoc.exists() && alertDoc.data().periodId === period.id) {
                continue; 
            }

            console.log(`Calculating ${period.type} winner for ${period.id}...`);

            // 3. Find the Winner
            const leaderboardRef = collection(db, "leaderboard");
            const q = query(
                leaderboardRef, 
                where(period.idField, "==", period.id), 
                orderBy(period.xpField, "desc"), 
                limit(1)
            );

            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                const winnerDoc = snapshot.docs[0];
                const winnerData = winnerDoc.data();
                const winnerId = winnerDoc.id;

                // 4. Pay the Winner (Backend Math)
                const winnerUserRef = getUserRootDocRef(winnerId);
                await updateDoc(winnerUserRef, { xp: increment(period.xp) });
                await updateDoc(doc(db, "leaderboard", winnerId), { xp: increment(period.xp) });

                // 5. POST TO BULLETIN BOARD (This triggers the visuals for everyone)
                await setDoc(alertDocRef, {
                    periodId: period.id, // e.g. "2024-36"
                    winnerId: winnerId,
                    winnerName: winnerData.displayName,
                    xpReward: period.xp,
                    type: period.type,
                    postedAt: serverTimestamp()
                });
                
                console.log(`🏆 Winner found: ${winnerData.displayName}`);
            } else {
                // No winner, but mark as checked so we don't loop forever
                await setDoc(alertDocRef, { periodId: period.id, status: 'no_winner' });
            }

        } catch (error) {
            console.error(`Error processing ${period.type} rewards:`, error);
        }
    }
};	

// --- NEW: Challenge System Configuration ---
const CHALLENGES_CONFIG = {
    dailyCopies: {
        id: 'dailyCopies', // Corrected
        title: 'Daily Clicks',
        description: 'Copy 10 responses in a single day.',
        goal: 10,
        xp: 100,
        type: 'daily',
        icon: 'fa-sun',
        getProgress: async (events) => {
            const todayStr = new Date().toISOString().split('T')[0];
            const todayStart = new Date(todayStr);
            const todaysCopies = events.filter(e => e.type === 'copy' && e.timestamp && e.timestamp.toDate() >= todayStart).length;
            return { current: todaysCopies };
        }
    },
    weeklyCopies: {
        id: 'weeklyCopies', // Corrected
        title: 'Weekly Warrior',
        description: 'Copy 50 responses in a single week.',
        goal: 50,
        xp: 500,
        type: 'weekly',
        icon: 'fa-calendar-week',
        getProgress: async (events) => {
            const now = new Date();
            const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday...
            const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - daysSinceMonday);
            startOfWeek.setHours(0, 0, 0, 0);

            const weeklyCopies = events.filter(e => e.type === 'copy' && e.timestamp && e.timestamp.toDate() >= startOfWeek).length;
            return { current: weeklyCopies };
        }
    },
    monthlyMarathon: {
        id: 'monthlyMarathon', // Corrected
        title: 'Monthly Marathon',
        description: 'Copy 200 responses in a single month.',
        goal: 200,
        xp: 1500,
        type: 'monthly',
        icon: 'fa-calendar-alt',
        getProgress: async (events) => {
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const monthlyCopies = events.filter(e => e.type === 'copy' && e.timestamp && e.timestamp.toDate() >= startOfMonth).length;
            return { current: monthlyCopies };
        }
    },
    logisticsExpert: {
        id: 'logisticsExpert', // Corrected
        title: 'Logistics Expert',
        description: 'Use the FedEx tracker 5 times in one week.',
        goal: 5,
        xp: 250,
        type: 'weekly',
        icon: 'fa-truck-fast',
        getProgress: async (events) => {
            const now = new Date();
            const dayOfWeek = now.getDay();
            const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - daysSinceMonday);
            startOfWeek.setHours(0, 0, 0, 0);

            const weeklyTrackingEvents = events.filter(e => e.type === 'extract_tracking' && e.timestamp && e.timestamp.toDate() >= startOfWeek).length;
            return { current: weeklyTrackingEvents };
        }
    }
};
		
// --- UPDATED DATE HELPERS (Safe for Feb & 31st) ---

const getCurrentDateString = () => {
    return new Date().toISOString().split('T')[0];
};

const getCurrentWeekId = () => {
    const d = new Date();
    // Set to nearest Thursday: current date + 4 - current day number
    // Make Sunday's day number 7
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-${weekNo}`;
};

const getCurrentMonthId = () => {
    const d = new Date();
    // Returns "2025-12" today, "2026-01" tomorrow
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const getPreviousWeekId = () => {
    const d = new Date();
    d.setDate(d.getDate() - 7); // Go back 7 days
    
    // Calculate week ID for that past date
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-${weekNo}`;
};

const getPreviousMonthId = () => {
    const d = new Date();
    d.setDate(15); // SAFETY: Move to the 15th to avoid "31st" overflow issues
    d.setMonth(d.getMonth() - 1); // Go back 1 month
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// In your <script> tag, find and UPDATE the checkAndAwardChallengeXP function...

const checkAndAwardChallengeXP = async (userId) => {
    if (!userId || isAnonymous) return;

try {
    // BULLETPROOF CHECK: Make sure BOTH parts of the cache exist before checking challenges
    if (!cachedStatsUserData || !cachedStatsEvents || cachedStatsEvents.length === 0) {
        const userDocRef = getUserRootDocRef(userId);
	        const userDoc = await getDoc(userDocRef);
	        cachedStatsUserData = userDoc.exists() ? userDoc.data() : {};
	
	        const eventsCollectionRef = getUserEventsCollectionRef(userId);
	        const snapshot = await getDocs(query(eventsCollectionRef));
	        cachedStatsEvents = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
	    }
	
	    const userData = cachedStatsUserData;
	    const events = cachedStatsEvents;
	    const userDocRef = getUserRootDocRef(userId);
        
        // --- Daily Challenge Check ---
        const todayStr = getCurrentDateString();
        const lastDailyCompletion = userData.lastDailyChallengeDate || '';
        if (lastDailyCompletion !== todayStr) {
            const { current } = await CHALLENGES_CONFIG.dailyCopies.getProgress(events);
            if (current >= CHALLENGES_CONFIG.dailyCopies.goal) {
                await awardXP(CHALLENGES_CONFIG.dailyCopies.xp, 'Daily Challenge');
                await updateDoc(userDocRef, { lastDailyChallengeDate: todayStr });
                showChallengeCompletionAnimation('dailyCopies');
            }
        }

        // --- Weekly Challenges Check ---
        const weekId = getCurrentWeekId();
        
        // Check for Weekly Copies Challenge
        const lastWeeklyCompletion = userData.lastWeeklyChallengeWeek || '';
        if (lastWeeklyCompletion !== weekId) {
            const { current } = await CHALLENGES_CONFIG.weeklyCopies.getProgress(events);
            if (current >= CHALLENGES_CONFIG.weeklyCopies.goal) {
                await awardXP(CHALLENGES_CONFIG.weeklyCopies.xp, 'Weekly Challenge');
                await updateDoc(userDocRef, { lastWeeklyChallengeWeek: weekId });
                showMessage("2x XP is now active for the week!", "success");
                showChallengeCompletionAnimation('weeklyCopies');
            }
        }

        // Check for Logistics Expert Challenge
        const lastLogisticsCompletion = userData.lastLogisticsChallengeWeek || '';
        if (lastLogisticsCompletion !== weekId) {
            const { current } = await CHALLENGES_CONFIG.logisticsExpert.getProgress(events);
            if (current >= CHALLENGES_CONFIG.logisticsExpert.goal) {
                await awardXP(CHALLENGES_CONFIG.logisticsExpert.xp, 'Logistics Expert');
                await updateDoc(userDocRef, { lastLogisticsChallengeWeek: weekId });
                showChallengeCompletionAnimation('logisticsExpert');
            }
        }

        // --- Monthly Challenge Check ---
        const monthId = getCurrentMonthId();
        const lastMonthlyCompletion = userData.lastMonthlyChallengeMonth || '';
        if (lastMonthlyCompletion !== monthId) {
            const { current } = await CHALLENGES_CONFIG.monthlyMarathon.getProgress(events);
            if (current >= CHALLENGES_CONFIG.monthlyMarathon.goal) {
                await updateDoc(userDocRef, { lastMonthlyChallengeMonth: monthId });
                showMessage("Monthly Challenge Complete! 3x XP is active for the rest of the month!", "success");

                const userAchievements = userData.achievementsData || {};
                if (!userAchievements.marathon_finisher) {
                    await awardXP(5000); 
                    const newAchievements = { ...userAchievements, marathon_finisher: { date: new Date().toISOString() }};
                    await updateDoc(userDocRef, { achievementsData: newAchievements });
                    showAchievementNotification({
                        id: 'marathon_finisher',
                        name: 'Marathon Finisher',
                        desc: 'Complete the Monthly Marathon challenge.',
                        icon: 'fa-shoe-prints',
                        color: 'text-yellow-400'
                    });
                }
    
                showChallengeCompletionAnimation('monthlyMarathon');
            }
        }
    } catch (error) {
        console.error("Error checking for challenge XP:", error);
    }
};

const showLevelUpNotification = (level, rankName, rankIcon) => {
    const modal = document.getElementById('level-up-modal');
    const iconContainer = document.getElementById('modal-level-up-icon');
    const messageEl = document.getElementById('modal-level-up-message');

    if (!modal || !iconContainer || !messageEl) return;

    // Dynamically create the icon with the correct classes and styles for the modal
    const rankClass = `level-badge-${rankName.toLowerCase().replace(' ', '-')}`;
    iconContainer.innerHTML = `
        <div class="level-badge-wrapper ${rankClass}" style="width: 100px; height: 100px; margin: 0 auto; font-size: 3rem;">
            <i class="fas ${rankIcon}"></i>
        </div>
    `;
    // Update the message with the new level and rank
    messageEl.innerHTML = `You have reached <span class="font-bold text-white">Level ${level}</span> and achieved the rank of <span class="font-bold text-white">${rankName}</span>!`;

    // Show the modal
    modal.classList.remove('hidden');
};

const getAppControlDocRef = () => { return doc(db, 'artifacts', safeAppId, 'app_control', 'version_info'); };		
		
// Updated showMessage function with custom duration support
const showMessage = (text, type = 'success', duration = 3000) => {
    const toast = document.getElementById('copy-toast');
    const toastIcon = document.getElementById('copy-toast-icon');
    const toastMessage = document.getElementById('copy-toast-message');

    if (!toast || !toastIcon || !toastMessage) return;

    // Clear any existing timer to prevent the toast from hiding prematurely
    if (messageTimeout) {
        clearTimeout(messageTimeout);
    }

    // Set icon and color based on the message type
    if (type === 'success') {
        toastIcon.innerHTML = `<i class="fas fa-check-circle text-green-400"></i>`;
        toast.style.borderColor = '#34d399'; // Green border
    } else if (type === 'error') {
        toastIcon.innerHTML = `<i class="fas fa-times-circle text-red-400"></i>`;
        toast.style.borderColor = '#ef4444'; // Red border
    } else if (type === 'winner') {
        // NEW: Special Gold Style for Winners
        toastIcon.innerHTML = `<i class="fas fa-trophy text-yellow-400 animate-bounce"></i>`;
        toast.style.borderColor = '#fbbf24'; // Gold border
    }
    toastMessage.textContent = text;
    toast.classList.add('show');

    messageTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
};

const getAchievementClassFromColor = (colorClass) => {
    switch (colorClass) {
        // Gold Tier
        case 'text-yellow-400':
        case 'text-yellow-300':
            return 'achievement-icon-gold';
        // Silver Tier
        case 'text-slate-400':
        case 'text-slate-300':
        case 'text-gray-300':
            return 'achievement-icon-silver';
        // Bronze Tier
        case 'text-amber-500':
        case 'text-amber-600':
            return 'achievement-icon-bronze';
        // Unique Colors
        case 'text-blue-400':
        case 'text-blue-500':
            return 'achievement-icon-blue';
        case 'text-green-400':
        case 'text-green-600':
            return 'achievement-icon-green';
        case 'text-teal-400':
            return 'achievement-icon-teal';
        case 'text-indigo-400':
            return 'achievement-icon-indigo';
        case 'text-white':
            return 'achievement-icon-white';
        case 'text-pink-400':
            return 'achievement-icon-pink';
        case 'text-orange-400':
            return 'achievement-icon-orange';
        case 'text-sky-400':
            return 'achievement-icon-sky';
        case 'text-lime-400':
            return 'achievement-icon-lime';
        case 'text-cyan-400':
        case 'text-cyan-500':
            return 'achievement-icon-cyan';
        case 'text-purple-400':
            return 'achievement-icon-purple';
        case 'text-violet-500':
            return 'achievement-icon-violet';
        case 'text-red-400':
        case 'text-red-500':
            return 'achievement-icon-red';
        // Fallback
        default:
            return 'achievement-icon-default';
    }
};	

const triggerCelebration = () => {
    // A fun confetti burst from both sides of the screen for 3 seconds
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    function randomInRange(min, max) {
        return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) {
            return clearInterval(interval);
        }
        const particleCount = 50 * (timeLeft / duration);
        // Launch from the left
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
        // Launch from the right
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
    }, 250);
};

// --- NEW: Leveling System Functions ---
const calculateXpForLevel = (level) => {
    if (level <= 1) return BASE_XP;
    // Apply the increase factor for every 2 levels
    const effectiveLevel = Math.floor((level - 1) / 2);
    return Math.floor(BASE_XP * Math.pow(XP_INCREASE_FACTOR, effectiveLevel));
};

const calculateLevelInfo = (totalXp) => {
    let level = 1;
    let xpForNextLevel = calculateXpForLevel(level);
    let xpTowardsNextLevel = totalXp;

    while (xpTowardsNextLevel >= xpForNextLevel) {
        xpTowardsNextLevel -= xpForNextLevel;
        level++;
        xpForNextLevel = calculateXpForLevel(level);
    }

    const rank = LEVEL_RANKS.slice().reverse().find(r => level >= r.level) || LEVEL_RANKS[0];

    return {
        level: level,
        rankName: rank.name,
        rankIcon: rank.icon,
        xpForNextLevel: xpForNextLevel,
        xpProgress: xpTowardsNextLevel,
        totalXp: totalXp
    };
};


const awardXP = async (baseAmount, actionName = 'Action Complete') => {
    if (!userId || isAnonymous || baseAmount <= 0) return 0;

    const userDocRef = getUserRootDocRef(userId);
    const userDoc = await getDoc(userDocRef);
    const userData = userDoc.exists() ? userDoc.data() : { xp: 0 };
    
    let finalAmount = baseAmount;
    let multiplier = 1;

    const monthId = getCurrentMonthId();
    const isMonthlyChallengeDone = userData.lastMonthlyChallengeMonth === monthId;

    const weekId = getCurrentWeekId();
    const isWeeklyChallengeDone = userData.lastWeeklyChallengeWeek === weekId;

    if (isMonthlyChallengeDone) {
        finalAmount *= 3;
        multiplier = 3;
    } else if (isWeeklyChallengeDone) {
        finalAmount *= 2;
        multiplier = 2;
    }

    try {
        const oldXp = userData.xp || 0;
        const newXp = oldXp + finalAmount;

        const oldLevelInfo = calculateLevelInfo(oldXp);
        const newLevelInfo = calculateLevelInfo(newXp);

        await setDoc(userDocRef, { xp: newXp }, { merge: true });
        await updateLeaderboardData(userId, newLevelInfo);
		// UPDATE CACHE: Instantly update the local memory so the UI knows about the new XP!
		if (cachedStatsUserData) {
		    cachedStatsUserData.xp = newXp;
		}

        // --- THIS IS THE NEW NOTIFICATION LOGIC ---
        let message = actionName;
        if (multiplier > 1) {
            message = `${actionName}! +${finalAmount} XP (${multiplier}x Bonus!)`;
        } else {
            message = `${actionName}! +${finalAmount} XP`;
        }
        showMessage(message, 'success');
        // --- END OF NEW LOGIC ---

        // Check for a LEVEL up
        if (newLevelInfo.level > oldLevelInfo.level) {
            showLevelUpNotification(newLevelInfo.level, newLevelInfo.rankName, newLevelInfo.rankIcon);
            triggerCelebration();
            const sound = document.getElementById('level-up-sound');
            if (sound) {
                sound.currentTime = 0;
                sound.play().catch(e => console.error("Level up audio play failed:", e));
            }
            const levelDisplay = document.getElementById('level-display');
            if (levelDisplay) {
                levelDisplay.classList.add('level-up-animation');
                setTimeout(() => levelDisplay.classList.remove('level-up-animation'), 1500);
            }
        }
        
        // Check for a RANK up
        if (newLevelInfo.rankName !== oldLevelInfo.rankName) {
            const iconWrapper = document.querySelector('.level-badge-wrapper');
            if (iconWrapper) {
                iconWrapper.classList.add('rank-up-glow');
                setTimeout(() => iconWrapper.classList.remove('rank-up-glow'), 1500);
            }
        }
        
        return finalAmount; // Return the final calculated XP amount

    } catch (error) {
        console.error("Error awarding XP:", error);
        return 0; // Return 0 on error
    }
};

		
const showAchievementNotification = (achievement) => {
    const toast = document.getElementById('achievement-toast');
    const toastMessage = document.getElementById('toast-message');
    const toastIcon = document.getElementById('toast-icon');
    const sound = document.getElementById('achievement-sound');

    if (!toast || !toastMessage || !toastIcon || !sound) return;

    // Update content
    toastIcon.innerHTML = `<i class="fas ${achievement.icon}"></i>`;
	toastIcon.className = `text-2xl ${achievement.color || 'text-yellow-400'}`;
    toastMessage.textContent = achievement.name;

    // Play sound
    sound.currentTime = 0; // Rewind to start
    sound.play().catch(e => console.error("Audio play failed:", e));

    // Show toast
    toast.classList.remove('opacity-0', 'translate-y-5');

    // Hide after 5 seconds
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-5');
    }, 5000);
    setTimeout(() => {
        const badgeOnPage = document.querySelector(`.achievement-badge[data-id="${achievement.id}"]`);
        if (badgeOnPage) {
            badgeOnPage.classList.add('newly-unlocked');
            // Remove the class after the animation finishes so it doesn't replay
            setTimeout(() => {
                badgeOnPage.classList.remove('newly-unlocked');
            }, 700); // Must match the animation duration in CSS
        }
    }, 100);
};
		

   const clearTutorialHighlights = () => {
    document.querySelectorAll('.highlight-target').forEach(el => {
        el.classList.remove('highlight-target');
    });
};		

// Add this new function to your helper functions section
const renderLinks = (searchQuery = '') => {
    const staticLinksList = document.getElementById('static-links-list');
    const userLinksList = document.getElementById('user-links-list');
    const userLinksSection = document.getElementById('user-links-section');

    const query = searchQuery.toLowerCase();
    const regex = new RegExp(`(${query})`, 'gi'); // Create a case-insensitive regex for highlighting

    // Filter static links based on the search query
    const filteredStaticLinks = defaultLinks.filter(link => 
        link.title.toLowerCase().includes(query) ||
        (link.description && link.description.toLowerCase().includes(query))
    );
    
    // Filter user links if they exist
    let filteredUserLinks = [];
    if (userLinks && userLinks.length > 0) {
        filteredUserLinks = userLinks.filter(link =>
            link.title.toLowerCase().includes(query) ||
            (link.description && link.description.toLowerCase().includes(query))
        );
    }
    
    // Render static links
    staticLinksList.innerHTML = '';
    if (filteredStaticLinks.length > 0) {
        filteredStaticLinks.forEach(link => {
            const card = document.createElement('div');
            card.className = 'link-card rounded-xl p-6 shadow-2xl pulse-effect';
            
            // Apply highlighting to title and description
            const highlightedTitle = query ? link.title.replace(regex, `<span class="highlight">$&</span>`) : link.title;
            const highlightedDescription = query && link.description ? link.description.replace(regex, `<span class="highlight">$&</span>`) : (link.description || 'No description available.');

            card.innerHTML = `
                <a href="${link.url}" target="_blank" rel="noopener noreferrer" class="block">
                    <h3 class="font-bold text-xl text-white hover:text-sky-300 transition-colors mb-2">${highlightedTitle}</h3>
                    <p class="text-sm text-gray-400">${highlightedDescription}</p>
                </a>
            `;
            staticLinksList.appendChild(card);
        });
    } else {
        staticLinksList.innerHTML = '<p class="text-center text-gray-400 col-span-full">No static links found.</p>';
    }
    
    // Render user links
    userLinksList.innerHTML = '';
    if (!isAnonymous && filteredUserLinks.length > 0) {
        userLinksSection.classList.remove('hidden'); // Ensure the section is visible if there are links
        filteredUserLinks.forEach(link => {
            const card = document.createElement('div');
            card.className = 'link-card rounded-xl p-6 shadow-2xl pulse-effect flex items-center justify-between relative';
            
            // Apply highlighting to title and description
            const highlightedTitle = query ? link.title.replace(regex, `<span class="highlight">$&</span>`) : link.title;
            const highlightedDescription = query && link.description ? link.description.replace(regex, `<span class="highlight">$&</span>`) : (link.description || 'No description available.');
            
            card.innerHTML = `
                <a href="${link.url}" target="_blank" rel="noopener noreferrer" class="flex-grow">
                    <h3 class="font-bold text-xl text-white hover:text-sky-300 transition-colors mb-2">${highlightedTitle}</h3>
                    <p class="text-sm text-gray-400">${highlightedDescription}</p>
                </a>
                <div class="relative inline-block text-left" data-doc-id="${link.id}" data-title="${link.title}" data-url="${link.url}" data-description="${link.description || ''}">
                    <button type="button" class="meatballs-button p-2 text-gray-400 hover:text-white transition-colors" aria-expanded="true" aria-haspopup="true">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 pointer-events-none">
                            <path d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM10 8.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM11.5 15a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z" />
                        </svg>
                    </button>
                    <div class="meatballs-menu hidden absolute right-0 mt-2 w-48 origin-top-right rounded-md bg-gray-700 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                        <div class="py-1">
                            <button class="edit-link-btn text-gray-200 block w-full text-left px-4 py-2 text-sm hover:bg-gray-600">Edit</button>
                            <button class="delete-link-btn text-red-400 block w-full text-left px-4 py-2 text-sm hover:bg-gray-600">Delete</button>
                        </div>
                    </div>
                </div>
            `;
            userLinksList.appendChild(card);
        });
    } else if (!isAnonymous) {
        userLinksList.innerHTML = '<p class="text-center text-gray-400 col-span-full">No user links found.</p>';
    }
    
    // Hide or show the user links section based on the filtered results
    if (isAnonymous) {
      userLinksSection.classList.add('hidden');
    } else {
      userLinksSection.classList.remove('hidden');
    }
};

		

// --- Modern Tutorial Configuration & Logic ---
const TUTORIAL_CONFIG = [
    { title: "Welcome to Your Workspace! 👋", text: "Let's take a quick tour to supercharge your productivity. We've added powerful new AI and Analytics features.", icon: "fa-rocket", page: "canned-responses", target: null },
    { title: "Create Responses", text: "Click here to **add a new canned response**. You can organize them with labels and assign them to specific categories.", icon: "fa-plus-circle", page: "canned-responses", target: () => document.getElementById('add-response-section') },
    { title: "Lightning Fast Search", text: "Instantly find what you need. **Type keywords** here to filter your entire library in real-time.", icon: "fa-search", page: "canned-responses", target: () => document.getElementById('search-bar-container') },
    { title: "Smart Placeholders", text: "Use brackets like `[Device Model]` in your text. We'll automatically prompt you to **fill them in** before copying!", icon: "fa-keyboard", page: "canned-responses", target: () => { const item = Array.from(document.querySelectorAll('.response-item')).find(el => el.textContent.includes('[')); return item || document.querySelector('.response-item'); } },
    { title: "AI Neural Drafter 🧠", text: "Stuck on a weird ticket? Describe the situation here. Gemini will scan the global policy base and **write a perfect, compliant email for you.**", icon: "fa-brain", page: "canned-responses", target: () => document.getElementById('magic-draft-card') || document.getElementById('open-magic-draft-btn') },
    { title: "FedEx Tracker 📦", text: "Paste messy email threads or chat logs here. The system will automatically **extract all tracking numbers** at once.", icon: "fa-box-open", page: "fedex-tracker", target: () => document.getElementById('input-text-fedex') },
    { title: "One-Click Execution", text: "Click here to **copy all extracted numbers** and automatically launch FedEx tracking in a new tab.", icon: "fa-external-link-alt", page: "fedex-tracker", target: () => document.getElementById('copy-button-fedex') },
    { title: "SLA Dashboard ⏱️", text: "Never miss a deadline. Use the **Deadline Engine** to calculate exact turnaround times based on business hours.", icon: "fa-calculator", page: "sla-dashboard", target: () => document.getElementById('sla-deadline-engine') || document.getElementById('sla-search-input') },
    { title: "Global Leaderboard 🌍", text: "Compete with your team! See who can clear the most tickets. Climb the ranks to become the **Weekly Champion** or **Monthly Legend**.", icon: "fa-globe", page: "my-stats", target: () => document.getElementById('leaderboard-container') },
    { title: "Personal Records 🏆", text: "Track your own personal bests. Smash your daily, weekly, and monthly output records to earn **massive XP bonuses**.", icon: "fa-bolt", page: "my-stats", target: () => document.getElementById('record-daily').closest('.bg-black\\/30') || document.getElementById('record-daily-status') },
    { title: "Track Your Impact 📊", text: "Keep working to **level up your rank** and unlock a massive library of hidden achievements. You're ready to go!", icon: "fa-medal", page: "my-stats", target: null }
];

let currentTutorialStep = 0;

const closeTutorial = async () => {
    isTutorialActive = false;
    document.body.classList.remove('tutorial-active');
    document.getElementById('tutorial-spotlight').classList.remove('active');
    document.getElementById('modern-tooltip').classList.remove('visible');
    setTimeout(() => { document.getElementById('modern-tooltip').classList.add('hidden'); }, 400);
    document.querySelectorAll('.tutorial-target-active').forEach(el => el.classList.remove('tutorial-target-active'));

    if (userId) {
        const optOut = document.getElementById('tooltip-opt-out').checked;
        if (optOut) {
            try { await setDoc(getUserRootDocRef(userId), { tutorialSeen: true }, { merge: true }); } catch (e) { console.error(e); }
        }
    }
};

const positionTooltip = (targetEl) => {
    const tooltip = document.getElementById('modern-tooltip');
    const spotlight = document.getElementById('tutorial-spotlight');

    if (!targetEl) {
        spotlight.classList.remove('active');
        tooltip.style.top = ''; tooltip.style.left = ''; tooltip.style.bottom = ''; tooltip.style.right = '';
        tooltip.classList.add('centered');
        return;
    }

    tooltip.classList.remove('centered');
    spotlight.classList.add('active');
    targetEl.classList.add('tutorial-target-active');
    targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

    setTimeout(() => {
        const rect = targetEl.getBoundingClientRect();
        const pad = 12;
        spotlight.style.top = `${rect.top - pad}px`;
        spotlight.style.left = `${rect.left - pad}px`;
        spotlight.style.width = `${rect.width + (pad * 2)}px`;
        spotlight.style.height = `${rect.height + (pad * 2)}px`;

        const tooltipRect = tooltip.getBoundingClientRect();
        const spacing = 24; 
        let top, left;

        const spaceRight = window.innerWidth - rect.right;
        const spaceBottom = window.innerHeight - rect.bottom;
        const spaceLeft = rect.left;

        if (spaceRight > tooltipRect.width + spacing) {
            left = rect.right + spacing; top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
        } else if (spaceLeft > tooltipRect.width + spacing) {
            left = rect.left - tooltipRect.width - spacing; top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
        } else if (spaceBottom > tooltipRect.height + spacing) {
            top = rect.bottom + spacing; left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
        } else {
            top = rect.top - tooltipRect.height - spacing; left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
        }

        if (left < 10) left = 10;
        if (left + tooltipRect.width > window.innerWidth - 10) left = window.innerWidth - tooltipRect.width - 10;
        if (top < 10) top = 10;
        if (top + tooltipRect.height > window.innerHeight - 10) top = window.innerHeight - tooltipRect.height - 10;

        tooltip.style.top = `${top}px`; tooltip.style.left = `${left}px`;
    }, 300); 
};

const showTutorialStep = async (stepIndex) => {
    isTutorialActive = true;
    document.body.classList.add('tutorial-active');
    const config = TUTORIAL_CONFIG[stepIndex];
    const tooltip = document.getElementById('modern-tooltip');

    document.querySelectorAll('.tutorial-target-active').forEach(el => el.classList.remove('tutorial-target-active'));
    tooltip.classList.remove('visible'); 

    if (currentPage !== config.page) {
        currentPage = config.page;
        renderContent();
        await new Promise(r => setTimeout(r, 400));
    }

    document.getElementById('tooltip-progress').textContent = `Step ${stepIndex + 1} of ${TUTORIAL_CONFIG.length}`;
    document.getElementById('tooltip-title').textContent = config.title;
    
    const iconWrapper = document.getElementById('tooltip-icon-wrapper');
    document.getElementById('tooltip-icon').className = `fas ${config.icon}`;
    
    if (config.icon === 'fa-brain' || config.icon === 'fa-trophy') {
        iconWrapper.className = "w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center text-2xl mb-4 border border-purple-500/30 shadow-inner";
    } else if (config.icon === 'fa-calculator' || config.icon === 'fa-globe') {
        iconWrapper.className = "w-12 h-12 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center text-2xl mb-4 border border-pink-500/30 shadow-inner";
    } else {
        iconWrapper.className = "w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-2xl mb-4 border border-blue-500/30 shadow-inner";
    }
    
    const formattedText = config.text.replace(/\*\*(.*?)\*\*/g, '<span class="text-white font-bold">$1</span>').replace(/`(.*?)`/g, '<span class="bg-gray-800 text-pink-400 px-1 py-0.5 rounded font-mono text-xs">$1</span>');
    document.getElementById('tooltip-content').innerHTML = formattedText;

    const backBtn = document.getElementById('tooltip-back-btn');
    const nextBtn = document.getElementById('tooltip-next-btn');
    const nextText = document.getElementById('tooltip-next-text');
    const optOut = document.getElementById('tooltip-opt-out-container');

    backBtn.style.visibility = stepIndex === 0 ? 'hidden' : 'visible';
    
    if (stepIndex === TUTORIAL_CONFIG.length - 1) {
        nextText.textContent = "Finish & Start";
        nextBtn.classList.replace('bg-blue-600', 'bg-green-600');
        nextBtn.classList.replace('hover:bg-blue-500', 'hover:bg-green-500');
        nextBtn.querySelector('i').className = "fas fa-check text-xs";
        optOut.classList.remove('hidden'); optOut.classList.add('flex');
    } else {
        nextText.textContent = "Next";
        nextBtn.classList.replace('bg-green-600', 'bg-blue-600');
        nextBtn.classList.replace('hover:bg-green-500', 'hover:bg-blue-500');
        nextBtn.querySelector('i').className = "fas fa-arrow-right text-xs";
        optOut.classList.remove('flex'); optOut.classList.add('hidden');
    }

    tooltip.classList.remove('hidden');
    requestAnimationFrame(() => {
        const targetElement = config.target ? config.target() : null;
        positionTooltip(targetElement);
        tooltip.classList.add('visible');
    });

    currentTutorialStep = stepIndex;
};
		

const logUserEvent = async (eventType, eventData = {}) => {
    if (!userId || isAnonymous) return; 
    
    // --- NEW: Track the "Previous" action for sequence learning ---
    // We save this to the browser's temporary memory (Session Storage)
    if (eventType === 'copy' && eventData.responseId) {
        sessionStorage.setItem('last_copied_id', eventData.responseId);
        
        // Trigger an immediate refresh of the suggestions box
        // We use a small timeout to let the UI settle
        setTimeout(updateSmartSuggestions, 500); 
    }
    // --- END NEW ---

    try {
        const eventsCollectionRef = getUserEventsCollectionRef(userId);
        
        // Clean undefined data before sending to Firestore
        const cleanedEventData = {};
        for (const key in eventData) {
            if (eventData[key] !== undefined) {
                cleanedEventData[key] = eventData[key];
            }
        }   

        await addDoc(eventsCollectionRef, {
            type: eventType,
            timestamp: serverTimestamp(),
            ...cleanedEventData
        });
		// Instantly update our local memory cache so the UI doesn't need to re-download from Firebase!
	if (cachedStatsEvents !== null) {
		cachedStatsEvents.unshift({
		        type: eventType,
		        // Create a fake temporary timestamp for the UI until they refresh
		        timestamp: { toDate: () => new Date() }, 
		        ...cleanedEventData
		    });
		}

        // (Keep your existing Globetrotter logic here...)
        if (eventType === 'copy' && eventData.categoryName) {
            let categoriesUsed = JSON.parse(sessionStorage.getItem('categoriesUsedInSession') || '[]');
            if (!categoriesUsed.includes(eventData.categoryName)) {
                categoriesUsed.push(eventData.categoryName);
                sessionStorage.setItem('categoriesUsedInSession', JSON.stringify(categoriesUsed));
                if (categoriesUsed.length >= 2) {
                    const events = await getDocs(query(eventsCollectionRef));
                    const hasMilestone = events.docs.some(doc => doc.data().type === 'globetrotter_milestone');
                    if (!hasMilestone) {
                         await addDoc(eventsCollectionRef, { type: 'globetrotter_milestone', timestamp: serverTimestamp() });
                    }
                }
            }
        }

    } catch (error) {
        console.error("Error logging user event:", error);
    }
};

const updateDarkModeStreak = async () => {
    if (isAnonymous || !userId || document.body.classList.contains('light-mode')) {
        return; // Only run for signed-in users when in dark mode
    }

    const userDocRef = getUserRootDocRef(userId);
    const userDoc = await getDoc(userDocRef);
    
    const todayStr = new Date().toISOString().split('T')[0];
    
    const data = userDoc.exists() ? userDoc.data() : {};
    const darkModeUsage = data.darkModeUsage || { lastUsed: null, streak: 0 };

    if (darkModeUsage.lastUsed === todayStr) {
        return; // Already counted for today
    }
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (darkModeUsage.lastUsed === yesterdayStr) {
        darkModeUsage.streak++; // It's a consecutive day, increment!
    } else {
        darkModeUsage.streak = 1; // Not consecutive, reset to 1
    }
    
    darkModeUsage.lastUsed = todayStr;
    
    await setDoc(userDocRef, { darkModeUsage }, { merge: true });
    logUserEvent('used_dark_mode'); // Log this to trigger the achievement check
};

const getTier = (count, tiers) => {
    // Start with the default "locked" state
    let currentTier = {
        name: tiers[0].name,
        desc: `Reach the first tier at ${tiers[0].goal}!`,
        icon: 'fa-lock', // A locked icon by default
        color: 'text-gray-600',
        unlocked: false,
        progress: count,
        goal: tiers[0].goal
    };

    // Loop backward through the tiers to find the highest one the user has achieved
    for (let i = tiers.length - 1; i >= 0; i--) {
        if (count >= tiers[i].goal) {
            const nextGoal = (i + 1 < tiers.length) ? tiers[i+1].goal : tiers[i].goal;
            currentTier = { ...tiers[i], unlocked: true, progress: count, goal: nextGoal };

            // Update the description based on progress to the next tier
            if (count >= nextGoal && i === tiers.length - 1) {
                currentTier.desc = "Max tier reached!";
            } else {
                currentTier.desc = `Reach the next tier at ${nextGoal}!`;
            }
            break; // Found the correct tier, no need to check lower ones
        }
    }
    return currentTier;
};		


// REPLACE your old `calculateAllAchievements` function with this one.

const calculateAllAchievements = (events, userData, workshopItems = []) => {
    const userAchievements = userData.achievementsData || {};
    const firstSignIn = userData.firstSignIn ? userData.firstSignIn.toDate() : null;
    const darkModeUsage = userData.darkModeUsage || { streak: 0 };
    const totalCopies = events.filter(e => e.type === 'copy').length;
    const totalCategories = Object.keys(categories).length;
    const hasArchitectAchievement = Object.values(categories).some(cat => cat.responses && cat.responses.length >= 5);
    const visitedPages = new Set(events.filter(e => e.type === 'visit_page').map(e => e.page));
    const daysSinceSignIn = firstSignIn ? Math.floor((new Date() - firstSignIn) / (1000 * 60 * 60 * 24)) : 0;
    const dailyActivity = events.reduce((acc, event) => {
        if (!event.timestamp) return acc;
        const date = event.timestamp.toDate().toISOString().split('T')[0];
        if (!acc[date]) acc[date] = { copies: 0, tracking: 0, links: 0 };
        if (event.type === 'copy') acc[date].copies++;
        if (event.type === 'extract_tracking') acc[date].tracking += (event.count || 0);
        if (event.type === 'add_link') acc[date].links++;
        return acc;
    }, {});
    const hasPerfectDay = Object.values(dailyActivity).some(day => day.copies >= 10 && day.tracking >= 3 && day.links >= 1);
    const hasCreatedCategory = events.some(e => e.type === 'create_category');
    const hasCreatedResponseWithPlaceholder = events.some(e => e.type === 'create_response' && /\[([^\]]+)\]/g.test(e.text || ''));
    const hasPinnedResponse = events.some(e => e.type === 'pin_response');
    const hasLivingLibrary = hasCreatedCategory && hasCreatedResponseWithPlaceholder && hasPinnedResponse;
    const recentCopyEvents = events.filter(e => e.type === 'copy' && e.timestamp?.toDate() > new Date(Date.now() - 30 * 60 * 1000));
    const uniqueCategoriesIn30Min = new Set(recentCopyEvents.map(e => e.categoryName)).size;
    const hasTheScribe = uniqueCategoriesIn30Min >= 5;
    const hasHistorian = daysSinceSignIn >= 365;
    const isBusinessDay = (date) => { const day = date.getDay(); return day > 0 && day < 6; };
    const usageDates = [...new Set(events.filter(e => e.timestamp).map(e => e.timestamp.toDate().toISOString().split('T')[0]))].sort();
    let maxStreak = 0;
    if (usageDates.length > 0) {
        let currentStreak = 1;
        for (let i = 1; i < usageDates.length; i++) {
            const prevDate = new Date(usageDates[i - 1]);
            const currentDate = new Date(usageDates[i]);
            if (!isBusinessDay(currentDate)) continue;
            const diffTime = currentDate - prevDate;
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays === 1 || (prevDate.getDay() === 5 && diffDays === 3)) {
                currentStreak++;
            } else {
                maxStreak = Math.max(maxStreak, currentStreak);
                currentStreak = 1;
            }
        }
        maxStreak = Math.max(maxStreak, currentStreak);
    }
    const hasStreakBreaker = maxStreak >= 90;
    const deletedInLast5Mins = events.filter(e => e.type === 'delete_response_single' && e.timestamp?.toDate() > new Date(Date.now() - 5 * 60 * 1000)).length;
    const hasCleanSlate = deletedInLast5Mins >= 5;

    // --- NEW WORKSHOP CHECKS ---
    const hasPublished = events.some(e => e.type === 'publish_to_workshop');
    const has3Upvotes = workshopItems.some(item => (item.upvotes || 0) >= 3);

    const dailyProgress = events.filter(e => e.type === 'copy' && e.timestamp && e.timestamp.toDate() >= new Date(new Date().toISOString().split('T')[0])).length;
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - (startOfWeek.getDay() === 0 ? 6 : startOfWeek.getDay() - 1));
    startOfWeek.setHours(0, 0, 0, 0);
    const weeklyCopyProgress = events.filter(e => e.type === 'copy' && e.timestamp?.toDate() >= startOfWeek).length;
    const weeklyLogisticsProgress = events.filter(e => e.type === 'extract_tracking' && e.timestamp?.toDate() >= startOfWeek).length;
    const monthlyProgress = events.filter(e => e.type === 'copy' && e.timestamp?.toDate() >= new Date(new Date().getFullYear(), new Date().getMonth(), 1)).length;

    const allChallengesComplete = 
        dailyProgress >= CHALLENGES_CONFIG.dailyCopies.goal &&
        weeklyCopyProgress >= CHALLENGES_CONFIG.weeklyCopies.goal &&
        monthlyProgress >= CHALLENGES_CONFIG.monthlyMarathon.goal &&
        weeklyLogisticsProgress >= CHALLENGES_CONFIG.logisticsExpert.goal;

    const hasChallengeChampion = allChallengesComplete;

    const copyTiers = getTier(totalCopies, [
        { name: "Copycat", goal: 10, icon: "fa-clipboard", color: "text-amber-500" },
        { name: "Wordsmith", goal: 50, icon: "fa-clipboard", color: "text-slate-400" },
        { name: "Master of Efficiency", goal: 100, icon: "fa-clipboard", color: "text-yellow-400" }
    ]);
    const librarianTiers = getTier(totalCategories, [
        { name: "The Librarian", goal: 5, icon: "fa-book-open", color: "text-amber-500" },
        { name: "Head Archivist", goal: 10, icon: "fa-book-open", color: "text-slate-400" },
        { name: "Chief Organizer", goal: 25, icon: "fa-book-open", color: "text-yellow-400" }
    ]);

    const allAchievements = [
        { id: 'first_responder', name: "First Responder", desc: "Copied your first response.", icon: "fa-rocket", color: "text-blue-400", unlocked: totalCopies > 0 || !!userAchievements.first_responder },
        { id: 'copy_tiers', name: copyTiers.name, desc: `Copied ${totalCopies} / ${copyTiers.goal} responses.`, icon: copyTiers.icon, color: copyTiers.color, unlocked: copyTiers.unlocked || !!userAchievements.copy_tiers },
        { id: 'the_creator', name: "The Creator", desc: "Created your first response.", icon: "fa-plus-circle", color: "text-green-400", unlocked: events.some(e => e.type === 'create_response') || !!userAchievements.the_creator },
        { id: 'librarian_tiers', name: librarianTiers.name, desc: `Created ${totalCategories} / ${librarianTiers.goal} categories.`, icon: librarianTiers.icon, color: librarianTiers.color, unlocked: librarianTiers.unlocked || !!userAchievements.librarian_tiers },
        { id: 'the_architect', name: "The Architect", desc: "Create a category with 5+ responses.", icon: "fa-drafting-compass", color: "text-teal-400", unlocked: hasArchitectAchievement || !!userAchievements.the_architect },
        { id: 'the_editor', name: "The Editor", desc: "Edited a response.", icon: "fa-pencil-alt", color: "text-indigo-400", unlocked: events.some(e => e.type === 'edit_response') || !!userAchievements.the_editor },
        { id: 'the_curator', name: "The Curator", desc: "Pinned a response.", icon: "fa-thumbtack", color: "text-white", unlocked: hasPinnedResponse || !!userAchievements.the_curator },
        { id: 'the_color_coder', name: "The Color Coder", desc: "Changed a category's color.", icon: "fa-palette", color: "text-pink-400", unlocked: events.some(e => e.type === 'change_color') || !!userAchievements.the_color_coder },
        { id: 'the_explorer', name: "The Explorer", desc: "Visited all main pages.", icon: "fa-compass", color: "text-orange-400", unlocked: (visitedPages.has('canned-responses') && visitedPages.has('fedex-tracker') && visitedPages.has('helpful-links')) || !!userAchievements.the_explorer },
        { id: 'the_data_hoarder', name: "The Data Hoarder", desc: "Imported a data file.", icon: "fa-cloud-download-alt", color: "text-sky-400", unlocked: events.some(e => e.type === 'import_data') || !!userAchievements.the_data_hoarder },
        { id: 'the_personalizer', name: "The Personalizer", desc: "Added a new helpful link.", icon: "fa-link", color: "text-lime-400", unlocked: events.some(e => e.type === 'add_link') || !!userAchievements.the_personalizer },
        { id: 'the_globetrotter', name: "The Globetrotter", desc: "Used responses from 2+ categories in one session.", icon: "fa-globe-americas", color: "text-cyan-400", unlocked: events.some(e => e.type === 'globetrotter_milestone') || !!userAchievements.the_globetrotter },
        { id: 'the_night_owl', name: "The Night Owl", desc: `Use dark mode for 5 consecutive days. (${darkModeUsage.streak}/5)`, icon: "fa-moon", color: "text-purple-400", unlocked: (darkModeUsage.streak >= 5) || !!userAchievements.the_night_owl },
        { id: 'endless_scroll', name: "The Endless Scroll", desc: `Copy 1,000 responses. (${totalCopies}/1000)`, icon: "fa-infinity", color: "text-violet-500", unlocked: (totalCopies >= 1000) || !!userAchievements.endless_scroll },
        { id: 'perfect_day', name: "The Perfect Day", desc: "Copy 10+ responses, extract 3+ tracking numbers, and add a link in one day.", icon: "fa-sun", color: "text-yellow-300", unlocked: hasPerfectDay || !!userAchievements.perfect_day },
        { id: 'living_library', name: "The Living Library", desc: "Create a category, add a response with a placeholder, and pin it.", icon: "fa-book-dead", color: "text-green-600", unlocked: hasLivingLibrary || !!userAchievements.living_library },
        { id: 'the_scribe', name: "The Scribe", desc: "Use a response from 5 different categories in 30 minutes.", icon: "fa-feather-alt", color: "text-gray-300", unlocked: hasTheScribe || !!userAchievements.the_scribe },
        { id: 'the_historian', name: "The Historian", desc: `Be a member for 365 days. (${daysSinceSignIn}/365)`, icon: "fa-calendar-alt", color: "text-red-400", unlocked: hasHistorian || !!userAchievements.the_historian },
        { id: 'marathon_finisher', name: "Marathon Finisher", desc: "Complete the Monthly Marathon challenge.", icon: "fa-shoe-prints", color: "text-yellow-400", unlocked: !!userAchievements.marathon_finisher },
        { id: 'challenge_champion', name: "Challenge Champion", desc: "Complete all active challenges at the same time.", icon: "fa-shield-alt", color: "text-teal-400", unlocked: hasChallengeChampion || !!userAchievements.challenge_champion },
        { id: 'streak_breaker', name: "The Streak Breaker", desc: `Maintain a 90 business-day usage streak. (${maxStreak}/90)`, icon: "fa-fire", color: "text-red-500", unlocked: hasStreakBreaker || !!userAchievements.streak_breaker },
        { id: 'meticulous_mover', name: "The Meticulous Mover", desc: "Edit a response and move it to a different category.", icon: "fa-truck-moving", color: "text-blue-500", unlocked: events.some(e => e.type === 'move_response') || !!userAchievements.meticulous_mover },
        { id: 'clean_slate', name: "The Clean Slate", desc: "Delete at least 5 responses in a single session.", icon: "fa-broom", color: "text-amber-600", unlocked: hasCleanSlate || !!userAchievements.clean_slate },
        { id: 'the_purist', name: "The Purist", desc: "Copy a response that has no placeholders.", icon: "fa-file-alt", color: "text-slate-300", unlocked: events.some(e => e.type === 'copy_purist') || !!userAchievements.the_purist },
        { id: 'the_improviser', name: "The Improviser", desc: "Add a placeholder to a response that didn't have one.", icon: "fa-cogs", color: "text-cyan-500", unlocked: events.some(e => e.type === 'add_placeholder') || !!userAchievements.the_improviser },
        { id: 'community_voice', name: "The Community Voice", desc: "Publish a canned response to the Workshop.", icon: "fa-bullhorn", color: "text-indigo-400", unlocked: hasPublished || !!userAchievements.community_voice },
        { id: 'crowd_favorite', name: "Crowd Favorite", desc: "Receive 3 upvotes on a Workshop submission.", icon: "fa-heart", color: "text-pink-400", unlocked: has3Upvotes || !!userAchievements.crowd_favorite },
    ];    

    // Check for Grand Master separately
    const allOtherAchievementsUnlocked = allAchievements.every(ach => ach.unlocked);
    allAchievements.push({ id: 'grand_master', name: "The Grand Master", desc: "Unlock all other achievements.", icon: "fa-trophy", color: "text-yellow-400", unlocked: allOtherAchievementsUnlocked || !!userAchievements.grand_master });

    return allAchievements;
};


const checkAndNotifyAchievements = async (firstSignIn) => {
    if (!userId || isAnonymous) return;

    const milestoneAchievements = [
        'copy_tiers', 'librarian_tiers', 'endless_scroll', 'the_historian', 'streak_breaker', 'grand_master'
    ];

    // Get user data and events
    const userDocRef = getUserRootDocRef(userId);
    const userDoc = await getDoc(userDocRef);
    const userData = userDoc.exists() ? userDoc.data() : {};
    const userAchievements = userData.achievementsData || {};
    
    const eventsCollectionRef = getUserEventsCollectionRef(userId);
    const snapshot = await getDocs(query(eventsCollectionRef));
    const events = snapshot.docs.map(doc => doc.data());

    // --- NEW: Fetch the user's Workshop items to check for upvotes ---
    const workshopQuery = query(collection(db, 'artifacts', safeAppId, 'workshop_responses'), where('authorId', '==', userId));
    const workshopSnap = await getDocs(workshopQuery);
    const workshopItems = workshopSnap.docs.map(doc => doc.data());

    // Call the helper function with the new workshop data
    const achievements = calculateAllAchievements(events, userData, workshopItems);

    // --- Special Bonus XP Checks ---
    const challengeChampion = achievements.find(a => a.id === 'challenge_champion');
    if (challengeChampion && challengeChampion.unlocked && !userAchievements.challenge_champion) {
        awardXP(5000, 'Challenge Champion Bonus!');
    }

    // --- Regular Achievement Unlocking and Saving ---
    const newAchievementsToSave = {};
    achievements.forEach(ach => {
        if (ach.unlocked && !userAchievements[ach.id]) {
            showAchievementNotification(ach);
            newAchievementsToSave[ach.id] = { date: new Date().toISOString() };
            awardXP(XP_VALUES.UNLOCK_ACHIEVEMENT);
            if (milestoneAchievements.includes(ach.id)) {
                triggerCelebration();
            }
        }
    });

    if (Object.keys(newAchievementsToSave).length > 0) {
        const updatedAchievements = { ...userAchievements, ...newAchievementsToSave };
        await setDoc(userDocRef, { achievementsData: updatedAchievements }, { merge: true });
        
        try {
            const leaderboardDocRef = doc(db, "leaderboard", userId);
            const leaderboardDoc = await getDoc(leaderboardDocRef);
            const existingAchievements = leaderboardDoc.exists() ? leaderboardDoc.data().unlockedAchievements || [] : [];
            const newAchievementIds = Object.keys(newAchievementsToSave);
            const allAchievements = [...new Set([...existingAchievements, ...newAchievementIds])];
            await updateDoc(leaderboardDocRef, { unlockedAchievements: allAchievements });
        } catch(error) {
            console.error("Failed to update achievements on leaderboard:", error);
        }
    }
};
		
const getCannedResponsesBlueprint = async () => { return defaultCannedResponsesBlueprint; };
const getHelpfulLinksBlueprint = async () => { return defaultHelpfulLinksBlueprint; };
const getUserCannedResponsesDocRef = (uid) => { return doc(db, 'artifacts', safeAppId, 'users', uid, 'canned_responses_data', 'app_data'); };
const getUserHelpfulLinksCollectionRef = (uid) => { return collection(db, 'artifacts', safeAppId, 'users', uid, 'helpful_links_data'); };
const getUserRootDocRef = (uid) => { return doc(db, 'artifacts', safeAppId, 'users', uid); }
const getUserEventsCollectionRef = (uid) => { return collection(db, 'artifacts', safeAppId, 'users', uid, 'user_events'); };	

const runIcloudAutoBackup = async (uid, currentCategories) => {
    if (!uid || isAnonymous) return;

    try {
        const backupRef = doc(db, 'artifacts', safeAppId, 'users', uid, 'canned_responses_backup', 'latest');
        const backupDoc = await getDoc(backupRef);
        const now = Date.now();
        const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
        const dateEl = document.getElementById('cloud-backup-date');

        if (backupDoc.exists()) {
            const data = backupDoc.data();
            const lastBackupTime = data.timestamp ? data.timestamp.toMillis() : 0;
            
            // 1. Has it been 7 days?
            if (now - lastBackupTime < SEVEN_DAYS_MS) {
                if (dateEl) {
                    const dateStr = new Date(lastBackupTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                    dateEl.textContent = `Last backup: ${dateStr}`;
                }
                return; 
            }

            // 2. Have the responses actually changed?
            const currentJson = JSON.stringify(currentCategories);
            const backupJson = JSON.stringify(data.categories);
            
            if (currentJson === backupJson) {
                console.log("☁️ Backup check: No changes detected. Extending timer.");
                await updateDoc(backupRef, { timestamp: serverTimestamp() });
                if (dateEl) dateEl.textContent = `Last backup: Today (No changes)`;
                return;
            }

            // 3. 🛑 CATASTROPHE FAILSAFE: Prevent "Empty Sync Overwrite"
            let liveResponseCount = 0;
            for (const key in currentCategories) { liveResponseCount += (currentCategories[key].responses || []).length; }
            
            let backupResponseCount = 0;
            for (const key in data.categories) { backupResponseCount += (data.categories[key].responses || []).length; }

            // If the live vault suddenly dropped by more than 50% compared to the cloud
            if (backupResponseCount > 5 && liveResponseCount < (backupResponseCount * 0.5)) {
                console.error(`🛑 BACKUP BLOCKED: Live data (${liveResponseCount}) is drastically smaller than Cloud data (${backupResponseCount}). Protecting backup.`);
                if (dateEl) dateEl.textContent = `Last backup: Blocked (Data Loss Prevented)`;
                return; // Abort the save entirely!
            }
        }

        // 4. Safe to write the new backup
        console.log("☁️ Changes detected and safe. Saving new iCloud-style backup...");
        await setDoc(backupRef, {
            categories: currentCategories,
            timestamp: serverTimestamp()
        });

        if (dateEl) dateEl.textContent = `Last backup: Just now`;

    } catch (error) {
        console.error("Failed to run auto-backup:", error);
        const dateEl = document.getElementById('cloud-backup-date');
        if (dateEl) dateEl.textContent = `Last backup: Error checking status`;
    }
};

const saveToFirestore = async (dataToSave) => {
    if (!userId || isAnonymous) {
        console.error("User not authenticated or is anonymous. Cannot save data.");
        showMessage("Please sign in to save your data.", 'error');
        return;
    }
    const userDocRef = getUserCannedResponsesDocRef(userId);
    try {
        const cleanedData = JSON.parse(JSON.stringify(dataToSave));
        for (const key in cleanedData) {
            if (!cleanedData[key].responses) {
                cleanedData[key].responses = [];
            }
        }
        await setDoc(userDocRef, { categories: cleanedData });
    } catch (error) {
        console.error("Error saving to Firestore:", error);
        showMessage("Error saving data. Check your permissions.", 'error');
    }
};

const showUpdateNotification = (shouldShow) => {
    const settingsIndicator = document.getElementById('settings-update-indicator');
    const checkUpdatesIndicator = document.getElementById('check-updates-indicator');
    if (settingsIndicator && checkUpdatesIndicator) {
        if (shouldShow) {
            settingsIndicator.classList.remove('hidden');
            settingsIndicator.classList.add('update-indicator-pulse');
            checkUpdatesIndicator.classList.remove('hidden');
            checkUpdatesIndicator.classList.add('update-indicator-pulse');
        } else {
            settingsIndicator.classList.add('hidden');
            settingsIndicator.classList.remove('update-indicator-pulse');
            checkUpdatesIndicator.classList.add('hidden');
            checkUpdatesIndicator.classList.remove('update-indicator-pulse');
        }
    }
};

const checkForUpdatesOnLoad = async () => {
    if (!userId || isAnonymous) {
        showUpdateNotification(false);
        return;
    }

    try {
        // Get master version from Firestore
        const appControlDocRef = getAppControlDocRef();
        const appControlDoc = await getDoc(appControlDocRef);
        if (appControlDoc.exists()) {
            masterBlueprintVersion = appControlDoc.data().blueprintVersion || 1;
        }

        // Get user's last synced version
        const userDocRef = getUserRootDocRef(userId);
        const userDoc = await getDoc(userDocRef);
        const userData = userDoc.exists() ? userDoc.data() : {};
        const userSyncedVersion = userData.syncedBlueprintVersion || 0; // Default to 0 if not present

        // Compare and show notification if master version is newer
        if (masterBlueprintVersion > userSyncedVersion) {
            showUpdateNotification(true);
			showMessage("✨ New content available! Check Settings.", "success");
        } else {
            showUpdateNotification(false);
        }
    } catch (error) {
        console.error("Error checking for updates on load:", error);
        showUpdateNotification(false); // Hide on error
    }
};		

// --- NEW MICRO-INTERACTION & NAVIGATION JS ---

// 1. Update the Navigation Active State Visuals
const updateNavHighlight = (activeId) => {
    // List of all navigation button IDs
    const navIds = [
        'nav-canned-responses', 
        'nav-fedex-tracker', 
        'nav-helpful-links', 
        'nav-sla-dashboard', 
        'nav-my-stats'
    ];

    navIds.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            // Check if this button's ID contains the name of our current page
            if (id.includes(activeId)) {
                // APPLY active styles
                btn.classList.add('nav-item-active');
                btn.classList.remove('text-gray-400');
            } else {
                // REMOVE active styles
                btn.classList.remove('nav-item-active');
                btn.classList.add('text-gray-400');
            }
        }
    });
};

// 2. Command Palette Toggle
const toggleCommandPalette = () => {
    const cp = document.getElementById('command-palette');
    const inner = document.getElementById('cmd-modal-inner');
    const input = document.getElementById('cmd-input');
    
    if(cp.classList.contains('hidden')) {
        cp.classList.remove('hidden');
        setTimeout(() => {
            inner.classList.remove('scale-95', 'opacity-0');
            inner.classList.add('scale-100', 'opacity-100');
            input.focus();
        }, 10);
    } else {
        inner.classList.remove('scale-100', 'opacity-100');
        inner.classList.add('scale-95', 'opacity-0');
        setTimeout(() => cp.classList.add('hidden'), 200);
    }
};

// Command Palette Search Engine & Keyboard Navigation
const cmdInput = document.getElementById('cmd-input');
const cmdResults = document.getElementById('cmd-results');
let currentCmdIndex = -1;      // Tracks the currently highlighted item
let currentCmdActions = [];    // Stores the functions for the "Enter" key to trigger

if (cmdInput && cmdResults) {
    
    // 1. Search & Render Logic
    cmdInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        cmdResults.innerHTML = '';
        currentCmdIndex = -1;
        currentCmdActions = [];

        if (!query) return;

        let results = [];
        
        // Navigation Commands
        const navCommands = [
            { label: 'Go to Canned Responses', action: () => document.getElementById('nav-canned-responses')?.click(), icon: 'fa-comment-dots' },
            { label: 'Go to FedEx Tracker', action: () => document.getElementById('nav-fedex-tracker')?.click(), icon: 'fa-box-open' },
            { label: 'Go to Helpful Links', action: () => document.getElementById('nav-helpful-links')?.click(), icon: 'fa-link' },
            { label: 'Go to SLA Dashboard', action: () => document.getElementById('nav-sla-dashboard')?.click(), icon: 'fa-stopwatch' },
            { label: 'Go to My Stats', action: () => document.getElementById('nav-my-stats')?.click(), icon: 'fa-chart-line' },
        ];

        navCommands.forEach(cmd => {
            if (cmd.label.toLowerCase().includes(query)) results.push({ ...cmd, type: 'nav' });
        });

        // Responses
        for (const cat in categories) {
            categories[cat].responses.forEach(res => {
                if ((res.label && res.label.toLowerCase().includes(query)) || (res.text && res.text.toLowerCase().includes(query))) {
                    results.push({ label: res.label || 'Unlabeled', category: cat, text: res.text, id: res.id, type: 'response' });
                }
            });
        }

        // Render Top 10 Results
        results.slice(0, 10).forEach((res, index) => {
            const item = document.createElement('div');
            item.className = 'cmd-result-item p-3 cursor-pointer rounded-lg flex items-center gap-3 border-b border-gray-800/50 last:border-0 transition-all duration-150';
            
            if (res.type === 'nav') {
                item.innerHTML = `
                    <div class="p-2 rounded text-blue-400 bg-blue-400/10">
                        <i class="fas ${res.icon}"></i>
                    </div>
                    <div class="flex flex-col min-w-0">
                        <span class="text-gray-200 font-medium truncate">${res.label}</span>
                        <span class="text-[10px] text-gray-500 uppercase tracking-widest">Navigation</span>
                    </div>
                    <span class="ml-auto text-[10px] text-gray-500 font-mono hidden sm:inline-block">Enter ↵</span>
                `;
                currentCmdActions.push(() => { res.action(); toggleCommandPalette(); cmdInput.value = ''; });
            } else {
                // Get the category color (Default to a neutral blue if none exists)
                const catColor = categories[res.category]?.color || '#4DABF7';
                
                // Inject the dynamic color using inline styles (Hex + '20' adds 12% opacity for the background)
                item.innerHTML = `
                    <div class="p-2 rounded" style="color: ${catColor}; background-color: ${catColor}20;">
                        <i class="fas fa-copy"></i>
                    </div>
                    <div class="flex flex-col min-w-0">
                        <span class="text-gray-200 font-medium text-sm truncate">${res.label}</span>
                        <span class="text-[10px] uppercase tracking-widest font-bold" style="color: ${catColor}90;">${res.category}</span>
                    </div>
                    <span class="ml-auto text-[10px] text-gray-500 font-mono hidden sm:inline-block">Enter ↵</span>
                `;
                currentCmdActions.push(() => { processAndCopy(res.text, res.id, res.category); toggleCommandPalette(); cmdInput.value = ''; });
            }
            
            // Mouse click handler
            item.onclick = currentCmdActions[index];
            
            // Sync mouse hover with keyboard selection
            item.addEventListener('mouseenter', () => updateCmdHighlight(index));
            
            cmdResults.appendChild(item);
        });
        
        if (results.length === 0) {
            cmdResults.innerHTML = '<div class="p-4 text-center text-gray-500 text-sm">No results found</div>';
        } else {
            // Auto-highlight the first item when searching
            updateCmdHighlight(0);
        }
    });

    // 2. Keyboard Navigation Logic
    cmdInput.addEventListener('keydown', (e) => {
        const items = document.querySelectorAll('.cmd-result-item');
        if (items.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault(); // Prevents cursor from jumping to the end of the text
            updateCmdHighlight(currentCmdIndex < items.length - 1 ? currentCmdIndex + 1 : 0);
        } 
        else if (e.key === 'ArrowUp') {
            e.preventDefault(); // Prevents cursor from jumping to the start of the text
            updateCmdHighlight(currentCmdIndex > 0 ? currentCmdIndex - 1 : items.length - 1);
        } 
        else if (e.key === 'Enter') {
            e.preventDefault();
            if (currentCmdIndex >= 0 && currentCmdIndex < currentCmdActions.length) {
                // Execute the action bound to the currently highlighted item
                currentCmdActions[currentCmdIndex]();
            }
        }
    });

    // 3. Visual Highlighter Function
    function updateCmdHighlight(index) {
        const items = document.querySelectorAll('.cmd-result-item');
        items.forEach((item, i) => {
            if (i === index) {
                // Add highlight classes
                item.classList.add('bg-gray-800', 'ring-1', 'ring-gray-600', 'scale-[1.02]');
                item.classList.remove('bg-transparent');
                // Ensure the item scrolls into view if you arrow down past the visible list
                item.scrollIntoView({ block: 'nearest' });
            } else {
                // Remove highlight classes
                item.classList.remove('bg-gray-800', 'ring-1', 'ring-gray-600', 'scale-[1.02]');
                item.classList.add('bg-transparent');
            }
        });
        currentCmdIndex = index;
    }
}	

// 3. Global Keyboard Shortcuts (Alt + Numbers & Cmd+K)
document.addEventListener('keydown', (e) => {
// Global Power-User Hotkeys (Shift + Alt + 1-5)
    if (e.altKey && e.shiftKey && !e.ctrlKey && !e.metaKey) {
        switch(e.code) { // We use e.code instead of e.key to ignore shift-character changes (like !)
            case 'Digit1': document.getElementById('nav-canned-responses')?.click(); break;
            case 'Digit2': document.getElementById('nav-fedex-tracker')?.click(); break;
            case 'Digit3': document.getElementById('nav-helpful-links')?.click(); break;
            case 'Digit4': document.getElementById('nav-sla-dashboard')?.click(); break;
            case 'Digit5': document.getElementById('nav-my-stats')?.click(); break;
        }
    }
    
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleCommandPalette();
    }
    
    if (e.key === 'Escape' && !document.getElementById('command-palette').classList.contains('hidden')) {
        toggleCommandPalette();
    }
});

// 4. Magnetic Hover (Tracks Mouse Position on Cards)
document.addEventListener('mousemove', (e) => {
    const target = e.target.closest('.response-item');
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    target.style.setProperty('--mouse-x', `${x}px`);
    target.style.setProperty('--mouse-y', `${y}px`);
});		

// --- Rendering Functions ---
const renderContent = () => {
    const cannedResponsesApp = document.getElementById('canned-responses-app');
    const fedexTrackerApp = document.getElementById('fedex-tracker-app');
    const helpfulLinksApp = document.getElementById('helpful-links-app');
	const myStatsPage = document.getElementById('my-stats-page');
    const settingsPage = document.getElementById('settings-page');
    const categoryBar = document.getElementById('category-bar');
    const mainTitle = document.getElementById('main-title');
    const categoryActionsBtn = document.getElementById('category-actions-btn');
    const categoryActionsMenu = document.getElementById('category-actions-menu');
    const addCategoryBtn = document.getElementById('add-category-btn');
    const addResponseSection = document.getElementById('add-response-section');
    const userLinksSection = document.getElementById('user-links-section');
    const addLinkSection = document.getElementById('add-link-section');
    const importExportBtnSettings = document.getElementById('import-export-btn-settings');
    const checkUpdatesBtnSettings = document.getElementById('check-updates-btn-settings');
	const slaDashboardApp = document.getElementById('sla-dashboard-app'); 
    const workshopBtn = document.getElementById('open-workshop-btn'); 

    categoryActionsBtn.classList.add('hidden');
    categoryActionsMenu.classList.add('hidden');
    if (workshopBtn) workshopBtn.classList.add('hidden'); 

	if (cannedResponsesApp && currentPage !== 'canned-responses') cannedResponsesApp.classList.add('hidden');
    if (fedexTrackerApp) fedexTrackerApp.classList.add('hidden');
    if (helpfulLinksApp) helpfulLinksApp.classList.add('hidden');
	if (myStatsPage) myStatsPage.classList.add('hidden');
    if (settingsPage) settingsPage.classList.add('hidden');
    if (categoryBar) categoryBar.classList.add('hidden');
	if (slaDashboardApp) slaDashboardApp.classList.add('hidden');

    if (currentPage === 'canned-responses') {
        cannedResponsesApp.classList.remove('hidden');
        categoryBar.classList.remove('hidden');
        if (workshopBtn) workshopBtn.classList.remove('hidden'); 
        mainTitle.textContent = 'Canned Responses';
        renderCategories();
		updateSmartSuggestions();

        if (!isAnonymous) {
            addCategoryBtn.classList.remove('hidden');
            addResponseSection.classList.remove('hidden');
            if (Object.keys(categories).length > 0) {
                categoryActionsBtn.classList.remove('hidden');
            }
        } else {
            addCategoryBtn.classList.add('hidden');
            addResponseSection.classList.add('hidden');
            categoryActionsBtn.classList.add('hidden');
        }
    } else if (currentPage === 'fedex-tracker') {
        fedexTrackerApp.classList.remove('hidden');
        mainTitle.textContent = 'FedEx Tracker';
        extractAndDisplayNumbers();
    } else if (currentPage === 'helpful-links') {
        helpfulLinksApp.classList.remove('hidden');
        mainTitle.textContent = 'Helpful Links';
		renderLinks();

        if (isAnonymous) {
            userLinksSection.classList.add('hidden');
            addLinkSection.classList.add('hidden');
        } else {
            userLinksSection.classList.remove('hidden');
            addLinkSection.classList.remove('hidden');
        }
	} else if (currentPage === 'my-stats') {
    myStatsPage.classList.remove('hidden');
    mainTitle.textContent = 'My Stats';
    if (!hasLoadedStats) {
        renderAdvancedStats();
        hasLoadedStats = true; 
   	 }

	} else if (currentPage === 'sla-dashboard') {
        slaDashboardApp.classList.remove('hidden');
        mainTitle.textContent = 'SLA Dashboard';
        renderSLADashboard();
        setupCalculator();
        setupSLAListeners();
        
        // Hide unrelated buttons
        if (addCategoryBtn) addCategoryBtn.classList.add('hidden');
        if (addResponseSection) addResponseSection.classList.add('hidden');
		
    } else if (currentPage === 'settings') {
        settingsPage.classList.remove('hidden');
        mainTitle.textContent = 'Settings';
        renderSettingsPage();
        if (isAnonymous) {
            importExportBtnSettings.classList.add('hidden');
            checkUpdatesBtnSettings.classList.add('hidden');
        } else {
            importExportBtnSettings.classList.remove('hidden');
            checkUpdatesBtnSettings.classList.remove('hidden');
        }
    }
	updateNavHighlight(currentPage);
};

const renderWorkshopFeed = (searchQuery = '') => {
    const feedContainer = document.getElementById('workshop-feed');
    const emptyState = document.getElementById('workshop-empty-state');
    if (!feedContainer) return;

    feedContainer.innerHTML = '';
    
    // Filter by search (with safety fallbacks)
    const filtered = workshopResponsesCache.filter(res => {
        const q = searchQuery.toLowerCase();
        return (res.label || '').toLowerCase().includes(q) || 
               (res.text || '').toLowerCase().includes(q) ||
               (res.authorName || '').toLowerCase().includes(q);
    });

    if (filtered.length === 0) {
        emptyState.classList.remove('hidden');
        feedContainer.classList.add('hidden');
        return;
    } else {
        emptyState.classList.add('hidden');
        feedContainer.classList.remove('hidden');
    }

    filtered.forEach(res => {
        let daysLeft = 21;
        if (res.createdAt && typeof res.createdAt.toMillis === 'function') {
            const createdTime = res.createdAt.toMillis();
            const daysPassed = Math.floor((Date.now() - createdTime) / (1000 * 60 * 60 * 24));
            daysLeft = Math.max(0, 21 - daysPassed);
        }

        const isOwnerOrAdmin = (userId === res.authorId) || (currentAdminUser && currentAdminUser.email === "pabarca@google.com");

        let rawText = res.text || ''; 
        let displayText = rawText.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        displayText = displayText.replace(/(\[[^\]<>]+\])/g, '<span class="premium-placeholder">$1</span>');

        const catColor = categories[res.category]?.color || '#6366f1';
        
        // --- NEW: Dynamic Light Mode Classes ---
        const isLightMode = document.body.classList.contains('light-mode');
        
        const cardClass = isLightMode 
            ? "bg-white border-y border-r border-gray-200 border-l-[4px] rounded-xl p-5 flex flex-col relative hover:bg-gray-50 transition-colors shadow-lg group" 
            : "bg-gray-900/60 border-y border-r border-white/5 border-l-[4px] rounded-xl p-5 flex flex-col relative hover:bg-gray-800/80 transition-colors shadow-xl group";
        const titleClass = isLightMode 
            ? "text-gray-900 font-bold text-sm mb-2 group-hover:text-indigo-600 transition-colors" 
            : "text-white font-bold text-sm mb-2 group-hover:text-indigo-300 transition-colors";
        const innerBoxClass = isLightMode 
            ? "bg-gray-100/80 rounded-lg p-3 border border-gray-200 mb-4 flex-grow shadow-inner" 
            : "bg-black/30 rounded-lg p-3 border border-white/5 mb-4 flex-grow shadow-inner";
        const textClass = isLightMode 
            ? "text-xs text-gray-700 line-clamp-4 font-mono leading-relaxed whitespace-pre-wrap" 
            : "text-xs text-gray-400 line-clamp-4 font-mono leading-relaxed whitespace-pre-wrap";
        const agentBadgeClass = isLightMode 
            ? "flex items-center gap-1.5 text-[11px] font-bold text-cyan-700 bg-cyan-100 px-2 py-1 rounded border border-cyan-300" 
            : "flex items-center gap-1.5 text-[11px] font-bold text-cyan-400 bg-cyan-900/20 px-2 py-1 rounded border border-cyan-500/20";
        const voteContainerClass = isLightMode 
            ? "flex items-center bg-gray-100 rounded-lg border border-gray-300 overflow-hidden shadow-inner" 
            : "flex items-center bg-gray-900/80 rounded-lg border border-white/10 overflow-hidden shadow-inner";
        const upvoteClass = isLightMode 
            ? "px-2.5 py-1.5 transition text-xs flex items-center gap-1 text-gray-500 hover:text-green-600 hover:bg-gray-200" 
            : "px-2.5 py-1.5 transition text-xs flex items-center gap-1 text-gray-400 hover:text-green-400 hover:bg-white/5";
        const downvoteClass = isLightMode 
            ? "px-2.5 py-1.5 transition text-xs text-gray-500 hover:text-red-600 hover:bg-gray-200" 
            : "px-2.5 py-1.5 transition text-xs text-gray-400 hover:text-red-400 hover:bg-white/5";
        const dividerClass = isLightMode 
            ? "w-px h-4 bg-gray-300" 
            : "w-px h-4 bg-gray-700";
        const deleteBtnClass = isLightMode
            ? "workshop-delete-btn text-gray-400 hover:text-red-500 transition ml-2"
            : "workshop-delete-btn text-gray-500 hover:text-red-500 transition ml-2";

        const card = document.createElement('div');
        card.className = cardClass;
        card.style.borderLeftColor = catColor;
        
        card.innerHTML = `
            <div class="flex justify-between items-start mb-3">
                <span class="text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded shadow-sm" style="background-color: ${catColor}; color: #ffffff; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">
                    ${res.category || 'General'}
                </span>
                <div class="flex gap-2 items-center">
                    <span class="text-[10px] text-gray-500 font-mono flex items-center gap-1"><i class="fas fa-hourglass-half"></i> ${daysLeft}d left</span>
                    ${isOwnerOrAdmin ? `<button class="${deleteBtnClass}" data-id="${res.id}" title="Delete Submission"><i class="fas fa-trash"></i></button>` : ''}
                </div>
            </div>
            
            <h4 class="${titleClass}">${res.label || 'Untitled'}</h4>
            <div class="${innerBoxClass}">
                <p class="${textClass}">${displayText}</p>
            </div>
            
            <div class="mt-auto flex justify-between items-center">
                <div class="${agentBadgeClass}">
                    <i class="fas fa-user-astronaut"></i> ${res.authorName || 'Agent'}
                </div>
                
                <div class="flex items-center gap-3">
                    <div class="${voteContainerClass}">
                        <button class="workshop-upvote-btn ${upvoteClass}" data-id="${res.id}">
                            <i class="fas fa-arrow-up"></i> <span class="font-mono">${res.upvotes || 0}</span>
                        </button>
                        <div class="${dividerClass}"></div>
                        <button class="workshop-downvote-btn ${downvoteClass}" data-id="${res.id}">
                            <i class="fas fa-arrow-down"></i>
                        </button>
                    </div>
                    
                    <button class="workshop-clone-btn bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition shadow-md flex items-center gap-1.5" data-id="${res.id}">
                        <i class="fas fa-download"></i> Save
                    </button>
                </div>
            </div>
        `;
        
        feedContainer.appendChild(card);
    });
}


const renderLeaderboard = async (view = 'all') => {
    currentLeaderboardView = view; // Update global state
    const container = document.getElementById('leaderboard-container');
    if (!container) return;

    // Show loading state briefly
    container.innerHTML = '<div class="flex justify-center p-8"><svg class="animate-spin h-8 w-8 text-blue-500" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></div>';

    try {
		// 1. Fetch ALL users
        const leaderboardColRef = collection(db, "leaderboard");
        const querySnapshot = await getDocs(leaderboardColRef);
        let users = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // 2. Sort & Filter in Memory based on View
        const currentWeekId = getCurrentWeekId();
        const currentMonthId = getCurrentMonthId();

        if (view === 'weekly') {
            // Sort by weeklyXp, but treat as 0 if the week ID is old
            users.sort((a, b) => {
                const scoreA = (a.lastWeeklyXpId === currentWeekId) ? (a.weeklyXp || 0) : 0;
                const scoreB = (b.lastWeeklyXpId === currentWeekId) ? (b.weeklyXp || 0) : 0;
                return scoreB - scoreA;
            });
        } else if (view === 'monthly') {
            // Sort by monthlyXp, but treat as 0 if the month ID is old
            users.sort((a, b) => {
                const scoreA = (a.lastMonthlyXpId === currentMonthId) ? (a.monthlyXp || 0) : 0;
                const scoreB = (b.lastMonthlyXpId === currentMonthId) ? (b.monthlyXp || 0) : 0;
                return scoreB - scoreA;
            });
        } else {
            // Default: All Time XP
            users.sort((a, b) => (b.xp || 0) - (a.xp || 0));
        }

        // Take Top 10 after sorting
        users = users.slice(0, 10);

        if (users.length === 0) {
            container.innerHTML = '<p class="text-gray-400 text-center">Leaderboard is empty.</p>';
            return;
        }

// --- 3. Render Podium (Top 3) ---
        let html = '<div class="podium-container">';
        const podiumOrder = [1, 0, 2]; // 2nd, 1st, 3rd
        
        podiumOrder.forEach(idx => {
            if (users[idx]) {
                const u = users[idx];
                const rank = idx + 1;
                const isFirst = rank === 1;
                
                // Calculate Status
                const status = getTimeAgo(u.lastActive);
                const isOnline = status === 'Online';
                
                // Determine which score to display
                let displayScore = u.xp;
                let scoreLabel = "Total XP";
                
                if (view === 'weekly') {
                    displayScore = (u.lastWeeklyXpId === currentWeekId) ? (u.weeklyXp || 0) : 0;
                    scoreLabel = "This Week";
                } else if (view === 'monthly') {
                    displayScore = (u.lastMonthlyXpId === currentMonthId) ? (u.monthlyXp || 0) : 0;
                    scoreLabel = "This Month";
                }

                html += `
                    <div class="podium-card podium-rank-${rank}" data-userid="${u.id}">
                        ${isFirst ? '<i class="fas fa-crown rank-1-crown"></i>' : ''}
                        
                        <div class="podium-avatar level-badge-${u.rankName.toLowerCase()}">
                            <i class="fas ${u.rankIcon}"></i>
                        </div>
                        
                        <div class="text-center z-10">
                            <p class="font-bold text-white text-xs truncate w-20">${u.displayName}</p>
                            <p class="text-xs text-blue-300 font-mono font-bold">${displayScore.toLocaleString()}</p>
                            <p class="text-[9px] text-gray-400 uppercase mb-1">${scoreLabel}</p>
                            
                            <div class="mt-1 text-[9px] ${isOnline ? 'text-green-400 font-bold' : 'text-gray-500'} flex items-center justify-center">
                                <span class="status-dot ${isOnline ? 'status-online' : 'status-offline'} w-1.5 h-1.5 mr-1"></span>
                                ${status}
                            </div>
                        </div>
                    </div>
                `;
            } else {
                html += `<div class="w-[30%]"></div>`;
            }
        });
        html += '</div>';

		// --- 4. Render List (Rank 4+) ---
        html += '<div class="space-y-2 mt-2">';
        if (users.length > 3) {
            users.slice(3).forEach((u, index) => {
                const rank = index + 4;
                const status = getTimeAgo(u.lastActive);
                const isOnline = status === 'Online';
                
                let displayScore = u.xp;
                if (view === 'weekly') displayScore = (u.lastWeeklyXpId === currentWeekId) ? (u.weeklyXp || 0) : 0;
                else if (view === 'monthly') displayScore = (u.lastMonthlyXpId === currentMonthId) ? (u.monthlyXp || 0) : 0;

                html += `
                    <div class="leaderboard-entry cursor-pointer flex items-center p-3 bg-gray-800/50 rounded-lg hover:bg-gray-700 transition" data-userid="${u.id}">
                        <span class="font-mono text-gray-500 w-6 text-center font-bold">${rank}</span>
                        <div class="list-avatar level-badge-${u.rankName.toLowerCase()}">
                            <i class="fas ${u.rankIcon}"></i>
                        </div>
                        <div class="flex-grow min-w-0">
                            <div class="flex items-center gap-2">
                                <p class="font-semibold text-gray-200 text-sm truncate">${u.displayName}</p>
                                ${isOnline ? '<i class="fas fa-fire text-orange-500 text-xs animate-pulse"></i>' : ''}
                            </div>
                            <p class="text-[10px] text-gray-500">${status}</p>
                        </div>
                        <span class="font-bold text-blue-400 text-sm font-mono whitespace-nowrap">${displayScore.toLocaleString()}</span>
                    </div>
                `;
            });
        }
        html += '</div>';

        container.innerHTML = html;

    } catch (error) {
        console.error("Error rendering leaderboard:", error);
        container.innerHTML = '<p class="text-red-400">Error loading data.</p>';
    }
};

const renderCategories = () => {
	if (!isDataLoaded) return;
    const categoryList = document.getElementById('category-list');
    const addResponseSection = document.getElementById('add-response-section');
    const searchBarContainer = document.getElementById('search-bar-container');
    const categoryActionsBtn = document.getElementById('category-actions-btn');
    const categoryActionsMenu = document.getElementById('category-actions-menu');

    categoryList.innerHTML = '';
	const categoryNames = Object.keys(categories).sort((a, b) => {
        const orderA = categories[a].order !== undefined ? categories[a].order : Number.MAX_SAFE_INTEGER;
        const orderB = categories[b].order !== undefined ? categories[b].order : Number.MAX_SAFE_INTEGER;
        if (orderA === orderB) return a.localeCompare(b);
        return orderA - orderB;
    });
	
    if (!isAnonymous && categoryNames.length > 0) {
        if (categoryActionsBtn) categoryActionsBtn.classList.remove('hidden');
    } else {
        if (categoryActionsBtn) {
            categoryActionsBtn.classList.add('hidden');
            categoryActionsMenu.classList.add('hidden');
        }
    }

    if (!isAnonymous) {
        addResponseSection.classList.remove('hidden');
        searchBarContainer.classList.remove('hidden');
    }
    
    categoryNames.forEach(name => {
        const button = document.createElement('button');
        
        // Determine the text color based on the theme
        const textColorClass = document.body.classList.contains('light-mode') ? 'text-gray-900' : 'text-white';
        
        // Determine the border color based on the theme
        const activeClass = name === activeCategory ?
            (document.body.classList.contains('light-mode') ? 'border-2 border-gray-900' : 'border-2 border-white') :
            '';

        button.className = `category-item font-bold py-2 px-4 rounded-lg shadow-md ${textColorClass} transition-colors
            ${activeClass}
            hover:scale-105 active:scale-95 transition-all duration-300`;
            
        let categoryColor = categories[name].color || '#60a5fa';

        if (document.body.classList.contains('light-mode')) {
            categoryColor = lightenColor(categoryColor);
        }

        button.style.backgroundColor = categoryColor;

        if (name === activeCategory) {
            button.style.borderColor = document.body.classList.contains('light-mode') ? '#111827' : '#FFFFFF';
        } else {
            button.style.borderColor = categoryColor;
        }

        const responseCount = categories[name]?.responses?.length || 0;
        button.textContent = `${name} (${responseCount})`;
        button.dataset.category = name;
        categoryList.appendChild(button);
    });
    
    if (!categories[activeCategory]) {
        activeCategory = categoryNames[0];
    }
    renderResponses();
};


const renderChallenges = async (events) => {
    const container = document.getElementById('challenges-container');
    if (!container) return;
    container.innerHTML = '';

    let completedCount = 0;

    for (const challenge of Object.values(CHALLENGES_CONFIG)) {
        const progressData = await challenge.getProgress(events);
        const progressPercent = Math.min((progressData.current / challenge.goal) * 100, 100);
        const isComplete = progressData.current >= challenge.goal;
        const isTracked = challenge.id === trackedChallengeId;

        if (isComplete) completedCount++;

		const trackButtonHTML = !isComplete ? `
		    <button
		        class="track-challenge-btn py-1 px-4 rounded-lg text-sm font-semibold transition-all z-10 ${
		            isTracked
		                ? 'bg-gray-600 hover:bg-gray-700 text-white' // Style for "Stop Tracking"
		                : 'bg-blue-600 hover:bg-blue-700 text-white'   // Style for "Track"
		        }"
		        title="${isTracked ? 'Stop Tracking' : 'Track Challenge'}"
		        data-challenge-id="${challenge.id}">
		        ${isTracked ? 'Stop Tracking' : 'Track'}
		    </button>
		` : '';

        const challengeCardHTML = `
            <div class="challenge-card bg-gray-800 p-4 rounded-xl ${isComplete ? 'is-complete border-2 border-green-400' : 'border-2 border-transparent'}">
				<div class="challenge-header flex justify-between items-start">
				    <div class="challenge-info">
				        <h4 class="font-bold text-gray-100">${challenge.title}</h4>
				        <p class="text-sm text-gray-400 mt-1">${challenge.description}</p>
				    </div>
				    <div class="challenge-actions flex items-center gap-4">
				        <div class="text-2xl ${isComplete ? 'text-green-400' : 'text-gray-500'}">
				            <i class="fas ${isComplete ? 'fa-check-circle' : challenge.icon}"></i>
				        </div>
				        ${trackButtonHTML}
				    </div>
				</div>
                <div class="mt-4">
                    <div class="flex justify-between items-center text-sm mb-1">
                        <span class="font-semibold ${isComplete ? 'text-green-400' : 'text-gray-300'}">
                            ${progressData.current.toLocaleString()} / ${challenge.goal.toLocaleString()}
                        </span>
                        <span class="font-bold text-yellow-400">+${challenge.xp} XP</span>
                    </div>
                    <div class="challenge-progress-container">
                        <div class="challenge-progress-bar" style="width: ${progressPercent}%;"></div>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += challengeCardHTML;
    }

    const totalChallenges = Object.values(CHALLENGES_CONFIG).length;
    const counterEl = document.getElementById('challenge-counter');
    if (counterEl) {
        counterEl.textContent = `${completedCount}/${totalChallenges}`;
    }
};
		
const renderResponses = (searchQuery = '') => {
    if (!isDataLoaded) return;
    const responsesList = document.getElementById('responses-list');
    const emptyState = document.getElementById('empty-state');
    const responsesHeading = document.getElementById('responses-heading');

    responsesList.innerHTML = '';
    
    let responsesToRender = [];
    let headingText = '';
    const query = searchQuery.toLowerCase().trim();

    // --- 1. OPTIMIZED FILTER & SEARCH LOGIC ---
    if (query) {
        let allResponses = [];
        for (const categoryName in categories) {
            const catResponses = categories[categoryName].responses;
            // Optimized array flattening (avoids memory-heavy concat)
            for (let i = 0; i < catResponses.length; i++) {
                allResponses.push({...catResponses[i], category: categoryName});
            }
        }

        responsesToRender = allResponses.filter(r => {
            const label = (r.label || '').toLowerCase();
            const text = (r.text || '').toLowerCase();
            
            // Fast text match
            if (label.includes(query) || text.includes(query)) return true;
            
            // Slower fuzzy match ONLY if the query is long enough
            if (query.length > 3) {
                const labelWords = label.split(' ');
                for (let i = 0; i < labelWords.length; i++) {
                    const word = labelWords[i];
                    // Bound check: Skip Levenshtein entirely if length difference makes a distance <= 2 impossible
                    if (Math.abs(word.length - query.length) > 2) continue;
                    if (getLevenshteinDistance(word, query) <= 2) return true;
                }
            }
            return false;
        });

        const count = responsesToRender.length;
        headingText = `Search Results <span class="ml-3 inline-block bg-gray-600 text-gray-200 text-sm font-bold px-3 py-1 rounded-full text-white">${count}</span>`;
    } else {
        if (categories[activeCategory]) {
            const allResponses = categories[activeCategory].responses.map(r => ({...r, category: activeCategory}));            
            let orderedResponses = [];
            if (categories[activeCategory].customSorted) {
                orderedResponses = allResponses; // Trust the exact saved array order
            } else {
                // Legacy view: Float pinned to top
                const pinnedResponses = allResponses.filter(r => r.isPinned);
                const unpinnedResponses = allResponses.filter(r => !r.isPinned);
                orderedResponses = [...pinnedResponses, ...unpinnedResponses];
            }

            if (isReorderingResponses) {
                responsesToRender = orderedResponses;
                const headerTextColor = document.body.classList.contains('light-mode') ? 'text-gray-600' : 'text-gray-400';
                headingText = `Reordering: ${activeCategory} <span class="ml-4 text-xl font-normal ${headerTextColor}">Drag to rearrange</span>`;
            } else {
                responsesToRender = orderedResponses;
                const count = responsesToRender.length;
                const headerTextColor = document.body.classList.contains('light-mode') ? 'text-gray-600' : 'text-gray-400';
                headingText = `${activeCategory} <span class="ml-4 text-xl font-normal ${headerTextColor}">(${count} Saved)</span>`;
            }
        } else {
            responsesToRender = [];
            headingText = 'No Active Category';
        }
    }
    
    document.title = (query ? 'Search Results' : `${activeCategory} - Canned Responses`);
    document.getElementById('main-title').textContent = (query ? 'Search Results' : 'Canned Responses');
    responsesHeading.innerHTML = headingText;
    responsesHeading.classList.remove('hidden');
    
    // --- 2. RENDERING LOGIC ---
    if (responsesToRender.length > 0) {
        emptyState.classList.add('hidden');

        let groups = {};
        if (query) {
            groups = responsesToRender.reduce((acc, response) => {
                const key = response.category || 'Other';
                if (!acc[key]) acc[key] = [];
                acc[key].push(response);
                return acc;
            }, {});
        } else {
            groups = { 'All': responsesToRender };
        }

        // === CREATE THE DOCUMENT FRAGMENT ===
        // This holds everything in memory until the loop finishes, preventing layout lag.
        const renderFragment = document.createDocumentFragment();

        for (const groupTitle in groups) {
            const groupSection = document.createElement('div');
            groupSection.className = 'mb-8 animate-fade-in'; 

            if (isReorderingResponses) {
                // Changed from 'compact-grid' to a vertical flex column
                groupSection.innerHTML = `<div id="compact-reorder-grid" class="flex flex-col gap-3 pb-12 max-w-4xl mx-auto"></div>`;
                const gridContainer = groupSection.querySelector('#compact-reorder-grid');
                
                groups[groupTitle].forEach((response, index) => {
                    const cardEl = document.createElement('div');
                    // Added w-full so it spans across like a list item
                    cardEl.className = 'compact-response-card w-full';
                    cardEl.dataset.id = response.id;
                    cardEl.innerHTML = `
                        <div class="flex items-center gap-3 overflow-hidden w-full">
                            <i class="fas fa-grip-vertical text-gray-500 drag-handle opacity-50"></i>
                            <span class="text-sm font-bold text-gray-200 truncate w-full">${response.label || 'Untitled Response'}</span>
                        </div>
                        ${response.isPinned ? '<i class="fas fa-thumbtack text-blue-400 text-xs ml-2"></i>' : ''}
                    `;
                    gridContainer.appendChild(cardEl);
                });

                // APPEND TO FRAGMENT INSTEAD OF DOM
                renderFragment.appendChild(groupSection);

                // Initialize Sortable on the grid
                if (sortableResponseInstance) sortableResponseInstance.destroy();
                sortableResponseInstance = new Sortable(gridContainer, {
                    animation: 150,
                    ghostClass: 'sortable-ghost',
                    dragClass: 'sortable-drag'
                });

                continue; // Skip the rest of the normal rendering loop for this group
            }
            
            const isLightMode = document.body.classList.contains('light-mode');
            const headerTitleColor = isLightMode ? 'text-gray-800' : 'text-gray-200';
            const borderColor = isLightMode ? 'border-gray-300' : 'border-gray-700';

            if (query) {
                const catColor = categories[groupTitle]?.color || '#60a5fa';
                groupSection.innerHTML = `
                    <div class="flex items-center gap-3 mb-6 border-b ${borderColor} pb-2">
                        <div class="w-2 h-6 rounded-full" style="background-color: ${catColor}"></div>
                        <h3 class="text-xl font-bold ${headerTitleColor}">${groupTitle}</h3>
                        <span class="bg-gray-800 text-gray-400 text-xs px-2 py-1 rounded-full">${groups[groupTitle].length} matches</span>
                    </div>
                    <div class="vertical-list space-y-8"></div> 
                `;
            } else {
                groupSection.innerHTML = `<div class="vertical-list space-y-8"></div>`;
            }
            
            const listContainer = groupSection.querySelector('div.vertical-list');

            groups[groupTitle].forEach(response => {

                const itemWrapper = document.createElement('div');
                itemWrapper.className = 'group staggered-item'; // Added staggered-item
                
                // Assign a fluid animation delay based on its position in the list
                const currentIndex = Array.from(listContainer.children).length;
                itemWrapper.style.animationDelay = `${currentIndex * 40}ms`;

                // Colors & Styling
                let displayText = response.text;
                let displayLabel = response.label || 'Unlabeled';
                
                // 1. Highlight search query first
                if (query) {
                    // Escape special characters to prevent regex failures
                    const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const searchRegex = new RegExp(`(${safeQuery})`, 'gi');
                    displayText = displayText.replace(searchRegex, `<span class="highlight">$1</span>`);
                    displayLabel = displayLabel.replace(searchRegex, `<span class="highlight">$1</span>`);
                }

                // 2. Style Premium Placeholders (Applies the glowing pill look)
                displayText = displayText.replace(/(\[[^\]<>]+\])/g, '<span class="premium-placeholder">$1</span>');

                let categoryColor = categories[response.category]?.color || '#4DABF7';
                let cardBg, titleColor, bodyTextColor, footerBg, metaTextColor, iconColor;
                const copyBtnBg = '#51CF66'; // Premium Green

                if (isLightMode) {
                    categoryColor = lightenColor(categoryColor);
                    cardBg = categoryColor; 
                    titleColor = 'text-gray-900 group-hover:text-blue-600';
                    bodyTextColor = 'text-gray-800';
                    footerBg = 'bg-white/50 border-gray-300';
                    metaTextColor = 'text-gray-600';
                    iconColor = 'text-gray-600 hover:text-gray-900';
                } else {
                    cardBg = categoryColor; 
                    titleColor = 'text-gray-200 group-hover:text-blue-400';
                    bodyTextColor = 'text-gray-100';
                    footerBg = 'bg-black/20 border-black/10';
                    metaTextColor = 'text-gray-300';
                    iconColor = 'text-gray-300 hover:text-white';
                }
                const timesCopied = response.timesCopied || 0; 

                let bestMatch = null;
                let maxScore = 0;
                
                if (typeof globalKnowledgeCache !== 'undefined' && globalKnowledgeCache.length > 0) {
                    const fullContext = (response.label || '') + " " + (response.text || '');
                    const matchResult = findRelevantPolicy(fullContext, response.category);
                    if (matchResult) { bestMatch = matchResult; maxScore = matchResult.score; }
                }
                
                const hasMatch = bestMatch && maxScore > 12;
                let pillHTML = '';
                let conflictMode = false;

                if (hasMatch) {
                    const conflicts = detectPolicyConflicts(response.text, bestMatch.content);
                    conflictMode = conflicts.length > 0;
                    if (conflictMode) {
                        pillHTML = `
                            <button class="smart-pill pill-red insight-trigger" title="Policy Conflict Detected">
                                <i class="fas fa-exclamation-triangle"></i> Review Needed
                            </button>
                        `;
                    } else {
                        pillHTML = `
                            <button class="smart-pill pill-blue insight-trigger" title="View Related Policy: ${bestMatch.title}">
                                <i class="fas fa-book-open"></i> Insight
                            </button>
                        `;
                    }
                }

                const titleHTML = `
                    <div class="flex items-center gap-3 mb-2 ml-1 cursor-pointer copy-trigger w-fit">
                        <h4 class="text-lg font-bold ${titleColor} tracking-tight transition-colors select-none">${displayLabel}</h4>
                        ${response.isPinned ? '<i class="fas fa-thumbtack text-blue-400 text-xs transform rotate-45"></i>' : ''}
                    </div>`;

                const cardEl = document.createElement('div');
                cardEl.className = 'response-item w-full rounded-xl border relative shadow-md hover:shadow-lg transition-all flex flex-col overflow-hidden';
                cardEl.style.cssText = `background-color: ${cardBg}; border-color: ${isLightMode ? '#e5e7eb' : 'rgba(255,255,255,0.05)'};`;
                cardEl.dataset.id = response.id;
                cardEl.dataset.category = response.category;

                cardEl.innerHTML = `
                    <div class="p-6 flex-grow display-mode w-full">
                        <p class="response-text-display ${bodyTextColor} whitespace-pre-wrap leading-relaxed break-words text-sm sm:text-base">${displayText}</p>
                    </div>
                    <div class="${footerBg} border-t p-3 px-5 flex justify-between items-center relative z-20">
                        <div class="flex items-center gap-3">
                            <button class="copy-btn anim-bounce text-white font-bold py-2 px-6 rounded-lg shadow-sm active:scale-95 transition-all flex items-center gap-2 text-sm hover:brightness-110" 
                                    style="background-color: ${copyBtnBg};">
                                <i class="fas fa-copy"></i> <span>Copy</span>
                            </button>
                            ${pillHTML} 
                        </div>
                        <div class="flex items-center gap-4">
                            <span class="usage-count-display text-xs ${metaTextColor} font-mono opacity-80 hidden sm:inline-block" title="Times copied">${timesCopied} uses</span>
                            <div class="flex gap-1 ${isAnonymous ? 'hidden' : ''}">
                                <button class="publish-btn ${iconColor} hover:text-indigo-400 hover:bg-indigo-500/10 p-2 rounded-lg transition-colors" title="Publish to Workshop">
                                    <i class="fas fa-share-square"></i>
                                </button>
                                <button class="pin-btn ${iconColor} hover:bg-black/10 p-2 rounded-lg transition-colors" title="${response.isPinned ? 'Unpin' : 'Pin'}">
                                    <i class="fas fa-thumbtack ${response.isPinned ? 'text-blue-400' : ''}"></i>
                                </button>
                                <button class="edit-btn ${iconColor} hover:bg-black/10 p-2 rounded-lg transition-colors" title="Edit" data-id="${response.id}">
                                    <i class="fas fa-pencil-alt"></i>
                                </button>
                                <button class="delete-btn ${iconColor} hover:text-red-500 hover:bg-red-500/10 p-2 rounded-lg transition-colors" title="Delete">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;

				const insightBtn = cardEl.querySelector('.insight-trigger');
				if (insightBtn) {
				    insightBtn.addEventListener('click', (e) => {
				        e.stopPropagation();
				        
				        // --- NEW: Feature 4 - Active Selection Highlight ---
				        document.querySelectorAll('.response-item').forEach(el => {
				            el.classList.remove('ring-2', 'ring-purple-500', 'shadow-[0_0_15px_rgba(168,85,247,0.5)]');
				        });
				        cardEl.classList.add('ring-2', 'ring-purple-500', 'shadow-[0_0_15px_rgba(168,85,247,0.5)]');
				        // -------------------------------------------------
				
				        if (bestMatch) {
				            window.currentUserResponseText = response.text; 
				            // Pass response.id as the third parameter
				            showInsightsSidebar(bestMatch, true, response.id); 
				        }
				    });
				}

                const copyBtn = cardEl.querySelector('.copy-btn');
                
                // NEW: Pass 'e' to get mouse coordinates for the floating checkmark
                const handleCopyAction = (e) => {
                    if(copyBtn.classList.contains('clicked')) return; 
                    processAndCopy(response.text, response.id, response.category);
                    
                    // Trigger Floating Checkmark
                    if (e && e.clientX) {
                        const check = document.createElement('div');
                        check.className = 'floating-check';
                        check.innerHTML = '<i class="fas fa-check-circle"></i>';
                        check.style.left = `${e.clientX}px`;
                        check.style.top = `${e.clientY - 20}px`;
                        document.body.appendChild(check);
                        setTimeout(() => check.remove(), 800);
                    }

                    if (cardEl.querySelector('.usage-count-display')) {
                        let count = parseInt(cardEl.querySelector('.usage-count-display').textContent);
                        if (!isNaN(count)) cardEl.querySelector('.usage-count-display').textContent = `${count + 1} uses`;
                    }
                    
                    copyBtn.classList.add('clicked');
                    const icon = copyBtn.querySelector('i'); const span = copyBtn.querySelector('span');
                    const oldClass = icon.className; 
                    icon.className = 'fas fa-check'; 
                    span.textContent = 'Copied';
                    setTimeout(() => { 
                        copyBtn.classList.remove('clicked'); 
                        icon.className = oldClass; 
                        span.textContent = 'Copy'; 
                    }, 1500);
                };

                copyBtn.addEventListener('click', handleCopyAction);
                itemWrapper.innerHTML = '';
                itemWrapper.appendChild(document.createRange().createContextualFragment(titleHTML));
                itemWrapper.appendChild(cardEl);
                itemWrapper.querySelector('.copy-trigger').addEventListener('click', handleCopyAction);
                
                listContainer.appendChild(itemWrapper);
            });

            // APPEND TO FRAGMENT INSTEAD OF DOM
            renderFragment.appendChild(groupSection);
        }

        // === DOM APPEND ONCE ===
        responsesList.appendChild(renderFragment);

    } else {
        emptyState.classList.remove('hidden');
    }
};
			
const addResponse = async (text, label, category) => {
    if (isAnonymous) {
        showMessage("Please sign in to add responses.", 'error');
        return;
    }
    const newId = Date.now().toString();
    const newResponse = { id: newId, text: text, label: label || '', isPinned: false, createdAt: new Date().toISOString() };
    const updatedCategories = JSON.parse(JSON.stringify(categories));
    if (!updatedCategories[category]) {
        updatedCategories[category] = { color: categories[category]?.color || '#60a5fa', responses: [] };
    }
    if (!updatedCategories[category].responses) {
        updatedCategories[category].responses = [];
    }
    updatedCategories[category].responses.push(newResponse);
    saveToFirestore(updatedCategories);
    showMessage("Response added successfully!");
};
const updateResponse = (id, newText, newLabel, newCategory, oldCategory) => {
    if (isAnonymous) {
        showMessage("Please sign in to edit responses.", 'error');
        return;
    }
    const updatedCategories = JSON.parse(JSON.stringify(categories));
    const oldResponsesList = updatedCategories[oldCategory]?.responses || [];
    const responseToUpdate = oldResponsesList.find(r => r.id === id);
	const originalText = categories[oldCategory]?.responses.find(r => r.id === id)?.text || '';
	
    if (!responseToUpdate) {
        showMessage("Error: The response no longer exists in its original category.", 'error');
        return;
    }
    if (newCategory && newCategory !== oldCategory) {
		logUserEvent('move_response', {}, firstSignIn);
        const index = oldResponsesList.findIndex(r => r.id === id);
        if (index > -1) {
            oldResponsesList.splice(index, 1);
        }
        if (!updatedCategories[newCategory]) {
            updatedCategories[newCategory] = { color: updatedCategories[newCategory]?.color || '#60a5fa', responses: [] };
        }
        if (!updatedCategories[newCategory].responses) {
            updatedCategories[newCategory].responses = [];
        }
        responseToUpdate.text = newText;
        responseToUpdate.label = newLabel || '';
        updatedCategories[newCategory].responses.push(responseToUpdate);
        activeCategory = newCategory;
    } else {
        responseToUpdate.text = newText;
        responseToUpdate.label = newLabel || '';
    }

    const placeholderRegex = /\[([^\]]+)\]/g;
    const hadPlaceholder = placeholderRegex.test(originalText);
    const hasPlaceholderNow = placeholderRegex.test(newText);
    if (!hadPlaceholder && hasPlaceholderNow) {
        logUserEvent('add_placeholder', {}, firstSignIn);
    }
	
    saveToFirestore(updatedCategories);
    showMessage("Response updated successfully!");
};
const deleteResponse = (id, categoryName) => {
    if (isAnonymous) {
        showMessage("Please sign in to delete responses.", 'error');
        return;
    }
    if (!categoryName || !categories[categoryName] || !categories[categoryName].responses) return;
    const updatedCategories = JSON.parse(JSON.stringify(categories));
    updatedCategories[categoryName].responses = updatedCategories[categoryName].responses.filter(r => r.id !== id);
	logUserEvent('delete_response_single');
    saveToFirestore(updatedCategories);
    showMessage("Response deleted successfully!");
};

const copyToClipboard = async (text, responseId = null, categoryName = null) => {
    // This part always runs, so the user can always copy the text
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);

    if (responseId && categoryName) {
        const now = Date.now();
        const COOLDOWN_PERIOD = 5000; // 5 Seconds
        
        const lastCopyTime = lastCopyTimestamps[responseId] || 0;
        lastCopyTimestamps[responseId] = now; // Reset timer immediately

        if (now - lastCopyTime > COOLDOWN_PERIOD) {
            
            // --- SUCCESS: Award XP and Stats ---
            await awardXP(XP_VALUES.COPY_RESPONSE, 'Response Copied');
            logUserEvent('copy', { responseId, categoryName, text });

            if (userId && !isAnonymous) {
                try {
                    // ... (Local category count logic stays the same) ...
                    const category = categories[categoryName];
                    if (category && category.responses) {
                        const response = category.responses.find(r => r.id === responseId);
                        if (response) {
                            response.timesCopied = (response.timesCopied || 0) + 1;
							isSilencingUpdates = true; // 1. Turn on Silencer
                        	saveToFirestore(categories).then(() => {
                            setTimeout(() => { isSilencingUpdates = false; }, 2000); 
                        });
                        }
                    }

                    // Setup References
                    const leaderboardDocRef = doc(db, "leaderboard", userId);
                    const categoryCountField = `categoryCounts.${categoryName}`;
                    const todayStr = new Date().toISOString().split('T')[0];
                    const activeDayDocRef = doc(db, "leaderboard", userId, "activeDays", todayStr);
                    
                    // Fetch doc for logic
                    const lbDocSnap = await getDoc(leaderboardDocRef);
                    const lbData = lbDocSnap.exists() ? lbDocSnap.data() : {};

                    // Track Weekly/Monthly
                    const currentWeekId = getCurrentWeekId(); 
                    const currentMonthId = getCurrentMonthId();
                    
                    let updates = {};
                    
                    // Weekly Logic
                    if (lbData.lastWeeklyXpId === currentWeekId) {
                        updates.weeklyXp = increment(1);
                    } else {
                        updates.weeklyXp = 1;
                        updates.lastWeeklyXpId = currentWeekId;
                    }
                    
                    // Monthly Logic
                    if (lbData.lastMonthlyXpId === currentMonthId) {
                        updates.monthlyXp = increment(1);
                    } else {
                        updates.monthlyXp = 1;
                        updates.lastMonthlyXpId = currentMonthId;
                    }
                    
                    const batch = writeBatch(db);
                    
                    // This updates the 'lastActive' timestamp in the DB
                    batch.update(leaderboardDocRef, {
                        totalCopies: increment(1),
                        [`categoryCounts.${categoryName}`]: increment(1),
                        lastActive: serverTimestamp(), 
                        ...updates 
                    });
                    
                    batch.set(activeDayDocRef, { lastCopy: serverTimestamp() });
                    
                    await batch.commit();
                    
                    // Refresh Challenges UI
                    const eventsCollectionRef = getUserEventsCollectionRef(userId);
                    const snapshot = await getDocs(query(eventsCollectionRef));
                    const events = snapshot.docs.map(doc => doc.data());
                
                    await renderChallenges(events);
                    await renderChallengeTracker(events);
                    renderLeaderboard(currentLeaderboardView); 
                    
                } catch (error) {
                    console.error("Error updating copy count:", error);
                }
            }
            await checkAndAwardChallengeXP(userId);
        } else {
             // Cooldown active - feedback only
             showMessage("Copied! (Cooldown active)", 'success');
        }
    } else {
        // Fallback for untracked text
        showMessage("Copied to clipboard!");
    }
};
		
const exportData = () => {
    if (isAnonymous) {
        showMessage("Please sign in to export data.", 'error');
        return;
    }
    const dataStr = JSON.stringify(categories, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'canned_responses.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showMessage("Data exported successfully!");
};
const importData = (file) => {
    if (isAnonymous) {
        showMessage("Please sign in to import data.", 'error');
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importedData = JSON.parse(e.target.result);
            if (typeof importedData === 'object' && importedData !== null) {
                categories = importedData;
                const categoryNames = Object.keys(categories);
                if (categoryNames.length > 0) {
                    activeCategory = categoryNames[0];
                } else {
                    activeCategory = '';
                }
                saveToFirestore(categories);
                showMessage("Data imported successfully!");
                importExportModal.classList.add('hidden');
				logUserEvent('import_data', {}, firstSignIn);
            } else {
                throw new Error('Invalid JSON format.');
            }
        } catch (error) {
            showMessage(`Error importing file: ${error.message}`, 'error');
        }
    };
    reader.readAsText(file);
};

// --- KNOWLEDGE BASE EXPORT UTILITY ---
const exportGlobalKnowledgeBase = async () => {
	if (!currentAdminUser || currentAdminUser.email !== ADMIN_EMAIL) {
        console.warn("Unauthorized RAG export attempt.");
        if (typeof showMessage === 'function') {
            showMessage("Unauthorized. Admin access required.", "error");
        }
        return;
    }
	
    try {
        console.log("Fetching global_knowledge collection...");
        
        // 1. Query the global_knowledge collection
        const kbCollectionRef = collection(db, 'global_knowledge');
        const snapshot = await getDocs(kbCollectionRef);
        
        if (snapshot.empty) {
            console.warn("No articles found in global_knowledge.");
            alert("The Knowledge Base is empty.");
            return;
        }

        // 2. Map data and clean up Firestore Timestamps
        const articles = snapshot.docs.map(doc => {
            const data = doc.data();
            
            // Clean up the 'updatedAt' Firestore Timestamp into a readable ISO string
            if (data.updatedAt && typeof data.updatedAt.toDate === 'function') {
                data.updatedAt = data.updatedAt.toDate().toISOString();
            }
            
            return {
                id: doc.id, // Include the Document ID
                ...data
            };
        });

        // 3. Convert to formatted JSON
        const jsonString = JSON.stringify(articles, null, 2);

        // 4. Create a Blob and trigger the download
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `knowledge_base_export_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        
        a.click(); // Trigger the download
        
        document.body.removeChild(a);
        URL.revokeObjectURL(url); // Clean up memory
        
        console.log(`Successfully exported ${articles.length} articles.`);
        if (typeof showMessage === 'function') {
            showMessage(`Exported ${articles.length} articles successfully!`, 'success');
        }

    } catch (error) {
        console.error("Error exporting Knowledge Base:", error);
        alert("Failed to export. Check console for details.");
    }
};

	
		
const placeholderRegex = /\[([^\]]+)\]/g;
const processAndCopy = (text, responseId, categoryName) => {
    const placeholderInputsContainer = document.getElementById('placeholder-inputs');
    const placeholderModal = document.getElementById('placeholder-modal');
    
    // Store global state for the final copy action
    currentTextToCopy = text;
    currentResponseToCopyId = responseId;
    currentResponseToCopyCategory = categoryName;

    const matches = text.match(placeholderRegex);
    const placeholders = matches ? [...new Set(matches.map(m => m.slice(1, -1)))] : [];

    // If there are placeholders (excluding the auto-filled [Name])
    if (placeholders.length > 0 && !(placeholders.length === 1 && placeholders[0] === 'Name')) {
        placeholderInputsContainer.innerHTML = '';
        
        placeholders.forEach(placeholder => {
            if (placeholder !== 'Name') {
                const group = document.createElement('div');
                group.className = 'group';

                // 1. Label Row
                const labelRow = document.createElement('div');
                labelRow.className = 'flex justify-between items-center mb-2';
                labelRow.innerHTML = `
                    <label class="text-xs font-bold text-blue-400/80 uppercase tracking-widest ml-1">${placeholder}</label>
                    <span class="text-xs text-gray-500 italic">Required</span>
                `;
                group.appendChild(labelRow);

                // 2. Input Field
                const inputContainer = document.createElement('div');
                inputContainer.className = 'relative';
                
                const input = document.createElement('input');
                input.dataset.placeholder = placeholder;
                input.className = 'premium-input w-full p-4 rounded-2xl text-white outline-none text-base';

				input.setAttribute('autocomplete', 'one-time-code'); // 'off' is often ignored by Chrome, this is more effective
				input.setAttribute('spellcheck', 'false');
                
                if (placeholder.toLowerCase().includes('date')) {
                    // Date Logic (Keep your existing date logic here)
                    input.type = 'text';
                    const today = new Date();
                    input.value = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                    const hiddenDate = document.createElement('input');
					hiddenDate.type = 'date';
					hiddenDate.className = 'absolute inset-0 opacity-0 cursor-pointer';
					hiddenDate.addEventListener('click', (e) => {
					    try {
					        if (hiddenDate.showPicker) {
					            hiddenDate.showPicker();
					        }
					    } catch (err) {
					        // Fallback for older browsers
					    }
					});
                    hiddenDate.value = today.toISOString().split('T')[0];
                    hiddenDate.addEventListener('change', (e) => {
                        const dateParts = e.target.value.split('-');
                        const selectedDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
                        input.value = selectedDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                        input.classList.remove('fill-effect');
                        void input.offsetWidth; 
                        input.classList.add('fill-effect');
                    });
                    const icon = document.createElement('i');
                    icon.className = 'fas fa-calendar-alt absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none';
                    inputContainer.appendChild(input);
                    inputContainer.appendChild(hiddenDate);
                    inputContainer.appendChild(icon);
                } else {
                    input.type = 'text';
                    input.placeholder = `Enter ${placeholder}...`;
                    inputContainer.appendChild(input);
                }
                group.appendChild(inputContainer);

                // 3. Smart Suggestions
                const suggestions = getSmartSuggestions(placeholder, categoryName);
                if (suggestions.length > 0) {
                    const chipContainer = document.createElement('div');
                    chipContainer.className = 'mt-3 pl-1';
                    const chipWrapper = document.createElement('div');
                    chipWrapper.className = 'flex flex-wrap gap-2';

                    suggestions.forEach(item => {
                        const val = item.val; 
                        const pillDiv = document.createElement('div');
                        pillDiv.className = 'suggestion-chip group/pill flex items-center bg-gray-700/50 hover:bg-blue-600/20 border border-gray-600 hover:border-blue-500 rounded-full transition-all duration-200';
                        pillDiv.dataset.value = val; 
                        pillDiv.dataset.key = placeholder;

                        const valueBtn = document.createElement('button');
                        valueBtn.type = 'button';
                        valueBtn.tabIndex = -1; 
                        valueBtn.className = 'px-3 py-1 text-[11px] text-gray-300 group-hover/pill:text-blue-200 font-medium border-r border-gray-600/50 focus:outline-none';
                        valueBtn.textContent = val;
                        valueBtn.onclick = () => {
                            input.value = val;
                            input.classList.remove('fill-effect');
                            void input.offsetWidth; 
                            input.classList.add('fill-effect');
                            updateSmartHistory(placeholder, val, categoryName, 'use');
                        };

                        const deleteBtn = document.createElement('button');
                        deleteBtn.type = 'button';
                        deleteBtn.tabIndex = -1;
                        deleteBtn.className = 'px-2 py-1 text-[10px] text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-r-full transition-colors focus:outline-none';
                        deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
                        deleteBtn.onclick = (e) => {
                            e.stopPropagation(); 
                            updateSmartHistory(placeholder, val, categoryName, 'delete');
                            pillDiv.remove(); 
                        };

                        pillDiv.appendChild(valueBtn);
                        pillDiv.appendChild(deleteBtn);
                        chipWrapper.appendChild(pillDiv);
                    });
                    
                    chipContainer.appendChild(chipWrapper);
                    group.appendChild(chipContainer);
                }

                placeholderInputsContainer.appendChild(group);
            }
        });

        placeholderModal.classList.remove('hidden');
        setTimeout(() => {
            const firstInput = placeholderInputsContainer.querySelector('input');
            if(firstInput) firstInput.focus();
        }, 100);

    } else {
        // No placeholders, copy immediately
        const finalContent = replacePlaceholders(currentTextToCopy, {});
        
        try {
            copyToClipboard(finalContent, responseId, categoryName);
        } catch (e) {
            console.warn("Background logic error:", e);
        }
    }
};
		
const replacePlaceholders = (text, userValues) => {
    let result = text;
    result = result.replace(/\[Name\]/g, userName);
    for (const key in userValues) {
        const regex = new RegExp(`\\[${key}\\]`, 'g');
        result = result.replace(regex, userValues[key]);
    }
    return result;
};
const renderStaticLinks = () => {
    const staticLinksList = document.getElementById('static-links-list');
    if (renderedStaticLinks) return;
    staticLinksList.innerHTML = '';
    if (defaultLinks.length > 0) {
        defaultLinks.forEach(link => {
            const card = document.createElement('div');
            card.className = 'link-card rounded-xl p-6 shadow-2xl pulse-effect';
            const descriptionText = link.description || 'No description available.';
            card.innerHTML = `
                <a href="${link.url}" target="_blank" rel="noopener noreferrer" class="block">
                    <h3 class="font-bold text-xl text-white hover:text-sky-300 transition-colors mb-2">${link.title}</h3>
                    <p class="text-sm text-gray-400">${descriptionText}</p>
                </a>
            `;
            staticLinksList.appendChild(card);
        });
    } else {
        staticLinksList.innerHTML = '<p class="text-center text-gray-400 col-span-full">No static links found.</p>';
    }
    renderedStaticLinks = true;
}
const renderUserLinks = () => {
    const userLinksList = document.getElementById('user-links-list');
    userLinksList.innerHTML = '';
    if (userLinks && userLinks.length > 0) {
        userLinks.forEach(link => {
            const card = document.createElement('div');
            card.className = 'link-card rounded-xl p-6 shadow-2xl pulse-effect flex items-center justify-between relative';
            card.innerHTML = `
                <a href="${link.url}" target="_blank" rel="noopener noreferrer" class="flex-grow">
                    <h3 class="font-bold text-xl text-white hover:text-sky-300 transition-colors mb-2">${link.title}</h3>
                    <p class="text-sm text-gray-400">${link.description || 'No description available.'}</p>
                </a>
                <div class="relative inline-block text-left" data-doc-id="${link.id}" data-title="${link.title}" data-url="${link.url}" data-description="${link.description || ''}">
                    <button type="button" class="meatballs-button p-2 text-gray-400 hover:text-white transition-colors" aria-expanded="true" aria-haspopup="true">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 pointer-events-none">
                            <path d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM10 8.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM11.5 15a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z" />
                        </svg>
                    </button>
                    <div class="meatballs-menu hidden absolute right-0 mt-2 w-48 origin-top-right rounded-md bg-gray-700 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                        <div class="py-1">
                            <button class="edit-link-btn text-gray-200 block w-full text-left px-4 py-2 text-sm hover:bg-gray-600">Edit</button>
                            <button class="delete-link-btn text-red-400 block w-full text-left px-4 py-2 text-sm hover:bg-gray-600">Delete</button>
                        </div>
                    </div>
                </div>
            `;
            userLinksList.appendChild(card);
        });
    } else {
        userLinksList.innerHTML = '<p class="text-center text-gray-400 col-span-full">No links added yet. Add one above!</p>';
    }

	    if (filteredUserLinks.length === 0 && isAnonymous) {
      userLinksSection.classList.add('hidden');
    } else {
      userLinksSection.classList.remove('hidden');
    }
};
const renderHelpfulLinks = () => {
    const userLinksSection = document.getElementById('user-links-section');
    const addLinkSection = document.getElementById('add-link-section');
    
    // Call the unified rendering function with no search query
    renderLinks(); 

    if (isAnonymous) {
        userLinksSection.classList.add('hidden');
        addLinkSection.classList.add('hidden');
    } else {
        userLinksSection.classList.remove('hidden');
        addLinkSection.classList.remove('hidden');
    }
};
const showLinksStatus = (message, colorClass) => {
    const linksStatusMessage = document.getElementById('status-message');
    linksStatusMessage.textContent = message;
    linksStatusMessage.className = `text-center mt-2 text-sm font-semibold ${colorClass}`;
    setTimeout(() => {
        linksStatusMessage.textContent = '';
        linksStatusMessage.className = 'text-center mt-2 text-sm text-gray-400';
    }, 3000);
};

// Add this helper function somewhere in your script block
const closeSidebar = () => {
    const sidebar = document.getElementById('sidebar');
    if (sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
    }
};

const resetLinksForm = () => {
    const linksFormTitle = document.getElementById('form-title');
    const linkTitleInput = document.getElementById('link-title');
    const linkUrlInput = document.getElementById('link-url');
    const linkDescriptionInput = document.getElementById('link-description');
    const linksSubmitButton = document.getElementById('submit-button');
    const linksCancelButton = document.getElementById('cancel-button');
    linksFormTitle.textContent = "Add a New Link";
    linkTitleInput.value = '';
    linkUrlInput.value = '';
    linkDescriptionInput.value = '';
    linksSubmitButton.textContent = 'Add Link';
    linksCancelButton.classList.add('hidden');
    editingLinkDocId = null;
};
const editLink = (docId, title, url, description) => {
    const linksFormTitle = document.getElementById('form-title');
    const linkTitleInput = document.getElementById('link-title');
    const linkUrlInput = document.getElementById('link-url');
    const linkDescriptionInput = document.getElementById('link-description');
    const linksSubmitButton = document.getElementById('submit-button');
    const linksCancelButton = document.getElementById('cancel-button');
    const addLinkSection = document.getElementById('add-link-section');
    linksFormTitle.textContent = "Edit Link";
    linkTitleInput.value = title;
    linkUrlInput.value = url;
    linkDescriptionInput.value = description;
    linksSubmitButton.textContent = 'Save Changes';
    linksCancelButton.classList.remove('hidden');
    editingLinkDocId = docId;
    addLinkSection.scrollIntoView({ behavior: 'smooth' });
};
const deleteLink = async (docId) => {
    if (!db || !userId || isAnonymous) {
        showLinksStatus('Please sign in to delete links.', 'text-red-400');
        return;
    }
    const docRef = doc(db, 'artifacts', safeAppId, 'users', userId, 'helpful_links_data', docId);
    try {
        await deleteDoc(docRef);
        showLinksStatus('Link deleted successfully!', 'text-green-400');
    } catch (error) {
        console.error("Error deleting link:", error);
        showLinksStatus(`Failed to delete link: ${error.message}`, 'text-red-400');
    }
};
const extractAndDisplayNumbers = () => {
    const fedexRegex = /(?:78\d{10}|79\d{10}|80\d{10}|81\d{10}|82\d{10}|(?:96\d{20}|96\d{32}|\d{15}|\d{12}))/g;
    const inputTextareaFedex = document.getElementById('input-text-fedex');
    const trackingNumbersContainer = document.getElementById('tracking-numbers-container');
    const noNumbersMessage = document.getElementById('no-numbers-message');

    // Exit if any critical elements aren't found
    if (!inputTextareaFedex || !trackingNumbersContainer || !noNumbersMessage) {
        return;
    }

    const text = inputTextareaFedex.value;
    const matches = text.match(fedexRegex) || [];
    const uniqueMatches = [...new Set(matches)];

    // **THE FIX:** Remove only the previously added tracking tabs.
    const existingTabs = trackingNumbersContainer.querySelectorAll('.tracking-tab');
    existingTabs.forEach(tab => tab.remove());

    if (uniqueMatches.length > 0) {
        // Hide the "no numbers" message because we found results.
        noNumbersMessage.classList.add('hidden');
        
        // Add the new tracking number divs.
        uniqueMatches.forEach(num => {
            const div = document.createElement('div');
            div.className = 'tracking-tab flex items-center justify-between p-3 rounded-lg shadow-md mb-2';
            div.innerHTML = `
                <span class="text-sm font-semibold">${num}</span>
                <button class="copy-tracking-btn bg-indigo-500 text-white text-xs px-2 py-1 rounded-full hover:bg-indigo-400 transition-colors">
                    Copy
                </button>
            `;
            trackingNumbersContainer.appendChild(div);
        });
    } else {
        // If no numbers were found, make sure the message is visible.
        noNumbersMessage.classList.remove('hidden');
    }

    // Re-attach event listeners to any new copy buttons that were created.
    document.querySelectorAll('.copy-tracking-btn').forEach(button => {
        button.addEventListener('click', () => {
            const number = button.previousElementSibling.textContent;
            copyToClipboard(number);
        });
    });
};
const renderSettingsPage = () => {
    const themeIconSettings = document.getElementById('theme-icon-settings');
    const authStatusSettings = document.getElementById('auth-status-settings');
    const signInBtn = document.getElementById('sign-in-btn-settings');
    const signOutBtn = document.getElementById('sign-out-btn-settings');
    const tutorialResetSection = document.getElementById('tutorial-reset-section');
    const importExportBtnSettings = document.getElementById('import-export-btn-settings');
    const checkUpdatesBtnSettings = document.getElementById('check-updates-btn-settings');
    
    // Elements for dynamic badges
    const roleBadge = document.getElementById('settings-role-badge');
    const memberSinceBadge = document.getElementById('settings-member-since');

    if (document.body.classList.contains('light-mode')) {
        themeIconSettings.className = 'fas fa-sun mr-2';
    } else {
        themeIconSettings.className = 'fas fa-moon mr-2';
    }
    
    if (auth.currentUser) {
        const displayName = auth.currentUser.displayName || auth.currentUser.email || 'User';
        authStatusSettings.textContent = `Signed in as: ${displayName}`;
        authStatusSettings.title = auth.currentUser.email;
        
        // --- DYNAMIC PROFILE BADGES ---
        if (roleBadge) {
            if (auth.currentUser.email === ADMIN_EMAIL) {
                roleBadge.textContent = "Role: Admin";
                roleBadge.className = "bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-md font-mono font-bold tracking-wide";
            } else {
                roleBadge.textContent = "Role: Operator";
                roleBadge.className = "bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-md font-mono";
            }
        }

        if (memberSinceBadge && typeof firstSignIn !== 'undefined' && firstSignIn) {
            const formattedDate = firstSignIn.toLocaleDateString(undefined, {
                year: 'numeric', month: 'long', day: 'numeric'
            });
            memberSinceBadge.innerHTML = `<i class="fas fa-calendar-alt mr-1"></i> Member Since ${formattedDate}`;
        }
        // -----------------------------

        if (isAnonymous) {
            signInBtn.classList.remove('hidden');
            signOutBtn.classList.add('hidden');
            tutorialResetSection.classList.add('hidden');
        } else {
            signInBtn.classList.add('hidden');
            signOutBtn.classList.remove('hidden');
            tutorialResetSection.classList.remove('hidden');
        }
    } else {
        authStatusSettings.textContent = 'Not signed in.';
        signInBtn.classList.remove('hidden');
        signOutBtn.classList.add('hidden');
        tutorialResetSection.classList.add('hidden');
    }
    
    if (isAnonymous) {
        importExportBtnSettings.classList.add('hidden');
        checkUpdatesBtnSettings.classList.add('hidden');
    } else {
        importExportBtnSettings.classList.remove('hidden');
        checkUpdatesBtnSettings.classList.remove('hidden');
    }
    
    if (auth.currentUser && auth.currentUser.email === ADMIN_EMAIL) {
        const adminSection = document.getElementById('admin-knowledge-settings');
        if (adminSection) {
            adminSection.classList.remove('hidden');
            renderAdminPolicies(); 
        }
    }
};

// --- UPDATED CALCULATION LOGIC ---
const processActivityData = (events, period) => {
    const copyEvents = events.filter(e => e.type === 'copy' && e.timestamp);
    const now = new Date();
    let startDate = new Date();
    let filteredEvents = [];

    // 1. Filter Logic (Keep this as is)
    if (period === '7') {
        startDate.setDate(now.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);
        filteredEvents = copyEvents.filter(e => e.timestamp.toDate() >= startDate);
    } else if (period === '30') {
        startDate.setDate(now.getDate() - 29);
        startDate.setHours(0, 0, 0, 0);
        filteredEvents = copyEvents.filter(e => e.timestamp.toDate() >= startDate);
    } else if (period === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        filteredEvents = copyEvents.filter(e => e.timestamp.toDate() >= startDate);
    } else { 
        filteredEvents = copyEvents;
    }

    // 2. Group by Date
    const activityByDay = filteredEvents.reduce((acc, event) => {
        const date = event.timestamp.toDate().toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
    }, {});

    // 3. NEW CALCULATION: Divisor is now the number of active days found
    const sortedDates = Object.keys(activityByDay).sort();
    const totalCopies = filteredEvents.length;
    
    // This is the core fix: Count unique days that actually have data
    const activeDaysCount = sortedDates.length;
    const avgCopies = activeDaysCount > 0 ? (totalCopies / activeDaysCount).toFixed(1) : '0.0';

    // 4. Peak Calculation (Keep this as is)
    let peakCount = 0;
    let peakDate = '--';
    for (const date in activityByDay) {
        if (activityByDay[date] > peakCount) {
            peakCount = activityByDay[date];
            const d = new Date(date + 'T00:00:00');
            peakDate = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        }
    }

    return {
        labels: sortedDates.map(date => {
            const d = new Date(date + 'T00:00:00');
            return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        }),
        data: sortedDates.map(date => activityByDay[date]),
        total: totalCopies,
        avg: avgCopies, // Now based on active days!
        peakDate: peakDate,
        peakCount: peakCount,
        rawSortedDates: sortedDates
    };
};

const renderCategoryChart = (events) => {
    const container = document.getElementById('category-chart-container');
    if (!container) return;

    // --- FIX 1: Correct ID is 'categoryChart', NOT 'activityChart' ---
    // --- FIX 2: Removed 'pointer-events-none' so you can hover over the doughnut slices ---
    container.innerHTML = '<canvas id="categoryChart"></canvas>';
    
    const ctxElement = document.getElementById('categoryChart');
    if (!ctxElement) return; // Safety check
    const ctx = ctxElement.getContext('2d');

    if (categoryChartInstance) {
        categoryChartInstance.destroy();
    }

    const copyEvents = events.filter(e => e.type === 'copy' && e.categoryName);
    if (copyEvents.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-400 mt-12">Copy some responses to see your category breakdown!</p>';
        return;
    }

    const categoryCounts = copyEvents.reduce((acc, event) => {
        acc[event.categoryName] = (acc[event.categoryName] || 0) + 1;
        return acc;
    }, {});

    const labels = Object.keys(categoryCounts);
    const data = Object.values(categoryCounts);
    
    const backgroundColors = labels.map(label => categories[label]?.color || '#888888');

    const isLightMode = document.body.classList.contains('light-mode');
    const textColor = isLightMode ? '#000000' : '#ffffff';

    categoryChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                label: 'Copies per Category',
                data: data,
                backgroundColor: backgroundColors,
                borderColor: isLightMode ? '#ffffff' : 'transparent',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: textColor,
                        padding: 20,
                        font: { size: 14, weight: 'bold' }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1) + '%';
                            return `${context.label}: ${value} (${percentage})`;
                        }
                    }
                }
            }
        }
    });
};

const renderActivityChart = (events, period = 'all') => {
    const container = document.getElementById('activity-chart-container');
    if (!container) return;

    // Reset Canvas
    container.innerHTML = '<canvas id="activityChart"></canvas>';
    const ctx = document.getElementById('activityChart').getContext('2d');

    const processed = processActivityData(events, period);

    // Update Bottom Stats...
    const totalEl = document.getElementById('stats-total-copies');
    const avgEl = document.getElementById('stats-avg-copies');
    const peakCountEl = document.getElementById('stats-busiest-day-count');
    const peakLabelEl = document.getElementById('stats-busiest-day');

    if (totalEl) totalEl.textContent = processed.total.toLocaleString();
    if (avgEl) avgEl.textContent = processed.avg;
    if (peakCountEl) peakCountEl.textContent = processed.peakCount > 0 ? processed.peakCount : '0';
    if (peakLabelEl) {
        if (processed.peakDate && processed.peakDate !== '--') {
            peakLabelEl.textContent = processed.peakDate;
            peakLabelEl.classList.remove('hidden');
        } else {
            peakLabelEl.classList.add('hidden');
        }
    }

    // Gradient Style
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(34, 197, 94, 0.5)'); 
    gradient.addColorStop(1, 'rgba(34, 197, 94, 0.0)'); 

    if (window.activityChartInstance) window.activityChartInstance.destroy();

    window.activityChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: processed.labels, 
            datasets: [{
                label: 'Copies',
                data: processed.data,
                borderColor: '#22c55e',       
                backgroundColor: gradient,    
                borderWidth: 3,
                pointBackgroundColor: '#1f2937', 
                pointBorderColor: '#22c55e',
                pointBorderWidth: 2,
                pointHoverBackgroundColor: '#22c55e',
                pointHoverBorderColor: '#fff',
                pointHoverRadius: 6,
                fill: true,                   
                tension: 0.4                  
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, 
            
            // --- FIX FOR CLICKING THE CHART ITSELF ---
            onClick: (e) => {
                // If the user clicks the GRAPH, we manually run the open function
                if (typeof openExpandedChart === 'function') {
                    openExpandedChart(window.activityChartInstance, 'Activity Analysis', events, 'activity');
                }
            },

            onHover: (event, chartElement) => {
                // Force pointer cursor so user knows it's clickable
                const target = event.native ? event.native.target : event.target;
                if(target) target.style.cursor = 'pointer'; 
            },

            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    titleColor: '#22c55e',
                    bodyColor: '#fff',
                    borderColor: 'rgba(34, 197, 94, 0.3)',
                    borderWidth: 1,
                    padding: 10,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return context.parsed.y + ' Copies';
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#6b7280', font: { size: 10 } }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { display: false },
                    beginAtZero: true
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });
};

const renderLevelingSystem = (userData) => {
    const totalXp = userData.xp || 0;
    const levelInfo = calculateLevelInfo(totalXp);
    const rankName = levelInfo.rankName;
    const rankClass = `level-badge-${rankName.toLowerCase().replace(' ', '-')}`;

    // Calculate Next Rank
    const currentRankIndex = LEVEL_RANKS.findIndex(r => r.name === rankName);
    const nextRank = (currentRankIndex < LEVEL_RANKS.length - 1) ? LEVEL_RANKS[currentRankIndex + 1] : null;

    // Elements
    const rankIconContainer = document.getElementById('rank-icon-container-redesigned');
    const rankNameEl = document.getElementById('rank-name-redesigned');
    const levelDisplayEl = document.getElementById('level-display-redesigned');
    const xpBarEl = document.getElementById('xp-bar-redesigned');
    
    // New Elements
    const nextRankIconContainer = document.getElementById('next-rank-icon');
    const currentXpDisplay = document.getElementById('current-xp-display');
    const xpNeededDisplay = document.getElementById('xp-needed-display');
    const ambientBg = document.getElementById('rank-ambient-bg');
    const predictionEl = document.getElementById('level-prediction');
    const predictionDaysEl = document.getElementById('level-prediction-days');
    const actionTooltip = document.getElementById('xp-action-tooltip');

    const doubleXpIndicator = document.getElementById('double-xp-indicator');
    const tripleXpIndicator = document.getElementById('triple-xp-indicator');

    // 1. Render Current Rank Icon
    let wrapperClasses = `level-badge-wrapper ${rankClass}`;
    let innerHTML = `<i class="fas ${levelInfo.rankIcon}"></i>`;
    
    if (["Master", "Grandmaster", "Legend", "Demigod", "Deity"].includes(rankName)) {
        wrapperClasses += ' inner-ring beveled-edge glowing-effect';
    } else {
        wrapperClasses += ' beveled-edge';
    }
    
    rankIconContainer.innerHTML = `<div class="${wrapperClasses}">${innerHTML}</div>`;

    // 2. Render Text Info
    rankNameEl.textContent = levelInfo.rankName;
    levelDisplayEl.textContent = `Level ${levelInfo.level}`;
    
    // 3. Render Progress Bar & Text
    const xpRemaining = levelInfo.xpForNextLevel - levelInfo.xpProgress;
    const progressPercent = (levelInfo.xpProgress / levelInfo.xpForNextLevel) * 100;
    xpBarEl.style.width = `${progressPercent}%`;
    
    currentXpDisplay.innerHTML = `<span class="text-white">${levelInfo.xpProgress.toLocaleString()}</span> XP`;
    xpNeededDisplay.textContent = `${xpRemaining.toLocaleString()} to Level ${levelInfo.level + 1}`;

    // --- Action Tooltip Logic ---
    const copiesNeeded = Math.ceil(xpRemaining / XP_VALUES.COPY_RESPONSE);
    if (actionTooltip) {
        actionTooltip.textContent = `~${copiesNeeded} more copies to level up!`;
    }

    // 4. Render Next Rank Ghost Icon
    if (nextRank) {
        const nextRankClass = `level-badge-${nextRank.name.toLowerCase().replace(' ', '-')}`;
        nextRankIconContainer.innerHTML = `
            <div class="level-badge-wrapper ${nextRankClass} border-2 border-gray-600/50" style="width: 50px; height: 50px;">
                <i class="fas ${nextRank.icon} text-2xl opacity-50"></i>
            </div>
        `;
        document.getElementById('next-rank-container').classList.remove('invisible');
    } else {
        document.getElementById('next-rank-container').classList.add('invisible');
        xpNeededDisplay.textContent = "Max Level Reached";
    }

    // 5. Update Ambient Background Color based on Rank
    let bgColors = 'from-gray-800 to-gray-900';
    if (rankName === 'Newbie') bgColors = 'linear-gradient(to right, #3f6212, #14532d)';
    if (rankName === 'Apprentice') bgColors = 'linear-gradient(to right, #7c2d12, #451a03)';
    if (rankName === 'Journeyman') bgColors = 'linear-gradient(to right, #374151, #1f2937)';
    if (rankName === 'Artisan') bgColors = 'linear-gradient(to right, #1e3a8a, #172554)';
    if (rankName === 'Expert') bgColors = 'linear-gradient(to right, #4338ca, #312e81)';
    if (rankName === 'Master') bgColors = 'linear-gradient(to right, #a16207, #713f12)';
    if (rankName === 'Grandmaster') bgColors = 'linear-gradient(to right, #7e22ce, #581c87)';
    if (rankName === 'Legend') bgColors = 'linear-gradient(to right, #b91c1c, #7f1d1d)';
    
    ambientBg.style.background = bgColors;

    // 6. Multipliers & Prediction Logic
    const monthId = getCurrentMonthId();
    const isTripleXpActive = userData.lastMonthlyChallengeMonth === monthId;
    const weekId = getCurrentWeekId();
    const isDoubleXpActive = userData.lastWeeklyChallengeWeek === weekId;

    let currentMultiplier = 1;

    if (isTripleXpActive) {
        tripleXpIndicator.classList.remove('hidden');
        doubleXpIndicator.classList.add('hidden');
        currentMultiplier = 3;
    } else if (isDoubleXpActive) {
        doubleXpIndicator.classList.remove('hidden');
        tripleXpIndicator.classList.add('hidden');
        currentMultiplier = 2;
    } else {
        doubleXpIndicator.classList.add('hidden');
        tripleXpIndicator.classList.add('hidden');
        currentMultiplier = 1;
    }

    // --- NEW PREDICTION LOGIC ---
    if (cachedStatsEvents && cachedStatsEvents.length > 0) {
        const now = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);
        
        // Count XP generating actions in last 30 days
        // We use a simplified count: 1 action = 1 "unit" of effort
        const recentActionCount = cachedStatsEvents.filter(e => 
            e.timestamp && 
            e.timestamp.toDate() >= thirtyDaysAgo &&
            (e.type === 'copy' || e.type === 'create_response' || e.type === 'extract_tracking')
        ).length;

        if (recentActionCount > 0) {
            // Average Actions Per Day (over last 30 days)
            const actionsPerDay = recentActionCount / 30;

            // Average Base XP per action (Conservative estimate: mostly copies @ 25xp)
            const averageBaseXP = 25; 

            // Calculate Predicted Daily Velocity using CURRENT multiplier
            const predictedDailyXP = actionsPerDay * averageBaseXP * currentMultiplier;
            
            if (predictedDailyXP > 0) {
                const daysToLevel = Math.ceil(xpRemaining / predictedDailyXP);
                let timeString = "";
                
                if (daysToLevel <= 1) timeString = "Today or Tomorrow!";
                else if (daysToLevel < 30) timeString = `${daysToLevel} Days`;
                else if (daysToLevel < 365) timeString = `${Math.ceil(daysToLevel / 30)} Months`;
                else timeString = "a while...";

                predictionDaysEl.textContent = timeString;
                predictionEl.classList.remove('hidden');
            } else {
                 predictionEl.classList.add('hidden');
            }
        } else {
             predictionEl.classList.add('hidden');
        }
    }
};


const renderAdvancedStats = async () => {
    const statsContent = document.getElementById('stats-content');
    const statsLoader = document.getElementById('stats-loader');
    const metricBadgesContainer = document.getElementById('metric-badges-container');
    const achievementsContainer = document.getElementById('achievements-container');
    const chartContainer = document.getElementById('stats-container');

    if (statsLoader) statsLoader.classList.remove('hidden');
    if (statsContent) statsContent.classList.add('hidden');

    if (!statsContent || isAnonymous) {
        if (statsContent) statsContent.innerHTML = '<p class="text-gray-400 text-center py-16">Sign in to track your achievements and usage stats.</p>';
        if (statsLoader) statsLoader.classList.add('hidden');
        if (statsContent) statsContent.classList.remove('hidden');
        return;
    }

    try {
		// 1. Set up our variables
		let userData = cachedStatsUserData;
		let events = cachedStatsEvents;
		
		// 2. BULLETPROOF CHECK: Only fetch if our cache is missing ANY data
		if (!userData || !events || events.length === 0) {
		    console.log("Fetching stats from Firebase (First time only!)");
		    
		    const userDocRef = getUserRootDocRef(userId);
		    const userDoc = await getDoc(userDocRef);
		    userData = userDoc.exists() ? userDoc.data() : {};
		
		    const eventsCollectionRef = getUserEventsCollectionRef(userId);
		    const snapshot = await getDocs(query(eventsCollectionRef));
		    events = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
		
		    // Save to memory so we don't have to fetch again
		    cachedStatsUserData = userData; 
		    cachedStatsEvents = events;
		} else {
		    console.log("Using memory cache. Saved you Firebase reads! 💸");
		}

		renderLevelingSystem(userData);

        // Render main components first
        await renderCategoryChart(events);
		calculateAndRenderRecords(events);
        renderActivityChart(events);
        renderLeaderboard();
        renderFilteredAchievements(events, userData);

        // --- Metric Badges ---
		// --- 1. Date Setup ---
		const now = new Date();
		const todayStr = now.toISOString().split('T')[0];
		
		// Get start of Current Week (Sunday)
		const currentWeekStart = new Date(now);
		currentWeekStart.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1)); // Adjust if you prefer Monday start
		currentWeekStart.setHours(0, 0, 0, 0);
		
		// Get start of Previous Week
		const lastWeekStart = new Date(currentWeekStart);
		lastWeekStart.setDate(currentWeekStart.getDate() - 7);
		
		// --- 2. Calculate Growth Trend (Option 1) ---
		const thisWeekCopies = events.filter(e => e.type === 'copy' && e.timestamp?.toDate() >= currentWeekStart).length;
		const lastWeekCopies = events.filter(e => e.type === 'copy' && e.timestamp?.toDate() >= lastWeekStart && e.timestamp?.toDate() < currentWeekStart).length;
		
		let growthPercent = 0;
		let growthLabel = 'Stable';
		let growthColor = 'text-gray-400';
		let growthIcon = 'fa-minus';
		let growthBorder = 'border-slate-500/20';
		let growthBg = 'from-slate-900/40 to-slate-900/40';
		
		if (lastWeekCopies > 0) {
		    growthPercent = Math.round(((thisWeekCopies - lastWeekCopies) / lastWeekCopies) * 100);
		} else if (thisWeekCopies > 0) {
		    growthPercent = 100; // First week of activity
		}
		
		if (growthPercent > 0) {
		    growthLabel = 'Growth';
		    growthColor = 'text-green-400';
		    growthIcon = 'fa-arrow-trend-up';
		    growthBorder = 'border-green-500/20';
		    growthBg = 'bg-gradient-to-br from-green-900/20 to-slate-900/40';
		} else if (growthPercent < 0) {
		    growthLabel = 'Decline';
		    growthColor = 'text-red-400';
		    growthIcon = 'fa-arrow-trend-down';
		    growthBorder = 'border-red-500/20';
		    growthBg = 'bg-gradient-to-br from-red-900/20 to-slate-900/40';
		}
		
		// --- 3. Calculate "On Fire" Status (Option 2) ---
		// Calculate daily average (excluding today to make the comparison fair, or just use all-time avg)
		const uniqueDays = new Set(events.filter(e => e.type === 'copy' && e.timestamp).map(e => e.timestamp.toDate().toISOString().split('T')[0])).size || 1;
		const allTimeCopies = events.filter(e => e.type === 'copy').length;
		const dailyAvg = allTimeCopies / uniqueDays;
		const todayCopies = events.filter(e => e.type === 'copy' && e.timestamp?.toDate().toISOString().split('T')[0] === todayStr).length;
		
		let statusTitle = "Normal";
		let statusSub = "Steady Pace";
		let statusColorClass = "text-blue-400";
		let statusBorder = "border-blue-500/20";
		let statusIconClass = "fa-stopwatch";
		let statusBg = "bg-gradient-to-br from-blue-900/20 to-slate-900/40";
		
		if (todayCopies === 0) {
		    statusTitle = "Quiet Day";
		    statusSub = "Ready to start?";
		    statusColorClass = "text-gray-400";
		    statusBorder = "border-gray-500/20";
		    statusIconClass = "fa-bed";
		    statusBg = "bg-gradient-to-br from-gray-800/20 to-slate-900/40";
		} else if (todayCopies > (dailyAvg * 1.5) && todayCopies >= 5) {
		    statusTitle = "On Fire! 🔥";
		    statusSub = "High Traffic";
		    statusColorClass = "text-orange-400";
		    statusBorder = "border-orange-500/20";
		    statusIconClass = "fa-fire";
		    statusBg = "bg-gradient-to-br from-orange-900/20 to-slate-900/40";
		} else if (todayCopies >= dailyAvg) {
		    statusTitle = "Active";
		    statusSub = "Above Average";
		    statusColorClass = "text-emerald-400";
		    statusBorder = "border-emerald-500/20";
		    statusIconClass = "fa-bolt";
		    statusBg = "bg-gradient-to-br from-emerald-900/20 to-slate-900/40";
		}
		
		// --- 4. Get other stats ---
		const totalResponsesCreated = events.filter(e => e.type === 'create_response').length;
		const totalCategoriesCount = Object.keys(categories).length;
// --- Metric Badges (UPDATED FOR BENTO) ---
		// --- Metric Badges Injection ---
		metricBadgesContainer.innerHTML = `
		    <div class="mini-stat-box group relative overflow-hidden ${growthBg} border ${growthBorder} rounded-2xl p-4 flex flex-col justify-between h-full hover:border-opacity-50 transition-all duration-300">
		        <div class="flex justify-between items-start z-10">
		            <div class="p-2 bg-slate-800/50 rounded-lg ${growthColor}">
		                <i class="fas ${growthIcon} text-lg"></i>
		            </div>
		            <span class="text-[10px] font-bold ${growthColor} uppercase tracking-wider bg-slate-800/50 px-2 py-1 rounded-full">${growthLabel}</span>
		        </div>
		        <div class="mt-3 z-10">
		            <span class="block text-3xl font-bold text-white tracking-tight">${growthPercent > 0 ? '+' : ''}${growthPercent}%</span>
		            <span class="text-xs text-slate-400 font-medium uppercase tracking-wider">Vs Last Week</span>
		        </div>
		    </div>
		
		    <div class="mini-stat-box group relative overflow-hidden ${statusBg} border ${statusBorder} rounded-2xl p-4 flex flex-col justify-between h-full hover:border-opacity-50 transition-all duration-300">
		        <div class="absolute -right-4 -top-4 w-20 h-20 bg-current opacity-10 rounded-full blur-2xl ${statusColorClass}"></div>
		        <div class="flex justify-between items-start z-10">
		            <div class="p-2 bg-slate-800/50 rounded-lg ${statusColorClass}">
		                <i class="fas ${statusIconClass} text-lg ${statusTitle.includes('Fire') ? 'animate-pulse' : ''}"></i>
		            </div>
		        </div>
		        <div class="mt-3 z-10">
		            <span class="block text-2xl font-bold text-white tracking-tight truncate">${statusTitle}</span>
		            <span class="text-xs text-slate-400 font-medium uppercase tracking-wider">${statusSub}</span>
		        </div>
		    </div>
		
		    <div class="mini-stat-box group relative overflow-hidden bg-gradient-to-br from-purple-900/40 to-slate-900/40 border border-purple-500/20 rounded-2xl p-4 flex flex-col justify-between h-full hover:border-purple-400/50 transition-colors">
		        <div class="flex justify-between items-start z-10">
		            <div class="p-2 bg-purple-500/20 rounded-lg text-purple-400">
		                <i class="fas fa-database text-lg"></i>
		            </div>
		        </div>
		        <div class="mt-3 z-10">
		            <span class="block text-3xl font-bold text-white tracking-tight">${totalResponsesCreated}</span>
		            <span class="text-xs text-purple-200/60 font-medium uppercase tracking-wider">Total Library</span>
		        </div>
		    </div>
		
		    <div class="mini-stat-box group relative overflow-hidden bg-gradient-to-br from-amber-900/40 to-slate-900/40 border border-amber-500/20 rounded-2xl p-4 flex flex-col justify-between h-full hover:border-amber-400/50 transition-colors">
		        <div class="flex justify-between items-start z-10">
		            <div class="p-2 bg-amber-500/20 rounded-lg text-amber-400">
		                <i class="fas fa-folder-open text-lg"></i>
		            </div>
		        </div>
		        <div class="mt-3 z-10">
		            <span class="block text-3xl font-bold text-white tracking-tight">${totalCategoriesCount}</span>
		            <span class="text-xs text-amber-200/60 font-medium uppercase tracking-wider">Categories</span>
		        </div>
		    </div>
		`;

// --- Top 5 Chart ---
        let allResponses = [];
        for (const categoryName in categories) {
            if (categories[categoryName].responses) {
                // By mapping, we add the categoryName to each response object
                const categoryResponses = categories[categoryName].responses.map(r => ({
                    ...r,
                    categoryName: categoryName 
                }));
                allResponses.push(...categoryResponses);
            }
        }
        const sortedResponses = allResponses.filter(r => r.timesCopied > 0).sort((a, b) => b.timesCopied - a.timesCopied);

        if (sortedResponses.length > 0) {
            chartContainer.innerHTML = '<canvas id="stats-chart"></canvas>';
            const topResponses = sortedResponses.slice(0, 5);
            const chartLabels = topResponses.map(r => r.label || 'Unlabeled');
            const chartData = topResponses.map(r => r.timesCopied);
            const borderColors = topResponses.map(r => 
                categories[r.categoryName]?.color || '#60a5fa' // Use category color or a default blue
            );
            const backgroundColors = borderColors.map(color => color + '80');

            if (statsChart) statsChart.destroy();
            const ctx = document.getElementById('stats-chart').getContext('2d');
            const isLightMode = document.body.classList.contains('light-mode');
            const textColor = isLightMode ? '#1f2937' : '#e5e7eb';
            const gridColor = isLightMode ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)';
            statsChart = new Chart(ctx, {
                type: 'bar',
				data: { labels: chartLabels, datasets: [{ 
                label: 'Times Copied', 
                data: chartData, 
                backgroundColor: backgroundColors, // Use our new array
                borderColor: borderColors,       // Use our new array
                borderWidth: 1 
            }] },
				options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', scales: { x: { beginAtZero: true, ticks: { color: textColor, precision: 0 }, grid: { color: gridColor } }, y: { ticks: { color: textColor }, grid: { display: false } } }, plugins: { legend: { display: false }, title: { display: false } } }
            });
        } else {
            chartContainer.innerHTML = '<p class="text-gray-400 text-center flex items-center justify-center h-full">Copy responses to see your top 5 here!</p>';
        }
		
		// --- Final step: Render challenges and tracker AFTER all other data is ready ---
        await renderChallenges(events);
        await renderChallengeTracker(events);

    } catch (error) {
        console.error("Error rendering stats:", error);
        if (statsContent) statsContent.innerHTML = `<p class="text-red-400 text-center py-16">Error loading stats: ${error.message}</p>`;
    } finally {
        if (statsLoader) statsLoader.classList.add('hidden');
        if (statsContent) statsContent.classList.remove('hidden');
    }
};

const showPlaceholderDemo = () => {
    isTutorialActive = true; 
    const highlightedResponse = document.querySelector('.tutorial-target-active') || document.querySelector('.response-item');
    if (highlightedResponse) {
        const textToCopy = highlightedResponse.querySelector('.response-text-display').textContent;
        processAndCopy(textToCopy);
    } else {
        processAndCopy("Hello [Customer's Name], this is a default message.");
    }
    
    // Hide the modern tooltip while the user interacts with the placeholder modal
    document.getElementById('tutorial-spotlight').classList.remove('active');
    document.getElementById('modern-tooltip').classList.remove('visible');
};


// --- All Event Listeners (Correctly placed to be attached only once) ---
function attachEventListeners() {


    // 1. Open the Modal from the Settings Page
    document.getElementById('restore-cloud-backup-btn')?.addEventListener('click', () => {
        if (isAnonymous || !userId) {
            showMessage("Please sign in to use cloud recovery.", "error");
            return;
        }
        document.getElementById('restore-backup-modal').classList.remove('hidden');
    });

    // 2. Cancel Button
    document.getElementById('cancel-restore-btn')?.addEventListener('click', () => {
        document.getElementById('restore-backup-modal').classList.add('hidden');
    });

    // 3. Confirm Button & Execution Logic
    document.getElementById('confirm-restore-btn')?.addEventListener('click', async (e) => {
        const btn = e.target.closest('button');
        const originalHtml = btn.innerHTML;
        
        // Show loading state
        btn.innerHTML = '<i class="fas fa-circle-notch fa-spin text-amber-200"></i> <span>Restoring...</span>';
        btn.disabled = true;

        try {
            // Grab the backup from the hidden folder
            const backupRef = doc(db, 'artifacts', safeAppId, 'users', userId, 'canned_responses_backup', 'latest');
            const backupDoc = await getDoc(backupRef);
            
            if (backupDoc.exists() && backupDoc.data().categories) {
                const recoveredCategories = backupDoc.data().categories;
                
                // Overwrite the LIVE database with the backup data
                const appDataRef = getUserCannedResponsesDocRef(userId);
                await setDoc(appDataRef, { categories: recoveredCategories });
                
                // Update the screen instantly
                categories = recoveredCategories;
                renderContent();
                
                showMessage("Workspace successfully restored from cloud backup!", "success");
            } else {
                showMessage("No cloud backup found.", "error");
            }
        } catch (error) {
            console.error("Error restoring backup:", error);
            showMessage("Failed to restore backup. Check your connection.", "error");
        } finally {
            // Reset button and hide modal
            btn.innerHTML = originalHtml;
            btn.disabled = false;
            document.getElementById('restore-backup-modal').classList.add('hidden');
        }
    });
	
// --- FEATURE 1: Reorder Categories (Multiple Moves) ---
    document.getElementById('reorder-categories-btn')?.addEventListener('click', () => {
        const list = document.getElementById('category-list');
        document.getElementById('category-actions-menu').classList.add('hidden');
        document.getElementById('category-actions-btn').classList.remove('active');
        
        // UI Toggle
        document.getElementById('add-category-btn').classList.add('hidden');
        document.getElementById('save-category-order-btn').classList.remove('hidden');
        list.classList.add('reorder-mode-active');
        
        showMessage("Drag categories horizontally. Click Save when done.", "success");
        
        if (!sortableCategoryInstance) {
            sortableCategoryInstance = new Sortable(list, {
                animation: 150,
                ghostClass: 'sortable-ghost',
                // Removed onEnd auto-save so user can make multiple moves
            });
        }
    });

    // NEW: Save Category Order Button
    document.getElementById('save-category-order-btn')?.addEventListener('click', () => {
        const list = document.getElementById('category-list');
        const itemEls = list.querySelectorAll('.category-item');
        
        itemEls.forEach((el, index) => {
            const catName = el.dataset.category;
            if (categories[catName]) {
                categories[catName].order = index; // Save new index
            }
        });
        saveToFirestore(categories);
        
        if (sortableCategoryInstance) {
            sortableCategoryInstance.destroy();
            sortableCategoryInstance = null;
        }
        list.classList.remove('reorder-mode-active');
        
        // UI Revert
        document.getElementById('add-category-btn').classList.remove('hidden');
        document.getElementById('save-category-order-btn').classList.add('hidden');
        
        showMessage("Category order saved!", "success");
        renderCategories();
    });


    // --- FEATURE 2: Reorder Responses (Layout Fixes) ---
    const reorderRespBtn = document.getElementById('reorder-responses-btn');
    const saveRespOrderBtn = document.getElementById('save-responses-order-btn');
    const addRespBtn = document.getElementById('open-add-response-modal-btn');
    const addRespSection = document.getElementById('add-response-section');
    
    reorderRespBtn?.addEventListener('click', () => {
        isReorderingResponses = true;
        
        // Hide normal buttons, show save button
        reorderRespBtn.classList.add('hidden');
        addRespBtn.classList.add('hidden');
        saveRespOrderBtn.classList.remove('hidden');
        
        // Hide Search Bar & stretch container to push Save to the right
        document.getElementById('search-bar-container').classList.add('hidden'); 
        addRespSection.classList.remove('md:w-auto');
        addRespSection.classList.add('w-full');
        
        renderResponses();
    });

	saveRespOrderBtn?.addEventListener('click', () => {
        const grid = document.getElementById('compact-reorder-grid');
        if (grid && categories[activeCategory]) {
            const newOrderIds = Array.from(grid.children).map(el => el.dataset.id);
            const oldArray = categories[activeCategory].responses;
            const newArray = [];
            
            // Rebuild the array based on DOM order
            newOrderIds.forEach(id => {
                const match = oldArray.find(r => r.id === id);
                if (match) newArray.push(match);
            });
            
            categories[activeCategory].responses = newArray;
            categories[activeCategory].customSorted = true; // --- NEW: Mark as custom sorted! ---
            saveToFirestore(categories);
        }
        
        // Reset UI
        isReorderingResponses = false;
        saveRespOrderBtn.classList.add('hidden');
        reorderRespBtn.classList.remove('hidden');
        addRespBtn.classList.remove('hidden');
        
        // Show Search Bar & shrink container
        document.getElementById('search-bar-container').classList.remove('hidden');
        addRespSection.classList.remove('w-full');
        addRespSection.classList.add('md:w-auto');
        
        if (sortableResponseInstance) {
            sortableResponseInstance.destroy();
            sortableResponseInstance = null;
        }
        
        renderResponses();
        showMessage("Response order saved!", "success");
    });

	const exportKbBtn = document.getElementById('export-kb-btn');
if (exportKbBtn) {
    exportKbBtn.addEventListener('click', exportGlobalKnowledgeBase);
}

// --- Guaranteed Sticky Category Bar (JS Fallback) ---
    const categoryBar = document.getElementById('category-bar');
    const categoryBarInner = document.getElementById('category-bar-inner');
    const placeholder = document.getElementById('category-bar-placeholder');

    if (categoryBar && categoryBarInner && placeholder) {
        window.addEventListener('scroll', () => {
            // Do nothing if the bar isn't currently supposed to be visible
            if (categoryBar.classList.contains('hidden')) {
                placeholder.style.height = 'auto';
                return;
            }

            // Sync the placeholder height before doing math so the page doesn't jump
            if (categoryBar.style.position !== 'fixed') {
                placeholder.style.height = categoryBar.offsetHeight + 'px';
            }

            // Get distance from top of screen
            const rect = placeholder.getBoundingClientRect();
            
            // If scrolled past 16px (top-4)
            if (rect.top <= 16) {
                // Pin it to the screen
                categoryBar.style.position = 'fixed';
                categoryBar.style.top = '16px';
                categoryBar.style.width = placeholder.offsetWidth + 'px';
                categoryBar.style.zIndex = '60';
                
                // Add Glassmorphism effect
                categoryBarInner.classList.add('is-stuck');
            } else {
                // Return to normal resting position
                categoryBar.style.position = 'relative';
                categoryBar.style.top = 'auto';
                categoryBar.style.width = '100%';
                
                // Remove Glassmorphism effect
                categoryBarInner.classList.remove('is-stuck');
            }
        }, { passive: true });

        // Handle window resizing to keep the fixed width perfectly accurate
        window.addEventListener('resize', () => {
            if (categoryBar.style.position === 'fixed') {
                categoryBar.style.width = placeholder.offsetWidth + 'px';
            }
        });
    }

// --- ADMIN SEARCH LOGIC ---
    const adminSearchInput = document.getElementById('admin-policy-search');
    
    if (adminSearchInput) {
        adminSearchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const policyItems = document.querySelectorAll('.admin-policy-item'); // We will add this class next
            let visibleCount = 0;

            policyItems.forEach(item => {
                // Get the searchable data from the DOM attributes we stored
                const title = (item.dataset.title || '').toLowerCase();
                const content = (item.dataset.content || '').toLowerCase();
                const categories = (item.dataset.categories || '').toLowerCase();

                // Check for match
                if (title.includes(searchTerm) || 
                    content.includes(searchTerm) || 
                    categories.includes(searchTerm)) {
                    
                    item.classList.remove('hidden');
                    visibleCount++;
                } else {
                    item.classList.add('hidden');
                }
            });

            // Update the counter
            const countLabel = document.getElementById('admin-search-count');
            if (countLabel) {
                countLabel.textContent = searchTerm ? `${visibleCount} matches` : '';
            }
        });
    }
	
// --- 2. MODAL LOGIC & ANIMATIONS ---

// --- THE WORKSHOP: Open & Close Logic ---
const workshopBtn = document.getElementById('open-workshop-btn');
if (workshopBtn) {
    workshopBtn.addEventListener('click', () => {
        const modal = document.getElementById('workshop-modal');
        const inner = document.getElementById('workshop-inner');
        
        // Show Modal Container instantly
        modal.classList.remove('hidden');
        
        // Trigger the smooth pop-in animation
        setTimeout(() => {
            inner.classList.remove('scale-95', 'opacity-0');
            inner.classList.add('scale-100', 'opacity-100');
        }, 10);
        
        // Tell it to draw the cards!
        renderWorkshopFeed();

        // --- NEW: Clear the Notification Badge ---
        const badge = document.getElementById('workshop-badge');
        if (badge && !badge.classList.contains('hidden')) {
            badge.classList.add('hidden');
            const now = Date.now();
            
            // Update local memory so it doesn't pop back up instantly
            if (cachedStatsUserData) {
                cachedStatsUserData.lastVisitedWorkshop = now;
            }
            
            // Save the new timestamp to Firebase
            setDoc(getUserRootDocRef(userId), { lastVisitedWorkshop: now }, { merge: true });
        }
    });
}

// Add the Search Bar Listener right here too!
document.getElementById('workshop-search-input')?.addEventListener('input', (e) => {
    renderWorkshopFeed(e.target.value);
});

// --- THE WORKSHOP: Feed Actions (Upvote, Downvote, Clone, Delete) ---
document.getElementById('workshop-feed')?.addEventListener('click', async (e) => {
    const deleteBtn = e.target.closest('.workshop-delete-btn');
    const upvoteBtn = e.target.closest('.workshop-upvote-btn');
    const downvoteBtn = e.target.closest('.workshop-downvote-btn');
    const cloneBtn = e.target.closest('.workshop-clone-btn');

    // 1. DELETE ACTION - Opens Custom Modal
    if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        const modal = document.getElementById('workshop-delete-confirm-modal');
        document.getElementById('confirm-workshop-delete-btn').dataset.id = id;
        modal.classList.remove('hidden');
        return;
    }

    // 2. UPVOTE / DOWNVOTE ACTION
    if (upvoteBtn || downvoteBtn) {
        const btn = upvoteBtn || downvoteBtn;
        const id = btn.dataset.id;
        const isUpvote = !!upvoteBtn;
        
        try {
            const docRef = doc(db, 'artifacts', safeAppId, 'workshop_responses', id);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const data = docSnap.data();
                const voters = data.voters || {};
                
                // Prevent double voting in the same direction
                if (voters[userId] === (isUpvote ? 1 : -1)) {
                    showMessage("You already voted this way!", "error");
                    return;
                }
                
                let upChange = 0;
                let downChange = 0;
                
                // Logic to swap votes if they change their mind
                if (voters[userId] === 1 && !isUpvote) { upChange = -1; downChange = 1; }
                else if (voters[userId] === -1 && isUpvote) { downChange = -1; upChange = 1; }
                else if (isUpvote) { upChange = 1; }
                else { downChange = 1; }
                
                voters[userId] = isUpvote ? 1 : -1;
                
                await updateDoc(docRef, {
                    upvotes: increment(upChange),
                    downvotes: increment(downChange),
                    voters: voters
                });
            }
        } catch (err) {
            console.error("Error voting:", err);
            showMessage("Error registering vote.", "error");
        }
        return;
    }

    // 3. CLONE (SAVE) ACTION - Opens the selection modal
    if (cloneBtn) {
        const id = cloneBtn.dataset.id;
        const responseToClone = workshopResponsesCache.find(r => r.id === id);
        
        if (responseToClone) {
            const modal = document.getElementById('clone-category-modal');
            const select = document.getElementById('clone-category-select');
            select.innerHTML = '';
            
            // Populate the dropdown with their existing categories
            Object.keys(categories).forEach(cat => {
                const option = document.createElement('option');
                option.value = cat;
                option.textContent = cat;
                if (cat === responseToClone.category) option.selected = true;
                select.appendChild(option);
            });
            
            // If the author's original category doesn't exist in this user's vault, offer to create it
            if (!categories[responseToClone.category]) {
                const option = document.createElement('option');
                option.value = 'CREATE_NEW';
                option.textContent = `+ Create new category: "${responseToClone.category}"`;
                option.selected = true; // Auto-select it
                select.appendChild(option);
            }

            // Attach the ID to the confirm button
            document.getElementById('confirm-clone-btn').dataset.id = id;
            document.getElementById('confirm-clone-btn').dataset.originalCat = responseToClone.category;
            
            modal.classList.remove('hidden');
        }
        return;
    }
});

// --- Clone Modal Handlers ---
document.getElementById('cancel-clone-btn')?.addEventListener('click', () => {
    document.getElementById('clone-category-modal').classList.add('hidden');
});

document.getElementById('confirm-clone-btn')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    const id = btn.dataset.id;
    const originalCat = btn.dataset.originalCat;
    let selectedCategory = document.getElementById('clone-category-select').value;
    
    const responseToClone = workshopResponsesCache.find(r => r.id === id);
    
    if (responseToClone) {
        // If they chose to create the author's missing category
        if (selectedCategory === 'CREATE_NEW') {
            selectedCategory = originalCat;
            categories[selectedCategory] = { color: '#60a5fa', responses: [] };
        }
        
        const newId = Date.now().toString();
        categories[selectedCategory].responses.push({
            id: newId,
            text: responseToClone.text,
            label: responseToClone.label + " (Cloned)",
            isPinned: false,
            createdAt: new Date().toISOString()
        });
        
        saveToFirestore(categories);
        showMessage("Response saved to your vault!", "success");
        logUserEvent('clone_workshop_response');
        await awardXP(50, 'Cloned a Response');
        
        document.getElementById('clone-category-modal').classList.add('hidden');
    }
});

// --- Workshop Custom Delete Modal Handlers ---
document.getElementById('cancel-workshop-delete-btn')?.addEventListener('click', () => {
    document.getElementById('workshop-delete-confirm-modal').classList.add('hidden');
});

document.getElementById('confirm-workshop-delete-btn')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    const id = btn.dataset.id;
    
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> <span>Deleting...</span>';
    btn.disabled = true;

    try {
        await deleteDoc(doc(db, 'artifacts', safeAppId, 'workshop_responses', id));
        showMessage("Submission deleted.", "success");
        document.getElementById('workshop-delete-confirm-modal').classList.add('hidden');
    } catch (err) {
        console.error("Error deleting:", err);
        showMessage("Error deleting submission.", "error");
    } finally {
        btn.innerHTML = originalHtml;
        btn.disabled = false;
    }
});

// --- Workshop Info Toggle Handlers ---
document.getElementById('workshop-info-btn')?.addEventListener('click', () => {
    document.getElementById('workshop-instructions-panel').classList.remove('translate-x-full');
});
document.getElementById('close-workshop-info-btn')?.addEventListener('click', () => {
    document.getElementById('workshop-instructions-panel').classList.add('translate-x-full');
});


const closeWorkshopModal = () => {
    const modal = document.getElementById('workshop-modal');
    const inner = document.getElementById('workshop-inner');
    
    // Trigger the smooth shrink-out animation
    inner.classList.remove('scale-100', 'opacity-100');
    inner.classList.add('scale-95', 'opacity-0');
    
    // Wait for animation to finish before hiding completely
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
};

document.getElementById('close-workshop-btn')?.addEventListener('click', closeWorkshopModal);

// Close on background click
document.body.addEventListener('click', (e) => {
    const workshopModal = document.getElementById('workshop-modal');
    if (e.target === workshopModal) {
        closeWorkshopModal();
    }
});

let magicTypingTimer;

// Open Logic with Ghost Loading Transition
const magicDraftBtn = document.getElementById('open-magic-draft-btn');
if (magicDraftBtn) {
    magicDraftBtn.addEventListener('click', async () => {
        const modal = document.getElementById('magic-draft-modal');
        const inner = document.getElementById('magic-draft-inner');
        const skeleton = document.getElementById('magic-draft-skeleton');
        const form = document.getElementById('magic-draft-form');
        const infoPanel = document.getElementById('magic-instructions-panel');

        // 1. Reset fields and UI state
        document.getElementById('magic-input-text').value = '';
        document.getElementById('magic-instruction-text').value = '';
        document.getElementById('magic-status-select').value = '';
        document.getElementById('magic-policy-container').classList.add('hidden');
        infoPanel.classList.add('translate-x-full'); // Ensure info panel is closed

        // 2. Set initial state: Skeleton visible, Form hidden
        form.classList.add('hidden');
        form.classList.remove('opacity-100');
        skeleton.classList.remove('hidden', 'opacity-0');
        
        // Show Modal Container instantly
        modal.classList.remove('hidden');
        setTimeout(() => {
            inner.classList.remove('scale-95', 'opacity-0');
            inner.classList.add('scale-100', 'opacity-100');
        }, 10);

        // 3. Fetch Data (This creates the simulated/actual delay for the ghost UI)
        await loadGlobalKnowledge(); 
        
        // Populate category dropdown dynamically
        const catSelect = document.getElementById('magic-category-select');
        catSelect.innerHTML = '<option value="">-- Auto Detect --</option>';
        Object.keys(categories).forEach(cat => {
            const option = document.createElement('option');
            option.value = cat; option.textContent = cat;
            if (cat === "GUTS" || (!Object.keys(categories).includes("GUTS") && cat === activeCategory)) {
                option.selected = true;
            }
            catSelect.appendChild(option);
        });

        // 4. Smooth Transition: Skeleton -> Form
        skeleton.classList.add('opacity-0');
        
        setTimeout(() => {
            skeleton.classList.add('hidden');
            form.classList.remove('hidden');
            
            // Force a browser reflow to ensure the CSS transition applies cleanly
            void form.offsetWidth;
            form.classList.add('opacity-100');
            
            // Set focus to the first input for immediate typing UX
            document.getElementById('magic-input-text').focus();
        }, 300); // 300ms matches the Tailwind duration-300 class perfectly
    });
}

// Info Panel Toggle Logic
document.getElementById('magic-info-btn')?.addEventListener('click', () => {
    document.getElementById('magic-instructions-panel').classList.remove('translate-x-full');
});
document.getElementById('close-magic-info-btn')?.addEventListener('click', () => {
    document.getElementById('magic-instructions-panel').classList.add('translate-x-full');
});

const magicInput = document.getElementById('magic-input-text');
if (magicInput) {
    magicInput.addEventListener('input', (e) => {
        const text = e.target.value.trim();
        const container = document.getElementById('magic-policy-container');
        const scanningUI = document.getElementById('magic-policy-scanning');
        const statusUI = document.getElementById('magic-policy-status');

        clearTimeout(magicTypingTimer);

        if (text.length < 10) {
            container.classList.add('hidden');
            magicInput.classList.remove('is-analyzing');
            return;
        }

        // Show Scanning State
        container.classList.remove('hidden');
        statusUI.classList.add('hidden');
        scanningUI.classList.remove('hidden');
        magicInput.classList.add('is-analyzing');

        // Execute Brain after typing pauses
        magicTypingTimer = setTimeout(() => {
            magicInput.classList.remove('is-analyzing');
            scanningUI.classList.add('hidden');

            const category = document.getElementById('magic-category-select').value;
            const policy = findPolicyForTicket(text, category);

            if (policy) {
                document.getElementById('magic-policy-name').textContent = policy.title;
                // Clean markdown from snippet for UI display
                const cleanSnippet = (policy.focusedSnippet || "Relevant rules identified.").replace(/\*\*/g, '').trim();
                document.getElementById('magic-policy-snippet').textContent = `"...${cleanSnippet}..."`;
                
                // Calculate a fake percentage based on score (capped at 99%)
                const pct = Math.min(Math.floor((policy.score / 150) * 100) + 40, 99);
                document.getElementById('magic-policy-score').textContent = `Match: ${pct}%`;
                
                statusUI.classList.remove('hidden');
            } else {
                container.classList.add('hidden'); // Hide if no match found
            }
        }, 600); // 600ms delay feels like "AI processing"
    });
}

// --- 3. THE PROMPT ENGINEERING ENGINE (With Local Chrome AI Integration) ---
const magicGoBtn = document.getElementById('magic-go-btn');
if (magicGoBtn) {
    magicGoBtn.addEventListener('click', async () => {
        const summaryText = document.getElementById('magic-input-text').value.trim();
        const instructionText = document.getElementById('magic-instruction-text').value.trim();
        const category = document.getElementById('magic-category-select').value;
        const ticketStatus = document.getElementById('magic-status-select').value;
        const toneElement = document.querySelector('input[name="magic-tone"]:checked');
        const tone = toneElement ? toneElement.value : 'Standard';

        if (!summaryText) {
            const magicInputEl = document.getElementById('magic-input-text');
            magicInputEl.classList.add('ring-2', 'ring-red-500');
            setTimeout(() => magicInputEl.classList.remove('ring-2', 'ring-red-500'), 500);
            return;
        }

        const policy = findPolicyForTicket(summaryText, category);

        // --- OPTIMIZED FEW-SHOT PROMPT ---
        let prompt = `You are a Senior Customer Support Agent for Google IT. Your objective is to write an email responding to an employee's hardware/software request.\n\n`;
        
        prompt += `### SYSTEM DIRECTIVES (STRICT COMPLIANCE REQUIRED) ###\n`;
        prompt += `1. **Customer Facing:** This email goes directly to the user. Do NOT mention internal systems (GUTS, PAR, SAP, Buganizer, MOMA, Techstop).\n`;
        prompt += `2. **No Jargon:** Never use terms like "Assigned - Additional", "Hostnames", "P0/P1", or "Ticket SLA".\n`;
        prompt += `3. **Formatting:** Use short paragraphs. NEVER use markdown bolding (**text**). If you need to make a list or outline steps, NEVER use standard markdown bullet points ('*' or '•')—you MUST use a simple dash ('-') with a space instead.\n`;
        prompt += `4. **Data Extraction & Placeholders:** You MUST extract specific data (Location, Asset Tag, Hostname, Device Model, etc.) from the 'ACTUAL USER TICKET' and use it in the email body. ONLY use bracketed placeholders like [Customer Name] or [Date] if the specific information is completely missing from the ticket context.\n`;
        prompt += `5. **Sign-off:** End the email ONLY with "Best regards,\n\n${userName}". Do not add "IT Support" or any other titles below the name.\n\n`;

        prompt += `### TONE: ${tone.toUpperCase()} ###\n`;
        if (tone === 'Firm') {
            prompt += `- Be polite but authoritative. State policies clearly without over-apologizing.\n\n`;
        } else if (tone === 'Empathetic') {
            prompt += `- Acknowledge their frustration. Use phrases like "I understand the urgency" or "I apologize for the delay."\n\n`;
        } else {
            prompt += `- Professional, concise, and solution-oriented.\n\n`;
        }

        // --- DYNAMIC PENDING STATUS DIRECTIVE ---
        if (ticketStatus) {
            prompt += `### TICKET STATUS DIRECTIVE ###\n`;
            prompt += `You MUST explicitly state in the email that you are updating the ticket status to "${ticketStatus}".\n`;
            
            if (ticketStatus === 'In Progress') {
                prompt += `You MUST also set the expectation that the user should expect an update before the end of the day.\n\n`;
            } else if (ticketStatus === 'Pending Customer Action') {
                prompt += `You MUST also set the expectation that we will follow up within 3 business days if we do not receive a reply or the required action is not completed.\n\n`;
            } else if (ticketStatus === 'Pending Date of Event') {
                prompt += `You MUST also set the expectation that we will follow up or execute the request on the specifically scheduled date. If the date is more than 7 days from today, set the expectation to 5 business days.\n\n`;
            } else {
                prompt += `You MUST also set the expectation that we will follow up or provide an update within 5 business days.\n\n`;
            }
        }

        prompt += `### EXAMPLE OF A GOOD RESPONSE ###\n`;
        prompt += `Hello [Customer Name],\n\nI have processed your request for the [Hardware Model]. Your item will be shipped shortly.\n\nYou can track the delivery here: [FedEx Tracking Number].\n\nPlease note that you must return your old device within 10 business days to avoid chargebacks.\n\nBest regards,\n\n${userName}\n\n`;

        prompt += `### ACTUAL USER TICKET ###\n`;
        prompt += `"${summaryText}"\n\n`;
        
        if (instructionText) {
            prompt += `### OPERATOR INSTRUCTIONS ###\n`;
            prompt += `(Incorporate these instructions naturally into the draft)\n`;
            prompt += `"${instructionText}"\n\n`;
        }

        if (policy) {
            prompt += `### APPLICABLE COMPANY POLICY RULES ###\n`;
            prompt += `(Ensure your draft complies with these rules. Do not explicitly say "According to policy")\n`;
            prompt += `Rule Source: ${policy.title}\n`;
            prompt += `Rule Details: ${policy.focusedSnippet || policy.content}\n\n`;
        }
        
        prompt += `### FINAL OUTPUT INSTRUCTION ###\n`;
        prompt += `Review your generated email draft. IF your email contains a list of items or steps, you MUST wrap the ENTIRE email inside a plain text code block (using \`\`\`text ... \`\`\`) to prevent rich-text rendering issues in our ticketing system. IF your email does NOT contain any lists, simply output the email normally as standard text without any code blocks. Do NOT output any conversational filler text outside of your draft in either case.\n`;
        prompt += `--- OUTPUT ONLY THE EMAIL BODY BELOW THIS LINE ---\n`;

        // --- NEW: EXECUTION & FALLBACK LOGIC ---
        const originalHTML = magicGoBtn.innerHTML;
        const originalClasses = magicGoBtn.className;
        
        // 1. Set Button to Loading State
        magicGoBtn.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> <span>Generating locally...</span>`;
        magicGoBtn.classList.add('opacity-50', 'cursor-not-allowed', 'pointer-events-none');

        let localResponse = null;

        // 2. Secure Cloud Function Execution
        try {
            // This securely calls the backend script we just deployed!
            const generateMagicDraft = httpsCallable(functions, 'generateMagicDraft');
            
            // Send the prompt to the cloud and wait for the AI text to come back
            const result = await generateMagicDraft({ prompt: prompt });
            
            localResponse = result.data.text;
            
        } catch (err) {
            console.error("Cloud Function failed, falling back to web clipboard.", err);
        }

        // 3. Restore original button state
        magicGoBtn.innerHTML = originalHTML;
        magicGoBtn.className = originalClasses;

        // 4. Branch Logic: Success vs Fallback
        if (localResponse) {
            // SUCCESS: Switch to Local Output View
            document.getElementById('magic-input-screen').classList.add('hidden');
            document.getElementById('magic-output-screen').classList.remove('hidden');
            magicGoBtn.closest('.bg-gray-900\\/90').classList.add('hidden'); // Hide original footer
            
            // Clean up the text slightly just in case the AI wraps it in markdown by mistake
            const cleanResponse = localResponse.replace(/^```\w*\n/, '').replace(/\n```$/, '');
            document.getElementById('magic-generated-output').value = cleanResponse.trim();
        } else {
            // FALLBACK: Execute exact existing logic
            try {
                await navigator.clipboard.writeText(prompt);
                
                magicGoBtn.innerHTML = `<i class="fas fa-check"></i> <span>Prompt Copied!</span>`;
                magicGoBtn.className = "flex-1 sm:flex-none px-8 py-3 rounded-xl font-bold text-white bg-green-500 shadow-lg transform transition flex items-center justify-center gap-2 text-sm";

                showMessage("AI Prompt Copied! Press Ctrl+V in Gemini.", "success", 4000);
                
                setTimeout(() => {
                    window.open('https://gemini.google.com/app', '_blank');
                    document.getElementById('magic-draft-inner').classList.remove('scale-100', 'opacity-100');
                    document.getElementById('magic-draft-inner').classList.add('scale-95', 'opacity-0');
                    
                    document.getElementById('magic-instruction-text').value = '';
                    document.getElementById('magic-status-select').value = '';
                    
                    setTimeout(() => document.getElementById('magic-draft-modal').classList.add('hidden'), 300);
                    
                    setTimeout(() => {
                        magicGoBtn.innerHTML = originalHTML;
                        magicGoBtn.className = originalClasses;
                    }, 500);
                }, 1000);

            } catch (err) {
                console.error("Clipboard failed:", err);
                showMessage("Could not copy prompt. Please manually copy.", "error");
            }
        }
    });
}

// --- NEW: Local Output Screen UI Button Listeners ---

// Back to Edit Button
document.getElementById('magic-back-edit-btn')?.addEventListener('click', () => {
    document.getElementById('magic-output-screen').classList.add('hidden');
    document.getElementById('magic-input-screen').classList.remove('hidden');
    document.getElementById('magic-go-btn').closest('.bg-gray-900\\/90').classList.remove('hidden');
});

// Copy & Inject Button
document.getElementById('magic-copy-inject-btn')?.addEventListener('click', async () => {
    const finalDraft = document.getElementById('magic-generated-output').value;
    
    try {
        await navigator.clipboard.writeText(finalDraft);
        showMessage("Generated draft copied to clipboard!", "success");
        
        // Reset and Close Modal
        const inner = document.getElementById('magic-draft-inner');
        inner.classList.remove('scale-100', 'opacity-100');
        inner.classList.add('scale-95', 'opacity-0');
        
        setTimeout(() => {
            document.getElementById('magic-draft-modal').classList.add('hidden');
            // Reset fields
            document.getElementById('magic-input-text').value = '';
            document.getElementById('magic-instruction-text').value = '';
            document.getElementById('magic-status-select').value = '';
            document.getElementById('magic-instructions-panel').classList.add('translate-x-full');
            
            // Reset Views
            document.getElementById('magic-output-screen').classList.add('hidden');
            document.getElementById('magic-input-screen').classList.remove('hidden');
            document.getElementById('magic-go-btn').closest('.bg-gray-900\\/90').classList.remove('hidden');
        }, 300);

    } catch (err) {
        showMessage("Could not copy. Please manually copy the text.", "error");
    }
});

// Update the existing close button logic to reset the views as well
const closeMagicModal = () => {
    const inner = document.getElementById('magic-draft-inner');
    inner.classList.remove('scale-100', 'opacity-100');
    inner.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        document.getElementById('magic-draft-modal').classList.add('hidden');
        document.getElementById('magic-instruction-text').value = '';
        document.getElementById('magic-status-select').value = '';
        document.getElementById('magic-instructions-panel').classList.add('translate-x-full');
        
        // Reset Views
        document.getElementById('magic-output-screen').classList.add('hidden');
        document.getElementById('magic-input-screen').classList.remove('hidden');
        const footer = document.getElementById('magic-go-btn');
        if(footer) footer.closest('.bg-gray-900\\/90').classList.remove('hidden');
    }, 300);
};
document.getElementById('close-magic-draft-btn')?.addEventListener('click', closeMagicModal);
document.getElementById('magic-cancel-btn')?.addEventListener('click', closeMagicModal);


document.body.addEventListener('click', (e) => {

    // 1. Handle "Close" (X) Button at top
    const closeBtn = e.target.closest('#close-insights-btn');
    if (closeBtn) {
        document.body.classList.remove('sidebar-active'); 
        const sidebar = document.getElementById('insights-sidebar');
        sidebar.classList.remove('translate-x-0');
        sidebar.classList.add('translate-x-full');
        
        // --- NEW: Remove Highlight ---
        document.querySelectorAll('.response-item').forEach(el => el.classList.remove('ring-2', 'ring-purple-500', 'shadow-[0_0_15px_rgba(168,85,247,0.5)]'));
        return; 
    }

    // 2. Handle "Edit" Button (Admin Only)
    const editBtn = e.target.closest('#admin-edit-btn');
    if (editBtn) {
        if (!currentPolicyId) return;
        const policy = globalKnowledgeCache.find(p => p.id === currentPolicyId);
        if (policy) {
            editingArticleId = policy.id;
            document.getElementById('ingest-title').value = policy.title || "";
            document.getElementById('ingest-content').value = policy.content || "";
            document.getElementById('ingest-url').value = policy.sourceUrl || "";
            document.getElementById('ingest-modal-title').textContent = "Edit Policy";
            document.getElementById('ingest-anchors').value = (policy.requiredAnchors || []).join(', ');
            document.getElementById('ingest-negative').value = (policy.negativeKeywords || []).join(', ');
            
            document.getElementById('ingest-modal').classList.remove('hidden');
            document.body.classList.remove('sidebar-active'); // Slide back
            document.getElementById('insights-sidebar').classList.add('translate-x-full');
        }
        return;
    }

	// 3. Handle the Footer Close Button
    const footerCloseBtn = e.target.closest('#close-sidebar-footer-btn');
    if (footerCloseBtn) {
        document.body.classList.remove('sidebar-active'); 
        const sidebar = document.getElementById('insights-sidebar');
        sidebar.classList.remove('translate-x-0');
        sidebar.classList.add('translate-x-full');

        // --- NEW: Remove Highlight ---
        document.querySelectorAll('.response-item').forEach(el => el.classList.remove('ring-2', 'ring-purple-500', 'shadow-[0_0_15px_rgba(168,85,247,0.5)]'));
        return;
    }
});

// Keep this outside the body click listener
const sidebarFooter = document.getElementById('sidebar-footer');
if (sidebarFooter) {
    sidebarFooter.addEventListener('click', (e) => {
        const editBtn = e.target.closest('#admin-edit-btn');
        if (editBtn) {
            if (!currentPolicyId) return;
            const policy = globalKnowledgeCache.find(p => p.id === currentPolicyId);
            if (policy) {
                editingArticleId = policy.id;
                document.getElementById('ingest-title').value = policy.title || "";
                document.getElementById('ingest-content').value = policy.content || "";
                document.getElementById('ingest-url').value = policy.sourceUrl || "";
                document.getElementById('ingest-modal-title').textContent = "Edit Policy";
                
                document.getElementById('ingest-modal').classList.remove('hidden');
                document.body.classList.remove('sidebar-active');
                document.getElementById('insights-sidebar').classList.add('translate-x-full');
            }
        }
    });
}

// Add a container for the warning in your HTML modal first, or inject it like this:
const editModalTextarea = document.getElementById('edit-response-text');
const editModalLabel = document.querySelector('label[for="edit-response-text"]');

// Create a warning container dynamically if it doesn't exist
let warningContainer = document.getElementById('edit-conflict-warning');
if (!warningContainer) {
    warningContainer = document.createElement('div');
    warningContainer.id = 'edit-conflict-warning';
    warningContainer.className = 'hidden mb-2 p-2 bg-red-900/30 border border-red-500/50 rounded-lg flex items-center gap-2 text-red-300 text-xs font-bold';
    editModalLabel.parentNode.insertBefore(warningContainer, editModalTextarea);
}

// Add the Listener
editModalTextarea.addEventListener('input', () => {
    const text = editModalTextarea.value;
    let conflict = null;

    // Scan all policies
    for (const policy of globalKnowledgeCache) {
        const conflicts = detectPolicyConflicts(text, policy.content);
        if (conflicts.length > 0) {
            conflict = conflicts[0];
            break; // Stop at first conflict
        }
    }

    if (conflict) {
        warningContainer.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Conflict: You typed "${conflict.userPhrase}", policy says "${conflict.policyPhrase}"`;
        warningContainer.classList.remove('hidden');
        editModalTextarea.classList.add('border-red-500');
    } else {
        warningContainer.classList.add('hidden');
        editModalTextarea.classList.remove('border-red-500');
    }
});
	
// Sidebar Close Button
document.getElementById('close-insights-btn')?.addEventListener('click', () => {
    const sidebar = document.getElementById('insights-sidebar');
    
    document.body.classList.remove('sidebar-active');
    sidebar.classList.remove('translate-x-0');
    sidebar.classList.add('translate-x-full');
    
    // --- NEW: Remove Highlight ---
    document.querySelectorAll('.response-item').forEach(el => el.classList.remove('ring-2', 'ring-purple-500', 'shadow-[0_0_15px_rgba(168,85,247,0.5)]'));
    
     if (currentPolicyId) {
        localStorage.setItem(`pkb_seen_${currentPolicyId}`, currentPolicyTimestamp);
    }
});

// Admin: Open Ingest Modal (Settings Page)
document.addEventListener('click', (e) => {
    if(e.target.closest('#open-ingest-btn')) {
        resetIngestForm(); // Ensure it's clean
        document.getElementById('ingest-modal').classList.remove('hidden');
    }
});

// Admin: Close Ingest Modal
document.getElementById('close-ingest-btn')?.addEventListener('click', () => {
    document.getElementById('ingest-modal').classList.add('hidden');
    resetIngestForm(); // Clean up on cancel too
});

document.getElementById('save-ingest-btn')?.addEventListener('click', async () => {
    const title = document.getElementById('ingest-title').value;
    const content = document.getElementById('ingest-content').value;
    const sourceUrl = document.getElementById('ingest-url').value.trim();
    
    // NEW: Parse Tags
    const anchorsRaw = document.getElementById('ingest-anchors').value;
    const negativesRaw = document.getElementById('ingest-negative').value;
	const categoriesRaw = document.getElementById('ingest-categories').value;
	const targetCategories = categoriesRaw.split(',').map(s => s.trim()).filter(s => s.length > 0);

    const requiredAnchors = anchorsRaw.split(',').map(s => s.trim()).filter(s => s.length > 0);
    const negativeKeywords = negativesRaw.split(',').map(s => s.trim()).filter(s => s.length > 0);
    
    if(!title || !content) {
        alert("Please provide both a title and content.");
        return;
    }
    
    const keywords = content.toLowerCase().match(/\b(\w{4,})\b/g) || [];
    const uniqueKeywords = [...new Set(keywords)];

    const docData = {
        title,
        content,
        sourceUrl,
        keywords: uniqueKeywords,
		targetCategories,
        requiredAnchors,   
        negativeKeywords,  
        updatedAt: serverTimestamp(),
        author: currentAdminUser.email
    };

    try {
        if (editingArticleId) {
            // --- UPDATE EXISTING ---
            await updateDoc(doc(db, 'global_knowledge', editingArticleId), docData);
            showMessage("Policy Updated!", "success");
        } else {
            // --- CREATE NEW ---
            await addDoc(collection(db, 'global_knowledge'), docData);
            showMessage("Policy Ingested!", "success");
        }
        
        // Cleanup
        document.getElementById('ingest-modal').classList.add('hidden');
        resetIngestForm(); // Helper function defined below
        
    } catch(e) {
        console.error(e);
        alert("Error saving. Do you have admin permissions?");
    }
});
	
	// Theme Selector Listeners
document.querySelectorAll('.bg-theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const theme = btn.dataset.theme;
        applyBackgroundTheme(theme);
        
        // If in Light Mode, switch to Dark Mode automatically to see the change
        if (document.body.classList.contains('light-mode')) {
            document.body.classList.remove('light-mode');
            localStorage.setItem('theme', 'dark');
            const icon = document.getElementById('theme-icon-settings');
            if(icon) icon.className = 'fas fa-moon mr-2';
            showMessage("Switched to Dark Mode to view theme", "success");
        }
    });
});

	// --- Leaderboard Filter Listener ---
const lbFilterGroup = document.getElementById('leaderboard-filter-group');
if (lbFilterGroup) {
    lbFilterGroup.addEventListener('click', (e) => {
        const btn = e.target.closest('.lb-filter-btn');
        if (btn) {
            // 1. Visual Update
            lbFilterGroup.querySelectorAll('.lb-filter-btn').forEach(b => {
                b.classList.remove('active', 'bg-blue-600', 'text-white');
                b.classList.add('text-gray-400');
            });
            btn.classList.add('active', 'bg-blue-600', 'text-white');
            btn.classList.remove('text-gray-400');

            // 2. Logic Update
            const view = btn.dataset.view;
            renderLeaderboard(view);
        }
    });
}

    document.body.addEventListener('click', (e) => {
        const card = e.target.closest('.achievement-card-redesign');
        if (card) {
            // This calls the helper function we created in Part 1
            openAchievementDetailsModal(card);
            e.stopPropagation(); // Stop the click from bubbling up (prevents opening the expanded view)
        }
    });

    // 2. Listener to OPEN the Expanded Achievements View
    // This triggers when you click the background of the dashboard card
    const achWrapper = document.getElementById('achievements-card-wrapper');
    if (achWrapper) {
        achWrapper.addEventListener('click', (e) => {
            // Only open if we didn't click a specific tile (handled above) or a button
            if (!e.target.closest('.achievement-tile') && !e.target.closest('button')) {
                openExpandedAchievements();
            }
        });
    }

    // 3. Listeners for the Filter Buttons INSIDE the Expanded Modal
    const modalAchFilterAll = document.getElementById('modal-ach-filter-all');
    const modalAchFilterUnlocked = document.getElementById('modal-ach-filter-unlocked');

    if (modalAchFilterAll && modalAchFilterUnlocked) {
        modalAchFilterAll.addEventListener('click', () => {
            updateModalAchFilterUI('all');
            // Re-render using the CACHED data variables we added earlier
            renderFilteredAchievements(cachedStatsEvents, cachedStatsUserData, 'all', 'expanded-achievements-grid');
        });

        modalAchFilterUnlocked.addEventListener('click', () => {
            updateModalAchFilterUI('unlocked');
            // Re-render using the CACHED data variables
            renderFilteredAchievements(cachedStatsEvents, cachedStatsUserData, 'unlocked', 'expanded-achievements-grid');
        });
    }

	// --- Achievement Filter Listeners ---
const filterAllBtn = document.getElementById('ach-filter-all');
const filterUnlockedBtn = document.getElementById('ach-filter-unlocked');

if (filterAllBtn && filterUnlockedBtn) {
    filterAllBtn.addEventListener('click', () => {
        activeAchievementFilter = 'all';
        filterAllBtn.classList.add('bg-blue-600', 'text-white');
        filterAllBtn.classList.remove('text-gray-400');
        filterUnlockedBtn.classList.remove('bg-blue-600', 'text-white');
        filterUnlockedBtn.classList.add('text-gray-400');
        renderAdvancedStats(); 
    });

    filterUnlockedBtn.addEventListener('click', () => {
        activeAchievementFilter = 'unlocked';
        // Update Button Styles
        filterUnlockedBtn.classList.add('bg-blue-600', 'text-white');
        filterUnlockedBtn.classList.remove('text-gray-400');
        filterAllBtn.classList.remove('bg-blue-600', 'text-white');
        filterAllBtn.classList.add('text-gray-400');
        
        renderAdvancedStats();
    });
}
    

// This handles clicks on the TEXT or BACKGROUND of the card
const activityWrapper = document.getElementById('activity-card-wrapper');
if (activityWrapper) {
    activityWrapper.addEventListener('click', async (e) => {
        // Don't trigger if they clicked a filter button
        if (e.target.closest('.activity-filter-btn')) return;
        
        // This handles the background click
        if (userId && window.activityChartInstance) {
             // Retrieve events safely
             const eventsCollectionRef = getUserEventsCollectionRef(userId);
             const snapshot = await getDocs(query(eventsCollectionRef));
             const currentEvents = snapshot.docs.map(doc => doc.data());
             
             openExpandedChart(window.activityChartInstance, 'Activity Analysis', currentEvents, 'activity');
        }
    });
}

    // 2. Category Chart Click
    const categoryWrapper = document.getElementById('category-card-wrapper');
    if (categoryWrapper) {
        categoryWrapper.addEventListener('click', () => {
            openExpandedChart(categoryChartInstance, 'Category Breakdown');
        });
    }

    // 3. Top Responses Chart Click
    const statsWrapper = document.getElementById('stats-card-wrapper');
    if (statsWrapper) {
        statsWrapper.addEventListener('click', () => {
            openExpandedChart(statsChart, 'Top 5 Responses');
        });
    }

    // 4. Close Modal Listener
    const closeExpandedBtn = document.getElementById('close-expanded-chart-btn');
    if(closeExpandedBtn) {
        closeExpandedBtn.addEventListener('click', closeExpandedChart);
    }

    // 5. Close on background click
    const expandedModal = document.getElementById('expanded-chart-modal');
    if(expandedModal) {
        expandedModal.addEventListener('click', (e) => {
            if (e.target === expandedModal) {
                closeExpandedChart();
            }
        });
    }
    
    // 6. Close on Escape Key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && expandedModal && !expandedModal.classList.contains('hidden')) {
            closeExpandedChart();
        }
    });

const activityFilterGroup = document.getElementById('activity-filter-group');
if (activityFilterGroup) {
    activityFilterGroup.addEventListener('click', async (e) => {
        const button = e.target.closest('.activity-filter-btn');
        if (button && !button.classList.contains('active')) {
            // 1. Update active class
            activityFilterGroup.querySelectorAll('.activity-filter-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            button.classList.add('active');
            
            // 2. Get data and re-render
            const period = button.dataset.period;
            
            // We need to re-fetch the events data to pass to the render function
            // (This is necessary in case new events happened since the page loaded)
            const eventsCollectionRef = getUserEventsCollectionRef(userId);
            const snapshot = await getDocs(query(eventsCollectionRef));
            const events = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            
            renderActivityChart(events, period);
        }
    });
}
	
    const unlockAudio = () => {
        if (!audioUnlocked) {
            const sound = document.getElementById('achievement-sound');
            if (sound) {
                sound.play().catch(() => {});
                sound.pause();
                audioUnlocked = true;
                document.body.removeEventListener('click', unlockAudio);
                console.log('Audio has been unlocked by user interaction.');
            }
        }
    };
    document.body.addEventListener('click', unlockAudio);

	const challengesContainer = document.getElementById('challenges-container');
    if (challengesContainer) {
        challengesContainer.addEventListener('click', e => {
            const trackBtn = e.target.closest('.track-challenge-btn');
            if (trackBtn) {
                const challengeId = trackBtn.dataset.challengeId;
                if (trackedChallengeId === challengeId) {
                    stopTrackingChallenge();
                } else {
                    startTrackingChallenge(challengeId);
                }
            }
        });
    }

    document.body.addEventListener('click', e => {
        // This listener is on the body because the HUD is created and destroyed dynamically
        const closeBtn = e.target.closest('#challenge-tracker-close-btn');
        if (closeBtn) {
            stopTrackingChallenge();
        }
    });
	
    // Navigation Listeners
    const navButtons = ['nav-canned-responses', 'nav-fedex-tracker', 'nav-helpful-links', 'nav-my-stats', 'nav-settings', 'nav-sla-dashboard'];
    navButtons.forEach(id => {
        const btn = document.getElementById(id);
        if(btn) btn.addEventListener('click', () => {
            currentPage = id.replace('nav-', '');
            localStorage.setItem('lastVisitedPage', currentPage);
            renderContent();
            closeSidebar();
            logUserEvent('visit_page', { page: currentPage });
        });
    });

    // Sidebar Listeners
    const hamburgerBtn = document.getElementById('hamburger-menu-btn');
    if(hamburgerBtn) hamburgerBtn.addEventListener('click', () => { document.getElementById('sidebar').classList.toggle('open'); });
    const closeSidebarBtn = document.getElementById('close-sidebar-btn');
    if(closeSidebarBtn) closeSidebarBtn.addEventListener('click', closeSidebar);
    
    // Achievement Listeners
    const achievementsContainer = document.getElementById('achievements-container');
    if(achievementsContainer) {
        achievementsContainer.addEventListener('click', (e) => {
            const card = e.target.closest('.achievement-card-redesign');
            
            // 1. We change the condition to fire as long as a card was clicked
            if (card) { 
                const modal = document.getElementById('achievement-details-modal');
                const modalIcon = document.getElementById('modal-achievement-icon');
                const modalTitle = document.getElementById('modal-achievement-title');
                const modalDesc = document.getElementById('modal-achievement-desc');
                const modalDateEl = document.getElementById('modal-achievement-date');
                
                // 2. Get all data from the card, including the 'unlocked' status
                const { name, desc, icon, color, unlockedDate, unlocked } = card.dataset;
                const isUnlocked = unlocked === 'true'; // Convert string to boolean

                // 3. Populate all the common fields
                modalIcon.className = `text-6xl mb-4 ${isUnlocked ? color : 'text-gray-500'}`; // Use gray color if locked
                modalIcon.innerHTML = `<i class="fas ${icon}"></i>`;
                modalTitle.textContent = name;
                modalDesc.textContent = desc; // This description already contains the unlock criteria
                
                // 4. This is the new logic to show EITHER the date OR the XP reward
                if (isUnlocked) {
                    // It's unlocked: show the date
                        modalDateEl.classList.remove('text-yellow-400', 'font-bold', 'text-lg'); // Remove XP styles
                    if (unlockedDate) {
                        const date = new Date(unlockedDate);
                        modalDateEl.textContent = `Unlocked on: ${date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}`;
                    } else {
                        modalDateEl.textContent = 'Unlocked!';
                  	}
                } else {
                    // It's locked: show the XP reward
                        modalDateEl.classList.add('text-yellow-400', 'font-bold', 'text-lg'); // Add eye-catching styles for XP
                    modalDateEl.textContent = `Reward: ${XP_VALUES.UNLOCK_ACHIEVEMENT.toLocaleString()} XP`;
                }

                modal.classList.remove('hidden');
            }
        });
    }

    const closeAchievementModalBtn = document.getElementById('close-achievement-modal-btn');
    if(closeAchievementModalBtn) {
        closeAchievementModalBtn.addEventListener('click', () => {
            document.getElementById('achievement-details-modal').classList.add('hidden');
        });
    }

	 const closeLevelUpBtn = document.getElementById('close-level-up-modal-btn');
        if (closeLevelUpBtn) {
            closeLevelUpBtn.addEventListener('click', () => {
                const modal = document.getElementById('level-up-modal');
                if (modal) {
                    modal.classList.add('hidden');
                }
            });
        }
    
    setupAchievementFiltering();
    
    // --- All Other Event Listeners ---
    document.getElementById('add-link-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (isSubmittingLink) { console.warn("Preventing duplicate form submission."); return; }
        if (!db || !userId || isAnonymous) { showLinksStatus('Please sign in to manage your links.', 'text-yellow-400'); return; }
        const title = document.getElementById('link-title').value;
        const url = document.getElementById('link-url').value;
        const description = document.getElementById('link-description').value;
        if (!title || !url) { showLinksStatus('Please fill out all required fields.', 'text-red-400'); return; }
        isSubmittingLink = true;
        try {
            if (editingLinkDocId) {
                showLinksStatus('Updating link...', 'text-yellow-400');
                const docRef = doc(db, 'artifacts', safeAppId, 'users', userId, 'helpful_links_data', editingLinkDocId);
                await updateDoc(docRef, { title, url, description });
                showLinksStatus('Link updated successfully!', 'text-green-400');
            } else {
                showLinksStatus('Adding link...', 'text-yellow-400');
                const linksCollectionRef = getUserHelpfulLinksCollectionRef(userId);
                await addDoc(linksCollectionRef, { title, url, description, createdAt: new Date() });
                showLinksStatus('Link added successfully!', 'text-green-400');
				logUserEvent('add_link');
            }
            resetLinksForm();
        } catch (error) {
            console.error("Error during link operation:", error);
            showLinksStatus(`Failed to save link: ${error.message}`, 'text-red-400');
        } finally {
            isSubmittingLink = false;
        }
    });

    document.getElementById('links-search-input').addEventListener('input', (e) => {
        const query = e.target.value;
        renderLinks(query);
    });

    document.getElementById('cancel-button').addEventListener('click', () => { resetLinksForm(); });
    
    document.getElementById('user-links-list').addEventListener('click', (event) => {
        if (isAnonymous) return;
        const button = event.target.closest('.meatballs-button');
        const editBtn = event.target.closest('.edit-link-btn');
        const deleteBtn = event.target.closest('.delete-link-btn');
        if (button) {
            event.stopPropagation();
            const parentDiv = button.closest('[data-doc-id]');
            const menu = parentDiv.querySelector('.meatballs-menu');
            if (menu) {
                const isHidden = menu.classList.contains('hidden');
                document.querySelectorAll('.meatballs-menu').forEach(m => m.classList.add('hidden'));
                if (isHidden) { menu.classList.remove('hidden'); openMenuId = parentDiv.dataset.docId; } else { openMenuId = null; }
            }
        } else if (editBtn) {
            event.stopPropagation();
            const parentDiv = editBtn.closest('[data-doc-id]');
            if (parentDiv) {
                const { docId, title, url, description } = parentDiv.dataset;
                editLink(docId, title, url, description);
                const menu = parentDiv.querySelector('.meatballs-menu');
                if (menu) menu.classList.add('hidden');
                openMenuId = null;
            }
        } else if (deleteBtn) {
            event.stopPropagation();
            const parentDiv = deleteBtn.closest('[data-doc-id]');
            if (parentDiv) {
                deleteLink(parentDiv.dataset.docId);
                const menu = parentDiv.querySelector('.meatballs-menu');
                if (menu) menu.classList.add('hidden');
                openMenuId = null;
            }
        }
    });

    document.addEventListener('click', (event) => {
        const categoryActionsMenu = document.getElementById('category-actions-menu');
        const categoryActionsBtn = document.getElementById('category-actions-btn');
        const isClickInsideCategoryActions = categoryActionsBtn && (categoryActionsBtn.contains(event.target) || categoryActionsMenu.contains(event.target));
        const isClickInsideMeatballsMenu = event.target.closest('.meatballs-menu') || event.target.closest('.meatballs-button');

        if (!isClickInsideCategoryActions && categoryActionsMenu) {
            categoryActionsMenu.classList.add('hidden', 'scale-95', 'opacity-0');
            if(categoryActionsBtn) categoryActionsBtn.classList.remove('active');
        }
        if (!isClickInsideMeatballsMenu) {
            document.querySelectorAll('.meatballs-menu').forEach(m => m.classList.add('hidden'));
            openMenuId = null;
        }
    });
} 
    document.addEventListener('click', (event) => {
        const isClickInsideCategoryActions = event.target.closest('#category-actions-menu') || event.target.closest('#category-actions-btn');
        const isClickInsideMeatballsMenu = event.target.closest('.meatballs-menu') || event.target.closest('.meatballs-button');
        const categoryActionsMenu = document.getElementById('category-actions-menu');
        const categoryActionsBtn = document.getElementById('category-actions-btn');
        if (!categoryActionsMenu.contains(event.target) && !categoryActionsBtn.contains(event.target)) {
            categoryActionsMenu.classList.add('hidden', 'scale-95', 'opacity-0');
            categoryActionsBtn.classList.remove('active');
        }
        if (!isClickInsideMeatballsMenu) {
            document.querySelectorAll('.meatballs-menu').forEach(m => m.classList.add('hidden'));
            openMenuId = null;
        }
    });	


    document.getElementById('close-login-popup-btn').addEventListener('click', async () => {
        document.getElementById('login-popup-modal').classList.remove('show');
        document.getElementById('login-popup-modal').classList.add('hidden');
        if (userId) {
            const userDocRef = getUserRootDocRef(userId);
            try { await setDoc(userDocRef, { hasSeenLoginPrompt: true }, { merge: true }); } catch (error) { console.error("Error setting hasSeenLoginPrompt flag:", error); }
        }
    });
    document.getElementById('login-popup-btn').addEventListener('click', async () => {
        document.getElementById('login-popup-modal').classList.remove('show');
        document.getElementById('login-popup-modal').classList.add('hidden');
        if (userId) {
            const userDocRef = getUserRootDocRef(userId);
            try { await setDoc(userDocRef, { hasSeenLoginPrompt: true }, { merge: true }); } catch (error) { console.error("Error setting hasSeenLoginPrompt flag:", error); }
        }
        try { const provider = new GoogleAuthProvider(); await signInWithPopup(auth, provider); showMessage("Signed in with Google!"); } catch (error) { console.error("Google sign-in failed", error); showMessage("Google sign-in failed. Please try again.", 'error'); }
    });

		
// --- Modern Tutorial UI Event Listeners ---
    document.getElementById('tooltip-next-btn').addEventListener('click', () => {
        if (currentTutorialStep < TUTORIAL_CONFIG.length - 1) {
            showTutorialStep(currentTutorialStep + 1);
        } else {
            closeTutorial();
        }
    });

    document.getElementById('tooltip-back-btn').addEventListener('click', () => {
        if (currentTutorialStep > 0) {
            showTutorialStep(currentTutorialStep - 1);
        }
    });

    document.getElementById('tooltip-skip-btn').addEventListener('click', closeTutorial);



document.getElementById('stats-tab-btn').addEventListener('click', (e) => {
    document.getElementById('stats-panel').classList.remove('hidden');
    document.getElementById('achievements-panel').classList.add('hidden');
    
    e.target.classList.add('text-white', 'border-blue-500');
    e.target.classList.remove('text-gray-400', 'border-transparent');
    document.getElementById('achievements-tab-btn').classList.add('text-gray-400', 'border-transparent');
    document.getElementById('achievements-tab-btn').classList.remove('text-white', 'border-blue-500');
});

document.getElementById('achievements-tab-btn').addEventListener('click', (e) => {
    document.getElementById('achievements-panel').classList.remove('hidden');
    document.getElementById('stats-panel').classList.add('hidden');

    e.target.classList.add('text-white', 'border-blue-500');
    e.target.classList.remove('text-gray-400', 'border-transparent');
    document.getElementById('stats-tab-btn').classList.add('text-gray-400', 'border-transparent');
    document.getElementById('stats-tab-btn').classList.remove('text-white', 'border-blue-500');
});
		
	document.getElementById('show-tutorial-btn').addEventListener('click', async () => {
        if (userId && !isAnonymous) {
            // Reset the flag in DB if they want to see it again
            try { await setDoc(getUserRootDocRef(userId), { tutorialSeen: false }, { merge: true }); } catch (e) {}
            showTutorialStep(0); 
        } else {
            showMessage("Please sign in to view the tutorial.", 'error');
        }
    });

    document.getElementById('theme-toggle-btn-settings').addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        localStorage.setItem('theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
        const icon = document.getElementById('theme-toggle-btn-settings').querySelector('i');
        icon.className = document.body.classList.contains('light-mode') ? 'fas fa-sun mr-2' : 'fas fa-moon mr-2';
        updateDarkModeStreak();
        
        if (currentPage === 'my-stats') {
            renderAdvancedStats();
        }
        
        // Re-render Canned Responses to apply light mode card colors
        if (currentPage === 'canned-responses') {
            renderResponses(document.getElementById('search-input').value);
        }
        
        // Re-render Workshop feed if the modal happens to be open
        const workshopModal = document.getElementById('workshop-modal');
        if (workshopModal && !workshopModal.classList.contains('hidden')) {
            const searchInput = document.getElementById('workshop-search-input');
            renderWorkshopFeed(searchInput ? searchInput.value : '');
        }
    });

document.getElementById('category-list').addEventListener('click', (e) => {
        const button = e.target.closest('.category-item');
        if (button) {
            const newCategory = button.dataset.category;
            if (newCategory !== activeCategory) {
                activeCategory = newCategory;
                
                // 1. Instantly show visual feedback so the app feels snappy
                document.querySelectorAll('.category-item').forEach(b => {
                    b.classList.remove('border-2', 'border-white', 'border-gray-900', 'scale-105');
                });
                button.classList.add('border-2', document.body.classList.contains('light-mode') ? 'border-gray-900' : 'border-white');
                
                // 2. Put the animated skeleton loader in the main area
                document.getElementById('responses-list').innerHTML = `
                    <div class="animate-pulse flex flex-col space-y-4 p-6 border border-gray-700/50 rounded-xl bg-gray-800/30 w-full">
                        <div class="h-5 bg-gray-700 rounded w-1/4 mb-2"></div>
                        <div class="h-3 bg-gray-700 rounded w-full"></div>
                        <div class="h-3 bg-gray-700 rounded w-5/6"></div>
                        <div class="h-3 bg-gray-700 rounded w-4/6"></div>
                        <div class="flex justify-between items-center mt-4 pt-4 border-t border-gray-700/50">
                            <div class="h-8 bg-green-500/20 rounded-lg w-24"></div>
                            <div class="flex gap-2"><div class="h-8 w-8 bg-gray-700 rounded-lg"></div><div class="h-8 w-8 bg-gray-700 rounded-lg"></div></div>
                        </div>
                    </div>
                    <div class="animate-pulse flex flex-col space-y-4 p-6 border border-gray-700/50 rounded-xl bg-gray-800/30 w-full opacity-70">
                        <div class="h-5 bg-gray-700 rounded w-1/3 mb-2"></div>
                        <div class="h-3 bg-gray-700 rounded w-11/12"></div>
                        <div class="h-3 bg-gray-700 rounded w-3/4"></div>
                        <div class="flex justify-between items-center mt-4 pt-4 border-t border-gray-700/50">
                            <div class="h-8 bg-green-500/20 rounded-lg w-24"></div>
                            <div class="flex gap-2"><div class="h-8 w-8 bg-gray-700 rounded-lg"></div><div class="h-8 w-8 bg-gray-700 rounded-lg"></div></div>
                        </div>
                    </div>
                `;
                
                // 3. Defer the heavy AI math to let the UI paint first
                setTimeout(() => {
                    renderCategories();
                }, 50); 
            }
        }
    });
    document.getElementById('responses-list').addEventListener('click', (e) => {
        const copyBtn = e.target.closest('.copy-btn');
        const editBtn = e.target.closest('.edit-btn');
        const deleteBtn = e.target.closest('.delete-btn');
        const pinBtn = e.target.closest('.pin-btn');
        const publishBtn = e.target.closest('.publish-btn'); 
        if (copyBtn) {
            const responseItem = copyBtn.closest('.response-item');
            const textToCopy = responseItem.querySelector('.response-text-display').textContent;
			const responseId = responseItem.dataset.id;
		    const categoryName = responseItem.dataset.category;
		    processAndCopy(textToCopy, responseId, categoryName);
		
		}
    if (publishBtn) {
            const responseItem = publishBtn.closest('.response-item');
            const id = responseItem.dataset.id;
            const category = responseItem.dataset.category;
            const responseData = categories[category].responses.find(r => r.id === id);

            if (responseData) {
                // Update the text in the modal to show the name of what they are publishing
                document.getElementById('publish-response-name').textContent = `"${responseData.label || 'this response'}"`;
                
                // Secretly attach the ID and Category to the Confirm button so it knows WHAT to publish later
                const confirmBtn = document.getElementById('confirm-publish-btn');
                confirmBtn.dataset.id = responseData.id;
                confirmBtn.dataset.category = category;
                
                // Show our custom modal
                document.getElementById('publish-confirm-modal').classList.remove('hidden');
            }
        }
        if (editBtn) {
            const responseItem = editBtn.closest('.response-item');
            const id = responseItem.dataset.id;
            const category = responseItem.dataset.category;
            const responseData = categories[category].responses.find(r => r.id === id);
            if (responseData) {
                document.getElementById('edit-response-label').value = responseData.label || '';
                document.getElementById('edit-response-text').value = responseData.text;
                document.getElementById('edit-response-modal').dataset.originalId = responseData.id;
                document.getElementById('edit-response-modal').dataset.originalCategory = category;
                const editCategorySelect = document.getElementById('edit-category-select');
                editCategorySelect.innerHTML = '';
                const categoryNames = Object.keys(categories);
                categoryNames.forEach(catName => {
                    const option = document.createElement('option');
                    option.value = catName;
                    option.textContent = catName;
                    if (catName === category) option.selected = true;
                    editCategorySelect.appendChild(option);
                });
                document.getElementById('edit-response-modal').classList.remove('hidden');
            }
        }
        if (deleteBtn) {
            const responseItem = deleteBtn.closest('.response-item');
            responseToDeleteId = responseItem.dataset.id;
            const category = responseItem.dataset.category;
            document.getElementById('delete-modal').dataset.category = category;
            document.getElementById('delete-modal').classList.remove('hidden');
        }
		if (pinBtn) {
            const responseItem = pinBtn.closest('.response-item');
            const id = responseItem.dataset.id;
            const category = responseItem.dataset.category;
            
            // --- FIX: Physically move the item to the top of the array when pinned ---
            const categoryObj = categories[category];
            if (categoryObj && categoryObj.responses) {
                const index = categoryObj.responses.findIndex(r => r.id === id);
                if (index > -1) {
                    const responseData = categoryObj.responses[index];
                    responseData.isPinned = !responseData.isPinned;
                    
                    if (responseData.isPinned) {
                        if (typeof firstSignIn !== 'undefined') {
                            logUserEvent('pin_response', { responseId: id }, firstSignIn); 
                        }
                        
                        // Physically move to the front of the list
                        categoryObj.responses.splice(index, 1);
                        categoryObj.responses.unshift(responseData);
                    }
                    saveToFirestore(categories);
                }
            }
        }
    });
    document.getElementById('open-add-response-modal-btn').addEventListener('click', () => {
        document.getElementById('new-response-modal').classList.remove('hidden');
        document.getElementById('new-response-label').value = '';
        document.getElementById('new-response-text').value = '';
        const newResponseCategorySelect = document.getElementById('new-response-category');
        newResponseCategorySelect.innerHTML = '';
        const categoryNames = Object.keys(categories);
        categoryNames.forEach(catName => {
            const option = document.createElement('option');
            option.value = catName;
            option.textContent = catName;
            if (catName === activeCategory) option.selected = true;
            newResponseCategorySelect.appendChild(option);
        });
    });
    document.getElementById('cancel-new-response-btn').addEventListener('click', () => { document.getElementById('new-response-modal').classList.add('hidden'); });
    document.getElementById('save-new-response-btn').addEventListener('click', () => {
        const label = document.getElementById('new-response-label').value;
        const text = document.getElementById('new-response-text').value;
        const category = document.getElementById('new-response-category').value;
        if (text.trim() !== '') { addResponse(text, label, category); document.getElementById('new-response-modal').classList.add('hidden');logUserEvent('create_response'); awardXP(XP_VALUES.CREATE_RESPONSE); } else { showMessage("Response text cannot be empty.", 'error'); }
    });

    // Cancel Workshop Publish
    document.getElementById('cancel-publish-btn').addEventListener('click', () => {
        document.getElementById('publish-confirm-modal').classList.add('hidden');
    });

    // Confirm Workshop Publish
    document.getElementById('confirm-publish-btn').addEventListener('click', async (e) => {
        const btn = e.target.closest('button');
        const id = btn.dataset.id;
        const category = btn.dataset.category;
        const responseData = categories[category].responses.find(r => r.id === id);
        
        if (responseData) {
            // 1. Move these OUTSIDE the try block so the catch block can see them!
            const originalHtml = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> <span>Publishing...</span>';
            btn.disabled = true;

            try {
                // 2. Upload to Firebase
                const workshopRef = collection(db, 'artifacts', safeAppId, 'workshop_responses');
                
                // Calculate exact expiration date (21 days from this exact millisecond)
                const expireDate = new Date();
                expireDate.setDate(expireDate.getDate() + 21);

                await addDoc(workshopRef, {
                    originalId: responseData.id,
                    authorName: userName,
                    authorId: userId,
                    text: responseData.text,
                    label: responseData.label || 'Untitled',
                    category: category,
                    upvotes: 0,
                    downvotes: 0,
                    voters: {}, 
                    createdAt: serverTimestamp(),
                    expireAt: expireDate // <-- THIS IS THE NEW MAGIC FIELD!
                });
                
                // 3. Success Feedback
                showMessage("Published to The Workshop!", "success");
                logUserEvent('publish_to_workshop');
                await awardXP(100, 'Workshop Contribution');
                
                // 4. Reset and Close Modal
                document.getElementById('publish-confirm-modal').classList.add('hidden');
                btn.innerHTML = originalHtml;
                btn.disabled = false;
                
            } catch (error) {
                console.error("Error publishing to workshop:", error);
                showMessage("Failed to publish. Check connection.", "error");
                
                // Now this will successfully reset the button if an error happens!
                btn.innerHTML = originalHtml; 
                btn.disabled = false;
            }
        }
    });

    document.getElementById('cancel-edit-btn').addEventListener('click', () => { document.getElementById('edit-response-modal').classList.add('hidden'); currentEditingId = null; });
    document.getElementById('save-edit-btn').addEventListener('click', () => {
        const id = document.getElementById('edit-response-modal').dataset.originalId;
        const oldCategory = document.getElementById('edit-response-modal').dataset.originalCategory;
        const newLabel = document.getElementById('edit-response-label').value;
        const newText = document.getElementById('edit-response-text').value;
        const newCategory = document.getElementById('edit-category-select').value;
        if (newText.trim() !== '') { updateResponse(id, newText, newLabel, newCategory, oldCategory); document.getElementById('edit-response-modal').classList.add('hidden'); currentEditingId = null;logUserEvent('edit_response', {}, firstSignIn); } else { showMessage("Response text cannot be empty.", 'error'); }
    });
    document.getElementById('delete-confirm-btn').addEventListener('click', () => {
        const category = document.getElementById('delete-modal').dataset.category;
        deleteResponse(responseToDeleteId, category);
        document.getElementById('delete-modal').classList.add('hidden');
		logUserEvent('delete_response', {}, firstSignIn);
    });
    document.getElementById('delete-cancel-btn').addEventListener('click', () => { document.getElementById('delete-modal').classList.add('hidden'); responseToDeleteId = null; });
// PERFORMANCE UPGRADE: Search Bar Debounce
// PERFORMANCE UPGRADE: Search Bar Debounce
    let searchTimeout;
    document.getElementById('search-input').addEventListener('input', (e) => {
        clearTimeout(searchTimeout); 
        searchTimeout = setTimeout(() => {
            renderResponses(e.target.value); 
        }, 300); // Increased to 300ms to allow smooth rapid typing
    });   
	document.getElementById('add-category-btn').addEventListener('click', () => { document.getElementById('add-category-modal').classList.remove('hidden'); document.getElementById('add-category-input').focus(); });
    document.getElementById('cancel-add-category-btn').addEventListener('click', () => { document.getElementById('add-category-modal').classList.add('hidden'); document.getElementById('add-category-input').value = ''; });
    document.getElementById('confirm-add-category-btn').addEventListener('click', async () => {
        const newCategoryName = document.getElementById('add-category-input').value.trim();
        if (newCategoryName && !categories[newCategoryName]) {
            const updatedCategories = JSON.parse(JSON.stringify(categories));
            updatedCategories[newCategoryName] = { color: '#60a5fa', responses: [] };
            saveToFirestore(updatedCategories);
            activeCategory = newCategoryName;
            document.getElementById('add-category-modal').classList.add('hidden');
            document.getElementById('add-category-input').value = '';
            showMessage("Category created successfully!");
			logUserEvent('create_category', {}, firstSignIn);
			awardXP(XP_VALUES.CREATE_CATEGORY);
        } else if (categories[newCategoryName]) {
            showMessage("Category already exists.", 'error');
        }
    });
    document.getElementById('category-actions-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        const categoryActionsMenu = document.getElementById('category-actions-menu');
        categoryActionsMenu.classList.toggle('hidden');
        categoryActionsMenu.classList.toggle('scale-95');
        categoryActionsMenu.classList.toggle('opacity-0');
        document.getElementById('category-actions-btn').classList.toggle('active');
    });
    document.getElementById('rename-category-btn').addEventListener('click', () => {
        const editCategoryModal = document.getElementById('edit-category-modal');
        const editCategoryInput = document.getElementById('edit-category-input');
        const categoryActionsMenu = document.getElementById('category-actions-menu');
        editCategoryModal.classList.remove('hidden');
        editCategoryInput.value = activeCategory;
        categoryToEdit = activeCategory;
        categoryActionsMenu.classList.add('hidden');
    });
    document.getElementById('cancel-edit-category-btn').addEventListener('click', () => { document.getElementById('edit-category-modal').classList.add('hidden'); });
    document.getElementById('confirm-edit-category-btn').addEventListener('click', () => {
        const newName = document.getElementById('edit-category-input').value.trim();
        if (newName && newName !== categoryToEdit) {
            const updatedCategories = JSON.parse(JSON.stringify(categories));
            if (updatedCategories[newName]) { showMessage("A category with that name already exists.", 'error'); return; }
            const oldCategoryData = updatedCategories[categoryToEdit];
            delete updatedCategories[categoryToEdit];
            updatedCategories[newName] = oldCategoryData;
            saveToFirestore(updatedCategories);
            activeCategory = newName;
            document.getElementById('edit-category-modal').classList.add('hidden');
            showMessage("Category renamed successfully!");
        } else { document.getElementById('edit-category-modal').classList.add('hidden'); }
    });
    document.getElementById('delete-category-btn').addEventListener('click', () => { document.getElementById('delete-category-modal').classList.remove('hidden'); document.getElementById('category-actions-menu').classList.add('hidden'); });
    document.getElementById('cancel-delete-category-btn').addEventListener('click', () => { document.getElementById('delete-category-modal').classList.add('hidden'); });
    document.getElementById('confirm-delete-category-btn').addEventListener('click', () => {
        const updatedCategories = JSON.parse(JSON.stringify(categories));
        delete updatedCategories[activeCategory];
        const categoryNames = Object.keys(updatedCategories);
        activeCategory = categoryNames.length > 0 ? categoryNames[0] : '';
        saveToFirestore(updatedCategories);
        document.getElementById('delete-category-modal').classList.add('hidden');
        showMessage("Category deleted successfully!");
    });
    document.getElementById('change-color-btn').addEventListener('click', () => {
        const colorPickerModal = document.getElementById('color-picker-modal');
        const colorInput = document.getElementById('color-input');
        colorPickerModal.classList.remove('hidden');
        const currentColor = categories[activeCategory]?.color || '#60a5fa';
        colorInput.value = currentColor;
        document.getElementById('category-actions-menu').classList.add('hidden');
    });
    document.getElementById('close-color-picker-btn').addEventListener('click', () => { document.getElementById('color-picker-modal').classList.add('hidden'); });
    document.getElementById('save-color-btn').addEventListener('click', () => {
        const newColor = document.getElementById('color-input').value;
        const updatedCategories = JSON.parse(JSON.stringify(categories));
        if (updatedCategories[activeCategory]) {
            updatedCategories[activeCategory].color = newColor;
            saveToFirestore(updatedCategories);
            document.getElementById('color-picker-modal').classList.add('hidden');
            showMessage("Color updated successfully!");
			logUserEvent('change_color', {}, firstSignIn);
        }
    });
    document.getElementById('input-text-fedex').addEventListener('input', extractAndDisplayNumbers);
    document.getElementById('clear-button-fedex').addEventListener('click', () => {
        document.getElementById('input-text-fedex').value = '';
        extractAndDisplayNumbers();
        showMessage('Input cleared!', 'success');
    });
document.getElementById('copy-button-fedex').addEventListener('click', async () => {
    const text = document.getElementById('input-text-fedex').value;
    const fedexRegex = /(?:78\d{10}|79\d{10}|80\d{10}|81\d{10}|82\d{10}|(?:96\d{20}|96\d{32}|\d{15}|\d{12}))/g;
    const matches = text.match(fedexRegex) || [];
    
    if (matches.length > 0) {
        const uniqueNumbers = [...new Set(matches)];

        await logUserEvent('extract_tracking', { count: uniqueNumbers.length });
        const numbersToCopy = uniqueNumbers.join('\t');
        copyToClipboard(numbersToCopy);
        await awardXP(XP_VALUES.FEDEX_TRACKING, 'FedEx Tracked');

        // Refresh Challenges UI
        const eventsCollectionRef = getUserEventsCollectionRef(userId);
        const snapshot = await getDocs(query(eventsCollectionRef));
        const events = snapshot.docs.map(doc => doc.data());
        
        await renderChallenges(events);
        await renderChallengeTracker(events);

        const numbersForUrl = uniqueNumbers.join(',');
        const encodedNumbers = encodeURIComponent(numbersForUrl);
        const fedexUrl = `https://www.fedex.com/en-us/tracking.html?tracknumbers=${encodedNumbers}`;
        window.open(fedexUrl, '_blank');
        
        // ▼▼▼ TRIGGER THE NEW FEATURE ▼▼▼
        showShippingSuggestions(); 
        
    } else {
        showMessage('No tracking numbers to copy.', 'error');
    }
});
    document.getElementById('import-export-btn-settings').addEventListener('click', () => { document.getElementById('import-export-modal').classList.remove('hidden'); });
    document.getElementById('close-import-export-modal-btn').addEventListener('click', () => { document.getElementById('import-export-modal').classList.add('hidden'); });
    document.getElementById('export-btn').addEventListener('click', () => { exportData(); });
    document.getElementById('import-file-input').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) importData(file);
    });

document.getElementById('confirm-placeholder-btn').addEventListener('click', () => {
    // 1. Capture inputs
    const inputs = document.getElementById('placeholder-inputs').querySelectorAll('input[type="text"]');
    const userValues = {};
    
    // Get all chips currently visible on screen (these are the ones we suggested)
    const shownChips = Array.from(document.querySelectorAll('.suggestion-chip'));

    inputs.forEach(input => {
        const key = input.dataset.placeholder;
        if(key) {
            const finalValue = input.value.trim();
            userValues[key] = finalValue;

            if (finalValue) {
                // A. SAVE/BOOST the value they actually used
                updateSmartHistory(key, finalValue, currentResponseToCopyCategory, 'use');

                // B. PUNISH the values they ignored
                // Find chips for THIS specific key that were NOT selected
                shownChips.forEach(chip => {
                    if (chip.dataset.key === key && chip.dataset.value !== finalValue) {
                        updateSmartHistory(key, chip.dataset.value, currentResponseToCopyCategory, 'ignore');
                    }
                });
            }
        }
    });

    const finalContent = replacePlaceholders(currentTextToCopy, userValues);
    
    // 2. UPDATE UI IMMEDIATELY
    document.getElementById('placeholder-modal').classList.add('hidden');

    // Restore the modern tutorial UI if it was active
    if (isTutorialActive) {
        document.getElementById('modern-tooltip').classList.remove('hidden');
        document.getElementById('tutorial-spotlight').classList.add('active');
    }

    // 3. Run Background Logic (Safe Mode)
    try {
        copyToClipboard(finalContent, currentResponseToCopyId, currentResponseToCopyCategory);
    } catch (error) {
        console.warn("Background task failed (copy/insights), but UI was handled:", error);
    }
});

document.getElementById('cancel-placeholder-btn').addEventListener('click', () => {
    document.getElementById('placeholder-modal').classList.add('hidden');
    
    // Restore the modern tutorial UI if it was active
    if (isTutorialActive) {
        document.getElementById('modern-tooltip').classList.remove('hidden');
        document.getElementById('tutorial-spotlight').classList.add('active');
    } 
});

	
    document.getElementById('sign-in-btn-settings').addEventListener('click', async () => {
        try { const provider = new GoogleAuthProvider(); await signInWithPopup(auth, provider); showMessage("Signed in with Google!"); } catch (error) { console.error("Google sign-in failed", error); showMessage("Google sign-in failed. Please try again.", 'error'); }
    });
    document.getElementById('sign-out-btn-settings').addEventListener('click', async () => {
        try { await signOut(auth); showMessage("Signed out successfully!"); await signInAnonymously(auth); } catch (error) { console.error("Sign out failed", error); showMessage("Sign out failed. Please try again.", 'error'); }
    });
document.getElementById('check-updates-btn-settings').addEventListener('click', async () => {
    if (isAnonymous) {
        showMessage("Please sign in to check for updates.", "error");
        return;
    }

    const updateModal = document.getElementById('update-modal');
    const updateModalTitle = document.getElementById('update-modal-title');
    const updateModalMessage = document.getElementById('update-modal-message');
    const updateModalButtons = document.getElementById('update-modal-buttons');

    // Show the modal immediately
    updateModal.classList.remove('hidden');
    updateModalTitle.textContent = "Checking for Updates...";
    updateModalMessage.textContent = "Comparing your data with the latest blueprint...";
    updateModalButtons.classList.add('hidden');

    try {
        // 1. Get the latest blueprint from your code
        const blueprint = await getCannedResponsesBlueprint();
        
        // 2. Make a deep copy of the user's current data to modify it safely
        const updatedCategories = JSON.parse(JSON.stringify(categories));
        
        let changesMade = false;
        let updatedResponsesCount = 0;
        let newResponsesCount = 0;
        let newCategoryCount = 0;

        // 3. Loop through every category and response in the blueprint
        for (const blueprintCategoryName in blueprint) {
            const blueprintCategory = blueprint[blueprintCategoryName];

            // Check if the category exists for the user; if not, add it
            if (!updatedCategories[blueprintCategoryName]) {
                updatedCategories[blueprintCategoryName] = {
                    color: blueprintCategory.color,
                    responses: [] // Start with an empty array
                };
                newCategoryCount++;
                changesMade = true;
            }

            for (const blueprintResponse of blueprintCategory.responses) {
                // Find the user's version of this response
                const userResponse = updatedCategories[blueprintCategoryName].responses.find(r => r.id === blueprintResponse.id);

                if (userResponse) {
                    // Response exists, check its version
                    // (Use 0 as a default if the user's response doesn't have a version yet)
                    const userVersion = userResponse.version || 0;
                    if (blueprintResponse.version > userVersion) {
                        // Blueprint is newer! Overwrite the user's response text and update their version.
                        userResponse.text = blueprintResponse.text;
                        userResponse.label = blueprintResponse.label;
                        userResponse.version = blueprintResponse.version; // Crucial!
                        updatedResponsesCount++;
                        changesMade = true;
                    }
                } else {
                    // Response does not exist for the user, so add it
                    updatedCategories[blueprintCategoryName].responses.push(blueprintResponse);
                    newResponsesCount++;
                    changesMade = true;
                }
            }
        }
        
        // 4. If any changes were made, save the updated data to Firestore
        if (changesMade) {
            await saveToFirestore(updatedCategories);
			const userDocRef = getUserRootDocRef(userId);
            await setDoc(userDocRef, { syncedBlueprintVersion: masterBlueprintVersion }, { merge: true });
            showUpdateNotification(false);
            updateModalTitle.textContent = "Updates Applied! ✅";
            updateModalMessage.innerHTML = `
                <p>Your data has been successfully updated.</p>
                <ul class="list-disc list-inside mt-2 text-left">
                    ${newCategoryCount > 0 ? `<li>${newCategoryCount} new categories added.</li>` : ''}
                    ${newResponsesCount > 0 ? `<li>${newResponsesCount} new responses added.</li>` : ''}
                    ${updatedResponsesCount > 0 ? `<li>${updatedResponsesCount} existing responses updated.</li>` : ''}
                </ul>
            `;
        } else {
			const userDocRef = getUserRootDocRef(userId);
            await setDoc(userDocRef, { syncedBlueprintVersion: masterBlueprintVersion }, { merge: true });
            showUpdateNotification(false);
            updateModalTitle.textContent = "You're Up to Date! 👍";
            updateModalMessage.textContent = "No new updates were found.";
        }

    } catch (error) {
        console.error("Error checking for updates:", error);
        updateModalTitle.textContent = "Update Failed ❌";
        updateModalMessage.textContent = "An error occurred. Please try again later.";
    } finally {
        // Always show the close button at the end
        updateModalButtons.classList.remove('hidden');
    }
});
    document.getElementById('close-update-btn').addEventListener('click', () => { document.getElementById('update-modal').classList.add('hidden'); });

	document.getElementById('leaderboard-container').addEventListener('click', (e) => {
	    // Check for either the list entry OR the podium card
	    const entry = e.target.closest('.leaderboard-entry') || e.target.closest('.podium-card');
	    
	    if (entry && entry.dataset.userid) {
	        showUserProfile(entry.dataset.userid);
	    }
	});

    document.getElementById('close-profile-modal-btn').addEventListener('click', () => {
        document.getElementById('profile-modal').classList.add('hidden');
    });	



// --- Core Application Logic (Auth and Data Sync) ---
onAuthStateChanged(auth, async (user) => {
	if (currentPage === 'canned-responses') {
        showSkeletonLoader();
    }
    if (cannedResponsesUnsubscribe) { cannedResponsesUnsubscribe(); cannedResponsesUnsubscribe = null; }
    if (helpfulLinksUnsubscribe) { helpfulLinksUnsubscribe(); helpfulLinksUnsubscribe = null; }
    if (user) {
        userId = user.uid;
		checkAdminStatus(user);
        loadGlobalKnowledge();
		initSmartClipboard();
		trackedChallengeId = localStorage.getItem('trackedChallengeId');
		isAnonymous = user.isAnonymous;
        const displayName = user.displayName || user.email || 'User';
        
        // Ensure the first letter of the name is capitalized
        let rawName = displayName.split(' ')[0].split('@')[0];
        userName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

        // --- NEW: Update Sidebar Greeting & Name ---
        const avatarEl = document.getElementById('sidebar-user-avatar');
        const nameEl = document.getElementById('sidebar-user-name');
        const greetingEl = document.getElementById('sidebar-greeting');

        if (avatarEl && nameEl && greetingEl && !isAnonymous) {
            // Set Initial
            avatarEl.textContent = userName.charAt(0);
            // Set Name
            nameEl.textContent = userName;
            
            // Calculate Time of Day
            const hour = new Date().getHours();
            let greeting = 'Good evening';
            if (hour < 12) greeting = 'Good morning';
            else if (hour < 18) greeting = 'Good afternoon';
            
            // Set Greeting
            greetingEl.textContent = greeting;
        } else if (isAnonymous) {
            if (nameEl) nameEl.textContent = "Guest";
            if (greetingEl) greetingEl.textContent = "Sign in to save data";
        }
        const linksUserInfo = document.getElementById('links-user-info');
        if (linksUserInfo) linksUserInfo.textContent = `User ID: ${userId}`;
        defaultLinks = await getHelpfulLinksBlueprint();
        renderStaticLinks();
        if (!isAnonymous) {
            const linksCollectionRef = getUserHelpfulLinksCollectionRef(userId);
            helpfulLinksUnsubscribe = onSnapshot(linksCollectionRef, (querySnapshot) => {
                userLinks = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                renderUserLinks();
            }, (error) => {
                console.error("Error listening for user links:", error);
                showMessage("Error loading your links. Please check your Firebase permissions.", 'error');
            });
        }
        if (isAnonymous) {
            const userDocRef = getUserRootDocRef(userId);
            try {
                const userDoc = await getDoc(userDocRef);
                const hasSeenPrompt = userDoc.exists() && userDoc.data().hasSeenLoginPrompt;
                if (!hasSeenPrompt) { document.getElementById('login-popup-modal').classList.remove('hidden'); setTimeout(() => { document.getElementById('login-popup-modal').classList.add('show'); }, 10); } else { document.getElementById('login-popup-modal').classList.add('hidden'); }
            } catch (error) {
                console.error("Error fetching user data for login prompt:", error);
                document.getElementById('login-popup-modal').classList.remove('hidden');
                setTimeout(() => { document.getElementById('login-popup-modal').classList.add('show'); }, 10);
            }
            categories = await getCannedResponsesBlueprint();
            if (Object.keys(categories).length > 0) {
                const existingCategoryNames = Object.keys(categories);
                if (!existingCategoryNames.includes(activeCategory)) { activeCategory = existingCategoryNames[0]; }
            }
			isDataLoaded = true;
            renderContent();
        } else {
            document.getElementById('login-popup-modal').classList.add('hidden');
            const userDocRef = getUserRootDocRef(userId);
			await updateUserLeaderboardEntry();
            const userDoc = await getDoc(userDocRef);
			const userData = userDoc.exists() ? userDoc.data() : {};
            firstSignIn = userDoc.exists() && userDoc.data().firstSignIn ? userDoc.data().firstSignIn.toDate() : null;

            // We removed the "await" commands so the website doesn't freeze while loading!
			if (!userData.statsBackfilled) backfillUserStats(userId);
			if (!userData.activeDaysBackfilled) backfillActiveDays(userId);
			
			checkAndDistributeRewards(); 
			checkForGlobalAlerts(userId);
			
			if (!userData.statsRecalculated) recalculateCurrentPeriodStats(userId);
			calculateAndSaveUserRecords(userId);
			
            if (!userData.firstSignIn) {
                const creationTime = user.metadata.creationTime; 
                firstSignIn = new Date(creationTime);
                await setDoc(userDocRef, { firstSignIn: firstSignIn, xp: 0 }, { merge: true });
                console.log(`Initialized 'firstSignIn' and 'xp' for user ${userId}`);
            } else {
                firstSignIn = userData.firstSignIn.toDate();
            }

            // --- NEW: One-Time XP Backfilling Script ---
            if (userData && userData.achievementsData && !userData.xpMigrated) {
                const unlockedAchievementsCount = Object.keys(userData.achievementsData).length;
                if (unlockedAchievementsCount > 0) {
                    const earnedXp = unlockedAchievementsCount * XP_VALUES.UNLOCK_ACHIEVEMENT;
                    const currentXp = userData.xp || 0;
                    const newTotalXp = currentXp + earnedXp;

                    await setDoc(userDocRef, {
                        xp: newTotalXp,
                        xpMigrated: true // Set the flag to prevent this from running again
                    }, { merge: true });
                    
                    console.log(`Migrated ${earnedXp} XP for ${unlockedAchievementsCount} past achievements for user ${userId}.`);
                    showMessage("Your past achievements have been credited with XP!", "success");
                } else {
                     await setDoc(userDocRef, { xpMigrated: true }, { merge: true });
                }
            }
            // --- END of New Script ---

			const tutorialSeen = userDoc.exists() && userDoc.data().tutorialSeen;
            if (!tutorialSeen) {
                showTutorialStep(0);
            }
			await checkForUpdatesOnLoad();

            // START THE WORKSHOP LISTENER
            const workshopRef = collection(db, 'artifacts', safeAppId, 'workshop_responses');
            
            workshopUnsubscribe = onSnapshot(query(workshopRef, orderBy('createdAt', 'desc')), (snapshot) => {
                const now = Date.now();
                const twentyOneDaysAgo = now - (21 * 24 * 60 * 60 * 1000);
                
                workshopResponsesCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter(res => {
                        // Keep items that don't have a timestamp yet (pending writes)
                        if (!res.createdAt || typeof res.createdAt.toMillis !== 'function') return true;
                        return res.createdAt.toMillis() > twentyOneDaysAgo;
                    });
                
                // --- NEW: Calculate the Red Notification Badge ---
                if (cachedStatsUserData) {
                    const lastVisited = cachedStatsUserData.lastVisitedWorkshop || 0;
                    let newCount = 0;
                    
                    workshopResponsesCache.forEach(res => {
                        // Count if it's newer than their last visit, and they aren't the author
                        if (res.authorId !== userId && res.createdAt && res.createdAt.toMillis() > lastVisited) {
                            newCount++;
                        }
                    });
                    
                    const badge = document.getElementById('workshop-badge');
                    if (badge) {
                        if (newCount > 0) {
                            badge.textContent = newCount > 99 ? '99+' : newCount;
                            badge.classList.remove('hidden');
                            badge.classList.add('animate-pulse'); // Add a little attention-grabber
                            setTimeout(() => badge.classList.remove('animate-pulse'), 3000);
                        } else {
                            badge.classList.add('hidden');
                        }
                    }
                }

                const workshopModal = document.getElementById('workshop-modal');
                if (workshopModal && !workshopModal.classList.contains('hidden')) {
                    const searchInput = document.getElementById('workshop-search-input');
                    renderWorkshopFeed(searchInput ? searchInput.value : '');
                }
            }, (error) => {
                console.error("🔥 Workshop Listener Error:", error);
                showMessage("Failed to sync community feed.", "error");
            });

            const userCannedResponsesDocRef = getUserCannedResponsesDocRef(userId);
            cannedResponsesUnsubscribe = onSnapshot(userCannedResponsesDocRef, async (doc) => {
				if (isSilencingUpdates) {
		        console.log("🤫 Silencing re-render to prevent flicker.");
		        return; // Stop here! Do not reload the page.
    }
                if (doc.exists()) { categories = doc.data().categories || {}; } else { try { const blueprint = await getCannedResponsesBlueprint(); categories = JSON.parse(JSON.stringify(blueprint)); await setDoc(userCannedResponsesDocRef, { categories: categories }); console.log("Migrated default data to Firestore for new user."); } catch (error) { console.error("Error migrating data for new user:", error); } }
                for (const key in categories) { if (!categories[key].responses) { categories[key].responses = []; } }
                if (Object.keys(categories).length > 0) {
                    const existingCategoryNames = Object.keys(categories);
                    if (!existingCategoryNames.includes(activeCategory)) { activeCategory = existingCategoryNames[0]; }
                }
				isDataLoaded = true;
				hasLoadedStats = false;
                renderContent();
				updateDarkModeStreak();
				checkAndNotifyAchievements(firstSignIn); 
                runIcloudAutoBackup(userId, categories);
            }, (error) => {
                console.error("Error with onSnapshot listener:", error);
                showMessage("Error loading your data. Please check your Firebase permissions.", 'error');
            });
        }
    } else {
        try { await signInAnonymously(auth); } catch (error) { console.error("Anonymous sign-in failed", error); }
    }
    const loader = document.getElementById('full-page-loader');
    if (loader) {
        loader.classList.add('hidden');
    }	
});

attachEventListeners();
