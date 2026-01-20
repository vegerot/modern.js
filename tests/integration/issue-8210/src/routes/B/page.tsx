import { Link } from '@modern-js/runtime/router';

export default function Page() {
  return (
    <div>
      <div>B Page</div>
      <Link to="/A">Go to A</Link>
      <Link to="/A?isProblem=true">Go to A with problem</Link>
    </div>
  );
}
