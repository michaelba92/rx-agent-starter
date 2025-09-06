export const metadata = { title: "RX Agent Starter" };
export default function RootLayout({ children }) {
  return (
    <html lang="nl">
      <body style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial', background:'#eee', color:'#111' }}>
        {children}
      </body>
    </html>
  );
}
