import { domElements, appState } from '../state.js';
import { getLastName, escapeHTML, showToast, showConfirm } from '../utils.js';
import { uiManager } from '../viewManager.js';
import { exportRaterToExcel } from './export.js';
import { API } from '../api.js';

const DIVISIONS = ['LTID', 'PBDD', 'STOD', 'LD', 'PARAD', 'PARPO I', 'PARPO II', 'Unassigned'];

const renderDivisionTabs = () => {
    const nav = domElements.admin.divisionTabsNav;
    if (!nav) return;
    
    nav.innerHTML = '';
    
    DIVISIONS.forEach(div => {
        const count = appState.allRatings.filter(r => {
            const rDiv = r.division || 'Unassigned';
            return rDiv === div;
        }).length;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `division-tab-btn ${appState.activeDivisionTab === div ? 'active' : ''}`;
        btn.setAttribute('data-division', div);
        btn.innerHTML = `${div} <span class="tab-badge">${count}</span>`;
        btn.addEventListener('click', () => {
            appState.activeDivisionTab = div;
            renderAdminTable();
        });
        nav.appendChild(btn);
    });
};

export const renderAdminTable = () => {
    if (!appState.activeDivisionTab) {
        appState.activeDivisionTab = 'LTID';
    }

    renderDivisionTabs();

    if (appState.adminSubmissionsObserver) {
        appState.adminSubmissionsObserver.disconnect();
        appState.adminSubmissionsObserver = null;
    }

    domElements.admin.tbody.innerHTML = '';
    
    if (appState.allRatings.length === 0) {
        domElements.admin.emptyState.classList.remove('hidden');
        domElements.admin.tbody.classList.add('hidden');
        return;
    }

    let filteredRatings = appState.allRatings.filter(r => {
        const div = r.division || 'Unassigned';
        if (div !== appState.activeDivisionTab) return false;
        if (appState.adminRaterSearchQuery) {
            return r.rater.toLowerCase().includes(appState.adminRaterSearchQuery);
        }
        return true;
    });

    if (filteredRatings.length === 0) {
        domElements.admin.emptyState.classList.remove('hidden');
        domElements.admin.tbody.classList.add('hidden');
        domElements.admin.emptyState.querySelector('p').textContent = appState.adminRaterSearchQuery 
            ? 'No submissions match your search in this division.'
            : `No submissions found for division ${appState.activeDivisionTab}.`;
        return;
    }

    domElements.admin.emptyState.classList.add('hidden');
    domElements.admin.tbody.classList.remove('hidden');

    // Group by position and rater
    const positionGroups = {};
    filteredRatings.forEach(r => {
        const pos = r.position || 'Unassigned Position';
        if (!positionGroups[pos]) {
            positionGroups[pos] = {};
        }
        const raterKey = r.rater;
        if (!positionGroups[pos][raterKey]) {
            positionGroups[pos][raterKey] = {
                rater: r.rater,
                latestDate: r.date,
                dateOfApplication: r.dateOfApplication || '',
                ratings: []
            };
        }
        if (r.date > positionGroups[pos][raterKey].latestDate) {
            positionGroups[pos][raterKey].latestDate = r.date;
        }
        if (r.dateOfApplication) {
            positionGroups[pos][raterKey].dateOfApplication = r.dateOfApplication;
        }
        positionGroups[pos][raterKey].ratings.push(r);
    });

    const sortedPositions = Object.keys(positionGroups).sort();
    
    sortedPositions.forEach(position => {
        const posWrapper = document.createElement('div');
        posWrapper.className = 'position-group-wrapper';
        posWrapper.style.marginBottom = '30px';

        const posHeader = document.createElement('h3');
        posHeader.className = 'position-group-title';
        posHeader.style.display = 'flex';
        posHeader.style.alignItems = 'center';
        posHeader.style.gap = '8px';
        posHeader.style.marginTop = '20px';
        posHeader.style.marginBottom = '10px';
        posHeader.style.color = 'var(--primary-color)';
        posHeader.innerHTML = `<i class='bx bx-briefcase'></i> Position: ${escapeHTML(position)}`;
        posWrapper.appendChild(posHeader);

        const tableResponsive = document.createElement('div');
        tableResponsive.className = 'table-responsive';

        const table = document.createElement('table');
        table.className = 'data-table';
        
        table.innerHTML = `
            <thead>
                <tr>
                    <th>DATE OF BEI</th>
                    <th>DATE OF APPLICATION</th>
                    <th>RATER</th>
                    <th>APPLICANTS RATED</th>
                    <th>ACTION</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;

        const tbody = table.querySelector('tbody');
        const ratersList = Object.values(positionGroups[position]).sort((a, b) => 
            getLastName(a.rater).localeCompare(getLastName(b.rater))
        );

        ratersList.forEach(group => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${escapeHTML(group.latestDate)}</td>
                <td>
                    <input type="date" class="date-app-input" data-rater="${escapeHTML(group.rater)}" value="${group.dateOfApplication || ''}">
                </td>
                <td>${escapeHTML(group.rater)}</td>
                <td style="font-weight: 600;">${group.ratings.length} Applicant(s)</td>
                <td>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <button class="btn outline-btn view-btn" data-rater="${escapeHTML(group.rater)}" data-position="${escapeHTML(position)}">View Details</button>
                        <button class="btn export-btn export-row-btn" data-rater="${escapeHTML(group.rater)}" data-position="${escapeHTML(position)}" style="padding: 8px 12px;" title="Export to Excel"><i class='bx bx-export'></i></button>
                        <button class="btn danger-btn delete-row-btn" data-rater="${escapeHTML(group.rater)}" data-position="${escapeHTML(position)}" style="padding: 8px 12px;" title="Delete this submission"><i class='bx bx-trash'></i></button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        tableResponsive.appendChild(table);
        posWrapper.appendChild(tableResponsive);
        domElements.admin.tbody.appendChild(posWrapper);
    });
};

const handleAdminTableClick = (e) => {
    const viewBtn = e.target.closest('.view-btn');
    if (viewBtn) {
        const rater = viewBtn.getAttribute('data-rater');
        const pos = viewBtn.getAttribute('data-position');
        const div = appState.activeDivisionTab;
        const ratings = appState.allRatings.filter(r => r.rater === rater && r.position === pos && (r.division || 'Unassigned') === div);
        if (uiManager.openDetails) {
            uiManager.openDetails(rater, 'tab', ratings);
        }
        return;
    }

    const exportBtn = e.target.closest('.export-row-btn');
    if (exportBtn) {
        const rater = exportBtn.getAttribute('data-rater');
        const pos = exportBtn.getAttribute('data-position');
        const div = appState.activeDivisionTab;
        const ratings = appState.allRatings.filter(r => r.rater === rater && r.position === pos && (r.division || 'Unassigned') === div);
        exportRaterToExcel(rater, ratings);
        return;
    }

    const deleteBtn = e.target.closest('.delete-row-btn');
    if (deleteBtn) {
        const rater = deleteBtn.getAttribute('data-rater');
        const pos = deleteBtn.getAttribute('data-position');
        const div = appState.activeDivisionTab;
        const ratings = appState.allRatings.filter(r => r.rater === rater && r.position === pos && (r.division || 'Unassigned') === div);
        
        showConfirm('Delete this submission', `Are you sure you want to delete rating forms from <strong>${rater}</strong> for position <strong>${pos}</strong> in division <strong>${div}</strong>?`, async () => {
            for (const r of ratings) {
                await API.deleteRating(r.id);
            }
            if (uiManager.renderAdminTable) uiManager.renderAdminTable();
            showToast('Submissions deleted.', 'success');
        });
    }
};

export const initSubmissions = () => {
    const adminSearchRaterInput = document.getElementById('admin-search-rater');
    const clearRaterSearchBtn = document.getElementById('clear-rater-search');

    if (adminSearchRaterInput) {
        adminSearchRaterInput.addEventListener('input', (e) => {
            appState.adminRaterSearchQuery = e.target.value.toLowerCase();
            if (clearRaterSearchBtn) {
                clearRaterSearchBtn.classList.toggle('show', e.target.value.length > 0);
            }
            renderAdminTable();
        });
    }

    if (clearRaterSearchBtn) {
        clearRaterSearchBtn.addEventListener('click', () => {
            adminSearchRaterInput.value = '';
            appState.adminRaterSearchQuery = '';
            clearRaterSearchBtn.classList.remove('show');
            renderAdminTable();
            adminSearchRaterInput.focus();
        });
    }

    if (domElements.admin.tbody) {
        domElements.admin.tbody.removeEventListener('click', handleAdminTableClick);
        domElements.admin.tbody.addEventListener('click', handleAdminTableClick);

        domElements.admin.tbody.addEventListener('change', async (e) => {
            const dateInput = e.target.closest('.date-app-input');
            if (dateInput) {
                const rater = dateInput.getAttribute('data-rater');
                const newDate = dateInput.value;
                try {
                    await API.updateDateOfApplication(rater, newDate);
                    showToast('Date of Application updated.', 'success');
                } catch (err) {
                    console.error(err);
                    showToast('Failed to update Date of Application.', 'error');
                }
            }
        });
    }
    uiManager.renderAdminTable = renderAdminTable;
};
