import { domElements, appState } from './state.js';
import { showToast, showConfirm } from './utils.js';
import { API } from './api.js';
import { switchView, checkAuthStatus, uiManager } from './viewManager.js';

export const initAuth = () => {
    domElements.auth.loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = domElements.auth.loginUsername.value.trim();
        const password = domElements.auth.loginPassword.value;
        
        if (!username || !password) {
            showToast('Please fill all fields', 'error');
            return;
        }

        const user = appState.existingUsers.find(u => u.username === username && u.password === password);
        
        if (user) {
            appState.currentUser = user;
            localStorage.setItem('ratingSystem_currentUser', JSON.stringify(appState.currentUser));
            
            // If admin, reset to Applicant Forms tab on login
            if (user.role === 'admin') {
                localStorage.setItem('ratingSystem_activeAdminTab', 'overview');
            }
            
            showToast('Login successful!');
            domElements.auth.loginForm.reset();
            updatePasswordWarningVisibility();
            checkAuthStatus();
        } else {
            showToast('Invalid credentials', 'error');
        }
    });

    const logout = () => {
        showConfirm('Logout', 'Are you sure you want to log out?', () => {
            appState.currentUser = null;
            localStorage.removeItem('ratingSystem_currentUser');
            domElements.auth.loginForm.reset();
            showToast('Logged out');
            checkAuthStatus();
        });
    };

    if (domElements.employee.logoutBtn) domElements.employee.logoutBtn.addEventListener('click', logout);
    if (domElements.admin.logoutBtn) domElements.admin.logoutBtn.addEventListener('click', logout);

    // Settings
    if (domElements.employee.settingsBtn) domElements.employee.settingsBtn.addEventListener('click', () => switchView('settings'));
    if (domElements.admin.settingsBtn) domElements.admin.settingsBtn.addEventListener('click', () => switchView('settings'));

    domElements.settings.backBtn.addEventListener('click', () => {
        if (appState.currentUser && appState.currentUser.role === 'admin') {
            switchView('admin');
        } else if (appState.currentUser && appState.currentUser.role === 'employee') {
            switchView('employee');
        } else {
            checkAuthStatus();
        }
    });

    domElements.settings.form.addEventListener('submit', (e) => {
        e.preventDefault();
        const newFullName = domElements.settings.fullname.value.trim();
        const newPassword = domElements.settings.password.value;

        if (!newFullName) {
            showToast('Full name cannot be empty', 'error');
            return;
        }

        if (newPassword && newPassword === appState.currentUser.password) {
            showToast('New password cannot be the same as your current password', 'error');
            return;
        }

        showConfirm('Save Changes', 'Are you sure you want to update your profile?', async () => {
            const userIndex = appState.existingUsers.findIndex(u => u.username === appState.currentUser.username);

            if (userIndex !== -1) {
                const updatedUser = { ...appState.existingUsers[userIndex], fullName: newFullName };

                if (newPassword) {
                    updatedUser.password = newPassword;
                }

                if (appState.currentUser.role !== 'admin' && domElements.settings.position) {
                    updatedUser.position = domElements.settings.position.value.trim();
                }

                await API.saveUser(updatedUser);
                appState.currentUser = updatedUser;
                localStorage.setItem('ratingSystem_currentUser', JSON.stringify(appState.currentUser));
                updatePasswordWarningVisibility();
                showToast('Profile updated successfully!');
                
                if (appState.currentUser && appState.currentUser.role === 'admin') {
                    switchView('admin');
                } else if (appState.currentUser && appState.currentUser.role === 'employee') {
                    switchView('employee');
                } else {
                    checkAuthStatus();
                }
            } else {
                showToast('Error updating profile', 'error');
            }
        });
    });

    domElements.settings.deleteBtn.addEventListener('click', () => {
        if(appState.currentUser.role === 'admin') {
            showToast('System Admin account cannot be deleted.', 'error');
            return;
        }

        showConfirm('Delete Account', 'This will permanently remove your account. Proceed?', async () => {
            await API.deleteUser(appState.currentUser.username);
            
            appState.currentUser = null;
            localStorage.removeItem('ratingSystem_currentUser');
            showToast('Account successfully deleted.', 'success');
            checkAuthStatus();
        });
    });
};

export const updatePasswordWarningVisibility = () => {
    if (!appState.currentUser || appState.currentUser.role !== 'employee') {
        if (domElements.employee.passwordWarning) domElements.employee.passwordWarning.classList.add('hidden');
        return;
    }

    const user = appState.existingUsers.find(u => u.username === appState.currentUser.username);
    if (user && user.password === user.originalPassword) {
        if (domElements.employee.passwordWarning) domElements.employee.passwordWarning.classList.remove('hidden');
        if (domElements.settings.passwordLabel) domElements.settings.passwordLabel.textContent = 'New Password (Required)';
        if (domElements.settings.password) domElements.settings.password.required = true;
    } else {
        if (domElements.employee.passwordWarning) domElements.employee.passwordWarning.classList.add('hidden');
        if (domElements.settings.passwordLabel) domElements.settings.passwordLabel.textContent = 'New Password (Optional)';
        if (domElements.settings.password) domElements.settings.password.required = false;
    }
};

uiManager.updatePasswordWarningVisibility = updatePasswordWarningVisibility;
