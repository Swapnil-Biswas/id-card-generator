"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Download, Loader2, RotateCcw, Share2, SlidersHorizontal, Sparkles, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { Results, SelfieSegmentation } from "@mediapipe/selfie_segmentation";
import { generateImageAction, normalizePhotoForSegmentationAction } from "@/app/actions";
import { GoaBeachHero } from "@/components/goa-beach-hero";
import { ImageUploader } from "@/components/image-uploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TabButton } from "@/components/ui/tabs";
import { ShareConfig, TemplateConfig } from "@/config/template";
import { dataUrlToBlob } from "@/lib/utils";
import type { GeneratorMode } from "@/renderer/types";

const formSchema = z.object({
  name: z.string().trim().max(80, "Keep the name under 80 characters."),
  role: z.string().trim().max(80, "Keep the role under 80 characters."),
  title: z.string().trim().max(80, "Keep the title under 80 characters."),
});
type FormValues = z.infer<typeof formSchema>;
type Notice = { kind: "error" | "success"; text: string } | null;

let segmenterPromise: Promise<SelfieSegmentation> | null = null;

function getSegmenter() {
  if (!segmenterPromise) {
    segmenterPromise = import("@mediapipe/selfie_segmentation").then(async ({ SelfieSegmentation }) => {
      const segmenter = new SelfieSegmentation({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1.1675465747/${file}`
      });
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
  const [generatedCardId, setGeneratedCardId] = useState<string | null>(null);
  const [generatedVerifyUrl, setGeneratedVerifyUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [zoom, setZoom] = useState(1);
  const [positionX, setPositionX] = useState(0);
  const [positionY, setPositionY] = useState(0);
  const removalRequest = useRef(0);
  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null);
  const { register, handleSubmit, getValues, watch, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: { name: "", role: "", title: "" } });
  const watchName = watch("name");
  const watchRole = watch("role");
  const watchTitle = watch("title");

  const transformStyle = useMemo(() => {
    if (!imageAspectRatio) return undefined;
    const config = TemplateConfig;
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

  const nameFontSize = useMemo(() => {
    if (!watchName) return TemplateConfig.name.fontSize;
    let size = TemplateConfig.name.fontSize;
    const maxW = TemplateConfig.name.width;
    const charRatio = 0.68;
    while (watchName.length * size * charRatio > maxW && size > TemplateConfig.name.minFontSize) {
      size -= 1;
    }
    return size;
  }, [watchName]);

  const roleFontSize = useMemo(() => {
    if (!watchRole) return TemplateConfig.role.fontSize;
    let size = TemplateConfig.role.fontSize;
    const maxW = TemplateConfig.role.width;
    const charRatio = 0.60;
    while (watchRole.length * size * charRatio > maxW && size > TemplateConfig.role.minFontSize) {
      size -= 1;
    }
    return size;
  }, [watchRole]);

  const titleFontSize = useMemo(() => {
    if (!watchTitle) return TemplateConfig.title.fontSize;
    let size = TemplateConfig.title.fontSize;
    const maxW = TemplateConfig.title.width;
    const charRatio = 0.60;
    while (watchTitle.length * size * charRatio > maxW && size > TemplateConfig.title.minFontSize) {
      size -= 1;
    }
    return size;
  }, [watchTitle]);

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
    setGeneratedCardId(null);
    setGeneratedVerifyUrl(null);
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
    setRemovalProgress("Preparing photo cutout…");
    try {
      setRemovalProgress("Creating clean cutout…");
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
      if (requestId === removalRequest.current) setNotice({ kind: "error", text: error instanceof Error ? "Background removal failed. Try a clear, well-lit portrait photo." : "Background removal failed." });
    } finally {
      if (requestId === removalRequest.current) setIsRemovingBackground(false);
    }
  }

  async function render(format: "png" | "jpeg" = "png", download = false) {
    if (!photo) { setNotice({ kind: "error", text: "Choose a photo to continue." }); return; }
    if (mode === "card" && isRemovingBackground) { setNotice({ kind: "error", text: "Your photo cutout is still being prepared." }); return; }
    if (mode === "card" && !foregroundPhoto) { setNotice({ kind: "error", text: "A photo cutout is required before creating the card." }); return; }
    const values = getValues();
    if (mode === "card" && !values.name.trim()) { setNotice({ kind: "error", text: "Enter your name for the ID card." }); return; }
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
      if (response.cardId) setGeneratedCardId(response.cardId);
      if (response.verifyUrl) setGeneratedVerifyUrl(response.verifyUrl);
      setNotice({ kind: "success", text: "Your ID card is generated and verified!" });
    }
  }

  const onSubmit = () => void render();
  function shareOnX() {
    const href = `https://x.com/intent/tweet?text=${encodeURIComponent(ShareConfig.text)}${ShareConfig.url ? `&url=${encodeURIComponent(ShareConfig.url)}` : ""}`;
    window.open(href, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="min-h-screen bg-goa-grid">
      {/* Top Header Banner matching hhgoa.com */}
      <header className="border-b border-[#F4C93B]/20 bg-[#062C1B]/95 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-extrabold tracking-widest text-[#F4C93B]">
              2:47 PM STUDIO
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-block font-mono text-xs tracking-wider text-[#8EB89B]">
              GOA, INDIA · 28–31 OCT 2026
            </span>
            <a
              href="https://hhgoa.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-xl bg-[#F4C93B] px-3.5 py-1.5 font-mono text-xs font-bold text-[#062C1B] hover:bg-[#FFDC65] transition shadow-md glow-gold"
            >
              HHGOA.COM
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        {/* Main Title Hero */}
        <div className="mb-8 text-center sm:mb-12">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#F4C93B]/30 bg-[#093823]/80 px-4 py-1.5 text-xs font-mono font-bold tracking-wider text-[#F4C93B]">
            <Sparkles className="h-3.5 w-3.5 text-[#F4C93B]" />
            OFFICIAL ID GENERATOR
          </div>

          <h1 className="font-syne text-4xl font-extrabold uppercase tracking-tight text-[#F4C93B] sm:text-6xl md:text-7xl">
            HACKER <span className="inline-block rounded-xl bg-[#D94F8C] px-3 py-1 font-syne text-2xl text-white sm:text-4xl glow-pink transform -rotate-2">गोवा</span> HOUSE
          </h1>

          <p className="mx-auto mt-3 max-w-xl font-mono text-xs leading-relaxed text-[#8EB89B] sm:text-sm">
            BUILD · SHIP · LAUNCH · GOA INDIA 2026
          </p>
        </div>

        {/* Goa Beach Sunset Illustration Hero */}
        <GoaBeachHero />

        {/* Generator Workspace Grid */}
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(380px,0.85fr)] lg:items-start">
          {/* Controls Form Card */}
          <section className="glass-panel rounded-3xl p-5 sm:p-7 shadow-2xl">
            {/* Mode Switcher Tabs */}
            <div className="mb-7 rounded-2xl bg-[#062C1B] p-1.5 border border-[#175B3B]" role="tablist">
              <TabButton active={mode === "card"} onClick={() => { setMode("card"); setGeneratedImage(null); setGeneratedCardId(null); setGeneratedVerifyUrl(null); }}>
                Builder ID Card
              </TabButton>
              <TabButton active={mode === "frame"} onClick={() => { setMode("frame"); setGeneratedImage(null); setGeneratedCardId(null); setGeneratedVerifyUrl(null); }}>
                Profile Frame
              </TabButton>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Step 1: Upload */}
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <Label>[01] Upload Portrait Photo</Label>
                  <span className="font-mono text-[10px] text-[#8EB89B]">Smart cutout included</span>
                </div>
                <ImageUploader file={photo} previewUrl={previewUrl} onChange={changePhoto} />
                {mode === "card" && photo && (
                  <p className="mt-2 text-xs font-mono text-[#8EB89B]">
                    {isRemovingBackground ? removalProgress ?? "Extracting photo background…" : foregroundPhoto ? "✅ Background removed — cutout ready!" : "Processing portrait cutout…"}
                  </p>
                )}
              </div>

              {/* Step 2: Fine-tune sliders */}
              {photo && (
                <div className="rounded-2xl border border-[#175B3B] bg-[#062C1B]/80 p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="h-4 w-4 text-[#F4C93B]" />
                      <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#F4C93B]">
                        [02] Fine-tune Photo Scale & Position
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setZoom(1); setPositionX(0); setPositionY(0); }}
                      className="inline-flex items-center gap-1 text-xs font-mono text-[#8EB89B] hover:text-[#F4C93B] transition"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Reset
                    </button>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <RangeControl label="Zoom" value={zoom} min={1} max={2.5} step={0.05} onChange={setZoom} />
                    <RangeControl label="Horizontal" value={positionX} min={-1} max={1} step={0.05} onChange={setPositionX} />
                    <RangeControl label="Vertical" value={positionY} min={-1} max={1} step={0.05} onChange={setPositionY} />
                  </div>
                </div>
              )}

              {/* Step 3: Details (if ID Card mode) */}
              {mode === "card" && (
                <div className="space-y-4 pt-2">
                  <div className="flex items-baseline justify-between">
                    <Label>[03] Builder Credentials</Label>
                    <span className="font-mono text-[10px] text-[#8EB89B]">Name required</span>
                  </div>

                  <Field label="Full Name" error={errors.name?.message}>
                    <Input placeholder="Satoshi Nakamoto" autoComplete="name" {...register("name")} />
                  </Field>

                  <Field label="Stack / Role" error={errors.role?.message}>
                    <Input placeholder="e.g. Smart Contract Architect" {...register("role")} />
                  </Field>

                  <Field label="Builder Title" error={errors.title?.message}>
                    <Input placeholder="e.g. Core Protocol Fellow" {...register("title")} />
                  </Field>
                </div>
              )}

              {/* Submit CTA */}
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={isGenerating || (mode === "card" && isRemovingBackground)}
              >
                {isGenerating || (mode === "card" && isRemovingBackground) ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-[#062C1B]" />
                    {isRemovingBackground ? "Preparing Cutout…" : "Rendering ID Card…"}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 text-[#062C1B]" />
                    Generate Verified {mode === "frame" ? "Profile Frame" : "ID Card"}
                  </>
                )}
              </Button>

              {notice && (
                <p
                  role="status"
                  className={`rounded-2xl p-3.5 text-xs font-mono border ${
                    notice.kind === "error"
                      ? "bg-red-500/15 border-red-500/30 text-red-400"
                      : "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                  }`}
                >
                  {notice.text}
                </p>
              )}
            </form>
          </section>

          {/* Right Column: Live Card Preview & Actions */}
          <aside className="lg:sticky lg:top-20 space-y-4">
            <div className="glass-panel rounded-3xl p-5 sm:p-6 shadow-2xl">
              <div className="mb-4 flex items-center justify-between border-b border-[#175B3B] pb-3">
                <div>
                  <h2 className="font-mono text-sm font-bold uppercase tracking-wider text-[#F4C93B]">
                    High-Res Card Preview
                  </h2>
                  <p className="font-mono text-[10px] text-[#8EB89B]">
                    Includes QR Code Verification Box
                  </p>
                </div>
                <span className="rounded-full bg-[#062C1B] border border-[#F4C93B]/30 px-3 py-1 font-mono text-[10px] font-bold text-[#F4C93B]">
                  PNG / 300 DPI
                </span>
              </div>

              {/* Canvas Preview Container */}
              <div
                className={`relative overflow-hidden rounded-2xl border border-[#F4C93B]/30 bg-[#062C1B] shadow-inner ${
                  mode === "card" ? "aspect-[7/12]" : "aspect-[4/5]"
                }`}
              >
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

                    {/* Live Text Overlay in Card Preview */}
                    <div className="absolute inset-0 pointer-events-none [container-type:size]">
                      {watchName && (
                        <div
                          className="absolute font-black whitespace-nowrap overflow-hidden text-ellipsis"
                          style={{
                            left: `${(TemplateConfig.name.x / 420) * 100}%`,
                            top: `${(TemplateConfig.name.y / 720) * 100}%`,
                            width: `${(TemplateConfig.name.width / 420) * 100}%`,
                            height: `${(TemplateConfig.name.height / 720) * 100}%`,
                            fontSize: `${(nameFontSize / 420) * 100}cqw`,
                            color: TemplateConfig.name.color,
                            fontFamily: TemplateConfig.name.fontFamily,
                            lineHeight: 1,
                          }}
                        >
                          {watchName}
                        </div>
                      )}
                      {watchRole && (
                        <div
                          className="absolute font-bold whitespace-nowrap overflow-hidden text-ellipsis"
                          style={{
                            left: `${(TemplateConfig.role.x / 420) * 100}%`,
                            top: `${(TemplateConfig.role.y / 720) * 100}%`,
                            width: `${(TemplateConfig.role.width / 420) * 100}%`,
                            height: `${(TemplateConfig.role.height / 720) * 100}%`,
                            fontSize: `${(roleFontSize / 420) * 100}cqw`,
                            color: TemplateConfig.role.color,
                            fontFamily: TemplateConfig.role.fontFamily,
                            lineHeight: 1,
                          }}
                        >
                          {watchRole}
                        </div>
                      )}
                      {watchTitle && (
                        <div
                          className="absolute font-bold whitespace-nowrap overflow-hidden text-ellipsis"
                          style={{
                            left: `${(TemplateConfig.title.x / 420) * 100}%`,
                            top: `${(TemplateConfig.title.y / 720) * 100}%`,
                            width: `${(TemplateConfig.title.width / 420) * 100}%`,
                            height: `${(TemplateConfig.title.height / 720) * 100}%`,
                            fontSize: `${(titleFontSize / 420) * 100}cqw`,
                            color: TemplateConfig.title.color,
                            fontFamily: TemplateConfig.title.fontFamily,
                            lineHeight: 1,
                          }}
                        >
                          {watchTitle}
                        </div>
                      )}
                    </div>

                    {!previewUrl && (
                      <div className="absolute inset-x-6 top-[40%] rounded-2xl border border-[#F4C93B]/40 bg-[#062C1B]/90 p-4 text-center glass-panel">
                        <Sparkles className="mx-auto mb-2 h-6 w-6 text-[#F4C93B]" />
                        <p className="font-mono text-xs font-bold text-[#F4C93B]">YOUR PHOTO CUTOUT & QR CODE</p>
                        <p className="mt-1 font-mono text-[10px] text-[#8EB89B]">Upload a photo to see live template preview</p>
                      </div>
                    )}
                  </>
                ) : previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Photo preview"
                    className="h-full w-full object-cover"
                    style={{ transform: `scale(${zoom}) translate(${positionX * -16}%, ${positionY * -16}%)` }}
                  />
                ) : (
                  <div className="absolute inset-0 grid place-items-center p-6 text-center">
                    <div>
                      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-[#093823] border border-[#F4C93B]/30 text-[#F4C93B]">
                        <Sparkles className="h-6 w-6" />
                      </div>
                      <p className="font-mono text-xs font-bold text-[#F4F1EA]">YOUR DESIGN APPEARS HERE</p>
                      <p className="mt-1 font-mono text-[10px] text-[#8EB89B]">Upload a photo to start creating</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons when Generated */}
              {generatedImage && (
                <div className="mt-5 grid grid-cols-2 gap-2.5">
                  <Button variant="outline" onClick={() => void render("png", true)} disabled={isGenerating}>
                    <Download className="h-4 w-4" /> Download PNG
                  </Button>
                  <Button variant="outline" onClick={() => void render("jpeg", true)} disabled={isGenerating}>
                    <Download className="h-4 w-4" /> Download JPG
                  </Button>
                  <Button className="col-span-2" onClick={shareOnX}>
                    <Share2 className="h-4 w-4" /> Share on X / Twitter
                  </Button>
                  {generatedCardId && (
                    <a
                      href={`/verify/${generatedCardId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="col-span-2 inline-flex items-center justify-center gap-2 rounded-2xl border border-[#F4C93B]/40 bg-[#093823] px-4 py-3 font-mono text-xs font-bold text-[#F4C93B] hover:bg-[#0F4D31] transition shadow-md"
                    >
                      <ShieldCheck className="h-4 w-4 text-[#F4C93B]" /> Open Web3 Verification Page
                    </a>
                  )}
                </div>
              )}
            </div>

            <p className="px-2 text-center font-mono text-[10px] leading-relaxed text-[#8EB89B]">
              Photos are processed locally in your browser to remove background and composite credentials. No photo data is logged or retained.
            </p>
          </aside>
        </div>
      </main>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="font-mono text-xs text-red-400">{error}</p>}
    </div>
  );
}

function RangeControl({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void }) {
  return (
    <label className="block font-mono text-xs font-bold text-[#8EB89B]">
      {label}
      <input
        className="mt-2.5 w-full accent-[#F4C93B] cursor-pointer"
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
