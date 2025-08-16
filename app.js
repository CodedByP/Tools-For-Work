import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, linkWithCredential, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-functions.js";

// --- Firebase Initialization and Auth ---
// Use the global __firebase_config and __app_id variables provided by the environment
const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app, 'us-central1');

let categories = {};
let activeCategory = 'Uncategorized';
let userId = null;
let newResponseId = null;
let responseToDeleteId = null;
let categoryToEdit = null;
let currentPage = 'canned-responses';

const defaultCannedResponses = {
    'BRONCO': {
        color: '#0284c7',
        responses: [
            {
                id: 'bronco-1',
                label: 'NON ACTIONABLE ORDER',
                text: 'Hello ,\n\nI am writing to inform you that the item you ordered, 6.5FT MINI DP TO HDMI ADAPTER, is currently out of stock. We expect to have it back in stock within 2-4 weeks. I apologize for the inconvenience.\n\nOnce it is back in stock, we will deliver it to you as soon as possible. We appreciate your patience and understanding during this time.\n\nIf you have any other questions or concerns, please do not hesitate to contact me.\n\nSincerely,\n\n[Name]',
                createdAt: new Date().toISOString()
            },
            {
                id: 'bronco-2',
                label: 'ACTIONABLE ITEM RESPONSE',
                text: 'Hello ,\n\nThank you for your order!\n\nOur target is to have them either shipped or delivered to you in 1-3 business days time. We will let you know when your order is on its way.\n\nThank you\n\n[Name]',
                createdAt: new Date().toISOString()
            },
            {
                id: 'bronco-3',
                label: 'OUT FOR DELIVERY RESPONSE',
                text: 'Hello ,\n\nYour order will ship today or the next business day, depending on FedEx\'s pickup schedule. You can track your shipment with FedEx Tracking 883423643293.\n\nPlease make sure to check your local Mail room once this order is marked delivered.\n\nPlease note that once the order is delivered, we are unable to see and respond to updates in the order.\n\nIf you need further help, please submit a request through go/stuff by selecting “Have questions about your order?”, or by opening a ticket at go/emt-request.\n\nThank you,\n\n[Name]',
                createdAt: new Date().toISOString()
            },
            {
                id: 'bronco-4',
                label: 'ITEM DELIVERED',
                text: 'Hello ,\n\nI have delivered the AP MACBOOK PRO ENG 16 I 2024 to your desk US-LAX-BIN1-2-27C this morning August 14th 2025\n\nPlease note that once the order is delivered, we are unable to see and respond to updates in the order.\n\nIf you need further help, please submit a request through go/stuff by selecting “Have questions about your order?”, or by opening a ticket at go/emt-request.\n\nThank you,\n\n[Name]',
                createdAt: new Date().toISOString()
            },
            {
                id: 'bronco-5',
                label: 'SECURITY KEY DELIVERED',
                text: 'Hello ,\n\nYour security key order has been delivered to US-LAX-BIN5-1-190E. Please be sure to follow the Techstop security key setup instructions at go/setup-sk.\n\nPlease note that once the order is delivered, we are unable to see and respond to updates in the order.\n\nIf you need further help, please submit a request through go/stuff by selecting “Have questions about your order?”, or by opening a ticket at go/emt-request.\n\nThank you,\n\n[Name]',
                createdAt: new Date().toISOString()
            },
            {
                id: 'bronco-6',
                label: 'PIKTIME',
                text: 'Hello ,\n\nThank you for your request.\n\nWe\'ve prepared your order and it will be ready for you to pick up at your confirmed appointment time.\n\nPick-up Location: https://floorscope.googleplex.com/US-LAX-BIN2-1#US-LAX-BIN2-1-100 (Please knock on our door when you arrive to pick up your order.)\n\nKind regards,\n\n[Name]',
                createdAt: new Date().toISOString()
            },
            {
                id: 'bronco-7',
                label: 'PIKTIME DELIVERED',
                text: 'Hello ,\n\nYour order for a Titan USB-C Portable Security Key was successfully picked up on July 9th 2025. Thanks for stopping by!\n\nWe will now mark this order delivered.\n\nKind regards,\n\n[Name]',
                createdAt: new Date().toISOString()
            },
            {
                id: 'bronco-8',
                label: 'PIKTIME CANCELLED',
                text: 'Hello ,\n\nThis is to inform you that your order has been canceled. This is due to the failure to pick up the order at the confirmed date and time of your appointment.\n\nKind regards,\n\n[Name]',
                createdAt: new Date().toISOString()
            }
        ]
    },
    'PAR': {
        color: '#ef4444',
        responses: [
            {
                id: 'par-1',
                label: 'PAR REMOTE ORDER',
                text: 'Hello ,\n\nYour shipping materials have been sent for your return order\n\nFedEx Tracking: 883469321443\nReturn Tracking: 791888444600\n\nKind regards,\n\n[Name]',
                createdAt: new Date().toISOString()
            },
            {
                id: 'par-2',
                label: 'PAR SHIPPING MATERIALS DELIVERED',
                text: 'Hello ,\n\nAccording to the FedEx tracking number, the shipping Materials were delivered on Monday, August 4th.\n\nhttps://screenshot.googleplex.com/6gpXawDYo3w5Liv\n\nAs a reminder, per Google’s device return policy, you have 14 days (10 business days) to complete your return. If you still have your device after the return window, this device will lose corporate access and your cost center will be charged back after 40 days.\n\nBest regards,\n\n[Name]',
                createdAt: new Date().toISOString()
            },
            {
                id: 'par-3',
                label: 'PAR STUFF LOCKER',
                text: 'Hello ,\n\nThank you for submitting your return request.\n\nWe\'ll retrieve your asset from the Stuff Station return locker as soon as it\'s dropped off.\n\nJust a friendly reminder: you have 10 business days from the creation date of this order to place your asset in the return locker. If it\'s not dropped off within this time frame, your return order will be automatically canceled.\n\nKind regards,\n\n[Name]',
                createdAt: new Date().toISOString()
            },
            {
                id: 'par-4',
                label: 'CANCEL RETURN LOCKER ORDER',
                text: 'Please be advised that this return order will be canceled. This is due to the item exceeding our 10-business day return policy and not being located in the designated return lockers.',
                createdAt: new Date().toISOString()
            }
        ]
    },
    'GUTS': {
        color: '#059669',
        responses: [
            {
                id: 'guts-1',
                label: 'GNG LOCKERS PROACTIVE TICKET',
                text: 'Hello ,\n\nThe GNG lockers contain 11 loaners and 8 empty slots.\n\nScreenshot:\n\nThis ticket will be marked resolved.\n\nKind regards,\n\n[Name]',
                createdAt: new Date().toISOString()
            },
            {
                id: 'guts-2',
                label: 'GUTS STUFF STATION VENDING',
                text: 'Hello ,\n\nThe stuff station vending machine has been replenished .\n\nScreenshot:\n\nThis ticket will now be resolved.\n\nKind regards,\n\n[Name]',
                createdAt: new Date().toISOString()
            },
            {
                id: 'guts-3',
                label: 'Remote Return Shipment Information',
                text: 'Hello ,\n\nYour request has been prepped and ready to ship. Feel free to reach out to us if you need more assistance. (1 Box Sent)\n\nFedEx Tracking:\nReturn Tracking:\n\nAs a reminder, per Google’s device return policy, you have 14 days (10 business days) to complete your return. If you still have your device after the return window, this device will lose corporate access and your cost center will be charged.\n\nWe will send a reminder in 3 business days if we haven\'t received your return by then.\n\nI’ll set this ticket to Pending Hardware Return while we wait for delivery.\n\nKind regards,\n\n[Name]',
                createdAt: new Date().toISOString()
            },
            {
                id: 'guts-4',
                label: 'Resolution For Lost Device',
                text: 'Hello ,\n\nAfter conducting a search for Asset Number <#######> - <Device Model>, I have concluded that this device is lost and I updated our records to reflect this.\n\nThe following actions were taken to search for this device:\n1:\n2:\n3:\n\nSince no further actions are needed, I will resolve this ticket now. Please feel free to reach out if you have any further questions regarding this request.\nKind regards,\n\n[Name]',
                createdAt: new Date().toISOString()
            },
            {
                id: 'guts-5',
                label: 'Exit Onsite Collection Information',
                text: 'Hello ,\n\nThank you for confirming that your <Device Model> Asset Number <#######> is ready for pickup on MM/DD/YYYY>.\n\nI will set this ticket to Pending Date of Event until the collection date, and I will update the ticket again when the collection is in progress.\n\nIn the meantime, please let me know if you have any further questions regarding this request.\n\nKind regards,\n\n[Name]',
                createdAt: new Date().toISOString()
            },
            {
                id: 'guts-6',
                label: 'Onsite Collection That Was Not Found/Not Ready for Pick Up',
                text: 'Hello ,\n\nI just want to follow up because we visited <Desk Location> and your <Device Model> Asset Number <#######> was <not found/not ready for collection>.\n\nCan you please confirm a new collection date and the correct pick up location site code?\n\nAs a reminder, you have <#> business days remaining to complete your return.\n\nIf you do not complete your return in <#> business days this request will be closed, and your device will lose corporate access.\n\nIn the meantime, I’ll set this ticket back to Pending Customer Action while we wait for your reply.\n\nKind regards,\n\n[Name]',
                createdAt: new Date().toISOString()
            },
            {
                id: 'guts-7',
                label: 'Remote Return Shipment That Has Not Been Received',
                text: 'Hello ,\n\nI just want to follow up because we have not received your return.\n\nAs a reminder, you have 5 business days remaining to complete your return.\n\nIf you do not complete your return in 5 business days this request will be closed, and your device will lose corporate access.\n\nIn the meantime, I’ll set this ticket back to Pending Hardware Return while we wait for your return to be delivered.\n\nKind regards,\n\n[Name]',
                createdAt: new Date().toISOString()
            },
            {
                id: 'guts-8',
                label: 'Successful Return',
                text: 'Hello ,\n\nThe following devices have been returned to inventory, so I’ll resolve this ticket now:\n\nAsset Number <#######> - <Device Model>\n\nPlease feel free to reach out if you have any further questions regarding this return.\nKind regards,\n\n[Name]',
                createdAt: new Date().toISOString()
            }
        ]
    },
    'Uncategorized': {
        color: '#6b7280',
        responses: []
    }
};

const getUserDocRef = (uid) => doc(db, 'artifacts', appId, 'users', uid);

const saveToFirestore = async () => {
    if (!userId) {
        console.error("User not authenticated.");
        return;
    }
    try {
        await setDoc(getUserDocRef(userId), { categories: categories });
    } catch (error) {
        console.error("Error saving to Firestore:", error);
        showMessage("Error saving data.", 'error');
    }
};

const renderContent = () => {
    const cannedResponsesApp = document.getElementById('canned-responses-app');
    const fedexTrackerApp = document.getElementById('fedex-tracker-app');
    const categoryBar = document.getElementById('category-bar');
    const importExportBtn = document.getElementById('import-export-btn');
    
    const mainTitle = document.getElementById('main-title');
    
    if (currentPage === 'canned-responses') {
        cannedResponsesApp.classList.remove('hidden');
        categoryBar.classList.remove('hidden');
        fedexTrackerApp.classList.add('hidden');
        importExportBtn.classList.remove('hidden');
        renderCategories();
    } else if (currentPage === 'fedex-tracker') {
        cannedResponsesApp.classList.add('hidden');
        categoryBar.classList.add('hidden');
        fedexTrackerApp.classList.remove('hidden');
        importExportBtn.classList.add('hidden');
        mainTitle.textContent = 'FedEx Tracker';
    }
};

const responseInput = document.getElementById('response-input');
const addBtn = document.getElementById('add-btn');
const responsesList = document.getElementById('responses-list');
const emptyState = document.getElementById('empty-state');
const messageBox = document.getElementById('message-box');
const labelModal = document.getElementById('label-modal');
const modalLabelInput = document.getElementById('modal-label-input');
const saveLabelBtn = document.getElementById('save-label-btn');
const cancelLabelBtn = document.getElementById('cancel-label-btn');
const deleteModal = document.getElementById('delete-modal');
const deleteConfirmBtn = document.getElementById('delete-confirm-btn');
const deleteCancelBtn = document.getElementById('delete-cancel-btn');
const categoryList = document.getElementById('category-list');
const addCategoryBtn = document.getElementById('add-category-btn');
const addCategoryModal = document.getElementById('add-category-modal');
const addCategoryInput = document.getElementById('add-category-input');
const confirmAddCategoryBtn = document.getElementById('confirm-add-category-btn');
const cancelAddCategoryBtn = document.getElementById('cancel-add-category-btn');
const addResponseSection = document.getElementById('add-response-section');
const responsesHeading = document.getElementById('responses-heading');
const mainTitle = document.getElementById('main-title');

const importExportBtn = document.getElementById('import-export-btn');
const importExportModal = document.getElementById('import-export-modal');
const exportBtn = document.getElementById('export-btn');
const importFileInput = document.getElementById('import-file-input');
const closeImportExportModalBtn = document.getElementById('close-import-export-modal-btn');

const searchInput = document.getElementById('search-input');
const searchBarContainer = document.getElementById('search-bar-container');

const editCategoryModal = document.getElementById('edit-category-modal');
const editCategoryInput = document.getElementById('edit-category-input');
const confirmEditCategoryBtn = document.getElementById('confirm-edit-category-btn');
const cancelEditCategoryBtn = document.getElementById('cancel-edit-category-btn');
const deleteCategoryModal = document.getElementById('delete-category-modal');
const confirmDeleteCategoryBtn = document.getElementById('confirm-delete-category-btn');
const cancelDeleteCategoryBtn = document.getElementById('cancel-delete-category-btn');

const categoryMenuBtn = document.getElementById('category-menu-btn');
const categoryMenu = document.getElementById('category-menu');
const renameCategoryBtn = document.getElementById('rename-category-btn');
const deleteCategoryBtn = document.getElementById('delete-category-btn');
const changeColorBtn = document.getElementById('change-color-btn');

const colorPickerModal = document.getElementById('color-picker-modal');
const colorInput = document.getElementById('color-input');
const closeColorPickerBtn = document.getElementById('close-color-picker-btn');
const saveColorBtn = document.getElementById('save-color-btn');

const hamburgerMenuBtn = document.getElementById('hamburger-menu-btn');
const sidebar = document.getElementById('sidebar');
const closeSidebarBtn = document.getElementById('close-sidebar-btn');
const navCannedResponses = document.getElementById('nav-canned-responses');
const navFedexTracker = document.getElementById('nav-fedex-tracker');
const signInBtn = document.getElementById('sign-in-btn');
const signOutBtn = document.getElementById('sign-out-btn');

const fedexInputText = document.getElementById('fedex-input-text');
const fedexExtractBtn = document.getElementById('fedex-extract-btn');
const trackingResultsContainer = document.getElementById('tracking-results-container');

const showMessage = (text, type = 'success') => {
    messageBox.textContent = text;
    messageBox.className = 'message-box show';
    if (type === 'success') {
        messageBox.style.backgroundColor = '#10B981';
    } else if (type === 'error') {
        messageBox.style.backgroundColor = '#EF4444';
    }
    setTimeout(() => {
        messageBox.className = 'message-box';
    }, 3000);
};

const renderCategories = () => {
    categoryList.innerHTML = '';
    const categoryNames = Object.keys(categories);
    if (categoryNames.length === 0) {
        if (!categories['Uncategorized']) {
            categories['Uncategorized'] = { color: '#60a5fa', responses: [] };
            saveToFirestore();
        }
        activeCategory = 'Uncategorized';
        renderCategories();
        return;
    }

    addResponseSection.classList.remove('hidden');
    searchBarContainer.classList.remove('hidden');
    
    categoryNames.forEach(name => {
        const button = document.createElement('div');
        button.className = `category-item-container flex items-center relative`;
        const isSelected = name === activeCategory;
        const categoryData = categories[name];
        
        const buttonColor = categoryData.color || '#60a5fa';

        button.innerHTML = `
            <button class="category-item font-bold py-2 px-4 rounded-lg shadow-md text-white transition-colors
                ${isSelected ? 'border-2 border-white' : ''}"
                style="background-color: ${buttonColor};"
                data-category="${name}">
                ${name}
            </button>
        `;
        categoryList.appendChild(button);
    });
    
    if (!categories[activeCategory]) {
        activeCategory = categoryNames[0];
    }
    renderResponses();
};

const renderResponses = (searchQuery = '') => {
    responsesList.innerHTML = '';
    
    let responsesToRender = [];
    let headingText = '';
    let isGlobalSearch = !!searchQuery;

    if (isGlobalSearch) {
        // If there's a search query, search all categories
        const query = searchQuery.toLowerCase();
        for (const categoryName in categories) {
            const categoryResponses = categories[categoryName].responses;
            const matchingResponses = categoryResponses.filter(r => 
                (r.text && r.text.toLowerCase().includes(query)) ||
                (r.label && r.label.toLowerCase().includes(query))
            );
            responsesToRender.push(...matchingResponses);
        }
        headingText = 'Search Results';
        categoryMenuBtn.classList.add('hidden');
    } else {
        // If no search query, show responses from the active category
        responsesToRender = categories[activeCategory] ? categories[activeCategory].responses : [];
        if (activeCategory === 'Uncategorized') {
            headingText = 'Responses in: Uncategorized';
            categoryMenuBtn.classList.add('hidden');
        } else if (activeCategory) {
            headingText = `Responses in: ${activeCategory}`;
            categoryMenuBtn.classList.remove('hidden');
        }
    }

    // Update main title and heading
    if (isGlobalSearch) {
        document.title = 'Search Results';
        mainTitle.textContent = 'Search Results';
    } else {
        document.title = activeCategory === 'Uncategorized' ? 'Canned Responses' : `${activeCategory} - Canned Responses`;
        mainTitle.textContent = activeCategory === 'Uncategorized' ? 'Canned Responses' : activeCategory;
    }

    responsesHeading.textContent = headingText;
    responsesHeading.classList.remove('hidden');
    
    if (responsesToRender.length > 0) {
        emptyState.classList.add('hidden');
        const groupedResponses = responsesToRender.reduce((acc, response) => {
            const label = response.label || 'Unlabeled';
            if (!acc[label]) {
                acc[label] = [];
            }
            acc[label].push(response);
            return acc;
        }, {});

        for (const label in groupedResponses) {
            const labelSection = document.createElement('div');
            labelSection.className = 'mb-6';
            labelSection.innerHTML = `
                <h3 class="text-xl font-bold text-gray-400 mb-2">${label}</h3>
                <div class="space-y-4"></div>
            `;
            const responsesInSection = labelSection.querySelector('div');

            groupedResponses[label].forEach(response => {
                const responseEl = document.createElement('div');
                responseEl.className = 'response-item flex flex-col sm:flex-row items-start sm:items-center justify-between bg-gray-700 p-4 rounded-lg border border-gray-600';
                responseEl.dataset.id = response.id;

                const displayHTML = `
                    <div class="flex-grow display-mode">
                        <p class="response-text text-gray-200 mb-2 sm:mb-0 sm:mr-4 whitespace-pre-wrap">${response.text}</p>
                        <div class="flex-shrink-0 flex space-x-2 mt-2 sm:mt-0">
                            <button class="copy-btn bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition">
                                Copy
                            </button>
                            <button class="edit-btn bg-yellow-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-yellow-600 transition">
                                Edit
                            </button>
                            <button class="delete-btn bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 transition">
                                Delete
                            </button>
                        </div>
                    </div>
                `;

                const categoryOptions = Object.keys(categories).map(cat => `<option value="${cat}" ${cat === activeCategory ? 'selected' : ''}>${cat}</option>`).join('');

                const editHTML = `
                    <div class="flex-grow edit-mode hidden">
                        <div class="flex flex-col space-y-2">
                            <textarea class="edit-response-input w-full border border-gray-600 rounded-lg p-2 bg-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition" rows="3">${response.text}</textarea>
                            <input type="text" class="edit-label-input w-full border border-gray-600 rounded-lg p-2 bg-gray-700 text-gray-200" value="${response.label || ''}">
                            <select class="edit-category-select w-full border border-gray-600 rounded-lg p-2 bg-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition">
                                ${categoryOptions}
                            </select>
                        </div>
                        <div class="flex-shrink-0 flex space-x-2 mt-2 sm:mt-0">
                            <button class="save-btn bg-blue-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-blue-700 transition">
                                Save
                            </button>
                            <button class="cancel-btn bg-gray-500 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-gray-600 transition">
                                Cancel
                            </button>
                        </div>
                    </div>
                `;

                responseEl.innerHTML = displayHTML + editHTML;
                responsesInSection.appendChild(responseEl);
            });
            responsesList.appendChild(labelSection);
        }
    } else {
        emptyState.classList.remove('hidden');
    }
};

const addResponse = (text) => {
    if (!text.trim()) {
        showMessage("Please enter a response to save.", 'error');
        return;
    }

    if (!activeCategory) {
        showMessage("Please create or select a category first.", 'error');
        return;
    }

    const newId = Date.now().toString();
    const newResponse = { id: newId, text: text, label: '', createdAt: new Date().toISOString() };
    categories[activeCategory].responses.push(newResponse);
    saveToFirestore();
    responseInput.value = '';
    newResponseId = newId;
    labelModal.classList.remove('hidden');
    modalLabelInput.focus();
};

const updateResponse = (id, newText, newLabel, newCategory) => {
    const oldCategory = activeCategory;
    const responsesInOldCategory = categories[oldCategory].responses;
    const responseIndex = responsesInOldCategory.findIndex(r => r.id === id);
    
    if (responseIndex > -1) {
        const responseToUpdate = responsesInOldCategory[responseIndex];
        responseToUpdate.text = newText;
        responseToUpdate.label = newLabel || '';
        
        if (newCategory && newCategory !== oldCategory) {
            responsesInOldCategory.splice(responseIndex, 1);
            if (!categories[newCategory]) {
                 categories[newCategory] = { color: '#60a5fa', responses: [] };
            }
            categories[newCategory].responses.push(responseToUpdate);
            activeCategory = newCategory;
            renderCategories();
        }

        saveToFirestore();
        showMessage("Response updated successfully!");
        renderResponses();
    }
};

const deleteResponse = (id) => {
    if (!activeCategory) return;

    categories[activeCategory].responses = categories[activeCategory].responses.filter(r => r.id !== id);
    saveToFirestore();
    renderResponses();
    showMessage("Response deleted successfully!");
};

const copyToClipboard = (text) => {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    showMessage("Copied to clipboard!");
};

const exportData = () => {
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
                    activeCategory = 'Uncategorized';
                    categories['Uncategorized'] = { color: '#60a5fa', responses: [] };
                }
                saveToFirestore();
                renderCategories();
                showMessage("Data imported successfully!");
                importExportModal.classList.add('hidden');
            } else {
                throw new Error('Invalid JSON format.');
            }
        } catch (error) {
            showMessage(`Error importing file: ${error.message}`, 'error');
        }
    };
    reader.readAsText(file);
};

const trackingNumberRegex = /[a-zA-Z0-9]{12,22}/g;

function extractAndFormat(inputText) {
    const matches = inputText.match(trackingNumberRegex);
    if (!matches) {
        return [];
    }
    return matches;
}

// --- Event Listeners ---
hamburgerMenuBtn.addEventListener('click', () => {
    sidebar.classList.add('open');
});

closeSidebarBtn.addEventListener('click', () => {
    sidebar.classList.remove('open');
});

navCannedResponses.addEventListener('click', () => {
    currentPage = 'canned-responses';
    renderContent();
    sidebar.classList.remove('open');
});

navFedexTracker.addEventListener('click', () => {
    currentPage = 'fedex-tracker';
    renderContent();
    sidebar.classList.remove('open');
});

signInBtn.addEventListener('click', async () => {
    try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
        showMessage("Signed in with Google!");
    } catch (error) {
        console.error("Google sign-in failed", error);
        showMessage("Google sign-in failed. Please try again.", 'error');
    }
});

signOutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
        showMessage("Signed out successfully!");
    } catch (error) {
        console.error("Sign out failed", error);
        showMessage("Sign out failed. Please try again.", 'error');
    }
});

const trackPackage = httpsCallable(functions, 'trackPackage');
fedexExtractBtn.addEventListener('click', async () => {
    const inputText = fedexInputText.value;
    const trackingNumbers = extractAndFormat(inputText);

    if (trackingNumbers.length === 0) {
        trackingResultsContainer.innerHTML = `<p class="text-gray-400">No tracking numbers found.</p>`;
        return;
    }

    trackingResultsContainer.innerHTML = '';
    
    // Show a loading spinner
    trackingResultsContainer.innerHTML = `<div class="flex justify-center items-center py-4">
        <svg class="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    </div>`;


    try {
        const result = await trackPackage({ trackingNumbers });
        const trackingData = result.data;
        trackingResultsContainer.innerHTML = '';
        
        trackingData.forEach(packageStatus => {
            const statusText = packageStatus.status ? packageStatus.status.description : 'Unknown Status';
            const deliveredText = packageStatus.isDelivered ? 'Delivered' : 'In Transit';
            
            const resultDiv = document.createElement('div');
            resultDiv.className = 'bg-gray-700 p-4 rounded-lg border border-gray-600 flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0';
            
            resultDiv.innerHTML = `
                <div class="flex-1">
                    <h4 class="font-bold text-lg text-white">${packageStatus.trackingNumber}</h4>
                    <p class="text-sm text-gray-400">${statusText}</p>
                    <p class="text-sm text-white">${deliveredText}</p>
                </div>
                <div class="flex-shrink-0 mt-2 sm:mt-0">
                    <button class="copy-btn bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition" data-clipboard-text="${packageStatus.trackingNumber}">
                        Copy
                    </button>
                </div>
            `;
            trackingResultsContainer.appendChild(resultDiv);
        });
        
        showMessage("Tracking successful!");
    } catch (error) {
        console.error("FedEx tracking failed", error);
        trackingResultsContainer.innerHTML = `<p class="text-red-400 text-center">Error tracking packages. Please check your tracking numbers and try again.</p>`;
        showMessage("Tracking failed.", 'error');
    }
});


importExportBtn.addEventListener('click', () => {
    importExportModal.classList.remove('hidden');
});
closeImportExportModalBtn.addEventListener('click', () => {
    importExportModal.classList.add('hidden');
});
exportBtn.addEventListener('click', exportData);
importFileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        importData(file);
    }
});

addCategoryBtn.addEventListener('click', () => {
    addCategoryModal.classList.remove('hidden');
    addCategoryInput.focus();
});

confirmAddCategoryBtn.addEventListener('click', () => {
    const categoryName = addCategoryInput.value.trim();
    if (!categoryName) {
        showMessage("Please enter a category name.", 'error');
        return;
    }
    if (categories[categoryName]) {
        showMessage("A category with this name already exists.", 'error');
        return;
    }
    
    categories[categoryName] = { color: '#60a5fa', responses: [] };
    activeCategory = categoryName;
    addCategoryModal.classList.add('hidden');
    saveToFirestore();
    renderCategories();
    showMessage(`Category '${categoryName}' created successfully!`);
});

cancelAddCategoryBtn.addEventListener('click', () => {
    addCategoryInput.value = '';
    addCategoryModal.classList.add('hidden');
});

categoryList.addEventListener('click', (event) => {
    const target = event.target;
    const itemBtn = target.closest('.category-item');
    
    if (itemBtn) {
        const categoryName = itemBtn.dataset.category;
        if (categoryName !== activeCategory) {
            activeCategory = categoryName;
            renderCategories();
            renderResponses();
        }
    }
});

// Event listeners for the new header menu
categoryMenuBtn.addEventListener('click', () => {
    categoryMenu.classList.toggle('hidden');
});

renameCategoryBtn.addEventListener('click', () => {
    categoryToEdit = activeCategory;
    editCategoryInput.value = categoryToEdit;
    editCategoryModal.classList.remove('hidden');
    categoryMenu.classList.add('hidden');
});

deleteCategoryBtn.addEventListener('click', () => {
    categoryToEdit = activeCategory;
    deleteCategoryModal.classList.remove('hidden');
    categoryMenu.classList.add('hidden');
});

changeColorBtn.addEventListener('click', () => {
    if (activeCategory && activeCategory !== 'Uncategorized') {
        const currentColor = categories[activeCategory].color || '#60a5fa';
        colorInput.value = currentColor;
        colorPickerModal.classList.remove('hidden');
        categoryMenu.classList.add('hidden');
    } else {
        showMessage("You can't change the color of the 'Uncategorized' category.", 'error');
    }
});

saveColorBtn.addEventListener('click', () => {
    const newColor = colorInput.value;
    if (activeCategory) {
        categories[activeCategory].color = newColor;
        saveToFirestore();
        renderCategories();
        showMessage(`Color for '${activeCategory}' changed successfully!`);
    }
    colorPickerModal.classList.add('hidden');
});


closeColorPickerBtn.addEventListener('click', () => {
    colorPickerModal.classList.add('hidden');
});

document.addEventListener('click', (event) => {
    if (!event.target.closest('#category-menu-btn') && !event.target.closest('#category-menu')) {
        categoryMenu.classList.add('hidden');
    }
});


confirmEditCategoryBtn.addEventListener('click', () => {
    const newName = editCategoryInput.value.trim();
    if (!newName) {
        showMessage("Category name cannot be empty.", 'error');
        return;
    }
    if (newName === categoryToEdit) {
        editCategoryModal.classList.add('hidden');
        return;
    }
    if (categories[newName]) {
        showMessage("A category with this name already exists.", 'error');
        return;
    }
    
    categories[newName] = categories[categoryToEdit];
    delete categories[categoryToEdit];
    if (activeCategory === categoryToEdit) {
        activeCategory = newName;
    }
    categoryToEdit = null;
    saveToFirestore();
    editCategoryModal.classList.add('hidden');
    renderCategories();
    showMessage("Category renamed successfully!");
});

cancelEditCategoryBtn.addEventListener('click', () => {
    categoryToEdit = null;
    editCategoryModal.classList.add('hidden');
});

confirmDeleteCategoryBtn.addEventListener('click', () => {
    if (categoryToEdit) {
        delete categories[categoryToEdit];
        if (activeCategory === categoryToEdit) {
            const categoryNames = Object.keys(categories);
            activeCategory = categoryNames.length > 0 ? categoryNames[0] : 'Uncategorized';
        }
        categoryToEdit = null;
        saveToFirestore();
        deleteCategoryModal.classList.add('hidden');
        renderCategories();
        showMessage("Category deleted successfully!");
    }
});

cancelDeleteCategoryBtn.addEventListener('click', () => {
    categoryToEdit = null;
    deleteCategoryModal.classList.add('hidden');
});

addBtn.addEventListener('click', () => {
    addResponse(responseInput.value);
});

responsesList.addEventListener('click', (event) => {
    const target = event.target;
    const parentEl = target.closest('.response-item');
    if (!parentEl) return;
    const id = parentEl.dataset.id;
    
    const displayMode = parentEl.querySelector('.display-mode');
    const editMode = parentEl.querySelector('.edit-mode');
    
    if (target.classList.contains('copy-btn')) {
        const responses = categories[activeCategory].responses;
        const text = responses.find(r => r.id === id).text;
        copyToClipboard(text);
    } else if (target.classList.contains('edit-btn')) {
        displayMode.classList.add('hidden');
        editMode.classList.remove('hidden');
    } else if (target.classList.contains('save-btn')) {
        const newText = parentEl.querySelector('.edit-response-input').value;
        const newLabel = parentEl.querySelector('.edit-label-input').value;
        const newCategory = parentEl.querySelector('.edit-category-select').value;
        
        updateResponse(id, newText, newLabel, newCategory);

    } else if (target.classList.contains('cancel-btn')) {
        const responses = categories[activeCategory].responses;
        const response = responses.find(r => r.id === id);
        if (response) {
            parentEl.querySelector('.edit-response-input').value = response.text;
            parentEl.querySelector('.edit-label-input').value = response.label || '';
        }
        displayMode.classList.remove('hidden');
        editMode.classList.add('hidden');
    } else if (target.classList.contains('delete-btn')) {
        responseToDeleteId = id;
        deleteModal.classList.remove('hidden');
    }
});

// Search functionality
searchInput.addEventListener('input', (e) => {
    renderResponses(e.target.value);
});

// Modal Event Listeners
saveLabelBtn.addEventListener('click', () => {
    if (newResponseId) {
        const responses = categories[activeCategory].responses;
        const responseIndex = responses.findIndex(r => r.id === newResponseId);
        if (responseIndex > -1) {
            responses[responseIndex].label = modalLabelInput.value || '';
            saveToFirestore();
        }
        newResponseId = null;
        modalLabelInput.value = '';
        labelModal.classList.add('hidden');
        renderResponses();
    }
});

cancelLabelBtn.addEventListener('click', () => {
    if (newResponseId) {
        deleteResponse(newResponseId);
        newResponseId = null;
    }
    modalLabelInput.value = '';
    labelModal.classList.add('hidden');
});

deleteConfirmBtn.addEventListener('click', () => {
    if (responseToDeleteId) {
        deleteResponse(responseToDeleteId);
        responseToDeleteId = null;
        deleteModal.classList.add('hidden');
    }
});

deleteCancelBtn.addEventListener('click', () => {
    responseToDeleteId = null;
    deleteModal.classList.add('hidden');
});

// Initial render
onAuthStateChanged(auth, async (user) => {
    if (user) {
        userId = user.uid;
        if (user.isAnonymous) {
            signInBtn.classList.remove('hidden');
            signOutBtn.classList.add('hidden');
        } else {
            signInBtn.classList.add('hidden');
            signOutBtn.classList.remove('hidden');
        }

        onSnapshot(getUserDocRef(userId), (doc) => {
            if (doc.exists()) {
                categories = doc.data().categories || {};
            } else {
                categories = defaultCannedResponses;
                saveToFirestore();
            }
            renderContent();
        });
    } else {
        try {
            await signInAnonymously(auth);
        } catch (error) {
            console.error("Anonymous sign-in failed", error);
        }
        signInBtn.classList.add('hidden');
        signOutBtn.classList.add('hidden');
    }
});

