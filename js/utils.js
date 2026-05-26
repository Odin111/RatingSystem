import { domElements, appState } from './state.js';

export const escapeHTML = (str) => {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

export const getLastName = (fullName) => {
    if (!fullName) return "";
    if (fullName.includes(',')) {
        return fullName.split(',')[0].trim().toLowerCase();
    }
    const parts = fullName.trim().split(/\s+/);
    return parts[parts.length - 1].toLowerCase();
};

export const getRatingKey = (username, applicantName, applicantPosition, criteriaIdx) => {
    return `rating_temp_${username}_${applicantName}_${applicantPosition}_${criteriaIdx}`;
};

export const showToast = (msg, type = 'success') => {
    if (!domElements.toast) return;
    domElements.toast.textContent = msg;
    domElements.toast.className = `toast show ${type}`;
    setTimeout(() => {
        domElements.toast.className = 'toast';
    }, 3000);
};

export const showConfirm = (title, message, onConfirm, okText = 'Confirm', extraOptions = null) => {
    domElements.confirmModal.title.textContent = title;
    domElements.confirmModal.message.innerHTML = message;
    domElements.confirmModal.okBtn.textContent = okText;
    
    if (extraOptions) {
        domElements.confirmModal.extraBtn.textContent = extraOptions.text;
        domElements.confirmModal.extraBtn.classList.remove('hidden');
    } else {
        domElements.confirmModal.extraBtn.classList.add('hidden');
    }
    
    domElements.confirmModal.el.classList.add('show');
    
    const cleanup = () => {
        domElements.confirmModal.el.classList.remove('show');
        domElements.confirmModal.okBtn.removeEventListener('click', okHandler);
        domElements.confirmModal.cancelBtn.removeEventListener('click', cancelHandler);
        domElements.confirmModal.extraBtn.removeEventListener('click', extraHandler);
        setTimeout(() => { 
            domElements.confirmModal.okBtn.textContent = 'Confirm'; 
            domElements.confirmModal.extraBtn.classList.add('hidden');
        }, 300);
    };

    const okHandler = () => {
        cleanup();
        if (onConfirm) onConfirm();
    };

    const cancelHandler = () => {
        cleanup();
    };

    const extraHandler = () => {
        cleanup();
        if (extraOptions && extraOptions.onAction) extraOptions.onAction();
    };

    domElements.confirmModal.okBtn.addEventListener('click', okHandler);
    domElements.confirmModal.cancelBtn.addEventListener('click', cancelHandler);
    domElements.confirmModal.extraBtn.addEventListener('click', extraHandler);
};
