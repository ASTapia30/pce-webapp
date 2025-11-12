/* workers.js: client logic for rendering, filtering and CRUD using localStorage.
   It consumes `window.initialWorkers` defined in `data.js`.
*/

(function(){
  const STORAGE_KEY = "pce_workers_v1";
  const tableBody = () => document.querySelector("#workers-table tbody");
  const getData = () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw) return JSON.parse(raw);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(window.initialWorkers || []));
    return window.initialWorkers || [];
  };
  let workers = getData();

  // Helpers
  const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(workers));
  const uid = () => 'w'+Date.now().toString(36).slice(-6);

  function renderTable(list){
    const tbody = tableBody();
    tbody.innerHTML = "";
    list.forEach(w=>{
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${w.employeeId || ''}</td>
        <td>${w.name || ''}</td>
        <td>${w.division || ''}</td>
        <td>${w.department || ''}</td>
        <td>${w.billingClassification || ''}</td>
        <td>${w.benefitType || ''}</td>
        <td>${w.payType || ''}</td>
        <td>${Number(w.salary || 0).toFixed(2)}</td>
        <td>${w.location || ''}</td>
        <td>
          <button class="action-btn action-edit" data-id="${w.id}">Edit</button>
          <button class="action-btn action-delete" data-id="${w.id}">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Initial render (if table exists)
  document.addEventListener("DOMContentLoaded", ()=>{
    const tb = document.querySelector("#workers-table");
    if(tb) renderTable(workers);

    // Filters (new fields)
    const fEmpId = document.getElementById("filter-employeeId");
    const fName = document.getElementById("filter-name");
    const fDivision = document.getElementById("filter-division");
    const fDepartment = document.getElementById("filter-department");
    const fBilling = document.getElementById("filter-billing");
    const fPayType = document.getElementById("filter-paytype");
    const fLocation = document.getElementById("filter-location");
    const clearBtn = document.getElementById("clear-filters");

    function applyFilters(){
      let list = workers.slice();
      if(fEmpId && fEmpId.value) list = list.filter(x=>x.employeeId && x.employeeId.toLowerCase().includes(fEmpId.value.toLowerCase()));
      if(fName && fName.value) list = list.filter(x=>x.name && x.name.toLowerCase().includes(fName.value.toLowerCase()));
      if(fDivision && fDivision.value) list = list.filter(x=>x.division === fDivision.value);
      if(fDepartment && fDepartment.value) list = list.filter(x=>x.department === fDepartment.value);
      if(fBilling && fBilling.value) list = list.filter(x=>x.billingClassification === fBilling.value);
      if(fPayType && fPayType.value) list = list.filter(x=>x.payType === fPayType.value);
      if(fLocation && fLocation.value) list = list.filter(x=>x.location && x.location.toLowerCase().includes(fLocation.value.toLowerCase()));
      renderTable(list);
    }

    [fEmpId,fName,fDivision,fDepartment,fBilling,fPayType,fLocation].forEach(el=>{ if(el) el.addEventListener("input", applyFilters) });
    if(clearBtn) clearBtn.addEventListener("click", ()=>{
      [fEmpId,fName,fDivision,fDepartment,fBilling,fPayType,fLocation].forEach(el=>{ if(el) el.value = "" });
      renderTable(workers);
    });

    // Modal controls
    const modal = document.getElementById("modal");
    const openCreate = document.getElementById("open-create") || document.getElementById("quick-add");
    const triggerAdd = document.getElementById("trigger-add") || document.getElementById("s3-trigger");
    const form = document.getElementById("worker-form");
    const cancel = document.getElementById("cancel-modal");
    const modalTitle = document.getElementById("modal-title");

    function openModal(editId){
      modal.classList.remove("hidden");
      if(editId){
        modalTitle.textContent = "Edit Worker";
        const w = workers.find(x=>x.id===editId);
        document.getElementById("worker-id").value = w.id;
        document.getElementById("employeeId").value = w.employeeId || '';
        document.getElementById("name").value = w.name || '';
        document.getElementById("division").value = w.division || '';
        document.getElementById("department").value = w.department || '';
        document.getElementById("billingClassification").value = w.billingClassification || '';
        document.getElementById("benefitType").value = w.benefitType || '';
        document.getElementById("payType").value = w.payType || '';
        document.getElementById("salary").value = w.salary || '';
        document.getElementById("location").value = w.location || '';
      } else {
        modalTitle.textContent = "Create Worker";
        form.reset();
        document.getElementById("worker-id").value = "";
      }
    }
    function closeModal(){ modal.classList.add("hidden"); }

    if(openCreate) openCreate.addEventListener("click", ()=>openModal());
    if(triggerAdd) triggerAdd.addEventListener("click", ()=>{
      // Placeholder para trigger S3+Lambda — se configura después
      console.log("Trigger agregar invocado (pendiente integrar S3+Lambda).");
      openModal();
    });
    if(cancel) cancel.addEventListener("click", closeModal);

    // Submit form: create or update
    if(form) form.addEventListener("submit", (ev)=>{
      ev.preventDefault();
      const id = document.getElementById("worker-id").value;
      const payload = {
        id: id || uid(),
        employeeId: document.getElementById("employeeId").value.trim(),
        name: document.getElementById("name").value.trim(),
        division: document.getElementById("division").value,
        department: document.getElementById("department").value,
        billingClassification: document.getElementById("billingClassification").value,
        benefitType: document.getElementById("benefitType").value,
        payType: document.getElementById("payType").value,
        salary: parseFloat(document.getElementById("salary").value) || 0,
        location: document.getElementById("location").value.trim()
      };
      if(id){
        // update
        workers = workers.map(w=> w.id===id ? payload : w);
      } else {
        // create
        workers.unshift(payload);
        // Placeholder: here you can trigger S3+Lambda integration later
      }
      save();
      renderTable(workers);
      closeModal();
    });

    // Delegated actions (editar/eliminar)
    document.addEventListener("click", (e)=>{
      const edit = e.target.closest(".action-edit");
      const del = e.target.closest(".action-delete");
      if(edit){
        const id = edit.dataset.id;
        openModal(id);
      }
      if(del){
        const id = del.dataset.id;
        if(confirm("Delete this worker?")) {
          workers = workers.filter(w=>w.id!==id);
          save();
          renderTable(workers);
        }
      }
    });

    // Global search on index (if present)
    const globalSearch = document.getElementById("global-search");
    if(globalSearch) {
      globalSearch.addEventListener("input", ()=>{
        const q = globalSearch.value.trim().toLowerCase();
        if(!q){ renderTable(workers); return; }
        const list = workers.filter(w => {
          return [w.employeeId,w.name,w.division,w.department,w.billingClassification,w.benefitType,w.payType,w.location].join(" ").toLowerCase().includes(q);
        });
        renderTable(list);
      });
    }
  });
})();