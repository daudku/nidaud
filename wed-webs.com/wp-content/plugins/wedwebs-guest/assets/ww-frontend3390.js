// assets/ww-frontend.js

/**
 * Vanilla JS front-end for Wedwebs Guest Management
 * Pure CSS + Fetch API (no framework)
 */

document.addEventListener('DOMContentLoaded', function() {
  const root = document.getElementById('ww-dashboard-root');
  if (!root) return;

  let events = [];
  let guests = [];
  let selectedEvent = null;

  const nonce   = WW_API.nonce;
  const apiRoot = WW_API.root;

  const html = {
    loading: function() {
      return '<div class="loading">Loading…</div>';
    },

    eventsList: function() {
      return '<ul class="ww-event-list">' + events.map(function(ev) {
        var cls = selectedEvent && ev.id === selectedEvent.id ? ' selected' : '';
        var date = ev.event_date.split(' ')[0];
        return '<li class="ww-event-item' + cls + '" data-id="' + ev.id + '">'
             + ev.title + ' <small>(' + date + ')</small>'
             + '</li>';
      }).join('') + '</ul>';
    },

    guestsTable: function() {
  return '<h3>Guests for “' + selectedEvent.title + '”</h3>' +
         '<table class="ww-guest-table"><thead><tr>' +
         '<th>Name</th><th>Phone</th><th>RSVP</th><th>Status</th><th>Action</th>' +
         '</tr></thead><tbody>' +
         guests.map(function(g){
           var rsvpText = g.rsvp_status == 0 ? 'Pending'
             : (g.rsvp_status == 1 ? 'Yes' : 'No');
           var deliveryText = g.delivery_status === 'opened' ? 'Opened'
                              : (g.delivery_status === 'sent'   ? 'Sent'
                              : 'Not sent');
           return '<tr>' +
                  '<td>' + g.full_name + '</td>' +
                  '<td>' + (g.phone||'-') + '</td>' +
                  '<td>' + rsvpText + '</td>' +
                  '<td>' + deliveryText + '</td>' +
                  '<td><button class="ww-btn-copy" data-id="' + g.id + '">Copy Link</button></td>' +
                  '</tr>';
         }).join('') +
         '</tbody></table>' +
           '<div class="ww-add-guest">'
           + '<input type="text" class="ww-input" placeholder="New guest name…" />'
           + '<button class="ww-btn" data-action="add">Add Guest</button>'
           + '</div>';
    }
  };

  async function fetchEvents() {
    root.innerHTML = html.loading();
    try {
      var res = await fetch(apiRoot + '/events', { headers: { 'X-WP-Nonce': nonce } });
      events = await res.json();
      render();
    } catch (err) {
      root.innerHTML = '<p>Error loading events.</p>';
      console.error('fetchEvents error', err);
    }
  }

  async function fetchGuests(eventId) {
    root.innerHTML += html.loading();
    try {
      var res = await fetch(apiRoot + '/events/' + eventId + '/guests', { headers: { 'X-WP-Nonce': nonce } });
      if (!res.ok) throw new Error('Status ' + res.status);
      guests = await res.json();
      render();
    } catch (err) {
      root.innerHTML = '<p>Error loading guests.</p>';
      console.error('fetchGuests error', err);
    }
  }

  async function addGuest(name) {
    try {
      var res = await fetch(apiRoot + '/events/' + selectedEvent.id + '/guests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': nonce
        },
        body: JSON.stringify({ full_name: name })
      });
      if (!res.ok) throw new Error('Status ' + res.status);
      await fetchGuests(selectedEvent.id);
    } catch (err) {
      alert('Error adding guest');
      console.error('addGuest error', err);
    }
  }

  async function copyLink(guestId) {
    try {
      var res = await fetch(apiRoot + '/guests/' + guestId + '/link', {
        method: 'POST',
        headers: { 'X-WP-Nonce': nonce }
      });
      if (!res.ok) throw new Error('Status ' + res.status);
      var data = await res.json();
      navigator.clipboard.writeText(data.url).then(function() {
        alert('Link copied: ' + data.url);
      });
    } catch (err) {
      alert('Error generating link');
      console.error('copyLink error', err);
    }
  }

  function render() {
    var out = html.eventsList();
    if (selectedEvent) {
      out += html.guestsTable();
    }
    root.innerHTML = out;
  }

  root.addEventListener('click', async function(e) {
    // DEBUG — did we hit the click handler at all?
  console.log('ww-dashboard click:', e.target);

  // Event item click
  let evItem = e.target.closest('.ww-event-item');
  if ( evItem ) {
    let id = evItem.getAttribute('data-id');
    console.log('  → event clicked, id =', id);

    selectedEvent = events.find(ev=>ev.id==id);
    console.log('  → selectedEvent =', selectedEvent);

    await fetchGuests(id);
    return;
  }
    if (e.target.matches('[data-action="add"]')) {
      var input = root.querySelector('.ww-add-guest .ww-input');
      var name = input.value.trim();
      if (name) {
        await addGuest(name);
      }
      return;
    }
    var copyBtn = e.target.closest('.ww-btn-copy');
    if (copyBtn) {
      var guestId = copyBtn.getAttribute('data-id');
      await copyLink(guestId);
      return;
    }
  });

  fetchEvents();
});
