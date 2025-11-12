/* pricing.js
   Handles listing, creating, editing and deleting project pricings.
   - Persists to localStorage key: pce_pricings_v1
   - Seeds from window.initialPricings and window.clients
   - Uses workers from window.initialWorkers for assignment
   - Sell rate fixed to 100 USD; cost rate assumed for demo (60% of revenue) to compute gross margin
*/
(function(){
  const STORAGE_KEY = 'pce_pricings_v1';
  const SELL_RATE = 100; // USD
  const COST_RATE = 0.6; // assumed: cost = revenue * COST_RATE (for demo)

  const tbody = () => document.querySelector('#pricing-table tbody');
  const bannerOpened = () => document.getElementById('count-opened');
  const bannerAwaiting = () => document.getElementById('count-awaiting');
  const bannerApproved = () => document.getElementById('count-approved');

  function getData(){
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw) return JSON.parse(raw);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(window.initialPricings || []));
    return window.initialPricings || [];
  }
  let pricings = getData();

  function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(pricings)); }
  const uid = ()=> 'p'+Date.now().toString(36).slice(-6);

  function updateBannerCounts(){
    const opened = pricings.filter(p=>p.status==='Opened').length;
    const awaiting = pricings.filter(p=>p.status==='Awaiting Confirmation').length;
    const approved = pricings.filter(p=>p.status==='Approved').length;
    if(bannerOpened()) bannerOpened().textContent = opened;
    if(bannerAwaiting()) bannerAwaiting().textContent = awaiting;
    if(bannerApproved()) bannerApproved().textContent = approved;
  }

  function renderTable(list){
    const table = tbody();
    if(!table) return;
    table.innerHTML = '';
    list.forEach(p=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${p.date || ''}</td>
        <td>${p.proposalNumber || ''}</td>
        <td>${p.projectName || p.scopeDescription || ''}</td>
        <td>${p.clientName || ''}</td>
        <td>${p.remunerationModel || ''}</td>
        <td>${p.location || ''}</td>
        <td>${p.status || ''}</td>
        <td>
          <button class="action-btn action-edit" data-id="${p.id}">Edit</button>
          <button class="action-btn action-delete" data-id="${p.id}">Delete</button>
        </td>
      `;
      table.appendChild(tr);
    });
  }

  // Helpers to build dynamic UI elements inside modal
  function populateClients(){
    const sel = document.getElementById('clientId');
    if(!sel || !window.clients) return;
    sel.innerHTML = '';
    window.clients.forEach(c=>{
      const o = document.createElement('option'); o.value = c.id; o.textContent = c.name; sel.appendChild(o);
    });
  }

  function populateAssignedEngineers(selectedIds){
    // Deprecated UI: engineers are now part of engineer-entries; keep helper for backwards compatibility
    const container = document.getElementById('assigned-engineers');
    if(!container || !window.initialWorkers) return;
    container.innerHTML = '';
    window.initialWorkers.forEach(w=>{
      const id = w.id;
      const label = document.createElement('label'); label.style.display='inline-block'; label.style.marginRight='8px';
      const cb = document.createElement('input'); cb.type='checkbox'; cb.value=id; cb.name='assignedEngineer';
      if(Array.isArray(selectedIds) && selectedIds.includes(id)) cb.checked = true;
      label.appendChild(cb);
      label.appendChild(document.createTextNode(' '+(w.employeeId ? (w.employeeId+' - ') : '')+ w.name));
      container.appendChild(label);
    });
  }

  // Add an engineer row: select worker, auto-fill billingClassification & salary, editable hours
  function addEngineerRow(entry){
    const wrap = document.getElementById('engineer-entries'); if(!wrap) return;
    const row = document.createElement('div'); row.className = 'engineer-row'; row.style.display='flex'; row.style.gap='8px'; row.style.marginBottom='6px'; row.style.alignItems='center';
    // build worker select options
    const select = document.createElement('select'); select.className = 'eng-name';
    const emptyOpt = document.createElement('option'); emptyOpt.value=''; emptyOpt.textContent='-- select --'; select.appendChild(emptyOpt);
    (window.initialWorkers||[]).forEach(w=>{ const o=document.createElement('option'); o.value=w.id; o.textContent=(w.employeeId? (w.employeeId+' - '):'')+w.name; select.appendChild(o); });
    const billing = document.createElement('input'); billing.className='eng-billing'; billing.placeholder='Billing Classification'; billing.readOnly=true;
    const salary = document.createElement('input'); salary.className='eng-salary'; salary.placeholder='Salary'; salary.readOnly=true;
    const hours = document.createElement('input'); hours.className='eng-hours'; hours.type='number'; hours.min='0'; hours.step='0.1'; hours.placeholder='Hours'; hours.value = entry && entry.hours ? entry.hours : '';
    const removeBtn = document.createElement('button'); removeBtn.type='button'; removeBtn.className='btn remove-engineer'; removeBtn.textContent='Remove';
    row.appendChild(select); row.appendChild(billing); row.appendChild(salary); row.appendChild(hours); row.appendChild(removeBtn);
    wrap.appendChild(row);

    // If entry provided, set values
    if(entry && entry.workerId){ select.value = entry.workerId; billing.value = entry.billingClassification || ''; salary.value = entry.salary !== undefined ? entry.salary : ''; }

    // on change of select, autofill
    select.addEventListener('change', ()=>{
      const w = (window.initialWorkers||[]).find(x=>x.id===select.value);
      if(w){ billing.value = w.billingClassification || ''; salary.value = w.salary !== undefined ? w.salary : ''; }
      computeSummary();
    });
    hours.addEventListener('input', computeSummary);
    removeBtn.addEventListener('click', ()=>{ row.remove(); computeSummary(); });
  }

  function addNonLaborRow(entry){
    const wrap = document.getElementById('nonlabor-entries'); if(!wrap) return;
    const row = document.createElement('div'); row.className='nonlab-row'; row.style.display='flex'; row.style.gap='8px'; row.style.marginBottom='6px';
    row.innerHTML = `
      <input class="non-item" placeholder="Item" value="${entry && entry.item ? entry.item : ''}" />
      <input class="non-amount" type="number" min="0" step="0.01" placeholder="Amount" value="${entry && entry.amount ? entry.amount : ''}" />
      <button type="button" class="btn remove-nonlab">Remove</button>
    `;
    wrap.appendChild(row);
    row.querySelector('.remove-nonlab').addEventListener('click', ()=>{ row.remove(); computeSummary(); });
    row.querySelector('.non-amount').addEventListener('input', computeSummary);
  }

  function clearLaborNonLabor(){
    const l = document.getElementById('engineer-entries'); if(l) l.innerHTML='';
    const n = document.getElementById('nonlabor-entries'); if(n) n.innerHTML='';
  }

  function computeSummary(){
    // compute totals from engineer rows
    const engRows = Array.from(document.querySelectorAll('.engineer-row'));
    let totalManHours = 0;
    let laborCostTotal = 0; // sum of salaries * hours (if salary is hourly)
    engRows.forEach(r=>{
      const hours = parseFloat(r.querySelector('.eng-hours').value) || 0;
      const salary = parseFloat(r.querySelector('.eng-salary').value) || 0; // assume hourly
      totalManHours += hours;
      laborCostTotal += salary * hours;
    });

    const nonlabRows = Array.from(document.querySelectorAll('.nonlab-row'));
    let totalNonLabor = 0;
    nonlabRows.forEach(r=>{ totalNonLabor += parseFloat(r.querySelector('.non-amount').value) || 0; });

    const revenue = SELL_RATE * totalManHours;
    // laborCostTotal from salaries; add assumed overhead if desired. Also keep demo COST_RATE fallback
    const laborCost = laborCostTotal || (revenue * COST_RATE);
    const grossMargin = revenue - laborCost;
    const pctGross = revenue ? (grossMargin / revenue * 100) : 0;

    // show summary
    let summary = document.getElementById('pricing-summary');
    if(!summary){
      summary = document.createElement('div'); summary.id='pricing-summary'; summary.className='summary-box';
      const form = document.getElementById('pricing-form'); if(form) form.appendChild(summary);
    }
    summary.innerHTML = `
      <div><strong>Labor</strong></div>
      <div>Man Hours: <strong>${totalManHours.toFixed(2)}</strong></div>
      <div>Revenue (Sell Rate $${SELL_RATE}/h): <strong>$${revenue.toFixed(2)}</strong></div>
      <div>Labor Cost (salaries): <strong>$${laborCost.toFixed(2)}</strong></div>
      <div>Gross Margin: <strong>$${grossMargin.toFixed(2)}</strong> (<strong>${pctGross.toFixed(1)}%</strong>)</div>
      <hr />
      <div><strong>Non-Labor</strong></div>
      <div>Total Non-Labor: <strong>$${totalNonLabor.toFixed(2)}</strong></div>
    `;
  }

  // Modal open/close and populate
  function openModal(editId){
    const modal = document.getElementById('modal'); if(!modal) return;
    modal.classList.remove('hidden');
    populateClients();
    if(editId){
      document.getElementById('modal-title').textContent = 'Edit Pricing';
      const p = pricings.find(x=>x.id===editId); if(!p) return;
      document.getElementById('pricing-id').value = p.id;
      document.getElementById('date').value = p.date || '';
      document.getElementById('proposalNumber').value = p.proposalNumber || '';
      document.getElementById('crmNumber').value = p.crmNumber || '';
      document.getElementById('projectName').value = p.projectName || '';
      document.getElementById('scopeDescription').value = p.scopeDescription || '';
      document.getElementById('location').value = p.location || '';
      document.getElementById('remunerationModel').value = p.remunerationModel || 'Multiplier';
      document.getElementById('clientId').value = p.clientId || '';
      // labor/nonlab: populate engineer rows if present
      clearLaborNonLabor();
      (p.laborEntries||[]).forEach(e=>{
        if(e.workerId) addEngineerRow({ workerId: e.workerId, billingClassification: e.billingClassification, salary: e.salary, hours: e.hours });
        else addEngineerRow({ department: e.department, hours: e.manHours });
      });
      (p.nonLaborEntries||[]).forEach(e=>addNonLaborRow(e));
      computeSummary();
    } else {
      document.getElementById('modal-title').textContent = 'Create Pricing';
      document.getElementById('pricing-id').value = '';
      document.getElementById('pricing-form').reset();
      // clear engineer rows
      const engWrap = document.getElementById('engineer-entries'); if(engWrap) engWrap.innerHTML = '';
      populateAssignedEngineers([]);
      clearLaborNonLabor();
      computeSummary();
    }
  }
  function closeModal(){ const modal = document.getElementById('modal'); if(modal) modal.classList.add('hidden'); }

  // Collect form data and save
  function collectForm(){
    const id = document.getElementById('pricing-id').value || uid();
    const date = document.getElementById('date').value;
    const proposalNumber = document.getElementById('proposalNumber').value.trim();
    const crmNumber = document.getElementById('crmNumber').value.trim();
    const projectName = document.getElementById('projectName').value.trim();
    const scopeDescription = document.getElementById('scopeDescription').value.trim();
    const location = document.getElementById('location').value.trim();
    const remunerationModel = document.getElementById('remunerationModel').value;
    const clientId = document.getElementById('clientId').value;
    const client = (window.clients||[]).find(c=>c.id===clientId) || {};
    // collect engineers from engineer rows
    const engineerRows = Array.from(document.querySelectorAll('.engineer-row'));
    const laborEntries = engineerRows.map(r=>{
      const workerId = r.querySelector('.eng-name').value || null;
      const billingClassification = r.querySelector('.eng-billing').value || '';
      const salary = parseFloat(r.querySelector('.eng-salary').value) || 0;
      const hours = parseFloat(r.querySelector('.eng-hours').value) || 0;
      return { workerId, billingClassification, salary, hours };
    });
    const nonLaborEntries = Array.from(document.querySelectorAll('.nonlab-row')).map(r=>({ item: r.querySelector('.non-item').value, amount: parseFloat(r.querySelector('.non-amount').value)||0 }));
    return {
      id, date, proposalNumber, crmNumber, projectName, scopeDescription, location, remunerationModel,
      clientId, clientName: client.name || '', laborEntries, nonLaborEntries,
      status: (document.getElementById('pricing-id').value ? (pricings.find(p=>p.id===document.getElementById('pricing-id').value)||{}).status : 'Opened') || 'Opened'
    };
  }

  // Initialization and event wiring
  document.addEventListener('DOMContentLoaded', ()=>{
    const tableEl = document.getElementById('pricing-table'); if(tableEl) renderTable(pricings);
    updateBannerCounts();

    // Filters
    const fProposal = document.getElementById('filter-proposal');
    const fClient = document.getElementById('filter-client');
    const fStatus = document.getElementById('filter-status');
    const clearBtn = document.getElementById('clear-filters');

    function applyFilters(){
      let list = pricings.slice();
      if(fProposal && fProposal.value) list = list.filter(x=>x.proposalNumber && x.proposalNumber.toLowerCase().includes(fProposal.value.toLowerCase()));
      if(fClient && fClient.value) list = list.filter(x=>x.clientName && x.clientName.toLowerCase().includes(fClient.value.toLowerCase()));
      if(fStatus && fStatus.value) list = list.filter(x=>x.status === fStatus.value);
      renderTable(list);
    }
    [fProposal,fClient,fStatus].forEach(el=>{ if(el) el.addEventListener('input', applyFilters) });
    if(clearBtn) clearBtn.addEventListener('click', ()=>{ if(fProposal) fProposal.value=''; if(fClient) fClient.value=''; if(fStatus) fStatus.value=''; renderTable(pricings); });

    // Open create
    const openCreate = document.getElementById('open-create'); if(openCreate) openCreate.addEventListener('click', ()=>openModal());

    // Modal cancel
    const cancel = document.getElementById('cancel-modal'); if(cancel) cancel.addEventListener('click', ()=>closeModal());

  // Add engineer / non-labor
  const addEngBtn = document.getElementById('add-engineer'); if(addEngBtn) addEngBtn.addEventListener('click', ()=>{ addEngineerRow(); computeSummary(); });
  const addNonLabBtn = document.getElementById('add-nonlabor'); if(addNonLabBtn) addNonLabBtn.addEventListener('click', ()=>{ addNonLaborRow(); computeSummary(); });

    // Form submit
    const form = document.getElementById('pricing-form'); if(form) form.addEventListener('submit', (ev)=>{
      ev.preventDefault();
      const payload = collectForm();
      const existing = pricings.find(p=>p.id===payload.id);
      if(existing){
        pricings = pricings.map(p=> p.id===payload.id ? Object.assign({}, existing, payload) : p);
      } else {
        pricings.unshift(payload);
      }
      save(); renderTable(pricings); updateBannerCounts(); closeModal();
    });

    // Delegated edit/delete
    document.addEventListener('click', (e)=>{
      const edit = e.target.closest('.action-edit');
      const del = e.target.closest('.action-delete');
      if(edit){ openModal(edit.dataset.id); }
      if(del){ if(confirm('Delete this pricing?')){ pricings = pricings.filter(p=>p.id!==del.dataset.id); save(); renderTable(pricings); updateBannerCounts(); } }
    });

    // When client changes, show client crm in CRM field and optionally refresh client-specific rates
    const clientSel = document.getElementById('clientId'); if(clientSel) clientSel.addEventListener('change', ()=>{
      const c = (window.clients||[]).find(x=>x.id===clientSel.value) || {};
      const crmField = document.getElementById('crmNumber'); if(crmField) crmField.value = c.crm || '';
    });

    // wire compute summary when form inputs change (engineer hours or non-lab amounts)
    document.getElementById('modal')?.addEventListener('input', (e)=>{ if(e.target.classList.contains('eng-hours') || e.target.classList.contains('non-amount') ) computeSummary(); });
  });

})();