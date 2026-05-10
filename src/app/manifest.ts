export const dynamic = "force-static";

import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TypeFlow Pro',
    short_name: 'TypeFlow',
    description: 'Local-First Professional Code Converter',
    start_url: '/',
    display: 'standalone',
    background_color: '#F8FAFC',
    theme_color: '#0F172A',
    icons: [
      {
        src: 'https://cdn-icons-png.flaticon.com/512/3665/3665923.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
