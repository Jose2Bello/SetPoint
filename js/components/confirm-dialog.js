/* js/components/confirm-dialog.js */

class ConfirmDialog extends HTMLElement {
    constructor() {
        super();
        this.resolveFn = null;
    }

    connectedCallback() {
        this.render();
    }

    render() {
        this.innerHTML = `
            <div id="confirm-modal" class="hidden" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(11, 15, 25, 0.8); z-index: 2000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px);">
                <div class="glass-card" style="max-width: 450px; width: 90%; padding: var(--spacing-lg);">
                    <h3 id="confirm-title" style="margin-bottom: var(--spacing-sm);">Confirmación</h3>
                    <p id="confirm-message" class="text-secondary" style="margin-bottom: var(--spacing-lg);">¿Estás seguro de realizar esta acción?</p>
                    <div class="flex justify-end gap-md">
                        <button id="btn-cancel" class="btn btn-secondary">Cancelar</button>
                        <button id="btn-confirm" class="btn btn-danger">Confirmar</button>
                    </div>
                </div>
            </div>
        `;

        this.querySelector('#btn-cancel').addEventListener('click', () => this.handleResponse(false));
        this.querySelector('#btn-confirm').addEventListener('click', () => this.handleResponse(true));
        this.modal = this.querySelector('#confirm-modal');
    }

    /**
     * Triggers the confirm modal
     * @param {string} title 
     * @param {string} message 
     * @returns {Promise<boolean>}
     */
    show(title, message) {
        this.querySelector('#confirm-title').textContent = title;
        this.querySelector('#confirm-message').textContent = message;
        this.modal.classList.remove('hidden');
        
        return new Promise((resolve) => {
            this.resolveFn = resolve;
        });
    }

    handleResponse(status) {
        this.modal.classList.add('hidden');
        if (this.resolveFn) {
            this.resolveFn(status);
            this.resolveFn = null;
        }
    }
}

customElements.define('confirm-dialog', ConfirmDialog);

/**
 * Show global confirm dialog helper.
 * @param {string} title 
 * @param {string} message 
 * @returns {Promise<boolean>}
 */
export async function confirmAction(title, message) {
    const dialog = document.querySelector('confirm-dialog');
    if (dialog && typeof dialog.show === 'function') {
        return dialog.show(title, message);
    }
    return confirm(`${title}\n\n${message}`);
}
