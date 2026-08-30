import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Common "../types/common";
import Storage "../types/storage";

module {
  public func createAsset(storage : Storage.StorageState, kind : Storage.StorageKind, totalSize : Nat) : Storage.StorageRef {
    ignore storage;
    let assetId = "asset-" # Time.now().toNat().toText();
    { assetId; kind; size = totalSize };
  };

  public func storeChunk(storage : Storage.StorageState, assetId : Text, chunkIndex : Nat, data : Blob) : Nat {
    ignore (storage, assetId, chunkIndex);
    data.size();
  };

  public func finalizeAsset(storage : Storage.StorageState, assetId : Text) : Storage.StorageRef {
    ignore storage;
    { assetId; kind = #video; size = 0 };
  };

  public func registerProvider(storage : Storage.StorageState, providerId : Text) : () {
    if (not storage.providers.contains(providerId)) {
      storage.providers := storage.providers.concat([providerId]);
    };
  };

  public func getProviders(storage : Storage.StorageState) : [Text] {
    storage.providers;
  };
};
