import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function usiminasEdiProxy() {
  return {
    name: 'usiminas-edi-proxy',
    configureServer(server) {
      server.middlewares.use('/api/usiminas-edi', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Método não permitido' }));
          return;
        }

        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const params = JSON.parse(body);
            const { login, senha, tipoArquivo = 'XML', dataInicial = '', dataFinal = '', pedidos = '' } = params;

            if (!login || !senha) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Login e senha são obrigatórios.' }));
              return;
            }

            const esc = (s) => String(s || '')
              .replace(/&/g, '&amp;').replace(/</g, '&lt;')
              .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

            const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:web="http://webedi.sistemausiminas.com.br">
  <soapenv:Header/>
  <soapenv:Body>
    <web:transmiteArquivo>
      <login>${esc(login)}</login>
      <senha>${esc(senha)}</senha>
      <tipoDocumento>OV</tipoDocumento>
      <tipoArquivo>${esc(tipoArquivo)}</tipoArquivo>
      <dataProcessamento></dataProcessamento>
      <dataInicial>${esc(dataInicial)}</dataInicial>
      <dataFinal>${esc(dataFinal)}</dataFinal>
      <pedidos>${esc(pedidos)}</pedidos>
      <volumeProduto></volumeProduto>
    </web:transmiteArquivo>
  </soapenv:Body>
</soapenv:Envelope>`;

            const response = await fetch('https://cvwe.usiminas.com/EDIService.svc/soap', {
              method: 'POST',
              headers: {
                'Content-Type': 'text/xml; charset=utf-8',
                'SOAPAction': 'http://webedi.sistemausiminas.com.br/IEDIService/transmiteArquivo',
              },
              body: soapEnvelope,
            });

            if (!response.ok) {
              const errText = await response.text();
              res.statusCode = response.status;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: `Erro Usiminas (HTTP ${response.status})`, detail: errText.substring(0, 500) }));
              return;
            }

            const xmlResponse = await response.text();
            const resultMatch = xmlResponse.match(/<transmiteArquivoRe(?:sult|turn)[^>]*>([\s\S]*?)<\/transmiteArquivoRe(?:sult|turn)>/);

            if (!resultMatch) {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ raw: xmlResponse, content: '', tipoArquivo, message: 'Nenhum dado retornado.' }));
              return;
            }

            let content = resultMatch[1]
              .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
              .replace(/&amp;/g, '&').replace(/&quot;/g, '"')
              .replace(/&#xD;/g, '\r').replace(/&#xA;/g, '\n');

            const cdataMatch = content.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
            if (cdataMatch) content = cdataMatch[1];

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ content: content.trim(), tipoArquivo, timestamp: new Date().toISOString() }));
          } catch (err) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Falha na comunicação com Usiminas.', detail: err.message }));
          }
        });
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), usiminasEdiProxy()],
})
