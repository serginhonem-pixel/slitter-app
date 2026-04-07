/**
 * Vercel Serverless Function — Proxy para o WebService SOAP da Usiminas.
 *
 * Endpoint: POST /api/usiminas-edi
 *
 * Body JSON:
 *   { login, senha, tipoArquivo, dataInicial, dataFinal, pedidos }
 *
 * Retorna o conteúdo do EDI (TXT ou XML) diretamente.
 */

export default async function handler(req, res) {
  // Apenas POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido. Use POST." });
  }

  const {
    login,
    senha,
    tipoArquivo = "XML",
    dataInicial = "",
    dataFinal = "",
    pedidos = "",
  } = req.body || {};

  if (!login || !senha) {
    return res.status(400).json({ error: "Login e senha são obrigatórios." });
  }

  // Sanitizar inputs para evitar injeção no XML
  const esc = (s) => String(s || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

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

  try {
    const response = await fetch("https://cvwe.usiminas.com/EDIService.svc/soap", {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "SOAPAction": "http://webedi.sistemausiminas.com.br/IEDIService/transmiteArquivo",
      },
      body: soapEnvelope,
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({
        error: `Erro Usiminas (HTTP ${response.status})`,
        detail: errText.substring(0, 500),
      });
    }

    const xmlResponse = await response.text();

    // Extrair o conteúdo retornado de dentro do SOAP envelope
    // O resultado vem dentro de <transmiteArquivoResult>...</transmiteArquivoResult>
    const resultMatch = xmlResponse.match(
      /<transmiteArquivoRe(?:sult|turn)[^>]*>([\s\S]*?)<\/transmiteArquivoRe(?:sult|turn)>/
    );

    if (!resultMatch) {
      // Pode ter retornado erro ou resultado vazio
      return res.status(200).json({
        raw: xmlResponse,
        content: "",
        tipoArquivo,
        message: "Nenhum dado retornado pelo WebService.",
      });
    }

    // O conteúdo pode estar em CDATA ou escaped HTML entities
    let content = resultMatch[1];
    // Decode HTML entities
    content = content
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&").replace(/&quot;/g, '"')
      .replace(/&#xD;/g, "\r").replace(/&#xA;/g, "\n");

    // Remover CDATA wrapper se presente
    const cdataMatch = content.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
    if (cdataMatch) content = cdataMatch[1];

    return res.status(200).json({
      content: content.trim(),
      tipoArquivo,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({
      error: "Falha na comunicação com o WebService Usiminas.",
      detail: err.message,
    });
  }
}
