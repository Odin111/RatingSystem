import { domElements, appState } from '../state.js';
import { ADMIN_APPLICANTS_CHUNK_SIZE } from '../constants.js';
import { API } from '../api.js';
import { showToast, showConfirm, escapeHTML } from '../utils.js';
import { uiManager } from '../viewManager.js';

let editingApplicantKeys = null;

const openRenameBatchModal = (batch) => {
    const modal = document.getElementById('rename-batch-modal');
    const idInput = document.getElementById('rename-batch-id');
    const nameInput = document.getElementById('rename-batch-name');
    const currentNameEl = document.getElementById('rename-batch-current-name');
    if (!modal || !idInput || !nameInput) return;

    idInput.value = batch.id;
    nameInput.value = batch.name;
    if (currentNameEl) currentNameEl.textContent = `Currently: "${batch.name}"`;

    modal.classList.add('show');
    setTimeout(() => nameInput.select(), 80);
};

export const renderBatchesGrid = () => {
    const grid = domElements.admin.batchesGrid;
    if (!grid) return;
    grid.innerHTML = '';

    // Create custom batch cards
    const sortedBatches = [...appState.allBatches].sort((a, b) => a.name.localeCompare(b.name));
    sortedBatches.forEach(batch => {
        const count = appState.allApplicants.filter(a => a.batch === batch.id || a.batch === batch.name).length;
        const card = document.createElement('div');
        card.className = 'batch-folder-card animate-fade';
        card.innerHTML = `
            <i class='bx bxs-folder'></i>
            <div class="batch-folder-name">${escapeHTML(batch.name)}</div>
            <div class="batch-folder-count">${count} Applicant${count === 1 ? '' : 's'}</div>
            <div class="batch-folder-actions">
                <button class="batch-card-action-btn edit-batch-btn" title="Rename Batch"><i class="bx bx-edit-alt"></i></button>
                <button class="batch-card-action-btn delete-batch-btn" title="Delete Folder & Contents"><i class="bx bx-trash"></i></button>
            </div>
        `;
        card.addEventListener('click', () => {
            appState.activeBatchId = batch.id;
            appState.adminApplicantSearchQuery = '';
            appState.applicantSelectMode = false;
            appState.selectedApplicants.clear();
            const searchInput = document.getElementById('admin-search-applicant');
            if (searchInput) {
                searchInput.value = '';
                const clearSearchBtn = document.getElementById('clear-applicant-search');
                if (clearSearchBtn) clearSearchBtn.classList.remove('show');
            }
            renderAdminApplicantsTable();
        });

        const editBtn = card.querySelector('.edit-batch-btn');
        if (editBtn) {
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openRenameBatchModal(batch);
            });
        }

        const deleteBtn = card.querySelector('.delete-batch-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                showConfirm('Delete Batch Folder & Contents', `Are you sure you want to delete "${batch.name}" and ALL applicant forms inside it?`, async () => {
                    try {
                        await API.deleteBatchAllAndFolder(batch.id);
                        showToast(`Batch folder "${batch.name}" and all its contents were deleted.`);
                        renderAdminApplicantsTable();
                        if (uiManager.renderAdminTable) uiManager.renderAdminTable();
                    } catch (err) {
                        showToast('Failed to delete batch folder', 'error');
                    }
                });
            });
        }

        grid.appendChild(card);
    });
};

export const renderAdminApplicantsTable = () => {
    // 1. Folders grid view
    if (appState.activeBatchId === null) {
        if (domElements.admin.batchesFolderView) domElements.admin.batchesFolderView.classList.remove('hidden');
        if (domElements.admin.batchContentsView) domElements.admin.batchContentsView.classList.add('hidden');
        
        const countElement = document.getElementById('active-applicant-count');
        if (countElement) {
            countElement.textContent = appState.allApplicants.length;
        }
        
        renderBatchesGrid();
        return;
    }

    // 2. Folder contents list view
    if (domElements.admin.batchesFolderView) domElements.admin.batchesFolderView.classList.add('hidden');
    if (domElements.admin.batchContentsView) domElements.admin.batchContentsView.classList.remove('hidden');

    domElements.admin.applicantsTbody.innerHTML = '';

    // Get Active Batch name
    let activeBatchName = 'Unbatched';
    if (appState.activeBatchId !== 'unbatched') {
        const activeBatch = appState.allBatches.find(b => b.id === appState.activeBatchId);
        activeBatchName = activeBatch ? activeBatch.name : 'Unknown Batch';
    }
    
    if (domElements.admin.batchNameHeading) {
        domElements.admin.batchNameHeading.textContent = activeBatchName;
    }

    // Filter applicants by active batch
    let batchApplicants = appState.allApplicants.filter(a => {
        if (appState.activeBatchId === 'unbatched') {
            return !a.batch;
        } else {
            return a.batch === appState.activeBatchId || a.batch === activeBatchName;
        }
    });

    if (domElements.admin.batchApplicantCount) {
        domElements.admin.batchApplicantCount.textContent = batchApplicants.length;
    }

    // Filter by search query
    appState.currentAdminFilteredApplicants = batchApplicants;
    if (appState.adminApplicantSearchQuery) {
        appState.currentAdminFilteredApplicants = batchApplicants.filter(a => 
            a.name.toLowerCase().includes(appState.adminApplicantSearchQuery)
        );
    }

    // Handle Empty State
    if (appState.currentAdminFilteredApplicants.length === 0) {
        domElements.admin.noApplicantsMsg.classList.remove('hidden');
        domElements.admin.applicantsTbody.parentElement.classList.add('hidden');
        domElements.admin.noApplicantsMsg.querySelector('p').textContent = appState.adminApplicantSearchQuery 
            ? 'No applicants match your search.' 
            : 'No active applicants found in this batch. Add one to get started.';
        return;
    } else {
        domElements.admin.noApplicantsMsg.classList.add('hidden');
        domElements.admin.applicantsTbody.parentElement.classList.remove('hidden');
    }

    // Toggle Select Mode UI
    const selectCols = document.querySelectorAll('#batch-contents-view .select-col');
    selectCols.forEach(col => {
        if (appState.applicantSelectMode) {
            col.classList.remove('hidden');
        } else {
            col.classList.add('hidden');
        }
    });

    const table = document.querySelector('#batch-contents-view .data-table');
    if (table) {
        if (appState.applicantSelectMode) {
            table.classList.add('select-mode-active');
        } else {
            table.classList.remove('select-mode-active');
        }
    }

    const toggleBtn = domElements.admin.toggleSelectApplicantsBtn;
    if (toggleBtn) {
        if (appState.applicantSelectMode) {
            toggleBtn.innerHTML = "<i class='bx bx-x'></i> Cancel";
            toggleBtn.className = "btn outline-btn active-select-btn";
            if (domElements.admin.openAddApplicantBtn) domElements.admin.openAddApplicantBtn.classList.add('hidden');
            if (domElements.admin.deleteAllApplicantsBtn) domElements.admin.deleteAllApplicantsBtn.classList.add('hidden');
            if (domElements.admin.deleteSelectedApplicantsBtn) domElements.admin.deleteSelectedApplicantsBtn.classList.remove('hidden');
            if (domElements.admin.moveSelectedApplicantsBtn) domElements.admin.moveSelectedApplicantsBtn.classList.remove('hidden');
        } else {
            toggleBtn.innerHTML = "<i class='bx bx-checkbox-square'></i> Select";
            toggleBtn.className = "btn outline-btn";
            if (domElements.admin.openAddApplicantBtn) domElements.admin.openAddApplicantBtn.classList.remove('hidden');
            if (domElements.admin.deleteAllApplicantsBtn) domElements.admin.deleteAllApplicantsBtn.classList.remove('hidden');
            if (domElements.admin.deleteSelectedApplicantsBtn) domElements.admin.deleteSelectedApplicantsBtn.classList.add('hidden');
            if (domElements.admin.moveSelectedApplicantsBtn) domElements.admin.moveSelectedApplicantsBtn.classList.add('hidden');
        }
    }

    updateBulkActionButtons();

    appState.loadedAdminApplicants = 0;
    if (appState.adminApplicantsObserver) {
        appState.adminApplicantsObserver.disconnect();
        appState.adminApplicantsObserver = null;
    }

    domElements.admin.applicantsTbody.removeEventListener('click', handleAdminApplicantsTableClick);
    domElements.admin.applicantsTbody.addEventListener('click', handleAdminApplicantsTableClick);

    loadNextAdminApplicantsChunk();
};

const updateBulkActionButtons = () => {
    const deleteBtn = domElements.admin.deleteSelectedApplicantsBtn;
    const moveBtn = domElements.admin.moveSelectedApplicantsBtn;
    const count = appState.selectedApplicants.size;
    if (deleteBtn) {
        deleteBtn.disabled = count === 0;
        deleteBtn.innerHTML = `<i class='bx bx-trash'></i> Delete Selected (${count})`;
    }
    if (moveBtn) {
        moveBtn.disabled = count === 0;
        moveBtn.innerHTML = `<i class='bx bx-folder'></i> Move Selected (${count})`;
    }
    const selectAllCheckbox = domElements.admin.selectAllApplicantsCheckbox;
    if (selectAllCheckbox) {
        const allVisibleKeys = appState.currentAdminFilteredApplicants.map(a => `${a.name}|${a.position}`);
        const allSelected = allVisibleKeys.length > 0 && allVisibleKeys.every(k => appState.selectedApplicants.has(k));
        selectAllCheckbox.checked = allSelected;
    }
};

const handleAdminApplicantsTableClick = (e) => {
    const editBtn = e.target.closest('.edit-applicant-btn');
    if (editBtn) {
        editApplicant(editBtn.getAttribute('data-name'), editBtn.getAttribute('data-position'));
        return;
    }
    const delBtn = e.target.closest('.delete-applicant-btn');
    if (delBtn) {
        deleteApplicant(delBtn.getAttribute('data-name'), delBtn.getAttribute('data-position'));
        return;
    }

    if (appState.applicantSelectMode) {
        const tr = e.target.closest('tr');
        if (tr && domElements.admin.applicantsTbody.contains(tr)) {
            const checkbox = tr.querySelector('.applicant-row-checkbox');
            if (checkbox) {
                if (e.target !== checkbox) {
                    checkbox.checked = !checkbox.checked;
                }
                const name = checkbox.getAttribute('data-name');
                const position = checkbox.getAttribute('data-position');
                const key = `${name}|${position}`;
                if (checkbox.checked) {
                    appState.selectedApplicants.add(key);
                } else {
                    appState.selectedApplicants.delete(key);
                }
                updateBulkActionButtons();
            }
        }
    }
};

const loadNextAdminApplicantsChunk = () => {
    if (appState.loadedAdminApplicants >= appState.currentAdminFilteredApplicants.length) return;

    const startIdx = appState.loadedAdminApplicants;
    const endIdx = Math.min(startIdx + ADMIN_APPLICANTS_CHUNK_SIZE, appState.currentAdminFilteredApplicants.length);
    const chunk = appState.currentAdminFilteredApplicants.slice(startIdx, endIdx);

    chunk.forEach(applicant => {
        const key = `${applicant.name}|${applicant.position}`;
        const isChecked = appState.selectedApplicants.has(key);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="select-col ${appState.applicantSelectMode ? '' : 'hidden'}" style="text-align: center;">
                <input type="checkbox" class="applicant-row-checkbox" data-name="${escapeHTML(applicant.name)}" data-position="${escapeHTML(applicant.position)}" ${isChecked ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;">
            </td>
            <td>${escapeHTML(applicant.name)}</td>
            <td>${escapeHTML(applicant.division || 'Unassigned')}</td>
            <td>${escapeHTML(applicant.position)}</td>
            <td>${escapeHTML(applicant.dateAdded || '')}</td>
            <td>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <button class="btn outline-btn edit-applicant-btn" data-name="${escapeHTML(applicant.name)}" data-position="${escapeHTML(applicant.position)}" style="padding: 8px 12px;"><i class='bx bx-edit'></i></button>
                    <button class="btn danger-btn delete-applicant-btn" data-name="${escapeHTML(applicant.name)}" data-position="${escapeHTML(applicant.position)}" style="padding: 8px 12px;"><i class='bx bx-trash'></i></button>
                </div>
            </td>
        `;
        domElements.admin.applicantsTbody.appendChild(tr);
    });

    appState.loadedAdminApplicants = endIdx;

    if (appState.loadedAdminApplicants < appState.currentAdminFilteredApplicants.length) {
        if (appState.adminApplicantsObserver) appState.adminApplicantsObserver.disconnect();
        appState.adminApplicantsObserver = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting) {
                loadNextAdminApplicantsChunk();
            }
        }, { root: null, rootMargin: '200px' });
        appState.adminApplicantsObserver.observe(domElements.admin.applicantsTbody.lastElementChild);
    }
};

const deleteApplicant = (name, position) => {
    showConfirm('Delete Applicant Form', 'Are you sure you want to delete this applicant form? It will be moved to history and employees will no longer be able to rate them.', async () => {
        await API.deleteApplicant(name, position);
        renderAdminApplicantsTable();
        showToast('Applicant form moved to history.', 'success');
    });
};

const editApplicant = (name, position) => {
    const applicant = appState.allApplicants.find(a => a.name === name && a.position === position);
    if (!applicant) return;
    
    editingApplicantKeys = { name, position };
    document.querySelector('#add-applicant-modal h2').textContent = 'Edit Rating Form';
    document.querySelector('#add-applicant-form button[type="submit"]').textContent = 'Save Changes';
    
    domElements.admin.newApplicantName.value = applicant.name;
    domElements.admin.newApplicantPosition.value = applicant.position;
    domElements.admin.newApplicantDivision.value = applicant.division || '';
    domElements.admin.newCredentialInput.value = '';
    appState.currentFormCredentials = applicant.credentials ? [...applicant.credentials] : [];
    renderCredentialsList();
    
    populateBatchDropdown();
    domElements.admin.newApplicantBatch.value = applicant.batch || '';
    
    const syncDivisionCheckbox = document.getElementById('sync-division-checkbox');
    if (syncDivisionCheckbox) syncDivisionCheckbox.checked = false;
    
    domElements.admin.addApplicantModal.classList.add('show');
    setTimeout(() => domElements.admin.newApplicantName.focus(), 50);
};

const renderCredentialsList = () => {
    if (!domElements.admin.credentialsList) return;
    domElements.admin.credentialsList.innerHTML = '';
    appState.currentFormCredentials.forEach((cred, index) => {
        const li = document.createElement('li');
        li.className = 'credential-item';
        
        const text = document.createElement('span');
        text.className = 'credential-text';
        text.textContent = cred;
        
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'credential-remove-btn';
        removeBtn.innerHTML = '<i class="bx bx-x"></i>';
        
        removeBtn.addEventListener('click', () => {
            appState.currentFormCredentials.splice(index, 1);
            renderCredentialsList();
        });
        
        li.appendChild(text);
        li.appendChild(removeBtn);
        domElements.admin.credentialsList.appendChild(li);
    });
};

export const initApplicants = () => {
    const adminSearchApplicantInput = document.getElementById('admin-search-applicant');
    const clearApplicantSearchBtn = document.getElementById('clear-applicant-search');

    if (adminSearchApplicantInput) {
        adminSearchApplicantInput.addEventListener('input', (e) => {
            appState.adminApplicantSearchQuery = e.target.value.toLowerCase();
            if (clearApplicantSearchBtn) {
                clearApplicantSearchBtn.classList.toggle('show', e.target.value.length > 0);
            }
            renderAdminApplicantsTable();
        });
    }

    if (clearApplicantSearchBtn) {
        clearApplicantSearchBtn.addEventListener('click', () => {
            adminSearchApplicantInput.value = '';
            appState.adminApplicantSearchQuery = '';
            clearApplicantSearchBtn.classList.remove('show');
            renderAdminApplicantsTable();
            adminSearchApplicantInput.focus();
        });
    }

    if (domElements.admin.backToBatchesBtn) {
        domElements.admin.backToBatchesBtn.addEventListener('click', () => {
            appState.activeBatchId = null;
            appState.adminApplicantSearchQuery = '';
            appState.applicantSelectMode = false;
            appState.selectedApplicants.clear();
            if (adminSearchApplicantInput) adminSearchApplicantInput.value = '';
            if (clearApplicantSearchBtn) clearApplicantSearchBtn.classList.remove('show');
            renderAdminApplicantsTable();
        });
    }

    if (domElements.admin.openAddApplicantBtn) {
        domElements.admin.openAddApplicantBtn.addEventListener('click', () => {
            editingApplicantKeys = null;
            document.querySelector('#add-applicant-modal h2').textContent = 'New Rating Form';
            document.querySelector('#add-applicant-form button[type="submit"]').textContent = 'Create Form';
            domElements.admin.addApplicantForm.reset();
            domElements.admin.newCredentialInput.value = '';
            appState.currentFormCredentials = [];
            renderCredentialsList();
            
            populateBatchDropdown();
            
            // Pre-select active batch if inside a specific folder
            if (appState.activeBatchId && appState.activeBatchId !== 'unbatched') {
                domElements.admin.newApplicantBatch.value = appState.activeBatchId;
            } else {
                domElements.admin.newApplicantBatch.value = '';
            }
            
            const syncDivisionCheckbox = document.getElementById('sync-division-checkbox');
            if (syncDivisionCheckbox) syncDivisionCheckbox.checked = false;
            
            domElements.admin.addApplicantModal.classList.add('show');
            setTimeout(() => domElements.admin.newApplicantName.focus(), 50);
        });
    }

    if (domElements.admin.deleteAllApplicantsBtn) {
        domElements.admin.deleteAllApplicantsBtn.addEventListener('click', () => {
            const hasApplicants = appState.currentAdminFilteredApplicants.length > 0;
            if (!hasApplicants) return;
            
            let batchName = 'Unbatched';
            if (appState.activeBatchId !== 'unbatched') {
                const batch = appState.allBatches.find(b => b.id === appState.activeBatchId);
                batchName = batch ? batch.name : 'this batch';
            }

            const confirmMsg = appState.activeBatchId 
                ? `Are you sure you want to delete ALL active applicant forms inside "${batchName}"?` 
                : 'Are you sure you want to delete ALL active applicant forms?';

            showConfirm('Delete Applicant Forms', confirmMsg, async () => {
                await API.deleteAllApplicants(appState.activeBatchId);
                renderAdminApplicantsTable();
                showToast('Applicant forms moved to history.', 'success');
            });
        });
    }

    if (domElements.admin.addApplicantClose) {
        domElements.admin.addApplicantClose.addEventListener('click', () => {
            domElements.admin.addApplicantModal.classList.remove('show');
        });
    }

    if (domElements.admin.addCredentialBtn) {
        domElements.admin.addCredentialBtn.addEventListener('click', () => {
            const val = domElements.admin.newCredentialInput.value.trim();
            if (val) {
                if (appState.currentFormCredentials.some(c => c.toLowerCase() === val.toLowerCase())) {
                    showToast('Credential already added', 'error');
                    return;
                }
                appState.currentFormCredentials.push(val);
                domElements.admin.newCredentialInput.value = '';
                renderCredentialsList();
                domElements.admin.newCredentialInput.focus();
            }
        });
    }

    domElements.admin.newCredentialInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            domElements.admin.addCredentialBtn.click();
        }
    });

    if (domElements.admin.addApplicantForm) {
        domElements.admin.addApplicantForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = domElements.admin.newApplicantName.value.trim();
            const position = domElements.admin.newApplicantPosition.value.trim();
            const division = domElements.admin.newApplicantDivision.value.trim();
            const batch = domElements.admin.newApplicantBatch ? domElements.admin.newApplicantBatch.value : '';
 
            if (!name || !position || !division || !batch) {
                showToast('Name, Position, Division and Batch are required', 'error');
                return;
            }
 
            if (!editingApplicantKeys) {
                if (appState.allApplicants.find(a => a.name.toLowerCase() === name.toLowerCase() && a.position.toLowerCase() === position.toLowerCase())) {
                    showToast('An applicant form with this name and position already exists.', 'error');
                    return;
                }
            }
 
            const applicant = {
                name,
                position,
                division,
                batch: batch || null,
                dateAdded: editingApplicantKeys ? appState.allApplicants.find(a => a.name === editingApplicantKeys.name && a.position === editingApplicantKeys.position).dateAdded : new Date().toLocaleDateString(),
                credentials: [...appState.currentFormCredentials]
            };


            await API.saveApplicant(applicant, editingApplicantKeys || {});
            
            // Sync credentials across all forms for this person
            await API.syncCredentials(name, applicant.credentials);

            const syncDivisionCheckbox = document.getElementById('sync-division-checkbox');
            if (syncDivisionCheckbox && syncDivisionCheckbox.checked) {
                await API.syncDivision(name, division);
            }

            showToast(editingApplicantKeys ? 'Applicant form updated successfully!' : 'Applicant form created successfully!');
            domElements.admin.addApplicantModal.classList.remove('show');
            renderAdminApplicantsTable();
            if (uiManager.renderAdminTable) uiManager.renderAdminTable();
        });
    }
 
    // ---- Batch Management Wiring ----
    if (domElements.admin.openAddBatchBtn) {
        domElements.admin.openAddBatchBtn.addEventListener('click', () => {
            domElements.admin.addBatchForm.reset();
            renderBatchesList();
            domElements.admin.addBatchModal.classList.add('show');
            setTimeout(() => domElements.admin.newBatchName.focus(), 50);
        });
    }

    if (domElements.admin.addBatchClose) {
        domElements.admin.addBatchClose.addEventListener('click', () => {
            domElements.admin.addBatchModal.classList.remove('show');
        });
    }

    if (domElements.admin.addBatchForm) {
        domElements.admin.addBatchForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = domElements.admin.newBatchName.value.trim();
            if (!name) return;
            
            if (appState.allBatches.some(b => b.name.toLowerCase() === name.toLowerCase())) {
                showToast('A batch with this name already exists.', 'error');
                return;
            }
            
            const newBatch = {
                id: Date.now().toString(),
                name,
                dateCreated: new Date().toLocaleDateString()
            };
            
            await API.saveBatch(newBatch);
            domElements.admin.addBatchForm.reset();
            renderBatchesList();
            populateBatchDropdown();
            renderAdminApplicantsTable();
            showToast(`Batch "${name}" created successfully!`);
        });
    }

    const listContainer = document.getElementById('batches-list-container');
    if (listContainer) {
        listContainer.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('.batch-delete-btn');
            if (deleteBtn) {
                const id = deleteBtn.getAttribute('data-id');
                const batch = appState.allBatches.find(b => b.id === id);
                if (!batch) return;
                
                showConfirm('Delete Batch', `Are you sure you want to delete "${batch.name}"? Applicants in this batch will lose their batch tag but will not be deleted.`, async () => {
                    if (appState.activeBatchId === id) {
                        appState.activeBatchId = null;
                    }
                    await API.deleteBatch(id);
                    renderBatchesList();
                    populateBatchDropdown();
                    renderAdminApplicantsTable();
                    showToast(`Batch "${batch.name}" deleted.`);
                });
            }
        });
    }

    // ---- Selection and Bulk Operations Wiring ----
    if (domElements.admin.toggleSelectApplicantsBtn) {
        domElements.admin.toggleSelectApplicantsBtn.addEventListener('click', () => {
            appState.applicantSelectMode = !appState.applicantSelectMode;
            appState.selectedApplicants.clear();
            renderAdminApplicantsTable();
        });
    }

    const selectAllHeaderTr = document.querySelector('#batch-contents-view thead tr');
    if (selectAllHeaderTr) {
        selectAllHeaderTr.addEventListener('click', (e) => {
            const checkbox = document.getElementById('select-all-applicants-checkbox');
            if (checkbox && e.target !== checkbox) {
                checkbox.click();
            }
        });
    }

    if (domElements.admin.selectAllApplicantsCheckbox) {
        domElements.admin.selectAllApplicantsCheckbox.addEventListener('change', (e) => {
            const checked = e.target.checked;
            const checkboxes = domElements.admin.applicantsTbody.querySelectorAll('.applicant-row-checkbox');
            checkboxes.forEach(cb => {
                cb.checked = checked;
            });
            if (checked) {
                appState.currentAdminFilteredApplicants.forEach(a => {
                    appState.selectedApplicants.add(`${a.name}|${a.position}`);
                });
            } else {
                appState.selectedApplicants.clear();
            }
            updateBulkActionButtons();
        });
    }

    if (domElements.admin.deleteSelectedApplicantsBtn) {
        domElements.admin.deleteSelectedApplicantsBtn.addEventListener('click', () => {
            if (appState.selectedApplicants.size === 0) return;
            const count = appState.selectedApplicants.size;
            showConfirm('Delete Selected Forms', `Are you sure you want to delete the ${count} selected applicant forms? They will be moved to history.`, async () => {
                const list = [];
                appState.selectedApplicants.forEach(key => {
                    const [name, position] = key.split('|');
                    list.push({ name, position });
                });
                await API.deleteApplicantsBulk(list);
                appState.selectedApplicants.clear();
                appState.applicantSelectMode = false;
                renderAdminApplicantsTable();
                showToast(`${count} applicant forms moved to history.`, 'success');
            });
        });
    }

    if (domElements.admin.moveSelectedApplicantsBtn) {
        domElements.admin.moveSelectedApplicantsBtn.addEventListener('click', () => {
            if (appState.selectedApplicants.size === 0) return;
            const select = domElements.admin.moveApplicantsBatch;
            if (select) {
                select.innerHTML = '';
                const defaultOpt = document.createElement('option');
                defaultOpt.value = '';
                defaultOpt.textContent = 'No Batch';
                select.appendChild(defaultOpt);
                const sortedBatches = [...appState.allBatches].sort((a, b) => a.name.localeCompare(b.name));
                sortedBatches.forEach(b => {
                    const opt = document.createElement('option');
                    opt.value = b.id;
                    opt.textContent = b.name;
                    select.appendChild(opt);
                });
                if (appState.activeBatchId && appState.activeBatchId !== 'unbatched') {
                    select.value = appState.activeBatchId;
                } else {
                    select.value = '';
                }
            }
            if (domElements.admin.moveApplicantsModal) {
                domElements.admin.moveApplicantsModal.classList.add('show');
            }
        });
    }

    const closeMoveModal = () => {
        if (domElements.admin.moveApplicantsModal) domElements.admin.moveApplicantsModal.classList.remove('show');
    };

    if (domElements.admin.moveApplicantsClose) {
        domElements.admin.moveApplicantsClose.addEventListener('click', closeMoveModal);
    }

    const moveCancelBtn = document.querySelector('#move-applicants-modal .close-btn-action');
    if (moveCancelBtn) {
        moveCancelBtn.addEventListener('click', closeMoveModal);
    }

    const moveModal = domElements.admin.moveApplicantsModal;
    if (moveModal) {
        moveModal.addEventListener('click', (e) => {
            if (e.target === moveModal) closeMoveModal();
        });
    }

    if (domElements.admin.moveApplicantsForm) {
        domElements.admin.moveApplicantsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const destinationBatchId = domElements.admin.moveApplicantsBatch.value;
            const count = appState.selectedApplicants.size;
            const list = [];
            appState.selectedApplicants.forEach(key => {
                const [name, position] = key.split('|');
                list.push({ name, position });
            });
            await API.moveApplicantsBulk(list, destinationBatchId || null);
            appState.selectedApplicants.clear();
            appState.applicantSelectMode = false;
            closeMoveModal();
            renderAdminApplicantsTable();
            if (uiManager.renderAdminTable) uiManager.renderAdminTable();
            showToast(`${count} applicant forms successfully moved.`);
        });
    }

    uiManager.renderAdminApplicantsTable = renderAdminApplicantsTable;

    // ---- Rename Batch Modal Wiring ----
    const renameBatchModal = document.getElementById('rename-batch-modal');
    const renameBatchForm = document.getElementById('rename-batch-form');
    const renameBatchClose = document.getElementById('rename-batch-modal-close');
    const renameBatchCancel = document.getElementById('rename-batch-cancel');

    const closeRenameBatchModal = () => {
        if (renameBatchModal) renameBatchModal.classList.remove('show');
    };

    if (renameBatchClose) renameBatchClose.addEventListener('click', closeRenameBatchModal);
    if (renameBatchCancel) renameBatchCancel.addEventListener('click', closeRenameBatchModal);
    if (renameBatchModal) {
        renameBatchModal.addEventListener('click', (e) => {
            if (e.target === renameBatchModal) closeRenameBatchModal();
        });
    }

    if (renameBatchForm) {
        renameBatchForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('rename-batch-id').value;
            const nameInput = document.getElementById('rename-batch-name');
            const trimmedName = nameInput ? nameInput.value.trim() : '';
            const batch = appState.allBatches.find(b => b.id === id);
            if (!batch) return;

            if (!trimmedName) {
                showToast('Batch name cannot be empty.', 'error');
                return;
            }
            if (trimmedName.toLowerCase() === batch.name.toLowerCase()) {
                closeRenameBatchModal();
                return;
            }
            if (appState.allBatches.some(b => b.name.toLowerCase() === trimmedName.toLowerCase() && b.id !== id)) {
                showToast('A batch with this name already exists.', 'error');
                return;
            }

            showConfirm('Rename Batch Folder', `Are you sure you want to rename "${batch.name}" to "${trimmedName}"?`, async () => {
                try {
                    closeRenameBatchModal();
                    await API.renameBatch(id, trimmedName);
                    showToast(`Batch folder renamed to "${trimmedName}"`);
                    renderAdminApplicantsTable();
                    if (uiManager.renderAdminTable) uiManager.renderAdminTable();
                } catch (err) {
                    showToast('Failed to rename batch', 'error');
                }
            });
        });
    }
};

export const populateBatchDropdown = () => {
    const dropdown = domElements.admin.newApplicantBatch;
    if (!dropdown) return;
    dropdown.innerHTML = '';
    
    // Default Option
    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = 'No Batch';
    dropdown.appendChild(defaultOpt);
    
    // Sort batches by name
    const sortedBatches = [...appState.allBatches].sort((a, b) => a.name.localeCompare(b.name));
    sortedBatches.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b.id;
        opt.textContent = b.name;
        dropdown.appendChild(opt);
    });
};

export const renderBatchesList = () => {
    const listContainer = document.getElementById('batches-list-container');
    if (!listContainer) return;
    listContainer.innerHTML = '';
    
    if (appState.allBatches.length === 0) {
        listContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted); font-size: 0.9rem; padding: 10px 0;">No batches created yet.</p>';
        return;
    }
    
    // Sort batches by name
    const sortedBatches = [...appState.allBatches].sort((a, b) => a.name.localeCompare(b.name));
    sortedBatches.forEach(b => {
        const item = document.createElement('div');
        item.className = 'batch-list-item animate-fade';
        item.innerHTML = `
            <span class="batch-name-text">${escapeHTML(b.name)}</span>
            <button class="batch-delete-btn" data-id="${b.id}" title="Delete Batch"><i class="bx bx-trash"></i></button>
        `;
        listContainer.appendChild(item);
    });
};
