// js/components/player-card.js
export class PlayerCard extends HTMLElement {
    connectedCallback() {
        const name = this.getAttribute('name') || 'Sin nombre';
        const position = this.getAttribute('position') || 'General';
        const number = this.getAttribute('number') || '0';
        const teamName = this.getAttribute('team-name') || '';
        const photo = this.getAttribute('photo');
        const playerId = this.getAttribute('player-id');

        this.textContent = ''; // Limpiar contenido previo

        const cardDiv = document.createElement('div');
        cardDiv.className = 'card player-card';
        cardDiv.style.cursor = 'pointer';

        const headerDiv = document.createElement('div');
        headerDiv.className = 'player-card-header';

        if (photo) {
            const img = document.createElement('img');
            img.src = photo;
            img.alt = name;
            img.className = 'player-avatar-img';
            headerDiv.appendChild(img);
        } else {
            const placeholder = document.createElement('div');
            placeholder.className = 'player-avatar-placeholder';
            placeholder.textContent = `#${number}`;
            headerDiv.appendChild(placeholder);
        }

        const badge = document.createElement('div');
        badge.className = 'player-badge';
        badge.textContent = `#${number}`;
        headerDiv.appendChild(badge);

        const bodyDiv = document.createElement('div');
        bodyDiv.className = 'player-card-body';

        const h3 = document.createElement('h3');
        h3.className = 'player-name';
        h3.textContent = name;
        bodyDiv.appendChild(h3);

        const pPos = document.createElement('p');
        pPos.className = 'player-position';
        pPos.textContent = position;
        bodyDiv.appendChild(pPos);

        if (teamName) {
            const teamTag = document.createElement('span');
            teamTag.className = 'player-team-tag';
            teamTag.textContent = teamName;
            bodyDiv.appendChild(teamTag);
        }

        cardDiv.appendChild(headerDiv);
        cardDiv.appendChild(bodyDiv);
        this.appendChild(cardDiv);

        if (playerId) {
            this.addEventListener('click', () => {
                window.location.hash = `#player/${playerId}`;
            });
        }
    }
}

customElements.define('player-card', PlayerCard);