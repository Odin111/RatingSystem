import { domElements, appState } from './state.js';
import { API } from './api.js';
import { checkAuthStatus, showAdminTab, uiManager } from './viewManager.js';
import { initAuth, updatePasswordWarningVisibility } from './auth.js';
import { initEmployee } from './employee.js';
import { initSubmissions } from './admin/submissions.js';
import { initApplicants } from './admin/applicants.js';
import { initAccounts } from './admin/accounts.js';
import { initHistory } from './admin/history.js';
import { initDetails } from './admin/details.js';
import { exportAllToExcel } from './admin/export.js';
import { showToast, showConfirm } from './utils.js';

const initApp = async () => {
    await API.fetchAll();

    const localUsers = JSON.parse(localStorage.getItem('ratingSystem_users'));
    if (localUsers && appState.existingUsers.length === 0) {
        const migrateData = {
            users: localUsers,
            applicants: JSON.parse(localStorage.getItem('ratingSystem_applicants')),
            ratings: JSON.parse(localStorage.getItem('ratingSystem_ratings')),
            deletedRatings: JSON.parse(localStorage.getItem('ratingSystem_deletedRatings')),
            deletedApplicants: JSON.parse(localStorage.getItem('ratingSystem_deletedApplicants'))
        };
        await API.migrate(migrateData);
        
        localStorage.removeItem('ratingSystem_users');
        localStorage.removeItem('ratingSystem_applicants');
        localStorage.removeItem('ratingSystem_ratings');
        localStorage.removeItem('ratingSystem_deletedRatings');
        localStorage.removeItem('ratingSystem_deletedApplicants');
    }

    const adminIndex = appState.existingUsers.findIndex(u => u.username === 'admin');
    if (adminIndex === -1) {
        await API.saveUser({ username: 'admin', password: 'admin123', role: 'admin', fullName: 'System Administrator' });
    }

    checkAuthStatus();
    updatePasswordWarningVisibility();
};

document.addEventListener('DOMContentLoaded', () => {
    // ---- Global UI Logic ----
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const wrapper = e.target.closest('.input-wrapper');
            if(!wrapper) return;
            const input = wrapper.querySelector('input');
            const icon = btn.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('bx-show');
                icon.classList.add('bx-hide');
            } else {
                input.type = 'password';
                icon.classList.remove('bx-hide');
                icon.classList.add('bx-show');
            }
        });
    });

    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeIcon = themeToggleBtn ? themeToggleBtn.querySelector('i') : null;
    
    if (document.documentElement.classList.contains('dark-mode')) {
        if (themeIcon) {
            themeIcon.classList.remove('bx-moon');
            themeIcon.classList.add('bx-sun');
        }
    }

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            document.documentElement.classList.add('theme-transition');
            document.documentElement.classList.toggle('dark-mode');
            const isDark = document.documentElement.classList.contains('dark-mode');
            localStorage.setItem('ratingSystem_theme', isDark ? 'dark' : 'light');
            if (themeIcon) {
                if (isDark) {
                    themeIcon.classList.remove('bx-moon');
                    themeIcon.classList.add('bx-sun');
                } else {
                    themeIcon.classList.remove('bx-sun');
                    themeIcon.classList.add('bx-moon');
                }
            }
            setTimeout(() => {
                document.documentElement.classList.remove('theme-transition');
            }, 300);
        });
    }

    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            showAdminTab(e.currentTarget.getAttribute('data-tab'));
        });
    });

    if (domElements.admin.deleteAllSubmissionsBtn) {
        domElements.admin.deleteAllSubmissionsBtn.addEventListener('click', () => {
            showConfirm('Delete All Ratings', 'Are you sure you want to delete all ratings?', async () => {
                try {
                    await API.deleteAllRatings();
                    if (uiManager.renderAdminTable) uiManager.renderAdminTable();
                    showToast('All ratings moved to history.', 'success');
                } catch (err) {
                    console.error(err);
                    showToast(err.message || 'Failed to move ratings to history.', 'error');
                }
            });
        });
    }

    if (domElements.admin.exportAllBtn) {
        domElements.admin.exportAllBtn.addEventListener('click', exportAllToExcel);
    }

    window.addEventListener('mousedown', (e) => {
        if (domElements.admin.historyModal && e.target === domElements.admin.historyModal) {
            domElements.admin.historyModal.classList.remove('show');
        }
        if (domElements.admin.addApplicantModal && e.target === domElements.admin.addApplicantModal) {
            domElements.admin.addApplicantModal.classList.remove('show');
        }
        if (domElements.admin.addBatchModal && e.target === domElements.admin.addBatchModal) {
            domElements.admin.addBatchModal.classList.remove('show');
        }
        if (domElements.admin.applicantHistoryModal && e.target === domElements.admin.applicantHistoryModal) {
            domElements.admin.applicantHistoryModal.classList.remove('show');
        }
        if (domElements.admin.addAccountModal && e.target === domElements.admin.addAccountModal) {
            domElements.admin.addAccountModal.classList.remove('show');
        }
        if (domElements.admin.viewPasswordModal && e.target === domElements.admin.viewPasswordModal) {
            domElements.admin.viewPasswordModal.classList.remove('show');
        }
        if (domElements.admin.editEmployeeInfoModal && e.target === domElements.admin.editEmployeeInfoModal) {
            domElements.admin.editEmployeeInfoModal.classList.remove('show');
        }
    });

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const openModals = Array.from(document.querySelectorAll('.modal.show'));
            if (openModals.length === 0) return;
            let topModal = openModals[0];
            let maxZ = parseInt(window.getComputedStyle(topModal).zIndex) || 0;
            for (let i = 1; i < openModals.length; i++) {
                let currentZ = parseInt(window.getComputedStyle(openModals[i]).zIndex) || 0;
                if (currentZ >= maxZ) {
                    topModal = openModals[i];
                    maxZ = currentZ;
                }
            }
            if (topModal === domElements.confirmModal.el) {
                domElements.confirmModal.cancelBtn.click();
            } else {
                topModal.classList.remove('show');
            }
        } else if (e.key === 'Tab') {
            const focusableSelectors = 'button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';
            
            const openModals = Array.from(document.querySelectorAll('.modal.show'));
            let context = document.querySelector('.view.active') || document.body;
            
            if (openModals.length > 0) {
                let topModal = openModals[0];
                let maxZ = parseInt(window.getComputedStyle(topModal).zIndex) || 0;
                for (let i = 1; i < openModals.length; i++) {
                    let currentZ = parseInt(window.getComputedStyle(openModals[i]).zIndex) || 0;
                    if (currentZ >= maxZ) {
                        topModal = openModals[i];
                        maxZ = currentZ;
                    }
                }
                context = topModal;
            }

            const visibleFocusable = Array.from(context.querySelectorAll(focusableSelectors))
                .filter(el => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length));

            if (visibleFocusable.length === 0) {
                e.preventDefault();
                return;
            }

            const firstElement = visibleFocusable[0];
            const lastElement = visibleFocusable[visibleFocusable.length - 1];

            if (e.shiftKey) { // Shift + Tab
                if (document.activeElement === firstElement || !context.contains(document.activeElement)) {
                    e.preventDefault();
                    lastElement.focus();
                }
            } else { // Tab
                if (document.activeElement === lastElement || !context.contains(document.activeElement)) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        }

    });

    document.addEventListener('click', (e) => {
        if (e.detail > 0) {
            const btn = e.target.closest('button');
            if (btn) btn.blur();
        }
    });

    // Initialize modules
    initAuth();
    initEmployee();
    initSubmissions();
    initApplicants();
    initAccounts();
    initHistory();
    initDetails();

    initApp();
});

// SSE Connection for auto-close
const connectSSE = () => {
    const evtSource = new EventSource('/api/events');
    evtSource.onerror = async () => {
        try {
            await fetch('/', { method: 'HEAD' });
        } catch (e) {
            evtSource.close();
            window.close();
            document.body.innerHTML = `
                <div style="display:flex;justify-content:center;align-items:center;height:100vh;flex-direction:column;font-family:sans-serif;background:var(--bg-color);color:var(--text-color);">
                    <h2 style="margin-bottom:10px;">Server Disconnected</h2>
                    <p>The backend server has been closed. You may close this window.</p>
                </div>
            `;
        }
    };
};
connectSSE();
