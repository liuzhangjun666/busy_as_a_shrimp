import Link from "next/link";

const ICP_RECORD_URL = "https://beian.miit.gov.cn/";

export function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200/80 bg-white/72 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-center px-4 py-5 text-[13px] text-slate-500 md:px-6">
        <nav className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-center">
          <p className="font-medium text-slate-400">© {currentYear} 虾忙</p>
          <span className="text-slate-300">·</span>
          <a
            href={ICP_RECORD_URL}
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-slate-700"
          >
            京ICP备2024085704号-8
          </a>
          <span className="text-slate-300">·</span>
          <Link href="/privacy" className="transition-colors hover:text-slate-700">
            隐私政策
          </Link>
          <span className="text-slate-300">·</span>
          <Link href="/terms" className="transition-colors hover:text-slate-700">
            用户协议
          </Link>
        </nav>
      </div>
    </footer>
  );
}
