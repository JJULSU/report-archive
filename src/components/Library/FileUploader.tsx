import { useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import JSZip from 'jszip';
import { addFile } from '../../lib/db';
import { Upload, Loader2 } from 'lucide-react';
import './Library.css';

interface FileUploaderProps {
    onUploadComplete: () => void;
}

export function FileUploader({ onUploadComplete }: FileUploaderProps) {
    const [isDragOver, setIsDragOver] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const processFile = async (file: File) => {
        if (file.type === 'application/pdf') {
            await addFile(file);
        } else if (file.name.endsWith('.zip') || file.type === 'application/zip' || file.type === 'application/x-zip-compressed') {
            // Simple ZIP handling: extract flat list of PDFs
            try {
                const zip = new JSZip();
                const contents = await zip.loadAsync(file);
                const promises: Promise<string>[] = [];

                contents.forEach((_, zipEntry) => {
                    if (!zipEntry.dir && zipEntry.name.toLowerCase().endsWith('.pdf')) {
                        promises.push(
                            zipEntry.async('blob').then(async (blob) => {
                                const extractedFile = new File([blob], zipEntry.name.split('/').pop() || zipEntry.name, { type: 'application/pdf' });
                                return addFile(extractedFile);
                            })
                        );
                    }
                });
                await Promise.all(promises);
            } catch (e) {
                console.error("Failed to unzip", e);
                alert("Failed to unzip file.");
            }
        }
    };

    const handleFiles = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        setIsProcessing(true);

        try {
            for (let i = 0; i < files.length; i++) {
                await processFile(files[i]);
            }
            onUploadComplete();
        } catch (error) {
            console.error("Upload failed", error);
        } finally {
            setIsProcessing(false);
        }
    };

    const onDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragOver(false);
        handleFiles(e.dataTransfer.files);
    };

    const onDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const onDragLeave = () => {
        setIsDragOver(false);
    };

    return (
        <div
            className={`file-uploader ${isDragOver ? 'drag-over' : ''}`}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onClick={() => fileInputRef.current?.click()}
        >
            <input
                type="file"
                ref={fileInputRef}
                onChange={(e: ChangeEvent<HTMLInputElement>) => handleFiles(e.target.files)}
                accept=".pdf,.zip"
                multiple
                style={{ display: 'none' }}
            />

            {isProcessing ? (
                <div className="upload-status">
                    <Loader2 className="animate-spin" />
                    <span>Processing...</span>
                </div>
            ) : (
                <>
                    <Upload size={24} />
                    <span>Drop PDF/ZIP here</span>
                    <span className="sub-text">or click to browse</span>
                </>
            )}
        </div>
    );
}
