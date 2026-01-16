import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
// import { getAllScrapItems } from '../lib/db';

export const copyToClipboard = async (items: any[]) => {
    // const items = await getAllScrapItems(); // usage via arg
    // items.sort((a, b) => a.order - b.order); // Assume sorted or sort here if needed, but UI passed sorted items.

    let htmlContent = '';
    items.forEach(item => {
        htmlContent += '<div style="margin-bottom: 20px;">';
        if (item.type === 'heading') {
            htmlContent += `<h2 style="font-size: 1.5em; font-weight: bold;">${item.content}</h2>`;
        } else if (item.type === 'text') {
            htmlContent += `<p>${item.content}</p>`;
        } else if (item.type === 'image') {
            htmlContent += `<img src="${item.content}" style="max-width: 100%; border: 1px solid #ddd; border-radius: 4px;" /><br/>`;
            if (item.meta?.citation) {
                htmlContent += `<div style="font-size: 0.8em; color: gray; margin-top: 4px; font-style: italic;">${item.meta.citation}</div>`;
            }
            if (item.comment) {
                htmlContent += `<p style="margin-top: 8px;">${item.comment}</p>`;
            }
        }
        htmlContent += '</div>';
    });

    try {
        const type = "text/html";
        const blob = new Blob([htmlContent], { type });
        const data = [new ClipboardItem({ [type]: blob })];
        await navigator.clipboard.write(data);
        alert("Copied to clipboard!");
    } catch (e) {
        console.error("Clipboard write failed", e);
        alert("Failed to copy to clipboard.");
    }
};

export const exportToPdf = async (items: any[]) => {
    // A4 Size at 96 DPI: 794px x 1123px
    const PAGE_WIDTH = 794;
    const PAGE_HEIGHT = 1123; // Height for aspect ratio reference
    const MARGIN = 40;

    // Create a container that exactly matches A4 width/aspect in a hidden way but rendered
    const container = document.createElement('div');
    container.style.width = '794px';
    container.style.height = '1123px'; // A4 Height
    container.style.position = 'absolute';
    container.style.top = '-9999px';
    container.style.left = '-9999px';
    container.style.backgroundColor = '#fff';
    container.style.zIndex = '-1';

    // We attach it to body so html2canvas can render it
    document.body.appendChild(container);

    try {
        const doc = new jsPDF('p', 'mm', 'a4'); // Portrait, Millimeters, A4
        const chunks = [];

        // Split items into chunks of 4 for 2x2 grid
        for (let i = 0; i < items.length; i += 4) {
            chunks.push(items.slice(i, i + 4));
        }

        // Helper to escape HTML to prevent XSS (basic)
        const escapeHtml = (text: string) => {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        };

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];

            // Build Inner HTML for this Page (2x2 Grid)
            let html = `
                <div style="
                    display: grid; 
                    grid-template-columns: 1fr 1fr; 
                    grid-template-rows: 1fr 1fr; 
                    width: 100%; 
                    height: 100%; 
                    padding: ${MARGIN}px;
                    box-sizing: border-box;
                    gap: 30px;
                ">
            `;

            chunk.forEach(item => {
                html += `
                    <div style="
                        display: flex; 
                        flex-direction: column; 
                        overflow: hidden; 
                        border: 1px solid #eee; 
                        padding: 15px; 
                        border-radius: 8px;
                        background: #fdfdfd;
                    ">
                `;

                if (item.type === 'heading') {
                    html += `<h2 style="font-size: 18px; font-weight: bold; margin: 0 0 10px 0;">${escapeHtml(item.content)}</h2>`;
                } else if (item.type === 'image') {
                    // Image Container
                    html += `
                        <div style="flex: 1; display: flex; align-items: center; justify-content: center; overflow: hidden; margin-bottom: 10px; background: #fafafa; border: 1px solid #f0f0f0;">
                             <img src="${item.content}" style="max-width: 100%; max-height: 250px; object-fit: contain;" />
                        </div>
                    `;

                    // Metadata (Source) - Reduced font size
                    if (item.meta?.citation) {
                        html += `<div style="font-size: 10px; color: #666; margin-bottom: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(item.meta.citation)}</div>`;
                    }

                    // Comment
                    if (item.comment) {
                        html += `<div style="font-size: 12px; color: #333; line-height: 1.4; flex-shrink: 0;">${escapeHtml(item.comment)}</div>`;
                    }
                } else if (item.type === 'text') {
                    html += `<div style="font-size: 12px; color: #333; white-space: pre-wrap;">${escapeHtml(item.content)}</div>`;
                }

                html += `</div>`; // End item container
            });

            // Fill empty slots if chunk has less than 4 items
            for (let j = chunk.length; j < 4; j++) {
                html += `<div></div>`;
            }

            html += `</div>`; // End Grid Container

            container.innerHTML = html;

            // Wait for images to load inside the container
            const images = container.getElementsByTagName('img');
            await Promise.all(Array.from(images).map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = resolve; // Continue even if error
                });
            }));

            // Capture
            const canvas = await html2canvas(container, {
                scale: 2, // 2x scale for better print quality
                useCORS: true,
                logging: false
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.85); // JPEG slightly smaller

            // Add to PDF
            // A4 dimensions in mm: 210 x 297
            // We adding the captured image as a full page
            if (i > 0) doc.addPage();
            doc.addImage(imgData, 'JPEG', 0, 0, 210, 297);
        }

        // doc.save('MyScrapbook_Grid.pdf');

        // Manual Blob Download to ensure filename
        const blob = doc.output('blob');
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'MyScrapbook_Grid.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

    } catch (e) {
        console.error("PDF Export failed", e);
        alert("PDF export failed. See console for details.");
    } finally {
        if (document.body.contains(container)) {
            document.body.removeChild(container);
        }
    }
};
