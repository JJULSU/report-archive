import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { flattenImage } from './imageUtils';

export const copyToClipboard = async (items: any[]) => {
    // ... same as before
    // (omitted for brevity in prompt, but need to be careful with replace)
    // Actually, I can leave copyToClipboard alone if I target exportToPdf specifically.
    // But `replace_file_content` needs exact match.
    // I will replace the whole file content for safety or target the specific function
    // But wait, allow me to use "replace" on exportToPdf part only.
    // But wait, imports need to change too.
    // ... existing copyToClipboard implementation ...
    let htmlContent = '';
    items.forEach(item => {
        htmlContent += '<div style="margin-bottom: 20px;">';
        if (item.type === 'heading') {
            htmlContent += `<h2 style="font-size: 1.5em; font-weight: bold;">${item.content}</h2>`;
        } else if (item.type === 'text') {
            htmlContent += `<p style="white-space: pre-wrap;">${item.content.replace(/\n/g, '<br>')}</p>`;
        } else if (item.type === 'image') {
            htmlContent += `<p><em>(Image)</em></p>`;
            if (item.meta?.citation) {
                htmlContent += `<div style="font-size: 0.8em; color: gray; margin-top: 4px; font-style: italic;">${item.meta.citation}</div>`;
            }
            if (item.comment) {
                htmlContent += `<p style="margin-top: 8px; white-space: pre-wrap;">${item.comment.replace(/\n/g, '<br>')}</p>`;
            }
        }
        htmlContent += '</div>';
    });
    // ...
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

        // Split items into chunks of 2 for 1x2 grid (Top/Bottom)
        for (let i = 0; i < items.length; i += 2) {
            chunks.push(items.slice(i, i + 2));
        }

        // Helper to escape HTML to prevent XSS (basic)
        const escapeHtml = (text: string) => {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        };

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];

            // Build Inner HTML for this Page (1x2 Grid)
            let html = `
                <div style="
                    display: grid; 
                    grid-template-columns: 1fr; 
                    grid-template-rows: 1fr 1fr; 
                    width: 100%; 
                    height: 100%; 
                    padding: ${MARGIN}px;
                    box-sizing: border-box;
                    gap: 30px;
                ">
            `;

            // Prepare items (flatten images concurrently if needed)
            const processedChunk = await Promise.all(chunk.map(async (item) => {
                if (item.type === 'image' && item.content.startsWith('data:image') && item.meta?.highlights?.length > 0) {
                    const flattened = await flattenImage(item.content, item.meta.highlights);
                    return { ...item, content: flattened };
                }
                return item;
            }));

            processedChunk.forEach(item => {
                html += `
                    <div style="
                        display: flex; 
                        flex-direction: column; 
                        overflow: hidden; 
                        border: 1px solid #eee; 
                        padding: 20px; 
                        border-radius: 8px;
                        background: #fdfdfd;
                    ">
                `;

                if (item.type === 'heading') {
                    html += `<h2 style="font-size: 18px; font-weight: bold; margin: 0 0 10px 0;">${escapeHtml(item.content)}</h2>`;
                } else if (item.type === 'image') {
                    // Image Container - Larger max-height for 1x2
                    html += `
                        <div style="flex: 1; display: flex; align-items: center; justify-content: center; overflow: hidden; margin-bottom: 10px; background: #fafafa; border: 1px solid #f0f0f0;">
                             <img src="${item.content}" style="max-width: 100%; max-height: 400px; object-fit: contain;" />
                        </div>
                    `;

                    // Metadata (Source)
                    if (item.meta?.citation) {
                        html += `<div style="font-size: 10px; color: #666; margin-bottom: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(item.meta.citation)}</div>`;
                    }

                    // Comment
                    if (item.comment) {
                        html += `<div style="font-size: 14px; color: #333; line-height: 1.5; flex-shrink: 0; white-space: pre-wrap;">${escapeHtml(item.comment)}</div>`;
                    }
                } else if (item.type === 'text') {
                    html += `<div style="font-size: 14px; color: #333; white-space: pre-wrap;">${escapeHtml(item.content)}</div>`;
                }

                html += `</div>`; // End item container
            });

            // Fill empty slot
            for (let j = processedChunk.length; j < 2; j++) {
                html += `<div></div>`;
            }

            html += `</div>`; // End Grid Container

            container.innerHTML = html;

            // Wait for images to load inside the container
            const images = container.getElementsByTagName('img');
            await Promise.all(Array.from(images).map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise((resolve, _reject) => {
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

        doc.save('MyScrapbook_Grid.pdf');

        // Manual Blob Download removed to fix filename issue
        // const blob = doc.output('blob');
        // ...

    } catch (e) {
        console.error("PDF Export failed", e);
        alert("PDF export failed. See console for details.");
    } finally {
        if (document.body.contains(container)) {
            document.body.removeChild(container);
        }
    }
};
