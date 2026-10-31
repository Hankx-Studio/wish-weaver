import Link from 'next/link';

export const metadata = { title: 'Donate — Spirit Companion' };

const ORGS = [
  {
    name: 'International Committee of the Red Cross (ICRC)',
    short: 'ICRC',
    mission:
      'Protects and assists people affected by armed conflict and violence, and promotes respect for international humanitarian law.',
    href: 'https://www.icrc.org/en/donate',
  },
  {
    name: 'Médecins Sans Frontières (MSF / Doctors Without Borders)',
    short: 'MSF',
    mission:
      'Provides impartial medical care to people affected by conflict, epidemics, disasters, and exclusion from healthcare.',
    href: 'https://www.msf.org/donate',
  },
] as const;

export default function DonatePage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: '#101512',
        color: '#f4efe4',
        fontFamily:
          'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: '56rem',
          margin: '0 auto',
          padding: '2rem 1.25rem 4rem',
        }}
      >
        <Link
          href="/"
          style={{
            display: 'inline-block',
            fontSize: '0.8rem',
            color: '#f4efe4',
            backgroundColor: 'rgba(244, 239, 228, 0.08)',
            padding: '0.4rem 0.8rem',
            borderRadius: '999px',
            textDecoration: 'none',
            border: '1px solid rgba(244, 239, 228, 0.14)',
          }}
        >
          ← Meadow
        </Link>

        <p
          style={{
            margin: '3rem 0 0.5rem',
            fontSize: '0.85rem',
            letterSpacing: '0.14em',
            color: '#d9b36a',
          }}
        >
          SPIRIT COMPANION
        </p>
        <h1
          style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: 'clamp(2.2rem, 6vw, 3.4rem)',
            lineHeight: 1.05,
            margin: '0 0 0.75rem',
            textWrap: 'balance',
          }}
        >
          Giving back beyond the meadow
        </h1>
        <p
          style={{
            margin: '0 0 0.75rem',
            maxWidth: '34rem',
            lineHeight: 1.65,
            color: '#e6dfce',
          }}
        >
          Kindness in the meadow can grow a spirit. Kindness here can reach
          people far beyond it. If the game moved you, consider supporting
          one of these independent humanitarian organisations directly.
        </p>
        <p
          style={{
            margin: '0 0 2.5rem',
            fontSize: '0.9rem',
            fontStyle: 'italic',
            color: '#8a8471',
          }}
        >
          The meadow heals in-game; these heal in real life.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(16rem, 1fr))',
            gap: '1rem',
          }}
        >
          {ORGS.map((org) => (
            <article
              key={org.short}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                padding: '1.5rem',
                backgroundColor: 'rgba(244, 239, 228, 0.04)',
                border: '1px solid rgba(244, 239, 228, 0.12)',
                borderRadius: '16px',
              }}
            >
              <h2
                style={{
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  fontSize: '1.35rem',
                  lineHeight: 1.25,
                  margin: 0,
                  textWrap: 'balance',
                }}
              >
                {org.name}
              </h2>
              <p
                style={{
                  margin: 0,
                  lineHeight: 1.65,
                  color: '#cfc8b4',
                  flexGrow: 1,
                }}
              >
                {org.mission}
              </p>
              <a
                href={org.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-block',
                  alignSelf: 'flex-start',
                  marginTop: '0.25rem',
                  padding: '0.7rem 1.4rem',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  color: '#191510',
                  backgroundColor: '#d9b36a',
                  borderRadius: '8px',
                  textDecoration: 'none',
                }}
              >
                Donate on the official site
              </a>
            </article>
          ))}
        </div>

        <p
          style={{
            margin: '2rem 0 0',
            padding: '1rem 1.25rem',
            fontSize: '0.85rem',
            lineHeight: 1.65,
            color: '#cfc8b4',
            backgroundColor: 'rgba(244, 239, 228, 0.04)',
            border: '1px solid rgba(244, 239, 228, 0.12)',
            borderRadius: '12px',
          }}
        >
          This demo never collects or processes money. Donations are made
          on the organizations&apos; official sites; this page only links
          out.
        </p>
      </div>
    </main>
  );
}
