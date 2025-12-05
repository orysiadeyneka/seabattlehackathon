async function fetchBots() {
  const res = await fetch('/api/bots');
  const bots = await res.json();
  const tbody = document.getElementById('bots-table-body');
  tbody.innerHTML = '';

  if (!bots.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">No bots yet.</td></tr>';
    return;
  }

  for (const bot of bots) {
    const tr = document.createElement('tr');
    const urlStatus = bot.botUrl ? '<span class="badge bg-success">Set</span>' : '<span class="badge bg-danger">Not set</span>';
    const setUrlBtn = `<button class="btn btn-sm btn-outline-primary set-url-btn" data-bot-name="${bot.name}">Set URL</button>`;
    
    tr.innerHTML = `
      <td>${bot.name}</td>
      <td>${urlStatus}</td>
      <td>${bot.stats?.wins ?? 0}</td>
      <td>${bot.stats?.losses ?? 0}</td>
      <td>${bot.stats?.draws ?? 0}</td>
      <td>${setUrlBtn}</td>
    `;
    tbody.appendChild(tr);
  }

  // Add event listeners to "Set URL" buttons
  document.querySelectorAll('.set-url-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const botName = e.target.dataset.botName;
      document.getElementById('url-bot-name').value = botName;
      document.getElementById('url-password').value = '';
      document.getElementById('url-url').value = '';
      document.getElementById('url-message').textContent = '';
      const modal = new bootstrap.Modal(document.getElementById('setUrlModal'));
      modal.show();
    });
  });
}

document.getElementById('refresh-bots')?.addEventListener('click', () => {
  fetchBots();
});

// Join Battle Button - Open Modal
document.getElementById('join-battle-btn')?.addEventListener('click', () => {
  document.getElementById('join-name').value = '';
  document.getElementById('join-password').value = '';
  document.getElementById('join-password-confirm').value = '';
  document.getElementById('join-message').textContent = '';
  const modal = new bootstrap.Modal(document.getElementById('joinBattleModal'));
  modal.show();
});

// Join Form Submit
document.getElementById('join-submit-btn')?.addEventListener('click', async () => {
  const name = document.getElementById('join-name').value.trim();
  const password = document.getElementById('join-password').value;
  const confirmPassword = document.getElementById('join-password-confirm').value;
  const msg = document.getElementById('join-message');
  msg.textContent = '';

  if (!name || !password || !confirmPassword) {
    msg.textContent = 'Please fill in all fields';
    msg.classList.remove('text-success');
    msg.classList.add('text-warning');
    return;
  }

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
      msg.textContent = 'Bot registered successfully!';
      msg.classList.remove('text-warning');
      msg.classList.add('text-success');
      document.getElementById('join-submit-btn').disabled = true;
      
      // Close modal after 1 second
      setTimeout(() => {
        const joinModal = bootstrap.Modal.getInstance(document.getElementById('joinBattleModal'));
        if (joinModal) {
          joinModal.hide();
        }
        fetchBots();
        document.getElementById('join-submit-btn').disabled = false;
      }, 300);
    }
  } catch (err) {
    msg.textContent = 'Network error';
    msg.classList.remove('text-success');
    msg.classList.add('text-warning');
  }
});

// URL Form Submit
document.getElementById('url-submit-btn')?.addEventListener('click', async () => {
  const name = document.getElementById('url-bot-name').value;
  const password = document.getElementById('url-password').value;
  const url = document.getElementById('url-url').value.trim();
  const msg = document.getElementById('url-message');
  msg.textContent = '';

  if (!password || !url) {
    msg.textContent = 'Please fill in all fields';
    msg.classList.remove('text-success');
    msg.classList.add('text-warning');
    return;
  }

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
      msg.textContent = 'Bot URL updated successfully!';
      msg.classList.remove('text-warning');
      msg.classList.add('text-success');
      document.getElementById('url-submit-btn').disabled = true;
      
      // Close modal after 1 second
      setTimeout(() => {
        const urlModal = bootstrap.Modal.getInstance(document.getElementById('setUrlModal'));
        if (urlModal) {
          urlModal.hide();
        }
        fetchBots();
        document.getElementById('url-submit-btn').disabled = false;
      }, 1000);
    }
  } catch (err) {
    msg.textContent = 'Network error';
    msg.classList.remove('text-success');
    msg.classList.add('text-warning');
  }
});

fetchBots();
