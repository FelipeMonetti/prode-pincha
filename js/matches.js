// matches.js
// Trae partidos de Supabase y los renderiza como cards.
//
// Conceptos:
// - Nested select: traemos partidos + predicciones + nombre de jugador en una sola query
// - Separamos la lógica de datos (loadMatches) de la de UI (renderMatches)
// - Cada card muestra: ronda, equipos, resultado, y predicciones de los 3

import { supabase } from './supabase.js';

// ─── DATOS ───────────────────────────────────────────────

export async function loadMatches() {
  // El select anidado hace JOIN automático:
  // matches → predictions → players
  const { data, error } = await supabase
    .from('matches')
    .select(`
      *,
      predictions (
        home_score,
        away_score,
        points,
        player:players ( name )
      )
    `)
    .order('kickoff', { ascending: false });

  if (error) {
    console.error('Error cargando partidos:', error);
    return [];
  }
  return data;
}

// ─── RENDER ──────────────────────────────────────────────

export function renderMatches(matches, container) {
  container.innerHTML = '';

  // Separar próximos y jugados
  const upcoming = matches
    .filter(m => m.status === 'NS')
    .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));

  const finished = matches
    .filter(m => m.status === 'FT')
    .sort((a, b) => new Date(b.kickoff) - new Date(a.kickoff));

  // Banner: próximo partido con countdown
  if (upcoming.length > 0) {
    container.appendChild(createCountdown(upcoming[0]));
  }

  // Sección: Próximos
  if (upcoming.length > 0) {
    container.appendChild(sectionTitle('Próximos partidos'));
    upcoming.forEach(m => container.appendChild(createMatchCard(m)));
  }

  // Sección: Jugados
  if (finished.length > 0) {
    container.appendChild(sectionTitle('Partidos jugados'));
    finished.forEach(m => container.appendChild(createMatchCard(m)));
  }
}

// ─── COMPONENTES ─────────────────────────────────────────

function sectionTitle(text) {
  const h = document.createElement('h2');
  h.className = 'section-title';
  h.textContent = text;
  return h;
}

// Banner con countdown al próximo partido
function createCountdown(match) {
  const div = document.createElement('div');
  div.className = 'countdown-banner';

  function update() {
    const now = new Date();
    const kickoff = new Date(match.kickoff);
    const diff = kickoff - now;

    if (diff <= 0) {
      div.innerHTML = `<span class="countdown-label">⚽ En juego</span>
        <span class="countdown-teams">${match.home_team} vs ${match.away_team}</span>`;
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    let timeStr = '';
    if (days > 0) timeStr += `${days}d `;
    if (hours > 0) timeStr += `${hours}h `;
    timeStr += `${mins}m`;

    div.innerHTML = `<span class="countdown-label">⚽ Próximo partido</span>
      <span class="countdown-teams">${match.home_team} vs ${match.away_team}</span>
      <span class="countdown-time">Faltan ${timeStr}</span>`;
  }

  update();
  // Actualizar cada minuto
  setInterval(update, 60000);

  return div;
}

// Card de un partido individual
function createMatchCard(match) {
  const card = document.createElement('div');
  card.className = 'match-card';

  const isFinished = match.status === 'FT';

  // Ronda / competencia
  const round = document.createElement('div');
  round.className = 'round';
  round.textContent = match.round;
  card.appendChild(round);

  // Equipos y resultado
  const teams = document.createElement('div');
  teams.className = 'teams';

  if (isFinished) {
    // Partido terminado: mostrar resultado
    teams.innerHTML = `
      <div class="team"><span>${match.home_team}</span></div>
      <div class="score">${match.home_score} - ${match.away_score}</div>
      <div class="team"><span>${match.away_team}</span></div>
    `;
  } else {
    // Partido por jugar: mostrar fecha
    teams.innerHTML = `
      <div class="team"><span>${match.home_team}</span></div>
      <div class="vs">vs</div>
      <div class="team"><span>${match.away_team}</span></div>
    `;
  }
  card.appendChild(teams);

  // Fecha/hora para partidos futuros
  if (!isFinished) {
    const kickoff = document.createElement('div');
    kickoff.className = 'kickoff';
    kickoff.textContent = formatDate(match.kickoff);
    card.appendChild(kickoff);
  }

  // Predicciones (solo para partidos terminados)
  if (isFinished && match.predictions && match.predictions.length > 0) {
    const predsDiv = document.createElement('div');
    predsDiv.className = 'others-predictions';

    // Ordenar: primero más puntos
    const sorted = [...match.predictions].sort((a, b) => b.points - a.points);

    sorted.forEach(pred => {
      const row = document.createElement('div');
      row.className = 'pred-row';

      const name = pred.player?.name || '?';
      const predScore = `${pred.home_score}-${pred.away_score}`;
      const pts = pred.points;

      row.innerHTML = `
        <span>${name}: ${predScore}</span>
        <span class="points points-${pts}">${pts} pts${pts === 3 ? ' ⭐' : ''}</span>
      `;
      predsDiv.appendChild(row);
    });

    card.appendChild(predsDiv);
  }

  return card;
}

// Formatear fecha para mostrar
function formatDate(isoString) {
  const date = new Date(isoString);
  const options = {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  };
  return date.toLocaleDateString('es-AR', options);
}
