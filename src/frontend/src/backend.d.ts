import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
import type { ExternalBlob } from "@caffeineai/object-storage";
export type { ExternalBlob } from "@caffeineai/object-storage";
export interface Video {
    id: bigint;
    status: VideoStatus;
    title: string;
    thumbnail?: ExternalBlob;
    ownerId: UserId;
    video: ExternalBlob;
    createdAt: Timestamp;
    publishedAt?: Timestamp;
    mimeType: string;
    description?: string;
    fileSize: bigint;
    filename: string;
    viewCount: bigint;
    isPrivate: boolean;
}
export type Timestamp = bigint;
export type Cursor = bigint;
export type NotificationKind = {
    __kind__: "newVideo";
    newVideo: {
        channelId: UserId;
        videoId: bigint;
    };
} | {
    __kind__: "newSubscriber";
    newSubscriber: {
        channelId: UserId;
    };
};
export interface User {
    id: UserId;
    bio?: string;
    username: string;
    displayName: string;
    createdAt: Timestamp;
    avatar?: ExternalBlob;
}
export type Result__1 = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: Error_;
};
export interface Page_1 {
    items: Array<Notification>;
    nextCursor?: Cursor;
}
export type Error_ = {
    __kind__: "FrontendOriginsNotConfigured";
    FrontendOriginsNotConfigured: null;
} | {
    __kind__: "MixedSsoSources";
    MixedSsoSources: {
        otherKeys: Array<string>;
        ssoKeys: Array<string>;
    };
} | {
    __kind__: "Stale";
    Stale: {
        ageNs: bigint;
    };
} | {
    __kind__: "MalformedCandid";
    MalformedCandid: null;
} | {
    __kind__: "AmbiguousAttribute";
    AmbiguousAttribute: {
        field: string;
        sources: Array<string>;
    };
} | {
    __kind__: "NoAttributes";
    NoAttributes: null;
} | {
    __kind__: "UnknownNonce";
    UnknownNonce: null;
} | {
    __kind__: "UntrustedSsoSource";
    UntrustedSsoSource: {
        domain: string;
    };
} | {
    __kind__: "MissingField";
    MissingField: string;
} | {
    __kind__: "FrontendOriginMismatch";
    FrontendOriginMismatch: {
        got: string;
        expected: Array<string>;
    };
};
export type UserId = Principal;
export interface Result {
    hasMore: boolean;
    rows: Array<Array<Cell>>;
}
export interface Page {
    items: Array<Video>;
    nextCursor?: Cursor;
}
export interface Notification {
    id: bigint;
    kind: NotificationKind;
    createdAt: Timestamp;
    read: boolean;
    recipientId: UserId;
}
export interface Cell {
    value: Value;
    name: string;
}
export type Value = {
    __kind__: "int";
    int: bigint;
} | {
    __kind__: "nat";
    nat: bigint;
} | {
    __kind__: "float";
    float: number;
} | {
    __kind__: "bool";
    bool: boolean;
} | {
    __kind__: "null";
    null: null;
} | {
    __kind__: "text";
    text: string;
};
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export enum VideoStatus {
    deleted = "deleted",
    published = "published",
    processing = "processing",
    draft = "draft"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createVideo(title: string, description: string | null, video: ExternalBlob, thumbnail: ExternalBlob | null, filename: string, mimeType: string, fileSize: bigint, isPrivate: boolean): Promise<Video>;
    deleteVideo(videoId: bigint): Promise<void>;
    execute(qJson: string): Promise<Result>;
    getApiDoc(): Promise<string>;
    getCallerProfile(): Promise<User | null>;
    getCallerUserRole(): Promise<UserRole>;
    getChannel(userId: UserId): Promise<User | null>;
    getChannelByUsername(username: string): Promise<User | null>;
    getChannelVideos(userId: UserId, cursor: Cursor, limit: bigint): Promise<Page>;
    getFeed(cursor: Cursor, limit: bigint): Promise<Page>;
    getMyVideos(cursor: Cursor, limit: bigint): Promise<Page>;
    getNotifications(cursor: Cursor, limit: bigint): Promise<Page_1>;
    getStorageProviders(): Promise<Array<string>>;
    getSubscribedChannels(): Promise<Array<UserId>>;
    getSubscriberCount(channelId: UserId): Promise<bigint>;
    getSubscriptionFeed(cursor: Cursor, limit: bigint): Promise<Page>;
    getUnreadNotificationCount(): Promise<bigint>;
    getVideo(videoId: bigint): Promise<Video | null>;
    isCallerAdmin(): Promise<boolean>;
    isSubscribed(channelId: UserId): Promise<boolean>;
    markNotificationsRead(): Promise<void>;
    publishVideo(videoId: bigint): Promise<Video>;
    recordVideoView(videoId: bigint): Promise<bigint>;
    registerStorageProvider(providerId: string): Promise<void>;
    saveProfile(displayName: string, username: string, avatar: ExternalBlob | null, removeAvatar: boolean, bio: string | null): Promise<User>;
    schema(): Promise<string>;
    subscribe(channelId: UserId): Promise<void>;
    unsubscribe(channelId: UserId): Promise<void>;
}
