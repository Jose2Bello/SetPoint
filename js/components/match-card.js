// js/components/match-card.js
export class MatchCard extends HTMLElement {
    connectedCallback() {
        const matchId = this.getAttribute('match-id');
        const homeName = this.getAttribute('home-name') || 'Local';
        const awayName = this.getAttribute('away-name') || 'Visitante';
        const homeShield = this.getAttribute('home-shield') || '';
        const awayShield = this.getAttribute('away-shield') || '';
        const status = this.getAttribute('status') || 'scheduled';
        const homeScore = this.getAttribute('home-score') || '0';
        const awayScore = this.getAttribute('away-score') || '0';
        const date = this.getAttribute('date') || '';
        const round = this.getAttribute('round') || '';

        this.textContent = '';
        const cardDiv = document.createElement('div');
        cardDiv.className = `card match-card status-${status}`;
        cardDiv.style.cursor = 'pointer';

        // Cabecera con ronda o fecha
        const topBar = document.createElement('div');
        topBar.className = 'match-card-top';
        const spanRound = document.createElement('span');
        spanRound.className = 'match-round';
        spanRound.textContent = round ? `Ronda: ${round}` : (date ? new Date(date).toLocaleDateString() : 'Programado');
        topBar.appendChild(spanRound);

        const statusBadge = document.createElement('span');
        statusBadge.className = `badge status-${status}`;
        statusBadge.textContent = status === 'finished' ? 'Finalizado' : 'Programado';
        topBar.appendChild(statusBadge);
        cardDiv.appendChild(topBar);

        // Equipos y Marcadores
        const bodyDiv = document.createElement('div');
        bodyDiv.className = 'match-card-body';

        // Local
        const homeDiv = document.createElement('div');
        homeDiv.className = 'match-team home';
        const homeSpan = document.createElement('span');
        homeSpan.textContent = homeName;
        homeDiv.appendChild(homeSpan);

        // Centro (Marcador o VS)
        const centerDiv = document.createElement('div');
        centerDiv.className = 'match-center';
        if (status === 'finished') {
            centerDiv.innerHTML = `<span class="score">${homeScore} - ${awayScore}</span>`;
        } else {
            centerDiv.innerHTML = `<span class="vs">VS</span>`;
        }

        // Visitante
        const awayDiv = document.createElement('div');
        awayDiv.className = 'match-team away';
        const awaySpan = document.createElement('span');
        awaySpan.textContent = awayName;
        awayDiv.appendChild(awaySpan);

        bodyDiv.appendChild(homeDiv);
        bodyDiv.appendChild(centerDiv);
        bodyDiv.appendChild(awayDiv);
        cardDiv.appendChild(bodyDiv);

        this.appendChild(cardDiv);

        if (matchId) {
            this.addEventListener('click', () => {
                window.location.hash = `#match/${matchId}`;
            });
        }
    }
}

customElements.define('match-card', MatchCard);