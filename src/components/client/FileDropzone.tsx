import { useRef, useState } from "react";
import { FileUp } from "lucide-react";

interface FileDropzoneProps {
  files: File[];
  setFiles: (files: File[]) => void;
}

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
];

const MAX_SIZE_BYTES = 10 * 1024 * 1024;

export default function FileDropzone({ files, setFiles }: FileDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const append = (list: FileList | null) => {
    if (!list) return;
    const incoming = Array.from(list).filter((file) => ACCEPTED_TYPES.includes(file.type) && file.size <= MAX_SIZE_BYTES);
    const deduped = incoming.filter(
      (item) => !files.some((existing) => existing.name === item.name && existing.size === item.size && existing.lastModified === item.lastModified)
    );
    setFiles([...files, ...deduped]);
  };

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.jpg,.jpeg,.png"
        className="hidden"
        onChange={(event) => append(event.target.files)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragOver(false);
          append(event.dataTransfer.files);
        }}
        className={`w-full rounded-xl border-2 border-dashed p-8 text-center transition ${
          isDragOver ? "border-cyan bg-cyan/10" : "border-cyan/60 bg-cyan/5"
        }`}
      >
        <FileUp className="mx-auto mb-2 h-6 w-6 text-cyan" />
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Glissez-deposez vos fichiers ici</p>
        <p className="text-xs text-slate-500">PDF, DOCX, JPG, PNG - max 10MB</p>
      </button>
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div key={`${file.name}-${index}`} className="rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
              {file.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
