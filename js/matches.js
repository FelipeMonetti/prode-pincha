// matches.js
// Trae partidos de Supabase y los renderiza como cards.
// Incluye formulario de predicción para partidos próximos.
//
// Conceptos:
// - Nested select: traemos partidos + predicciones + nombre de jugador en una sola query
// - Separamos la lógica de datos (loadMatches) de la de UI (renderMatches)
// - Cada card muestra: ronda, equipos, resultado, y predicciones
// - Para partidos futuros: form de predicción con upsert

import { supabase } from './supabase.js';

// ─── DATOS ───────────────────────────────────────────────

export async function loadMatches() {
  // El select anidado hace JOIN automático:
  // matches → predictions → players
  // Incluimos player_id para identificar la predicción del jugador actual
  const { data, error } = await supabase
    .from('matches')
    .select(`
      *,
      predictions (
        player_id,
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

// ─── GUARDAR PREDICCIÓN ─────────────────────────────────

async function savePrediction(playerId, matchId, homeScore, awayScore) {
  // upsert: si ya existe (player_id + match_id), actualiza; si no, inserta
  // RLS se encarga de validar que sea tu predicción y que el partido no haya arrancado
  const { error } = await supabase
    .from('predictions')
    .upsert(
      {
        player_id: playerId,
        match_id: matchId,
        home_score: homeScore,
        away_score: awayScore,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'player_id,match_id' }
    );

  if (error) {
    console.error('Error guardando predicción:', error);
    return { ok: false, message: error.message };
  }
  return { ok: true };
}

// ─── RENDER ──────────────────────────────────────────────

export function renderMatches(matches, container, player) {
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
    upcoming.forEach(m => container.appendChild(createMatchCard(m, player)));
  }

  // Sección: Jugados
  if (finished.length > 0) {
    container.appendChild(sectionTitle('Partidos jugados'));
    finished.forEach(m => container.appendChild(createMatchCard(m, player)));
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

    const secs = Math.floor((diff % (1000 * 60)) / 1000);

    let timeStr = '';
    if (days > 0) timeStr += `${days}d `;
    if (hours > 0) timeStr += `${hours}h `;
    timeStr += `${mins}m ${secs}s`;

    div.innerHTML = `<span class="countdown-label">⚽ Próximo partido</span>
      <span class="countdown-teams">${match.home_team} vs ${match.away_team}</span>
      <span class="countdown-time">Faltan ${timeStr}</span>`;
  }

  update();
  // Actualizar cada segundo
  setInterval(update, 1000);

  return div;
}

// Card de un partido individual
function createMatchCard(match, player) {
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
    teams.innerHTML = `
      <div class="team"><span>${match.home_team}</span></div>
      <div class="score">${match.home_score} - ${match.away_score}</div>
      <div class="team"><span>${match.away_team}</span></div>
    `;
  } else {
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

  // --- PARTIDO PRÓXIMO: formulario de predicción ---
  if (!isFinished && player) {
    // Buscar si ya tiene predicción para este partido
    const myPred = (match.predictions || []).find(p => p.player_id === player.id);

    const form = document.createElement('div');
    form.className = 'prediction-form';

    const inputHome = document.createElement('input');
    inputHome.type = 'number';
    inputHome.min = '0';
    inputHome.max = '99';
    inputHome.placeholder = '0';
    if (myPred) inputHome.value = myPred.home_score;

    const sep = document.createElement('span');
    sep.className = 'separator';
    sep.textContent = '-';

    const inputAway = document.createElement('input');
    inputAway.type = 'number';
    inputAway.min = '0';
    inputAway.max = '99';
    inputAway.placeholder = '0';
    if (myPred) inputAway.value = myPred.away_score;

    const btnSave = document.createElement('button');
    btnSave.className = 'btn btn-primary btn-small';
    btnSave.textContent = myPred ? 'Editar' : 'Guardar';

    form.appendChild(inputHome);
    form.appendChild(sep);
    form.appendChild(inputAway);
    form.appendChild(btnSave);
    card.appendChild(form);

    // Mensaje de estado debajo del form
    const status = document.createElement('div');
    if (myPred) {
      status.className = 'prediction-saved';
      status.textContent = `Tu predicción: ${myPred.home_score}-${myPred.away_score} ✓`;
    }
    card.appendChild(status);

    // Handler del botón guardar
    btnSave.addEventListener('click', async () => {
      const h = parseInt(inputHome.value);
      const a = parseInt(inputAway.value);

      if (isNaN(h) || isNaN(a) || h < 0 || a < 0) {
        status.className = 'prediction-locked';
        status.textContent = 'Ingresá un resultado válido';
        return;
      }

      btnSave.disabled = true;
      btnSave.textContent = '...';

      const result = await savePrediction(player.id, match.id, h, a);

      if (result.ok) {
        status.className = 'prediction-saved';
        status.textContent = `Tu predicción: ${h}-${a} ✓`;
        btnSave.textContent = 'Editar';
      } else {
        status.className = 'prediction-locked';
        // Si RLS bloquea, probablemente el partido ya arrancó
        if (result.message.includes('row-level security')) {
          status.textContent = 'Predicción bloqueada — el partido ya arrancó';
        } else {
          status.textContent = 'Error: ' + result.message;
        }
        btnSave.textContent = myPred ? 'Editar' : 'Guardar';
      }

      btnSave.disabled = false;
    });
  }

  // --- PARTIDO TERMINADO: predicciones de todos ---
  if (isFinished && match.predictions && match.predictions.length > 0) {
    const predsDiv = document.createElement('div');
    predsDiv.className = 'others-predictions';

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
