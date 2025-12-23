
import { useEffect } from "react";
import { Stack } from "expo-router";

export default function RootLayout() {
  useEffect(() => {
    if (typeof window !== "undefined" && 'serviceWorker' in navigator && !__DEV__) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js');
      });
    }
  }, []);
  return <Stack />;
}
