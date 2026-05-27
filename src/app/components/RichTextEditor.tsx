import { useEffect, useRef } from "react";
import { Bold, Italic, Underline, Link2, ImagePlus, Type, Plus, Minus } from "lucide-react";
import { apiFetch } from "../api";

interface Props {
  value: string;
  token: string;
  onChange: (value: string) => void;
}

function hasMediaMarkup(html: string) {
  return /<(img|video|iframe|embed|object)\b/i.test(html);
}

export function htmlHasVisibleContent(html: string) {
  const text = html
    .replace(/<\/(p|div|h1|h2|h3|li|blockquote)>/gi, "\n")
    .replace(/<br\s*\/?>(\n)?/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return Boolean(text) || hasMediaMarkup(html);
}

export default function RichTextEditor({ value, token, onChange }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const savedRangeRef = useRef<Range | null>(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (editor.innerHTML !== value) {
      editor.innerHTML = value || "";
    }
  }, [value]);

  const syncValue = () => {
    const editor = editorRef.current;
    if (!editor) return;
    onChange(editor.innerHTML);
  };

  const saveSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (editorRef.current?.contains(range.commonAncestorContainer)) {
      savedRangeRef.current = range.cloneRange();
    }
  };

  const restoreSelection = () => {
    const selection = window.getSelection();
    const range = savedRangeRef.current;
    if (!selection || !range) return false;

    selection.removeAllRanges();
    selection.addRange(range);
    return true;
  };

  const applyCommand = (command: string, commandValue?: string) => {
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand(command, false, commandValue);
    syncValue();
  };

  const applyFontSize = (fontSize: string) => {
    editorRef.current?.focus();
    if (!restoreSelection()) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (range.collapsed) return;

    const span = document.createElement("span");
    span.style.fontSize = fontSize;
    span.appendChild(range.extractContents());
    range.insertNode(span);

    selection.removeAllRanges();
    const nextRange = document.createRange();
    nextRange.selectNodeContents(span);
    selection.addRange(nextRange);
    syncValue();
  };

  const insertHtml = (html: string) => {
    editorRef.current?.focus();
    const selection = window.getSelection();

    if (restoreSelection() && selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const fragment = range.createContextualFragment(html);
      const lastNode = fragment.lastChild;
      range.insertNode(fragment);

      if (lastNode) {
        range.setStartAfter(lastNode);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    } else {
      editorRef.current?.insertAdjacentHTML("beforeend", html);
    }

    syncValue();
  };

  const insertLink = () => {
    const url = window.prompt("Masukkan URL link");
    if (!url) return;

    applyCommand("createLink", url);
    const editor = editorRef.current;
    if (!editor) return;

    editor.querySelectorAll("a[href]").forEach((anchor) => {
      anchor.setAttribute("target", "_blank");
      anchor.setAttribute("rel", "noopener noreferrer");
    });

    syncValue();
  };

  const uploadMedia = async (file: File) => {
    const form = new FormData();
    form.append("file", file);

    const response = await apiFetch("/media", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Gagal mengunggah media");
    }

    const mediaPath = String(data.url || "");
    if (!mediaPath) {
      throw new Error("URL media tidak valid");
    }

    if (file.type.startsWith("video/")) {
      insertHtml(`<figure class="article-media"><video controls src="${mediaPath}"></video></figure>`);
      return;
    }

    insertHtml(`<figure class="article-media"><img src="${mediaPath}" alt="Gambar artikel" /></figure>`);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      await uploadMedia(file);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Gagal mengunggah media");
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const isShortcut = event.ctrlKey || event.metaKey;
    if (!isShortcut) return;

    const key = event.key.toLowerCase();
    if (key === "b") {
      event.preventDefault();
      applyCommand("bold");
    }
    if (key === "i") {
      event.preventDefault();
      applyCommand("italic");
    }
    if (key === "u") {
      event.preventDefault();
      applyCommand("underline");
    }
  };

  const toolbarButtonClass =
    "inline-flex items-center justify-center gap-1.5 rounded-full border border-blue-100 bg-white px-3 py-2 text-xs font-semibold text-[#1a2560] shadow-sm transition hover:border-[#8ea4f8] hover:bg-[#f7f9ff] active:scale-[0.98]";

  return (
    <div className="relative pb-28">
      <div className="rounded-[28px] border border-blue-100 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-blue-50 bg-[#f8faff] px-4 py-3 text-xs text-[#6b7ab8]">
          <span>Tulis seperti Medium. Ctrl+B, Ctrl+I, Ctrl+U aktif.</span>
          <span>Media tersimpan di backend.</span>
        </div>

        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={syncValue}
          onKeyDown={handleKeyDown}
          onMouseUp={saveSelection}
          onKeyUp={saveSelection}
          onBlur={saveSelection}
          className="min-h-[420px] px-5 py-5 outline-none text-[#1a2560] leading-8 text-[15px] sm:text-[16px]"
          data-placeholder="Mulai tulis artikel medis di sini..."
        />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*,video/*,image/gif"
        onChange={handleFileChange}
      />

      <style>{`
        [contenteditable='true']:empty:before {
          content: attr(data-placeholder);
          color: #94a3d3;
          pointer-events: none;
        }
        .article-media {
          margin: 1rem 0;
        }
        .article-media img,
        .article-media video {
          width: 100%;
          max-width: 100%;
          border-radius: 20px;
          display: block;
          box-shadow: 0 12px 35px rgba(91, 116, 245, 0.12);
        }
      `}</style>

      <div className="fixed bottom-4 left-1/2 z-40 w-[min(840px,calc(100vw-1rem))] -translate-x-1/2 px-1">
        <div className="flex flex-wrap items-center justify-center gap-2 rounded-full border border-blue-100 bg-white/95 px-3 py-3 shadow-xl backdrop-blur">
          <button type="button" className={toolbarButtonClass} onMouseDown={(e) => e.preventDefault()} onClick={() => applyCommand("bold")}>
            <Bold size={15} /> Bold
          </button>
          <button type="button" className={toolbarButtonClass} onMouseDown={(e) => e.preventDefault()} onClick={() => applyCommand("italic")}>
            <Italic size={15} /> Italic
          </button>
          <button type="button" className={toolbarButtonClass} onMouseDown={(e) => e.preventDefault()} onClick={() => applyCommand("underline")}>
            <Underline size={15} /> Underline
          </button>
          <button type="button" className={toolbarButtonClass} onMouseDown={(e) => e.preventDefault()} onClick={insertLink}>
            <Link2 size={15} /> Link
          </button>
          <button type="button" className={toolbarButtonClass} onMouseDown={(e) => e.preventDefault()} onClick={() => applyFontSize("1.18rem")}>
            <Plus size={15} /> Besarkan
          </button>
          <button type="button" className={toolbarButtonClass} onMouseDown={(e) => e.preventDefault()} onClick={() => applyFontSize("0.88rem")}>
            <Minus size={15} /> Kecilkan
          </button>
          <button type="button" className={toolbarButtonClass} onMouseDown={(e) => e.preventDefault()} onClick={() => fileInputRef.current?.click()}>
            <ImagePlus size={15} /> Gambar/Video
          </button>
          <button type="button" className={toolbarButtonClass} onMouseDown={(e) => e.preventDefault()} onClick={() => applyCommand("formatBlock", "h2")}>
            <Type size={15} /> Heading
          </button>
        </div>
      </div>
    </div>
  );
}