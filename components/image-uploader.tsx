"use client";

import { ImagePlus, X } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ImageUploaderProps {
  file: File | null;
  previewUrl: string | null;
  onChange: (file: File | null) => void;
}

export function ImageUploader({ file, previewUrl, onChange }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const accept = "image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif";

  const choose = (candidate?: File) => {
    if (candidate) onChange(candidate);
  };

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        choose(event.dataTransfer.files[0]);
      }}
      className={cn(
        "relative overflow-hidden rounded-2xl border-2 border-dashed p-5 transition-all duration-200 cursor-pointer touch-manipulation",
        isDragging
          ? "border-[#F4C93B] bg-[#F4C93B]/10 scale-[1.01]"
          : "border-[#175B3B] bg-[#062C1B]/80 hover:border-[#F4C93B]/50 hover:bg-[#093823]/90"
      )}
      onClick={() => {
        if (!file) inputRef.current?.click();
      }}
    >
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept={accept}
        onChange={(event) => choose(event.target.files?.[0])}
      />

      {file && previewUrl ? (
        <div className="flex items-center gap-3.5">
          <img
            src={previewUrl}
            alt="Selected upload preview"
            className="h-16 w-16 rounded-xl border border-[#F4C93B]/30 object-cover shadow-md bg-[#062C1B]"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-[#F4F1EA]">{file.name}</p>
            <p className="mt-1 text-xs font-mono text-[#8EB89B]">
              {(file.size / 1024 / 1024).toFixed(1)} MB · Ready to render
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Remove image"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
            className="h-9 w-9 p-0 text-[#8EB89B] hover:text-[#F4F1EA]"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center py-3 text-center">
          <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-[#093823] border border-[#F4C93B]/30 text-[#F4C93B] shadow-inner">
            <ImagePlus className="h-6 w-6" />
          </div>
          <p className="text-sm font-bold text-[#F4F1EA]">
            Tap to upload portrait photo
          </p>
          <p className="mt-1 text-xs text-[#8EB89B] font-mono">
            JPG, PNG, WebP, HEIC or AVIF · Up to 15 MB
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 pointer-events-none"
          >
            Select Photo
          </Button>
        </div>
      )}
    </div>
  );
}
