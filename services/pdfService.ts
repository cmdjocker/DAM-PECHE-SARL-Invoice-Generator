import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { InvoiceData, Product } from '../types';

const formatWeight = (val: number) => {
    return new Intl.NumberFormat('de-DE', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(val);
};

const formatEuro = (val: number) => {
    return new Intl.NumberFormat('de-DE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(val);
};

const MOLLUSK_NAMES = ['ALMENDRITAS', 'CALAMARS', 'CHOCOS', 'PUNTILLAS'];

// Simple number to words conversion for French (Basic implementation)
const numberToWordsFR = (num: number): string => {
    const units = ['', 'UN', 'DEUX', 'TROIS', 'QUATRE', 'CINQ', 'SIX', 'SEPT', 'HUIT', 'NEUF'];
    const tens = ['', 'DIX', 'VINGT', 'TRENTE', 'QUARANTE', 'CINQUANTE', 'SOIXANTE', 'SOIXANTE-DIX', 'QUATRE-VINGT', 'QUATRE-VINGT-DIX'];
    
    if (num === 0) return 'ZERO';
    if (num === 1500) return 'MILLE CINQ CENTS';
    if (num === 1200) return 'MILLE DEUX CENTS';
    
    // Fallback for demo purposes if not standard
    return num.toString() + ' EUROS';
};

export const generateInvoicePDF = (data: InvoiceData, products: Product[]) => {
    const doc = new jsPDF();
    doc.setFontSize(42); 
    doc.setFont('times', 'bold');
    doc.text('DAM PECHE S.A.R.L', 105, 25, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('times', 'bold');
    doc.text('EXPORTATION DE POISSONS FRAIS ET CONGELES', 105, 33, { align: 'center' });
    doc.text('RC 17845 | AGREMENT 1048 | ICE 001531533000097', 105, 38, { align: 'center' });
    doc.text('SIEGE SOCIAL: PORT DE PECHE TANGER', 105, 43, { align: 'center' });
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    const dateText = `Tanger, Le: ${new Date(data.date).toLocaleDateString('fr-FR')}`;
    const dateWidth = doc.getTextWidth(dateText);
    doc.text(dateText, 190, 58, { align: 'right' });
    doc.line(190 - dateWidth, 59, 190, 59);

    const invoiceY = 72;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    const invoiceText = `FACTURE N° ${data.invoiceNumber || '____'}`;
    const invoiceWidth = doc.getTextWidth(invoiceText);
    doc.text(invoiceText, 105, invoiceY, { align: 'center' });
    doc.line(105 - (invoiceWidth / 2), invoiceY + 1, 105 + (invoiceWidth / 2), invoiceY + 1);
    
    const clientY = 92; 
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('CLIENT:', 20, clientY); 
    doc.setFont('helvetica', 'normal');
    
    const clientText = `${data.clientId} - ${data.clientAddress}`;
    const splitAddress = doc.splitTextToSize(clientText, 150);
    doc.text(splitAddress, 38, clientY);
    
    let currentY = clientY + 6; 

    const tableHeaders = [["Quantité", "P. Brut (KG)", "P. Net (KG)", "Designation", "P. Unit", "Montant (EUR)"]];
    let totalNet = 0;
    let totalBrut = 0;
    let totalQty = 0;
    let totalEur = 0;

    const tableRows = data.items.map(item => {
        const prod = products.find(p => p.id === item.productId);
        const amount = item.netWeight * item.unitPrice;
        totalNet += item.netWeight;
        totalBrut += item.brutWeight;
        totalQty += item.quantity;
        totalEur += amount;
        
        return [
            { content: `${formatWeight(item.quantity)} ${item.symbol}`, styles: { halign: 'right' as const } },
            { content: formatWeight(item.brutWeight), styles: { halign: 'center' as const } },
            { content: formatWeight(item.netWeight), styles: { halign: 'center' as const } },
            { 
                content: '', // Drawing manually in didDrawCell
                raw: { main: prod?.name || 'Inconnu', latin: prod?.latinName || '' } 
            },
            { content: formatEuro(item.unitPrice), styles: { halign: 'right' as const } },
            { content: formatEuro(amount), styles: { halign: 'right' as const } }
        ];
    });

    const totalQtySymbol = data.items.length > 0 && data.items.every(i => i.symbol === 'P') ? 'P' : 'C';

    autoTable(doc, {
        startY: currentY,
        head: tableHeaders,
        body: tableRows,
        theme: 'grid',
        headStyles: { 
            fillColor: [226, 232, 240], 
            textColor: [30, 41, 59],
            fontStyle: 'bold', 
            halign: 'center',
            lineWidth: 0.1,
            lineColor: [200, 200, 200]
        },
        columnStyles: {
            0: { cellWidth: 20 },
            1: { cellWidth: 22 },
            2: { cellWidth: 22 },
            3: { cellWidth: 'auto' }, 
            4: { cellWidth: 22 },
            5: { cellWidth: 28 }
        },
        styles: { fontSize: 9.5, cellPadding: 2.5 },
        foot: [[
            { content: `${totalQty} ${totalQtySymbol}`, styles: { halign: 'right' as const, fontStyle: 'bold' } },
            { content: formatWeight(totalBrut), styles: { halign: 'center' as const, fontStyle: 'bold' } },
            { content: formatWeight(totalNet), styles: { halign: 'center' as const, fontStyle: 'bold' } },
            { content: 'TOTAL GENERAL', styles: { fontStyle: 'bold' } },
            '',
            { content: `${formatEuro(totalEur)} €`, styles: { halign: 'right' as const, fontStyle: 'bold' } }
        ]],
        footStyles: { 
            fillColor: [245, 245, 245], 
            textColor: [0, 0, 0],
            fontSize: 11,
            lineWidth: 0.1,
            lineColor: [200, 200, 200]
        },
        didDrawCell: (data) => {
            if (data.section === 'body' && data.column.index === 3) {
                const cell = data.cell;
                const info = (cell.raw as any)?.raw;
                if (info) {
                    const doc = data.doc;
                    const padding = 2.5;
                    const x = cell.x + padding;
                    const y = cell.y + (cell.height / 2) + 1.5;
                    
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(9.5);
                    doc.text(info.main, x, y);
                    
                    if (info.latin) {
                        const mainWidth = doc.getTextWidth(info.main);
                        doc.setFont('helvetica', 'normal');
                        doc.setFontSize(8.5);
                        doc.text(` (${info.latin})`, x + mainWidth, y);
                    }
                }
            }
        }
    });

    const lastTable = (doc as any).lastAutoTable;
    currentY = lastTable.finalY + 8; 

    const plasticWeight = totalBrut * 0.006;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`TOTAL PESO NETO DE PLASTICO NO REUTILIZABLE: ${formatWeight(plasticWeight)} KG NETOS`, 20, currentY);
    
    currentY += 15;
    const totalDhs = totalEur * data.exchangeRate;
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(`Contre valeur approximative en Dirhams:`, 20, currentY);
    doc.text(`${formatEuro(totalDhs)} DHS`, 190, currentY, { align: 'right' });
    
    currentY += 12;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Incoterm: ', 20, currentY);
    doc.setFont('helvetica', 'bold');
    doc.text(`${data.incoterm} TANGER`, 42, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text('Transport: ', 20, currentY + 6);
    doc.setFont('helvetica', 'bold');
    doc.text(`${data.transport}`, 42, currentY + 6);
    doc.setFont('helvetica', 'normal');
    doc.text('CHARGEE SUR CAM/REM Mat: ', 20, currentY + 12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`${data.trailer}`, 78, currentY + 12);
    
    const pageHeight = doc.internal.pageSize.height;
    
    // Centered and Bold bank info block
    let bankDetailsY = pageHeight - 45;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('PAYEMENT PAR VIREMENT', 105, bankDetailsY, { align: 'center' });
    doc.setFontSize(9);
    doc.text('IBAN : MA64 0116 4000 0001 2100 0620 2556', 105, bankDetailsY + 5, { align: 'center' });
    doc.text('CODE SWIFT: BMCEMAMCXXX', 105, bankDetailsY + 10, { align: 'center' });
    doc.text('BANK OF AFRICA', 105, bankDetailsY + 15, { align: 'center' });
    doc.text("CENTRE D'AFFAIRE TANGER", 105, bankDetailsY + 20, { align: 'center' });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('PORT DE PECHE TANGER TEL:039 93 35 25 FAX:039 93 04 07 Email: dampeche@gmail.com', 105, pageHeight - 10, { align: 'center' });

    doc.save(`Facture_${data.invoiceNumber || 'Draft'}.pdf`);
};

export const generateCMRPDF = (data: InvoiceData, products: Product[]) => {
    const doc = new jsPDF();
    const formattedDate = new Date(data.date).toLocaleDateString('fr-FR');
    
    // Header
    doc.setFontSize(12);
    doc.setFont('times', 'bold');
    doc.text('DAM PECHE SARL.', 20, 20);
    doc.text('PORT DE PECHE TANGER', 20, 25);
    doc.text('MAROC', 20, 30);

    // Client and Transport Info
    doc.setFontSize(12);
    doc.setFont('times', 'bold');
    doc.text(data.clientId, 20, 45);
    doc.text('VALENCIA', 20, 50);
    doc.text('ESPAGNE', 20, 55);

    doc.text(data.transport.toUpperCase(), 120, 45);
    doc.text('PORT DE PECHE TANGER', 120, 50);
    doc.setFontSize(10);
    doc.text(`Matricule: ${data.trailer || ''}`, 120, 68);

    // Metadata
    doc.setFontSize(12);
    doc.setFont('times', 'normal');
    doc.text('Valencia Espagne', 20, 75);
    doc.text(`Tanger, le ${formattedDate}`, 20, 90);
    doc.text('Facture + EUR 1', 20, 110);

    // Summary calculation
    let totalBrut = 0, totalNet = 0, totalQty = 0, hasMollusk = false;
    const speciesNames: string[] = [];
    data.items.forEach(item => {
        const prod = products.find(p => p.id === item.productId);
        if (prod) {
            speciesNames.push(prod.name);
            if (MOLLUSK_NAMES.includes(prod.name.toUpperCase())) hasMollusk = true;
        }
        totalBrut += item.brutWeight;
        totalNet += item.netWeight;
        totalQty += item.quantity;
    });

    const uniqueSpecies = Array.from(new Set(speciesNames));
    let designation = uniqueSpecies.length === 1 ? uniqueSpecies[0] + " FRAIS" : (hasMollusk ? "POISSONS ET MOLLUSQUES FRAIS" : "POISSONS FRAIS");
    const qtySymbol = data.items.every(i => i.symbol === 'P') ? 'PIECES' : 'COLIS';
    
    // Main Body
    doc.setFontSize(11);
    doc.text(`${totalQty} ${qtySymbol} D' ${designation}`, 20, 155);
    doc.text(`(POIDS NET ${formatWeight(totalNet)} KG)`, 25, 163);
    
    doc.setFont('times', 'bold');
    doc.text(`${formatWeight(totalBrut)} KG`, 170, 155, { align: 'right' });

    doc.setFont('times', 'normal');
    doc.text(`Tanger, le ${formattedDate}`, 35, 255);

    doc.save(`CMR_${data.invoiceNumber || 'Draft'}.pdf`);
};

export const generateNoteNavirePDF = (data: InvoiceData, products: Product[]) => {
    const doc = new jsPDF();
    const formattedDate = new Date(data.date).toLocaleDateString('fr-FR');
    const BLACK = [0, 0, 0] as [number, number, number];
    
    doc.setDrawColor(0);
    doc.setLineWidth(0.4);
    doc.rect(138, 12, 52, 28);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Cachet du demandeur', 138, 9);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('PETICION DE EMBARQUE', 105, 42, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text("Note d'embarquement", 105, 49, { align: 'center' });
    doc.text('Signature........................................', 135, 49);

    doc.setFontSize(7.5);
    let currentY = 58;
    doc.text('El Agente de Aduanas .............................................................................................................................................................', 20, currentY);
    doc.text("L'agent en Douane", 20, currentY + 3);
    currentY += 8;
    doc.text('..............................................................................................................A ........................... Tel .............................................', 20, currentY);
    currentY += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('Solicita la reserva de fletepala las mercanciassuguientes en la fecha y conditionsindicadas', 20, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text('Solicité la réservation du frêt pour les marchandises suivantes à la date et aux conditions ci-après', 20, currentY + 4);

    currentY += 9;
    doc.rect(20, currentY, 170, 14);
    doc.line(75, currentY, 75, currentY + 14);
    doc.line(122, currentY, 122, currentY + 14);
    doc.line(142, currentY, 142, currentY + 14);
    
    doc.setFontSize(6.5);
    doc.text('Puerto de Origen (Port d’embarquement)', 22, currentY + 4);
    doc.text('Nombredelbugue (Nom du Navire)', 77, currentY + 4);
    doc.text('Viaje n°', 124, currentY + 4);
    doc.text('Puerto de Destino (Port destinataire)', 144, currentY + 4);

    currentY += 20;
    const boxH = 42;
    doc.rect(20, currentY, 170, boxH);
    const splitX = 110;
    doc.line(splitX, currentY, splitX, currentY + boxH);
    doc.line(20, currentY + 21, splitX, currentY + 21);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text('Remitente (Expéditeur)', 22, currentY + 5);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('DAM PECHE SARL', (20 + splitX) / 2, currentY + 15, { align: 'center' });

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text('Cargador o Agente de Aduanas (Chargeur ou transitaire)', 22, currentY + 26);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text((data.noteChargeur || data.transport).toUpperCase(), (20 + splitX) / 2, currentY + 36, { align: 'center' });

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text('Consignatario de la mercancia (Réceptionnaire)', splitX + 2, currentY + 5);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    const clientLines = doc.splitTextToSize(data.clientId.toUpperCase(), 170 - splitX - 10);
    doc.text(clientLines, (splitX + 190) / 2, currentY + 22, { align: 'center' });

    currentY += boxH + 12;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('DATOS DECLARADOS POR EL CARGADOR', 105, currentY, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('(Déclaration faite par le Chargeur)', 105, currentY + 5, { align: 'center' });

    currentY += 10;
    const tableH = 80;
    doc.rect(20, currentY, 170, tableH);
    doc.line(85, currentY, 85, currentY + tableH); 
    doc.line(152, currentY, 152, currentY + tableH); 
    doc.line(175, currentY, 175, currentY + tableH); 
    doc.line(20, currentY + 11, 85, currentY + 11);
    doc.line(52, currentY + 11, 52, currentY + tableH);
    doc.line(20, currentY + 22, 190, currentY + 22);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('BULTOS (Colis)', (20 + 85) / 2, currentY + 7.5, { align: 'center' });
    doc.setFontSize(8);
    doc.text('Marcas (Marques)', 36, currentY + 16.5, { align: 'center' });
    doc.text('Clase Numero', 68.5, currentY + 16.5, { align: 'center' });
    doc.text('DESCRIPCION DE LA MERCANCIA', 118.5, currentY + 9, { align: 'center' });
    doc.text('Peso bruto', 163.5, currentY + 9, { align: 'center' });
    doc.text('Volumen', 182.5, currentY + 9, { align: 'center' });

    let totalBrut = 0, totalQty = 0, speciesNames: string[] = [], hasMollusk = false;
    data.items.forEach(item => {
        totalBrut += item.brutWeight; totalQty += item.quantity;
        const prod = products.find(p => p.id === item.productId);
        if (prod) {
            speciesNames.push(prod.name);
            if (MOLLUSK_NAMES.includes(prod.name.toUpperCase())) hasMollusk = true;
        }
    });
    const unique = Array.from(new Set(speciesNames));
    let designation = unique.length === 1 ? unique[0] + " FRAIS" : (hasMollusk ? "POISSONS ET MOLLUSQUES FRAIS" : "POISSONS FRAIS");
    const qtySymbol = data.items.every(i => i.symbol === 'P') ? 'PIECES' : 'COLIS';

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    const trailerLines = doc.splitTextToSize(data.trailer.toUpperCase(), 28);
    doc.text(trailerLines, 36, currentY + 45, { align: 'center' });
    const mainDesc = `${totalQty} ${qtySymbol} D' ${designation.toUpperCase()}`;
    const descLines = doc.splitTextToSize(mainDesc, 60);
    doc.text(descLines, 118.5, currentY + 45, { align: 'center' });
    doc.text(`${formatWeight(totalBrut)} KG`, 163.5, currentY + 45, { align: 'center' });

    doc.setFontSize(6.5); 
    doc.setFont('helvetica', 'normal');
    let footY = currentY + tableH + 4;
    doc.text('Instructions de l’Agent en Douanes', 20, footY + 2.5);
    doc.text('Vu confonne pour embarquement', 130, footY + 2.5);
    doc.text('Frêt payable à DESTINATION', 20, footY + 7.5);
    doc.text('TANGER , Le : ', 130, 285);
    doc.setFont('helvetica', 'bold');
    doc.text(formattedDate, 158, 285);

    doc.save(`Note_Navire_${data.invoiceNumber || 'Draft'}.pdf`);
};

export const generateTransportInvoicePDF = (data: InvoiceData) => {
    const doc = new jsPDF();
    const formattedDate = new Date(data.date).toLocaleDateString('fr-FR');
    
    doc.setFontSize(32);
    doc.setFont('times', 'bold');
    doc.text('DAMJI-TRANS S.A.R.L', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text('TRANSPORT NATIONAL ET INTERNATIONAL', 105, 28, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('times', 'normal');
    doc.text('RC N°:23883/PATENTE N°:50502638/ IF: 04907266 / ICE : 000226225000015', 105, 35, { align: 'center' });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`TANGER LE ${formattedDate}`, 190, 52, { align: 'right' });

    doc.setFontSize(20);
    const invoiceTitle = `FACTURE N° ${data.transportInvoiceNumber || '____'}`;
    doc.text(invoiceTitle, 105, 75, { align: 'center' });
    doc.line(105 - 25, 76.5, 105 + 25, 76.5);

    doc.setFontSize(12);
    const clientText = `CLIENT: ${data.clientId.toUpperCase()}   ${data.clientAddress.toUpperCase()}`;
    const splitClient = doc.splitTextToSize(clientText, 170);
    doc.text(splitClient, 20, 95);

    const totalEur = data.transportAmount || 0;
    const parts = data.clientAddress.split(' ');
    const destinationCity = parts[parts.length - 2] || 'CADIZ';

    autoTable(doc, {
        startY: 110,
        head: [['DESIGNATION', 'MONTANT EUR']],
        body: [
            [{ 
                content: `\nFRAIS DE TRANSPORT : TANGER - ${destinationCity.toUpperCase()}\n\nC/R : ${data.trailer.toUpperCase()}`,
                styles: { minCellHeight: 35, fontStyle: 'bold' } 
            }, { 
                content: `\n${formatEuro(totalEur)}`, 
                styles: { halign: 'center', valign: 'top' } 
            }],
        ],
        theme: 'grid',
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', lineWidth: 0.5, lineColor: [0, 0, 0] },
        styles: { fontSize: 10, textColor: [0, 0, 0], lineWidth: 0.5, lineColor: [0, 0, 0], cellPadding: 3 },
        columnStyles: { 0: { cellWidth: 120 }, 1: { cellWidth: 50 } },
        foot: [[{ content: 'TOTAL', styles: { halign: 'center', fontStyle: 'bold' } }, { content: formatEuro(totalEur), styles: { halign: 'center', fontStyle: 'bold' } }]],
        footStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], lineWidth: 0.5, lineColor: [0, 0, 0] }
    });

    const finalY = (doc as any).lastAutoTable.finalY;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('ARRETEE LA PRESENTE FACTURE A LA SOMME DE :', 20, finalY + 15);
    doc.setFont('helvetica', 'bold');
    doc.text(`${numberToWordsFR(totalEur)} EUROS.`, 20, finalY + 23);

    let bankY = finalY + 50;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('PAYEMENT PAR VIREMENT COMPTE RIB: 011640000001210000390801', 105, bankY, { align: 'center' });
    doc.text('CODE SWIFT : BMCEMAMCXXX / BANQUE OF AFRICA', 105, bankY + 6, { align: 'center' });

    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.text('PORT DE PECHE TANGER TEL: +(212)539933525 FAX:+(212)539930407', 105, pageHeight - 10, { align: 'center' });

    doc.save(`Facture_Transport_${data.transportInvoiceNumber || 'Draft'}.pdf`);
};