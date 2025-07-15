const fs = require('fs-extra');
const path = require('path');
const MarkdownIt = require('markdown-it');
const ejs = require('ejs');
const puppeteer = require('puppeteer');
const matter = require('gray-matter');

const md = new MarkdownIt();

const buildResume = async (fileName, templateName) => {
  try {
    console.log('[START] Building resume...');

    // 1. define the paths
    const mdPath = path.join(__dirname, 'content', `${fileName}.md`);
    const templatePath = path.join(__dirname, 'templates', templateName);
    const cssPath = path.join(__dirname, 'templates', 'styles.css');
    const outputDir = path.join(__dirname, 'output');
    const outputHtmlPath = path.join(__dirname, 'output', `${fileName}.html`);
    const outputPdfPath = path.join(__dirname, 'output', `${fileName}.pdf`);

    // 1.read and parse the markdown file
    const mdFile = await fs.readFile(mdPath, 'utf-8');
    const { data, content } = matter(mdFile);

    // 2. render the markdown to html
    const htmlContent = md.render(content);

    // 3. change the template to the markdown content
    const template = await fs.readFile(templatePath, 'utf-8');
    const renderedTemplate = ejs.render(template, {
      ...data, // front matter data
      content: htmlContent, // markdown content
    });

    // copy CSS file to output directory
    const outputCssPath = path.join(outputDir, 'styles.css');
    await fs.copyFile(cssPath, outputCssPath);

    // ensure the output directory exists, if not, create it
    await fs.ensureDir(outputDir);

    // 4. write the rendered template to a file
    await fs.writeFile(outputHtmlPath, renderedTemplate, 'utf-8');

    // 5. use puppeteer to generate a pdf file
    const browser = await puppeteer.launch(); // launch a browser
    const page = await browser.newPage(); // create a new page
    await page.goto(`file://${outputHtmlPath}`, { waitUntil: 'networkidle0' }); // navigate to the html file, wait until the network is idle

    // 6. generate a pdf file
    await page.pdf({
      path: outputPdfPath,
      format: 'A4',
      printBackground: true,
    });
    await browser.close();

    console.log('[SUCCESS] PDF file generated successfully');
  } catch (error) {
    console.error('[ERROR] Failed to build resume', error);
  }
};

const main = async () => {
  const inputFile = process.argv[2] || 'resume.md';
  const fileName = inputFile.split('.')[0];
  const inputPath = path.join(__dirname, 'content', inputFile);

  if (!fs.existsSync(inputPath)) {
    console.error('[ERROR] Input file not found');
    process.exit(1);
  }

  try {
    await buildResume(fileName, 'resume.ejs');
  } catch (error) {
    console.error('[ERROR] Failed to build resume', error);
  }
};

main();
