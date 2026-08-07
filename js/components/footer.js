
class LeagueFooter extends HTMLElement {
    connectedCallback() {
        this.render();
        window.addEventListener('db-status-change', (e) => this.updateDBStatus(e.detail));
    }

    render() {
        const year = new Date().getFullYear();
        this.innerHTML = `
            <footer>
                <div>
                    &copy; ${year} SetPoint. Desarrollado por Jose Bello Lopez y Santiago Salas Lambarca.
                </div>
                <div class="db-status flex align-center gap-sm">
                    <span>Base de Datos:</span>
                    <span id="db-status-badge" class="badge">Conectando...</span>
                </div>
            </footer>
        `;
      
        const dbBadge = this.querySelector('#db-status-badge');
        if (dbBadge) {
            dbBadge.textContent = 'Conectado';
            dbBadge.style.color = 'var(--color-success)';
            dbBadge.style.borderColor = 'rgba(var(--color-success-rgb), 0.2)';
        }
    }

    updateDBStatus(status) {
        const dbBadge = this.querySelector('#db-status-badge');
        if (!dbBadge) return;
        
        if (status === 'connected') {
            dbBadge.textContent = 'Conectado';
            dbBadge.style.color = 'var(--color-success)';
            dbBadge.style.borderColor = 'rgba(var(--color-success-rgb), 0.2)';
        } else {
            dbBadge.textContent = 'Error';
            dbBadge.style.color = 'var(--color-error)';
            dbBadge.style.borderColor = 'rgba(var(--color-error-rgb), 0.2)';
        }
    }
}

customElements.define('league-footer', LeagueFooter);
