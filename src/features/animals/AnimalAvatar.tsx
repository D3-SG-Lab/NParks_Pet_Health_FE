import { Avatar } from '@/components';
import type { Animal } from '@/domain/types';

interface AnimalAvatarProps {
  animal: Pick<Animal, 'name' | 'species'>;
  size?: 'sm' | 'md' | 'lg';
  /** Muted tile for closed records. */
  muted?: boolean;
  showCamera?: boolean;
}

/** Animal photo placeholder: primary-soft for dogs and other species, warm for cats (screens 3, 13). */
export function AnimalAvatar({ animal, size, muted = false, showCamera }: AnimalAvatarProps) {
  return <Avatar name={animal.name} size={size} tone={muted ? 'muted' : animal.species === 'Cat' ? 'warm' : 'default'} showCamera={showCamera} />;
}
