"use client";

import { ImagePlus, X } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ImageUploaderProps { file: File | null; previewUrl: string | null; onChange: (file: File | null) => void }

export function ImageUploader({ file, previewUrl, onChange }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const accept = "image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif";
  const choose = (candidate?: File) => { if (candidate) onChange(candidate); };
  return <div onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={(event) => { event.preventDefault(); setIsDragging(false); choose(event.dataTransfer.files[0]); }} className={cn("relative overflow-hidden rounded-2xl border-2 border-dashed p-4 transition", isDragging ? "border-primary bg-primary/5" : "border-border bg-muted/30")}>
    <input ref={inputRef} className="sr-only" type="file" accept={accept} onChange={(event) => choose(event.target.files?.[0])} />
    {file && previewUrl ? <div className="flex items-center gap-3"><img src={previewUrl} alt="Selected upload" className="h-16 w-16 rounded-xl object-cover" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{file.name}</p><p className="mt-1 text-xs text-muted-foreground">{Math.round(file.size / 1024 / 1024 * 10) / 10} MB · ready to use</p></div><Button variant="ghost" size="sm" aria-label="Remove image" onClick={() => onChange(null)}><X className="h-4 w-4" /></Button></div> : <div className="flex flex-col items-center py-4 text-center"><span className="mb-2 grid h-10 w-10 place-items-center rounded-xl bg-white shadow-sm"><ImagePlus className="h-5 w-5 text-primary" /></span><p className="text-sm font-semibold">Drop a photo here</p><p className="mt-1 text-xs text-muted-foreground">JPG, PNG, WebP, HEIC or AVIF · up to 15 MB</p><Button variant="outline" size="sm" className="mt-3" onClick={() => inputRef.current?.click()}>Choose photo</Button></div>}
  </div>;
}
