import Common "../types/common";

module {
  public type VideoStatus = {
    #draft;
    #processing;
    #published;
    #deleted;
  };

  public type Video = {
    id : Nat;
    ownerId : Common.UserId;
    title : Text;
    description : ?Text;
    videoAssetId : Text;
    thumbnailAssetId : ?Text;
    mimeType : Text;
    fileSize : Nat;
    createdAt : Common.Timestamp;
    publishedAt : ?Common.Timestamp;
    status : VideoStatus;
  };

  public type UploadKind = {
    #video;
    #thumbnail;
  };

  public type UploadStatus = {
    #active;
    #completed;
    #finalized;
    #cancelled;
  };

  public type UploadSession = {
    id : Nat;
    ownerId : Common.UserId;
    kind : UploadKind;
    assetId : Text;
    mimeType : Text;
    totalSize : Nat;
    chunkSize : Nat;
    receivedBytes : Nat;
    status : UploadStatus;
    createdAt : Common.Timestamp;
  };
};
