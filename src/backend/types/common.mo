module {
  public type UserId = Principal;
  public type Timestamp = Int; // nanoseconds since epoch (Time.now())
  public type Cursor = Nat;
  public type Page<T> = {
    items : [T];
    nextCursor : ?Cursor;
  };
  // Shared mutable counters, passed by reference to mixins that allocate ids.
  public type Counters = {
    var nextVideoId : Nat;
    var nextUploadSessionId : Nat;
    var nextNotificationId : Nat;
  };
};
