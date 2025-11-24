const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Configuración de la base de datos
const db = mysql.createConnection({
  host: 'pce-db-cluster.cd4sew6kqiry.us-east-2.rds.amazonaws.com',
  user: 'admin',
  password: 'ee#492Dfi$',
  database: 'pcedb'
});

db.connect((err) => {
  if (err) {
    console.error('Error conectando a MySQL:', err);
    return;
  }
  console.log('Conectado a MySQL');
});

// GET - Obtener todos los workers
app.get('/api/workers', (req, res) => {
  const query = 'SELECT * FROM workers ORDER BY id DESC';
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error al obtener workers:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// POST - Agregar un nuevo worker
app.post('/api/workers', (req, res) => {
  const {
  name, division, department, billingClassification, benefitType, payType, salary, location
  } = req.body;

  const query = `INSERT INTO workers 
    ( name, division, department, billing_classification, benefit_type, pay_type, salary, location) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

  const values = [name, division, department, billingClassification, benefitType, payType, salary, location];

  db.query(query, values, (err, results) => {
    if (err) {
      console.error('Error al agregar worker:', err);
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ message: 'Worker agregado exitosamente' }

    );
  });
});


app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});