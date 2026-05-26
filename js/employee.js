import { domElements, appState } from './state.js';
import { CRITERIA_NAMES, MAX_POINTS, APPLICANTS_PER_PAGE } from './constants.js';
import { API } from './api.js';
import { showToast, showConfirm, getLastName, getRatingKey, escapeHTML } from './utils.js';
import { uiManager } from './viewManager.js';



export const initEmployee = () => {
    appState.currentEmployeePage = appState.currentEmployeePage || 0;

    const updateLiveTotal = () => {
        domElements.employee.numberInputs = document.querySelectorAll('.rating-table input[type="number"]');
        
        const startIdx = appState.currentEmployeePage * APPLICANTS_PER_PAGE;
        const endIdx = Math.min(startIdx + APPLICANTS_PER_PAGE, appState.currentPendingApplicants.length);

        for (let colIndex = startIdx; colIndex < endIdx; colIndex++) {
            const applicant = appState.currentPendingApplicants[colIndex];
            if (!applicant) continue;
            
            let total = 0;
            for (let i = 0; i < CRITERIA_NAMES.length; i++) {
                const input = document.getElementById(`score-${i}-${colIndex}`);
                if (input) {
                    if (input.value !== "") {
                        let val = parseFloat(input.value);
                        const max = parseFloat(input.max);
                        
                        if (val % 0.5 !== 0) {
                            val = Math.round(val * 2) / 2;
                            input.value = val;
                        }

                        if (val > max) {
                            input.value = max;
                            val = max;
                        } else if (val < 0) {
                            input.value = 0;
                            val = 0;
                        }
                        total += val || 0;
                        
                        const key = getRatingKey(appState.currentUser.username, applicant.name, applicant.position, i);
                        localStorage.setItem(key, input.value);
                    } else {
                        const key = getRatingKey(appState.currentUser.username, applicant.name, applicant.position, i);
                        localStorage.removeItem(key);
                    }
                }
            }
            const totalDisplay = document.getElementById(`total-${colIndex}`);
            if (totalDisplay) {
                totalDisplay.textContent = total;
            }
        }
    };

    const updatePaginationUI = (pageIndex) => {
        const totalPages = Math.ceil(appState.currentPendingApplicants.length / APPLICANTS_PER_PAGE);
        const prevBtn = document.getElementById('prev-page-btn');
        const nextBtn = document.getElementById('next-page-btn');
        const indicator = document.getElementById('page-indicator');
        
        if (indicator) indicator.textContent = `Page ${pageIndex + 1} of ${totalPages || 1}`;
        if (prevBtn) prevBtn.disabled = pageIndex === 0;
        if (nextBtn) nextBtn.disabled = pageIndex >= totalPages - 1;
    };

    const renderEmployeePage = (pageIndex) => {
        const startIdx = pageIndex * APPLICANTS_PER_PAGE;
        const endIdx = Math.min(startIdx + APPLICANTS_PER_PAGE, appState.currentPendingApplicants.length);
        const chunkApplicants = appState.currentPendingApplicants.slice(startIdx, endIdx);
        
        const theadTr = domElements.employee.dynamicTable.querySelector('thead tr');
        const tbodyTrs = domElements.employee.dynamicTable.querySelectorAll('tbody tr');
        const tfootTr = domElements.employee.dynamicTable.querySelector('tfoot tr');

        // Clear existing columns beyond the first two (criteria and points)
        while(theadTr.children.length > 2) theadTr.removeChild(theadTr.lastChild);
        tbodyTrs.forEach(tr => {
            while(tr.children.length > 2) tr.removeChild(tr.lastChild);
        });
        while(tfootTr.children.length > 1) tfootTr.removeChild(tfootTr.lastChild);

        if (chunkApplicants.length === 0) return;

        chunkApplicants.forEach((appItem, chunkColIdx) => {
            const absIdx = startIdx + chunkColIdx;
            
            let tooltip = appItem.credentials && appItem.credentials.length > 0 
                ? escapeHTML('Credentials:\n• ' + appItem.credentials.join('\n• ')) 
                : 'No credentials';
                
            const th = document.createElement('th');
            th.style.textAlign = 'center';
            th.style.minWidth = '180px';
            th.style.position = 'sticky';
            th.style.top = '0';
            th.style.background = 'var(--solid-bg)';
            th.style.zIndex = '30';
            th.style.borderBottom = '2px solid var(--glass-border)';
            th.style.padding = '15px';
            th.innerHTML = `
                <span class="tooltip-container" data-tooltip="${tooltip}" style="display: inline-block; cursor: help; font-weight: 700; border-bottom: 1px dashed var(--text-muted);">${escapeHTML(appItem.name)}</span><br>
                <small style="font-weight: 400; color: var(--text-muted);">${escapeHTML(appItem.position)}</small>
                <div style="margin-top: 5px;">
                    <button type="button" class="btn outline-btn clear-applicant-btn" data-idx="${absIdx}" style="padding: 2px 8px; font-size: 0.7rem; height: auto;">
                        <i class='bx bx-eraser'></i> Clear
                    </button>
                </div>`;
            theadTr.appendChild(th);
            
            CRITERIA_NAMES.forEach((_, rowIdx) => {
                const key = getRatingKey(appState.currentUser.username, appItem.name, appItem.position, rowIdx);
                const savedVal = localStorage.getItem(key) || "";
                const td = document.createElement('td');
                td.style.textAlign = 'center';
                td.innerHTML = `<input type="number" id="score-${rowIdx}-${absIdx}" min="0" max="${MAX_POINTS[rowIdx]}" step="0.5" value="${savedVal}" required>`;
                tbodyTrs[rowIdx].appendChild(td);
            });
            
            const tdFoot = document.createElement('td');
            tdFoot.style.textAlign = 'center';
            tdFoot.style.fontWeight = 'bold';
            tdFoot.innerHTML = `<span id="total-${absIdx}">0</span> / 20`;
            tfootTr.appendChild(tdFoot);
        });

        updateLiveTotal();
        updatePaginationUI(pageIndex);
        
        // Trigger fade animation for page content
        domElements.employee.dynamicTable.classList.remove('animate-fade');
        void domElements.employee.dynamicTable.offsetWidth;
        domElements.employee.dynamicTable.classList.add('animate-fade');
    };

    const renderEmployeeRatingTable = () => {
        if (!domElements.employee.dynamicTable) return;
        
        if (appState.empObserver) {
            appState.empObserver.disconnect();
            appState.empObserver = null;
        }
        
        const raterName = appState.currentUser.fullName || appState.currentUser.username;
        const ratedCombos = appState.allRatings
            .filter(r => r.rater === raterName)
            .map(r => `${r.applicant}|${r.position}`);
            
        const myDivision = appState.currentUser.division || 'Unassigned';
        appState.currentPendingApplicants = appState.allApplicants.filter(a => 
            !ratedCombos.includes(`${a.name}|${a.position}`) &&
            (a.division || 'Unassigned') === myDivision
        );
        
        // Pre-populate from history if no local data exists
        appState.currentPendingApplicants.forEach(applicant => {
            let hasLocalData = false;
            for (let i = 0; i < CRITERIA_NAMES.length; i++) {
                if (localStorage.getItem(getRatingKey(appState.currentUser.username, applicant.name, applicant.position, i)) !== null) {
                    hasLocalData = true;
                    break;
                }
            }

            if (!hasLocalData) {
                const historyRecord = [...appState.deletedRatings]
                    .reverse()
                    .find(r => (r.rater === raterName || r.raterUsername === appState.currentUser.username) && r.applicant === applicant.name && r.position === applicant.position);
                
                if (historyRecord && historyRecord.scores) {
                    historyRecord.scores.forEach((score, i) => {
                        localStorage.setItem(getRatingKey(appState.currentUser.username, applicant.name, applicant.position, i), score);
                    });
                }
            }
        });

        appState.currentPendingApplicants.sort((a, b) => getLastName(a.name).localeCompare(getLastName(b.name)));

        const counterSpan = document.getElementById('employee-applicant-count');
        if (counterSpan) {
            counterSpan.textContent = appState.currentPendingApplicants.length;
        }

        if (appState.currentPendingApplicants.length === 0) {
            domElements.employee.dynamicTable.innerHTML = `<tr><td style="text-align: center; padding: 40px; color: var(--text-muted);">No pending applicants to rate for your division (${myDivision})</td></tr>`;
            if (domElements.employee.preSubmitBtn) domElements.employee.preSubmitBtn.disabled = true;
            const pagination = document.getElementById('employee-pagination');
            if (pagination) pagination.style.display = 'none';
            return;
        }

        if (domElements.employee.preSubmitBtn) domElements.employee.preSubmitBtn.disabled = false;
        const pagination = document.getElementById('employee-pagination');
        if (pagination) pagination.style.display = 'flex';

        const totalPages = Math.ceil(appState.currentPendingApplicants.length / APPLICANTS_PER_PAGE);
        if (appState.currentEmployeePage >= totalPages) {
            appState.currentEmployeePage = Math.max(0, totalPages - 1);
        }

        let tableHTML = `
            <thead>
                <tr>
                    <th style="min-width: 300px; max-width: 300px; position: sticky; left: 0; top: 0; background: var(--solid-bg); z-index: 40; border-right: 1px solid var(--glass-border); border-bottom: 2px solid var(--glass-border); padding: 15px;">CRITERIA/ATTRIBUTES</th>
                    <th class="points-col" style="width: 100px; min-width: 100px; position: sticky; left: 300px; top: 0; background: var(--solid-bg); z-index: 40; border-right: 2px solid var(--glass-border); border-bottom: 2px solid var(--glass-border); padding: 15px;">POINTS</th>
                </tr>
            </thead>
            <tbody>`;

        CRITERIA_NAMES.forEach((criteria, rowIdx) => {
            tableHTML += `
                <tr>
                    <td style="position: sticky; left: 0; background: var(--solid-bg); z-index: 20; font-weight: 500; border-right: 1px solid var(--glass-border); border-bottom: 1px solid var(--glass-border); padding: 12px 15px; white-space: normal; word-break: break-word;">${criteria}</td>
                    <td class="points-col" style="text-align: center; font-weight: 600; position: sticky; left: 300px; background: var(--solid-bg); z-index: 20; border-right: 2px solid var(--glass-border); border-bottom: 1px solid var(--glass-border); min-width: 100px; max-width: 100px; padding: 12px;">${MAX_POINTS[rowIdx]}</td>
                </tr>`;
        });

        tableHTML += `
            </tbody>
            <tfoot>
                <tr>
                    <td class="total-label" style="text-align: right; padding: 15px; font-weight: 700; border-right: 1px solid var(--glass-border);">Total Score</td>
                    <td style="border-right: 2px solid var(--glass-border);"></td>
                </tr>
            </tfoot>`;
            
        domElements.employee.dynamicTable.innerHTML = tableHTML;
        
        // Trigger fade animation
        domElements.employee.dynamicTable.classList.remove('animate-fade');
        void domElements.employee.dynamicTable.offsetWidth;
        domElements.employee.dynamicTable.classList.add('animate-fade');
        
        domElements.employee.dynamicTable.removeEventListener('input', updateLiveTotal);
        domElements.employee.dynamicTable.addEventListener('input', (e) => {
            if (e.target.tagName === 'INPUT' && e.target.type === 'number') {
                updateLiveTotal();
            }
        });

        domElements.employee.dynamicTable.removeEventListener('click', handleClearIndividualClick);
        domElements.employee.dynamicTable.addEventListener('click', handleClearIndividualClick);

        renderEmployeePage(appState.currentEmployeePage);
    };

    const handleClearIndividualClick = (e) => {
        const btn = e.target.closest('.clear-applicant-btn');
        if (btn) {
            const idx = parseInt(btn.getAttribute('data-idx'));
            const applicant = appState.currentPendingApplicants[idx];
            showConfirm('Clear Rating', `Are you sure you want to clear all scores for <strong>${applicant.name}</strong>?`, () => {
                clearApplicantRatings(idx);
            });
        }
    };

    const clearApplicantRatings = (colIdx) => {
        for (let rowIdx = 0; rowIdx < CRITERIA_NAMES.length; rowIdx++) {
            const input = document.getElementById(`score-${rowIdx}-${colIdx}`);
            if (input) {
                input.value = "";
            }
        }
        updateLiveTotal();
        showToast('Ratings cleared for applicant.');
    };

    const clearAllRatings = () => {
        const startIdx = appState.currentEmployeePage * APPLICANTS_PER_PAGE;
        const endIdx = Math.min(startIdx + APPLICANTS_PER_PAGE, appState.currentPendingApplicants.length);
        
        for (let colIndex = startIdx; colIndex < endIdx; colIndex++) {
            for (let rowIdx = 0; rowIdx < CRITERIA_NAMES.length; rowIdx++) {
                const input = document.getElementById(`score-${rowIdx}-${colIdx}`);
                if (input) {
                    input.value = "";
                }
            }
        }
        updateLiveTotal();
        showToast('Ratings on this page cleared.');
    };

    if (domElements.employee.clearAllBtn) {
        domElements.employee.clearAllBtn.addEventListener('click', () => {
            showConfirm('Clear Current Page Ratings', 'Are you sure you want to clear all ratings on this page? This cannot be undone.', () => {
                clearAllRatings();
            });
        });
    }

    const findFirstInvalidApplicantPage = () => {
        for (let colIdx = 0; colIdx < appState.currentPendingApplicants.length; colIdx++) {
            const applicant = appState.currentPendingApplicants[colIdx];
            for (let rowIdx = 0; rowIdx < CRITERIA_NAMES.length; rowIdx++) {
                const key = getRatingKey(appState.currentUser.username, applicant.name, applicant.position, rowIdx);
                const val = localStorage.getItem(key);
                if (val === null || val === "") {
                    return Math.floor(colIdx / APPLICANTS_PER_PAGE);
                }
            }
        }
        return -1;
    };

    if (domElements.employee.preSubmitBtn) {
        domElements.employee.preSubmitBtn.addEventListener('click', () => {
            const invalidPage = findFirstInvalidApplicantPage();
            
            if (invalidPage !== -1) {
                if (invalidPage !== appState.currentEmployeePage) {
                    appState.currentEmployeePage = invalidPage;
                    renderEmployeeRatingTable();
                }
                
                setTimeout(() => {
                    if (domElements.employee.form) {
                        domElements.employee.form.reportValidity();
                    }
                }, 100);
                return;
            }

            let completeCount = appState.currentPendingApplicants.length; // Since we checked all are valid
            
            if (completeCount === 0) {
                showToast('No pending applicants to rate.', 'error');
                return;
            }

            const confirmMessage = `
                You are about to submit ratings for <strong>${completeCount} applicant(s)</strong> across all pages.<br><br>
                Please ensure all scores are correct before submitting.
            `;

            showConfirm('Submit Ratings?', confirmMessage, () => {
                submitRating();
            });
        });
    }

    const submitRating = async () => {
        const newRatings = [];
        const submittedApplicants = [];
        
        appState.currentPendingApplicants.forEach((applicant, colIdx) => {
            let scores = [];
            let totalScore = 0;
            const maxScore = 20;
            let isComplete = true;

            for (let rowIdx = 0; rowIdx < CRITERIA_NAMES.length; rowIdx++) {
                const input = document.getElementById(`score-${rowIdx}-${colIdx}`);
                let val = null;
                
                if (input) {
                    val = input.value !== "" ? parseFloat(input.value) : null;
                } else {
                    const key = getRatingKey(appState.currentUser.username, applicant.name, applicant.position, rowIdx);
                    const savedVal = localStorage.getItem(key);
                    if (savedVal !== null && savedVal !== "") {
                        val = parseFloat(savedVal);
                    }
                }
                
                if (val !== null && !isNaN(val)) {
                    scores.push(val);
                    totalScore += val;
                } else {
                    isComplete = false;
                    break;
                }
            }

            if (isComplete) {
                const ratingRecord = {
                    id: Date.now().toString() + '-' + colIdx + '-' + Math.random().toString(36).substr(2, 5),
                    date: new Date().toLocaleDateString(),
                    rater: appState.currentUser.fullName || appState.currentUser.username,
                    raterPosition: appState.currentUser.position || 'Employee',
                    raterUsername: appState.currentUser.username,
                    position: applicant.position,
                    applicant: applicant.name,
                    credentials: applicant.credentials ? [...applicant.credentials] : [],
                    scores,
                    totalScore,
                    maxScore,
                    division: applicant.division || null
                };
                newRatings.push(ratingRecord);
                submittedApplicants.push(applicant);
            }
        });

        if (newRatings.length === 0) return;

        await API.saveRatings(newRatings);

        submittedApplicants.forEach(applicant => {
            for (let i = 0; i < CRITERIA_NAMES.length; i++) {
                const key = getRatingKey(appState.currentUser.username, applicant.name, applicant.position, i);
                localStorage.removeItem(key);
            }
        });

        showToast(`Successfully submitted ${newRatings.length} ratings!`);
        domElements.employee.form.reset();
        
        appState.currentEmployeePage = 0;
        renderEmployeeRatingTable(); 
    };

    domElements.employee.form.addEventListener('submit', (e) => e.preventDefault());

    // Hook up pagination buttons
    const prevBtn = document.getElementById('prev-page-btn');
    const nextBtn = document.getElementById('next-page-btn');
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (appState.currentEmployeePage > 0) {
                appState.currentEmployeePage--;
                renderEmployeeRatingTable();
            }
        });
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(appState.currentPendingApplicants.length / APPLICANTS_PER_PAGE);
            if (appState.currentEmployeePage < totalPages - 1) {
                appState.currentEmployeePage++;
                renderEmployeeRatingTable();
            }
        });
    }

    uiManager.renderEmployeeRatingTable = renderEmployeeRatingTable;
};
