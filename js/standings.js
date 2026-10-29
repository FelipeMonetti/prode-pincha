// standings.js
// Tabla de posiciones con estadísticas por jugador.
//
// Conceptos:
// - Query: traemos jugadores con todas sus predicciones anidadas
// - Calculamos stats en el frontend: totales, exactos, aciertos, fallos, racha, % acierto
// - Ordenamos por puntos (mayor a menor)

import { supabase } from './supabase.js';

// ─── DATOS ───────────────────────────────────────────────

export async function loadStandings() {
  // Traer jugadores con sus predicciones + datos del partido (para ordenar por fecha)
  const { data, error } = await supabase
    .from('players')
    .select(`
      name,
      predictions (
        points,
        match:matches ( kickoff )
      )
    `);

  if (error) {
    console.error('Error cargando standings:', error);
    return [];
  }

  // Calcular stats por jugador
  const standings = data.map(player => {
    // Filtrar predicciones que tienen puntos asignados (partidos terminados)
    const preds = (player.predictions || []).filter(p => p.points !== null);

    const played = preds.length;
    const exact = preds.filter(p => p.points === 3).length;
    const correct = preds.filter(p => p.points === 1).length;
    const wrong = preds.filter(p => p.points === 0).length;
    const totalPts = preds.reduce((sum, p) => sum + p.points, 0);

    // Porcentaje de acierto (exacto o ganador correcto)
    const accuracy = played > 0
      ? Math.round(((exact + correct) / played) * 100)
      : 0;

    // Racha actual: ordenar por fecha y contar desde el último resultado
    const sorted = [...preds]
      .filter(p => p.match?.kickoff)
      .sort((a, b) => new Date(b.match.kickoff) - new Date(a.match.kickoff));

    let streak = '';
    if (sorted.length > 0) {
      const lastResult = sorted[0].points > 0 ? 'W' : 'L'; // W = acertó algo, L = falló
      let count = 0;
      for (const p of sorted) {
        const current = p.points > 0 ? 'W' : 'L';
        if (current === lastResult) {
          count++;
        } else {
          break;
        }
      }
      streak = `${count}${lastResult}`;
    }

    return {
      name: player.name,
      played,
      exact,
      correct,
      wrong,
      points: totalPts,
      accuracy,
      streak,
    };
  });

  // Ordenar por puntos (mayor a menor), desempate por exactos
  standings.sort((a, b) => b.points - a.points || b.exact - a.exact);

  return standings;
}

// ─── RENDER ──────────────────────────────────────────────

export function renderStandings(standings, container) {
  container.innerHTML = '';

  if (standings.length === 0) {
    container.innerHTML = '<p class="loading">No hay datos todavía.</p>';
    return;
  }

  const table = document.createElement('table');
  table.className = 'standings';

  // Header
  table.innerHTML = `
    <thead>
      <tr>
        <th>#</th>
        <th>Jugador</th>
        <th>PJ</th>
        <th>Exact.</th>
        <th>Aciert.</th>
        <th>Fallos</th>
        <th>Pts</th>
      </tr>
    </thead>
  `;

  // Body
  const tbody = document.createElement('tbody');

  standings.forEach((player, index) => {
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${player.name}</td>
      <td>${player.played}</td>
      <td>${player.exact}</td>
      <td>${player.correct}</td>
      <td>${player.wrong}</td>
      <td>${player.points}</td>
    `;

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  container.appendChild(table);

  // Stats cards debajo de la tabla
  if (standings.some(s => s.played > 0)) {
    container.appendChild(createStatsCards(standings));
  }
}

// ─── STATS CARDS ─────────────────────────────────────────

function createStatsCards(standings) {
  const grid = document.createElement('div');
  grid.className = 'stats-grid';

  // Mejor racha
  const bestStreak = [...standings]
    .filter(s => s.streak)
    .sort((a, b) => {
      const aNum = parseInt(a.streak) || 0;
      const bNum = parseInt(b.streak) || 0;
      return bNum - aNum;
    })[0];

  if (bestStreak && bestStreak.streak) {
    grid.appendChild(statCard('Racha', bestStreak.streak, bestStreak.name));
  }

  // Mejor % acierto
  const bestAccuracy = [...standings]
    .filter(s => s.played > 0)
    .sort((a, b) => b.accuracy - a.accuracy)[0];

  if (bestAccuracy) {
    grid.appendChild(statCard('% Acierto', `${bestAccuracy.accuracy}%`, bestAccuracy.name));
  }

  // Más exactos
  const mostExact = [...standings].sort((a, b) => b.exact - a.exact)[0];
  if (mostExact && mostExact.exact > 0) {
    grid.appendChild(statCard('Exactos', mostExact.exact.toString(), mostExact.name));
  }

  // Total partidos jugados
  const totalPlayed = standings.reduce((sum, s) => sum + s.played, 0);
  if (totalPlayed > 0) {
    grid.appendChild(statCard('Partidos', totalPlayed.toString(), 'Total jugados'));
  }

  return grid;
}

function statCard(label, value, subtitle) {
  const card = document.createElement('div');
  card.className = 'stat-card';
  card.innerHTML = `
    <div class="stat-label">${label}</div>
    <div class="stat-value">${value}</div>
    <div class="stat-player">${subtitle}</div>
  `;
  return card;
}
