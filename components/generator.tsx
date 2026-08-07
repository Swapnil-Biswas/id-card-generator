"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Download, Loader2, RotateCcw, Share2, SlidersHorizontal, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { Results, SelfieSegmentation } from "@mediapipe/selfie_segmentation";
import { generateImageAction, normalizePhotoForSegmentationAction } from "@/app/actions";
import { ImageUploader } from "@/components/image-uploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TabButton } from "@/components/ui/tabs";
import { ShareConfig, TemplateConfig } from "@/config/template";
import { dataUrlToBlob } from "@/lib/utils";
import type { GeneratorMode } from "@/renderer/types";

const formSchema = z.object({ name: z.string().trim().max(80, "Keep the name under 80 characters."), role: z.string().trim().max(80, "Keep the role under 80 characters."), title: z.string().trim().max(80, "Keep the title under 80 characters.") });
type FormValues = z.infer<typeof formSchema>;
type Notice = { kind: "error" | "success"; text: string } | null;

let segmenterPromise: Promise<SelfieSegmentation> | null = null;

function getSegmenter() {
  if (!segmenterPromise) {
    segmenterPromise = import("@mediapipe/selfie_segmentation").then(async ({ SelfieSegmentation }) => {
      const segmenter = new SelfieSegmentation({ locateFile: (file) => `/mediapipe/${file}` });
      segmenter.setOptions({ modelSelection: 0, selfieMode: false });
      await segmenter.initialize();
      return segmenter;
    });
  }
  return segmenterPromise;
}

function loadImage(file: Blob) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("This photo could not be decoded.")); };
    image.src = url;
  });
}

async function createPortraitCutout(file: File) {
  const image = await loadImage(file);
  const scale = Math.min(1, 1280 / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const input = document.createElement("canvas");
  input.width = width; input.height = height;
  input.getContext("2d")?.drawImage(image, 0, 0, width, height);
  const segmenter = await getSegmenter();
  const result = await new Promise<Results>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error("Portrait detection timed out.")), 8000);
    segmenter.onResults((segmentation) => { window.clearTimeout(timeout); resolve(segmentation); });
    void segmenter.send({ image: input }).catch((error) => { window.clearTimeout(timeout); reject(error); });
  });
  const output = document.createElement("canvas");
  output.width = width; output.height = height;
  const context = output.getContext("2d");
  if (!context) throw new Error("Your browser cannot prepare this photo.");
  context.drawImage(result.image, 0, 0, width, height);
  context.globalCompositeOperation = "destination-in";
  context.drawImage(result.segmentationMask, 0, 0, width, height);
  return new Promise<Blob>((resolve, reject) => output.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Portrait cutout failed.")), "image/png"));
}

export function Generator() {
  const [mode, setMode] = useState<GeneratorMode>("card");
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [foregroundPhoto, setForegroundPhoto] = useState<File | null>(null);
  const [foregroundPreviewUrl, setForegroundPreviewUrl] = useState<string | null>(null);
  const [isRemovingBackground, setIsRemovingBackground] = useState(false);
  const [removalProgress, setRemovalProgress] = useState<string | null>(null);
  const [hasAttemptedRemoval, setHasAttemptedRemoval] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [zoom, setZoom] = useState(1);
  const [positionX, setPositionX] = useState(0);
  const [positionY, setPositionY] = useState(0);
  const removalRequest = useRef(0);
  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null);
  const { register, handleSubmit, getValues, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: { name: "", role: "", title: "" } });

  const transformStyle = useMemo(() => {
    if (!imageAspectRatio) return undefined;
    const config = TemplateConfig;
    const canvas = mode === "card" ? (config.cardCanvas ?? config.canvas) : config.canvas;
    const box = mode === "card" ? (config.cardPhoto ?? config.photo) : config.photo;

    const boxRatio = box.width / box.height;
    let scaledWidth: number;
    let scaledHeight: number;

    if (imageAspectRatio > boxRatio) {
      scaledHeight = box.height * zoom;
      scaledWidth = scaledHeight * imageAspectRatio;
    } else {
      scaledWidth = box.width * zoom;
      scaledHeight = scaledWidth / imageAspectRatio;
    }

    const overflowX = scaledWidth - box.width;
    const overflowY = scaledHeight - box.height;

    const tx = (overflowX * -positionX) / 2;
    const ty = (overflowY * -positionY) / 2;

    const txPercent = (tx / box.width) * 100;
    const tyPercent = (ty / box.height) * 100;

    return {
      transform: `scale(${zoom}) translate(${txPercent / zoom}%, ${tyPercent / zoom}%)`,
    };
  }, [mode, zoom, positionX, positionY, imageAspectRatio]);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  useEffect(() => () => { if (foregroundPreviewUrl) URL.revokeObjectURL(foregroundPreviewUrl); }, [foregroundPreviewUrl]);
  useEffect(() => { if (mode === "card" && photo && !foregroundPhoto && !isRemovingBackground && !hasAttemptedRemoval) void removePhotoBackground(photo); }, [mode, photo, foregroundPhoto, isRemovingBackground, hasAttemptedRemoval]);
  useEffect(() => { if (mode === "card") void getSegmenter().catch(() => undefined); }, [mode]);
  const generatedLabel = useMemo(() => mode === "frame" ? "Your frame" : "Your ID card", [mode]);

  function changePhoto(nextPhoto: File | null) {
    removalRequest.current += 1;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (foregroundPreviewUrl) URL.revokeObjectURL(foregroundPreviewUrl);
    setPhoto(nextPhoto);
    setPreviewUrl(nextPhoto ? URL.createObjectURL(nextPhoto) : null);
    setForegroundPhoto(null);
    setForegroundPreviewUrl(null);
    setRemovalProgress(null);
    setHasAttemptedRemoval(false);
    setGeneratedImage(null);
    setZoom(1); setPositionX(0); setPositionY(0);
    if (nextPhoto) {
      loadImage(nextPhoto).then((img) => {
        setImageAspectRatio(img.naturalWidth / img.naturalHeight);
      }).catch(() => {
        setImageAspectRatio(null);
      });
    } else {
      setImageAspectRatio(null);
    }
  }

  async function removePhotoBackground(sourcePhoto: File) {
    const requestId = removalRequest.current + 1;
    removalRequest.current = requestId;
    setHasAttemptedRemoval(true);
    setIsRemovingBackground(true);
    setRemovalProgress("Preparing your cutout…");
    try {
      setRemovalProgress("Creating your clean cutout…");
      let segmentationSource = sourcePhoto;
      if (sourcePhoto.type === "image/heic" || sourcePhoto.type === "image/heif") {
        const payload = new FormData();
        payload.set("photo", sourcePhoto);
        const response = await normalizePhotoForSegmentationAction(payload);
        if (!response.ok) throw new Error(response.error);
        segmentationSource = new File([dataUrlToBlob(response.image)], "portrait.jpg", { type: "image/jpeg" });
      }
      const transparentImage = await createPortraitCutout(segmentationSource);
      if (requestId !== removalRequest.current) return;
      const cutout = new File([transparentImage], `${sourcePhoto.name.replace(/\.[^/.]+$/, "")}-cutout.png`, { type: "image/png" });
      if (foregroundPreviewUrl) URL.revokeObjectURL(foregroundPreviewUrl);
      setForegroundPhoto(cutout);
      setForegroundPreviewUrl(URL.createObjectURL(cutout));
      setRemovalProgress(null);
    } catch (error) {
      if (requestId === removalRequest.current) setNotice({ kind: "error", text: error instanceof Error ? "Background removal couldn't finish. Try a clear, well-lit portrait." : "Background removal couldn't finish." });
    } finally {
      if (requestId === removalRequest.current) setIsRemovingBackground(false);
    }
  }

  async function render(format: "png" | "jpeg" = "png", download = false) {
    if (!photo) { setNotice({ kind: "error", text: "Choose a photo to continue." }); return; }
    if (mode === "card" && isRemovingBackground) { setNotice({ kind: "error", text: "Your photo cutout is still being prepared." }); return; }
    if (mode === "card" && !foregroundPhoto) { setNotice({ kind: "error", text: "We need a clean photo cutout before creating the card." }); return; }
    const values = getValues();
    if (mode === "card" && !values.name.trim()) { setNotice({ kind: "error", text: "Add your name for the ID card." }); return; }
    setIsGenerating(true); setNotice(null);
    const data = new FormData();
    data.set("photo", mode === "card" ? foregroundPhoto as File : photo); data.set("mode", mode); data.set("format", format);
    data.set("name", values.name); data.set("role", values.role); data.set("title", values.title);
    data.set("zoom", String(zoom)); data.set("positionX", String(positionX)); data.set("positionY", String(positionY));
    const response = await generateImageAction(data);
    setIsGenerating(false);
    if (!response.ok) { setNotice({ kind: "error", text: response.error }); return; }
    if (download) {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(dataUrlToBlob(response.image));
      link.download = `hh-goa-2026-${mode}.${format === "jpeg" ? "jpg" : "png"}`;
      link.click();
      URL.revokeObjectURL(link.href);
    } else {
      setGeneratedImage(response.image);
      setNotice({ kind: "success", text: "Your image is ready to download or share." });
    }
  }

  const onSubmit = () => void render();
  function shareOnX() {
    const href = `https://x.com/intent/tweet?text=${encodeURIComponent(ShareConfig.text)}${ShareConfig.url ? `&url=${encodeURIComponent(ShareConfig.url)}` : ""}`;
    window.open(href, "_blank", "noopener,noreferrer");
  }

  return <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
    <header className="mb-7 text-center sm:mb-10"><div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm"><Sparkles className="h-3.5 w-3.5 text-primary" /> HH Goa 2026</div><h1 className="text-3xl font-bold tracking-tight sm:text-5xl">Make your mark in Goa.</h1><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">Create a social-ready profile frame or a builder ID card in a few quick steps.</p></header>
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(380px,0.85fr)] lg:items-start">
      <section className="rounded-3xl border bg-card p-4 shadow-soft sm:p-6">
        <div className="mb-6 rounded-2xl bg-muted p-1.5" role="tablist" aria-label="Generator mode"><TabButton active={mode === "frame"} onClick={() => { setMode("frame"); setGeneratedImage(null); }}>Profile frame</TabButton><TabButton active={mode === "card"} onClick={() => { setMode("card"); setGeneratedImage(null); }}>Builder ID card</TabButton></div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div><div className="mb-2 flex items-baseline justify-between"><Label>1. Upload your photo</Label><span className="text-xs text-muted-foreground">Smart crop included</span></div><ImageUploader file={photo} previewUrl={previewUrl} onChange={changePhoto} />{mode === "card" && photo && <p className="mt-2 text-xs text-muted-foreground">{isRemovingBackground ? removalProgress ?? "Removing photo background…" : foregroundPhoto ? "Background removed — your cutout is ready." : "A clean photo cutout is required for this card."}</p>}</div>
          {photo && <div className="rounded-2xl border bg-muted/30 p-4"><div className="mb-4 flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-primary" /><h2 className="text-sm font-semibold">Fine-tune photo</h2><button type="button" onClick={() => { setZoom(1); setPositionX(0); setPositionY(0); }} className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"><RotateCcw className="h-3.5 w-3.5" /> Reset</button></div><div className="grid gap-4 sm:grid-cols-3"><RangeControl label="Zoom" value={zoom} min={1} max={2.5} step={0.05} onChange={setZoom} /><RangeControl label="Horizontal" value={positionX} min={-1} max={1} step={0.05} onChange={setPositionX} /><RangeControl label="Vertical" value={positionY} min={-1} max={1} step={0.05} onChange={setPositionY} /></div></div>}
          {mode === "card" && <div className="space-y-4"><div className="flex items-baseline justify-between"><Label>2. Add your details</Label><span className="text-xs text-muted-foreground">Only name is required</span></div><Field label="Name" error={errors.name?.message}><Input placeholder="Your name" autoComplete="name" {...register("name")} /></Field><Field label="Stack / Role" error={errors.role?.message}><Input placeholder="e.g. Product designer" {...register("role")} /></Field><Field label="Builder title" error={errors.title?.message}><Input placeholder="e.g. Community builder" {...register("title")} /></Field></div>}
          <Button type="submit" size="lg" className="w-full" disabled={isGenerating || (mode === "card" && isRemovingBackground)}>{isGenerating || (mode === "card" && isRemovingBackground) ? <><Loader2 className="h-4 w-4 animate-spin" /> {isRemovingBackground ? "Removing background…" : "Creating…"}</> : <><Sparkles className="h-4 w-4" /> Generate {mode === "frame" ? "frame" : "ID card"}</>}</Button>
          {notice && <p role="status" className={`rounded-xl px-3 py-2 text-sm ${notice.kind === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{notice.text}</p>}
        </form>
      </section>
      <aside className="lg:sticky lg:top-6">
        <div className="overflow-hidden rounded-3xl border bg-card p-4 shadow-soft sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Preview</h2>
              <p className="text-xs text-muted-foreground">High-resolution export</p>
            </div>
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">PNG</span>
          </div>
          <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#e3eee6] to-[#f7f5ee] ${mode === "card" ? "aspect-[7/12]" : "aspect-[4/5]"}`}>
            {generatedImage ? (
              <img src={generatedImage} alt={generatedLabel} className="h-full w-full object-contain" />
            ) : mode === "card" ? (
              <>
                <img
                  src="/api/template?layer=card"
                  alt="Hacker House Goa ID card template"
                  className="absolute inset-0 h-full w-full object-cover"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
                {previewUrl && (
                  <div
                    className="absolute overflow-hidden"
                    style={{
                      left: `${((TemplateConfig.cardPhoto ?? TemplateConfig.photo).x / (TemplateConfig.cardCanvas ?? TemplateConfig.canvas).width) * 100}%`,
                      top: `${((TemplateConfig.cardPhoto ?? TemplateConfig.photo).y / (TemplateConfig.cardCanvas ?? TemplateConfig.canvas).height) * 100}%`,
                      width: `${((TemplateConfig.cardPhoto ?? TemplateConfig.photo).width / (TemplateConfig.cardCanvas ?? TemplateConfig.canvas).width) * 100}%`,
                      height: `${((TemplateConfig.cardPhoto ?? TemplateConfig.photo).height / (TemplateConfig.cardCanvas ?? TemplateConfig.canvas).height) * 100}%`,
                      borderRadius: (TemplateConfig.cardPhoto ?? TemplateConfig.photo).radius > 0 ? "50%" : "0%",
                    }}
                  >
                    <img
                      src={foregroundPreviewUrl ?? previewUrl}
                      alt="Photo cutout preview"
                      className="h-full w-full object-cover"
                      style={transformStyle}
                    />
                  </div>
                )}
                <img
                  src="/api/template?layer=overlay"
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
                {!previewUrl && (
                  <div className="absolute inset-x-8 top-[42%] rounded-xl bg-[#1e3d2b]/85 px-3 py-2 text-center text-xs font-semibold text-[#f4c93b]">
                    Your background-free photo will appear here
                  </div>
                )}
              </>
            ) : (
              <>
                <img
                  src="/api/template?layer=background"
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 h-full w-full object-cover"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
                {previewUrl && (
                  <div
                    className="absolute overflow-hidden"
                    style={{
                      left: `${(TemplateConfig.photo.x / TemplateConfig.canvas.width) * 100}%`,
                      top: `${(TemplateConfig.photo.y / TemplateConfig.canvas.height) * 100}%`,
                      width: `${(TemplateConfig.photo.width / TemplateConfig.canvas.width) * 100}%`,
                      height: `${(TemplateConfig.photo.height / TemplateConfig.canvas.height) * 100}%`,
                      borderRadius: TemplateConfig.photo.radius > 0 ? "50%" : "0%",
                    }}
                  >
                    <img
                      src={previewUrl}
                      alt="Photo preview"
                      className="h-full w-full object-cover"
                      style={transformStyle}
                    />
                  </div>
                )}
                <img
                  src="/api/template?layer=frame"
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
                {!previewUrl && (
                  <div className="absolute inset-0 grid place-items-center p-8 text-center">
                    <div>
                      <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-white shadow-sm">
                        <Sparkles className="h-6 w-6 text-primary" />
                      </div>
                      <p className="text-sm font-semibold">Your design appears here</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        Upload a photo, then create your profile frame.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        {generatedImage && <div className="mt-4 grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => void render("png", true)} disabled={isGenerating}><Download className="h-4 w-4" /> PNG</Button><Button variant="outline" onClick={() => void render("jpeg", true)} disabled={isGenerating}><Download className="h-4 w-4" /> JPG</Button><Button className="col-span-2" onClick={shareOnX}><Share2 className="h-4 w-4" /> Share on X</Button></div>}
      </div><p className="mt-3 px-2 text-center text-xs leading-5 text-muted-foreground">Your upload is processed only to create this image. Background removal runs locally in your browser; this app does not store photos.</p></aside>
    </div>
  </main>;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) { return <div className="space-y-1.5"><Label>{label}</Label>{children}{error && <p className="text-xs text-red-600">{error}</p>}</div>; }
function RangeControl({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void }) { return <label className="block text-xs font-semibold text-muted-foreground">{label}<input className="mt-2 w-full accent-[hsl(var(--primary))]" type="range" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.target.value))} /></label>; }
