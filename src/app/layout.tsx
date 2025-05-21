import { Providers } from './providers';
import '../app/globals.css'
import '@mantine/core/styles.css'; // Core styles bắt buộc
import '@mantine/notifications/styles.css'; // Nếu dùng components như Notification

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}