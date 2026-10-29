// Punto de entrada de la app
// Maneja: mostrar login o app, navegación entre secciones, linkeo de jugador
import { supabase } from './supabase.js';
import { loginWithGoogle, logout, getCurrentUser, getCurrentPlayer, onAuthChange } from './auth.js';
import { loadMatches, renderMatches } from './matches.js';

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

btnLogin.addEventListener('click', loginWithGoogle);
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

// --- Mostrar pantalla para elegir jugador ---
// Se muestra cuando el usuario se logueó pero no está linkeado a ningún player

async function showPickPlayer(user) {
  // Traer jugadores que todavía no tienen auth_id (no están linkeados)
  const { data: availablePlayers } = await supabase
    .from('players')
    .select('*')
    .is('auth_id', null);

  pickButtons.innerHTML = '';

  if (!availablePlayers || availablePlayers.length === 0) {
    pickButtons.innerHTML = '<p>No hay jugadores disponibles. Todos ya están registrados.</p>';
    return;
  }

  availablePlayers.forEach(p => {
    const btn = document.createElement('button');
    btn.className = 'btn btn-primary';
    btn.textContent = p.name;
    btn.addEventListener('click', async () => {
      // Linkear este player con el usuario logueado
      const { error } = await supabase
        .from('players')
        .update({ auth_id: user.id })
        .eq('id', p.id);

      if (error) {
        alert('Error al registrarte: ' + error.message);
        return;
      }

      // Recargar la app
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

  // Cargar y mostrar partidos
  const matches = await loadMatches();
  const matchesContainer = document.getElementById('matches-list');
  renderMatches(matches, matchesContainer);
}

// --- Cambio de sesión ---

onAuthChange(async (event, session) => {
  if (session) {
    const player = await getCurrentPlayer();

    if (player) {
      showApp(player);
    } else {
      // Logueado pero no linkeado a un jugador — mostrar selector
      const user = await getCurrentUser();
      showPickPlayer(user);
    }
  } else {
    loginScreen.classList.remove('hidden');
    appScreen.classList.add('hidden');
    pickScreen.classList.add('hidden');
  }
});
