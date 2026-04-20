import './globals.css';

export const metadata = {
  title: 'NoidaPulse - What is Noida Watching?',
  description: 'Discover trending shows and movies in Noida. Check-in what you\'re watching and see what\'s hot in your sector!',
  keywords: 'Noida, trending, shows, movies, entertainment, local trends',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background antialiased">
        {children}
      </body>
    </html>
  );
}
