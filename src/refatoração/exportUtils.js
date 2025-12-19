// src/utils/exportUtils.js

export const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) return alert("Nada para exportar.");
    
    // Garantir que todos os objetos tenham as mesmas chaves para o cabeçalho
    const allKeys = new Set();
    data.forEach(row => Object.keys(row).forEach(key => allKeys.add(key)));
    const headers = Array.from(allKeys);

    const csvContent = [
        headers.join(';'),
        ...data.map(row => headers.map(header => {
            const val = row[header] ?? '';
            // Escapar aspas duplas e envolver o valor em aspas
            return `"${String(val).replace(/"/g, '""')}"`;
        }).join(';'))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const exportToExcelXml = (sheets, filename) => {
    if (!Array.isArray(sheets) || sheets.length === 0) return alert("Nada para exportar.");

    const xmlEscape = (value) =>
        String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&apos;");

    const sanitizeSheetName = (name) =>
        String(name || "Planilha")
            .slice(0, 31)
            .replace(/[\[\]\*\/\\\?\:]/g, " ")
            .trim() || "Planilha";

    const cellXml = (value, styleId) => {
        if (value === null || value === undefined || value === "") {
            return styleId
                ? `<Cell ss:StyleID="${styleId}"><Data ss:Type="String"></Data></Cell>`
                : `<Cell><Data ss:Type="String"></Data></Cell>`;
        }
        const isNumber = typeof value === "number" && Number.isFinite(value);
        const type = isNumber ? "Number" : "String";
        const cellOpen = styleId ? `<Cell ss:StyleID="${styleId}">` : `<Cell>`;
        return `${cellOpen}<Data ss:Type="${type}">${xmlEscape(isNumber ? String(value) : String(value))}</Data></Cell>`;
    };

    const tableXml = (rows) => {
        const safeRows = Array.isArray(rows) ? rows : [];
        const headers = [];

        safeRows.forEach((row) => {
            Object.keys(row || {}).forEach((key) => {
                if (!headers.includes(key)) headers.push(key);
            });
        });

        const headerRow = `<Row>${headers.map((h) => cellXml(h)).join("")}</Row>`;
        const dataRows = safeRows
            .map((row) => {
                const cells = headers.map((h) => {
                    const v = row?.[h] ?? "";
                    // Exemplo de formatação específica para Espessura (mm)
                    const styleId = h === "Espessura (mm)" && typeof v === "number" ? "sDecimal2" : undefined;
                    return cellXml(v, styleId);
                });
                return `<Row>${cells.join("")}</Row>`;
            })
            .join("");

        return `<Table>${headerRow}${dataRows}</Table>`;
    };

    const workbookXml =
        `<?xml version="1.0"?>` +
        `<?mso-application progid="Excel.Sheet"?>` +
        `<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:html="http://www.w3.org/TR/REC-html40">` +
        `<Styles><Style ss:ID="sDecimal2"><NumberFormat ss:Format="0.00"/></Style></Styles>` +
        sheets
            .map((sheet) => {
                const name = sanitizeSheetName(sheet?.name);
                return `<Worksheet ss:Name="${xmlEscape(name)}">${tableXml(sheet?.rows || [])}</Worksheet>`;
            })
            .join("") +
        `</Workbook>`;

    const blob = new Blob([workbookXml], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const handleGeneratePDF = (title, data) => {
    const printWindow = window.open('', '', 'height=600,width=800');
    if (!printWindow) return alert("Pop-up bloqueado! Permita pop-ups.");
    const htmlContent = `<html><head><title>${title}</title><style>body{font-family:Arial;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f2f2f2}.right{text-align:right}</style></head><body><h2>${title}</h2><p>Emissão: ${new Date().toLocaleString()}</p><table><thead><tr><th>Código</th><th>Descrição</th><th class="right">Qtd/Detalhe</th></tr></thead><tbody>${data.map(i => `<tr><td>${i.code}</td><td>${i.name}</td><td class="right">${i.count}</td></tr>`).join('')}</tbody></table></body></html>`;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
};
