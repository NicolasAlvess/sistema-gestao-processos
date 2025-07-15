/*
 * ==========================================================================
 * FICHEIRO: services/documentGenerator.js (VERSÃO FINAL COMPLETA)
 * ==========================================================================
 * - Contém toda a lógica para gerar o PDF de múltiplas páginas, incluindo
 * a lógica condicional da Página 5 (Certidão).
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
handlebars.registerHelper('times', function(n, block) {
    let accum = '';
    for(let i = 0; i < n; ++i) { accum += block.fn({ ...this, index: i }); }
    return accum;
});
handlebars.registerHelper('add', function (value1, value2) { return value1 + value2; });


const generateReport = async (processId, templateId) => {
    console.log(`[SERVICE] Requisição recebida. ID: ${processId}, Template: "${templateId}"`);

    try {
        // Query SQL que busca todos os campos, incluindo a nova coluna 'defesa_apresentada'
        const query = `SELECT *, cpf_cnpj AS cpf FROM processes WHERE id = $1`;
        const { rows } = await db.query(query, [processId]);
        if (rows.length === 0) throw new Error(`Processo com ID ${processId} não encontrado.`);
        const processData = rows[0];

        // Lógica para carregar o logo
        let logoBase64 = '', hasLogo = false;
        try {
            const logoPath = path.join(__dirname, '..', 'assets', 'brasao.png');
            logoBase64 = (await fs.readFile(logoPath)).toString('base64');
            hasLogo = true;
        } catch (imgError) {
            console.error('[DEBUG] Logo não encontrado, PDF será gerado sem ele.');
        }

        // --- LÓGICA DE DATAS DINÂMICAS ---
        let termoAutuacaoDate = '[Data não definida]';
        let termoAberturaDateExtenso = '[Data não definida]';
        let dataCertidaoExtenso = '[Data não definida]';

        if (processData.notification1_sent_date) {
            const autuacaoDate = addDays(new Date(processData.notification1_sent_date), 1);
            termoAutuacaoDate = format(autuacaoDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR });
            
            const dia = autuacaoDate.getDate();
            const ano = autuacaoDate.getFullYear();
            const nomeMes = format(autuacaoDate, "MMMM", { locale: ptBR });
            termoAberturaDateExtenso = `Aos ${porExtenso.porExtenso(dia)} dias do mês de ${nomeMes} do ano de ${porExtenso.porExtenso(ano)}`;
        }
        
        // Lógica de data para a Página 4 e 5
        if (processData.initial_statement_deadline) {
            const certidaoDate = addDays(new Date(processData.initial_statement_deadline), 1);
            const dia = certidaoDate.getDate();
            const ano = certidaoDate.getFullYear();
            const nomeMes = format(certidaoDate, "MMMM", { locale: ptBR });
            dataCertidaoExtenso = `Aos ${porExtenso.porExtenso(dia)} dias do mês de ${nomeMes} do ano de ${porExtenso.porExtenso(ano)}`;
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
        
        // Objeto de dados completo para o template
        const dataForTemplate = {
            process: processData, // Contém o novo campo 'defesa_apresentada'
            termoAutuacaoDate,
            termoAberturaDateExtenso,
            juntadaDateExtenso: dataCertidaoExtenso, // A página 4 usa a mesma data da certidão
            dataCertidaoExtenso,
            logoBase64,
            hasLogo
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