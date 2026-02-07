// FE/src/pages/profile/components/ProfileEditModal.tsx
import type { UpdateMyProfilePatch } from "../../../features/profile/api";
import type { ArtistProfile, UserProfile, Badge } from "../../../features/profile/types";

import ArtistProfileEditModal from "./ArtistProfileEditModal";
import UserProfileEditModal from "./UserProfileEditModal_403";

type ProfileModel = ArtistProfile | UserProfile;

type Props = {
  open: boolean;
  busy: boolean;

  profile: ProfileModel;
  isArtist: boolean;

  earnedBadges: Badge[];
  initialFeaturedIds: string[];

  onRequestClose: () => void;
  onSave: (payload: UpdateMyProfilePatch, nextFeaturedIds: string[]) => Promise<boolean>;
};

export default function ProfileEditModal(props: Props) {
  const { isArtist, profile } = props;

  return isArtist ? (
    <ArtistProfileEditModal {...props} profile={profile as ArtistProfile} />
  ) : (
    <UserProfileEditModal {...props} profile={profile as UserProfile} />
  );
}
