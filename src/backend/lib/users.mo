import Runtime "mo:core/Runtime";
import Map "mo:core/Map";
import Common "../types/common";
import Users "../types/users";

module {
  public func createUser(
    users : Map.Map<Common.UserId, Users.User>,
    usernames : Map.Map<Text, Common.UserId>,
    id : Common.UserId,
    displayName : Text,
    username : Text,
    avatar : ?Text,
    bio : ?Text,
    now : Common.Timestamp,
  ) : Users.User {
    let user : Users.User = { id; displayName; username; avatar; bio; createdAt = now };
    users.add(id, user);
    usernames.add(username, id);
    user;
  };

  public func getUser(users : Map.Map<Common.UserId, Users.User>, id : Common.UserId) : ?Users.User {
    users.get(id);
  };

  public func getByUsername(
    usernames : Map.Map<Text, Common.UserId>,
    users : Map.Map<Common.UserId, Users.User>,
    username : Text,
  ) : ?Users.User {
    switch (usernames.get(username)) {
      case (?id) { users.get(id) };
      case null { null };
    };
  };

  public func updateProfile(
    users : Map.Map<Common.UserId, Users.User>,
    usernames : Map.Map<Text, Common.UserId>,
    id : Common.UserId,
    displayName : Text,
    username : Text,
    avatar : ?Text,
    bio : ?Text,
  ) : Users.User {
    let existing = users.get(id) ?? Runtime.trap("User not found");
    if (existing.username != username) {
      usernames.remove(existing.username);
      usernames.add(username, id);
    };
    let updated : Users.User = {
      id;
      displayName;
      username;
      avatar;
      bio;
      createdAt = existing.createdAt;
    };
    users.add(id, updated);
    updated;
  };

  public func isUsernameTaken(usernames : Map.Map<Text, Common.UserId>, username : Text) : Bool {
    usernames.get(username) != null;
  };
};
