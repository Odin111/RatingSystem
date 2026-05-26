import { domElements, appState } from '../state.js';
import { API } from '../api.js';
import { showToast, showConfirm, escapeHTML } from '../utils.js';
import { uiManager } from '../viewManager.js';

const DIVISIONS = ['LTID', 'PBDD', 'STOD', 'LD', 'PARAD', 'PARPO I', 'PARPO II', 'Unassigned'];

const renderAccountDivisionTabs = () => {
    const nav = domElements.admin.accountsDivisionTabsNav;
    if (!nav) return;

    nav.innerHTML = '';

    const employees = appState.existingUsers.filter(u => u.role !== 'admin');

    DIVISIONS.forEach(div => {
        const count = employees.filter(u => (u.division || 'Unassigned') === div).length;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `division-tab-btn ${appState.activeAccountDivisionTab === div ? 'active' : ''}`;
        btn.setAttribute('data-division', div);
        btn.innerHTML = `${div} <span class="tab-badge">${count}</span>`;
        btn.addEventListener('click', () => {
            appState.activeAccountDivisionTab = div;
            renderAdminAccountsTable();
        });
        nav.appendChild(btn);
    });
};

export const renderAdminAccountsTable = () => {
    if (!domElements.admin.accountsTbody) return;
    domElements.admin.accountsTbody.innerHTML = '';

    if (!appState.activeAccountDivisionTab) {
        appState.activeAccountDivisionTab = 'LTID';
    }

    renderAccountDivisionTabs();

    const employees = appState.existingUsers.filter(u => u.role !== 'admin');

    let filteredEmployees = employees.filter(u => (u.division || 'Unassigned') === appState.activeAccountDivisionTab);

    if (appState.adminAccountSearchQuery) {
        filteredEmployees = filteredEmployees.filter(u =>
            u.fullName.toLowerCase().includes(appState.adminAccountSearchQuery) ||
            u.username.toLowerCase().includes(appState.adminAccountSearchQuery)
        );
    }

    if (filteredEmployees.length === 0) {
        if (domElements.admin.noAccountsMsg) {
            domElements.admin.noAccountsMsg.classList.remove('hidden');
            const msg = domElements.admin.noAccountsMsg.querySelector('p');
            if (msg) {
                msg.textContent = appState.adminAccountSearchQuery
                    ? `No employees match your search in ${appState.activeAccountDivisionTab}.`
                    : `No employee accounts found in ${appState.activeAccountDivisionTab}.`;
            }
        }
        if (domElements.admin.accountsTbody.parentElement) domElements.admin.accountsTbody.parentElement.classList.add('hidden');
        return;
    }

    if (domElements.admin.noAccountsMsg) domElements.admin.noAccountsMsg.classList.add('hidden');
    if (domElements.admin.accountsTbody.parentElement) domElements.admin.accountsTbody.parentElement.classList.remove('hidden');

    filteredEmployees.forEach(employee => {
        const tr = document.createElement('tr');
        const hasChangedPassword = employee.password !== employee.originalPassword;
        
        tr.innerHTML = `
            <td style="text-align: center;">${escapeHTML(employee.fullName)}</td>
            <td style="text-align: center;">${escapeHTML(employee.division || 'Unassigned')}</td>
            <td style="text-align: center;">${escapeHTML(employee.position || 'Employee')}</td>
            <td style="text-align: center;">${escapeHTML(employee.username)}</td>
            <td>
                <div style="display: flex; gap: 6px; align-items: center; justify-content: center; flex-wrap: wrap;">
                    <button class="btn danger-btn delete-account-admin-btn" data-username="${escapeHTML(employee.username)}" style="padding: 8px 12px;" title="Delete Account"><i class='bx bx-trash'></i></button>
                    <button class="btn outline-btn edit-employee-info-btn"
                        data-username="${escapeHTML(employee.username)}"
                        style="padding: 4px 10px; font-size: 0.8rem;"
                        title="Edit Division & Position">
                        <i class='bx bx-edit'></i> Edit Info
                    </button>
                    <button class="btn outline-btn view-password-admin-btn" 
                        data-username="${escapeHTML(employee.username)}" 
                        style="padding: 4px 10px; font-size: 0.8rem; ${hasChangedPassword ? 'opacity: 0.5; cursor: not-allowed; filter: grayscale(1);' : ''}" 
                        title="${!hasChangedPassword ? 'View Default Password' : 'Password has been changed'}"
                        ${hasChangedPassword ? 'disabled' : ''}>
                        View Password
                    </button>
                    <button class="btn outline-btn reset-default-admin-btn" 
                        data-username="${escapeHTML(employee.username)}" 
                        style="padding: 4px 10px; font-size: 0.8rem; ${!hasChangedPassword ? 'opacity: 0.5; cursor: not-allowed; filter: grayscale(1);' : ''}" 
                        title="${hasChangedPassword ? 'Reset Password to Default' : 'Password is already at default'}"
                        ${!hasChangedPassword ? 'disabled' : ''}>
                        <i class='bx bx-refresh'></i> Reset Password
                    </button>
                </div>
            </td>
        `;
        domElements.admin.accountsTbody.appendChild(tr);
    });

    domElements.admin.accountsTbody.querySelectorAll('.delete-account-admin-btn').forEach(btn => {
        btn.addEventListener('click', (e) => deleteAccount(e.currentTarget.getAttribute('data-username')));
    });

    domElements.admin.accountsTbody.querySelectorAll('.edit-employee-info-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const username = e.currentTarget.getAttribute('data-username');
            openEditEmployeeInfo(username);
        });
    });

    domElements.admin.accountsTbody.querySelectorAll('.view-password-admin-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const username = e.currentTarget.getAttribute('data-username');
            viewPassword(username);
        });
    });

    domElements.admin.accountsTbody.querySelectorAll('.reset-default-admin-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const username = e.currentTarget.getAttribute('data-username');
            resetToDefault(username);
        });
    });
};

const openEditEmployeeInfo = (username) => {
    const user = appState.existingUsers.find(u => u.username === username);
    if (!user) return;

    domElements.admin.editEmployeeInfoUsername.value = user.username;
    domElements.admin.editEmployeeInfoFullname.value = user.fullName || '';
    domElements.admin.editEmployeeInfoPosition.value = user.position || '';

    const divisionSelect = domElements.admin.editEmployeeInfoDivision;
    const currentDivision = user.division || 'Unassigned';
    // Try to set the value; if it doesn't exist as an option, default to Unassigned
    const optionExists = Array.from(divisionSelect.options).some(o => o.value === currentDivision);
    divisionSelect.value = optionExists ? currentDivision : 'Unassigned';

    domElements.admin.editEmployeeInfoModal.classList.add('show');
    setTimeout(() => domElements.admin.editEmployeeInfoPosition.focus(), 50);
};

const viewPassword = (username) => {
    const user = appState.existingUsers.find(u => u.username === username);
    if (!user) return;

    if (domElements.admin.viewedEmployeeFullname) {
        domElements.admin.viewedEmployeeFullname.value = user.fullName || '';
    }
    if (domElements.admin.viewedEmployeeUsername) {
        domElements.admin.viewedEmployeeUsername.value = user.username || '';
    }
    if (domElements.admin.viewedEmployeePassword) {
        domElements.admin.viewedEmployeePassword.value = user.originalPassword || user.password || '';
    }

    if (domElements.admin.viewPasswordModal) {
        domElements.admin.viewPasswordModal.classList.add('show');
    }
};

const resetToDefault = (username) => {
    const user = appState.existingUsers.find(u => u.username === username);
    if (!user) return;

    showConfirm('Reset Password', `Reset password for <strong>${username}</strong> back to its original default?`, async () => {
        const updatedUser = { ...user, password: user.originalPassword };
        await API.saveUser(updatedUser);
        
        // Re-fetch all data to ensure local state is perfectly in sync
        await API.fetchAll();

        renderAdminAccountsTable();
        showToast(`Password for ${username} has been reset to default.`);
    });
};

const deleteAccount = (username) => {
    showConfirm('Delete Account', `Are you sure you want to delete the account for <strong>${username}</strong>? This cannot be undone.`, async () => {
        await API.deleteUser(username);
        renderAdminAccountsTable();
        showToast(`Account for ${username} deleted.`, 'success');
    });
};

export const initAccounts = () => {
    const adminSearchAccountInput = document.getElementById('admin-search-account');
    const clearAccountSearchBtn = document.getElementById('clear-account-search');

    if (adminSearchAccountInput) {
        adminSearchAccountInput.addEventListener('input', (e) => {
            appState.adminAccountSearchQuery = e.target.value.toLowerCase();
            if (clearAccountSearchBtn) {
                clearAccountSearchBtn.classList.toggle('show', e.target.value.length > 0);
            }
            renderAdminAccountsTable();
        });
    }

    if (clearAccountSearchBtn) {
        clearAccountSearchBtn.addEventListener('click', () => {
            adminSearchAccountInput.value = '';
            appState.adminAccountSearchQuery = '';
            clearAccountSearchBtn.classList.remove('show');
            renderAdminAccountsTable();
            adminSearchAccountInput.focus();
        });
    }

    if (domElements.admin.openAddAccountBtn) {
        domElements.admin.openAddAccountBtn.addEventListener('click', () => {
            domElements.admin.addAccountForm.reset();
            const passwordInput = document.getElementById('new-account-password');
            if (passwordInput && passwordInput.type === 'text') {
                passwordInput.type = 'password';
                const icon = passwordInput.parentElement.querySelector('.toggle-password i');
                if (icon) {
                    icon.classList.remove('bx-hide');
                    icon.classList.add('bx-show');
                }
            }
            domElements.admin.addAccountModal.classList.add('show');
            setTimeout(() => domElements.admin.newAccountFullname.focus(), 50);
        });
    }

    if (domElements.admin.addAccountClose) {
        domElements.admin.addAccountClose.addEventListener('click', () => {
            domElements.admin.addAccountModal.classList.remove('show');
        });
    }

    if (domElements.admin.viewPasswordClose) {
        domElements.admin.viewPasswordClose.addEventListener('click', () => {
            domElements.admin.viewPasswordModal.classList.remove('show');
        });
    }

    if (domElements.admin.editEmployeeInfoClose) {
        domElements.admin.editEmployeeInfoClose.addEventListener('click', () => {
            domElements.admin.editEmployeeInfoModal.classList.remove('show');
        });
    }

    if (domElements.admin.editEmployeeInfoForm) {
        domElements.admin.editEmployeeInfoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = domElements.admin.editEmployeeInfoUsername.value;
            const position = domElements.admin.editEmployeeInfoPosition.value.trim();
            const division = domElements.admin.editEmployeeInfoDivision.value;

            if (!position || !division) {
                showToast('Position and Division are required.', 'error');
                return;
            }

            const user = appState.existingUsers.find(u => u.username === username);
            if (!user) return;

            const updatedUser = { ...user, position, division };
            await API.saveUser(updatedUser);

            appState.activeAccountDivisionTab = division;
            domElements.admin.editEmployeeInfoModal.classList.remove('show');
            renderAdminAccountsTable();
            showToast('Employee info updated successfully!', 'success');
        });
    }

    if (domElements.admin.addAccountForm) {
        domElements.admin.addAccountForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fullname = domElements.admin.newAccountFullname.value.trim();
            const username = domElements.admin.newAccountUsername.value.trim();
            const position = domElements.admin.newAccountPosition.value.trim();
            const division = domElements.admin.newAccountDivision.value;
            const password = domElements.admin.newAccountPassword.value;

            if (!fullname || !username || !password || !position || !division) {
                showToast('Please fill all fields', 'error');
                return;
            }
            
            if (appState.existingUsers.find(u => u.username.toLowerCase() === username.toLowerCase())) {
                showToast('This username is already taken. Please choose another.', 'error');
                return;
            }
            
            if (appState.existingUsers.find(u => u.fullName && u.fullName.toLowerCase() === fullname.toLowerCase())) {
                showToast('An account with this full name already exists.', 'error');
                return;
            }
            
            const newUser = { username, password, originalPassword: password, role: 'employee', fullName: fullname, position, division };
            await API.saveUser(newUser);
            
            showToast('Employee account created successfully!');
            domElements.admin.addAccountModal.classList.remove('show');
            renderAdminAccountsTable();
        });
    }

    uiManager.renderAdminAccountsTable = renderAdminAccountsTable;
};
