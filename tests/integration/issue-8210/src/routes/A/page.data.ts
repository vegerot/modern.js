import { redirect } from '@modern-js/runtime/router';

export const loader = ({ request }: { request: Request }) => {
  const url = new URL(request.url);
  const isProblem = url.searchParams.get('isProblem');

  if (isProblem === 'true') {
    return redirect('/A?isProblem=false');
  }

  return {
    A: {
      aKey3: 'value3',
    },
  };
};
