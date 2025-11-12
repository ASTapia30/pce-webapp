// Simulated initial workers with the new schema
// Fields: employeeId, name, division, department, billingClassification, benefitType, payType, salary, location
window.initialWorkers = [
  {
    id: "w1",
    employeeId: "E001",
    name: "Carlos Perez",
    division: "Projects",
    department: "Projects",
    billingClassification: "Account Manager",
    benefitType: "Direct",
    payType: "ESS",
    salary: 45.5,
    location: "Madrid"
  },
  {
    id: "w2",
    employeeId: "E002",
    name: "Maria Lopez",
    division: "Consulting",
    department: "Automation",
    billingClassification: "Consulting Technical Professional",
    benefitType: "Contractor",
    payType: "EST",
    salary: 55.0,
    location: "Barcelona"
  },
  {
    id: "w3",
    employeeId: "E003",
    name: "Jorge Ruiz",
    division: "Projects",
    department: "Onshore",
    billingClassification: "Consulting Technical Professional",
    benefitType: "Temporary",
    payType: "NEE",
    salary: 38.75,
    location: "Valencia"
  },
  {
    id: "w4",
    employeeId: "E004",
    name: "Ana Gomez",
    division: "Consulting",
    department: "Automation",
    billingClassification: "Account Manager",
    benefitType: "Direct",
    payType: "ESS",
    salary: 48.0,
    location: "Sevilla"
  }
];

// Sample clients
window.clients = [
  { id: 'c1', name: 'Acme Corporation', crm: 'CRM-1001' },
  { id: 'c2', name: 'BlueWave Ltd', crm: 'CRM-2002' },
  { id: 'c3', name: 'Greenfield Partners', crm: 'CRM-3003' }
];

// Initial pricings (simulated)
// Fields: id, date, proposalNumber, scopeDescription, location, remunerationModel,
// clientId, clientName, crmNumber, status, assignedEngineers (array of worker ids), laborEntries, nonLaborEntries
window.initialPricings = [
  {
    id: 'p1',
    date: '2025-11-01',
    proposalNumber: 'PR-2025-001',
    scopeDescription: 'Automation platform deployment',
    location: 'Madrid',
    remunerationModel: 'Multiplier',
    clientId: 'c1',
    clientName: 'Acme Corporation',
    crmNumber: 'CRM-1001',
    status: 'Opened',
    assignedEngineers: ['w1','w2'],
    laborEntries: [ { department: 'Automation', manHours: 120 } ],
    nonLaborEntries: [ { item: 'Travel', amount: 2000 } ]
  },
  {
    id: 'p2',
    date: '2025-10-15',
    proposalNumber: 'PR-2025-002',
    scopeDescription: 'Onshore support for project X',
    location: 'Valencia',
    remunerationModel: 'Lump Sum',
    clientId: 'c2',
    clientName: 'BlueWave Ltd',
    crmNumber: 'CRM-2002',
    status: 'Awaiting Confirmation',
    assignedEngineers: ['w3'],
    laborEntries: [ { department: 'Projects', manHours: 80 } ],
    nonLaborEntries: [ { item: 'Materials', amount: 1500 } ]
  }
];