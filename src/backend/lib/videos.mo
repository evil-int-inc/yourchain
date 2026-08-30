import Runtime "mo:core/Runtime";
import Int "mo:core/Int";
import Map "mo:core/Map";
import Common "../types/common";
import Videos "../types/videos";
import FeedLib "../lib/feed";

module {
  public func createUploadSession(
    uploadSessions : Map.Map<Nat, Videos.UploadSession>,
    counters : Common.Counters,
    ownerId : Common.UserId,
    kind : Videos.UploadKind,
    assetId : Text,
    mimeType : Text,
    totalSize : Nat,
    chunkSize : Nat,
    now : Common.Timestamp,
  ) : Videos.UploadSession {
    let id = counters.nextUploadSessionId;
    counters.nextUploadSessionId += 1;
    let session : Videos.UploadSession = {
      id;
      ownerId;
      kind;
      assetId;
      mimeType;
      totalSize;
      chunkSize;
      receivedBytes = 0;
      status = #active;
      createdAt = now;
    };
    uploadSessions.add(id, session);
    session;
  };

  public func getUploadSession(uploadSessions : Map.Map<Nat, Videos.UploadSession>, id : Nat) : ?Videos.UploadSession {
    uploadSessions.get(id);
  };

  public func storeChunk(
    uploadSessions : Map.Map<Nat, Videos.UploadSession>,
    sessionId : Nat,
    chunkIndex : Nat,
    data : Blob,
  ) : Nat {
    ignore chunkIndex;
    let session = uploadSessions.get(sessionId) ?? Runtime.trap("Upload session not found");
    let updated = { session with receivedBytes = session.receivedBytes + data.size() };
    uploadSessions.add(sessionId, updated);
    updated.receivedBytes;
  };

  public func verifyUpload(uploadSessions : Map.Map<Nat, Videos.UploadSession>, sessionId : Nat) : () {
    let session = uploadSessions.get(sessionId) ?? Runtime.trap("Upload session not found");
    if (session.receivedBytes != session.totalSize) {
      Runtime.trap("Upload incomplete");
    };
    let updated = { session with status = #completed };
    uploadSessions.add(sessionId, updated);
  };

  public func verifyThumbnailOwnership(
    uploadSessions : Map.Map<Nat, Videos.UploadSession>,
    ownerId : Common.UserId,
    thumbnailAssetId : ?Text,
  ) : () {
    switch (thumbnailAssetId) {
      case (null) {};
      case (?assetId) {
        let owned = uploadSessions.entries()
          .toArray()
          .any(func (_, s) = s.kind == #thumbnail and s.assetId == assetId and s.ownerId == ownerId);
        if (not owned) {
          Runtime.trap("Unauthorized: Thumbnail asset not owned by caller");
        };
      };
    };
  };

  public func finalizeMedia(
    videos : Map.Map<Nat, Videos.Video>,
    uploadSessions : Map.Map<Nat, Videos.UploadSession>,
    counters : Common.Counters,
    sessionId : Nat,
    title : Text,
    description : ?Text,
    thumbnailAssetId : ?Text,
    now : Common.Timestamp,
  ) : Videos.Video {
    let session = uploadSessions.get(sessionId) ?? Runtime.trap("Upload session not found");
    if (session.status != #completed) {
      Runtime.trap("Upload not completed");
    };
    let id = counters.nextVideoId;
    counters.nextVideoId += 1;
    let video : Videos.Video = {
      id;
      ownerId = session.ownerId;
      title;
      description;
      videoAssetId = session.assetId;
      thumbnailAssetId;
      mimeType = session.mimeType;
      fileSize = session.totalSize;
      createdAt = now;
      publishedAt = null;
      status = #draft;
    };
    videos.add(id, video);
    let updatedSession = { session with status = #finalized };
    uploadSessions.add(sessionId, updatedSession);
    video;
  };

  public func publishVideo(videos : Map.Map<Nat, Videos.Video>, videoId : Nat, now : Common.Timestamp) : Videos.Video {
    let video = videos.get(videoId) ?? Runtime.trap("Video not found");
    let updated = { video with status = #published; publishedAt = ?now };
    videos.add(videoId, updated);
    updated;
  };

  public func deleteVideo(videos : Map.Map<Nat, Videos.Video>, videoId : Nat) : () {
    let video = videos.get(videoId) ?? Runtime.trap("Video not found");
    let updated = { video with status = #deleted };
    videos.add(videoId, updated);
  };

  public func getVideo(videos : Map.Map<Nat, Videos.Video>, videoId : Nat) : ?Videos.Video {
    videos.get(videoId);
  };

  public func getMyVideos(
    videos : Map.Map<Nat, Videos.Video>,
    ownerId : Common.UserId,
    cursor : Common.Cursor,
    limit : Nat,
  ) : Common.Page<Videos.Video> {
    let mine = videos.entries()
      .toArray()
      .filter(func (_, v) = v.ownerId == ownerId)
      .map(func (_, v) = v)
      .sort(func (a, b) = Int.compare(b.id, a.id));
    FeedLib.paginate(mine, func v = v.id, cursor, limit);
  };
};
