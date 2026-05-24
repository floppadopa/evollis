"use client";

import "./_css/ChatComposer.css";
import {
  useRef,
  useState,
  useCallback,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";

type ChatComposerProps = {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  /** Called with the text and any attached images (base64 data URLs). */
  onSubmit?: (value: string, images: string[]) => void;
  /** Enable the image-attachment control (off by default). */
  allowImages?: boolean;
};

const MAX_IMAGES = 6;

/** Read a File into a base64 data URL. */
function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function ChatComposer({
  placeholder = "Comment puis-je vous aider ?",
  value,
  onChange,
  onSubmit,
  allowImages = false,
}: ChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [internalValue, setInternalValue] = useState("");
  const [images, setImages] = useState<string[]>([]);

  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internalValue;
  const hasText = currentValue.trim().length > 0;
  const canSend = hasText || images.length > 0;

  const autoGrow = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  const handleSend = useCallback(() => {
    if (!canSend) return;
    onSubmit?.(currentValue, images);
    setImages([]);
  }, [canSend, currentValue, images, onSubmit]);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      const next = e.target.value;
      if (!isControlled) setInternalValue(next);
      onChange?.(next);
      autoGrow();
    },
    [isControlled, onChange, autoGrow],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleFiles = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter((f) =>
      f.type.startsWith("image/"),
    );
    e.target.value = ""; // allow re-selecting the same file
    if (files.length === 0) return;
    const dataUrls = await Promise.all(files.map(readAsDataURL));
    setImages((prev) => [...prev, ...dataUrls].slice(0, MAX_IMAGES));
  }, []);

  const removeImage = useCallback((index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const focusTextarea = useCallback(() => {
    textareaRef.current?.focus();
  }, []);

  return (
    <div onClick={focusTextarea} className="chat-composer">
      {images.length > 0 && (
        <div className="chat-composer-attachments">
          {images.map((src, i) => (
            <div key={i} className="chat-composer-thumb">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`Pièce jointe ${i + 1}`} />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeImage(i);
                }}
                aria-label={`Retirer la pièce jointe ${i + 1}`}
                className="chat-composer-thumb-remove"
              >
                <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M10 8.6 5.7 4.3a1 1 0 0 0-1.4 1.4L8.6 10l-4.3 4.3a1 1 0 1 0 1.4 1.4L10 11.4l4.3 4.3a1 1 0 0 0 1.4-1.4L11.4 10l4.3-4.3a1 1 0 0 0-1.4-1.4z" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <textarea
        ref={textareaRef}
        value={currentValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        rows={1}
        placeholder={placeholder}
        aria-label="Écrivez votre invite à Evollis."
        className="chat-composer-textarea"
      />

      <div className="chat-composer-toolbar">
        {allowImages && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFiles}
              className="chat-composer-file-input"
              aria-hidden="true"
              tabIndex={-1}
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              disabled={images.length >= MAX_IMAGES}
              aria-label="Joindre une image"
              title="Joindre une image"
              className="chat-composer-attach"
            >
              <svg width="18" height="18" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
                <path d="M209.66,122.34a8,8,0,0,1,0,11.32l-82.05,82a56,56,0,0,1-79.2-79.21L147.67,37.51a40,40,0,1,1,56.61,56.55L105,193.48a24,24,0,1,1-33.94-33.95l72.07-72a8,8,0,0,1,11.32,11.32l-72.08,72a8,8,0,1,0,11.32,11.31L193,82.74a24,24,0,1,0-33.95-33.94L59.32,148.63a40,40,0,1,0,56.57,56.56l82.05-82A8,8,0,0,1,209.66,122.34Z" />
              </svg>
            </button>
          </>
        )}

        <div className="chat-composer-spacer" />

        {canSend && (
          <button
            type="button"
            onClick={handleSend}
            aria-label="Envoyer le message"
            className="chat-composer-send"
          >
            <svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
              <path d="M208.49,120.49a12,12,0,0,1-17,0L140,69V216a12,12,0,0,1-24,0V69L64.49,120.49a12,12,0,0,1-17-17l72-72a12,12,0,0,1,17,0l72,72A12,12,0,0,1,208.49,120.49Z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
