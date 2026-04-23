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
            numberInputs: document.querySelectorAll('.rating-table input[type="number"]'),
            raterName: document.getElementById('form-rater-name')
        },
        admin: {
            el: document.getElementById('admin-view'),
            welcome: document.getElementById('admin-welcome'),
            logoutBtn: document.getElementById('admin-logout'),
            tbody: document.getElementById('admin-ratings-tbody'),
            clearBtn: document.getElementById('clear-data-btn'),
            totalCount: document.getElementById('total-ratings-count'),
            uniqueCount: document.getElementById('unique-applicants-count'),
            avgCount: document.getElementById('avg-score-count'),
            emptyState: document.getElementById('no-ratings-msg'),
            settingsBtn: document.getElementById('admin-settings'),
            historyBtn: document.getElementById('history-btn'),
            historyModal: document.getElementById('history-modal'),
            historyClose: document.querySelector('#history-modal .close-modal'),
            historyTbody: document.getElementById('history-tbody'),
            restoreAllBtn: document.getElementById('restore-all-btn'),
            deleteAllHistoryBtn: document.getElementById('delete-all-history-btn'),
            noHistoryMsg: document.getElementById('no-history-msg')
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

    // ---- Utility Functions ----
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
            updateLiveTotal(); // reset total
        } else if (viewName === 'admin') {
            app.admin.welcome.textContent = `Welcome, ${currentUser.fullName || currentUser.username}`;
            renderAdminTable();
        } else if (viewName === 'settings') {
            app.settings.fullname.value = currentUser.fullName || currentUser.username;
            app.settings.password.value = '';
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
    const showConfirm = (title, message, onConfirm) => {
        app.confirmModal.title.textContent = title;
        app.confirmModal.message.innerHTML = message; // Allow HTML styling
        app.confirmModal.el.classList.add('show');
        
        const cleanup = () => {
            app.confirmModal.el.classList.remove('show');
            app.confirmModal.okBtn.removeEventListener('click', okHandler);
            app.confirmModal.cancelBtn.removeEventListener('click', cancelHandler);
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
        const password = app.auth.registerPassword.value;

        if (!fullname || !username || !password) {
            showToast('Please fill all fields', 'error');
            return;
        }

        const users = JSON.parse(localStorage.getItem('ratingSystem_users'));
        
        if (users.find(u => u.username === username)) {
            showToast('This username is already taken. Please choose another.', 'error');
            return;
        }
        
        const newUser = { username, password, role: 'employee', fullName: fullname };
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
        let total = 0;
        app.employee.numberInputs.forEach(input => {
            let val = parseInt(input.value) || 0;
            const max = parseInt(input.max);
            if (val > max) {
                input.value = max; // clamp
                val = max;
            }
            if (val < 0) {
                input.value = 0;
                val = 0;
            }
            total += val;
        });
        app.employee.liveTotal.textContent = `${total} / 20`;
    };

    app.employee.numberInputs.forEach(input => {
        input.addEventListener('input', updateLiveTotal);
    });

    // Pre-Submit validation and Custom Confirmation
    app.employee.preSubmitBtn.addEventListener('click', () => {
        if(!app.employee.form.checkValidity()) {
            app.employee.form.reportValidity(); // show default HTML5 validations
            return;
        }

        const applicant = document.getElementById('applicant-name').value.trim();
        const position = document.getElementById('position-applied').value.trim();
        
        let totalScore = 0;
        app.employee.numberInputs.forEach(input => {
            totalScore += parseInt(input.value) || 0;
        });

        const confirmMessage = `
            You are about to submit a rating for <strong>${applicant}</strong>.<br><br>
            Total Score: <span style="font-size: 1.5rem; color: var(--secondary-color); font-weight: bold;">${totalScore}/20</span>
        `;

        showConfirm('Submit Rating?', confirmMessage, () => {
            // Trigger actual submission logic
            submitRating();
        });
    });

    const submitRating = () => {
        const position = document.getElementById('position-applied').value.trim();
        const applicant = document.getElementById('applicant-name').value.trim();
        
        let scores = [];
        let totalScore = 0;
        const maxScore = 20;

        app.employee.numberInputs.forEach(input => {
            const val = parseInt(input.value) || 0;
            scores.push(val);
            totalScore += val;
        });

        const ratingRecord = {
            id: Date.now().toString(),
            date: new Date().toLocaleDateString(),
            rater: currentUser.fullName || currentUser.username,
            position,
            applicant,
            scores,
            totalScore,
            maxScore
        };

        const ratings = JSON.parse(localStorage.getItem('ratingSystem_ratings'));
        ratings.push(ratingRecord);
        localStorage.setItem('ratingSystem_ratings', JSON.stringify(ratings));

        showToast('Rating submitted successfully!');
        app.employee.form.reset();
        updateLiveTotal();
    };

    // Employee form actual submit event (prevent default just in case)
    app.employee.form.addEventListener('submit', (e) => e.preventDefault());

    // ---- Admin Dashboard Logic ----
    const renderAdminTable = () => {
        const ratings = JSON.parse(localStorage.getItem('ratingSystem_ratings'));
        app.admin.tbody.innerHTML = '';
        
        // Update summary cards
        app.admin.totalCount.textContent = ratings.length;
        const uniqueApplicants = new Set(ratings.map(r => (r.applicant || '').toLowerCase()));
        app.admin.uniqueCount.textContent = uniqueApplicants.size;
        
        let sumScores = 0;
        ratings.forEach(r => sumScores += r.totalScore);
        const avg = ratings.length > 0 ? (sumScores / ratings.length).toFixed(1) : 0;
        app.admin.avgCount.textContent = `${avg} / 20`;

        if (ratings.length === 0) {
            app.admin.emptyState.classList.remove('hidden');
            app.admin.tbody.parentElement.classList.add('hidden');
            return;
        }

        app.admin.emptyState.classList.add('hidden');
        app.admin.tbody.parentElement.classList.remove('hidden');

        // Sort by newest first
        ratings.sort((a, b) => b.id - a.id).forEach(rating => {
            const tr = document.createElement('tr');
            
            // Score color logic
            let scoreColor = 'var(--text-primary)';
            if (rating.totalScore >= 16) scoreColor = 'var(--success)';
            else if (rating.totalScore <= 10) scoreColor = 'var(--accent-color)';

            tr.innerHTML = `
                <td>${rating.date}</td>
                <td>${rating.rater}</td>
                <td>${rating.applicant}</td>
                <td>${rating.position}</td>
                <td style="color: ${scoreColor}; font-weight: bold;">${rating.totalScore} / ${rating.maxScore}</td>
                <td>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <button class="btn outline-btn view-btn" data-id="${rating.id}">View Details</button>
                        <button class="btn danger-btn delete-btn" data-id="${rating.id}" style="padding: 8px 12px;"><i class='bx bx-trash'></i></button>
                    </div>
                </td>
            `;
            app.admin.tbody.appendChild(tr);
        });

        // Add event listeners
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => openDetailsModal(e.currentTarget.getAttribute('data-id')));
        });
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => deleteRating(e.currentTarget.getAttribute('data-id')));
        });
    };

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
                showToast('Rating moved to history.', 'success');
            }
        });
    };

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
            
            let scoreColor = 'var(--text-primary)';
            if (rating.totalScore >= 16) scoreColor = 'var(--success)';
            else if (rating.totalScore <= 10) scoreColor = 'var(--accent-color)';

            tr.innerHTML = `
                <td>${rating.date}</td>
                <td>${rating.rater}</td>
                <td>${rating.applicant}</td>
                <td style="color: ${scoreColor}; font-weight: bold;">${rating.totalScore} / ${rating.maxScore}</td>
                <td>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <button class="btn outline-btn restore-btn" data-id="${rating.id}" style="padding: 8px 12px;"><i class='bx bx-undo'></i></button>
                        <button class="btn danger-btn perm-delete-btn" data-id="${rating.id}" style="padding: 8px 12px;"><i class='bx bx-trash'></i></button>
                    </div>
                </td>
            `;
            app.admin.historyTbody.appendChild(tr);
        });

        document.querySelectorAll('.restore-btn').forEach(btn => {
            btn.addEventListener('click', (e) => restoreRating(e.currentTarget.getAttribute('data-id')));
        });
        document.querySelectorAll('.perm-delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => permDeleteRating(e.currentTarget.getAttribute('data-id')));
        });
    };

    const restoreRating = (id) => {
        showConfirm('Restore Rating', 'Are you sure you want to restore this rating?', () => {
            const ratings = JSON.parse(localStorage.getItem('ratingSystem_ratings'));
            const deletedRatings = JSON.parse(localStorage.getItem('ratingSystem_deletedRatings')) || [];
            
            const ratingIndex = deletedRatings.findIndex(r => r.id === id);
            if (ratingIndex > -1) {
                const restored = deletedRatings.splice(ratingIndex, 1)[0];
                ratings.push(restored);
                localStorage.setItem('ratingSystem_ratings', JSON.stringify(ratings));
                localStorage.setItem('ratingSystem_deletedRatings', JSON.stringify(deletedRatings));
                renderHistoryTable();
                renderAdminTable();
                showToast('Rating restored successfully.', 'success');
            }
        });
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

    const openDetailsModal = (id) => {
        const ratings = JSON.parse(localStorage.getItem('ratingSystem_ratings'));
        const rating = ratings.find(r => r.id === id);
        if(!rating) return;

        let detailsHtml = `
            <div class="detail-item"><span class="detail-label">Applicant Name</span><span class="detail-value">${rating.applicant}</span></div>
            <div class="detail-item"><span class="detail-label">Position Applied</span><span class="detail-value">${rating.position}</span></div>
            <div class="detail-item"><span class="detail-label">Rater (Employee)</span><span class="detail-value">${rating.rater}</span></div>
            <div class="detail-item"><span class="detail-label">Date Submitted</span><span class="detail-value">${rating.date}</span></div>
            <div class="detail-item"><span class="detail-label">Total Score</span><span class="detail-value" style="color: var(--secondary-color)">${rating.totalScore} / ${rating.maxScore}</span></div>
            <h3 style="margin-top: 20px; margin-bottom: 10px; border-bottom: 1px solid var(--glass-border); padding-bottom: 5px;">Criteria Breakdown</h3>
        `;

        rating.scores.forEach((score, index) => {
            detailsHtml += `<div class="detail-item"><span class="detail-label">${criteriaNames[index]}</span><span class="detail-value">${score}</span></div>`;
        });

        app.modal.body.innerHTML = detailsHtml;
        app.modal.el.classList.add('show');
    };

    app.modal.close.addEventListener('click', () => {
        app.modal.el.classList.remove('show');
    });

    window.addEventListener('click', (e) => {
        if (e.target === app.modal.el) {
            app.modal.el.classList.remove('show');
        }
        if (app.admin.historyModal && e.target === app.admin.historyModal) {
            app.admin.historyModal.classList.remove('show');
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
