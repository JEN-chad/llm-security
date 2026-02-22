import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function useSystemStatus() {
  const router = useRouter();

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch('/api/status');
        const data = await res.json();
        
        if (data.allow_signin === false) {
          console.warn("System access revoked. Logging out...");
          localStorage.clear();
          router.replace('/login');
        }
      } catch (err) {
        console.error("Status check failed", err);
      }
    };

    const interval = setInterval(checkStatus, 5000); 
    return () => clearInterval(interval);
  }, [router]);
}
