// Punto de entrada de la app
// Maneja: mostrar login o app, navegación entre secciones, auto-linkeo por email
import { supabase } from './supabase.js';
import { loginWithGoogle, logout, getCurrentUser, getCurrentPlayer, onAuthChange } from './auth.js';
import { loadMatches, renderMatches } from './matches.js';
import { loadStandings, renderStandings } from './standings.js';

// Mapeo email → jugador (auto-link sin pantalla de selección)
const EMAIL_TO_PLAYER = {
  'colopincha6@gmail.com': 'Fefi',
  'nicolasmonetti706@gmail.com': 'Nico',
  'fefiti10@gmail.com': 'Papá',
};

// Referencias al DOM
const loginScreen = document.getElementById('login-screen');
const appScreen = document.getElementById('app-screen');
const pickScreen = document.getElementById('pick-screen');
const btnLogin = document.getElementById('btn-login');
const btnLogout = document.getElementById('btn-logout');
const playerName = document.getElementById('player-name');
const navButtons = document.querySelectorAll('.nav-btn');
const pickButtons = document.getElementById('pick-buttons');

// --- Login / Logout ---

btnLogin.addEventListener('click', () => {
  btnLogin.classList.add('loading');
  btnLogin.disabled = true;
  btnLogin.innerHTML = `
    <div class="btn-spinner"></div>
    Conectando...
  `;
  loginWithGoogle().catch(() => {
    btnLogin.classList.remove('loading');
    btnLogin.disabled = false;
    btnLogin.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 2.58 9 2.58Z" fill="#EA4335"/></svg>
      Iniciar con Google
    `;
  });
});
btnLogout.addEventListener('click', logout);

// --- Navegación entre secciones ---

navButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.section;

    // Actualizar botón activo
    navButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Mostrar sección correspondiente
    document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
    document.getElementById(`section-${target}`).classList.remove('hidden');
  });
});

// --- Auto-link por email ---
// Si el usuario se logueó con un email conocido, lo vincula automáticamente

async function autoLinkPlayer(user) {
  const email = user.email?.toLowerCase();
  const expectedName = EMAIL_TO_PLAYER[email];

  if (!expectedName) {
    // Email no reconocido — mostrar selector manual como fallback
    return null;
  }

  // Buscar el jugador con ese nombre
  const { data: player, error } = await supabase
    .from('players')
    .select('*')
    .eq('name', expectedName)
    .single();

  if (error || !player) return null;

  // Si ya está linkeado a este usuario, listo
  if (player.auth_id === user.id) return player;

  // Si no tiene auth_id, linkearlo
  if (!player.auth_id) {
    const { error: updateError } = await supabase
      .from('players')
      .update({ auth_id: user.id })
      .eq('id', player.id);

    if (updateError) {
      console.error('Error auto-linkeando:', updateError);
      return null;
    }

    // Devolver el player actualizado
    return { ...player, auth_id: user.id };
  }

  // Si está linkeado a otro usuario... no hacer nada
  return null;
}

// --- Mostrar pantalla para elegir jugador (fallback) ---

async function showPickPlayer(user) {
  const { data: availablePlayers } = await supabase
    .from('players')
    .select('*')
    .is('auth_id', null);

  pickButtons.innerHTML = '';

  if (!availablePlayers || availablePlayers.length === 0) {
    pickButtons.innerHTML = '<p>No hay jugadores disponibles.</p>';
    return;
  }

  availablePlayers.forEach(p => {
    const btn = document.createElement('button');
    btn.className = 'btn btn-primary';
    btn.textContent = p.name;
    btn.addEventListener('click', async () => {
      const { error } = await supabase
        .from('players')
        .update({ auth_id: user.id })
        .eq('id', p.id);

      if (error) {
        alert('Error al registrarte: ' + error.message);
        return;
      }
      window.location.reload();
    });
    pickButtons.appendChild(btn);
  });

  loginScreen.classList.add('hidden');
  appScreen.classList.add('hidden');
  pickScreen.classList.remove('hidden');
}

// --- Mostrar la app principal ---

async function showApp(player) {
  playerName.textContent = player.name;
  loginScreen.classList.add('hidden');
  pickScreen.classList.add('hidden');
  appScreen.classList.remove('hidden');

  // Cargar y mostrar partidos (pasamos player para el form de predicción)
  const matches = await loadMatches();
  const matchesContainer = document.getElementById('matches-list');
  renderMatches(matches, matchesContainer, player);

  // Cargar y mostrar tabla de posiciones
  const standings = await loadStandings();
  const standingsContainer = document.getElementById('standings-table');
  renderStandings(standings, standingsContainer);
}

// --- Cambio de sesión ---

onAuthChange(async (event, session) => {
  if (session) {
    // Primero intentar auto-link por email
    const user = await getCurrentUser();

    // Verificar si ya tiene player linkeado
    let player = await getCurrentPlayer();

    if (!player && user) {
      // Intentar auto-link
      player = await autoLinkPlayer(user);
    }

    if (player) {
      showApp(player);
    } else if (user) {
      // No se pudo auto-linkear — mostrar selector manual
      showPickPlayer(user);
    }
  } else {
    loginScreen.classList.remove('hidden');
    appScreen.classList.add('hidden');
    pickScreen.classList.add('hidden');
  }
});
