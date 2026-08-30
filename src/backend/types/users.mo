import Common "../types/common";

module {
  public type User = {
    id : Common.UserId;
    displayName : Text;
    username : Text; // unique
    avatar : ?Text;
    bio : ?Text;
    createdAt : Common.Timestamp;
  };
};
