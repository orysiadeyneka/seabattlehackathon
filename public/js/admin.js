let adminPassword = null;

function getAdminPassword() {
  if (!adminPassword) {
    adminPassword = sessionStorage.getItem('adminPassword');
  }
  return adminPassword;
}

function setAdminPassword(pwd) {
  adminPassword = pwd;
  sessionStorage.setItem('adminPassword', pwd);
}

async function adminFetch(url, options = {}) {
  const pwd = getAdminPassword();
  if (!pwd) throw new Error('No admin password set');
  options.headers = options.headers || {};
  options.headers['X-Admin-Password'] = pwd;
  return fetch(url, options);
}

async function loadStatus() {
  try {
    const res = await adminFetch('/api/admin/status');
    if (!res.ok) throw new Error('Unauthorized');
    const data = await res.json();
    const el = document.getElementById('tournament-status');
    el.textContent = data.running ? (data.paused ? 'Paused' : 'Running') : 'Stopped';
  } catch (err) {
    console.error(err);
  }
}

async function loadBots() {
  try {
    const res = await fetch('/api/bots');
    const bots = await res.json();
    const tbody = document.getElementById('admin-bots-body');
    tbody.innerHTML = '';
    if (!bots.length) {
      tbody.innerHTML = '<tr><td colspan="3" class="text-center">No bots.</td></tr>';
      return;
    }
    for (const bot of bots) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${bot.name}</td>
        <td>${bot.botUrl ? '<span class="text-success">Set</span>' : '<span class="text-danger">Not set</span>'}</td>
        <td><button class="btn btn-sm btn-danger" data-id="${bot.id}">Remove</button></td>
      `;
      tbody.appendChild(tr);
    }
    tbody.querySelectorAll('button[data-id]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Remove this bot?')) return;
        const id = btn.getAttribute('data-id');
        try {
          const res = await adminFetch(`/api/admin/bots/${id}/remove`, { method: 'POST' });
          if (!res.ok) {
            const data = await res.json();
            alert(data.error || 'Failed to remove bot');
          } else {
            loadBots();
          }
        } catch (err) {
          alert('Network error');
        }
      });
    });
  } catch (err) {
    console.error(err);
  }
}

async function loadHistory() {
  try {
    const res = await adminFetch('/api/admin/history');
    if (!res.ok) throw new Error('Unauthorized');
    const data = await res.json();
    const panel = document.getElementById('history-panel');
    const tournaments = data.tournaments || [];

    if (!tournaments.length) {
      panel.textContent = 'No tournaments yet.';
      return;
    }

    panel.innerHTML = '';
    for (const t of tournaments.slice().reverse()) {
      const div = document.createElement('div');
      div.className = 'mb-2';
      div.innerHTML = `
        <div><strong>Tournament</strong> ${t.id}</div>
        <div class="small">Start: ${t.startedAt || '-'} | End: ${t.finishedAt || '-'}</div>
      `;
      panel.appendChild(div);
    }
  } catch (err) {
    console.error(err);
  }
}

document.getElementById('admin-password-btn')?.addEventListener('click', () => {
  const pwd = document.getElementById('admin-password-input').value;
  if (!pwd) return;
  setAdminPassword(pwd);
  loadStatus().then(() => {
    document.getElementById('admin-auth-warning').classList.add('d-none');
    document.getElementById('admin-content').classList.remove('d-none');
    loadBots();
    loadHistory();
  }).catch(() => {
    alert('Invalid admin password');
  });
});

document.getElementById('btn-start')?.addEventListener('click', async () => {
  try {
    await adminFetch('/api/admin/tournament/start', { method: 'POST' });
    loadStatus();
  } catch (err) {
    alert('Failed to start tournament');
  }
});

document.getElementById('btn-pause')?.addEventListener('click', async () => {
  try {
    await adminFetch('/api/admin/tournament/pause', { method: 'POST' });
    loadStatus();
  } catch (err) {
    alert('Failed to pause tournament');
  }
});

document.getElementById('btn-resume')?.addEventListener('click', async () => {
  try {
    await adminFetch('/api/admin/tournament/resume', { method: 'POST' });
    loadStatus();
  } catch (err) {
    alert('Failed to resume tournament');
  }
});

document.getElementById('btn-clear-history')?.addEventListener('click', async () => {
  if (!confirm('Clear ALL tournament and match history? This cannot be undone.')) return;
  try {
    const res = await adminFetch('/api/admin/history/clear', { method: 'POST' });
    if (!res.ok) {
      let data = {};
      try {
        data = await res.json();
      } catch (_) {}
      alert(data.error || 'Failed to clear history');
      return;
    }
    loadHistory();
  } catch (err) {
    console.error(err);
    alert('Network error while clearing history');
  }
});

if (getAdminPassword()) {
  loadStatus().then(() => {
    document.getElementById('admin-auth-warning').classList.add('d-none');
    document.getElementById('admin-content').classList.remove('d-none');
    loadBots();
    loadHistory();
  }).catch(() => {});
}
