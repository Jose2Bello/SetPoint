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
            <div id="confirm-modal" class="hidden" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: var(--color-bg-overlay); z-index: 2000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px);">
                <div class="glass-card" style="max-width: 450px; width: 90%; padding: var(--spacing-lg);">
                    <h3 id="confirm-title" style="margin-bottom: var(--spacing-sm);">Confirmación</h3>
                    <p id="confirm-message" class="text-secondary" style="margin-bottom: var(--spacing-lg);">¿Estás seguro de realizar esta acción?</p>
                    <div id="confirm-choices" class="hidden" style="margin-bottom: var(--spacing-lg);"></div>
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
        this.choiceSelect = null;
    }

    /**
     * Triggers the confirm modal.
     * @param {string} title 
     * @param {string} message 
     * @param {object} [options={}] { confirmText, cancelText, choices: [{ value, label }] }
     * @returns {Promise<boolean|{confirmed, value}>}
     */
    show(title, message, options = {}) {
        this.querySelector('#confirm-title').textContent = title;
        this.querySelector('#confirm-message').textContent = message;

        this.querySelector('#btn-confirm').textContent = options.confirmText || 'Confirmar';
        this.querySelector('#btn-cancel').textContent = options.cancelText || 'Cancelar';

        const choicesWrap = this.querySelector('#confirm-choices');
        this.choiceSelect = null;

        if (options.choices && options.choices.length) {
            choicesWrap.classList.remove('hidden');
            const select = document.createElement('select');
            select.id = 'confirm-choice-select';
            select.className = 'form-control';
            options.choices.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.value;
                opt.textContent = c.label;
                select.appendChild(opt);
            });
            choicesWrap.innerHTML = '';
            choicesWrap.appendChild(select);
            this.choiceSelect = select;
        } else {
            choicesWrap.classList.add('hidden');
        }

        this.modal.classList.remove('hidden');
        
        return new Promise((resolve) => {
            this.resolveFn = resolve;
        });
    }

    handleResponse(status) {
        this.modal.classList.add('hidden');
        if (this.resolveFn) {
            if (this.choiceSelect) {
                this.resolveFn({ confirmed: status, value: status ? this.choiceSelect.value : null });
            } else {
                this.resolveFn(status);
            }
            this.resolveFn = null;
        }
    }
}

customElements.define('confirm-dialog', ConfirmDialog);

/**
 * Show global confirm dialog helper.
 * @param {string} title 
 * @param {string} message 
 * @param {object} [options={}] { confirmText, cancelText, choices }
 * @returns {Promise<boolean|{confirmed, value}>}
 */
export async function confirmAction(title, message, options = {}) {
    const dialog = document.querySelector('confirm-dialog');
    if (dialog && typeof dialog.show === 'function') {
        return dialog.show(title, message, options);
    }
    // Sin el componente integrado no se muestra ningún diálogo nativo del navegador:
    // la acción simplemente se cancela y se avisa al usuario dentro de la app.
    const { toast } = await import('./toast.js');
    toast.error('El diálogo de confirmación no está disponible. Inténtalo de nuevo.');
    if (options.choices && options.choices.length) {
        return { confirmed: false, value: null };
    }
    return false;
}
