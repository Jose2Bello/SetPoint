/* js/utils/date.js */

/**
 * Formats a Date object or ISO string to a human-readable format.
 * Example: "25 de Julio, 2026 - 16:30"
 * @param {Date|string} dateVal 
 * @returns {string}
 */
export function formatDate(dateVal) {
    if (!dateVal) return 'Fecha no programada';
    const date = typeof dateVal === 'string' ? new Date(dateVal) : dateVal;
    
    if (isNaN(date.getTime())) return 'Fecha inválida';
    
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit'
    };
    
    return date.toLocaleDateString('es-ES', options);
}

/**
 * Returns a short date format.
 * Example: "25/07/2026"
 * @param {Date|string} dateVal 
 * @returns {string}
 */
export function formatDateShort(dateVal) {
    if (!dateVal) return '';
    const date = typeof dateVal === 'string' ? new Date(dateVal) : dateVal;
    if (isNaN(date.getTime())) return '';
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
}

/**
 * Formats a date for input[type="datetime-local"].
 * @param {Date|string} dateVal 
 * @returns {string}
 */
export function formatDateTimeLocal(dateVal) {
    if (!dateVal) return '';
    const date = typeof dateVal === 'string' ? new Date(dateVal) : dateVal;
    if (isNaN(date.getTime())) return '';
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}
