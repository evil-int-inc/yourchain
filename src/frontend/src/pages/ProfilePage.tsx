import { createActor } from "@/backend";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { Textarea } from "@/components/ui/textarea";
import { config } from "@/config";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getChannelByUsername, saveProfile } from "@/services/users";
import { formatDate, timestampToDate } from "@/utils/format";
import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, UserCog } from "lucide-react";
import { useEffect, useRef, useState } from "react";

function ProfileSkeleton() {
  return (
    <div
      data-ocid="loading_state"
      aria-busy="true"
      className="mx-auto w-full max-w-2xl space-y-6"
    >
      <div className="flex items-center gap-4">
        <Skeleton circle className="size-20" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </div>
      <div className="space-y-4 rounded-box border border-border bg-card p-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}

export function ProfilePage() {
  const { actor, isFetching } = useActor(createActor);
  const queryClient = useQueryClient();

  const profileQuery = useCurrentUser();
  const profile = profileQuery.data;

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");
  const [usernameTaken, setUsernameTaken] = useState(false);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [saved, setSaved] = useState(false);
  const initializedRef = useRef(false);

  // One-time initialization from the loaded profile (editing an existing record).
  useEffect(() => {
    if (initializedRef.current || !profile) return;
    initializedRef.current = true;
    setDisplayName(profile.displayName);
    setUsername(profile.username);
    setBio(profile.bio ?? "");
    setAvatar(profile.avatar ?? "");
  }, [profile]);

  // Debounced username uniqueness check against the backend.
  useEffect(() => {
    const trimmed = username.trim();
    if (!actor || !trimmed || trimmed.length > config.maxUsernameLength) {
      setUsernameTaken(false);
      setUsernameChecking(false);
      return;
    }
    setUsernameChecking(true);
    const handle = window.setTimeout(async () => {
      try {
        const found = await getChannelByUsername(actor, trimmed);
        const isOwn =
          !!profile && !!found && found.id.toString() === profile.id.toString();
        setUsernameTaken(!!found && !isOwn);
      } catch {
        setUsernameTaken(false);
      } finally {
        setUsernameChecking(false);
      }
    }, 400);
    return () => window.clearTimeout(handle);
  }, [actor, username, profile]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Backend is not ready");
      return saveProfile(actor, {
        displayName: displayName.trim(),
        username: username.trim(),
        avatar: avatar.trim() || null,
        bio: bio.trim() || null,
      });
    },
    onSuccess: () => {
      setSaved(true);
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });

  const displayNameValid =
    displayName.trim().length > 0 &&
    displayName.trim().length <= config.maxDisplayNameLength;
  const usernameValid =
    username.trim().length > 0 &&
    username.trim().length <= config.maxUsernameLength &&
    !usernameTaken;
  const bioValid = bio.length <= config.maxBioLength;
  const canSave =
    displayNameValid && usernameValid && bioValid && !saveMutation.isPending;

  const memberSince = formatDate(timestampToDate(profile?.createdAt ?? 0n));

  if (profileQuery.isLoading || (isFetching && !profileQuery.data)) {
    return (
      <div className="p-4 sm:p-6">
        <ProfileSkeleton />
      </div>
    );
  }

  if (profileQuery.isError) {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState
          title="Couldn't load your profile"
          message="Something went wrong while fetching your channel details."
          onRetry={() => void profileQuery.refetch()}
        />
      </div>
    );
  }

  const isNewChannel = !profile;

  return (
    <div data-ocid="profile_page" className="p-4 sm:p-6">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <header className="flex items-center gap-4">
          <Avatar
            src={avatar || undefined}
            name={displayName || undefined}
            size="xl"
            alt="Your channel avatar"
          />
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-semibold text-foreground">
              {isNewChannel ? "Create your channel" : "Edit your profile"}
            </h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <UserCog className="size-4" aria-hidden="true" />
              {isNewChannel
                ? "Set up your public channel details."
                : `Member since ${memberSince}`}
            </p>
          </div>
        </header>

        {saved ? (
          <output
            data-ocid="success_state"
            className="flex items-center gap-2 rounded-box border border-success/30 bg-success/10 px-4 py-3 text-sm text-foreground"
          >
            <CheckCircle2
              className="size-5 shrink-0 text-success"
              aria-hidden="true"
            />
            Your profile has been saved.
          </output>
        ) : null}

        {saveMutation.isError ? (
          <div
            data-ocid="error_state"
            role="alert"
            className="flex items-center gap-2 rounded-box border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-foreground"
          >
            <AlertCircle
              className="size-5 shrink-0 text-destructive"
              aria-hidden="true"
            />
            <span>
              {saveMutation.error instanceof Error
                ? saveMutation.error.message
                : "Couldn't save your profile. Please try again."}
            </span>
          </div>
        ) : null}

        <form
          data-ocid="profile_form"
          className="space-y-5 rounded-box border border-border bg-card p-6"
          onSubmit={(event) => {
            event.preventDefault();
            setSaved(false);
            saveMutation.mutate();
          }}
        >
          <Input
            id="display-name"
            data-ocid="display_name_input"
            label="Display name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            maxLength={config.maxDisplayNameLength}
            placeholder="Your channel name"
            hint={`${displayName.length}/${config.maxDisplayNameLength} characters`}
            error={
              displayName.trim().length > config.maxDisplayNameLength
                ? `Display name must be ${config.maxDisplayNameLength} characters or fewer.`
                : undefined
            }
          />

          <Input
            id="username"
            data-ocid="username_input"
            label="Username"
            value={username}
            onChange={(event) => {
              setUsername(event.target.value);
              setSaved(false);
            }}
            maxLength={config.maxUsernameLength}
            placeholder="unique-handle"
            hint={
              usernameChecking
                ? "Checking availability…"
                : `Your unique handle, up to ${config.maxUsernameLength} characters.`
            }
            error={
              username.trim().length > config.maxUsernameLength
                ? `Username must be ${config.maxUsernameLength} characters or fewer.`
                : usernameTaken
                  ? "This username is already taken."
                  : undefined
            }
          />

          <div className="space-y-1.5">
            <label
              htmlFor="bio"
              className="block text-sm font-medium text-foreground"
            >
              Bio
            </label>
            <Textarea
              id="bio"
              data-ocid="bio_textarea"
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              maxLength={config.maxBioLength}
              placeholder="Tell viewers about your channel"
              rows={4}
              aria-invalid={!bioValid}
            />
            <p className="text-sm text-muted-foreground">
              {bio.length}/{config.maxBioLength} characters
            </p>
          </div>

          <Input
            id="avatar"
            data-ocid="avatar_input"
            label="Avatar URL"
            value={avatar}
            onChange={(event) => setAvatar(event.target.value)}
            placeholder="https://…"
            hint="Optional link to your avatar image."
          />

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="submit"
              data-ocid="save_button"
              variant="primary"
              loading={saveMutation.isPending}
              disabled={!canSave}
            >
              Save profile
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
