"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { PrivacyContent } from "@/components/privacy-content";

export function PrivacyModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} maxWidthClass="max-w-2xl">
      {/* Non-scrolling header row keeps the ✕ clear of the content scrollbar. */}
      <div className="-mr-1 -mt-1 mb-3 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          aria-label="關閉"
          className="btn btn-ghost h-8 w-8 !p-0 text-lg text-ink-soft"
        >
          ✕
        </button>
      </div>
      <div className="max-h-[72vh] overflow-y-auto pr-3">
        <PrivacyContent compact />
      </div>
    </Modal>
  );
}

/**
 * A text trigger that opens the privacy popup. Drop-in replacement anywhere a
 * "隱私說明" link is wanted, while /privacy still exists as a real page.
 */
export function PrivacyLink({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      <PrivacyModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
