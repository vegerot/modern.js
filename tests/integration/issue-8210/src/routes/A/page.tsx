import { useLoaderData } from '@modern-js/runtime/router';

export default function Page() {
  const data = useLoaderData();
  if (process.env.NODE_ENV !== 'production') {
    console.log('AData', data);
  }

  return <div>A Page</div>;
}
