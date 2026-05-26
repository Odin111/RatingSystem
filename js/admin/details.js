import { domElements, appState } from '../state.js';
import { CRITERIA_NAMES, MAX_POINTS, ADMIN_MODAL_CHUNK_SIZE } from '../constants.js';
import { API } from '../api.js';
import { showToast, showConfirm, getLastName, escapeHTML } from '../utils.js';
import { showAdminTab, uiManager } from '../viewManager.js';

export const openDetails = (rater, mode = 'tab', preFilteredRatings = null) => {
    if (preFilteredRatings) {
        appState.currentAdminDetailsPreFiltered = preFilteredRatings;
    } else if (rater !== appState.currentAdminModalRater) {
        appState.currentAdminDetailsPreFiltered = null;
    }
    
    appState.currentAdminRaterRatings = preFilteredRatings || appState.currentAdminDetailsPreFiltered || appState.allRatings.filter(r => r.rater === rater);
    appState.currentAdminDetailsMode = mode;
    
    appState.currentAdminRaterRatings.sort((a, b) => getLastName(a.applicant).localeCompare(getLastName(b.applicant)));
    
    if (appState.currentAdminRaterRatings.length === 0) return;

    appState.currentAdminApplicantMap.clear();
    appState.currentAdminRaterRatings.forEach(r => {
        const obj = appState.allApplicants.find(a => a.name === r.applicant && a.position === r.position);
        if(obj) appState.currentAdminApplicantMap.set(`${r.applicant}-${r.position}`, obj);
    });

    appState.currentAdminModalRater = rater;
    localStorage.setItem('ratingSystem_currentDetailsRater', rater);
    appState.currentAdminDetailsPage = 0;

    const firstRating = appState.currentAdminRaterRatings[0];
    const raterName = firstRating.rater || 'N/A';
    const raterPosition = firstRating.raterPosition || 'N/A';

    let detailsHtml = `

        <div class="table-responsive freeze-pane" id="${mode === 'tab' ? 'admin-tab-table-wrapper' : 'admin-modal-table-wrapper'}">
            <table class="rating-table" id="${mode === 'tab' ? 'admin-tab-details-table' : 'admin-modal-details-table'}" style="border-collapse: separate; border-spacing: 0;">
                <thead>
                    <tr id="${mode === 'tab' ? 'admin-tab-details-thead-tr' : 'admin-modal-details-thead-tr'}">
                        <th style="min-width: 300px; max-width: 300px; position: sticky; left: 0; top: 0; background: var(--solid-bg); z-index: 40; border-right: 1px solid var(--glass-border); border-bottom: 2px solid var(--glass-border); padding: 15px;">CRITERIA/ATTRIBUTES</th>
                        <th style="width: 100px; min-width: 100px; position: sticky; left: 300px; top: 0; background: var(--solid-bg); z-index: 40; border-right: 2px solid var(--glass-border); border-bottom: 2px solid var(--glass-border); padding: 15px;">POINTS</th>
                    </tr>
                </thead>
                <tbody id="${mode === 'tab' ? 'admin-tab-details-tbody' : 'admin-modal-details-tbody'}">
                    ${CRITERIA_NAMES.map((name, i) => `
                        <tr>
                            <td style="position: sticky; left: 0; background: var(--solid-bg); z-index: 20; font-weight: 500; border-right: 1px solid var(--glass-border); border-bottom: 1px solid var(--glass-border); padding: 12px 15px; white-space: normal; word-break: break-word;">${name}</td>
                            <td style="text-align: center; font-weight: 600; position: sticky; left: 300px; background: var(--solid-bg); z-index: 20; border-right: 2px solid var(--glass-border); border-bottom: 1px solid var(--glass-border); padding: 12px;">${MAX_POINTS[i]}</td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot id="${mode === 'tab' ? 'admin-tab-details-tfoot' : 'admin-modal-details-tfoot'}">
                    <tr>
                        <td style="position: sticky; left: 0; background: var(--solid-bg); z-index: 20; text-align: right; border-right: 1px solid var(--glass-border); font-weight: 700; padding: 15px;">OVERALL SCORE</td>
                        <td id="${mode === 'tab' ? 'admin-tab-total-score' : 'admin-modal-total-score'}" style="text-align: center; color: var(--success); font-size: 1.1rem; font-weight: 800; position: sticky; left: 300px; background: var(--solid-bg); z-index: 20; border-right: 2px solid var(--glass-border); padding: 15px;">0</td>
                    </tr>
                </tfoot>
            </table>
        </div>

        <div class="pagination-controls" style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px; padding: 10px 0;">
            <button type="button" class="btn outline-btn details-prev-btn"><i class='bx bx-chevron-left'></i> Previous</button>
            <span class="details-page-indicator" style="font-weight: 500; color: var(--text-secondary);">Page 1 of 1</span>
            <button type="button" class="btn outline-btn details-next-btn">Next <i class='bx bx-chevron-right'></i></button>
        </div>

        <div style="margin-top: 40px; border-top: 1px solid var(--glass-border); padding-top: 30px;">
             <div class="rater-section" style="width: 300px;">
                <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 8px; font-weight: 600; text-transform: uppercase;">Rater:</p>
                <div style="border-bottom: 1px solid var(--text-primary); margin-bottom: 5px;">
                    <span style="font-weight: 700; font-size: 1.2rem; text-transform: uppercase;">${escapeHTML(raterName)}</span>
                </div>
                <p style="color: var(--text-muted); font-size: 0.9rem;">${escapeHTML(raterPosition)}</p>
            </div>
        </div>

        <div style="margin-top: 30px; display: flex; justify-content: flex-end; gap: 10px;">
             <button class="btn danger-btn delete-all-modal-btn" data-rater="${escapeHTML(rater)}">Delete this submission</button>
        </div>
    `;

    const container = mode === 'tab' ? domElements.detailsTab.body : domElements.detailsModal.body;
    container.innerHTML = detailsHtml;

    if (mode === 'modal') {
        domElements.detailsModal.el.classList.add('show');
    } else {
        showAdminTab('details');
    }

    // Set up listeners for the new structure
    container.querySelector('.details-prev-btn').addEventListener('click', () => {
        if (appState.currentAdminDetailsPage > 0) {
            renderAdminDetailsPage(appState.currentAdminDetailsPage - 1);
        }
    });

    container.querySelector('.details-next-btn').addEventListener('click', () => {
        const totalPages = Math.ceil(appState.currentAdminRaterRatings.length / ADMIN_MODAL_CHUNK_SIZE);
        if (appState.currentAdminDetailsPage < totalPages - 1) {
            renderAdminDetailsPage(appState.currentAdminDetailsPage + 1);
        }
    });

    const tableWrapper = container.querySelector('.table-responsive');
    tableWrapper.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.delete-individual-btn');
        if (deleteBtn) {
            deleteRating(deleteBtn.getAttribute('data-id'));
            return;
        }

        const restoreBtn = e.target.closest('.restore-individual-btn');
        if (restoreBtn) {
            if (uiManager.restoreRating) {
                uiManager.restoreRating(restoreBtn.getAttribute('data-id'));
            }
        }
    });

    const deleteAllBtn = container.querySelector('.delete-all-modal-btn');
    if (deleteAllBtn) {
        deleteAllBtn.addEventListener('click', (e) => {
            deleteRatingGroup(e.currentTarget.getAttribute('data-rater'));
        });
    }

    renderAdminDetailsPage(0);
};

const deleteRating = (id) => {
    showConfirm('Delete Rating', 'Are you sure you want to delete this specific rating form?', async () => {
        await API.deleteRating(id);
        if (appState.currentAdminDetailsPreFiltered) {
            appState.currentAdminDetailsPreFiltered = appState.currentAdminDetailsPreFiltered.filter(r => r.id !== id);
        }
        if (uiManager.renderAdminTable) uiManager.renderAdminTable();
        openDetails(appState.currentAdminModalRater, appState.currentAdminDetailsMode || 'tab');
        showToast('Rating deleted.', 'success');
    });
};
 
export const deleteRatingGroup = (rater) => {
    showConfirm('Delete this submission', `Are you sure you want to delete ALL rating forms from <strong>${rater}</strong>?`, async () => {
        const ratings = appState.currentAdminDetailsPreFiltered || appState.allRatings.filter(r => r.rater === rater);
        for (const r of ratings) {
            await API.deleteRating(r.id);
        }
        if (appState.currentAdminDetailsPreFiltered) {
            appState.currentAdminDetailsPreFiltered = null;
        }
        if (uiManager.renderAdminTable) uiManager.renderAdminTable();
        if (appState.currentAdminDetailsMode === 'modal') {
            domElements.detailsModal.el.classList.remove('show');
        } else {
            showAdminTab('submissions');
        }
        showToast(`All submissions from ${rater} deleted.`, 'success');
    });
};

const renderAdminDetailsPage = (pageIndex) => {
    appState.currentAdminDetailsPage = pageIndex;
    const mode = appState.currentAdminDetailsMode;
    const container = mode === 'tab' ? domElements.detailsTab.body : domElements.detailsModal.body;
    
    const startIdx = pageIndex * ADMIN_MODAL_CHUNK_SIZE;
    const endIdx = Math.min(startIdx + ADMIN_MODAL_CHUNK_SIZE, appState.currentAdminRaterRatings.length);
    const chunkRatings = appState.currentAdminRaterRatings.slice(startIdx, endIdx);
    const totalPages = Math.ceil(appState.currentAdminRaterRatings.length / ADMIN_MODAL_CHUNK_SIZE);

    // Update Pagination UI
    const prevBtn = container.querySelector('.details-prev-btn');
    const nextBtn = container.querySelector('.details-next-btn');
    const indicator = container.querySelector('.details-page-indicator');

    if (prevBtn) prevBtn.disabled = pageIndex === 0;
    if (nextBtn) nextBtn.disabled = pageIndex >= totalPages - 1 || totalPages <= 1;
    if (indicator) indicator.textContent = `Page ${pageIndex + 1} of ${Math.max(1, totalPages)}`;

    // Clear previous dynamic columns
    const theadTr = container.querySelector(mode === 'tab' ? '#admin-tab-details-thead-tr' : '#admin-modal-details-thead-tr');
    const tbody = container.querySelector(mode === 'tab' ? '#admin-tab-details-tbody' : '#admin-modal-details-tbody');
    const tfootRow = container.querySelector(mode === 'tab' ? '#admin-tab-details-tfoot tr' : '#admin-modal-details-tfoot tr');

    if (!theadTr || !tbody) return;

    // Remove columns beyond the first two (Criteria and Points)
    while (theadTr.children.length > 2) theadTr.removeChild(theadTr.lastChild);
    Array.from(tbody.children).forEach(tr => {
        while (tr.children.length > 2) tr.removeChild(tr.lastChild);
    });
    while (tfootRow.children.length > 1) tfootRow.removeChild(tfootRow.lastChild);

    // Reset total score display for the page
    const totalScoreTdId = mode === 'tab' ? 'admin-tab-total-score' : 'admin-modal-total-score';
    const totalScoreTd = tfootRow.querySelector(`#${totalScoreTdId}`);
    if (totalScoreTd) totalScoreTd.textContent = '0';

    chunkRatings.forEach(r => {
        const applicantObj = appState.currentAdminApplicantMap.get(`${r.applicant}-${r.position}`);
        let creds = r.credentials || (applicantObj ? applicantObj.credentials : []);
        let tooltip = creds && creds.length > 0 
            ? escapeHTML('Credentials:\n• ' + creds.join('\n• ')) 
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
        
        let actionsHtml = `<button class="btn outline-btn delete-individual-btn" data-id="${r.id}" style="margin-top: 5px; padding: 2px 8px; font-size: 0.75rem;"><i class='bx bx-trash'></i> Delete</button>`;
        
        if (mode === 'modal') {
            actionsHtml += `
                <br>
                <button class="btn outline-btn restore-individual-btn" data-id="${r.id}" style="margin-top: 5px; padding: 2px 8px; font-size: 0.75rem; color: #10b981; border-color: #10b981;">
                    <i class='bx bx-undo'></i> Restore
                </button>
            `;
        }

        th.innerHTML = `
            <span class="tooltip-container" data-tooltip="${tooltip}" style="display: inline-block; cursor: help; font-weight: 700; border-bottom: 1px dashed var(--text-muted);">${escapeHTML(r.applicant)}</span><br>
            <span style="font-size: 0.8rem; font-weight: normal; color: var(--text-muted);">${escapeHTML(r.position)}</span>
            <br>
            ${actionsHtml}
        `;
        theadTr.appendChild(th);

        let applicantTotal = 0;
        CRITERIA_NAMES.forEach((_, index) => {
            const td = document.createElement('td');
            td.style.textAlign = 'center';
            td.style.fontWeight = 'bold';
            td.style.borderBottom = '1px solid var(--glass-border)';
            td.style.padding = '12px';
            const val = r.scores[index] !== undefined ? r.scores[index] : 0;
            td.innerHTML = val;
            tbody.children[index].appendChild(td);
            applicantTotal += parseFloat(val);
        });

        // Add total score for THIS applicant in tfoot
        const tdFoot = document.createElement('td');
        tdFoot.style.textAlign = 'center';
        tdFoot.style.fontWeight = '800';
        tdFoot.style.color = 'var(--primary-color)';
        tdFoot.style.padding = '15px';
        tdFoot.textContent = applicantTotal.toFixed(1);
        tfootRow.appendChild(tdFoot);
    });

    let pageTotal = chunkRatings.reduce((sum, r) => sum + (r.totalScore || 0), 0);
    if (totalScoreTd) totalScoreTd.textContent = pageTotal.toFixed(1);

    const wrapper = container.querySelector('.table-responsive');
    if (wrapper) wrapper.scrollLeft = 0;
};

export const initDetails = () => {
    uiManager.openDetails = openDetails;

    if (domElements.detailsTab.backBtn) {
        domElements.detailsTab.backBtn.addEventListener('click', () => {
            showAdminTab('submissions');
        });
    }
};
