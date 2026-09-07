import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout.js';

export function NotFoundPage() {
  return (
    <Layout>
      <div className="py-20 text-center">
        <div className="text-6xl font-bold text-slate-300">404</div>
        <h1 className="mt-4 text-xl font-bold text-slate-700">Page not found</h1>
        <p className="mt-2 text-slate-500">The page you are looking for does not exist.</p>
        <Link to="/" className="btn-primary mt-6 inline-flex">
          Back to home
        </Link>
      </div>
    </Layout>
  );
}
