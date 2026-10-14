import { AppShell } from '@/components/app-shell';

/** Todas las páginas internas (después del login) comparten el menú lateral. */
export default function AppLayout({ children }: LayoutProps<'/'>) {
  return <AppShell>{children}</AppShell>;
}
