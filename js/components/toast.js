/* js/components/toast.js */

class ToastNotification extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <div id="toast-container" style="position: fixed; bottom: 20px; right: 20px; z-index: 3000; display: flex; flex-direction: column; gap: var(--spacing-sm); pointer-events: none;"></div>
        `;
        this.container = this.querySelector('#toast-container');
    }

    /**
     * Shows a toast notification.
     * @param {string} message 
     * @param {string} [type='success'] 'success', 'error', 'info', 'warning'
     * @param {number} [duration=4000] Duration in ms
     */
    show(message, type = 'success', duration = 4000) {
        if (!this.container) return;

        const toast = document.createElement('div');
        toast.className = 'glass-card animate-slide-in';
        toast.style.cssText = `
            pointer-events: auto;
            min-width: 280px;
            max-width: 400px;
            padding: var(--spacing-md);
            border-left: 4px solid var(--color-${type});
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            justify-content: space-between;
            animation: slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
            background: rgba(22, 28, 45, 0.85);
            backdrop-filter: blur(10px);
        `;

        const text = document.createElement('div');
        text.style.flex = '1';
        let typeIcon = 'ℹ️';
        if (type === 'success') typeIcon = '✅';
        if (type === 'error') typeIcon = '❌';
        if (type === 'warning') typeIcon = '⚠️';
        
        text.innerHTML = `<span style="margin-right: 8px;">${typeIcon}</span> ${message}`;
        toast.appendChild(text);

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '&times;';
        closeBtn.style.cssText = 'background: transparent; border: none; font-size: 1.25rem; cursor: pointer; color: var(--color-text-secondary); margin-left: 10px; line-height: 1;';
        closeBtn.onclick = () => {
            toast.remove();
        };
        toast.appendChild(closeBtn);

        this.container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.5s ease';
            setTimeout(() => toast.remove(), 500);
        }, duration);
    }
}

customElements.define('toast-notification', ToastNotification);

/**
 * Global toast notification triggers.
 */
export const toast = {
    success(msg, duration) {
        const el = document.querySelector('toast-notification');
        if (el) el.show(msg, 'success', duration);
    },
    error(msg, duration) {
        const el = document.querySelector('toast-notification');
        if (el) el.show(msg, 'error', duration);
    },
    info(msg, duration) {
        const el = document.querySelector('toast-notification');
        if (el) el.show(msg, 'info', duration);
    },
    warning(msg, duration) {
        const el = document.querySelector('toast-notification');
        if (el) el.show(msg, 'warning', duration);
    }
};
