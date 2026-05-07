import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { ProfileForm } from '@/components/settings/ProfileForm';

export default async function SettingsProfilePage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      firstName: true,
      name: true,
      age: true,
      location: true,
      riskTolerance: true,
      email: true,
    },
  });
  if (!user) return null;

  return <ProfileForm initial={user} />;
}
