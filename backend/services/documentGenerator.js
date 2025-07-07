/*
 * ==========================================================================
 * FICHEIRO: services/documentGenerator.js (VERSÃO FINAL COMPLETA)
 * ==========================================================================
 * - Usa um único arquivo de template por tipo de processo.
 * - Contém a lógica de data por extenso para a Página 3.
 */
const puppeteer = require('puppeteer');
const handlebars = require('handlebars');
const fs = require('fs/promises');
const path = require('path');
const { format, addDays } = require('date-fns');
const { ptBR } = require('date-fns/locale');
const porExtenso = require('numero-por-extenso');
const db = require('../db');

// --- Helpers do Handlebars ---
handlebars.registerHelper('times', function (n, block) { let accum = ''; for (let i = 0; i < n; ++i) { accum += block.fn({ ...this, index: i }); } return accum; });
handlebars.registerHelper('add', function (value1, value2) { return value1 + value2; });


const generateReport = async (processId, templateId) => {
    console.log(`[SERVICE] Requisição recebida. ID: ${processId}, Template: "${templateId}"`);

    try {
        const query = `SELECT *, cpf_cnpj AS cpf FROM processes WHERE id = $1`;
        const { rows } = await db.query(query, [processId]);
        if (rows.length === 0) throw new Error(`Processo com ID ${processId} não encontrado.`);
        const processData = rows[0];

        let logoBase64 = '', hasLogo = false;
        try {
            const logoPath = path.join(__dirname, '..', 'assets', 'brasao.png');
            logoBase64 = (await fs.readFile(logoPath)).toString('base64');
            hasLogo = true;
        } catch (imgError) { console.error('[DEBUG] Logo não encontrado.'); }

        // Lógica para calcular as datas dinâmicas
        let termoAutuacaoDate = '[Data de Autuação não definida]';
        let termoAberturaDateExtenso = '[Data de Abertura não definida]';

        if (processData.notification1_sent_date) {
            const notificationDate = new Date(processData.notification1_sent_date);
            const autuacaoDate = addDays(notificationDate, 1);

            termoAutuacaoDate = format(autuacaoDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR });

            const dia = autuacaoDate.getDate();
            const ano = autuacaoDate.getFullYear();
            const nomeMes = format(autuacaoDate, "MMMM", { locale: ptBR });
            termoAberturaDateExtenso = `Aos ${porExtenso.porExtenso(dia)} dias do mês de ${nomeMes} do ano de ${porExtenso.porExtenso(ano)}`;
        }

        // Lógica de seleção de template
        let templatePath;
        if (templateId === 'paccr') {
            templatePath = path.join(__dirname, '..', 'templates', 'paccr', 'relatorio_paccr.hbs');
        } else {
            throw new Error(`Template desconhecido: "${templateId}"`);
        }

        const templateHtml = await fs.readFile(templatePath, 'utf-8');
        const template = handlebars.compile(templateHtml);

        const dataForTemplate = {
            process: processData,
            termoAutuacaoDate: termoAutuacaoDate,
            termoAberturaDateExtenso: termoAberturaDateExtenso,
            logoBase64: logoBase64,
            hasLogo: hasLogo
        };

        const finalHtml = template(dataForTemplate);

        const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(finalHtml, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '0', right: '0', bottom: '0', left: '0' } });
        await browser.close();
        return pdfBuffer;

    } catch (error) {
        console.error(`[SERVICE] Erro fatal durante a geração do relatório:`, error);
        throw error;
    }
};

module.exports = { generateReport };