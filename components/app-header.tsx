'use client';

import { BriefcaseBusiness, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/i18n';

const navLinks = [
  ['dashboard', '#dashboard'],
  ['datasets', '#dataset'],
  ['scenarios', '#scenarios'],
  ['about', '#about'],
] as const;

export function AppHeader() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <header className="sticky top-0 z-30 border-b bg-background/92 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1480px] items-center justify-between gap-4 px-5 lg:px-8">
        <a href="#dashboard" className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <BriefcaseBusiness className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold tracking-tight">
              {t('productName')}
            </span>
            <span className="hidden text-[11px] text-muted-foreground sm:block">
              {t('productTagline')}
            </span>
          </span>
        </a>

        <nav className="hidden items-center gap-1 text-sm lg:flex" aria-label="Primary">
          {navLinks.map(([key, href], index) => (
            <a
              key={key}
              href={href}
              className={
                index === 0
                  ? 'rounded-md bg-secondary px-3 py-2 font-medium'
                  : 'rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground'
              }
            >
              {t(key)}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1 rounded-lg border bg-card p-1 text-xs font-medium">
          <button
            type="button"
            aria-label={t('switchEnglish')}
            aria-pressed={language === 'en'}
            onClick={() => setLanguage('en')}
            className={`rounded-md px-2.5 py-1.5 transition-colors ${
              language === 'en'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            English
          </button>
          <button
            type="button"
            aria-label={t('switchChinese')}
            aria-pressed={language === 'zh'}
            onClick={() => setLanguage('zh')}
            className={`rounded-md px-2.5 py-1.5 transition-colors ${
              language === 'zh'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            中文
          </button>
        </div>
        <Button className="sr-only" variant="ghost" size="icon" aria-label="Menu">
          <Menu />
        </Button>
      </div>
    </header>
  );
}
