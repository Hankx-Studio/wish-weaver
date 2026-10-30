import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Spirit Companion — an AI spirit that grows with your kindness',
  description:
    'Speak a blessing and watch magic appear. Your kindness grows a spirit companion — and can become real goods shared with others.',
};

// Minimal root layout. Route groups ((marketing), (app), auth) render inside.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          backgroundColor: '#10201c',
          color: '#f4efe4',
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        }}
      >
        {children}
      </body>
    </html>
  );
}
