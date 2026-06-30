import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ backgroundColor: '#F7F3ED' }}
    >
      <div className="text-center max-w-md">
        <span
          className="block text-[10px] font-bold tracking-[0.4em] uppercase mb-4"
          style={{ color: '#8B672F', fontFamily: 'var(--font-body)' }}
        >
          PAGE NOT FOUND
        </span>

        <h1
          className="mb-4"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(3rem, 8vw, 6rem)',
            fontWeight: 300,
            color: '#1C1B18',
            lineHeight: 1,
          }}
        >
          404
        </h1>

        <p
          className="mb-8"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.9rem',
            color: '#1C1B18',
            opacity: 0.6,
            lineHeight: 1.6,
          }}
        >
          The page you are looking for doesn't exist or has been moved. Let us
          guide you back to our collection.
        </p>

        <Link
          to="/"
          className="inline-block"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.7rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            padding: '14px 32px',
            backgroundColor: '#1C1B18',
            color: '#FEFCF9',
            borderRadius: 'var(--radius-md)',
            textDecoration: 'none',
            transition: 'background-color 0.3s',
          }}
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
