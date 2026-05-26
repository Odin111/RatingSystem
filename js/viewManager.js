import { domElements, appState } from './state.js';

export const uiManager = {
    renderEmployeeRatingTable: null,
    renderAdminTable: null,
    renderAdminApplicantsTable: null,
    renderAdminAccountsTable: null,
    openDetailsModal: null,
    showAdminTab: null
};

export const switchView = (viewName) => {
    localStorage.setItem('ratingSystem_activeView', viewName);
    Object.values(domElements.views).forEach(view => view.classList.remove('active'));
    domElements.views[viewName].classList.add('active');
    
    if (viewName === 'login') {
        document.body.classList.remove('static-blobs');
    } else {
        document.body.classList.add('static-blobs');
    }
    
    if (viewName === 'employee') {
        domElements.employee.welcome.textContent = `Welcome, ${appState.currentUser.fullName || appState.currentUser.username}`;
        domElements.employee.raterName.textContent = appState.currentUser.fullName || appState.currentUser.username;
        if (domElements.employee.raterRole) {
            domElements.employee.raterRole.textContent = appState.currentUser.position || 'Employee';
        }
        
        // Always reset to first page when entering employee view
        appState.currentEmployeePage = 0;
        if (uiManager.renderEmployeeRatingTable) uiManager.renderEmployeeRatingTable();
        
        // Immediate scroll to top
        window.scrollTo(0, 0);
        
        setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            const firstInput = document.getElementById('score-0-0');
            if (firstInput) firstInput.focus();
        }, 200);
    } else if (viewName === 'admin') {
        domElements.admin.welcome.textContent = `Welcome, ${appState.currentUser.fullName || appState.currentUser.username}`;
        if (uiManager.renderAdminTable) uiManager.renderAdminTable();
        if (uiManager.renderAdminApplicantsTable) uiManager.renderAdminApplicantsTable();
        if (uiManager.renderAdminAccountsTable) uiManager.renderAdminAccountsTable();
        
        const savedTab = localStorage.getItem('ratingSystem_activeAdminTab') || 'overview';
        if (savedTab === 'details') {
            const savedRater = localStorage.getItem('ratingSystem_currentDetailsRater');
            if (savedRater && uiManager.openDetailsModal) {
                uiManager.openDetailsModal(savedRater);
            } else {
                if (uiManager.showAdminTab) uiManager.showAdminTab('submissions');
            }
        } else {
            if (uiManager.showAdminTab) uiManager.showAdminTab(savedTab);
        }

        setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            if (savedTab === 'overview') {
                const searchInput = document.getElementById('admin-search-applicant');
                if (searchInput) searchInput.focus();
            }
        }, 150);
    } else if (viewName === 'settings') {
        domElements.settings.fullname.value = appState.currentUser.fullName || appState.currentUser.username;
        domElements.settings.password.value = '';
        if (appState.currentUser.role === 'admin') {
            if (domElements.settings.positionGroup) domElements.settings.positionGroup.style.display = 'none';
            if (domElements.settings.position) domElements.settings.position.removeAttribute('required');
            if (domElements.settings.divisionGroup) domElements.settings.divisionGroup.style.display = 'none';
        } else {
            if (domElements.settings.positionGroup) domElements.settings.positionGroup.style.display = 'block';
            if (domElements.settings.position) {
                domElements.settings.position.setAttribute('required', 'required');
                domElements.settings.position.value = appState.currentUser.position || '';
            }
            if (domElements.settings.divisionGroup) {
                domElements.settings.divisionGroup.style.display = 'block';
                if (domElements.settings.division) {
                    domElements.settings.division.value = appState.currentUser.division || 'Unassigned';
                }
            }
        }
    } else if (viewName === 'login') {
        domElements.auth.loginForm.reset();
        document.querySelectorAll('.input-wrapper input[type="text"]').forEach(input => {
            if (input.id.includes('password') && !input.readOnly) {
                input.type = 'password';
                const btn = input.parentElement.querySelector('.toggle-password i');
                if (btn) {
                    btn.classList.remove('bx-hide');
                    btn.classList.add('bx-show');
                }
            }
        });
        
        setTimeout(() => domElements.auth.loginUsername.focus(), 50);
    }
};

export const checkAuthStatus = () => {
    if (appState.currentUser && !appState.existingUsers.find(u => u.username === appState.currentUser.username)) {
        appState.currentUser = null;
        localStorage.removeItem('ratingSystem_currentUser');
    }

    // Force default tabs on hard reload to ensure consistent startup focus
    if (!sessionStorage.getItem('app_initialized')) {
        sessionStorage.setItem('app_initialized', 'true');
        if (appState.currentUser && appState.currentUser.role === 'admin') {
            localStorage.setItem('ratingSystem_activeAdminTab', 'overview');
        }
    }

    if (appState.currentUser) {
        let savedView = localStorage.getItem('ratingSystem_activeView');
        if (!savedView || savedView === 'login') {
            savedView = appState.currentUser.role === 'admin' ? 'admin' : 'employee';
        }
        
        if (savedView === 'admin' && appState.currentUser.role !== 'admin') {
            switchView('employee');
        } else {
            switchView(savedView);
        }
    } else {
        switchView('login');
    }
};

export const showAdminTab = (targetTab) => {
    appState.currentAdminTab = targetTab;
    localStorage.setItem('ratingSystem_activeAdminTab', targetTab);
    
    document.querySelectorAll('.admin-tab-btn').forEach(b => {
        b.classList.remove('primary-btn');
        b.classList.add('outline-btn');
    });
    const activeBtn = document.querySelector(`.admin-tab-btn[data-tab="${targetTab}"]`);
    if (activeBtn) {
        activeBtn.classList.remove('outline-btn');
        activeBtn.classList.add('primary-btn');
    }
    
    document.querySelectorAll('.admin-tab-content').forEach(c => {
        c.style.display = 'none';
        c.classList.remove('animate-fade');
    });
    const targetContent = document.getElementById(`admin-tab-${targetTab}`);
    if (targetContent) {
        targetContent.style.display = 'block';
        void targetContent.offsetWidth; // Force reflow to restart animation
        targetContent.classList.add('animate-fade');

        if (targetTab === 'overview') {
            appState.activeBatchId = null;
            appState.adminApplicantSearchQuery = '';
            const searchInput = document.getElementById('admin-search-applicant');
            if (searchInput) {
                searchInput.value = '';
                const clearSearchBtn = document.getElementById('clear-applicant-search');
                if (clearSearchBtn) clearSearchBtn.classList.remove('show');
            }
            if (uiManager.renderAdminApplicantsTable) {
                uiManager.renderAdminApplicantsTable();
            }
        } else if (targetTab === 'history' && uiManager.renderHistoryTable) {
            uiManager.renderHistoryTable();
        }
    }
};

uiManager.showAdminTab = showAdminTab;
