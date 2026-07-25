/* js/utils/dom.js */

/**
 * Quick selector helper ($)
 * @param {string} selector 
 * @param {HTMLElement} [parent=document] 
 * @returns {HTMLElement|null}
 */
export function $(selector, parent = document) {
    return parent.querySelector(selector);
}

/**
 * Quick selector all helper ($$)
 * @param {string} selector 
 * @param {HTMLElement} [parent=document] 
 * @returns {NodeList}
 */
export function $$(selector, parent = document) {
    return parent.querySelectorAll(selector);
}

/**
 * Creates a DOM element with classes, attributes, and children.
 * @param {string} tag 
 * @param {object} [options={}] 
 * @returns {HTMLElement}
 */
export function createElement(tag, options = {}) {
    const el = document.createElement(tag);
    
    if (options.classes) {
        const classList = Array.isArray(options.classes) ? options.classes : options.classes.split(' ').filter(Boolean);
        if (classList.length) el.classList.add(...classList);
    }
    
    if (options.attrs) {
        for (const [key, val] of Object.entries(options.attrs)) {
            if (val !== undefined && val !== null) {
                el.setAttribute(key, val);
            }
        }
    }
    
    if (options.events) {
        for (const [event, handler] of Object.entries(options.events)) {
            el.addEventListener(event, handler);
        }
    }
    
    if (options.text) {
        el.textContent = options.text;
    }
    
    if (options.html) {
        el.innerHTML = options.html;
    }
    
    if (options.children) {
        const children = Array.isArray(options.children) ? options.children : [options.children];
        for (const child of children) {
            if (child) {
                el.appendChild(child instanceof HTMLElement ? child : document.createTextNode(child));
            }
        }
    }
    
    return el;
}

/**
 * Safely escape HTML strings.
 * @param {string} string 
 * @returns {string}
 */
export function escapeHTML(string) {
    if (!string) return '';
    return string
        .toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
