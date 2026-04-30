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
            numberInputs: document.querySelectorAll('.rating-table input[type="number"]'),
            raterName: document.getElementById('form-rater-name'),
            raterRole: document.querySelector('.rater-role'),
            applicantSelect: document.getElementById('applicant-select'),
            positionApplied: document.getElementById('position-applied')
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
            applicantsTbody: document.getElementById('admin-applicants-tbody'),
            noApplicantsMsg: document.getElementById('no-applicants-msg'),
            openAddApplicantBtn: document.getElementById('open-add-applicant-btn'),
            addApplicantModal: document.getElementById('add-applicant-modal'),
            addApplicantForm: document.getElementById('add-applicant-form'),
            newApplicantName: document.getElementById('new-applicant-name'),
            newApplicantPosition: document.getElementById('new-applicant-position'),
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

    // ---- Global State Variables ----
    let editingApplicantId = null;

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
            if (app.employee.raterRole) {
                app.employee.raterRole.textContent = currentUser.position || 'Employee';
            }
            updateLiveTotal(); // reset total
            renderEmployeeApplicantDropdown();
        } else if (viewName === 'admin') {
            app.admin.welcome.textContent = `Welcome, ${currentUser.fullName || currentUser.username}`;
            renderAdminTable();
            renderAdminApplicantsTable();
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
        let total = 0;
        app.employee.numberInputs.forEach(input => {
            let val = parseInt(input.value) || 0;
            const max = parseInt(input.max);
            if (val > max) {
                input.value = max; // clamp
                val = max;
            } else if (val < 0) {
                input.value = 0;
                val = 0;
            } else if (input.value !== "") {
                input.value = val; // remove leading zeros
            }
            total += val;
        });
        app.employee.liveTotal.textContent = `${total} / 20`;
    };

    app.employee.numberInputs.forEach(input => {
        input.addEventListener('input', updateLiveTotal);
    });

    const renderEmployeeApplicantDropdown = () => {
        const applicants = JSON.parse(localStorage.getItem('ratingSystem_applicants')) || [];
        const ratings = JSON.parse(localStorage.getItem('ratingSystem_ratings')) || [];
        
        // Filter out applicants that the current user has already rated
        const raterName = currentUser.fullName || currentUser.username;
        const ratedCombos = ratings
            .filter(r => r.rater === raterName)
            .map(r => `${r.applicant}|${r.position}`);
            
        const unratedApplicants = applicants.filter(a => !ratedCombos.includes(`${a.name}|${a.position}`));
        
        if (app.employee.applicantSelect) {
            if (unratedApplicants.length === 0) {
                app.employee.applicantSelect.innerHTML = '<option value="" disabled selected>No pending applicants to rate</option>';
                app.employee.positionApplied.innerHTML = '<option value="" disabled selected>Select an applicant first</option>';
                if (app.employee.preSubmitBtn) app.employee.preSubmitBtn.disabled = true;
            } else {
                app.employee.applicantSelect.innerHTML = ''; // No placeholder
                if (app.employee.preSubmitBtn) app.employee.preSubmitBtn.disabled = false;
                
                const uniqueNames = [...new Set(unratedApplicants.map(a => a.name))];
                uniqueNames.forEach(name => {
                    const option = document.createElement('option');
                    option.value = name;
                    option.textContent = name;
                    app.employee.applicantSelect.appendChild(option);
                });

                // Auto-trigger change to populate position dropdown
                app.employee.applicantSelect.dispatchEvent(new Event('change'));
            }
        }
    };

    if (app.employee.applicantSelect) {
        app.employee.applicantSelect.addEventListener('change', (e) => {
            const selectedName = e.target.value;
            app.employee.positionApplied.innerHTML = ''; // No placeholder
            
            if (selectedName) {
                const applicants = JSON.parse(localStorage.getItem('ratingSystem_applicants')) || [];
                const ratings = JSON.parse(localStorage.getItem('ratingSystem_ratings')) || [];
                
                const raterName = currentUser.fullName || currentUser.username;
                const ratedPositions = ratings
                    .filter(r => r.rater === raterName && r.applicant === selectedName)
                    .map(r => r.position);
                    
                const unratedPositions = [...new Set(applicants
                    .filter(a => a.name === selectedName && !ratedPositions.includes(a.position))
                    .map(a => a.position))];
                    
                unratedPositions.forEach(pos => {
                    const option = document.createElement('option');
                    option.value = pos;
                    option.textContent = pos;
                    app.employee.positionApplied.appendChild(option);
                });
            }
        });
    }

    // Pre-Submit validation and Custom Confirmation
    if (app.employee.preSubmitBtn) {
        app.employee.preSubmitBtn.addEventListener('click', () => {
            if(!app.employee.form.checkValidity()) {
                app.employee.form.reportValidity(); // show default HTML5 validations
                return;
            }

            const applicant = app.employee.applicantSelect.value;
            
            if (!applicant) {
                showToast('Please select an applicant to rate', 'error');
                return;
            }
        
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
    }

    const submitRating = () => {
        const position = app.employee.positionApplied.value.trim();
        const applicant = app.employee.applicantSelect.value;
        
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
            raterPosition: currentUser.position || 'Employee',
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
        renderEmployeeApplicantDropdown(); // Update list to remove rated applicant
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

        const sortedGroups = Object.values(groupedRatings).reverse();

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
                        <button class="btn danger-btn delete-group-btn" data-rater="${group.rater}" style="padding: 8px 12px;" title="Delete Submissions"><i class='bx bx-trash'></i></button>
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
        document.querySelectorAll('.delete-group-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const rater = e.currentTarget.getAttribute('data-rater');
                deleteRatingGroup(rater);
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
                <td>${applicant.date}</td>
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
        showConfirm('Delete Applicant Form', 'Are you sure you want to delete this applicant form? Employees will no longer be able to rate them.', () => {
            let applicants = JSON.parse(localStorage.getItem('ratingSystem_applicants')) || [];
            applicants = applicants.filter(a => a.id !== id);
            localStorage.setItem('ratingSystem_applicants', JSON.stringify(applicants));
            renderAdminApplicantsTable();
            showToast('Applicant form deleted', 'success');
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
        
        app.admin.addApplicantModal.classList.add('show');
        setTimeout(() => app.admin.newApplicantName.focus(), 50);
    };

    if (app.admin.openAddApplicantBtn) {
        app.admin.openAddApplicantBtn.addEventListener('click', () => {
            editingApplicantId = null;
            document.querySelector('#add-applicant-modal h2').textContent = 'Add Rating Form';
            document.querySelector('#add-applicant-form button[type="submit"]').textContent = 'Create Form';
            app.admin.addApplicantForm.reset();
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
                    
                    applicants[index].name = name;
                    applicants[index].position = position;
                    
                    // Cascade update to existing ratings
                    let ratings = JSON.parse(localStorage.getItem('ratingSystem_ratings')) || [];
                    let updatedRatings = false;
                    ratings.forEach(r => {
                        if (r.applicant === oldName && r.position === oldPosition) {
                            r.applicant = name;
                            r.position = position;
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
                        if (r.applicant === oldName && r.position === oldPosition) {
                            r.applicant = name;
                            r.position = position;
                            updatedDeleted = true;
                        }
                    });
                    if (updatedDeleted) {
                        localStorage.setItem('ratingSystem_deletedRatings', JSON.stringify(deletedRatings));
                    }
                }
                
                localStorage.setItem('ratingSystem_applicants', JSON.stringify(applicants));
                showToast('Applicant form updated successfully');
            } else {
                if (applicants.some(a => a.name.toLowerCase() === name.toLowerCase() && a.position.toLowerCase() === position.toLowerCase())) {
                    showToast('Applicant already has a Rating Form', 'error');
                    return;
                }

                applicants.push({
                    id: Date.now().toString(),
                    name,
                    position,
                    date: new Date().toLocaleDateString()
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

    const openDetailsModal = (rater) => {
        const ratings = JSON.parse(localStorage.getItem('ratingSystem_ratings')) || [];
        const raterRatings = ratings.filter(r => r.rater === rater);
        
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
        
        // Add headers for each applicant
        raterRatings.forEach(r => {
            detailsHtml += `<th style="text-align: center;">${r.applicant}<br><span style="font-size: 0.8rem; font-weight: normal; color: var(--text-muted);">${r.position}</span></th>`;
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
            let scoreColor = 'var(--text-primary)';
            if (r.totalScore >= 16) scoreColor = 'var(--success)';
            else if (r.totalScore <= 10) scoreColor = 'var(--accent-color)';
            detailsHtml += `<td style="text-align: center; font-weight: bold; color: ${scoreColor}; background: rgba(0,0,0,0.04);">${r.totalScore} / ${r.maxScore}</td>`;
        });
        
        detailsHtml += `
                        </tr>
                    </tfoot>
                </table>
            </div>
            
            <div style="margin-top: 30px; margin-bottom: 10px;">
                <p style="color: var(--text-secondary); font-weight: 600; font-size: 0.9rem; margin-bottom: 5px;">RATER:</p>
                <div style="border-bottom: 1px solid var(--text-primary); display: inline-block; padding-bottom: 5px; padding-right: 40px; margin-bottom: 5px;">
                    <span style="font-weight: 700; font-size: 1.1rem; text-transform: uppercase;">${rater}</span>
                </div>
                <p style="color: var(--text-muted); font-size: 0.85rem;">${raterRatings[0].raterPosition || 'Employee'}</p>
            </div>
        `;

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
        if (app.admin.addApplicantModal && e.target === app.admin.addApplicantModal) {
            app.admin.addApplicantModal.classList.remove('show');
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
