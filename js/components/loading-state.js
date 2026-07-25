/* js/components/loading-state.js */
class LoadingState extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <div class="flex flex-col align-center justify-center gap-md" style="padding: 100px 0;">
                <div class="animate-spin" style="font-size: 3rem; width: 50px; height: 50px; border: 4px solid var(--color-border); border-top-color: var(--color-accent); border-radius: 50%;"></div>
                <div class="text-secondary font-medium">Cargando datos...</div>
            </div>
        `;
    }
}

customElements.define('loading-state', LoadingState);
