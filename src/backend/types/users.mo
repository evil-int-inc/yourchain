import Common "../types/common";
import Storage "mo:caffeineai-object-storage/Storage";

module {
  public type User = {
    id : Common.UserId;
    displayName : Text;
    username : Text; // unique
    avatar : ?Storage.ExternalBlob;
    bio : ?Text;
    createdAt : Common.Timestamp;
  };
};
