const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

function validarCPF(cpf) {
    cpf = cpf.replace(/[^\d]+/g, '');
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

    let soma = 0, resto;
    for (let i = 1; i <= 9; i++) soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.substring(9, 10))) return false;

    soma = 0;
    for (let i = 1; i <= 10; i++) soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.substring(10, 11))) return false;

    return true;
}

app.post('/clientes', async (req, res) => {
  const { nome, cpf, mesa } = req.body;

  if (!validarCPF(cpf)) {
    return res.status(400).json({ sucesso: false, erro: "CPF inválido" });
  }

  try {
    const resultado = await pool.query(
      'INSERT INTO clientes (nome, cpf, mesa) VALUES ($1, $2, $3) RETURNING id',
      [nome, cpf, mesa]
    );
    res.json({ sucesso: true, id: resultado.rows[0].id });
  } catch (erro) {
    res.status(500).json({ sucesso: false, erro: erro.message });
  }
});

app.post('/login-administrativo', async (req, res) => {
  const { email, senha, cargo } = req.body;
  try {
    const resultado = await pool.query('SELECT * FROM funcionarios WHERE email = $1', [email]);
    if (resultado.rows.length === 0) {
      return res.status(401).json({ sucesso: false, erro: "Email não encontrado" });
    }
    const funcionario = resultado.rows[0];
    if (funcionario.senha !== senha) {
      return res.status(401).json({ sucesso: false, erro: "Senha incorreta" });
    }
    if (funcionario.cargo !== cargo) {
      return res.status(401).json({ sucesso: false, erro: "Cargo não confere com o cadastro" });
    }
    res.json({ sucesso: true, nome: funcionario.nome, cargo: funcionario.cargo });
  } catch (erro) {
    res.status(500).json({ sucesso: false, erro: erro.message });
  }
});

app.post('/pedidos', async (req, res) => {
  const { clienteId, itens, subtotal, taxaServico, total } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const pedidoResult = await client.query(
      `INSERT INTO pedidos (id_cliente, status, subtotal, taxa_servico, total, tempo_estimado_min, tempo_estimado_max)
       VALUES ($1, 'recebido', $2, $3, $4, 34, 44) RETURNING id`,
      [clienteId, subtotal, taxaServico, total]
    );
    const pedidoId = pedidoResult.rows[0].id;

    for (const item of itens) {
      await client.query(
        'INSERT INTO itens_pedido (id_pedido, id_produto, quantidade, preco_unitario) VALUES ($1,$2,$3,$4)',
        [pedidoId, item.id, item.quantidade, item.preco]
      );
    }

    await client.query(
      "INSERT INTO historico_status_pedido (id_pedido, status) VALUES ($1, 'recebido')",
      [pedidoId]
    );

    await client.query('COMMIT');
    res.json({ sucesso: true, pedidoId: pedidoId });
  } catch (erro) {
    await client.query('ROLLBACK');
    res.status(500).json({ sucesso: false, erro: erro.message });
  } finally {
    client.release();
  }
});

app.get('/pedidos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const pedido = await pool.query('SELECT * FROM pedidos WHERE id = $1', [id]);
    if (pedido.rows.length === 0) {
      return res.status(404).json({ sucesso: false, erro: "Pedido não encontrado" });
    }
    res.json({ sucesso: true, pedido: pedido.rows[0] });
  } catch (erro) {
    res.status(500).json({ sucesso: false, erro: erro.message });
  }
});

app.get('/clientes/:id/historico', async (req, res) => {
  const { id } = req.params;
  try {
    const pedidos = await pool.query(
      `SELECT p.id, p.data_pedido, p.status, p.total, a.nota
       FROM pedidos p
       LEFT JOIN avaliacoes a ON a.id_pedido = p.id
       WHERE p.id_cliente = $1
       ORDER BY p.data_pedido DESC`,
      [id]
    );

    const resultado = [];
    for (const pedido of pedidos.rows) {
      const itens = await pool.query(
        `SELECT pr.nome, ip.quantidade, ip.preco_unitario
         FROM itens_pedido ip
         JOIN produtos pr ON pr.id = ip.id_produto
         WHERE ip.id_pedido = $1`,
        [pedido.id]
      );
      resultado.push({ ...pedido, itens: itens.rows });
    }

    res.json({ sucesso: true, pedidos: resultado });
  } catch (erro) {
    res.status(500).json({ sucesso: false, erro: erro.message });
  }
});

app.listen(3000, () => {
  console.log('Servidor rodando na porta 3000');
});