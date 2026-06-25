function stripDiacritics(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function sanitizePdfText(value) {
  return stripDiacritics(value)
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapePdfText(value) {
  return sanitizePdfText(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function parseAmount(value) {
  const amount = Number(String(value || '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(amount) ? amount : 0;
}

function formatFCFA(amount) {
  return `${new Intl.NumberFormat('fr-FR').format(parseAmount(amount))} FCFA`;
}

function extractProjectMetadata(project) {
  const description = project?.description || '';
  const roomMatch = description.match(/Type de pièce\s*:\s*(.+)/i);
  const budgetMatch = description.match(/Estimation budget\s*:\s*(.+)/i);

  return {
    roomType: roomMatch?.[1]?.trim() || 'Non renseigne',
    budget: budgetMatch?.[1]?.trim() || '',
  };
}

function getProjectReference(project) {
  return project?._id ? String(project._id).slice(-8).toUpperCase() : 'ARCHI';
}

function wrapText(value, maxLength = 54) {
  const words = sanitizePdfText(value).split(' ').filter(Boolean);
  const lines = [];
  let line = '';

  words.forEach((word) => {
    const nextLine = line ? `${line} ${word}` : word;
    if (nextLine.length > maxLength && line) {
      lines.push(line);
      line = word;
    } else {
      line = nextLine;
    }
  });

  if (line) lines.push(line);
  return lines.length > 0 ? lines : ['-'];
}

function textCommand(text, x, y, size = 10, font = 'F1') {
  return `BT /${font} ${size} Tf ${x} ${y} Td (${escapePdfText(text)}) Tj ET`;
}

function getImageUrl(image) {
  if (!image) return '';
  if (typeof image === 'string') return image;

  return image.secure_url || image.url || '';
}

function getProductImageUrl(product) {
  const images = Array.isArray(product?.images)
    ? product.images.map(getImageUrl).filter(Boolean)
    : [];

  if (images.length > 0) return images[0];
  return getImageUrl(product?.image);
}

function lineCommand(x1, y1, x2, y2) {
  return `${x1} ${y1} m ${x2} ${y2} l S`;
}

function rectCommand(x, y, width, height) {
  return `${x} ${y} ${width} ${height} re S`;
}

function fillRectCommand(x, y, width, height, color = '0.94 0.98 1') {
  return `q ${color} rg ${x} ${y} ${width} ${height} re f Q`;
}

function buildPageContent({ project, user, products, pageProducts, pageIndex, pageCount, totals, exportUrl }) {
  const metadata = extractProjectMetadata(project);
  const generatedAt = new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date());
  const links = [];
  const commands = [
    '0.07 0.14 0.24 RG',
    textCommand('ARCHIPRICE', 48, 792, 10, 'F2'),
    textCommand('Recapitulatif', 48, 760, 24, 'F2'),
    textCommand(`Projet #${getProjectReference(project)} - Genere le ${generatedAt}`, 48, 740, 9),
    lineCommand(48, 724, 547, 724),
    fillRectCommand(48, 650, 499, 56, '0.97 0.99 1'),
    rectCommand(48, 650, 499, 56),
    textCommand('Projet', 64, 686, 8, 'F2'),
    textCommand(project?.name || '-', 64, 668, 12, 'F2'),
    textCommand('Type de piece', 230, 686, 8, 'F2'),
    textCommand(metadata.roomType, 230, 668, 11),
    textCommand('Budget cible', 382, 686, 8, 'F2'),
    textCommand(metadata.budget ? formatFCFA(metadata.budget) : 'Non renseigne', 382, 668, 11, 'F2'),
    textCommand('Utilisateur', 48, 620, 9, 'F2'),
    textCommand(user?.name || user?.email || 'Utilisateur', 48, 604, 10),
    textCommand('Articles', 230, 620, 9, 'F2'),
    textCommand(String(products.length), 230, 604, 10),
    textCommand('Total estime', 382, 620, 9, 'F2'),
    textCommand(formatFCFA(totals.total), 382, 604, 12, 'F2'),
    textCommand('Articles selectionnes', 48, 560, 14, 'F2'),
    fillRectCommand(48, 532, 499, 24, '0.93 0.95 0.98'),
    textCommand('Article', 60, 540, 8, 'F2'),
    textCommand('Categorie', 270, 540, 8, 'F2'),
    textCommand('Prix unitaire', 390, 540, 8, 'F2'),
    textCommand('Document', 492, 540, 8, 'F2'),
  ];

  let y = 510;
  pageProducts.forEach((product) => {
    const nameLines = wrapText(product.name || 'Article sans nom', 38).slice(0, 2);
    const rowHeight = nameLines.length > 1 ? 34 : 24;
    commands.push(lineCommand(48, y + 12, 547, y + 12));
    nameLines.forEach((line, index) => {
      commands.push(textCommand(line, 60, y - index * 11, 9));
    });
    commands.push(textCommand(product.category || 'Non renseigne', 270, y, 9));
    commands.push(textCommand(formatFCFA(product.unitPrice), 390, y, 9, 'F2'));
    if (exportUrl) {
      commands.push('0.1 0.3 0.8 RG');
      commands.push(textCommand('Voir fiche', 495, y, 8));
      commands.push('0.07 0.14 0.24 RG');
      links.push({
        url: exportUrl,
        rect: [493, y - 3, 546, y + 10],
      });
    } else {
      commands.push(textCommand('-', 505, y, 9));
    }
    y -= rowHeight;
  });

  if (pageIndex === pageCount - 1) {
    const overage = Math.max(totals.total - totals.budget, 0);
    commands.push(fillRectCommand(48, 88, 499, 62, overage > 0 ? '1 0.94 0.94' : '0.92 0.99 0.95'));
    commands.push(rectCommand(48, 88, 499, 62));
    commands.push(textCommand('Synthese budget', 64, 126, 10, 'F2'));
    commands.push(textCommand(`Estimation totale : ${formatFCFA(totals.total)}`, 64, 108, 12, 'F2'));
    commands.push(textCommand(`Depassement : ${overage > 0 ? formatFCFA(overage) : 'Aucun'}`, 320, 108, 11, 'F2'));
  }

  commands.push(textCommand(`Page ${pageIndex + 1}/${pageCount}`, 500, 38, 8));
  return {
    content: commands.join('\n'),
    links,
  };
}

function chunkProducts(products, size = 12) {
  const chunks = [];
  for (let index = 0; index < products.length; index += size) {
    chunks.push(products.slice(index, index + size));
  }
  return chunks.length > 0 ? chunks : [[]];
}

function buildPdf(objects) {
  const header = '%PDF-1.4\n';
  const parts = [header];
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets[index + 1] = Buffer.byteLength(parts.join(''), 'binary');
    parts.push(`${index + 1} 0 obj\n${object}\nendobj\n`);
  });

  const xrefOffset = Buffer.byteLength(parts.join(''), 'binary');
  const xref = [
    'xref',
    `0 ${objects.length + 1}`,
    '0000000000 65535 f ',
    ...offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n `),
    'trailer',
    `<< /Size ${objects.length + 1} /Root 1 0 R >>`,
    'startxref',
    String(xrefOffset),
    '%%EOF',
  ].join('\n');

  parts.push(xref);
  return Buffer.from(parts.join(''), 'binary');
}

function generateProjectRecapPdf({ project, products, user, exportUrl = '' }) {
  const normalizedProducts = products.map((product) => ({
    name: product.name,
    category: product.category,
    unitPrice: parseAmount(product.unitPrice),
    imageUrl: getProductImageUrl(product),
  }));
  const metadata = extractProjectMetadata(project);
  const totals = {
    total: normalizedProducts.reduce((sum, product) => sum + product.unitPrice, 0),
    budget: parseAmount(metadata.budget),
  };
  const chunks = chunkProducts(normalizedProducts);
  const pages = chunks.map((pageProducts, index) => buildPageContent({
      project,
      user,
      products: normalizedProducts,
      pageProducts,
      pageIndex: index,
      pageCount: chunks.length,
      totals,
      exportUrl,
    }));
  let nextObjectNumber = 3;
  const pageRefs = pages.map((page) => {
    const pageObjectNumber = nextObjectNumber;
    nextObjectNumber += 1;
    const streamObjectNumber = nextObjectNumber;
    nextObjectNumber += 1;
    const annotationObjectNumbers = page.links.map(() => {
      const objectNumber = nextObjectNumber;
      nextObjectNumber += 1;
      return objectNumber;
    });

    return {
      pageObjectNumber,
      streamObjectNumber,
      annotationObjectNumbers,
    };
  });
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${pageRefs.map((page) => `${page.pageObjectNumber} 0 R`).join(' ')}] /Count ${chunks.length} >>`,
  ];

  pages.forEach((page, index) => {
    const { pageObjectNumber, streamObjectNumber, annotationObjectNumbers } = pageRefs[index];
    const content = page.content;
    const contentLength = Buffer.byteLength(content, 'binary');
    const annotations = annotationObjectNumbers.length > 0
      ? ` /Annots [${annotationObjectNumbers.map((objectNumber) => `${objectNumber} 0 R`).join(' ')}]`
      : '';

    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> >> >> /Contents ${streamObjectNumber} 0 R${annotations} >>`);
    objects.push(`<< /Length ${contentLength} >>\nstream\n${content}\nendstream`);
    page.links.forEach((link) => {
      objects.push(`<< /Type /Annot /Subtype /Link /Rect [${link.rect.join(' ')}] /Border [0 0 0] /A << /S /URI /URI (${escapePdfText(link.url)}) >> >>`);
    });
  });

  return buildPdf(objects);
}

export {
  generateProjectRecapPdf,
};
