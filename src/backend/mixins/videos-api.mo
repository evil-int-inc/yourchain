import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Map "mo:core/Map";
import List "mo:core/List";
import Set "mo:core/Set";
import AccessControl "mo:caffeineai-authorization/access-control";
import Common "../types/common";
import Videos "../types/videos";
import Storage "../types/storage";
import Notifications "../types/notifications";
import VideosLib "../lib/videos";
import StorageLib "../lib/storage";
import NotificationsLib "../lib/notifications";

mixin (
  accessControlState : AccessControl.AccessControlState,
  videos : Map.Map<Nat, Videos.Video>,
  uploadSessions : Map.Map<Nat, Videos.UploadSession>,
  counters : Common.Counters,
  storage : Storage.StorageState,
  subscribers : Map.Map<Common.UserId, Set.Set<Common.UserId>>,
  notifications : Map.Map<Common.UserId, List.List<Notifications.Notification>>,
) {
  public shared ({ caller }) func createUploadSession(kind : Videos.UploadKind, totalSize : Nat, mimeType : Text) : async Videos.UploadSession {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can perform this action");
    };
    let maxSize = switch (kind) {
      case (#video) { 1_000_000_000 }; // 1 GB
      case (#thumbnail) { 20_000_000 }; // 20 MB
    };
    if (totalSize > maxSize) {
      Runtime.trap("File too large");
    };
    let assetId = StorageLib.createAsset(storage, kind, totalSize).assetId;
    VideosLib.createUploadSession(uploadSessions, counters, caller, kind, assetId, mimeType, totalSize, 1_000_000, Time.now());
  };

  public shared ({ caller }) func uploadChunk(sessionId : Nat, chunkIndex : Nat, data : Blob) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can perform this action");
    };
    let session = VideosLib.getUploadSession(uploadSessions, sessionId) ?? Runtime.trap("Upload session not found");
    if (session.ownerId != caller) {
      Runtime.trap("Unauthorized: Not the session owner");
    };
    if (session.status != #active) {
      Runtime.trap("Upload session not active");
    };
    if (session.receivedBytes + data.size() > session.totalSize) {
      Runtime.trap("Chunk exceeds remaining size");
    };
    VideosLib.storeChunk(uploadSessions, sessionId, chunkIndex, data);
  };

  public shared ({ caller }) func verifyUpload(sessionId : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can perform this action");
    };
    let session = VideosLib.getUploadSession(uploadSessions, sessionId) ?? Runtime.trap("Upload session not found");
    if (session.ownerId != caller) {
      Runtime.trap("Unauthorized: Not the session owner");
    };
    VideosLib.verifyUpload(uploadSessions, sessionId);
  };

  public shared ({ caller }) func finalizeMedia(sessionId : Nat, title : Text, description : ?Text, thumbnailAssetId : ?Text) : async Videos.Video {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can perform this action");
    };
    let session = VideosLib.getUploadSession(uploadSessions, sessionId) ?? Runtime.trap("Upload session not found");
    if (session.ownerId != caller) {
      Runtime.trap("Unauthorized: Not the session owner");
    };
    VideosLib.verifyThumbnailOwnership(uploadSessions, caller, thumbnailAssetId);
    VideosLib.finalizeMedia(videos, uploadSessions, counters, sessionId, title, description, thumbnailAssetId, Time.now());
  };

  public shared ({ caller }) func publishVideo(videoId : Nat) : async Videos.Video {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can perform this action");
    };
    let video = VideosLib.getVideo(videos, videoId) ?? Runtime.trap("Video not found");
    if (video.ownerId != caller) {
      Runtime.trap("Unauthorized: Not the video owner");
    };
    let now = Time.now();
    let published = VideosLib.publishVideo(videos, videoId, now);
    switch (subscribers.get(caller)) {
      case (?subSet) {
        for (sub in subSet.toArray().values()) {
          ignore NotificationsLib.createNotification(notifications, counters, sub, #newVideo({ channelId = caller; videoId = videoId }), now);
        };
      };
      case null {};
    };
    published;
  };

  public shared ({ caller }) func deleteVideo(videoId : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can perform this action");
    };
    let video = VideosLib.getVideo(videos, videoId) ?? Runtime.trap("Video not found");
    if (video.ownerId != caller) {
      Runtime.trap("Unauthorized: Not the video owner");
    };
    VideosLib.deleteVideo(videos, videoId);
  };

  public query ({ caller }) func getVideo(videoId : Nat) : async ?Videos.Video {
    switch (VideosLib.getVideo(videos, videoId)) {
      case (?video) {
        if (video.status == #published or video.ownerId == caller) {
          ?video;
        } else {
          null;
        };
      };
      case null { null };
    };
  };

  public query ({ caller }) func getMyVideos(cursor : Common.Cursor, limit : Nat) : async Common.Page<Videos.Video> {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can perform this action");
    };
    VideosLib.getMyVideos(videos, caller, cursor, limit);
  };
};
