/* js/views/landing.view.js */

export function renderLandingView(container, onNavigateToApp) {
    container.textContent = '';

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'max-width: 1000px; margin: 30px auto; padding: 0 1.5rem; font-family: inherit; color: #f8fafc;';

    // Sección Principal (Hero Card) estilo Dashboard
    const heroCard = document.createElement('div');
    heroCard.className = 'glass-card';
    heroCard.style.cssText = 'background: #121824; border: 1px solid #1e293b; border-radius: 12px; padding: 2.5rem; margin-bottom: 2rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);';

    const headerFlex = document.createElement('div');
    headerFlex.style.cssText = 'display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 2rem;';

    const textContent = document.createElement('div');
    textContent.style.cssText = 'flex: 1; min-width: 280px;';

    const title = document.createElement('h1');
    title.style.cssText = 'font-size: 2rem; font-weight: 700; margin-bottom: 0.75rem; color: #f8fafc;';
    title.textContent = 'Bienvenido a SetPoint';
    textContent.appendChild(title);

    const description = document.createElement('p');
    description.style.cssText = 'font-size: 1rem; color: #94a3b8; line-height: 1.5; margin-bottom: 1.5rem;';
    description.textContent = 'Plataforma profesional para la administración integral de ligas, torneos, plantillas y estadísticas deportivas en múltiples disciplinas.';
    textContent.appendChild(description);

    const ctaButton = document.createElement('button');
    ctaButton.className = 'btn btn-primary';
    ctaButton.style.cssText = 'padding: 0.75rem 1.5rem; font-size: 0.95rem; font-weight: 600; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px;';
    ctaButton.innerHTML = '⚡ Ir al Dashboard';
    ctaButton.addEventListener('click', () => {
        onNavigateToApp();
    });
    textContent.appendChild(ctaButton);

    headerFlex.appendChild(textContent);

    // Mini panel lateral decorativo o resumen visual rápido
    const badgeBox = document.createElement('div');
    badgeBox.style.cssText = 'background: #1a2234; border: 1px solid #2a3649; border-radius: 10px; padding: 1.25rem 1.5rem; min-width: 220px; text-align: center;';
    badgeBox.innerHTML = `
        <div style="font-size: 1.75rem; margin-bottom: 0.5rem;">🏆</div>
        <div style="font-weight: 600; font-size: 0.95rem; color: #f1f5f9;">Control Total</div>
        <div style="font-size: 0.8rem; color: #94a3b8; margin-top: 4px;">Fútbol, Básquet y Vóleibol</div>
    `;
    headerFlex.appendChild(badgeBox);

    heroCard.appendChild(headerFlex);
    wrapper.appendChild(heroCard);

    // Cuadrícula inferior de características resumidas
    const grid = document.createElement('div');
    grid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.25rem;';

    const features = [
        { title: 'Gestión de Ligas', desc: 'Crea torneos personalizados con tablas de posiciones y calendarios automatizados.' },
        { title: 'Equipos y Jugadores', desc: 'Administra plantillas completas con estadísticas detalladas por atleta.' },
        { title: 'Partidos y Marcadores', desc: 'Sigue el registro de cada encuentro jornada a jornada en tiempo real.' }
    ];

    features.forEach(f => {
        const card = document.createElement('div');
        card.style.cssText = 'background: #121824; border: 1px solid #1e293b; border-radius: 10px; padding: 1.25rem;';
        card.innerHTML = `
            <h3 style="font-size: 1rem; font-weight: 600; color: #f1f5f9; margin-bottom: 0.5rem;">${f.title}</h3>
            <p style="font-size: 0.85rem; color: #94a3b8; line-height: 1.4; margin: 0;">${f.desc}</p>
        `;
        grid.appendChild(card);
    });

    wrapper.appendChild(grid);
    container.appendChild(wrapper);
}