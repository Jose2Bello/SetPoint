/* js/utils/input-limit.js */

export const INPUT_LIMITS = {
    text: 120,
    textarea: 500,
    number: 9999
};

function resolveLimit(el) {
    if (el.dataset && el.dataset.maxlength) {
        const n = parseInt(el.dataset.maxlength, 10);
        if (Number.isFinite(n)) return n;
    }
    if (el.hasAttribute('maxlength')) {
        const n = parseInt(el.getAttribute('maxlength'), 10);
        if (Number.isFinite(n)) return n;
    }
    if (el.tagName === 'TEXTAREA') return INPUT_LIMITS.textarea;
    if (el.type === 'number') return INPUT_LIMITS.number;
    return INPUT_LIMITS.text;
}

function shouldHandle(el) {
    return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
}

function collectInputs(root) {
    return root.querySelectorAll
        ? root.querySelectorAll('input[type="text"], input[type="search"], input[type="number"], input:not([type]), textarea')
        : [];
}

function applyToInputs(root) {
    collectInputs(root).forEach(el => {
        if (!el.hasAttribute('maxlength') && el.type !== 'number') {
            el.setAttribute('maxlength', String(resolveLimit(el)));
        }
    });
}

function truncateInput(el) {
    if (!shouldHandle(el)) return;
    const limit = resolveLimit(el);
    if (el.type === 'number') {
        if (el.value === '' || el.value === '-' || el.value === '.') return;
        const num = parseFloat(el.value);
        if (Number.isFinite(num) && num > limit) {
            el.value = String(limit);
        }
    } else if (el.value.length > limit) {
        el.value = el.value.slice(0, limit);
    }
}

/**
 * Aplica maxlength a todos los campos de texto de un contenedor.
 * @param {Document|Element} [root=document]
 */
export function applyInputLimits(root = document) {
    applyToInputs(root);
}

/**
 * Guardia global: limita caracteres en todos los formularios (existentes y
 * creados dinámicamente). Trunca automáticamente el valor al escribir o pegar.
 */
export function initGlobalInputLimits() {
    applyToInputs(document);

    document.addEventListener('input', (e) => {
        truncateInput(e.target);
    });

    const observer = new MutationObserver(() => applyToInputs(document));
    observer.observe(document.body, { childList: true, subtree: true });
}
