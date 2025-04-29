import React, { useState, useRef, useEffect } from "react";
import { Upload } from "lucide-react";
import { Slider } from "./components/slider";
import numeric from "numeric";

export default function ImageCompressor() {
  /* ──────── State ──────── */
  const [file, setFile] = useState(null);
  const [origURL, setOrigURL] = useState("");
  const [compressedURL, setCompressedURL] = useState("");
  const [k, setK] = useState(20);
  const [origSize, setOrigSize] = useState(0);
  const [compSize, setCompSize] = useState(0);
  const [isCompressing, setIsCompressing] = useState(false);

  const canvasRef = useRef(null);
  const genRef = useRef(0);

  /* ──────── Handlers ──────── */
  const handleUpload = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;

    if (origURL) URL.revokeObjectURL(origURL);
    if (compressedURL) URL.revokeObjectURL(compressedURL);

    setFile(f);
    setOrigURL(URL.createObjectURL(f));
    setOrigSize(f.size);
    setCompressedURL("");
    setCompSize(0);
  };

  /* ──────── SVD Compression Core ──────── */
  const compressImage = async (kValue) => {
    if (!file) return;
    const myGen = ++genRef.current;
    setIsCompressing(true);

    const img = new Image();
    img.src = origURL;
    await img.decode();

    const canvas = canvasRef.current;
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const { data, width, height } = ctx.getImageData(0, 0, img.width, img.height);

    /* Build grayscale matrix */
    const gray = Array.from({ length: height }, (_, r) =>
      Array.from({ length: width }, (_, c) => {
        const idx = (r * width + c) * 4;
        const [R, G, B] = [data[idx], data[idx + 1], data[idx + 2]];
        return 0.299 * R + 0.587 * G + 0.114 * B;
      })
    );

    /* Ensure rows ≥ cols for numeric.svd */
    const tall = height >= width;
    const mat = tall ? gray : numeric.transpose(gray);
    const m = mat.length;
    const n = mat[0].length;
    const maxRank = Math.min(m, n);
    const kEff = Math.min(kValue, maxRank);

    const { U, S, V } = numeric.svd(mat);

    const Uk = U.map((row) => row.slice(0, kEff));
    const Sk = numeric.diag(S.slice(0, kEff));
    const VkT = V.map((row) => row.slice(0, kEff));
    let recon = numeric.dot(Uk, numeric.dot(Sk, numeric.transpose(VkT)));

    if (!tall) recon = numeric.transpose(recon); // transpose back for wide images

    /* Write to canvas */
    const out = ctx.createImageData(width, height);
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        const lum = Math.min(Math.max(recon[r][c], 0), 255);
        const idx = (r * width + c) * 4;
        out.data[idx] = out.data[idx + 1] = out.data[idx + 2] = lum;
        out.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(out, 0, 0);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));

    if (genRef.current !== myGen) return;
    if (compressedURL) URL.revokeObjectURL(compressedURL);

    setCompSize(blob.size);
    setCompressedURL(URL.createObjectURL(blob));
    setIsCompressing(false);
  };

  useEffect(() => {
    if (file) compressImage(k);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [k, file]);

  useEffect(() => () => {
    if (origURL) URL.revokeObjectURL(origURL);
    if (compressedURL) URL.revokeObjectURL(compressedURL);
  }, [origURL, compressedURL]);

  /* ──────── Render ──────── */
  return (
    <div className="mx-auto max-w-4xl p-6 space-y-8">
      <h1 className="text-3xl font-bold text-center">Image Compressor (SVD)</h1>

      {/* Upload */}
      <label className="flex items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
        <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
        <span className="flex flex-col items-center gap-2 text-gray-600">
          <Upload className="w-6 h-6" />
          <span>Select or drag an image here</span>
        </span>
      </label>

      {/* Slider */}
      <div className="space-y-2">
        <span className="text-sm font-medium">Compression Level (k): {k}</span>
        <Slider min={1} max={100} step={1} value={[k]} onValueChange={([val]) => setK(val)} />
      </div>

      {/* Preview & Stats */}
      {origURL && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ImageBox title="Original" src={origURL} />
          <ImageBox
            title={`Compressed (k = ${k})`}
            src={compressedURL}
            placeholder={isCompressing && "Compressing…"}
          />
          <StatsBar orig={origSize} comp={compSize} />
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

/* ——— Helper components ——— */
const ImageBox = ({ title, src, placeholder }) => (
  <div className="space-y-4">
    <h2 className="text-center font-semibold">{title}</h2>
    {src ? (
      <img src={src} alt={title} className="rounded-xl shadow" />
    ) : (
      <p className="text-center italic text-gray-500">{placeholder}</p>
    )}
  </div>
);

const StatsBar = ({ orig, comp }) => (
  <div className="col-span-full flex justify-center">
    <div className="flex gap-8 bg-gray-50 rounded-xl p-4 shadow-inner">
      <Stat label="Original" value={formatBytes(orig)} />
      <Stat label="Compressed" value={comp ? formatBytes(comp) : "—"} />
      <Stat label="Ratio" value={comp ? `${((comp / orig) * 100).toFixed(1)}%` : "—"} />
    </div>
  </div>
);

const Stat = ({ label, value }) => (
  <div className="text-center">
    <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
    <p className="font-mono font-semibold">{value}</p>
  </div>
);

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}
