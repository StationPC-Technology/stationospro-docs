import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { baseOptions } from '@/lib/layout.shared';

export default async function Layout({ params, children }: LayoutProps<'/[lang]'>) {
  const { lang } = await params;
  // 首页自带内联搜索，顶栏不再放搜索按钮，避免两个搜索框争注意力
  return (
    <HomeLayout {...baseOptions(lang)} searchToggle={{ enabled: false }}>
      {children}
    </HomeLayout>
  );
}
