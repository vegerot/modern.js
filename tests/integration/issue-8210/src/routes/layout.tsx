import { Outlet, useLoaderData } from '@modern-js/runtime/router';

type LayoutData = {
  key1: {
    subkey1: string;
  };
};

export default function Layout() {
  const data = useLoaderData() as LayoutData;
  if (process.env.NODE_ENV !== 'production') {
    console.log('layout subkey1', data.key1.subkey1);
  }

  return (
    <div>
      <header>Issue 8210 Layout</header>
      <Outlet />
    </div>
  );
}
