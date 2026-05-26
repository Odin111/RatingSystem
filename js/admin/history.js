import { domElements, appState } from '../state.js';
import { CRITERIA_NAMES, MAX_POINTS } from '../constants.js';
import { API } from '../api.js';
import { showToast, showConfirm, escapeHTML } from '../utils.js';
import { switchView, showAdminTab, uiManager } from '../viewManager.js';

export const renderHistoryTable = () => {
    domElements.admin.historyTbody.innerHTML = '';
    
    if (appState.deletedRatings.length === 0) {
        domElements.admin.noHistoryMsg.classList.remove('hidden');
        domElements.admin.historyTbody.parentElement.classList.add('hidden');
        return;
    }

    domElements.admin.noHistoryMsg.classList.add('hidden');
    domElements.admin.historyTbody.parentElement.classList.remove('hidden');

    // Group by Rater and dateDeleted
    const groups = {};
    appState.deletedRatings.forEach(rating => {
        const key = `${rating.raterUsername || rating.rater}|${rating.dateDeleted}`;
        if (!groups[key]) {
            groups[key] = {
                rater: rating.rater,
                raterUsername: rating.raterUsername,
                dateDeleted: rating.dateDeleted,
                positions: new Set(),
                applicants: new Set(),
                items: []
            };
        }
        groups[key].positions.add(rating.position);
        groups[key].applicants.add(rating.applicant);
        groups[key].items.push(rating);
    });

    const sortedGroups = Object.values(groups).sort((a, b) => b.dateDeleted.localeCompare(a.dateDeleted));

    sortedGroups.forEach((group, groupIdx) => {
        const tr = document.createElement('tr');
        const posList = Array.from(group.positions).join(', ');
        
        tr.innerHTML = `
            <td>${escapeHTML(group.dateDeleted)}</td>
            <td>${escapeHTML(group.rater)}</td>
            <td style="max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHTML(posList)}">${escapeHTML(posList)}</td>
            <td style="font-weight: bold;">${group.items.length} Applicant(s)</td>
            <td>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <button class="btn outline-btn view-group-btn" data-group-idx="${groupIdx}" style="padding: 6px 12px; font-weight: 600; font-size: 0.85rem;">View Details</button>
                    <button class="btn outline-btn restore-group-btn" data-group-idx="${groupIdx}" style="padding: 6px 8px; border-radius: 8px; color: #10b981; border-color: #10b981;" title="Restore Batch"><i class='bx bx-undo' style="font-size: 1.2rem;"></i></button>
                    <button class="btn outline-btn delete-group-btn" data-group-idx="${groupIdx}" style="padding: 6px 8px; border-radius: 8px; color: #ef4444; border-color: #ef4444;" title="Delete Batch Permanently"><i class='bx bx-trash' style="font-size: 1.2rem;"></i></button>
                </div>
            </td>
        `;
        domElements.admin.historyTbody.appendChild(tr);
    });

    domElements.admin.historyTbody.querySelectorAll('.view-group-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = e.currentTarget.getAttribute('data-group-idx');
            viewGroupDetails(sortedGroups[idx]);
        });
    });

    domElements.admin.historyTbody.querySelectorAll('.restore-group-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = e.currentTarget.getAttribute('data-group-idx');
            restoreGroup(sortedGroups[idx]);
        });
    });

    domElements.admin.historyTbody.querySelectorAll('.delete-group-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = e.currentTarget.getAttribute('data-group-idx');
            permDeleteGroup(sortedGroups[idx]);
        });
    });
};

const viewGroupDetails = (group) => {
    appState.detailsReturnTarget = 'history';

    let detailsHtml = `
        <div style="margin-bottom: 25px; border-bottom: 2px solid var(--primary-color); padding-bottom: 15px; display: flex; justify-content: space-between; align-items: flex-end;">
            <div>
                <p style="color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px;">Rater Profile</p>
                <h2 style="text-transform: uppercase; margin: 0; color: var(--text-primary);">${escapeHTML(group.rater)}</h2>
                <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 5px;">${escapeHTML(group.items[0].raterPosition || 'Employee')}</p>
            </div>
            <div style="text-align: right;">
                <p style="color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase; margin-bottom: 5px;">Archived Date</p>
                <p style="font-weight: 600; font-size: 1.1rem; color: var(--secondary-color);">${escapeHTML(group.dateDeleted)}</p>
            </div>
        </div>

        <div style="margin-bottom: 15px;">
            <h4 style="color: var(--text-primary); margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
                <i class='bx bx-group'></i> Rated Applicants (${group.items.length})
            </h4>
        </div>

        <div class="table-responsive freeze-pane" style="max-height: 400px; overflow-y: auto;">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>APPLICANT</th>
                        <th>POSITION</th>
                        <th style="text-align: center;">TOTAL SCORE</th>
                        <th style="text-align: center;">ACTION</th>
                    </tr>
                </thead>
                <tbody>
    `;

    group.items.sort((a, b) => a.applicant.localeCompare(b.applicant)).forEach(rating => {
        detailsHtml += `
            <tr>
                <td><strong>${escapeHTML(rating.applicant)}</strong></td>
                <td>${escapeHTML(rating.position)}</td>
                <td style="text-align: center; font-weight: bold; color: var(--primary-color);">${rating.totalScore} / ${rating.maxScore}</td>
                <td style="text-align: center;">
                    <button class="btn outline-btn view-item-btn" data-id="${rating.id}" style="padding: 4px 10px; font-size: 0.8rem;">View Full BEI</button>
                </td>
            </tr>
        `;
    });

    detailsHtml += `
                </tbody>
            </table>
        </div>
    `;
    
    const detailsContainer = document.getElementById('modal-details-body');
    if (detailsContainer) {
        detailsContainer.innerHTML = detailsHtml;
        
        detailsContainer.querySelectorAll('.view-item-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                viewSingleRating(id);
            });
        });
        
        uiManager.openDetails(group.items[0].rater, 'modal', group.items);
    }
};

const restoreGroup = async (group) => {
    showConfirm('Restore Group', `Are you sure you want to restore all <strong>${group.items.length}</strong> ratings by <strong>${group.rater}</strong>?`, async () => {
        const ids = group.items.map(r => r.id);
        await API.restoreBulk('rating', ids);
        renderHistoryTable();
        if (uiManager.renderAdminTable) uiManager.renderAdminTable();
        showToast(`Restored batch of ${group.items.length} ratings successfully.`, 'success');
    });
};

const permDeleteGroup = (group) => {
    showConfirm('Delete Permanently', `Are you sure you want to permanently delete these <strong>${group.items.length}</strong> ratings? This cannot be undone.`, async () => {
        const ids = group.items.map(r => r.id);
        await API.deleteHistoryBulk(ids);
        renderHistoryTable();
        showToast(`Permanently deleted ${group.items.length} ratings.`, 'success');
    });
};

const viewSingleRating = (id) => {
    const rating = appState.deletedRatings.find(r => r.id === id);
    if (!rating) return;
    
    appState.detailsReturnTarget = 'history';

    let detailsHtml = `
        <div style="margin-bottom: 20px;">
            <h3 style="text-transform: uppercase; margin-bottom: 5px;">DELETED RATING - BEI</h3>
        </div>
        <div class="table-responsive freeze-pane">
            <table class="data-table" style="min-width: 600px;">
                <thead>
                    <tr>
                        <th style="width: 50%;">CRITERIA/ATTRIBUTES</th>
                        <th style="width: 25%; text-align: center;">POINTS</th>
                        <th style="text-align: center;">${escapeHTML(rating.applicant)}<br><span style="font-size: 0.8rem; font-weight: normal; color: var(--text-muted);">${escapeHTML(rating.position)}</span></th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    CRITERIA_NAMES.forEach((criteria, index) => {
        detailsHtml += `
            <tr>
                <td>${criteria}</td>
                <td style="text-align: center; font-weight: 600; color: var(--text-muted);">${MAX_POINTS[index]}</td>
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
                    <span style="font-weight: 700; font-size: 1.1rem; text-transform: uppercase;">${escapeHTML(rating.rater)}</span>
                </div>
                <p style="color: var(--text-muted); font-size: 0.85rem;">${escapeHTML(rating.raterPosition || 'Employee')}</p>
            </div>
        </div>
    `;

    uiManager.openDetails(rating.rater, 'modal', [rating]);
};

const restoreRating = (id) => {
    const ratingToRestore = appState.deletedRatings.find(r => r.id === id);
    if (!ratingToRestore) return;

    const conflict = appState.allRatings.find(r => 
        r.rater === ratingToRestore.rater && 
        r.applicant === ratingToRestore.applicant && 
        r.position === ratingToRestore.position
    );

    if (conflict) {
        showConfirm(
            'Conflict Detected', 
            `An active submission for <strong>${ratingToRestore.applicant}</strong> by <strong>${ratingToRestore.rater}</strong> already exists. What would you like to do?`,
            async () => {
                // Overwrite
                await API.deleteRating(conflict.id);
                await API.restore('rating', { id });
                renderHistoryTable();
                if (uiManager.renderAdminTable) uiManager.renderAdminTable();
                
                // If the details modal is open, refresh it
                if (domElements.detailsModal.el.classList.contains('show') && appState.currentAdminModalRater) {
                    const updatedGroup = appState.deletedRatings.filter(r => 
                        (r.raterUsername || r.rater) === (ratingToRestore.raterUsername || ratingToRestore.rater) && 
                        r.dateDeleted === ratingToRestore.dateDeleted
                    );
                    
                    if (updatedGroup.length > 0) {
                        uiManager.openDetails(ratingToRestore.rater, 'modal', updatedGroup);
                    } else {
                        domElements.detailsModal.el.classList.remove('show');
                    }
                }
                
                showToast('Existing submission overwritten and restored.', 'success');
            },
            'Overwrite'
        );
    } else {
        showConfirm('Restore Rating', 'Are you sure you want to restore this rating?', async () => {
            await API.restore('rating', { id });
            renderHistoryTable();
            if (uiManager.renderAdminTable) uiManager.renderAdminTable();
            
            // If the details modal is open, refresh it
            if (domElements.detailsModal.el.classList.contains('show') && appState.currentAdminModalRater) {
                const groupKey = `${ratingToRestore.raterUsername || ratingToRestore.rater}|${ratingToRestore.dateDeleted}`;
                // Re-find the group from updated appState.deletedRatings
                const updatedGroup = appState.deletedRatings.filter(r => 
                    (r.raterUsername || r.rater) === (ratingToRestore.raterUsername || ratingToRestore.rater) && 
                    r.dateDeleted === ratingToRestore.dateDeleted
                );
                
                if (updatedGroup.length > 0) {
                    uiManager.openDetails(ratingToRestore.rater, 'modal', updatedGroup);
                } else {
                    domElements.detailsModal.el.classList.remove('show');
                }
            }
            
            showToast('Rating restored.', 'success');
        });
    }
};

const permDeleteRating = (id) => {
    showConfirm('Delete Permanently', 'Are you sure you want to permanently delete this rating? This cannot be undone.', async () => {
        await API.deleteHistoryRating(id);
        renderHistoryTable();
        showToast('Rating permanently deleted.', 'success');
    });
};

export const renderApplicantHistoryTable = () => {
    const container = domElements.admin.applicantHistoryContainer;
    if (!container) return;
    
    container.innerHTML = '';
    
    if (appState.deletedApplicants.length === 0) {
        domElements.admin.noApplicantHistoryMsg.classList.remove('hidden');
        container.classList.add('hidden');
        return;
    }

    domElements.admin.noApplicantHistoryMsg.classList.add('hidden');
    container.classList.remove('hidden');

    // Group applicants by batch name
    const groups = {};
    appState.deletedApplicants.forEach(applicant => {
        const batchName = applicant.batch || 'Unbatched';
        if (!groups[batchName]) {
            groups[batchName] = [];
        }
        groups[batchName].push(applicant);
    });

    // Sort batch names (Unbatched always at the end)
    const sortedBatchNames = Object.keys(groups).sort((a, b) => {
        if (a === 'Unbatched') return 1;
        if (b === 'Unbatched') return -1;
        return a.localeCompare(b);
    });

    sortedBatchNames.forEach((batchName) => {
        const applicants = groups[batchName];
        
        // Sort applicants inside the batch by dateDeleted desc, then name
        applicants.sort((a, b) => {
            const dateCompare = (b.dateDeleted || '').localeCompare(a.dateDeleted || '');
            if (dateCompare !== 0) return dateCompare;
            return a.name.localeCompare(b.name);
        });

        const folderSection = document.createElement('div');
        folderSection.className = 'history-folder-section animate-fade';

        // Build header
        let actionButtonsHtml = '';
        if (batchName !== 'Unbatched') {
            actionButtonsHtml = `
                <div class="history-folder-actions">
                    <button class="btn outline-btn restore-folder-btn" style="color: #10b981; border-color: #10b981; background: transparent; padding: 6px 12px; font-size: 0.85rem;"><i class="bx bx-undo"></i> Restore Folder</button>
                    <button class="btn outline-btn delete-folder-btn" style="color: #ef4444; border-color: #ef4444; background: transparent; padding: 6px 12px; font-size: 0.85rem;"><i class="bx bx-trash"></i> Delete Folder</button>
                </div>
            `;
        }

        folderSection.innerHTML = `
            <div class="history-folder-header">
                <div class="history-folder-title">
                    <i class="bx bxs-folder"></i>
                    <span>${escapeHTML(batchName)} (${applicants.length} Form${applicants.length === 1 ? '' : 's'})</span>
                </div>
                ${actionButtonsHtml}
            </div>
            <div class="table-responsive" style="margin-bottom: 0;">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Applicant Name</th>
                            <th>Division</th>
                            <th>Position</th>
                            <th>Date Deleted</th>
                            <th style="width: 100px; text-align: center;">Action</th>
                        </tr>
                    </thead>
                    <tbody class="history-folder-tbody">
                        <!-- Filled dynamically -->
                    </tbody>
                </table>
            </div>
        `;

        const tbody = folderSection.querySelector('.history-folder-tbody');
        applicants.forEach(applicant => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${escapeHTML(applicant.name)}</strong></td>
                <td>${escapeHTML(applicant.division || 'Unassigned')}</td>
                <td>${escapeHTML(applicant.position)}</td>
                <td>${escapeHTML(applicant.dateDeleted || '')}</td>
                <td style="text-align: center;">
                    <div style="display: flex; gap: 8px; justify-content: center; align-items: center;">
                        <button class="btn outline-btn restore-applicant-btn" data-name="${escapeHTML(applicant.name)}" data-position="${escapeHTML(applicant.position)}" title="Restore Form" style="padding: 6px 10px;"><i class='bx bx-undo'></i></button>
                        <button class="btn danger-btn perm-delete-applicant-btn" data-name="${escapeHTML(applicant.name)}" data-position="${escapeHTML(applicant.position)}" title="Delete Permanently" style="padding: 6px 10px;"><i class='bx bx-trash'></i></button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Add event listeners for folder buttons
        const restoreFolderBtn = folderSection.querySelector('.restore-folder-btn');
        if (restoreFolderBtn) {
            restoreFolderBtn.addEventListener('click', () => {
                showConfirm('Restore Folder', `Are you sure you want to restore the entire batch folder "<strong>${escapeHTML(batchName)}</strong>" and all its applicants?`, async () => {
                    try {
                        await API.restoreFolder(batchName);
                        renderApplicantHistoryTable();
                        if (uiManager.renderAdminApplicantsTable) uiManager.renderAdminApplicantsTable();
                        showToast(`Restored batch folder "${batchName}" and all applicants inside it.`);
                    } catch (err) {
                        showToast('Failed to restore batch folder', 'error');
                    }
                });
            });
        }

        const deleteFolderBtn = folderSection.querySelector('.delete-folder-btn');
        if (deleteFolderBtn) {
            deleteFolderBtn.addEventListener('click', () => {
                showConfirm('Delete Folder Permanently', `Are you sure you want to permanently delete the folder "<strong>${escapeHTML(batchName)}</strong>" and ALL its applicants? This cannot be undone.`, async () => {
                    try {
                        await API.deleteHistoryFolder(batchName);
                        renderApplicantHistoryTable();
                        showToast(`Permanently deleted batch folder "${batchName}" and all its contents.`);
                    } catch (err) {
                        showToast('Failed to delete batch folder', 'error');
                    }
                });
            });
        }

        // Add event listeners for individual applicant buttons
        tbody.querySelectorAll('.restore-applicant-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const name = e.currentTarget.getAttribute('data-name');
                const pos = e.currentTarget.getAttribute('data-position');
                restoreApplicant(name, pos);
            });
        });

        tbody.querySelectorAll('.perm-delete-applicant-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const name = e.currentTarget.getAttribute('data-name');
                const pos = e.currentTarget.getAttribute('data-position');
                permDeleteApplicant(name, pos);
            });
        });

        container.appendChild(folderSection);
    });
};

const restoreApplicant = (name, position) => {
    const applicantToRestore = appState.deletedApplicants.find(a => a.name === name && a.position === position);
    if (!applicantToRestore) return;

    const conflict = appState.allApplicants.find(a => a.name.toLowerCase() === name.toLowerCase() && a.position.toLowerCase() === position.toLowerCase());
    
    if (conflict) {
        showConfirm(
            'Applicant Form Exists', 
            `An applicant rating form for <strong>${name}</strong> (${position}) already exists. What would you like to do?`,
            async () => {
                // Overwrite
                await API.restore('applicant', { name, position });
                renderApplicantHistoryTable();
                if (uiManager.renderAdminApplicantsTable) uiManager.renderAdminApplicantsTable();
                showToast('Applicant form overwritten and restored.', 'success');
            },
            'Overwrite'
        );
    } else {
        showConfirm('Restore Applicant', 'Are you sure you want to restore this applicant form?', async () => {
            await API.restore('applicant', { name, position });
            renderApplicantHistoryTable();
            if (uiManager.renderAdminApplicantsTable) uiManager.renderAdminApplicantsTable();
            showToast('Applicant form restored.', 'success');
        });
    }
};

const permDeleteApplicant = (name, position) => {
    showConfirm('Delete Permanently', 'Are you sure you want to permanently delete this applicant? This cannot be undone.', async () => {
        await API.deleteHistoryApplicant(name, position);
        renderApplicantHistoryTable();
        showToast('Applicant permanently deleted.', 'success');
    });
};

export const initHistory = () => {
    if (domElements.admin.historyBtn) {
        domElements.admin.historyBtn.addEventListener('click', () => {
            showAdminTab('history');
        });
    }

    if (domElements.admin.backToSubmissionsFromHistory) {
        domElements.admin.backToSubmissionsFromHistory.addEventListener('click', () => {
            showAdminTab('submissions');
        });
    }

    if (domElements.detailsModal.closeBtn) {
        domElements.detailsModal.closeBtn.addEventListener('click', () => {
            domElements.detailsModal.el.classList.remove('show');
        });
    }

    domElements.admin.restoreAllBtn.addEventListener('click', () => {
        if (appState.deletedRatings.length === 0) return;

        const conflicts = appState.deletedRatings.filter(dr => 
            appState.allRatings.some(ar => 
                ar.rater === dr.rater && 
                ar.applicant === dr.applicant && 
                ar.position === dr.position
            )
        );

        if (conflicts.length > 0) {
            showConfirm(
                'Bulk Restore Conflicts',
                `There are <strong>${conflicts.length}</strong> submissions that already exist. Restoring all will overwrite them. Continue?`,
                async () => {
                    await API.restoreAll('ratings', { overwrite: true });
                    renderHistoryTable();
                    if (uiManager.renderAdminTable) uiManager.renderAdminTable();
                    showToast('All submissions restored (conflicts were overwritten).', 'success');
                },
                'Overwrite All'
            );
        } else {
            showConfirm('Restore All', 'Are you sure you want to restore all deleted ratings?', async () => {
                await API.restoreAll('ratings');
                renderHistoryTable();
                if (uiManager.renderAdminTable) uiManager.renderAdminTable();
                showToast('All ratings restored.', 'success');
            });
        }
    });

    domElements.admin.deleteAllHistoryBtn.addEventListener('click', () => {
        if (appState.deletedRatings.length === 0) return;
        showConfirm('Delete All Permanently', 'Are you sure you want to permanently delete all history? This cannot be undone.', async () => {
            await API.clearHistory('ratings');
            renderHistoryTable();
            showToast('History cleared permanently.', 'success');
        });
    });

    if (domElements.admin.applicantHistoryBtn) {
        domElements.admin.applicantHistoryBtn.addEventListener('click', () => {
            renderApplicantHistoryTable();
            domElements.admin.applicantHistoryModal.classList.add('show');
        });
    }

    if (domElements.admin.applicantHistoryClose) {
        domElements.admin.applicantHistoryClose.addEventListener('click', () => {
            domElements.admin.applicantHistoryModal.classList.remove('show');
        });
    }

    if (domElements.admin.restoreAllApplicantsBtn) {
        domElements.admin.restoreAllApplicantsBtn.addEventListener('click', () => {
            if (appState.deletedApplicants.length === 0) return;

            const conflicts = appState.deletedApplicants.filter(da => 
                appState.allApplicants.some(aa => 
                    aa.name.toLowerCase() === da.name.toLowerCase() && 
                    aa.position.toLowerCase() === da.position.toLowerCase()
                )
            );

            if (conflicts.length > 0) {
                showConfirm(
                    'Bulk Restore Conflicts',
                    `There are <strong>${conflicts.length}</strong> applicant forms that already exist. Restoring all will overwrite them. Continue?`,
                    async () => {
                        await API.restoreAll('applicants', { overwrite: true });
                        renderApplicantHistoryTable();
                        if (uiManager.renderAdminApplicantsTable) uiManager.renderAdminApplicantsTable();
                        showToast('All applicants restored (conflicts were overwritten).', 'success');
                    },
                    'Overwrite All'
                );
            } else {
                showConfirm('Restore All', 'Are you sure you want to restore all deleted applicants?', async () => {
                    await API.restoreAll('applicants');
                    renderApplicantHistoryTable();
                    if (uiManager.renderAdminApplicantsTable) uiManager.renderAdminApplicantsTable();
                    showToast('All applicants restored.', 'success');
                });
            }
        });
    }

    if (domElements.admin.deleteAllApplicantsHistoryBtn) {
        domElements.admin.deleteAllApplicantsHistoryBtn.addEventListener('click', () => {
            if (appState.deletedApplicants.length === 0) return;
            showConfirm('Delete All Permanently', 'Are you sure you want to permanently delete all applicant history? This cannot be undone.', async () => {
                await API.clearHistory('applicants');
                renderApplicantHistoryTable();
                showToast('Applicant history cleared permanently.', 'success');
            });
        });
    }

    uiManager.renderHistoryTable = renderHistoryTable;
    uiManager.restoreRating = restoreRating;
};
