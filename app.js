document.addEventListener('DOMContentLoaded', () => {
    // ---- DOM Elements ----
    const app = {
        views: {
            login: document.getElementById('login-view'),
            register: document.getElementById('register-view'),
            employee: document.getElementById('employee-view'),
            admin: document.getElementById('admin-view'),
            settings: document.getElementById('settings-view')
        },
        auth: {
            loginForm: document.getElementById('login-form'),
            loginUsername: document.getElementById('login-username'),
            loginPassword: document.getElementById('login-password'),
            registerForm: document.getElementById('register-form'),
            registerFullname: document.getElementById('register-fullname'),
            registerUsername: document.getElementById('register-username'),
            registerPosition: document.getElementById('register-position'),
            registerPassword: document.getElementById('register-password'),
            goToRegister: document.getElementById('go-to-register'),
            goToLogin: document.getElementById('go-to-login')
        },
        employee: {
            welcome: document.getElementById('employee-welcome'),
            settingsBtn: document.getElementById('employee-settings'),
            logoutBtn: document.getElementById('employee-logout'),
            form: document.getElementById('rating-form'),
            preSubmitBtn: document.getElementById('pre-submit-btn'),
            liveTotal: document.getElementById('live-total'),
            numberInputs: document.querySelectorAll('.rating-table input[type="number"]'), // will be dynamic
            raterName: document.getElementById('form-rater-name'),
            raterRole: document.querySelector('.rater-role'),
            dynamicTable: document.getElementById('dynamic-rating-table'),
            prevPageBtn: document.getElementById('prev-page-btn'),
            nextPageBtn: document.getElementById('next-page-btn'),
            pageIndicator: document.getElementById('page-indicator')
        },
        admin: {
            el: document.getElementById('admin-view'),
            welcome: document.getElementById('admin-welcome'),
            logoutBtn: document.getElementById('admin-logout'),
            tbody: document.getElementById('admin-ratings-tbody'),
            clearBtn: document.getElementById('clear-data-btn'),
            emptyState: document.getElementById('no-ratings-msg'),
            settingsBtn: document.getElementById('admin-settings'),
            exportBtn: document.getElementById('export-excel-btn'),
            historyBtn: document.getElementById('history-btn'),
            historyModal: document.getElementById('history-modal'),
            historyClose: document.querySelector('#history-modal .close-modal'),
            historyTbody: document.getElementById('history-tbody'),
            restoreAllBtn: document.getElementById('restore-all-btn'),
            deleteAllHistoryBtn: document.getElementById('delete-all-history-btn'),
            noHistoryMsg: document.getElementById('no-history-msg'),
            applicantHistoryBtn: document.getElementById('applicant-history-btn'),
            applicantHistoryModal: document.getElementById('applicant-history-modal'),
            applicantHistoryClose: document.querySelector('#applicant-history-modal .close-modal'),
            applicantHistoryTbody: document.getElementById('applicant-history-tbody'),
            restoreAllApplicantsBtn: document.getElementById('restore-all-applicants-btn'),
            deleteAllApplicantsHistoryBtn: document.getElementById('delete-all-applicants-history-btn'),
            noApplicantHistoryMsg: document.getElementById('no-applicant-history-msg'),
            applicantsTbody: document.getElementById('admin-applicants-tbody'),
            noApplicantsMsg: document.getElementById('no-applicants-msg'),
            openAddApplicantBtn: document.getElementById('open-add-applicant-btn'),
            addApplicantModal: document.getElementById('add-applicant-modal'),
            addApplicantForm: document.getElementById('add-applicant-form'),
            newApplicantName: document.getElementById('new-applicant-name'),
            newApplicantPosition: document.getElementById('new-applicant-position'),
            newCredentialInput: document.getElementById('new-credential-input'),
            addCredentialBtn: document.getElementById('add-credential-btn'),
            credentialsList: document.getElementById('credentials-list'),
            addApplicantClose: document.querySelector('#add-applicant-modal .close-modal')
        },
        modal: {
            el: document.getElementById('details-modal'),
            close: document.querySelector('#details-modal .close-modal'),
            body: document.getElementById('modal-details-body')
        },
        confirmModal: {
            el: document.getElementById('confirm-modal'),
            title: document.getElementById('confirm-title'),
            message: document.getElementById('confirm-message'),
            okBtn: document.getElementById('confirm-ok'),
            cancelBtn: document.getElementById('confirm-cancel')
        },
        settings: {
            form: document.getElementById('settings-form'),
            fullname: document.getElementById('settings-fullname'),
            positionGroup: document.getElementById('settings-position-group'),
            position: document.getElementById('settings-position'),
            password: document.getElementById('settings-password'),
            backBtn: document.getElementById('settings-back'),
            deleteBtn: document.getElementById('delete-account-btn')
        },
        toast: document.getElementById('toast')
    };

    // ---- State Management ----
    let currentUser = JSON.parse(localStorage.getItem('ratingSystem_currentUser')) || null;
    
    // Initialize users
    let existingUsers = JSON.parse(localStorage.getItem('ratingSystem_users')) || [];
    
    // Inject pre-made admin or forcefully fix it if corrupted
    const adminIndex = existingUsers.findIndex(u => u.username === 'admin');
    if (adminIndex === -1) {
        existingUsers.push({ username: 'admin', password: 'admin123', role: 'admin', fullName: 'System Administrator' });
    } else {
        existingUsers[adminIndex].password = 'admin123';
        existingUsers[adminIndex].role = 'admin';
        if (!existingUsers[adminIndex].fullName) existingUsers[adminIndex].fullName = 'System Administrator';
    }
    localStorage.setItem('ratingSystem_users', JSON.stringify(existingUsers));
    
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
    
    // Initialize ratings if empty
    if (!localStorage.getItem('ratingSystem_ratings')) {
        localStorage.setItem('ratingSystem_ratings', JSON.stringify([]));
    }
    if (!localStorage.getItem('ratingSystem_deletedRatings')) {
        localStorage.setItem('ratingSystem_deletedRatings', JSON.stringify([]));
    }
    if (!localStorage.getItem('ratingSystem_applicants')) {
        localStorage.setItem('ratingSystem_applicants', JSON.stringify([]));
    }
    if (!localStorage.getItem('ratingSystem_deletedApplicants')) {
        localStorage.setItem('ratingSystem_deletedApplicants', JSON.stringify([]));
    }

    // ---- Theme Toggle Logic ----
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeIcon = themeToggleBtn ? themeToggleBtn.querySelector('i') : null;
    
    // Check local storage for theme
    const savedTheme = localStorage.getItem('ratingSystem_theme') || 'light';
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        if (themeIcon) {
            themeIcon.classList.remove('bx-moon');
            themeIcon.classList.add('bx-sun');
        }
    }

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            // Apply global transition class temporarily for smooth toggle
            document.documentElement.classList.add('theme-transition');
            
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            
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
            
            // Remove the transition class after transition finishes
            setTimeout(() => {
                document.documentElement.classList.remove('theme-transition');
            }, 300);
        });
    }

    // ---- Global State Variables ----
    let editingApplicantId = null;
    let currentFormCredentials = [];
    let currentEmployeePage = 0;
    const APPLICANTS_PER_PAGE = 15;
    let currentPendingApplicants = [];

    const RATING_CRITERIA = [
        "COMMUNICATION SKILLS",
        "LEADERSHIP SKILLS",
        "PLANNING/DECISION MAKING",
        "WORK-ORIENTED/DEDICATION & COMMITMENT",
        "QUALITY OF WORK",
        "CREATIVE, SIMPLE & EFFICIENT",
        "PERSONAL CONDUCT/BEHAVIOR",
        "SERVICE-ORIENTED/WORK ATTITUDE",
        "MORAL VALUES",
        "TEAMWORK",
        "MANNER & APPEARANCE"
    ];
    const MAX_POINTS = [3, 2, 2, 1, 1, 1, 3, 2, 2, 2, 1];

    // ---- Utility Functions ----
    const getLastName = (fullName) => {
        if (!fullName) return "";
        if (fullName.includes(',')) {
            return fullName.split(',')[0].trim().toLowerCase();
        }
        const parts = fullName.trim().split(/\s+/);
        return parts[parts.length - 1].toLowerCase();
    };

    const showToast = (msg, type = 'success') => {
        app.toast.textContent = msg;
        app.toast.className = `toast show ${type}`;
        setTimeout(() => {
            app.toast.className = 'toast';
        }, 3000);
    };

    const switchView = (viewName) => {
        Object.values(app.views).forEach(view => view.classList.remove('active'));
        app.views[viewName].classList.add('active');
        
        if (viewName === 'employee') {
            app.employee.welcome.textContent = `Welcome, ${currentUser.fullName || currentUser.username}`;
            app.employee.raterName.textContent = currentUser.fullName || currentUser.username;
            if (app.employee.raterRole) {
                app.employee.raterRole.textContent = currentUser.position || 'Employee';
            }
            currentEmployeePage = 0;
            renderEmployeeRatingTable();
        } else if (viewName === 'admin') {
            app.admin.welcome.textContent = `Welcome, ${currentUser.fullName || currentUser.username}`;
            renderAdminTable();
            renderAdminApplicantsTable();
            
            const overviewTabBtn = document.querySelector('.admin-tab-btn[data-tab="overview"]');
            if (overviewTabBtn) overviewTabBtn.click();
        } else if (viewName === 'settings') {
            app.settings.fullname.value = currentUser.fullName || currentUser.username;
            app.settings.password.value = '';
            if (currentUser.role === 'admin') {
                if (app.settings.positionGroup) app.settings.positionGroup.style.display = 'none';
                if (app.settings.position) app.settings.position.removeAttribute('required');
            } else {
                if (app.settings.positionGroup) app.settings.positionGroup.style.display = 'block';
                if (app.settings.position) {
                    app.settings.position.setAttribute('required', 'required');
                    app.settings.position.value = currentUser.position || '';
                }
            }
        } else if (viewName === 'login' || viewName === 'register') {
            app.auth.loginForm.reset();
            app.auth.registerForm.reset();
            // Reset any active "show password" toggles
            document.querySelectorAll('.input-wrapper input[type="text"]').forEach(input => {
                if (input.id.includes('password')) {
                    input.type = 'password';
                    const btn = input.parentElement.querySelector('.toggle-password i');
                    if (btn) {
                        btn.classList.remove('bx-hide');
                        btn.classList.add('bx-show');
                    }
                }
            });
            
            if (viewName === 'login') {
                setTimeout(() => app.auth.loginUsername.focus(), 50);
            } else if (viewName === 'register') {
                setTimeout(() => app.auth.registerFullname.focus(), 50);
            }
        }
    };

    const checkAuthStatus = () => {
        const users = JSON.parse(localStorage.getItem('ratingSystem_users'));
        // Special case: if trying to login and user was deleted, logout
        if (currentUser && !users.find(u => u.username === currentUser.username)) {
            currentUser = null;
            localStorage.removeItem('ratingSystem_currentUser');
        }

        if (currentUser) {
            if (currentUser.role === 'admin') switchView('admin');
            else switchView('employee');
        } else {
            switchView('login');
        }
    };

    // Custom Confirm Modal Logic
    const showConfirm = (title, message, onConfirm, okText = 'Confirm') => {
        app.confirmModal.title.textContent = title;
        app.confirmModal.message.innerHTML = message; // Allow HTML styling
        app.confirmModal.okBtn.textContent = okText;
        app.confirmModal.el.classList.add('show');
        
        const cleanup = () => {
            app.confirmModal.el.classList.remove('show');
            app.confirmModal.okBtn.removeEventListener('click', okHandler);
            app.confirmModal.cancelBtn.removeEventListener('click', cancelHandler);
            setTimeout(() => { app.confirmModal.okBtn.textContent = 'Confirm'; }, 300);
        };

        const okHandler = () => {
            cleanup();
            if (onConfirm) onConfirm();
        };

        const cancelHandler = () => {
            cleanup();
        };

        app.confirmModal.okBtn.addEventListener('click', okHandler);
        app.confirmModal.cancelBtn.addEventListener('click', cancelHandler);
    };

    // ---- Auth Logic ----
    app.auth.goToRegister.addEventListener('click', () => switchView('register'));
    app.auth.goToLogin.addEventListener('click', () => switchView('login'));

    // Admin Tabs Logic
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetTab = e.currentTarget.getAttribute('data-tab');
            
            // Update buttons
            document.querySelectorAll('.admin-tab-btn').forEach(b => {
                b.classList.remove('primary-btn');
                b.classList.add('outline-btn');
            });
            e.currentTarget.classList.remove('outline-btn');
            e.currentTarget.classList.add('primary-btn');
            
            // Update content
            document.querySelectorAll('.admin-tab-content').forEach(c => {
                c.style.display = 'none';
            });
            document.getElementById(`admin-tab-${targetTab}`).style.display = 'block';
        });
    });

    app.auth.loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = app.auth.loginUsername.value.trim();
        const password = app.auth.loginPassword.value;
        
        if (!username || !password) {
            showToast('Please fill all fields', 'error');
            return;
        }

        const users = JSON.parse(localStorage.getItem('ratingSystem_users'));
        const user = users.find(u => u.username === username && u.password === password);
        
        if (user) {
            currentUser = user;
            localStorage.setItem('ratingSystem_currentUser', JSON.stringify(currentUser));
            showToast('Login successful!');
            app.auth.loginForm.reset();
            checkAuthStatus();
        } else {
            showToast('Invalid credentials', 'error');
        }
    });

    app.auth.registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fullname = app.auth.registerFullname.value.trim();
        const username = app.auth.registerUsername.value.trim();
        const position = app.auth.registerPosition ? app.auth.registerPosition.value.trim() : 'Employee';
        const password = app.auth.registerPassword.value;

        if (!fullname || !username || !password || (app.auth.registerPosition && !position)) {
            showToast('Please fill all fields', 'error');
            return;
        }

        const users = JSON.parse(localStorage.getItem('ratingSystem_users'));
        
        if (users.find(u => u.username === username)) {
            showToast('This username is already taken. Please choose another.', 'error');
            return;
        }
        
        const newUser = { username, password, role: 'employee', fullName: fullname, position };
        users.push(newUser);
        localStorage.setItem('ratingSystem_users', JSON.stringify(users));
        
        currentUser = newUser;
        localStorage.setItem('ratingSystem_currentUser', JSON.stringify(currentUser));
        showToast('Registration successful!');
        app.auth.registerForm.reset();
        checkAuthStatus();
    });

    const logout = () => {
        showConfirm('Logout', 'Are you sure you want to log out?', () => {
            currentUser = null;
            localStorage.removeItem('ratingSystem_currentUser');
            app.auth.loginForm.reset();
            if(app.auth.registerForm) app.auth.registerForm.reset();
            showToast('Logged out');
            checkAuthStatus();
        });
    };

    app.employee.logoutBtn.addEventListener('click', logout);
    app.admin.logoutBtn.addEventListener('click', logout);

    // ---- Employee Rating Logic ----
    const updateLiveTotal = () => {
        app.employee.numberInputs = document.querySelectorAll('.rating-table input[type="number"]');
        const startIdx = currentEmployeePage * APPLICANTS_PER_PAGE;
        const pageApplicants = currentPendingApplicants.slice(startIdx, startIdx + APPLICANTS_PER_PAGE);

        pageApplicants.forEach((_, colIndex) => {
            let total = 0;
            for (let i = 0; i < RATING_CRITERIA.length; i++) {
                const input = document.getElementById(`score-${i}-${colIndex}`);
                if (input && input.value !== "") {
                    let val = parseFloat(input.value);
                    const max = parseFloat(input.max);
                    if (val > max) {
                        input.value = max;
                        val = max;
                    } else if (val < 0) {
                        input.value = 0;
                        val = 0;
                    }
                    total += val || 0;
                }
            }
            const totalDisplay = document.getElementById(`total-${colIndex}`);
            if (totalDisplay) {
                totalDisplay.textContent = total;
            }
        });
    };

    const renderEmployeeRatingTable = () => {
        if (!app.employee.dynamicTable) return;

        const applicants = JSON.parse(localStorage.getItem('ratingSystem_applicants')) || [];
        const ratings = JSON.parse(localStorage.getItem('ratingSystem_ratings')) || [];
        
        const raterName = currentUser.fullName || currentUser.username;
        const ratedCombos = ratings
            .filter(r => r.rater === raterName)
            .map(r => `${r.applicant}|${r.position}`);
            
        currentPendingApplicants = applicants.filter(a => !ratedCombos.includes(`${a.name}|${a.position}`));
        
        // Sort alphabetically by applicant last name
        currentPendingApplicants.sort((a, b) => getLastName(a.name).localeCompare(getLastName(b.name)));

        if (currentPendingApplicants.length === 0) {
            app.employee.dynamicTable.innerHTML = '<tr><td style="text-align: center; padding: 40px; color: var(--text-muted);">No pending applicants to rate</td></tr>';
            if (app.employee.preSubmitBtn) app.employee.preSubmitBtn.disabled = true;
            if (app.employee.prevPageBtn) app.employee.prevPageBtn.style.display = 'none';
            if (app.employee.nextPageBtn) app.employee.nextPageBtn.style.display = 'none';
            if (app.employee.pageIndicator) app.employee.pageIndicator.style.display = 'none';
            return;
        }

        if (app.employee.preSubmitBtn) app.employee.preSubmitBtn.disabled = false;
        
        const totalPages = Math.ceil(currentPendingApplicants.length / APPLICANTS_PER_PAGE);
        if (currentEmployeePage >= totalPages) currentEmployeePage = totalPages - 1;
        
        if (app.employee.prevPageBtn && app.employee.nextPageBtn) {
            app.employee.prevPageBtn.style.display = 'inline-flex';
            app.employee.nextPageBtn.style.display = 'inline-flex';
            app.employee.pageIndicator.style.display = 'inline-block';
            
            app.employee.prevPageBtn.disabled = currentEmployeePage === 0;
            app.employee.nextPageBtn.disabled = currentEmployeePage >= totalPages - 1;
            app.employee.pageIndicator.textContent = `Page ${currentEmployeePage + 1} of ${totalPages}`;
        }

        const startIdx = currentEmployeePage * APPLICANTS_PER_PAGE;
        const pageApplicants = currentPendingApplicants.slice(startIdx, startIdx + APPLICANTS_PER_PAGE);

        let tableHTML = `
            <thead>
                <tr>
                    <th>CRITERIA/ATTRIBUTES</th>
                    <th class="points-col">POINTS</th>`;
                    
        pageApplicants.forEach(app => {
            let tooltip = app.credentials && app.credentials.length > 0 
                ? 'Credentials:&#10;• ' + app.credentials.join('&#10;• ') 
                : 'No credentials';
            tableHTML += `<th style="text-align: center; min-width: 120px;" class="tooltip-container" data-tooltip="${tooltip}">${app.name}<br><small style="font-weight: 400; color: var(--text-muted);">${app.position}</small></th>`;
        });
        
        tableHTML += `
                </tr>
            </thead>
            <tbody>`;

        RATING_CRITERIA.forEach((criteria, rowIdx) => {
            tableHTML += `
                <tr>
                    <td>${criteria}</td>
                    <td class="points-col">${MAX_POINTS[rowIdx]}</td>`;
                    
            pageApplicants.forEach((_, colIdx) => {
                tableHTML += `<td style="text-align: center;"><input type="number" id="score-${rowIdx}-${colIdx}" min="0" max="${MAX_POINTS[rowIdx]}" step="0.5" required></td>`;
            });
            tableHTML += `</tr>`;
        });

        tableHTML += `
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="2" class="total-label" style="text-align: right; padding-right: 20px;">Total Score</td>`;
                    
        pageApplicants.forEach((_, colIdx) => {
            tableHTML += `<td style="text-align: center; font-weight: bold;"><span id="total-${colIdx}">0</span> / 20</td>`;
        });

        tableHTML += `
                </tr>
            </tfoot>`;
            
        app.employee.dynamicTable.innerHTML = tableHTML;
        
        app.employee.numberInputs = document.querySelectorAll('.rating-table input[type="number"]');
        app.employee.numberInputs.forEach(input => {
            input.addEventListener('input', updateLiveTotal);
        });
    };

    if (app.employee.prevPageBtn) {
        app.employee.prevPageBtn.addEventListener('click', () => {
            if (currentEmployeePage > 0) {
                currentEmployeePage--;
                renderEmployeeRatingTable();
            }
        });
    }

    if (app.employee.nextPageBtn) {
        app.employee.nextPageBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(currentPendingApplicants.length / APPLICANTS_PER_PAGE);
            if (currentEmployeePage < totalPages - 1) {
                currentEmployeePage++;
                renderEmployeeRatingTable();
            }
        });
    }

    if (app.employee.preSubmitBtn) {
        app.employee.preSubmitBtn.addEventListener('click', () => {
            if(!app.employee.form.checkValidity()) {
                app.employee.form.reportValidity();
                return;
            }

            const startIdx = currentEmployeePage * APPLICANTS_PER_PAGE;
            const pageApplicants = currentPendingApplicants.slice(startIdx, startIdx + APPLICANTS_PER_PAGE);
            
            if (pageApplicants.length === 0) return;

            const confirmMessage = `
                You are about to submit ratings for <strong>${pageApplicants.length} applicant(s)</strong>.<br><br>
                Please ensure all scores are correct before submitting.
            `;

            showConfirm('Submit Ratings?', confirmMessage, () => {
                submitRating();
            });
        });
    }

    const submitRating = () => {
        const startIdx = currentEmployeePage * APPLICANTS_PER_PAGE;
        const pageApplicants = currentPendingApplicants.slice(startIdx, startIdx + APPLICANTS_PER_PAGE);
        const ratings = JSON.parse(localStorage.getItem('ratingSystem_ratings')) || [];
        
        pageApplicants.forEach((applicant, colIdx) => {
            let scores = [];
            let totalScore = 0;
            const maxScore = 20;

            for (let rowIdx = 0; rowIdx < RATING_CRITERIA.length; rowIdx++) {
                const input = document.getElementById(`score-${rowIdx}-${colIdx}`);
                const val = input ? (parseFloat(input.value) || 0) : 0;
                scores.push(val);
                totalScore += val;
            }

            const ratingRecord = {
                id: Date.now().toString() + '-' + colIdx,
                date: new Date().toLocaleDateString(),
                rater: currentUser.fullName || currentUser.username,
                raterPosition: currentUser.position || 'Employee',
                position: applicant.position,
                applicant: applicant.name,
                credentials: applicant.credentials ? [...applicant.credentials] : [],
                scores,
                totalScore,
                maxScore
            };
            ratings.push(ratingRecord);
        });

        localStorage.setItem('ratingSystem_ratings', JSON.stringify(ratings));

        showToast(`Successfully submitted ${pageApplicants.length} ratings!`);
        app.employee.form.reset();
        
        currentEmployeePage = 0;
        renderEmployeeRatingTable(); 
    };

    // Employee form actual submit event (prevent default just in case)
    app.employee.form.addEventListener('submit', (e) => e.preventDefault());

    // ---- Admin Dashboard Logic ----
    const renderAdminTable = () => {
        const ratings = JSON.parse(localStorage.getItem('ratingSystem_ratings')) || [];
        app.admin.tbody.innerHTML = '';
        
        if (ratings.length === 0) {
            app.admin.emptyState.classList.remove('hidden');
            app.admin.tbody.parentElement.classList.add('hidden');
            return;
        }

        app.admin.emptyState.classList.add('hidden');
        app.admin.tbody.parentElement.classList.remove('hidden');

        // Group ratings by Rater
        const groupedRatings = {};
        ratings.forEach(rating => {
            const key = rating.rater;
            if (!groupedRatings[key]) {
                groupedRatings[key] = {
                    rater: rating.rater,
                    positions: new Set(),
                    latestDate: rating.date,
                    applicants: []
                };
            }
            groupedRatings[key].latestDate = rating.date;
            groupedRatings[key].positions.add(rating.position);
            groupedRatings[key].applicants.push(rating);
        });

        const sortedGroups = Object.values(groupedRatings).sort((a, b) => getLastName(a.rater).localeCompare(getLastName(b.rater)));

        sortedGroups.forEach(group => {
            const tr = document.createElement('tr');
            const positionsStr = Array.from(group.positions).join(', ');
            
            tr.innerHTML = `
                <td>${group.latestDate}</td>
                <td>${group.rater}</td>
                <td>${positionsStr}</td>
                <td style="font-weight: 600;">${group.applicants.length} Applicant(s)</td>
                <td>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <button class="btn outline-btn view-btn" data-rater="${group.rater}">View Details</button>
                        <button class="btn outline-btn export-row-btn" data-rater="${group.rater}" style="padding: 8px 12px;" title="Export to Excel"><i class='bx bx-export'></i></button>
                    </div>
                </td>
            `;
            app.admin.tbody.appendChild(tr);
        });

        // Add event listeners
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const rater = e.currentTarget.getAttribute('data-rater');
                openDetailsModal(rater);
            });
        });
        document.querySelectorAll('.export-row-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const rater = e.currentTarget.getAttribute('data-rater');
                exportRaterToExcel(rater);
            });
        });
    };

    const exportRaterToExcel = (rater) => {
        const ratings = JSON.parse(localStorage.getItem('ratingSystem_ratings')) || [];
        const raterRatings = ratings.filter(r => r.rater === rater);
        if (raterRatings.length === 0) {
            showToast('No data to export', 'error');
            return;
        }

        // Sort alphabetically by applicant last name
        raterRatings.sort((a, b) => getLastName(a.applicant).localeCompare(getLastName(b.applicant)));

        const criteriaNames = [
            "COMMUNICATION SKILLS",
            "LEADERSHIP SKILLS",
            "PLANNING/DECISION MAKING",
            "WORK-ORIENTED/DEDICATION & COMMITMENT",
            "QUALITY OF WORK",
            "CREATIVE, SIMPLE & EFFICIENT",
            "PERSONAL CONDUCT/BEHAVIOR",
            "SERVICE-ORIENTED/WORK ATTITUDE",
            "MORAL VALUES",
            "TEAMWORK",
            "MANNER & APPEARANCE"
        ];
        const maxPoints = [3, 2, 2, 1, 1, 1, 3, 2, 2, 2, 1];

        const workbook = XLSX.utils.book_new();
        const aoa = [];

        // Title (Row 0)
        aoa.push(["POTENTIAL & PSYCHOSOCIAL ATTRIBUTES/PERSONALITY TRAITS - BEI"]);
        // Empty row (Row 1)
        aoa.push([]);

        // Headers: Names (Row 2)
        const headerRowName = ["CRITERIA/ATTRIBUTES", "POINTS"];
        raterRatings.forEach(r => {
            headerRowName.push(r.applicant.toUpperCase());
        });
        aoa.push(headerRowName);

        // Headers: Positions (Row 3)
        const headerRowPos = ["", ""];
        raterRatings.forEach(r => {
            headerRowPos.push(r.position.toUpperCase());
        });
        aoa.push(headerRowPos);

        // Criteria Rows (Rows 4-14)
        criteriaNames.forEach((criteria, index) => {
            const row = [criteria, maxPoints[index]];
            raterRatings.forEach(r => {
                row.push(r.scores[index] !== undefined ? r.scores[index] : "");
            });
            aoa.push(row);
        });

        // Total Score (Row 15)
        const totalRow = ["", "TOTAL SCORE:"];
        raterRatings.forEach(r => {
            totalRow.push(r.totalScore);
        });
        aoa.push(totalRow);

        // Footer
        const raterPosition = raterRatings[0].raterPosition || 'Employee';
        aoa.push([]);
        aoa.push(["", "RATER:"]);
        aoa.push([]);
        aoa.push(["", rater.toUpperCase()]);
        aoa.push(["", raterPosition]);

        const worksheet = XLSX.utils.aoa_to_sheet(aoa);

        // Auto-fit column widths based on longest text
        const colWidths = [];
        aoa.forEach((row, rowIdx) => {
            if (rowIdx === 0) return; // skip the title row which spans multiple columns

            row.forEach((cell, colIdx) => {
                const cellVal = cell !== undefined && cell !== null ? cell.toString() : "";
                const maxLineLen = cellVal.split('\n').reduce((max, line) => Math.max(max, line.length), 0);
                
                if (!colWidths[colIdx]) {
                    colWidths[colIdx] = { wch: Math.max(10, maxLineLen + 2) }; // Minimum width 10
                } else {
                    colWidths[colIdx].wch = Math.max(colWidths[colIdx].wch, maxLineLen + 2);
                }
            });
        });
        worksheet['!cols'] = colWidths;

        // Merge cells
        worksheet['!merges'] = [
            // Title merge
            { s: { r: 0, c: 0 }, e: { r: 0, c: Math.max(1, raterRatings.length + 1) } },
            // CRITERIA/ATTRIBUTES vertical merge
            { s: { r: 2, c: 0 }, e: { r: 3, c: 0 } },
            // POINTS vertical merge
            { s: { r: 2, c: 1 }, e: { r: 3, c: 1 } }
        ];

        // Ensure text wrapping and alignment
        for (let R = 2; R <= 3; ++R) {
            for (let C = 0; C <= raterRatings.length + 1; ++C) {
                const cellRef = XLSX.utils.encode_cell({r: R, c: C});
                if (worksheet[cellRef]) {
                    if (!worksheet[cellRef].s) worksheet[cellRef].s = {};
                    worksheet[cellRef].s.alignment = { vertical: 'center', horizontal: 'center' };
                }
            }
        }

        const safeSheetName = "Rating Details";
        XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName);

        const safeRaterName = rater.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        XLSX.writeFile(workbook, `${safeRaterName}_ratings.xlsx`);
        showToast(`Exported ${rater}'s submissions!`, 'success');
    };

    const deleteRatingGroup = (rater) => {
        showConfirm('Delete Submissions', 'Are you sure you want to delete these submissions? They will be moved to history.', () => {
            let ratings = JSON.parse(localStorage.getItem('ratingSystem_ratings')) || [];
            let deletedRatings = JSON.parse(localStorage.getItem('ratingSystem_deletedRatings')) || [];
            
            const toDelete = ratings.filter(r => r.rater === rater);
            const toKeep = ratings.filter(r => r.rater !== rater);
            
            deletedRatings.push(...toDelete);
            localStorage.setItem('ratingSystem_ratings', JSON.stringify(toKeep));
            localStorage.setItem('ratingSystem_deletedRatings', JSON.stringify(deletedRatings));
            
            renderAdminTable();
            app.modal.el.classList.remove('show');
            showToast('Submissions moved to history.', 'success');
        });
    };

    const renderAdminApplicantsTable = () => {
        const applicants = JSON.parse(localStorage.getItem('ratingSystem_applicants')) || [];
        app.admin.applicantsTbody.innerHTML = '';
        
        if (applicants.length === 0) {
            app.admin.noApplicantsMsg.classList.remove('hidden');
            app.admin.applicantsTbody.parentElement.classList.add('hidden');
            return;
        }

        app.admin.noApplicantsMsg.classList.add('hidden');
        app.admin.applicantsTbody.parentElement.classList.remove('hidden');

        applicants.forEach(applicant => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${applicant.name}</td>
                <td>${applicant.position}</td>
                <td>${applicant.dateAdded || applicant.date || ''}</td>
                <td>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <button class="btn outline-btn edit-applicant-btn" data-id="${applicant.id}" style="padding: 8px 12px;"><i class='bx bx-edit'></i></button>
                        <button class="btn danger-btn delete-applicant-btn" data-id="${applicant.id}" style="padding: 8px 12px;"><i class='bx bx-trash'></i></button>
                    </div>
                </td>
            `;
            app.admin.applicantsTbody.appendChild(tr);
        });

        document.querySelectorAll('.edit-applicant-btn').forEach(btn => {
            btn.addEventListener('click', (e) => editApplicant(e.currentTarget.getAttribute('data-id')));
        });
        
        document.querySelectorAll('.delete-applicant-btn').forEach(btn => {
            btn.addEventListener('click', (e) => deleteApplicant(e.currentTarget.getAttribute('data-id')));
        });
    };

    const deleteApplicant = (id) => {
        showConfirm('Delete Applicant Form', 'Are you sure you want to delete this applicant form? It will be moved to history and employees will no longer be able to rate them.', () => {
            let applicants = JSON.parse(localStorage.getItem('ratingSystem_applicants')) || [];
            let deletedApplicants = JSON.parse(localStorage.getItem('ratingSystem_deletedApplicants')) || [];
            
            const index = applicants.findIndex(a => a.id === id);
            if (index > -1) {
                const deleted = applicants.splice(index, 1)[0];
                deleted.dateDeleted = new Date().toLocaleDateString();
                deletedApplicants.push(deleted);
                localStorage.setItem('ratingSystem_applicants', JSON.stringify(applicants));
                localStorage.setItem('ratingSystem_deletedApplicants', JSON.stringify(deletedApplicants));
                renderAdminApplicantsTable();
                showToast('Applicant form moved to history.', 'success');
            }
        });
    };

    const editApplicant = (id) => {
        const applicants = JSON.parse(localStorage.getItem('ratingSystem_applicants')) || [];
        const applicant = applicants.find(a => a.id === id);
        if (!applicant) return;
        
        editingApplicantId = id;
        document.querySelector('#add-applicant-modal h2').textContent = 'Edit Rating Form';
        document.querySelector('#add-applicant-form button[type="submit"]').textContent = 'Save Changes';
        
        app.admin.newApplicantName.value = applicant.name;
        app.admin.newApplicantPosition.value = applicant.position;
        app.admin.newCredentialInput.value = '';
        currentFormCredentials = applicant.credentials ? [...applicant.credentials] : [];
        renderCredentialsList();
        
        app.admin.addApplicantModal.classList.add('show');
        setTimeout(() => app.admin.newApplicantName.focus(), 50);
    };

    const renderCredentialsList = () => {
        if (!app.admin.credentialsList) return;
        app.admin.credentialsList.innerHTML = '';
        currentFormCredentials.forEach((cred, index) => {
            const li = document.createElement('li');
            li.style.display = 'flex';
            li.style.justifyContent = 'space-between';
            li.style.alignItems = 'center';
            li.style.background = 'rgba(0,0,0,0.05)';
            li.style.padding = '5px 10px';
            li.style.borderRadius = '4px';
            li.style.fontSize = '0.9rem';
            
            const text = document.createElement('span');
            text.textContent = cred;
            
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.innerHTML = '<i class="bx bx-x"></i>';
            removeBtn.style.background = 'none';
            removeBtn.style.border = 'none';
            removeBtn.style.color = 'var(--accent-color)';
            removeBtn.style.cursor = 'pointer';
            removeBtn.style.fontSize = '1.2rem';
            removeBtn.style.padding = '0';
            
            removeBtn.addEventListener('click', () => {
                currentFormCredentials.splice(index, 1);
                renderCredentialsList();
            });
            
            li.appendChild(text);
            li.appendChild(removeBtn);
            app.admin.credentialsList.appendChild(li);
        });
    };

    if (app.admin.addCredentialBtn) {
        app.admin.addCredentialBtn.addEventListener('click', () => {
            const val = app.admin.newCredentialInput.value.trim();
            if (val) {
                if (currentFormCredentials.some(c => c.toLowerCase() === val.toLowerCase())) {
                    showToast('Credential already added', 'error');
                    return;
                }
                currentFormCredentials.push(val);
                app.admin.newCredentialInput.value = '';
                renderCredentialsList();
            }
        });
    }

    if (app.admin.newCredentialInput) {
        app.admin.newCredentialInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                app.admin.addCredentialBtn.click();
            }
        });
    }

    if (app.admin.openAddApplicantBtn) {
        app.admin.openAddApplicantBtn.addEventListener('click', () => {
            editingApplicantId = null;
            currentFormCredentials = [];
            renderCredentialsList();
            document.querySelector('#add-applicant-modal h2').textContent = 'Add Rating Form';
            document.querySelector('#add-applicant-form button[type="submit"]').textContent = 'Create Form';
            app.admin.addApplicantForm.reset();
            app.admin.newCredentialInput.value = '';
            app.admin.addApplicantModal.classList.add('show');
            setTimeout(() => app.admin.newApplicantName.focus(), 50);
        });
    }

    if (app.admin.addApplicantClose) {
        app.admin.addApplicantClose.addEventListener('click', () => {
            app.admin.addApplicantModal.classList.remove('show');
        });
    }

    if (app.admin.addApplicantForm) {
        app.admin.addApplicantForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = app.admin.newApplicantName.value.trim();
            const position = app.admin.newApplicantPosition.value.trim();
            
            if (!name || !position) return;

            let applicants = JSON.parse(localStorage.getItem('ratingSystem_applicants')) || [];
            
            if (editingApplicantId) {
                // Check if another applicant has the exact same name/position
                if (applicants.some(a => a.id !== editingApplicantId && a.name.toLowerCase() === name.toLowerCase() && a.position.toLowerCase() === position.toLowerCase())) {
                    showToast('Another applicant already has this exact Rating Form', 'error');
                    return;
                }
                
                const index = applicants.findIndex(a => a.id === editingApplicantId);
                if (index > -1) {
                    const oldName = applicants[index].name;
                    const oldPosition = applicants[index].position;
                    
                    // Cascade name change to all applicants with the same old name
                    applicants.forEach(a => {
                        if (a.name.toLowerCase() === oldName.toLowerCase()) {
                            a.name = name;
                        }
                    });
                    
                    // Update the position for the specific applicant record being edited
                    applicants[index].position = position;
                    
                    // Sync credentials to ALL applicants with this name
                    applicants.forEach(a => {
                        if (a.name.toLowerCase() === name.toLowerCase()) {
                            a.credentials = [...currentFormCredentials];
                        }
                    });
                    
                    // Cascade update to existing ratings
                    let ratings = JSON.parse(localStorage.getItem('ratingSystem_ratings')) || [];
                    let updatedRatings = false;
                    ratings.forEach(r => {
                        if (r.applicant.toLowerCase() === oldName.toLowerCase()) {
                            r.applicant = name;
                            updatedRatings = true;
                        }
                        if (r.applicant.toLowerCase() === name.toLowerCase() && r.position === oldPosition) {
                            r.position = position;
                            updatedRatings = true;
                        }
                        if (r.applicant.toLowerCase() === name.toLowerCase()) {
                            r.credentials = [...currentFormCredentials];
                            updatedRatings = true;
                        }
                    });
                    if (updatedRatings) {
                        localStorage.setItem('ratingSystem_ratings', JSON.stringify(ratings));
                        renderAdminTable(); 
                    }
                    
                    // Cascade update to deleted ratings
                    let deletedRatings = JSON.parse(localStorage.getItem('ratingSystem_deletedRatings')) || [];
                    let updatedDeleted = false;
                    deletedRatings.forEach(r => {
                        if (r.applicant.toLowerCase() === oldName.toLowerCase()) {
                            r.applicant = name;
                            updatedDeleted = true;
                        }
                        if (r.applicant.toLowerCase() === name.toLowerCase() && r.position === oldPosition) {
                            r.position = position;
                            updatedDeleted = true;
                        }
                        if (r.applicant.toLowerCase() === name.toLowerCase()) {
                            r.credentials = [...currentFormCredentials];
                            updatedDeleted = true;
                        }
                    });
                    if (updatedDeleted) {
                        localStorage.setItem('ratingSystem_deletedRatings', JSON.stringify(deletedRatings));
                    }

                    // Cascade update to deleted applicants
                    let deletedApplicants = JSON.parse(localStorage.getItem('ratingSystem_deletedApplicants')) || [];
                    let updatedDeletedApps = false;
                    deletedApplicants.forEach(a => {
                        if (a.name.toLowerCase() === oldName.toLowerCase()) {
                            a.name = name;
                            updatedDeletedApps = true;
                        }
                        if (a.name.toLowerCase() === name.toLowerCase() && a.position === oldPosition) {
                            a.position = position;
                            updatedDeletedApps = true;
                        }
                        if (a.name.toLowerCase() === name.toLowerCase()) {
                            a.credentials = [...currentFormCredentials];
                            updatedDeletedApps = true;
                        }
                    });
                    if (updatedDeletedApps) {
                        localStorage.setItem('ratingSystem_deletedApplicants', JSON.stringify(deletedApplicants));
                    }
                }
                
                localStorage.setItem('ratingSystem_applicants', JSON.stringify(applicants));
                showToast('Applicant form updated successfully');
            } else {
                if (applicants.some(a => a.name.toLowerCase() === name.toLowerCase() && a.position.toLowerCase() === position.toLowerCase())) {
                    showToast('Applicant already has a Rating Form', 'error');
                    return;
                }

                // Gather existing credentials from others with the same name
                let existingCreds = new Set([...currentFormCredentials]);
                applicants.forEach(a => {
                    if (a.name.toLowerCase() === name.toLowerCase() && a.credentials) {
                        a.credentials.forEach(c => existingCreds.add(c));
                    }
                });
                const unifiedCredentials = Array.from(existingCreds);

                // Update all existing applicants with the same name
                applicants.forEach(a => {
                    if (a.name.toLowerCase() === name.toLowerCase()) {
                        a.credentials = [...unifiedCredentials];
                    }
                });

                // Update all existing ratings and deleted ratings
                let ratings = JSON.parse(localStorage.getItem('ratingSystem_ratings')) || [];
                let updatedRatings = false;
                ratings.forEach(r => {
                    if (r.applicant.toLowerCase() === name.toLowerCase()) {
                        r.credentials = [...unifiedCredentials];
                        updatedRatings = true;
                    }
                });
                if (updatedRatings) localStorage.setItem('ratingSystem_ratings', JSON.stringify(ratings));

                let deletedRatings = JSON.parse(localStorage.getItem('ratingSystem_deletedRatings')) || [];
                let updatedDeleted = false;
                deletedRatings.forEach(r => {
                    if (r.applicant.toLowerCase() === name.toLowerCase()) {
                        r.credentials = [...unifiedCredentials];
                        updatedDeleted = true;
                    }
                });
                if (updatedDeleted) localStorage.setItem('ratingSystem_deletedRatings', JSON.stringify(deletedRatings));

                applicants.push({
                    id: Date.now().toString(),
                    name,
                    position,
                    credentials: [...unifiedCredentials],
                    dateAdded: new Date().toLocaleDateString()
                });

                localStorage.setItem('ratingSystem_applicants', JSON.stringify(applicants));
                showToast('Applicant form added successfully');
            }

            renderAdminApplicantsTable();
            app.admin.addApplicantModal.classList.remove('show');
        });
    }

    const deleteRating = (id) => {
        showConfirm('Delete Rating', 'Are you sure you want to delete this rating? It will be moved to history.', () => {
            const ratings = JSON.parse(localStorage.getItem('ratingSystem_ratings'));
            const deletedRatings = JSON.parse(localStorage.getItem('ratingSystem_deletedRatings')) || [];
            
            const ratingIndex = ratings.findIndex(r => r.id === id);
            if (ratingIndex > -1) {
                const deleted = ratings.splice(ratingIndex, 1)[0];
                deletedRatings.push(deleted);
                localStorage.setItem('ratingSystem_ratings', JSON.stringify(ratings));
                localStorage.setItem('ratingSystem_deletedRatings', JSON.stringify(deletedRatings));
                renderAdminTable();
                
                // If modal is open, refresh it or close it if no ratings left
                const remainingRatings = ratings.filter(r => r.rater === deleted.rater);
                if (remainingRatings.length > 0) {
                    openDetailsModal(deleted.rater);
                } else {
                    app.modal.el.classList.remove('show');
                }

                showToast('Rating moved to history.', 'success');
            }
        });
    };

    if (app.admin.exportBtn) {
        app.admin.exportBtn.addEventListener('click', () => {
            const ratings = JSON.parse(localStorage.getItem('ratingSystem_ratings')) || [];
            if (ratings.length === 0) {
                showToast('No data to export', 'error');
                return;
            }

            // Map ratings to a simpler format for Excel
            const excelData = ratings.map(r => ({
                'Date': r.date,
                'Rater': r.rater,
                'Applicant': r.applicant,
                'Position': r.position,
                'Total Score': r.totalScore,
                'Max Score': r.maxScore
            }));

            // Create a new workbook and add a worksheet
            const worksheet = XLSX.utils.json_to_sheet(excelData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Ratings");

            // Generate file and trigger download
            XLSX.writeFile(workbook, "ratings_export.xlsx");
            showToast('Export successful!', 'success');
        });
    }

    app.admin.clearBtn.addEventListener('click', () => {
        showConfirm('Clear All Data', 'Are you sure you want to delete all submitted ratings? They will be moved to history.', () => {
            const ratings = JSON.parse(localStorage.getItem('ratingSystem_ratings'));
            const deletedRatings = JSON.parse(localStorage.getItem('ratingSystem_deletedRatings')) || [];
            
            deletedRatings.push(...ratings);
            localStorage.setItem('ratingSystem_ratings', JSON.stringify([]));
            localStorage.setItem('ratingSystem_deletedRatings', JSON.stringify(deletedRatings));
            
            renderAdminTable();
            showToast('All ratings moved to history.', 'success');
        });
    });

    const renderHistoryTable = () => {
        const deletedRatings = JSON.parse(localStorage.getItem('ratingSystem_deletedRatings')) || [];
        app.admin.historyTbody.innerHTML = '';
        
        if (deletedRatings.length === 0) {
            app.admin.noHistoryMsg.classList.remove('hidden');
            app.admin.historyTbody.parentElement.classList.add('hidden');
            return;
        }

        app.admin.noHistoryMsg.classList.add('hidden');
        app.admin.historyTbody.parentElement.classList.remove('hidden');

        deletedRatings.sort((a, b) => b.id - a.id).forEach(rating => {
            const tr = document.createElement('tr');

            tr.innerHTML = `
                <td>${rating.date}</td>
                <td>${rating.rater}</td>
                <td>${rating.applicant}</td>
                <td style="font-weight: bold;">${rating.totalScore} / ${rating.maxScore}</td>
                <td>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <button class="btn outline-btn view-rating-btn" data-id="${rating.id}" style="padding: 8px 12px;" title="View"><i class='bx bx-show'></i></button>
                        <button class="btn outline-btn restore-btn" data-id="${rating.id}" style="padding: 8px 12px;" title="Restore"><i class='bx bx-undo'></i></button>
                        <button class="btn danger-btn perm-delete-btn" data-id="${rating.id}" style="padding: 8px 12px;" title="Delete Permanently"><i class='bx bx-trash'></i></button>
                    </div>
                </td>
            `;
            app.admin.historyTbody.appendChild(tr);
        });

        document.querySelectorAll('.view-rating-btn').forEach(btn => {
            btn.addEventListener('click', (e) => viewSingleRating(e.currentTarget.getAttribute('data-id')));
        });
        document.querySelectorAll('.restore-btn').forEach(btn => {
            btn.addEventListener('click', (e) => restoreRating(e.currentTarget.getAttribute('data-id')));
        });
        document.querySelectorAll('.perm-delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => permDeleteRating(e.currentTarget.getAttribute('data-id')));
        });
    };

    const restoreRating = (id) => {
        const ratings = JSON.parse(localStorage.getItem('ratingSystem_ratings')) || [];
        const deletedRatings = JSON.parse(localStorage.getItem('ratingSystem_deletedRatings')) || [];
        
        const ratingIndex = deletedRatings.findIndex(r => r.id === id);
        if (ratingIndex > -1) {
            const restored = deletedRatings[ratingIndex];
            const existingActiveIndex = ratings.findIndex(r => r.rater === restored.rater && r.applicant === restored.applicant && r.position === restored.position);
            
            if (existingActiveIndex > -1) {
                showConfirm('Rating Form Exists', 'This rating form already exists. Do you want to overwrite it?', () => {
                    ratings.splice(existingActiveIndex, 1);
                    const finalRestored = deletedRatings.splice(ratingIndex, 1)[0];
                    ratings.push(finalRestored);
                    localStorage.setItem('ratingSystem_ratings', JSON.stringify(ratings));
                    localStorage.setItem('ratingSystem_deletedRatings', JSON.stringify(deletedRatings));
                    renderHistoryTable();
                    renderAdminTable();
                    showToast('Rating overwritten and restored.', 'success');
                }, 'Overwrite');
            } else {
                showConfirm('Restore Rating', 'Are you sure you want to restore this rating?', () => {
                    const finalRestored = deletedRatings.splice(ratingIndex, 1)[0];
                    ratings.push(finalRestored);
                    localStorage.setItem('ratingSystem_ratings', JSON.stringify(ratings));
                    localStorage.setItem('ratingSystem_deletedRatings', JSON.stringify(deletedRatings));
                    renderHistoryTable();
                    renderAdminTable();
                    showToast('Rating restored successfully.', 'success');
                });
            }
        }
    };

    const viewSingleRating = (id) => {
        const deletedRatings = JSON.parse(localStorage.getItem('ratingSystem_deletedRatings')) || [];
        const rating = deletedRatings.find(r => r.id === id);
        if (!rating) return;
        
        let detailsHtml = `
            <div style="margin-bottom: 20px;">
                <h3 style="text-transform: uppercase; margin-bottom: 5px;">DELETED RATING - BEI</h3>
            </div>
            <div class="table-responsive">
                <table class="data-table" style="min-width: 600px;">
                    <thead>
                        <tr>
                            <th style="width: 50%;">CRITERIA/ATTRIBUTES</th>
                            <th style="width: 25%; text-align: center;">POINTS</th>
                            <th style="text-align: center;">${rating.applicant}<br><span style="font-size: 0.8rem; font-weight: normal; color: var(--text-muted);">${rating.position}</span></th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        const maxPoints = [3, 2, 2, 1, 1, 1, 3, 2, 2, 2, 1];
        
        criteriaNames.forEach((criteria, index) => {
            detailsHtml += `
                <tr>
                    <td>${criteria}</td>
                    <td style="text-align: center; font-weight: 600; color: var(--text-muted);">${maxPoints[index]}</td>
                    <td style="text-align: center; font-weight: bold;">${rating.scores[index] !== undefined ? rating.scores[index] : '-'}</td>
                </tr>
            `;
        });
        
        detailsHtml += `
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="2" style="text-align: right; font-weight: bold; background: rgba(0,0,0,0.04);">TOTAL SCORE:</td>
                            <td style="text-align: center; font-weight: bold; background: rgba(0,0,0,0.04);">${rating.totalScore} / ${rating.maxScore}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            
            <div style="margin-top: 30px; margin-bottom: 10px;">
                <div>
                    <p style="color: var(--text-secondary); font-weight: 600; font-size: 0.9rem; margin-bottom: 5px;">RATER:</p>
                    <div style="border-bottom: 1px solid var(--text-primary); display: inline-block; padding-bottom: 5px; padding-right: 40px; margin-bottom: 5px;">
                        <span style="font-weight: 700; font-size: 1.1rem; text-transform: uppercase;">${rating.rater}</span>
                    </div>
                    <p style="color: var(--text-muted); font-size: 0.85rem;">${rating.raterPosition || 'Employee'}</p>
                </div>
            </div>
        `;

        app.modal.body.innerHTML = detailsHtml;
        app.modal.el.classList.add('show');
    };

    const permDeleteRating = (id) => {
        showConfirm('Delete Permanently', 'Are you sure you want to permanently delete this rating? This cannot be undone.', () => {
            const deletedRatings = JSON.parse(localStorage.getItem('ratingSystem_deletedRatings')) || [];
            const filtered = deletedRatings.filter(r => r.id !== id);
            localStorage.setItem('ratingSystem_deletedRatings', JSON.stringify(filtered));
            renderHistoryTable();
            showToast('Rating permanently deleted.', 'success');
        });
    };

    app.admin.historyBtn.addEventListener('click', () => {
        renderHistoryTable();
        app.admin.historyModal.classList.add('show');
    });

    if(app.admin.historyClose) {
        app.admin.historyClose.addEventListener('click', () => {
            app.admin.historyModal.classList.remove('show');
        });
    }

    app.admin.restoreAllBtn.addEventListener('click', () => {
        const deletedRatings = JSON.parse(localStorage.getItem('ratingSystem_deletedRatings')) || [];
        if (deletedRatings.length === 0) return;

        showConfirm('Restore All', 'Are you sure you want to restore all deleted ratings?', () => {
            const ratings = JSON.parse(localStorage.getItem('ratingSystem_ratings'));
            ratings.push(...deletedRatings);
            localStorage.setItem('ratingSystem_ratings', JSON.stringify(ratings));
            localStorage.setItem('ratingSystem_deletedRatings', JSON.stringify([]));
            renderHistoryTable();
            renderAdminTable();
            showToast('All ratings restored.', 'success');
        });
    });

    app.admin.deleteAllHistoryBtn.addEventListener('click', () => {
        const deletedRatings = JSON.parse(localStorage.getItem('ratingSystem_deletedRatings')) || [];
        if (deletedRatings.length === 0) return;

        showConfirm('Delete All Permanently', 'Are you sure you want to permanently delete all history? This cannot be undone.', () => {
            localStorage.setItem('ratingSystem_deletedRatings', JSON.stringify([]));
            renderHistoryTable();
            showToast('History cleared permanently.', 'success');
        });
    });

    const renderApplicantHistoryTable = () => {
        const deletedApplicants = JSON.parse(localStorage.getItem('ratingSystem_deletedApplicants')) || [];
        app.admin.applicantHistoryTbody.innerHTML = '';
        
        if (deletedApplicants.length === 0) {
            app.admin.noApplicantHistoryMsg.classList.remove('hidden');
            app.admin.applicantHistoryTbody.parentElement.classList.add('hidden');
            return;
        }

        app.admin.noApplicantHistoryMsg.classList.add('hidden');
        app.admin.applicantHistoryTbody.parentElement.classList.remove('hidden');

        deletedApplicants.sort((a, b) => b.id - a.id).forEach(applicant => {
            const tr = document.createElement('tr');

            tr.innerHTML = `
                <td>${applicant.name}</td>
                <td>${applicant.position}</td>
                <td>${applicant.dateDeleted || applicant.dateAdded || ''}</td>
                <td>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <button class="btn outline-btn restore-applicant-btn" data-id="${applicant.id}" style="padding: 8px 12px;"><i class='bx bx-undo'></i></button>
                        <button class="btn danger-btn perm-delete-applicant-btn" data-id="${applicant.id}" style="padding: 8px 12px;"><i class='bx bx-trash'></i></button>
                    </div>
                </td>
            `;
            app.admin.applicantHistoryTbody.appendChild(tr);
        });

        document.querySelectorAll('.restore-applicant-btn').forEach(btn => {
            btn.addEventListener('click', (e) => restoreApplicant(e.currentTarget.getAttribute('data-id')));
        });
        document.querySelectorAll('.perm-delete-applicant-btn').forEach(btn => {
            btn.addEventListener('click', (e) => permDeleteApplicant(e.currentTarget.getAttribute('data-id')));
        });
    };

    const restoreApplicant = (id) => {
        const applicants = JSON.parse(localStorage.getItem('ratingSystem_applicants')) || [];
        const deletedApplicants = JSON.parse(localStorage.getItem('ratingSystem_deletedApplicants')) || [];
        
        const index = deletedApplicants.findIndex(a => a.id === id);
        if (index > -1) {
            const applicantToRestore = deletedApplicants[index];
            const existingActiveIndex = applicants.findIndex(a => a.name.toLowerCase() === applicantToRestore.name.toLowerCase() && a.position.toLowerCase() === applicantToRestore.position.toLowerCase());
            
            if (existingActiveIndex > -1) {
                showConfirm('Applicant Rating Form Exists', 'This Applicant Rating Form already exists. Do you want to overwrite it?', () => {
                    applicants.splice(existingActiveIndex, 1);
                    const restored = deletedApplicants.splice(index, 1)[0];
                    applicants.push(restored);
                    localStorage.setItem('ratingSystem_applicants', JSON.stringify(applicants));
                    localStorage.setItem('ratingSystem_deletedApplicants', JSON.stringify(deletedApplicants));
                    renderApplicantHistoryTable();
                    renderAdminApplicantsTable();
                    showToast('Applicant overwritten and restored.', 'success');
                }, 'Overwrite');
            } else {
                showConfirm('Restore Applicant', 'Are you sure you want to restore this applicant?', () => {
                    const restored = deletedApplicants.splice(index, 1)[0];
                    applicants.push(restored);
                    localStorage.setItem('ratingSystem_applicants', JSON.stringify(applicants));
                    localStorage.setItem('ratingSystem_deletedApplicants', JSON.stringify(deletedApplicants));
                    renderApplicantHistoryTable();
                    renderAdminApplicantsTable();
                    showToast('Applicant restored successfully.', 'success');
                });
            }
        }
    };

    const permDeleteApplicant = (id) => {
        showConfirm('Delete Permanently', 'Are you sure you want to permanently delete this applicant? This cannot be undone.', () => {
            const deletedApplicants = JSON.parse(localStorage.getItem('ratingSystem_deletedApplicants')) || [];
            const filtered = deletedApplicants.filter(a => a.id !== id);
            localStorage.setItem('ratingSystem_deletedApplicants', JSON.stringify(filtered));
            renderApplicantHistoryTable();
            showToast('Applicant permanently deleted.', 'success');
        });
    };

    if (app.admin.applicantHistoryBtn) {
        app.admin.applicantHistoryBtn.addEventListener('click', () => {
            renderApplicantHistoryTable();
            app.admin.applicantHistoryModal.classList.add('show');
        });
    }

    if (app.admin.applicantHistoryClose) {
        app.admin.applicantHistoryClose.addEventListener('click', () => {
            app.admin.applicantHistoryModal.classList.remove('show');
        });
    }

    if (app.admin.restoreAllApplicantsBtn) {
        app.admin.restoreAllApplicantsBtn.addEventListener('click', () => {
            const deletedApplicants = JSON.parse(localStorage.getItem('ratingSystem_deletedApplicants')) || [];
            if (deletedApplicants.length === 0) return;

            showConfirm('Restore All', 'Are you sure you want to restore all deleted applicants?', () => {
                const applicants = JSON.parse(localStorage.getItem('ratingSystem_applicants')) || [];
                applicants.push(...deletedApplicants);
                localStorage.setItem('ratingSystem_applicants', JSON.stringify(applicants));
                localStorage.setItem('ratingSystem_deletedApplicants', JSON.stringify([]));
                renderApplicantHistoryTable();
                renderAdminApplicantsTable();
                showToast('All applicants restored.', 'success');
            });
        });
    }

    if (app.admin.deleteAllApplicantsHistoryBtn) {
        app.admin.deleteAllApplicantsHistoryBtn.addEventListener('click', () => {
            const deletedApplicants = JSON.parse(localStorage.getItem('ratingSystem_deletedApplicants')) || [];
            if (deletedApplicants.length === 0) return;

            showConfirm('Delete All Permanently', 'Are you sure you want to permanently delete all applicant history? This cannot be undone.', () => {
                localStorage.setItem('ratingSystem_deletedApplicants', JSON.stringify([]));
                renderApplicantHistoryTable();
                showToast('Applicant history cleared permanently.', 'success');
            });
        });
    }

    // ---- Modal Logic ----
    const criteriaNames = [
        "COMMUNICATION SKILLS",
        "LEADERSHIP SKILLS",
        "PLANNING/DECISION MAKING",
        "WORK-ORIENTED/DEDICATION & COMMITMENT",
        "QUALITY OF WORK",
        "CREATIVE, SIMPLE & EFFICIENT",
        "PERSONAL CONDUCT/BEHAVIOR",
        "SERVICE-ORIENTED/WORK ATTITUDE",
        "MORAL VALUES",
        "TEAMWORK",
        "MANNER & APPEARANCE"
    ];

    const openDetailsModal = (rater) => {
        const ratings = JSON.parse(localStorage.getItem('ratingSystem_ratings')) || [];
        const raterRatings = ratings.filter(r => r.rater === rater);
        
        // Sort alphabetically by applicant last name
        raterRatings.sort((a, b) => getLastName(a.applicant).localeCompare(getLastName(b.applicant)));
        
        if (raterRatings.length === 0) return;

        let detailsHtml = `
            <div style="margin-bottom: 20px;">
                <h3 style="text-transform: uppercase; margin-bottom: 5px;">POTENTIAL & PSYCHOSOCIAL ATTRIBUTES/PERSONALITY TRAITS - BEI</h3>
            </div>
            <div class="table-responsive">
                <table class="data-table" style="min-width: 600px;">
                    <thead>
                        <tr>
                            <th style="width: 30%;">CRITERIA/ATTRIBUTES</th>
                            <th style="width: 10%; text-align: center;">POINTS</th>
        `;
        
        const applicants = JSON.parse(localStorage.getItem('ratingSystem_applicants')) || [];
        // Add headers for each applicant
        raterRatings.forEach(r => {
            const applicantObj = applicants.find(a => a.name === r.applicant && a.position === r.position);
            let creds = r.credentials || (applicantObj ? applicantObj.credentials : []);
            let tooltip = creds && creds.length > 0 
                ? 'Credentials:&#10;• ' + creds.join('&#10;• ') 
                : 'No credentials';
            detailsHtml += `<th style="text-align: center;" class="tooltip-container" data-tooltip="${tooltip}">${r.applicant}<br><span style="font-size: 0.8rem; font-weight: normal; color: var(--text-muted);">${r.position}</span></th>`;
        });
        
        detailsHtml += `
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        const maxPoints = [3, 2, 2, 1, 1, 1, 3, 2, 2, 2, 1];
        
        criteriaNames.forEach((criteria, index) => {
            detailsHtml += `
                <tr>
                    <td>${criteria}</td>
                    <td style="text-align: center; font-weight: 600; color: var(--text-muted);">${maxPoints[index]}</td>
            `;
            
            raterRatings.forEach(r => {
                detailsHtml += `<td style="text-align: center; font-weight: bold;">${r.scores[index] !== undefined ? r.scores[index] : '-'}</td>`;
            });
            
            detailsHtml += `</tr>`;
        });
        
        detailsHtml += `
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="2" style="text-align: right; font-weight: bold; background: rgba(0,0,0,0.04);">TOTAL SCORE:</td>
        `;
        
        raterRatings.forEach(r => {
            detailsHtml += `<td style="text-align: center; font-weight: bold; background: rgba(0,0,0,0.04);">${r.totalScore} / ${r.maxScore}</td>`;
        });
        
        detailsHtml += `
                        </tr>
                        <tr>
                            <td colspan="2" style="text-align: right; font-weight: bold; background: rgba(0,0,0,0.02);">ACTION:</td>
        `;
        
        raterRatings.forEach(r => {
            detailsHtml += `<td style="text-align: center; background: rgba(0,0,0,0.02);"><button class="btn danger-btn delete-individual-btn" data-id="${r.id}" style="padding: 4px 8px; font-size: 0.8rem;" title="Delete Applicant Rating"><i class='bx bx-trash'></i> Delete</button></td>`;
        });

        detailsHtml += `
                        </tr>
                    </tfoot>
                </table>
            </div>
            
            <div style="margin-top: 30px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: flex-end;">
                <div>
                    <p style="color: var(--text-secondary); font-weight: 600; font-size: 0.9rem; margin-bottom: 5px;">RATER:</p>
                    <div style="border-bottom: 1px solid var(--text-primary); display: inline-block; padding-bottom: 5px; padding-right: 40px; margin-bottom: 5px;">
                        <span style="font-weight: 700; font-size: 1.1rem; text-transform: uppercase;">${rater}</span>
                    </div>
                    <p style="color: var(--text-muted); font-size: 0.85rem;">${raterRatings[0].raterPosition || 'Employee'}</p>
                </div>
                <button class="btn danger-btn delete-all-modal-btn" data-rater="${rater}"><i class='bx bx-trash'></i> Delete All Submissions</button>
            </div>
        `;

        app.modal.body.innerHTML = detailsHtml;
        
        // Add event listeners for modal buttons
        app.modal.body.querySelectorAll('.delete-individual-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                deleteRating(e.currentTarget.getAttribute('data-id'));
            });
        });

        const deleteAllBtn = app.modal.body.querySelector('.delete-all-modal-btn');
        if (deleteAllBtn) {
            deleteAllBtn.addEventListener('click', (e) => {
                deleteRatingGroup(e.currentTarget.getAttribute('data-rater'));
            });
        }

        app.modal.el.classList.add('show');
    };

    app.modal.close.addEventListener('click', () => {
        app.modal.el.classList.remove('show');
    });

    window.addEventListener('mousedown', (e) => {
        if (e.target === app.modal.el) {
            app.modal.el.classList.remove('show');
        }
        if (app.admin.historyModal && e.target === app.admin.historyModal) {
            app.admin.historyModal.classList.remove('show');
        }
        if (app.admin.addApplicantModal && e.target === app.admin.addApplicantModal) {
            app.admin.addApplicantModal.classList.remove('show');
        }
        if (app.admin.applicantHistoryModal && e.target === app.admin.applicantHistoryModal) {
            app.admin.applicantHistoryModal.classList.remove('show');
        }
    });

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const openModals = Array.from(document.querySelectorAll('.modal.show'));
            if (openModals.length === 0) return;

            // Find the top-most modal (highest z-index, or later in DOM if equal)
            let topModal = openModals[0];
            let maxZ = parseInt(window.getComputedStyle(topModal).zIndex) || 0;

            for (let i = 1; i < openModals.length; i++) {
                let currentZ = parseInt(window.getComputedStyle(openModals[i]).zIndex) || 0;
                if (currentZ >= maxZ) {
                    topModal = openModals[i];
                    maxZ = currentZ;
                }
            }

            // Close only the top-most modal
            if (topModal === app.confirmModal.el) {
                app.confirmModal.cancelBtn.click();
            } else {
                topModal.classList.remove('show');
            }
        } else if (e.key === 'Tab') {
            // Focus trap: keep focus within the system/active context
            const focusableSelectors = 'button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';
            
            // Determine active context (top modal or active view)
            const openModals = Array.from(document.querySelectorAll('.modal.show'));
            let context = document;
            
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
            } else {
                const activeView = document.querySelector('.view.active');
                if (activeView) context = activeView;
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
                if (document.activeElement === firstElement || document.activeElement === document.body || !visibleFocusable.includes(document.activeElement)) {
                    e.preventDefault();
                    lastElement.focus();
                }
            } else { // Tab
                if (document.activeElement === lastElement || document.activeElement === document.body || !visibleFocusable.includes(document.activeElement)) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        }
    });

    // Prevent buttons from retaining focus after being clicked with a mouse.
    // This stops the "Enter" key from accidentally triggering the last clicked button.
    document.addEventListener('click', (e) => {
        // e.detail > 0 ensures this was a mouse click or touch, not a keyboard action.
        if (e.detail > 0) {
            const btn = e.target.closest('button');
            if (btn) {
                btn.blur();
            }
        }
    });

    // ---- Settings Logic ----
    app.employee.settingsBtn.addEventListener('click', () => switchView('settings'));
    app.admin.settingsBtn.addEventListener('click', () => switchView('settings'));
    app.settings.backBtn.addEventListener('click', () => checkAuthStatus());

    app.settings.form.addEventListener('submit', (e) => {
        e.preventDefault();
        const newFullName = app.settings.fullname.value.trim();
        const newPassword = app.settings.password.value;

        if (!newFullName) {
            showToast('Full name cannot be empty', 'error');
            return;
        }

        showConfirm('Save Changes', 'Are you sure you want to update your profile?', () => {
            const users = JSON.parse(localStorage.getItem('ratingSystem_users'));
            const userIndex = users.findIndex(u => u.username === currentUser.username);

            if (userIndex !== -1) {
                users[userIndex].fullName = newFullName;
                currentUser.fullName = newFullName;

                if (newPassword) {
                    users[userIndex].password = newPassword;
                    currentUser.password = newPassword;
                }

                if (currentUser.role !== 'admin' && app.settings.position) {
                    const newPosition = app.settings.position.value.trim();
                    users[userIndex].position = newPosition;
                    currentUser.position = newPosition;
                }

                localStorage.setItem('ratingSystem_users', JSON.stringify(users));
                localStorage.setItem('ratingSystem_currentUser', JSON.stringify(currentUser));
                showToast('Profile updated successfully!');
                checkAuthStatus(); // Go back
            } else {
                showToast('Error updating profile', 'error');
            }
        });
    });

    app.settings.deleteBtn.addEventListener('click', () => {
        if(currentUser.role === 'admin') {
            showToast('System Admin account cannot be deleted.', 'error');
            return;
        }

        showConfirm('Delete Account', 'This will permanently remove your account. Proceed?', () => {
            const users = JSON.parse(localStorage.getItem('ratingSystem_users'));
            const filteredUsers = users.filter(u => u.username !== currentUser.username);
            localStorage.setItem('ratingSystem_users', JSON.stringify(filteredUsers));
            
            currentUser = null;
            localStorage.removeItem('ratingSystem_currentUser');
            showToast('Account successfully deleted.', 'success');
            checkAuthStatus(); // Route back to login
        });
    });

    // ---- Initialization ----
    checkAuthStatus();
});
