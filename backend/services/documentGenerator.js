const puppeteer = require('puppeteer');
const handlebars = require('handlebars');
const fs = require('fs/promises');
const path = require('path');
const db = require('../db');

// Register Handlebars helpers
handlebars.registerHelper('times', function (n, options) {
    let result = '';
    for (let i = 0; i < n; i++) {
        result += options.fn({
            index: i,
            count: i + 1
        });
    }
    return result;
});

handlebars.registerHelper('add', function (a, b) {
    return Number(a) + Number(b);
});

const generateReport = async (processId, templateId) => {
    console.log(`[REPORT] Starting report generation for process ${processId}`);

    try {
        // 1. Get process data
        const { rows } = await db.query('SELECT * FROM processes WHERE id = $1', [processId]);
        if (rows.length === 0) throw new Error(`Process ${processId} not found`);
        const processData = rows[0];

        // 2. Set up paths
        const templatesDir = path.join(__dirname, '..', 'templates');
        const assetsDir = path.join(__dirname, '..', 'assets');
        const templatePath = path.join(templatesDir, 'PACCR', 'capa.hbs');
        const logoPath = path.join(assetsDir, 'brasao.png');

        console.log(`[DEBUG] Logo path: ${logoPath}`);

        // 3. Load and convert logo to base64
        let logoBase64 = '';
        try {
            const logoFile = await fs.readFile(logoPath);
            logoBase64 = logoFile.toString('base64');
            console.log('[REPORT] Logo loaded successfully');
        } catch (error) {
            console.error('[WARNING] Could not load logo:', error.message);
        }

        // 4. Compile template
        const templateContent = await fs.readFile(templatePath, 'utf-8');
        const template = handlebars.compile(templateContent);

        const html = template({
            process: processData,
            logoBase64: logoBase64,
            hasLogo: !!logoBase64,
            formatDate: (date) => date ? new Date(date).toLocaleDateString('pt-BR') : ''
        });

        // 5. Generate PDF
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();

        await page.setContent(html, {
            waitUntil: 'networkidle0',
            timeout: 30000
        });

        const pdfOptions = {
            format: 'A4',
            printBackground: true,
            margin: {
                top: '2cm',
                right: '2cm',
                bottom: '2cm',
                left: '2cm'
            }
        };

        const pdfBuffer = await page.pdf(pdfOptions);
        await browser.close();

        console.log('[REPORT] PDF generated successfully');
        return pdfBuffer;

    } catch (error) {
        console.error('[ERROR] Report generation failed:', error);
        throw new Error(`Failed to generate report: ${error.message}`);
    }
};

module.exports = {
    generateReport
};