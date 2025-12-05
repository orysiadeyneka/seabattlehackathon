async function fetchBots() {
  const res = await fetch('/api/bots');
  const bots = await res.json();
  const tbody = document.getElementById('bots-table-body');
  tbody.innerHTML = '';

  if (!bots.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center">No bots yet.</td></tr>';
    return;
  }

  for (const bot of bots) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${bot.name}</td>
      <td>${bot.botUrl ? '<span class="text-success">Set</span>' : '<span class="text-danger">Not set</span>'}</td>
      <td>${bot.stats?.wins ?? 0}</td>
      <td>${bot.stats?.losses ?? 0}</td>
    `;
    tbody.appendChild(tr);
  }
}

document.getElementById('refresh-bots')?.addEventListener('click', () => {
  fetchBots();
});

document.getElementById('join-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('join-name').value.trim();
  const password = document.getElementById('join-password').value;
  const confirmPassword = document.getElementById('join-password-confirm').value;
  const msg = document.getElementById('join-message');
  msg.textContent = '';

  try {
    const res = await fetch('/api/bots/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, password, confirmPassword })
    });
    const data = await res.json();
    if (!res.ok) {
      msg.textContent = data.error || 'Error registering bot';
      msg.classList.remove('text-success');
      msg.classList.add('text-warning');
    } else {
      msg.textContent = 'Bot registered! Now set its URL.';
      msg.classList.remove('text-warning');
      msg.classList.add('text-success');
      fetchBots();
    }
  } catch (err) {
    msg.textContent = 'Network error';
    msg.classList.add('text-warning');
  }
});

document.getElementById('url-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('url-name').value.trim();
  const password = document.getElementById('url-password').value;
  const url = document.getElementById('url-url').value.trim();
  const msg = document.getElementById('url-message');
  msg.textContent = '';

  try {
    const res = await fetch('/api/bots/set-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, password, url })
    });
    const data = await res.json();
    if (!res.ok) {
      msg.textContent = data.error || 'Error setting URL';
      msg.classList.remove('text-success');
      msg.classList.add('text-warning');
    } else {
      msg.textContent = 'Bot URL updated!';
      msg.classList.remove('text-warning');
      msg.classList.add('text-success');
      fetchBots();
    }
  } catch (err) {
    msg.textContent = 'Network error';
    msg.classList.add('text-warning');
  }
});

fetchBots();
