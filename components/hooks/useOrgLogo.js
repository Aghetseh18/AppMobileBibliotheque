import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../config';

const useOrgLogo = () => {
  const [logoUrl, setLogoUrl] = useState(null);

  useEffect(() => {
    const ref = doc(db, 'Configuration', 'OrgSettings');
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        const data = snapshot.data();
        setLogoUrl(data?.Logo || null);
      },
      (error) => {
        console.error('Erreur logo listener:', error);
        setLogoUrl(null);
      }
    );

    return () => unsubscribe();
  }, []);

  return { logoUrl };
};

export default useOrgLogo;
