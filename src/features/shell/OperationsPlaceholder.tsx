import { useState } from 'react';

import { useSession } from '@/auth';
import { AppText, Button } from '@/components';

import { PlaceholderScreen } from './PlaceholderScreen';

export function OperationsPlaceholder() {
  const { session, role, signOut } = useSession();
  const [signingOut, setSigningOut] = useState(false);

  return (
    <PlaceholderScreen title="Operations">
      <AppText variant="caption" tone="muted" testID="operations-signed-in-as">
        {session?.name ? `${session.name} · ` : ''}
        {role === 'officer' ? 'AVS / NParks officer' : role === 'contractor' ? 'Contractor' : ''}
      </AppText>
      <Button
        label="Sign out"
        variant="secondary"
        testID="operations-signout"
        loading={signingOut}
        onPress={() => {
          setSigningOut(true);
          void signOut();
        }}
      />
    </PlaceholderScreen>
  );
}
