import { Facebook, MessageCircle } from 'lucide-react';
import { FACEBOOK_URL, WHATSAPP_BASE_URL } from '../lib/whatsapp';

export default function Footer() {
  return (
    <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-800 bg-black text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-2 sm:px-6 sm:py-2.5 lg:px-8">
        {/* Store Identity */}
        <div className="flex items-center gap-2 text-right">
          <span className="inline-block h-5 w-1 rounded-full bg-[#EA580C] sm:h-6 sm:w-1.5" aria-hidden="true" />
          <div className="leading-tight">
            <span className="block text-sm font-extrabold text-white sm:text-base">فواكه إسلام</span>
            <span className="block text-[10px] font-semibold text-[#EA580C] sm:text-[11px]">
              أجود انواع الفواكه
            </span>
          </div>
        </div>

        {/* 2 Orange Social Icons strictly in Fixed Solid Black Footer */}
        <div className="flex items-center gap-2.5">
          <a
            href={WHATSAPP_BASE_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="تواصل عبر واتساب"
            title="واتساب"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EA580C] text-white transition-transform duration-150 hover:-translate-y-0.5 hover:bg-[#C2410C] sm:h-10 sm:w-10 sm:rounded-xl"
          >
            <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
          </a>

          <a
            href={FACEBOOK_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="صفحة فيسبوك فواكه إسلام"
            title="فيسبوك"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EA580C] text-white transition-transform duration-150 hover:-translate-y-0.5 hover:bg-[#C2410C] sm:h-10 sm:w-10 sm:rounded-xl"
          >
            <Facebook className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
          </a>
        </div>
      </div>
    </footer>
  );
}
