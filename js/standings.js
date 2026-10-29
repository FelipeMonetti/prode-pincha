// standings.js
// Tabla de posiciones con estadísticas por jugador.
//
// Conceptos:
// - Query: traemos jugadores con todas sus predicciones anidadas
// - Calculamos stats en el frontend: totales, exactos, aciertos, fallos
// - Ordenamos por puntos (mayor a menor)

import { supabase } from './supabase.js';

// ─── DATOS ───────────────────────────────────────────────

export async function loadStandings() {
  // Traer jugadores con sus predicciones (solo las que tienen puntos = partido terminado)
  const { data, error } = await supabase
    .from('players')
    .select(`
      name,
      predictions (
        points
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

    return {
      name: player.name,
      played,
      exact,
      correct,
      wrong,
      points: totalPts,
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
        <th>⭐</th>
        <th>✓</th>
        <th>✗</th>
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
}
